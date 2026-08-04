import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { isNativePlatform } from "@/lib/nativeBrowser";
import { tryRestoreSession } from "@/lib/nativeSession";
import { useEffect, useRef } from "react";

// Module-level flag — only attempt restore once per app launch, not on every mount
let hasTriedRestore = false;

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  // On native: if the session cookie was lost (app killed by OS), try to restore
  // using the long-lived remember-me token stored in @capacitor/preferences.
  useEffect(() => {
    if (!isNativePlatform) return;      // web — nothing to do
    if (isLoading) return;              // wait for the auth check to finish
    if (user) {                         // already authenticated
      hasTriedRestore = true;
      return;
    }
    if (hasTriedRestore) return;        // already attempted this launch

    hasTriedRestore = true;
    tryRestoreSession().then(restored => {
      if (restored) {
        // Session restored — invalidate so components get the real user
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      }
    });
  }, [user, isLoading, queryClient]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
  };
}
