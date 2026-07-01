/// <reference types="cordova-plugin-purchase/www/store" />
import 'cordova-plugin-purchase';
import { isNativePlatform } from './nativeBrowser';
import { apiRequest } from './queryClient';

/**
 * Apple product identifiers, mapped to the internal plan keys used elsewhere
 * in the app. Contractor Pro ($40) is intentionally excluded — it is
 * Stripe-only per Apple Guideline 3.1.1 (physical/off-platform service),
 * and must never be registered as a StoreKit product.
 */
export const APPLE_PRODUCT_IDS = {
  base: 'com.gotohomebase.app.homeowner.base.monthly',
  premium: 'com.gotohomebase.app.homeowner.premium.monthly',
  premium_plus: 'com.gotohomebase.app.homeowner.premiumplus.monthly',
  contractor_basic: 'com.gotohomebase.app.contractor.basic.monthly',
} as const;

export type NativePlanKey = keyof typeof APPLE_PRODUCT_IDS;

const PRODUCT_ID_TO_PLAN: Record<string, NativePlanKey> = Object.entries(
  APPLE_PRODUCT_IDS,
).reduce((acc, [plan, productId]) => {
  acc[productId] = plan as NativePlanKey;
  return acc;
}, {} as Record<string, NativePlanKey>);

function log(...args: unknown[]) {
  console.log('[NativeIAP]', ...args);
}

function logError(...args: unknown[]) {
  console.error('[NativeIAP]', ...args);
}

function getCdvPurchase(): typeof CdvPurchase | undefined {
  return (window as any).CdvPurchase as typeof CdvPurchase | undefined;
}

let initPromise: Promise<boolean> | null = null;

type PurchaseVerifiedListener = (result: { plan: NativePlanKey; productId: string }) => void;
type PurchaseFailedListener = (result: { message: string }) => void;
const verifiedListeners = new Set<PurchaseVerifiedListener>();
const failedListeners = new Set<PurchaseFailedListener>();

/**
 * Subscribe to native purchase verification success. Returns an unsubscribe
 * function. Mirrors the onBrowserFinished() pattern used for Stripe checkout.
 */
export function onNativePurchaseVerified(listener: PurchaseVerifiedListener): () => void {
  verifiedListeners.add(listener);
  return () => verifiedListeners.delete(listener);
}

/**
 * Subscribe to native purchase failures (verification errors, store errors).
 */
export function onNativePurchaseFailed(listener: PurchaseFailedListener): () => void {
  failedListeners.add(listener);
  return () => failedListeners.delete(listener);
}

export function isNativePurchaseSupported(): boolean {
  return isNativePlatform;
}

/**
 * Initializes the StoreKit store, registers the 4 subscription products,
 * and wires up the approved -> verify (server) -> finish transaction flow.
 * Safe to call multiple times; only initializes once.
 */
export async function initNativePurchase(): Promise<boolean> {
  if (!isNativePlatform) {
    log('Skipping init — not running on a native platform');
    return false;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    log('Starting StoreKit initialization...');
    const cdv = getCdvPurchase();
    if (!cdv) {
      logError('window.CdvPurchase is undefined — cordova-plugin-purchase native bridge not available');
      return false;
    }

    const { store, ProductType, Platform } = cdv;

    try {
      const productIds = Object.values(APPLE_PRODUCT_IDS);
      log('Registering products with StoreKit:', productIds);

      store.register(
        productIds.map((id) => ({
          id,
          type: ProductType.PAID_SUBSCRIPTION,
          platform: Platform.APPLE_APPSTORE,
        })),
      );

      store.when().approved(async (transaction: CdvPurchase.Transaction) => {
        log(
          'Transaction approved:',
          transaction.transactionId,
          'products:',
          transaction.products?.map((p) => p.id),
        );
        try {
          await verifyAndFinishTransaction(transaction);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to verify purchase with server';
          logError('Failed to verify/finish approved transaction:', err);
          failedListeners.forEach((listener) => listener({ message }));
        }
      });

      store.when().productUpdated(() => {
        log('Product catalog updated from App Store');
      });

      store.error((err: CdvPurchase.IError) => {
        logError('Store error:', err.code, err.message);
        failedListeners.forEach((listener) => listener({ message: err.message }));
      });

      log('Calling store.initialize([APPLE_APPSTORE])...');
      await store.initialize([Platform.APPLE_APPSTORE]);
      log('StoreKit initialized successfully. Products:', store.products.map((p) => p.id));
      return true;
    } catch (err) {
      logError('StoreKit initialization failed:', err);
      return false;
    }
  })();

  return initPromise;
}

async function verifyAndFinishTransaction(transaction: CdvPurchase.Transaction): Promise<void> {
  const jwsRepresentation = (transaction as any).jwsRepresentation as string | undefined;
  const productId = transaction.products?.[0]?.id;
  const plan = productId ? PRODUCT_ID_TO_PLAN[productId] : undefined;

  if (!jwsRepresentation) {
    logError('No jwsRepresentation on transaction — cannot verify with server. Transaction:', transaction.transactionId);
    return;
  }

  if (!plan) {
    logError('Unrecognized productId on transaction, refusing to activate:', productId);
    return;
  }

  log('Sending signed transaction to server for verification. Plan:', plan, 'transactionId:', transaction.transactionId);
  const res = await apiRequest('/api/apple/verify-purchase', 'POST', {
    signedTransactionInfo: jwsRepresentation,
  });
  const body = await res.json();
  log('Server verification response:', body);

  log('Finishing transaction with StoreKit:', transaction.transactionId);
  await transaction.finish();
  log('Transaction finished:', transaction.transactionId);

  verifiedListeners.forEach((listener) => listener({ plan, productId }));
}

/**
 * Kicks off a native purchase for the given plan. Resolves once the
 * purchase flow has been handed to StoreKit (the actual activation happens
 * asynchronously via the `approved` handler wired in initNativePurchase()).
 */
export async function purchaseNativePlan(plan: NativePlanKey, userId: string): Promise<void> {
  if (!isNativePlatform) {
    throw new Error('Native purchases are only available in the iOS app');
  }

  if (!userId) {
    throw new Error('Cannot start purchase: no authenticated user id available');
  }

  const cdv = getCdvPurchase();
  if (!cdv) {
    throw new Error('StoreKit is not available');
  }

  await initNativePurchase();

  const { store } = cdv;

  // Bind this purchase to the authenticated user. `applicationUsername` is
  // obfuscated (via the 'uuid' obfuscator, matched server-side by the same
  // md5-based UUID derivation) into Apple's SK2 `appAccountToken` on the
  // resulting transaction. The server rejects verify-purchase calls whose
  // decoded transaction's appAccountToken doesn't match the caller's
  // session user, preventing a JWS from being replayed onto another account.
  store.obfuscator = 'uuid';
  store.applicationUsername = userId;
  log('Set store.applicationUsername (obfuscated as appAccountToken) for user:', userId);

  const productId = APPLE_PRODUCT_IDS[plan];
  const product = store.get(productId);

  log('purchaseNativePlan called for plan:', plan, 'productId:', productId, 'product found:', !!product);

  if (!product) {
    throw new Error(`Product ${productId} is not available from the App Store yet. Please try again in a moment.`);
  }

  const offer = product.getOffer();
  if (!offer) {
    throw new Error(`No purchasable offer found for product ${productId}`);
  }

  log('Ordering offer:', offer.id, 'for product:', productId);
  const result = await store.order(offer);
  if (result) {
    logError('store.order() returned an error:', result.code, result.message);
    throw new Error(result.message || 'Purchase could not be started');
  }
  log('store.order() call succeeded, awaiting approval/verification callbacks');
}

/**
 * Restores previous purchases (e.g. after reinstall or new device) and
 * notifies the server so entitlements can be re-activated.
 */
export async function restoreNativePurchases(userId: string): Promise<{ restored: boolean }> {
  if (!isNativePlatform) {
    throw new Error('Restoring purchases is only available in the iOS app');
  }

  if (!userId) {
    throw new Error('Cannot restore purchases: no authenticated user id available');
  }

  const cdv = getCdvPurchase();
  if (!cdv) {
    throw new Error('StoreKit is not available');
  }

  await initNativePurchase();

  const { store } = cdv;
  store.obfuscator = 'uuid';
  store.applicationUsername = userId;
  log('Restoring purchases from App Store for user:', userId);
  await store.restorePurchases();

  const transactions = (store.localReceipts ?? [])
    .flatMap((receipt: CdvPurchase.Receipt) => receipt.transactions ?? [])
    .filter((t: any) => !!t.jwsRepresentation);

  log('Found', transactions.length, 'restorable transaction(s) with JWS data');

  const jwsRepresentations = transactions
    .map((t: any) => t.jwsRepresentation as string)
    .filter(Boolean);

  if (jwsRepresentations.length === 0) {
    log('No restorable transactions found');
    return { restored: false };
  }

  const res = await apiRequest('/api/apple/restore', 'POST', {
    signedTransactionInfos: jwsRepresentations,
  });
  const body = await res.json();
  log('Server restore response:', body);
  return { restored: !!body.restored };
}
