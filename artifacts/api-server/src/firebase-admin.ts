import { createPrivateKey, sign } from 'node:crypto';
import { logger } from './lib/logger';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

let serviceAccount: ServiceAccount | null = null;
let tokenCache: AccessTokenCache | null = null;

function getServiceAccount(): ServiceAccount | null {
  if (serviceAccount) return serviceAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    serviceAccount = JSON.parse(raw) as ServiceAccount;
    return serviceAccount;
  } catch {
    logger.error('[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT');
    return null;
  }
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getFcmAccessToken(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);

  if (tokenCache && tokenCache.expiresAt > now + 60) {
    return tokenCache.token;
  }

  const sa = getServiceAccount();
  if (!sa) return null;

  try {
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }));
    const signingInput = `${header}.${payload}`;
    const privateKey = createPrivateKey(sa.private_key);
    const signature = sign('sha256', Buffer.from(signingInput), privateKey);
    const jwt = `${signingInput}.${base64url(signature)}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(`[FCM] Token exchange failed: ${res.status} ${text}`);
      return null;
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    tokenCache = { token: data.access_token, expiresAt: now + data.expires_in };
    return data.access_token;
  } catch (err) {
    logger.error({ err }, '[FCM] Failed to obtain access token');
    return null;
  }
}

export interface FcmMessage {
  notification: { title: string; body: string; imageUrl?: string };
  data?: Record<string, string>;
}

export interface MulticastResult {
  successCount: number;
  failureCount: number;
  responses: Array<{ success: boolean; messageId?: string; error?: string }>;
}

export async function sendFcmMulticast(tokens: string[], message: FcmMessage): Promise<MulticastResult | null> {
  const sa = getServiceAccount();
  if (!sa) return null;

  const accessToken = await getFcmAccessToken();
  if (!accessToken) return null;

  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      const body: Record<string, unknown> = {
        message: {
          token,
          notification: {
            title: message.notification.title,
            body: message.notification.body,
            ...(message.notification.imageUrl ? { image: message.notification.imageUrl } : {}),
          },
          data: message.data ?? {},
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errData?.error?.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { name: string };
      return data.name;
    })
  );

  let successCount = 0;
  let failureCount = 0;
  const responses = results.map((r) => {
    if (r.status === 'fulfilled') {
      successCount++;
      return { success: true, messageId: r.value };
    } else {
      failureCount++;
      return { success: false, error: String((r as PromiseRejectedResult).reason) };
    }
  });

  return { successCount, failureCount, responses };
}

export function isFcmConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT;
}
