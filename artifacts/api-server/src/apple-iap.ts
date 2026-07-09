// Apple StoreKit In-App Purchase support (Task #287)
//
// Direct StoreKit integration (no RevenueCat). Verifies signed transactions
// from `cordova-plugin-purchase` (StoreKit 2 JWS) directly against Apple's
// certificate chain using `app-store-server-api`'s decode helpers — this
// does NOT require App Store Connect API credentials, since decode*()
// functions validate the JWS signature against Apple's bundled root CA.
//
// If APPLE_IAP_KEY_ID / APPLE_IAP_ISSUER_ID / APPLE_IAP_PRIVATE_KEY env vars
// are configured in the future, they would only be needed for calling the
// live App Store Server API (e.g. querying full transaction history) — not
// for the core purchase-verification / webhook flow implemented here.
import {
  decodeTransaction,
  decodeNotificationPayload,
  type JWSTransactionDecodedPayload,
} from "app-store-server-api";
import { createHash } from "crypto";
import { storage } from "./storage";
import type { User } from "@workspace/db";

const APPLE_BUNDLE_ID = "com.gotohomebase.app";

/**
 * Derives the same UUID-format `appAccountToken` that the client's
 * `cordova-plugin-purchase` produces via its `'uuid'` obfuscator
 * (`CdvPurchase.Utils.md5toUUID`) when `store.applicationUsername` is set to
 * the authenticated user's id before calling `store.order()`.
 *
 * This lets the server independently recompute the expected token from the
 * session's `userId` and compare it against the token Apple actually signed
 * into the transaction, without trusting any client-supplied value — closing
 * the gap where a JWS/receipt from a different Apple account could otherwise
 * be replayed to grant entitlements to an arbitrary user.
 *
 * Algorithm (must stay in lockstep with cordova-plugin-purchase's
 * `Utils.md5toUUID`): md5(userId) hex digest, reformatted as
 * xxxxxxxx-xxxx-3xxx-8xxx-xxxxxxxxxxxx (version 3 / variant 8 UUID).
 */
function expectedAppAccountToken(userId: string): string {
  const hash = createHash("md5").update(userId).digest("hex");
  return (
    hash.substring(0, 8) +
    "-" +
    hash.substring(8, 12) +
    "-3" +
    hash.substring(13, 16) +
    "-8" +
    hash.substring(17, 20) +
    "-" +
    hash.substring(20, 32)
  );
}

// Maps Apple App Store product IDs to internal plan identifiers used by the
// existing Stripe-based subscription system.
export const APPLE_PRODUCT_TO_PLAN: Record<
  string,
  { role: "homeowner" | "contractor"; plan: string; maxHouses?: number }
> = {
  "com.gotohomebase.app.homeowner.base.monthly": { role: "homeowner", plan: "base", maxHouses: 2 },
  "com.gotohomebase.app.homeowner.premium.monthly": { role: "homeowner", plan: "premium", maxHouses: 6 },
  "com.gotohomebase.app.homeowner.premiumplus.monthly": { role: "homeowner", plan: "premium_plus", maxHouses: 999 },
  "com.gotohomebase.app.contractor.basic.monthly": { role: "contractor", plan: "basic" },
  "com.gotohomebase.app.contractor.pro1.monthly": { role: "contractor", plan: "pro" },
};

export const APPLE_PRODUCT_IDS = Object.keys(APPLE_PRODUCT_TO_PLAN);

export class AppleIapError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "AppleIapError";
  }
}

/**
 * Verifies a StoreKit-2 signed transaction (JWS) and activates the matching
 * plan on the given user record, mirroring how Stripe checkout activates a
 * subscription today.
 */
export async function verifyAndActivateAppleTransaction(
  userId: string,
  signedTransactionInfo: string
): Promise<{ user: User; transaction: JWSTransactionDecodedPayload }> {
  console.log(`[APPLE-IAP] Verifying transaction for user ${userId}...`);

  let transaction: JWSTransactionDecodedPayload;
  try {
    transaction = await decodeTransaction(signedTransactionInfo);
  } catch (error: any) {
    console.error(`[APPLE-IAP] Signature verification FAILED for user ${userId}:`, error?.message || error);
    throw new AppleIapError("Could not verify transaction with Apple", 400);
  }

  console.log(
    `[APPLE-IAP] Decoded transaction for user ${userId}: productId=${transaction.productId}, ` +
      `transactionId=${transaction.transactionId}, originalTransactionId=${transaction.originalTransactionId}, ` +
      `bundleId=${transaction.bundleId}, expiresDate=${transaction.expiresDate}, revocationDate=${transaction.revocationDate}`
  );

  if (transaction.bundleId !== APPLE_BUNDLE_ID) {
    console.error(`[APPLE-IAP] Bundle ID mismatch: expected ${APPLE_BUNDLE_ID}, got ${transaction.bundleId}`);
    throw new AppleIapError("Transaction is for a different app", 400);
  }

  const mapping = APPLE_PRODUCT_TO_PLAN[transaction.productId];
  if (!mapping) {
    console.error(`[APPLE-IAP] REJECTED unknown/unsupported product ID: ${transaction.productId} (user ${userId})`);
    throw new AppleIapError("Unrecognized product", 400);
  }

  // Bind the transaction to the authenticated user. The client sets
  // `store.applicationUsername = userId` (with the 'uuid' obfuscator) before
  // ordering, which Apple signs into the transaction as `appAccountToken`.
  // Without this check, a valid JWS/receipt captured from ANY Apple account
  // could be replayed against this endpoint (which only requires *a* valid
  // session, not proof the transaction belongs to that session) to grant
  // entitlements to an attacker-controlled account. Reject anything that
  // doesn't carry the expected token for the calling user.
  const expectedToken = expectedAppAccountToken(userId);
  if (!transaction.appAccountToken || transaction.appAccountToken.toLowerCase() !== expectedToken.toLowerCase()) {
    console.error(
      `[APPLE-IAP] REJECTED: appAccountToken mismatch for user ${userId} — expected ${expectedToken}, ` +
        `got ${transaction.appAccountToken ?? "(none)"} on transaction ${transaction.transactionId}`
    );
    throw new AppleIapError("This purchase is not associated with your account", 403);
  }

  if (transaction.revocationDate) {
    console.warn(`[APPLE-IAP] Transaction ${transaction.transactionId} was revoked at ${transaction.revocationDate}`);
    throw new AppleIapError("This purchase was refunded or revoked", 400);
  }

  const user = await storage.getUser(userId);
  if (!user) {
    throw new AppleIapError("User not found", 404);
  }

  if (user.role !== mapping.role) {
    console.error(
      `[APPLE-IAP] REJECTED: user ${userId} has role "${user.role}" but product ${transaction.productId} is for "${mapping.role}"`
    );
    throw new AppleIapError(`This plan is not available for your account type`, 400);
  }

  const now = Date.now();
  const isExpired = transaction.expiresDate ? transaction.expiresDate < now : false;
  const isTrial = transaction.offerType === 1 || (transaction as any).offerDiscountType === "FREE_TRIAL";

  // Contractor plan tier is tracked via `subscriptionPlanId` (FK to subscription_plans),
  // not a direct column on `users` — look up the matching plan row for the purchased tier.
  let subscriptionPlanId: string | null = user.subscriptionPlanId ?? null;
  if (mapping.role === "contractor") {
    const tierKey = mapping.plan === "pro" ? "contractor_pro" : "contractor_basic";
    const contractorPlan = await storage.getSubscriptionPlanByTier(tierKey);
    if (contractorPlan) {
      subscriptionPlanId = contractorPlan.id;
    } else {
      console.error(`[APPLE-IAP] Missing required "${tierKey}" subscription_plans row`);
      throw new AppleIapError("Subscription setup is temporarily unavailable. Please try again.", 500);
    }
  }

  const updated = await storage.upsertUser({
    ...user,
    subscriptionStatus: isExpired ? "past_due" : isTrial ? "trialing" : "active",
    subscriptionSource: "apple",
    appleOriginalTransactionId: String(transaction.originalTransactionId),
    appleProductId: transaction.productId,
    maxHousesAllowed: mapping.role === "homeowner" ? mapping.maxHouses ?? null : user.maxHousesAllowed,
    subscriptionPlanId,
    trialEndsAt: isTrial && transaction.expiresDate ? new Date(transaction.expiresDate) : user.trialEndsAt,
    subscriptionStartDate: transaction.purchaseDate ? new Date(transaction.purchaseDate) : user.subscriptionStartDate,
    subscriptionEndDate: transaction.expiresDate ? new Date(transaction.expiresDate) : user.subscriptionEndDate,
  });

  console.log(
    `[APPLE-IAP] ACTIVATED plan "${mapping.plan}" for user ${userId} (${user.email}) via Apple, ` +
      `status=${updated.subscriptionStatus}, originalTransactionId=${transaction.originalTransactionId}`
  );

  return { user: updated, transaction };
}

/**
 * Handles an App Store Server Notifications V2 payload. Looks up the user
 * by the Apple original transaction ID (set during the initial purchase)
 * and updates their subscription state to reflect renewals, cancellations,
 * refunds, and billing issues.
 */
export async function handleAppleServerNotification(signedPayload: string): Promise<void> {
  const payload = await decodeNotificationPayload(signedPayload);
  const notificationType = payload.notificationType;
  const subtype = (payload as any).subtype;

  console.log(`[APPLE-IAP] Received notification: type=${notificationType} subtype=${subtype ?? "-"}`);

  const signedTransactionInfo = payload.data?.signedTransactionInfo;
  if (!signedTransactionInfo) {
    console.log(`[APPLE-IAP] Notification ${notificationType} had no transaction payload, ignoring`);
    return;
  }

  const transaction = await decodeTransaction(signedTransactionInfo);
  const originalTransactionId = String(transaction.originalTransactionId);

  const user = await storage.getUserByAppleOriginalTransactionId(originalTransactionId);
  if (!user) {
    console.warn(`[APPLE-IAP] No user found for originalTransactionId=${originalTransactionId}, notification ignored`);
    return;
  }

  const mapping = APPLE_PRODUCT_TO_PLAN[transaction.productId];

  switch (notificationType) {
    case "SUBSCRIBED":
    case "DID_RENEW": {
      await storage.upsertUser({
        ...user,
        subscriptionStatus: "active",
        subscriptionSource: "apple",
        appleProductId: transaction.productId,
        subscriptionEndDate: transaction.expiresDate ? new Date(transaction.expiresDate) : user.subscriptionEndDate,
        maxHousesAllowed: mapping?.role === "homeowner" ? mapping.maxHouses ?? null : user.maxHousesAllowed,
      });
      console.log(`[APPLE-IAP] User ${user.id} (${user.email}) subscription renewed/activated (${notificationType})`);
      break;
    }
    case "EXPIRED":
    case "GRACE_PERIOD_EXPIRED": {
      await storage.upsertUser({ ...user, subscriptionStatus: "cancelled" });
      console.log(`[APPLE-IAP] User ${user.id} (${user.email}) subscription expired (${notificationType})`);
      break;
    }
    case "DID_FAIL_TO_RENEW": {
      await storage.upsertUser({ ...user, subscriptionStatus: "past_due" });
      console.log(`[APPLE-IAP] User ${user.id} (${user.email}) subscription failed to renew, marked past_due`);
      break;
    }
    case "REFUND":
    case "REVOKE": {
      await storage.upsertUser({ ...user, subscriptionStatus: "cancelled" });
      console.log(`[APPLE-IAP] User ${user.id} (${user.email}) subscription refunded/revoked, access removed`);
      break;
    }
    case "DID_CHANGE_RENEWAL_STATUS": {
      console.log(`[APPLE-IAP] User ${user.id} (${user.email}) changed auto-renew status (subtype=${subtype})`);
      break;
    }
    default: {
      console.log(`[APPLE-IAP] Unhandled notification type "${notificationType}" for user ${user.id}, no action taken`);
    }
  }
}
