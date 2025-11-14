import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Home, Calendar, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type Plan = 'trial' | 'base' | 'premium' | 'premium_plus' | 'contractor' | 'grandfathered';

export default function Billing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<'base' | 'premium' | 'premium_plus'>('base');

  // Fetch user details to get trial and subscription info
  const { data: userData } = useQuery<User>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const res = await apiRequest('/api/user', 'GET');
      return res.json();
    },
    enabled: !!user,
  });

  // Calculate trial status
  const trialEndsAt = userData?.trialEndsAt ? new Date(userData.trialEndsAt) : null;
  const now = new Date();
  const isTrialActive = trialEndsAt && trialEndsAt > now && userData?.subscriptionStatus === 'trialing';
  const daysRemaining = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const isContractor = userData?.role === 'contractor';

  // Determine current plan
  const getCurrentPlan = (): Plan => {
    if (userData?.subscriptionStatus === 'grandfathered') return 'grandfathered';
    if (isTrialActive) return 'trial';
    
    // Contractors have their own plan type
    if (isContractor) {
      return 'contractor';
    }
    
    // Homeowner plans based on maxHousesAllowed
    const maxHouses = userData?.maxHousesAllowed ?? 2;
    if (maxHouses >= 7) return 'premium_plus';
    if (maxHouses >= 3) return 'premium';
    return 'base';
  };

  const currentPlan = getCurrentPlan();

  const handleSubscribe = (plan: 'base' | 'premium' | 'premium_plus') => {
    // TODO: Implement Stripe checkout when keys are available
    console.log('Subscribe to plan:', plan);
    // This will be replaced with Stripe integration
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #f8f4fc, #faf9fb)' }}>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/my-home')}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Home
        </Button>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: isContractor ? '#b91c1c' : '#2c0f5b' }}>
            Subscription & Billing
          </h1>
          <p className="text-gray-600">
            {isContractor 
              ? 'Manage your contractor subscription'
              : 'Choose the plan that fits your property management needs'
            }
          </p>
        </div>

        {/* Trial Alert */}
        {isTrialActive && (
          <Alert className={`mb-6 ${isContractor ? 'border-red-200 bg-red-50' : 'border-purple-200 bg-purple-50'}`}>
            <Calendar className={`h-4 w-4 ${isContractor ? 'text-red-600' : 'text-purple-600'}`} />
            <AlertDescription className={isContractor ? 'text-red-900' : 'text-purple-900'}>
              <strong>Free Trial Active:</strong> You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining in your 14-day trial. 
              {isContractor 
                ? ' Subscribe below to continue accessing your contractor features after your trial ends.'
                : ' Select a plan below to continue managing your properties after your trial ends.'
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Current Plan Display */}
        {currentPlan !== 'trial' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: isContractor ? '#b91c1c' : '#2c0f5b' }}>
                {currentPlan === 'grandfathered' && <Crown className="h-5 w-5 text-yellow-600" />}
                Current Plan: {currentPlan === 'grandfathered' ? 'Grandfathered' : currentPlan === 'contractor' ? 'Contractor' : currentPlan === 'premium_plus' ? 'Premium Plus' : currentPlan === 'premium' ? 'Premium' : 'Base'}
              </CardTitle>
              <CardDescription>
                {currentPlan === 'grandfathered' && (isContractor 
                  ? "You have unlimited access to all contractor features as a valued early adopter."
                  : "You have unlimited access to all features as a valued early adopter."
                )}
                {currentPlan === 'premium_plus' && "You're on the Premium Plus plan with access to 7+ properties."}
                {currentPlan === 'premium' && "You're on the Premium plan with access to 3-6 properties."}
                {currentPlan === 'base' && "You're on the Base plan with access to up to 2 properties."}
                {currentPlan === 'contractor' && "You're subscribed to the Contractor plan ($20/month)."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Contractor Plan Card */}
        {isContractor && currentPlan !== 'grandfathered' && (
          <div className="max-w-2xl mx-auto mb-8">
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2" style={{ color: '#b91c1c' }}>
                  <Crown className="h-6 w-6 text-red-600" />
                  Contractor Plan
                </CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ color: '#b91c1c' }}>$20</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription>Professional contractor access to Home Base</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span><strong>14-day free trial</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span>Unlimited client connections</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span>Professional contractor profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span>Service record management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span>Proposal creation tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span>Direct messaging with homeowners</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span>Company & team management</span>
                  </li>
                </ul>
                {currentPlan === 'trial' && (
                  <Button
                    onClick={() => handleSubscribe('premium')}
                    style={{ backgroundColor: '#b91c1c', color: 'white' }}
                    className="w-full hover:opacity-90"
                    data-testid="button-subscribe-contractor"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Subscribe Now
                  </Button>
                )}
                {currentPlan === 'contractor' && (
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-900 font-medium">
                      ✓ Active Subscription
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Homeowner Plan Comparison */}
        {!isContractor && currentPlan !== 'grandfathered' && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Base Plan */}
            <Card 
              className={`relative transition-all ${selectedPlan === 'base' ? 'ring-2 ring-purple-600' : ''}`}
              data-testid="card-plan-base"
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl" style={{ color: '#2c0f5b' }}>
                    Base Plan
                  </CardTitle>
                  {currentPlan === 'base' && (
                    <Badge variant="secondary">Current Plan</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ color: '#2c0f5b' }}>$5</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription>Perfect for managing a primary residence</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span><strong>14-day free trial</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span>Up to <strong>2 properties</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span>Full maintenance scheduling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span>Contractor directory access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span>Service record tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span>AI contractor recommendations</span>
                  </li>
                </ul>
                {currentPlan !== 'base' && (
                  <Button
                    onClick={() => handleSubscribe('base')}
                    variant="outline"
                    className="w-full"
                    style={{ borderColor: '#2c0f5b', color: '#2c0f5b' }}
                    data-testid="button-subscribe-base"
                  >
                    Select Base Plan
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card 
              className={`relative transition-all ${selectedPlan === 'premium' ? 'ring-2 ring-purple-600' : ''}`}
              data-testid="card-plan-premium"
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-purple-600 text-white">Most Popular</Badge>
              </div>
              <CardHeader className="pt-8">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                    <Crown className="h-6 w-6 text-purple-600" />
                    Premium Plan
                  </CardTitle>
                  {currentPlan === 'premium' && (
                    <Badge variant="secondary">Current Plan</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ color: '#2c0f5b' }}>$10</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription>Ideal for landlords and property managers</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span><strong>14-day free trial</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span>Up to <strong>10 properties</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span>Full maintenance scheduling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span>Contractor directory access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span>Service record tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span>AI contractor recommendations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span><strong>Bulk management tools</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span><strong>Property templates</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span><strong>Advanced analytics</strong></span>
                  </li>
                </ul>
                {currentPlan !== 'premium' && (
                  <Button
                    onClick={() => handleSubscribe('premium')}
                    style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                    className="w-full hover:opacity-90"
                    data-testid="button-subscribe-premium"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* FAQ / Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle style={{ color: '#2c0f5b' }}>Billing Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1" style={{ color: '#2c0f5b' }}>14-Day Free Trial</h3>
              <p className="text-gray-600">
                All new accounts start with a 14-day free trial. No credit card required to start.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: '#2c0f5b' }}>Referral Rewards</h3>
              <p className="text-gray-600">
                For every active paying subscriber you refer, you'll receive $1 off your monthly subscription. Discounts are applied automatically each billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: '#2c0f5b' }}>Cancel Anytime</h3>
              <p className="text-gray-600">
                You can cancel your subscription at any time. Your access will continue until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: '#2c0f5b' }}>Secure Payments</h3>
              <p className="text-gray-600">
                All payments are processed securely through Stripe. We never store your payment information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
