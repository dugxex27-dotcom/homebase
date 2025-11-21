import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Home, Zap, Crown } from "lucide-react";
import { Link } from "wouter";

export default function HomeownerPricing() {
  const { user } = useAuth();

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
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  // Show error state if query fails
  if (isError || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4 flex items-center justify-center">
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

  const maxHouses = (userData as any)?.maxHousesAllowed ?? 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold" style={{ color: '#2c0f5b' }}>
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select the plan that fits your property management needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Current Plan Badge */}
        {maxHouses && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="px-4 py-2 text-sm bg-purple-100 text-purple-800" data-testid="badge-current-plan">
              Your Current Plan: {maxHouses <= 2 ? 'Base' : maxHouses <= 6 ? 'Premium' : 'Premium Plus'}
            </Badge>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Base Plan */}
          <Card className={`relative transition-all hover:shadow-lg ${maxHouses <= 2 ? 'border-4 border-purple-600 shadow-xl' : 'border-2'}`}>
            {maxHouses <= 2 && (
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
              {maxHouses <= 2 ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  asChild 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  data-testid="button-select-base-plan"
                >
                  <Link href="/billing">Downgrade to Base</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className={`relative transition-all hover:shadow-lg ${maxHouses >= 3 && maxHouses <= 6 ? 'border-4 border-purple-600 shadow-xl' : 'border-2'}`}>
            {maxHouses >= 3 && maxHouses <= 6 && (
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
              {maxHouses >= 3 && maxHouses <= 6 ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  asChild 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  data-testid="button-select-premium-plan"
                >
                  <Link href="/billing">
                    {maxHouses <= 2 ? 'Upgrade to Premium' : 'Downgrade to Premium'}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Premium Plus Plan */}
          <Card className={`relative transition-all hover:shadow-lg ${maxHouses >= 7 ? 'border-4 border-purple-600 shadow-xl' : 'border-2'}`}>
            {maxHouses >= 7 && (
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
              {maxHouses >= 7 ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  asChild 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  data-testid="button-select-premium-plus-plan"
                >
                  <Link href="/billing">Upgrade to Premium Plus</Link>
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
                All Plans Include a 14-Day Free Trial
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Try Home Base risk-free for 14 days. No credit card required. Cancel anytime during your trial with no charges.
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
                  We offer a 14-day free trial with no credit card required. After your trial, subscriptions are billed monthly with no long-term contracts, and you can cancel anytime.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
