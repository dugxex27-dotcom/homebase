/**
 * nativeSession.ts — remember-me token persistence for native (Capacitor) app.
 *
 * On iOS/Android, WKWebView session cookies are lost when the app is fully killed.
 * We work around this by storing a long-lived server-issued token in @capacitor/preferences
 * (which persists across app restarts) and exchanging it for a fresh session on next launch.
 *
 * Only active on native platforms — all functions are no-ops on web.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'mhb_remember_token';

export async function storeRememberToken(token: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Preferences.set({ key: TOKEN_KEY, value: token });
}

export async function getRememberToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  return value;
}

export async function clearRememberToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Preferences.remove({ key: TOKEN_KEY });
}

/**
 * Try to restore a session from the stored remember-me token.
 * On success, rotates the stored token to the new one returned by the server.
 * Returns true if the session was successfully restored.
 */
export async function tryRestoreSession(): Promise<boolean> {
  const token = await getRememberToken();
  if (!token) return false;

  try {
    const response = await fetch('/api/auth/restore-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-native-app': '1',
      },
      body: JSON.stringify({ rememberToken: token }),
      credentials: 'include',
    });

    if (!response.ok) {
      // Token invalid or expired — clear it so we don't retry on every launch
      await clearRememberToken();
      return false;
    }

    const data = await response.json();

    // Server rotates the token on every exchange — store the new one
    if (data.newRememberToken) {
      await storeRememberToken(data.newRememberToken);
    }

    return true;
  } catch {
    // Network error — don't clear the token, try again next launch
    return false;
  }
}
