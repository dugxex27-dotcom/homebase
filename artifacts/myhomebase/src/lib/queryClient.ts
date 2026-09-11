import { Capacitor } from "@capacitor/core";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/lib/auth-events";

// In native Capacitor builds, VITE_API_BASE_URL is set to the production API root
// (e.g. https://gotohomebase.com) so relative /api/* paths resolve correctly.
// In development and in the live-URL Capacitor approach the value is empty and
// relative paths are used as-is.
const NATIVE_FALLBACK_API_BASE = 'https://gotohomebase.com';
export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string)
  || (Capacitor.isNativePlatform() ? NATIVE_FALLBACK_API_BASE : '');

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

      // Only perform session cleanup + redirect when on a protected route.
      // On public routes the user is already unauthenticated — clearing the
      // cache or redirecting here creates an infinite reload loop.
      if (!isPublic) {
        console.warn('[queryClient] Clearing cache and redirecting to signin');
        // Give mounted features a synchronous chance to persist safe local state
        // before the redirect tears down the application.
        window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
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
  signal?: AbortSignal,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    signal,
  });

  await throwIfResNotOk(res);
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
  async ({ queryKey }) => {
    const url = `${API_BASE}${queryKey.join("/") as string}`;

    const res = await fetch(url, {
      credentials: "include",
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

const INVOICE_BADGE_QUERY_KEY = ["/api/homeowner/linked-invoices/unclaimed-count"] as const;
const INVOICE_BADGE_CHANNEL_NAME = "myhomebase-invoice-badge";
const INVOICE_BADGE_STORAGE_KEY = "myhomebase:invoice-badge-changed";

function invalidateInvoiceBadge() {
  void queryClient.invalidateQueries({ queryKey: INVOICE_BADGE_QUERY_KEY });
}

let invoiceBadgeChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined") {
  if (typeof BroadcastChannel !== "undefined") {
    invoiceBadgeChannel = new BroadcastChannel(INVOICE_BADGE_CHANNEL_NAME);
    invoiceBadgeChannel.addEventListener("message", invalidateInvoiceBadge);
  } else {
    window.addEventListener("storage", (event) => {
      if (event.key === INVOICE_BADGE_STORAGE_KEY && event.newValue) {
        invalidateInvoiceBadge();
      }
    });
  }
}

export function notifyInvoiceBadgeChanged() {
  invalidateInvoiceBadge();

  if (invoiceBadgeChannel) {
    invoiceBadgeChannel.postMessage("changed");
    return;
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(INVOICE_BADGE_STORAGE_KEY, String(Date.now()));
    localStorage.removeItem(INVOICE_BADGE_STORAGE_KEY);
  }
}
