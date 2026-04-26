import { QueryClient, QueryFunction } from "@tanstack/react-query";

// In native Capacitor builds, VITE_API_BASE_URL is set to the production API root
// (e.g. https://gotohomebase.com) so relative /api/* paths resolve correctly.
// In development and in the live-URL Capacitor approach the value is empty and
// relative paths are used as-is.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '';

// Public paths where a 401 should NOT trigger a redirect (user is already unauthenticated)
const PUBLIC_PATHS = ['/', '/signin', '/faq', '/contact', '/terms-of-service',
  '/privacy-policy', '/legal-disclaimer', '/support', '/hws-modal',
  '/onboarding', '/pay', '/handoff'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 Unauthorized
    if (res.status === 401) {
      // Only perform session cleanup + redirect when on a protected route.
      // On public routes the user is already unauthenticated — clearing the
      // cache or redirecting here creates an infinite reload loop.
      if (!isPublicPath(window.location.pathname)) {
        queryClient.clear();
        window.location.href = '/signin';
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
    const res = await fetch(`${API_BASE}${queryKey.join("/") as string}`, {
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
