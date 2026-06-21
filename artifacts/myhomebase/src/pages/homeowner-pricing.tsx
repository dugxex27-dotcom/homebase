import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useHomeownerSubscription } from "@/hooks/useHomeownerSubscription";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Home, Zap, Crown, Loader2, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { openPaymentUrl, onBrowserFinished } from "@/lib/nativeBrowser";

const PLAN_SLUG_MAP: Record<string, string> = {
  base: 'base',
  premium: 'premium',
  plus: 'premium_plus',
  premium_plus: 'premium_plus',
};

const PRICING_PLAN_INFO: Record<string, { name: string; price: string }> = {
  base: { name: 'Base Plan', price: '$5/mo' },
  premium: { name: 'Premium Plan', price: '$20/mo' },
  premium_plus: { name: 'Premium Plus', price: '$40/mo' },
};

export default function HomeownerPricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  const isOnboarding = urlParams.get('onboarding') === 'true';
  const rawPlanParam = urlParams.get('plan') ?? '';
  const preSelectedPlan = PLAN_SLUG_MAP[rawPlanParam] ?? null;
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const planRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { 
    hasActiveSubscription, 
    isInTrial, 
    currentPlan: actualPlan,
    maxHouses: subscriptionMaxHouses,
    isLoading: subscriptionLoading 
  } = useHomeownerSubscription();

  // Direct Stripe checkout mutation
  const queryClient = useQueryClient();

  useEffect(() => {
    return onBrowserFinished(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setCheckoutPlan(null);
    });
  }, [queryClient]);

  const checkoutMutation = useMutation({
    mutationFn: async (plan: string) => {
      setCheckoutPlan(plan);
      const res = await apiRequest('/api/create-subscription-checkout', 'POST', { plan, trialMode: isOnboarding });
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.url) {
        await openPaymentUrl(data.url);
      }
    },
    onError: (error: Error) => {
      setCheckoutPlan(null);
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch full user data for subscription details
  const { data: userData, isLoading, isError } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const res = await apiRequest('/api/user', 'GET');
      return res.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (preSelectedPlan && !isLoading && !subscriptionLoading) {
      const el = planRefs.current[preSelectedPlan];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [preSelectedPlan, isLoading, subscriptionLoading]);

  // Show loading state while fetching user data
  if (isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen py-8 px-4 flex items-center justify-center" style={{ backgroundColor: 'var(--page-background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  // Show error state if query fails
  if (isError || !userData) {
    return (
      <div className="min-h-screen py-8 px-4 flex items-center justify-center" style={{ backgroundColor: 'var(--page-background)' }}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Unable to Load Pricing Plans</CardTitle>
            <CardDescription>
              We couldn't fetch your account information. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full bg-[#3C258E] hover:bg-[#2C0F5B] text-white">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only show "Current Plan" if user has an active subscription (not trial, not expired)
  // Users can always upgrade - they should be directed to billing page
  const maxHouses = hasActiveSubscription 
    ? (subscriptionMaxHouses === 'unlimited' ? 999 : Number(subscriptionMaxHouses) || 0)
    : 0; // Treat trial/expired users as having no current plan so they can subscribe

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--page-background)' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          {isOnboarding ? (
            <>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Start Your Free 14-Day Trial
              </h1>
              <p className="text-lg max-w-2xl mx-auto text-gray-600">
                Choose a plan and enter your payment info to get started. You won't be charged until your 14-day trial ends — cancel anytime.
              </p>
              <div className="flex items-center justify-center gap-2 text-[#09694A] font-medium">
                <ShieldCheck className="w-5 h-5" />
                <span>No charge today. Trial starts the moment you sign up.</span>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Choose Your Plan
              </h1>
              <p className="text-lg max-w-2xl mx-auto text-gray-600">
                Select the plan that fits your property management needs. Upgrade or downgrade anytime.
              </p>
            </>
          )}
        </div>

        {/* Pre-selected plan banner — shown when arriving from onboarding with a plan param */}
        {preSelectedPlan && !hasActiveSubscription && PRICING_PLAN_INFO[preSelectedPlan] && (
          <div
            data-testid="pricing-selected-plan-banner"
            className="flex items-center gap-3 max-w-md mx-auto rounded-xl px-4 py-3"
            style={{ background: 'rgba(83,74,183,0.08)', border: '1.5px solid rgba(83,74,183,0.2)' }}
          >
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: 'var(--purple)' }} />
            <div className="flex-1 min-w-0">
              <p className="m-0 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--purple-deep)', letterSpacing: '0.07em' }}>Your selected plan</p>
              <p className="m-0 text-sm font-bold" style={{ color: 'var(--purple)' }}>
                {PRICING_PLAN_INFO[preSelectedPlan].name} — {PRICING_PLAN_INFO[preSelectedPlan].price}
              </p>
            </div>
          </div>
        )}

        {/* Current Plan Badge */}
        {hasActiveSubscription && !isOnboarding && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="px-4 py-2 text-sm bg-[#EEEDFE] text-[#2C0F5B]" data-testid="badge-current-plan">
              Your Current Plan: {actualPlan === 'premium_plus' ? 'Premium Plus' : actualPlan === 'premium' ? 'Premium' : 'Base'}
            </Badge>
          </div>
        )}
        
        {/* Trial or Expired Trial Message */}
        {!hasActiveSubscription && !isOnboarding && (
          <div className="flex justify-center">
            <Badge variant="secondary" className={`px-4 py-2 text-sm ${isInTrial ? 'bg-[#E6F1FB] text-[#1560A2]' : 'bg-amber-100 text-amber-800'}`}>
              {isInTrial 
                ? 'You are on a 14-day free trial. Select a plan to continue after your trial ends.'
                : 'Your free trial has ended. Select a plan below to continue using MyHomeBase™.'}
            </Badge>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Base Plan */}
          <div ref={(el) => { planRefs.current['base'] = el; }}>
          <Card className={`relative transition-all hover:shadow-lg ${hasActiveSubscription && actualPlan === 'base' ? 'border-4 border-[#3C258E] shadow-xl' : preSelectedPlan === 'base' && !hasActiveSubscription ? 'border-4 border-[#3C258E] shadow-xl' : 'border-2'}`}>
            {hasActiveSubscription && actualPlan === 'base' ? (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-[#3C258E] text-white px-4 py-1" data-testid="badge-base-plan-current">Current Plan</Badge>
              </div>
            ) : preSelectedPlan === 'base' && !hasActiveSubscription ? (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-[#3C258E] text-white px-4 py-1" data-testid="badge-base-plan-selected">Your Selection</Badge>
              </div>
            ) : null}
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-[#EEEDFE]">
                  <Home className="w-8 h-8 text-[#3C258E]" />
                </div>
              </div>
              <CardTitle className="text-2xl" style={{ color: 'var(--purple-deep)' }} data-testid="title-base-plan">Base Plan</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold" style={{ color: 'var(--purple-deep)' }} data-testid="price-base-plan">$5</span>
                <span className="text-gray-600">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Up to <strong>2 properties</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Full maintenance scheduling</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Contractor directory access</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Service record tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Home health score</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm">DIY savings tracker</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Email support</span>
                </li>
              </ul>
              {hasActiveSubscription && actualPlan === 'base' ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-[#3C258E] hover:bg-[#2C0F5B] text-white"
                  data-testid="button-select-base-plan"
                  onClick={() => checkoutMutation.mutate('base')}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending && checkoutPlan === 'base' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isOnboarding ? (
                    'Start Free Trial — Base'
                  ) : !hasActiveSubscription ? 'Select Base Plan' : 'Downgrade to Base'}
                </Button>
              )}
            </CardContent>
          </Card>
          </div>

          {/* Premium Plan */}
          <div ref={(el) => { planRefs.current['premium'] = el; }}>
          <Card className={`relative transition-all hover:shadow-lg ${hasActiveSubscription && actualPlan === 'premium' ? 'border-4 border-[#3C258E] shadow-xl' : preSelectedPlan === 'premium' && !hasActiveSubscription ? 'border-4 border-[#3C258E] shadow-xl' : 'border-2'}`}>
            {hasActiveSubscription && actualPlan === 'premium' ? (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-[#3C258E] text-white px-4 py-1" data-testid="badge-premium-plan-current">Current Plan</Badge>
              </div>
            ) : preSelectedPlan === 'premium' && !hasActiveSubscription ? (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-[#3C258E] text-white px-4 py-1" data-testid="badge-premium-plan-selected">Your Selection</Badge>
              </div>
            ) : null}
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-[#EEEDFE]">
                  <Zap className="w-8 h-8 text-[#3C258E]" />
                </div>
              </div>
              <CardTitle className="text-2xl" style={{ color: 'var(--purple-deep)' }} data-testid="title-premium-plan">Premium Plan</CardTitle>
              <CardDescription>For active property managers</CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold" style={{ color: 'var(--purple-deep)' }} data-testid="price-premium-plan">$20</span>
                <span className="text-gray-600">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>3-6 properties</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>Everything in Base</strong></span>
                </li>
              </ul>
              {hasActiveSubscription && actualPlan === 'premium' ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-[#3C258E] hover:bg-[#2C0F5B] text-white"
                  data-testid="button-select-premium-plan"
                  onClick={() => checkoutMutation.mutate('premium')}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending && checkoutPlan === 'premium' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isOnboarding ? (
                    'Start Free Trial — Premium'
                  ) : !hasActiveSubscription ? 'Select Premium Plan' : actualPlan === 'base' ? 'Upgrade to Premium' : 'Downgrade to Premium'}
                </Button>
              )}
            </CardContent>
          </Card>
          </div>

          {/* Premium Plus Plan */}
          <div ref={(el) => { planRefs.current['premium_plus'] = el; }}>
          <Card className={`relative transition-all hover:shadow-lg ${hasActiveSubscription && actualPlan === 'premium_plus' ? 'border-4 border-[#3C258E] shadow-xl' : preSelectedPlan === 'premium_plus' && !hasActiveSubscription ? 'border-4 border-[#3C258E] shadow-xl' : 'border-2'}`}>
            {hasActiveSubscription && actualPlan === 'premium_plus' ? (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-[#3C258E] text-white px-4 py-1" data-testid="badge-premium-plus-plan-current">Current Plan</Badge>
              </div>
            ) : preSelectedPlan === 'premium_plus' && !hasActiveSubscription ? (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-[#3C258E] text-white px-4 py-1" data-testid="badge-premium-plus-plan-selected">Your Selection</Badge>
              </div>
            ) : null}
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-[#EEEDFE]">
                  <Crown className="w-8 h-8 text-[#3C258E]" />
                </div>
              </div>
              <CardTitle className="text-2xl" style={{ color: 'var(--purple-deep)' }} data-testid="title-premium-plus-plan">Premium Plus</CardTitle>
              <CardDescription>For serious property portfolios</CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold" style={{ color: 'var(--purple-deep)' }} data-testid="price-premium-plus-plan">$40</span>
                <span className="text-gray-600">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>7+ properties</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>Everything in Premium</strong></span>
                </li>
              </ul>
              {hasActiveSubscription && actualPlan === 'premium_plus' ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-[#3C258E] hover:bg-[#2C0F5B] text-white"
                  data-testid="button-select-premium-plus-plan"
                  onClick={() => checkoutMutation.mutate('premium_plus')}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending && checkoutPlan === 'premium_plus' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isOnboarding ? (
                    'Start Free Trial — Premium Plus'
                  ) : !hasActiveSubscription ? 'Select Premium Plus' : 'Upgrade to Premium Plus'}
                </Button>
              )}
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Additional Info */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--purple-deep)' }}>
                {isOnboarding ? '14-Day Free Trial — No Charge Today' : 'All Plans Include a 14-Day Free Trial'}
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {isOnboarding
                  ? 'Your card is saved securely but not charged until your 14-day trial ends. Cancel before then and you owe nothing.'
                  : 'Try MyHomeBase™ risk-free for 14 days. Cancel anytime during your trial with no charges.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                <Button 
                  asChild 
                  className="bg-[#3C258E] hover:bg-[#2C0F5B] text-white"
                  data-testid="button-manage-subscription-footer"
                >
                  <Link href="/billing">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage My Subscription
                  </Link>
                </Button>
                <Button 
                  asChild 
                  variant="outline"
                  data-testid="button-view-billing-history"
                >
                  <Link href="/billing">View Billing History</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--purple-deep)' }}>
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change my plan at any time?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens if I exceed my property limit?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You'll be prompted to upgrade to the next tier when you try to add a property beyond your current plan's limit. Your existing properties remain accessible.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Every new account includes a 14-day free trial. Your card is saved securely but not charged during the trial. If you cancel before the trial ends, you won't be charged at all. After the trial, subscriptions are billed monthly with no long-term contracts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
