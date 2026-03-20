import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useHomeownerSubscription } from "@/hooks/useHomeownerSubscription";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Home, Zap, Crown, Loader2, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function HomeownerPricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const isOnboarding = new URLSearchParams(location.split('?')[1] || '').get('onboarding') === 'true';
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const { 
    hasActiveSubscription, 
    isInTrial, 
    currentPlan: actualPlan,
    maxHouses: subscriptionMaxHouses,
    isLoading: subscriptionLoading 
  } = useHomeownerSubscription();

  // Direct Stripe checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (plan: string) => {
      setCheckoutPlan(plan);
      const res = await apiRequest('/api/create-subscription-checkout', 'POST', { plan, trialMode: isOnboarding });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
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

  // Show loading state while fetching user data
  if (isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen py-8 px-4 flex items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
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
      <div className="min-h-screen py-8 px-4 flex items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Unable to Load Pricing Plans</CardTitle>
            <CardDescription>
              We couldn't fetch your account information. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
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
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: '#f5f5f5' }}>
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
              <div className="flex items-center justify-center gap-2 text-green-700 font-medium">
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

        {/* Current Plan Badge */}
        {hasActiveSubscription && !isOnboarding && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="px-4 py-2 text-sm bg-purple-100 text-purple-800" data-testid="badge-current-plan">
              Your Current Plan: {actualPlan === 'premium_plus' ? 'Premium Plus' : actualPlan === 'premium' ? 'Premium' : 'Base'}
            </Badge>
          </div>
        )}
        
        {/* Trial or Expired Trial Message */}
        {!hasActiveSubscription && !isOnboarding && (
          <div className="flex justify-center">
            <Badge variant="secondary" className={`px-4 py-2 text-sm ${isInTrial ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
              {isInTrial 
                ? 'You are on a 14-day free trial. Select a plan to continue after your trial ends.'
                : 'Your free trial has ended. Select a plan below to continue using MyHomeBase.'}
            </Badge>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Base Plan */}
          <Card className={`relative transition-all hover:shadow-lg ${hasActiveSubscription && actualPlan === 'base' ? 'border-4 border-purple-600 shadow-xl' : 'border-2'}`}>
            {hasActiveSubscription && actualPlan === 'base' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-purple-600 text-white px-4 py-1" data-testid="badge-base-plan-current">Current Plan</Badge>
              </div>
            )}
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Home className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <CardTitle className="text-2xl" style={{ color: '#2c0f5b' }} data-testid="title-base-plan">Base Plan</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold" style={{ color: '#2c0f5b' }} data-testid="price-base-plan">$5</span>
                <span className="text-gray-600">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Up to <strong>2 properties</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Full maintenance scheduling</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Contractor directory access</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Service record tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Home health score</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">DIY savings tracker</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Email support</span>
                </li>
              </ul>
              {hasActiveSubscription && actualPlan === 'base' ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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

          {/* Premium Plan */}
          <Card className={`relative transition-all hover:shadow-lg ${hasActiveSubscription && actualPlan === 'premium' ? 'border-4 border-purple-600 shadow-xl' : 'border-2'}`}>
            {hasActiveSubscription && actualPlan === 'premium' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-purple-600 text-white px-4 py-1" data-testid="badge-premium-plan-current">Current Plan</Badge>
              </div>
            )}
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <CardTitle className="text-2xl" style={{ color: '#2c0f5b' }} data-testid="title-premium-plan">Premium Plan</CardTitle>
              <CardDescription>For active property managers</CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold" style={{ color: '#2c0f5b' }} data-testid="price-premium-plan">$20</span>
                <span className="text-gray-600">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>3-6 properties</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>Everything in Base</strong></span>
                </li>
              </ul>
              {hasActiveSubscription && actualPlan === 'premium' ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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

          {/* Premium Plus Plan */}
          <Card className={`relative transition-all hover:shadow-lg ${hasActiveSubscription && actualPlan === 'premium_plus' ? 'border-4 border-purple-600 shadow-xl' : 'border-2'}`}>
            {hasActiveSubscription && actualPlan === 'premium_plus' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-purple-600 text-white px-4 py-1" data-testid="badge-premium-plus-plan-current">Current Plan</Badge>
              </div>
            )}
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Crown className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <CardTitle className="text-2xl" style={{ color: '#2c0f5b' }} data-testid="title-premium-plus-plan">Premium Plus</CardTitle>
              <CardDescription>For serious property portfolios</CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold" style={{ color: '#2c0f5b' }} data-testid="price-premium-plus-plan">$40</span>
                <span className="text-gray-600">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>7+ properties</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>Everything in Premium</strong></span>
                </li>
              </ul>
              {hasActiveSubscription && actualPlan === 'premium_plus' ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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

        {/* Additional Info */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold" style={{ color: '#2c0f5b' }}>
                {isOnboarding ? '14-Day Free Trial — No Charge Today' : 'All Plans Include a 14-Day Free Trial'}
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {isOnboarding
                  ? 'Your card is saved securely but not charged until your 14-day trial ends. Cancel before then and you owe nothing.'
                  : 'Try MyHomeBase risk-free for 14 days. Cancel anytime during your trial with no charges.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                <Button 
                  asChild 
                  className="bg-purple-600 hover:bg-purple-700 text-white"
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
          <h3 className="text-2xl font-bold text-center mb-6" style={{ color: '#2c0f5b' }}>
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
