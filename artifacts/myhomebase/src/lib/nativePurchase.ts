/// <reference types="cordova-plugin-purchase/www/store" />
import 'cordova-plugin-purchase';
import { isNativePlatform } from './nativeBrowser';
import { apiRequest, API_BASE } from './queryClient';
import { tryRestoreSession } from './nativeSession';

/**
 * Apple product identifiers, mapped to the internal plan keys used elsewhere
 * in the app. All contractor subscription tiers are purchasable via StoreKit.
 */
export const APPLE_PRODUCT_IDS = {
  base: 'com.gotohomebase.app.homeowner.base.monthly',
  premium: 'com.gotohomebase.app.homeowner.premium.monthly',
  premium_plus: 'com.gotohomebase.app.homeowner.premiumplus.monthly',
  contractor_basic: 'com.gotohomebase.app.contractor.basic.monthly',
  contractor_pro: 'com.gotohomebase.app.contractor.pro1.monthly',
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
const activationPendingListeners = new Set<() => void>();
let activationPending = false;

function setNativeActivationPending(pending: boolean): void {
  if (activationPending === pending) return;
  activationPending = pending;
  activationPendingListeners.forEach((listener) => listener());
}

export function subscribeToNativeActivationPending(listener: () => void): () => void {
  activationPendingListeners.add(listener);
  return () => activationPendingListeners.delete(listener);
}

export function getNativeActivationPending(): boolean {
  return activationPending;
}

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
        setNativeActivationPending(true);
        log(
          'Transaction approved:',
          transaction.transactionId,
          'products:',
          transaction.products?.map((p) => p.id),
        );
        try {
          await verifyAndFinishTransaction(transaction);
        } catch (err) {
          setNativeActivationPending(false);
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

/**
 * Calls POST /api/apple/verify-purchase using raw fetch — bypassing the
 * global 401 handler in queryClient (throwIfResNotOk) which would otherwise
 * redirect the user to /signin mid-purchase and strip the status code from
 * the thrown error, breaking the 401-detection logic below.
 *
 * Returns { status, message } where message is always a clean, user-facing
 * sentence. Never throws — network failures are returned as status 0.
 */
async function callVerifyPurchaseApi(
  signedTransactionInfo: string,
): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(`${API_BASE}/api/apple/verify-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedTransactionInfo }),
      credentials: 'include',
    });
    const text = await res.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = { message: text || res.statusText }; }
    return { status: res.status, body };
  } catch (networkErr) {
    logError('Network failure calling verify-purchase:', networkErr);
    return { status: 0, body: { message: 'Could not reach the server to verify your purchase.' } };
  }
}

function extractServerMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  return fallback;
}

/**
 * Verifies a signed transaction with the server and finishes it with
 * StoreKit.
 *
 * IMPORTANT: `transaction.finish()` must be called for every outcome except
 * a genuinely transient one (network failure or a 5xx from our own server).
 * If we leave a transaction unfinished after a *permanent* rejection (bad
 * product, role mismatch, appAccountToken mismatch, unparseable transaction),
 * StoreKit will re-deliver that exact transaction as "approved" again on
 * every future app launch — silently re-triggering this whole flow (and any
 * error toast) forever. That repeat-forever bug, not just a one-time
 * message, is what produced Apple's "app displayed an error message after
 * purchase" Guideline 2.1(b) rejection: the error kept reappearing on
 * relaunch, and the message itself was also raw unparsed JSON/text from the
 * HTTP response body rather than a clean sentence.
 */
async function verifyAndFinishTransaction(transaction: CdvPurchase.Transaction): Promise<void> {
  const jwsRepresentation = (transaction as any).jwsRepresentation as string | undefined;
  const productId = transaction.products?.[0]?.id;
  const plan = productId ? PRODUCT_ID_TO_PLAN[productId] : undefined;

  if (!jwsRepresentation) {
    // SK1 transactions (iOS < 15) and some re-delivered legacy receipts don't
    // carry a JWS token. We can't verify these with the server. Finish the
    // transaction so StoreKit stops re-delivering it on every launch, but do
    // NOT surface an error to the user — no charge was processed for this path
    // and showing a "contact support" alert (e.g. on the sign-in screen) is
    // confusing and incorrect.
    logError('No jwsRepresentation on transaction — finishing silently to clear replay loop. Transaction:', transaction.transactionId);
    await transaction.finish();
    return;
  }

  if (!plan) {
    logError('Unrecognized productId on transaction, refusing to activate. Finishing to avoid an infinite replay loop:', productId);
    await transaction.finish();
    failedListeners.forEach((listener) => listener({ message: 'This purchase could not be recognized. Please contact support if you were charged.' }));
    return;
  }

  log('Sending signed transaction to server for verification. Plan:', plan, 'transactionId:', transaction.transactionId);

  const { status, body } = await callVerifyPurchaseApi(jwsRepresentation);
  const serverMessage = extractServerMessage(body, 'We could not verify your purchase. Please try again or contact support.');

  log('Server verification response: status=%d body=%o', status, body);

  if (status === 0) {
    // Pure network failure — no HTTP response received. Leave the transaction
    // unfinished so StoreKit re-delivers it when connectivity returns. Return
    // instead of throwing so cordova-plugin-purchase does NOT fire store.error()
    // (which would show a confusing plugin-generated "could not be verified" toast
    // on top of our own message).
    logError('Network failure verifying purchase, will retry on next delivery. transactionId:', transaction.transactionId);
    failedListeners.forEach((listener) => listener({ message: 'Your payment was received but could not be confirmed yet. Please reopen the app in a few minutes.' }));
    return;
  }

  if (status === 401) {
    // The iOS WKWebView session expires while the Apple payment sheet is open
    // (the system UI pauses the WebView). The transaction is valid — Apple
    // already charged the user — but our server can't activate it without a
    // session.
    //
    // Before giving up: try to silently restore the session from the
    // long-lived remember-me token stored in @capacitor/preferences. If the
    // token is still valid the server issues a fresh session cookie, and we
    // can immediately retry the verify call — the user never sees an error.
    log('Got 401 on verify-purchase — attempting silent session restore. transactionId:', transaction.transactionId);
    const restored = await tryRestoreSession();

    if (restored) {
      log('Session restored via remember-me token — retrying verify-purchase. transactionId:', transaction.transactionId);
      const retry = await callVerifyPurchaseApi(jwsRepresentation);
      log('Retry verify-purchase response: status=%d body=%o', retry.status, retry.body);

      if (retry.status >= 200 && retry.status < 300) {
        // Verified on retry — finish and notify success.
        log('Finishing transaction after silent restore+retry:', transaction.transactionId);
        await transaction.finish();
        log('Transaction finished:', transaction.transactionId);
        setNativeActivationPending(false);
        verifiedListeners.forEach((listener) => listener({ plan, productId }));
        return;
      }

      // Retry produced a new error — fall through to the normal status
      // handling below so the correct action is taken (finish on 4xx, leave
      // pending on 5xx / network failure).
      const retryMessage = extractServerMessage(retry.body, 'We could not verify your purchase. Please try again or contact support.');
      log('Retry after session restore failed with status:', retry.status, 'transactionId:', transaction.transactionId);

      if (retry.status === 0) {
        logError('Network failure on retry after restore, will retry on next delivery. transactionId:', transaction.transactionId);
        failedListeners.forEach((listener) => listener({ message: 'Your payment was received but could not be confirmed yet. Please reopen the app in a few minutes.' }));
        return;
      }
      if (retry.status >= 400 && retry.status < 500) {
        logError('Permanent rejection on retry after restore (status', retry.status, '):', retryMessage, 'transactionId:', transaction.transactionId);
        await transaction.finish();
        failedListeners.forEach((listener) => listener({ message: retryMessage }));
        return;
      }
      if (retry.status >= 500) {
        logError('Server 5xx on retry after restore, will retry on next delivery. status:', retry.status, 'transactionId:', transaction.transactionId);
        failedListeners.forEach((listener) => listener({ message: 'Your payment was received but our server had a temporary issue. Please reopen the app in a few minutes.' }));
        return;
      }
      // Unexpected status — treat as transient and leave pending.
      logError('Unexpected status on retry after restore:', retry.status, 'transactionId:', transaction.transactionId);
      failedListeners.forEach((listener) => listener({ message: 'Your payment was received but could not be confirmed yet. Please reopen the app in a few minutes.' }));
      return;
    }

    // Session restore failed (token missing or expired). Leave the transaction
    // unfinished so StoreKit re-delivers it automatically after the user signs
    // back in. Do NOT throw (which would fire store.error() with a confusing
    // plugin message). Instead call failedListeners with a reassuring message
    // so the UI resets from its loading state and the user knows what to do.
    logError('Session restore failed — leaving transaction pending for re-delivery after next login. transactionId:', transaction.transactionId);
    failedListeners.forEach((listener) => listener({
      message: 'Your payment was received. Please sign in again — your subscription will activate automatically.',
    }));
    return;
  }

  if (status >= 400 && status < 500) {
    // Permanent, well-defined rejection from our server (bad product, role
    // mismatch, account-binding mismatch, etc). Retrying will never help —
    // finish the transaction so StoreKit stops re-delivering it, and show a
    // clean, single error instead of looping on every future launch.
    logError('Server permanently rejected purchase verification (status', status, '):', serverMessage, 'transactionId:', transaction.transactionId);
    await transaction.finish();
    failedListeners.forEach((listener) => listener({ message: serverMessage }));
    return;
  }

  if (status >= 500) {
    // Our server errored. Leave the transaction unfinished so StoreKit
    // re-delivers it on the next launch or after a restart. Return instead of
    // throwing so cordova-plugin-purchase does NOT independently fire
    // store.error() with its own generic "could not be verified" message.
    logError('Server 5xx during purchase verification, will retry on next delivery. status:', status, 'transactionId:', transaction.transactionId);
    failedListeners.forEach((listener) => listener({ message: 'Your payment was received but our server had a temporary issue. Please reopen the app in a few minutes.' }));
    return;
  }

  // 2xx — verified successfully.
  log('Finishing transaction with StoreKit:', transaction.transactionId);
  await transaction.finish();
  log('Transaction finished:', transaction.transactionId);

  setNativeActivationPending(false);
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
  setNativeActivationPending(true);
  let result;
  try {
    result = await store.order(offer);
  } catch (error) {
    setNativeActivationPending(false);
    throw error;
  }
  if (result) {
    setNativeActivationPending(false);
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
