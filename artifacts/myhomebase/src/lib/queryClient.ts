import { Capacitor, CapacitorCookies } from "@capacitor/core";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

// In native Capacitor builds, VITE_API_BASE_URL is set to the production API root
// (e.g. https://gotohomebase.com) so relative /api/* paths resolve correctly.
// In development and in the live-URL Capacitor approach the value is empty and
// relative paths are used as-is.
const NATIVE_FALLBACK_API_BASE = 'https://gotohomebase.com';
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string)
  || (Capacitor.isNativePlatform() ? NATIVE_FALLBACK_API_BASE : '');
const AUTH_TRANSITION_KEY = 'native-auth-transition-until';
const AUTH_TRANSITION_WINDOW_MS = 6000;

function getAuthTransitionExpiry() {
  if (typeof window === 'undefined') return 0;
  const raw = window.sessionStorage.getItem(AUTH_TRANSITION_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isAuthTransitionActive() {
  const expiry = getAuthTransitionExpiry();
  if (!expiry) return false;
  if (Date.now() < expiry) return true;
  window.sessionStorage.removeItem(AUTH_TRANSITION_KEY);
  return false;
}

export function beginAuthTransition(windowMs: number = AUTH_TRANSITION_WINDOW_MS) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    AUTH_TRANSITION_KEY,
    String(Date.now() + windowMs),
  );
}

export function clearAuthTransition() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(AUTH_TRANSITION_KEY);
}

async function syncNativeSessionCookieFromResponse(res: Response) {
  if (!Capacitor.isNativePlatform()) return;

  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return;

  const match = setCookie.match(/connect\.sid=([^;]+)/i);
  if (!match?.[1]) return;

  try {
    await CapacitorCookies.setCookie({
      url: API_BASE || NATIVE_FALLBACK_API_BASE,
      key: 'connect.sid',
      value: match[1],
      path: '/',
    });
  } catch (error) {
    console.warn('[queryClient] Failed to sync native session cookie', error);
  }
}

// The Vite base path (e.g. "/myhomebase" in dev, "/" in production).
// window.location.pathname includes this prefix, so we must strip it before
// comparing against our public-path list.
const VITE_BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, '');

// Public paths where a 401 should NOT trigger a redirect (user is already unauthenticated)
const PUBLIC_PATHS = ['/', '/signin', '/faq', '/contact', '/terms-of-service',
  '/privacy-policy', '/legal-disclaimer', '/support', '/hws-modal',
  '/onboarding', '/pay', '/handoff', '/invite'];

function isPublicPath(pathname: string) {
  // Strip the Vite base prefix so we compare app-relative paths
  const rel = (VITE_BASE && pathname.startsWith(VITE_BASE))
    ? pathname.slice(VITE_BASE.length) || '/'
    : pathname;
  return PUBLIC_PATHS.some(p => rel === p || rel.startsWith(p + '/'));
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 Unauthorized
    if (res.status === 401) {
      const pathname = window.location.pathname;
      const isPublic = isPublicPath(pathname);

      // Debug: log every 401 so we can identify the culprit query
      console.warn(
        `[queryClient] 401 on ${res.url} | pathname=${pathname} | isPublic=${isPublic}`
      );

      if (isAuthTransitionActive()) {
        console.warn('[queryClient] Suppressing 401 redirect during auth transition window');
        throw new Error('Unauthorized');
      }

      // Only perform session cleanup + redirect when on a protected route.
      // On public routes the user is already unauthenticated — clearing the
      // cache or redirecting here creates an infinite reload loop.
      if (!isPublic) {
        console.warn('[queryClient] Clearing cache and redirecting to signin');
        queryClient.clear();
        // Use VITE_BASE so the redirect works in both dev (/myhomebase) and prod (/)
        window.location.href = `${VITE_BASE}/signin`;
      }
      throw new Error('Unauthorized');
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string = "GET",
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  await syncNativeSessionCookieFromResponse(res);
  return res;
}

export async function apiFileUpload(
  url: string,
  formData: FormData,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const url = `${API_BASE}${queryKey.join("/") as string}`;

    const res = await fetch(url, {
      credentials: "include",
      signal,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export async function primeAuthUserCache(user: unknown) {
  await queryClient.cancelQueries({ queryKey: ['/api/auth/user'] });
  await queryClient.cancelQueries({ queryKey: ['/api/user'] });
  queryClient.setQueryData(['/api/auth/user'], user);
  queryClient.setQueryData(['/api/user'], user);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForAuthSession(userFallback?: unknown) {
  if (!Capacitor.isNativePlatform()) {
    if (userFallback !== undefined) {
      await primeAuthUserCache(userFallback);
    }
    beginAuthTransition();
    return userFallback ?? null;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/user`, {
        credentials: 'include',
      });

      if (res.ok) {
        const user = await res.json();
        await primeAuthUserCache(user);
        beginAuthTransition();
        return user;
      }
    } catch {
      // Ignore transient native bridge/cookie timing failures and retry.
    }

    await delay(250);
  }

  if (userFallback !== undefined) {
    await primeAuthUserCache(userFallback);
  }

  clearAuthTransition();
  throw new Error('Authenticated session could not be confirmed on this device.');
}
