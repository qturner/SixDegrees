import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  JWSTransactionDecodedPayload,
  JWSRenewalInfoDecodedPayload,
  ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import fetch from "node-fetch";

const bundleId = process.env.APP_STORE_BUNDLE_ID || "com.sixdegreesapp.ios";
const issuerId = process.env.APP_STORE_ISSUER_ID || "";
const keyId = process.env.APP_STORE_KEY_ID || "";
const privateKey = (process.env.APP_STORE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const appStoreEnv = process.env.APP_STORE_ENV === "Sandbox" ? Environment.SANDBOX : Environment.PRODUCTION;

// Apple root certificate URLs (DER format)
const APPLE_ROOT_CA_URLS = [
  "https://www.apple.com/appleca/AppleIncRootCertificate.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G2.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
];

// Lazy-initialized singletons
let apiClient: AppStoreServerAPIClient | null = null;
let verifier: SignedDataVerifier | null = null;
let rootCertsPromise: Promise<Buffer[]> | null = null;

async function fetchAppleRootCertificates(): Promise<Buffer[]> {
  const certs: Buffer[] = [];
  for (const url of APPLE_ROOT_CA_URLS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        certs.push(Buffer.from(arrayBuffer));
      }
    } catch (err) {
      console.error(`Failed to fetch Apple root cert from ${url}:`, err);
    }
  }
  return certs;
}

function getAppleRootCerts(): Promise<Buffer[]> {
  if (!rootCertsPromise) {
    rootCertsPromise = fetchAppleRootCertificates();
  }
  return rootCertsPromise;
}

function getApiClient(): AppStoreServerAPIClient {
  if (!apiClient) {
    apiClient = new AppStoreServerAPIClient(
      privateKey,
      keyId,
      issuerId,
      bundleId,
      appStoreEnv,
    );
  }
  return apiClient;
}

async function getVerifier(): Promise<SignedDataVerifier> {
  if (!verifier) {
    const rootCerts = await getAppleRootCerts();
    verifier = new SignedDataVerifier(
      rootCerts,
      true,    // Enable online checks
      appStoreEnv,
      bundleId,
    );
  }
  return verifier;
}

/**
 * Verify and decode an App Store Server Notification V2 signed payload.
 */
export async function verifyAndDecodeNotification(
  signedPayload: string,
): Promise<ResponseBodyV2DecodedPayload> {
  const v = await getVerifier();
  return await v.verifyAndDecodeNotification(signedPayload);
}

/**
 * Verify and decode a signed transaction info JWS string.
 */
export async function verifyTransaction(
  signedTransactionInfo: string,
): Promise<JWSTransactionDecodedPayload> {
  const v = await getVerifier();
  return await v.verifyAndDecodeTransaction(signedTransactionInfo);
}

/**
 * Verify and decode signed renewal info JWS string.
 */
export async function verifyRenewalInfo(
  signedRenewalInfo: string,
): Promise<JWSRenewalInfoDecodedPayload> {
  const v = await getVerifier();
  return await v.verifyAndDecodeRenewalInfo(signedRenewalInfo);
}

export type DerivedStatus =
  | "active"
  | "expired"
  | "revoked"
  | "billing_retry"
  | "grace_period";

/**
 * Derive the entitlement status from decoded transaction + renewal info.
 *
 * Uses "newer wins" logic: only update if the incoming event's expiresDate
 * is newer than the stored currentPeriodEndsAt.
 */
export function deriveEntitlementStatus(
  transactionInfo: JWSTransactionDecodedPayload,
  renewalInfo: JWSRenewalInfoDecodedPayload | null,
  storedCurrentPeriodEndsAt?: Date | null,
): {
  status: DerivedStatus;
  shouldUpdate: boolean;
  currentPeriodEndsAt: Date | null;
  autoRenewEnabled: boolean;
} {
  const expiresDate = transactionInfo.expiresDate
    ? new Date(transactionInfo.expiresDate)
    : null;
  const revocationDate = transactionInfo.revocationDate
    ? new Date(transactionInfo.revocationDate)
    : null;

  // "Newer wins": skip if the stored period end is already more recent
  if (
    storedCurrentPeriodEndsAt &&
    expiresDate &&
    expiresDate < storedCurrentPeriodEndsAt
  ) {
    return {
      status: "active", // don't change
      shouldUpdate: false,
      currentPeriodEndsAt: storedCurrentPeriodEndsAt,
      autoRenewEnabled: true,
    };
  }

  const autoRenewEnabled = renewalInfo?.autoRenewStatus === 1;
  const now = new Date();

  let status: DerivedStatus;

  if (revocationDate) {
    status = "revoked";
  } else if (expiresDate && expiresDate < now) {
    // Expired — but may be in grace period or billing retry
    if (renewalInfo?.gracePeriodExpiresDate) {
      const gracePeriodEnds = new Date(renewalInfo.gracePeriodExpiresDate);
      if (gracePeriodEnds > now) {
        status = "grace_period";
      } else {
        status = "expired";
      }
    } else if (renewalInfo?.isInBillingRetryPeriod) {
      status = "billing_retry";
    } else {
      status = "expired";
    }
  } else {
    status = "active";
  }

  return {
    status,
    shouldUpdate: true,
    currentPeriodEndsAt: expiresDate,
    autoRenewEnabled,
  };
}

/**
 * Derive plan type from product ID.
 */
export function derivePlanFromProductId(productId: string): "monthly" | "annual" {
  if (productId.toLowerCase().includes("annual") || productId.toLowerCase().includes("yearly")) {
    return "annual";
  }
  return "monthly";
}

export { getApiClient, getVerifier };
