import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { openPaymentUrl } from "@/lib/nativeBrowser";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ContractorCheckout() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get("plan") ?? "basic";
  // trialMode = true for new users (inactive, never subscribed) or when explicitly flagged
  const typedUser = user as { subscriptionStatus?: string; stripeCustomerId?: string } | undefined;
  const trialMode =
    urlParams.get("trial") === "true" ||
    urlParams.get("onboarding") === "true" ||
    (typedUser?.subscriptionStatus === "inactive" && !typedUser?.stripeCustomerId);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
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
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
      setLocation("/contractor-pricing");
    },
  });

  useEffect(() => {
    if (user) {
      checkoutMutation.mutate();
    }
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      <p className="text-gray-600">Preparing your checkout…</p>
    </div>
  );
}
