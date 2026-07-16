import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { openPaymentUrl, isNativePlatform } from "@/lib/nativeBrowser";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ContractorCheckout() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [nativeCheckoutTimedOut, setNativeCheckoutTimedOut] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get("plan") ?? "basic";
  const typedUser = user as { subscriptionStatus?: string; stripeCustomerId?: string } | undefined;
  const trialMode =
    urlParams.get("trial") === "true" ||
    urlParams.get("onboarding") === "true" ||
    (typedUser?.subscriptionStatus === "inactive" && !typedUser?.stripeCustomerId);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      setCheckoutError(null);
      const res = await apiRequest("/api/create-subscription-checkout", "POST", { plan, trialMode });
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.url) {
        await openPaymentUrl(data.url);
      } else {
        setLocation("/contractor-dashboard");
      }
    },
    onError: (error: Error) => {
      setCheckoutError(error.message || "Failed to start checkout. Please try again.");
      apiRequest("/api/contractor/resend-checkout-email", "POST", { plan }).catch(() => {});
    },
  });

  useEffect(() => {
    if (user) return;
    const timer = setTimeout(() => setAuthTimedOut(true), 10_000);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    checkoutMutation.mutate();
  }, [user]);

  useEffect(() => {
    if (!isNativePlatform) return;
    if (!checkoutMutation.isPending) return;
    const timer = setTimeout(() => setNativeCheckoutTimedOut(true), 10_000);
    return () => clearTimeout(timer);
  }, [checkoutMutation.isPending]);

  if (authTimedOut && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="p-4 rounded-full bg-red-100">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h1 className="text-xl font-bold text-gray-900">Taking too long to load</h1>
          <p className="text-gray-600 text-sm">
            We couldn't verify your account in time. This is usually a temporary issue — please try again.
            If the problem continues, check your connection or try signing in again.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => window.location.reload()}
            style={{ background: "linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)" }}
            data-testid="button-retry-auth"
          >
            <RefreshCw className="h-4 w-4 mr-2" />Try again
          </Button>
          <Button variant="outline" onClick={() => setLocation("/signin/contractor")}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (isNativePlatform && nativeCheckoutTimedOut && checkoutMutation.isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="p-4 rounded-full bg-red-100">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h1 className="text-xl font-bold text-gray-900">Taking too long to load</h1>
          <p className="text-gray-600 text-sm">
            We couldn't start your checkout session in time. This is usually a temporary issue — please try again.
            If the problem continues, check your connection or try signing in again.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => window.location.reload()}
            style={{ background: "linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)" }}
            data-testid="button-retry-native-checkout"
          >
            <RefreshCw className="h-4 w-4 mr-2" />Try again
          </Button>
          <Button variant="outline" onClick={() => setLocation("/signin/contractor")}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (checkoutError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="p-4 rounded-full bg-red-100">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h1 className="text-xl font-bold text-gray-900">Checkout didn't load</h1>
          <p className="text-gray-600 text-sm">
            We couldn't start your checkout session. This is usually a temporary issue — please try again.
            If the problem continues, check your connection or try a different browser.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            style={{ background: "linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)" }}
            data-testid="button-retry-checkout"
          >
            {checkoutMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Retrying…</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />Try again</>
            )}
          </Button>
          <Button variant="outline" onClick={() => setLocation("/contractor-pricing")}>
            View pricing plans
          </Button>
        </div>
        <p className="text-xs text-gray-400">
          We've sent you an email with a link to complete your setup when you're ready.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      <p className="text-gray-600">Preparing your checkout…</p>
    </div>
  );
}
