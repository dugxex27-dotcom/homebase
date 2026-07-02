import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Home, Calendar, ArrowLeft, CheckCircle, XCircle, Clock, Users, FileText, Receipt, Briefcase, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { User, SubscriptionCycleEvent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PageHero } from "@/components/page-hero";
import { openPaymentUrl, openExternalUrl, onBrowserFinished, isNativePlatform } from "@/lib/nativeBrowser";
import {
  purchaseNativePlan,
  initNativePurchase,
  restoreNativePurchases,
  onNativePurchaseVerified,
  onNativePurchaseFailed,
  isNativePurchaseSupported,
  type NativePlanKey,
} from "@/lib/nativePurchase";

type Plan = 'trial' | 'base' | 'premium' | 'premium_plus' | 'contractor' | 'contractor_pro' | 'grandfathered';

export default function Billing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<'base' | 'premium' | 'premium_plus'>('base');
  const { toast } = useToast();

  // Fetch user details to get trial and subscription info
  const { data: userData } = useQuery<User>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const res = await apiRequest('/api/user', 'GET');
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch billing history
  const { data: billingHistory = [] } = useQuery<SubscriptionCycleEvent[]>({
    queryKey: ['/api/billing-history'],
    queryFn: async () => {
      const res = await apiRequest('/api/billing-history', 'GET');
      return res.json();
    },
    enabled: !!user,
  });

  // Subscription checkout mutation
  const queryClient = useQueryClient();

  useEffect(() => {
    return onBrowserFinished(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/billing-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/subscription'] });
    });
  }, [queryClient]);

  useEffect(() => {
    if (!isNativePlatform) return;
    console.log('[Billing] Native platform detected, initializing StoreKit...');
    initNativePurchase();
  }, []);

  useEffect(() => {
    const unsubVerified = onNativePurchaseVerified(({ plan, productId }) => {
      console.log('[Billing] Native purchase verified:', plan, productId);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/billing-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/subscription'] });
      toast({
        title: "Subscription Activated",
        description: "Your subscription is now active.",
      });
    });
    const unsubFailed = onNativePurchaseFailed(({ message }) => {
      console.error('[Billing] Native purchase failed:', message);
      toast({
        title: "Purchase Failed",
        description: message || "We couldn't complete your purchase. Please try again.",
        variant: "destructive",
      });
    });
    return () => {
      unsubVerified();
      unsubFailed();
    };
  }, [queryClient, toast]);

  const restoreMutation = useMutation({
    mutationFn: async () => {
      console.log('[Billing] Restore purchases requested');
      if (!userData?.id) {
        throw new Error('You must be signed in to restore purchases');
      }
      return restoreNativePurchases(userData.id);
    },
    onSuccess: (result) => {
      console.log('[Billing] Restore purchases result:', result);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/subscription'] });
      toast({
        title: result.restored ? "Purchases Restored" : "Nothing to Restore",
        description: result.restored
          ? "Your subscription has been restored."
          : "We couldn't find any previous purchases to restore.",
      });
    },
    onError: (error: Error) => {
      console.error('[Billing] Restore purchases failed:', error);
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore purchases. Please try again.",
        variant: "destructive",
      });
    },
  });

  const subscriptionMutation = useMutation({
    mutationFn: async (plan: string) => {
      if (isNativePurchaseSupported() && plan !== 'pro') {
        console.log('[Billing] Starting native StoreKit purchase for plan:', plan);
        if (!userData?.id) {
          throw new Error('You must be signed in to purchase a subscription');
        }
        const nativePlan: NativePlanKey = plan === 'basic' ? 'contractor_basic' : (plan as NativePlanKey);
        await purchaseNativePlan(nativePlan, userData.id);
        return { native: true as const };
      }
      const res = await apiRequest('/api/create-subscription-checkout', 'POST', { plan });
      return res.json();
    },
    onSuccess: async (data) => {
      if (data?.native) {
        console.log('[Billing] Native purchase order placed, awaiting StoreKit verification callback');
        return;
      }
      if (data.url) {
        await openPaymentUrl(data.url);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to start subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Calculate trial status - use trialEndsAt if set, otherwise createdAt + 14 days
  const now = new Date();
  let effectiveTrialEndsAt: Date | null = null;
  if (userData?.trialEndsAt) {
    effectiveTrialEndsAt = new Date(userData.trialEndsAt);
  } else if (userData?.createdAt) {
    // For older accounts without trialEndsAt, calculate based on account creation + 14 days
    effectiveTrialEndsAt = new Date(new Date(userData.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000);
  }
  
  const isTrialActive = effectiveTrialEndsAt && effectiveTrialEndsAt > now && userData?.subscriptionStatus === 'trialing';
  const daysRemaining = effectiveTrialEndsAt && effectiveTrialEndsAt > now 
    ? Math.ceil((effectiveTrialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;
  
  // Check if user has an active paid subscription
  const hasActiveSubscription = userData?.subscriptionStatus === 'active';

  const isContractor = userData?.role === 'contractor';

  // Determine current plan
  const getCurrentPlan = (): Plan => {
    if (userData?.subscriptionStatus === 'grandfathered') return 'grandfathered';
    if (isTrialActive) return 'trial';
    
    // If trial expired and no active subscription, treat as trial (needs to subscribe)
    if (!hasActiveSubscription) return 'trial';
    
    // Contractors have their own plan types (basic or pro)
    if (isContractor) {
      // Check subscription tier name for Pro status
      const tierName = (userData as any)?.subscriptionTierName || '';
      if (tierName === 'contractor_pro') return 'contractor_pro';
      return 'contractor';
    }
    
    // Homeowner plans based on maxHousesAllowed
    const maxHouses = userData?.maxHousesAllowed ?? 2;
    if (maxHouses >= 7) return 'premium_plus';
    if (maxHouses >= 3) return 'premium';
    return 'base';
  };

  const currentPlan = getCurrentPlan();

  const handleSubscribe = (plan: 'base' | 'premium' | 'premium_plus' | 'contractor' | 'contractor_pro') => {
    // Map contractor plan names to API expected values
    const planMap: Record<string, string> = {
      'contractor': 'basic',
      'contractor_pro': 'pro',
    };
    const apiPlan = planMap[plan] || plan;
    subscriptionMutation.mutate(apiPlan);
  };

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow={isContractor ? 'Contractor' : 'Homeowner'}
        title="Subscription & Billing"
        subtitle={isContractor ? 'Manage your contractor subscription' : 'Choose the plan that fits your needs'}
      />
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/my-home')}
          className="mb-4 sm:mb-6 text-gray-900 hover:text-gray-900 hover:bg-gray-200"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Home
        </Button>

        {/* Page Subheader - removed since PageHero has it already */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-2 text-gray-900 sr-only">
            Subscription & Billing
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {isContractor 
              ? 'Manage your contractor subscription'
              : 'Choose the plan that fits your property management needs'
            }
          </p>
        </div>

        {/* Trial Alert */}
        {isTrialActive && (
          <Alert className={`mb-6 ${isContractor ? 'border-red-200 bg-red-50' : 'border-[#CECBF6] bg-[#EEEDFE]'}`}>
            <Calendar className={`h-4 w-4 ${isContractor ? 'text-red-600' : 'text-[#3C258E]'}`} />
            <AlertDescription className={isContractor ? 'text-red-900' : 'text-[#2C0F5B]'}>
              <strong>Free Trial Active:</strong> You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining in your 14-day trial. 
              {isContractor 
                ? ' Subscribe below to continue accessing your contractor features after your trial ends.'
                : ' Select a plan below to continue managing your properties after your trial ends.'
              }
            </AlertDescription>
          </Alert>
        )}
        
        {/* Expired Trial Alert */}
        {!isTrialActive && !hasActiveSubscription && currentPlan === 'trial' && userData?.subscriptionStatus !== 'grandfathered' && (
          <Alert className={`mb-6 ${isContractor ? 'border-red-500 bg-red-100' : 'border-amber-500 bg-amber-100'}`}>
            <XCircle className={`h-4 w-4 ${isContractor ? 'text-red-700' : 'text-amber-700'}`} />
            <AlertDescription className={isContractor ? 'text-red-900' : 'text-amber-900'}>
              <strong>Your free trial has ended.</strong> Subscribe below to continue using MyHomeBase™.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Plan Display */}
        {currentPlan !== 'trial' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: isContractor ? '#b91c1c' : 'var(--purple-deep)' }}>
                {currentPlan === 'grandfathered' && <Crown className="h-5 w-5 text-yellow-600" />}
                {currentPlan === 'contractor_pro' && <Crown className="h-5 w-5 text-red-600" />}
                Current Plan: {currentPlan === 'grandfathered' ? 'Grandfathered' : currentPlan === 'contractor_pro' ? 'Contractor Pro' : currentPlan === 'contractor' ? 'Contractor Basic' : currentPlan === 'premium_plus' ? 'Premium Plus' : currentPlan === 'premium' ? 'Premium' : 'Base'}
              </CardTitle>
              <CardDescription>
                {currentPlan === 'grandfathered' && (isContractor 
                  ? "You have unlimited access to all contractor features as a valued early adopter."
                  : "You have unlimited access to all features as a valued early adopter."
                )}
                {currentPlan === 'premium_plus' && "You're on the Premium Plus plan with access to 7+ properties."}
                {currentPlan === 'premium' && "You're on the Premium plan with access to 3-6 properties."}
                {currentPlan === 'base' && "You're on the Base plan with access to up to 2 properties."}
                {currentPlan === 'contractor' && "You're subscribed to Contractor Basic ($20/month)."}
                {currentPlan === 'contractor_pro' && "You're subscribed to Contractor Pro ($40/month) with full CRM access."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Contractor Plan Cards - Basic and Pro tiers */}
        {isContractor && currentPlan !== 'grandfathered' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto mb-6 sm:mb-8">
            {/* Basic Contractor Plan */}
            <Card className={`relative ${currentPlan === 'contractor' ? 'ring-2 ring-red-500' : ''}`} data-testid="card-plan-contractor-basic">
              <CardHeader className="pb-4 sm:pb-6">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl" style={{ color: '#b91c1c' }}>
                    Basic
                  </CardTitle>
                  {currentPlan === 'contractor' && (
                    <Badge variant="secondary" className="text-xs">Current Plan</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold" style={{ color: '#b91c1c' }}>$20</span>
                  <span className="text-sm sm:text-base text-gray-600">/month</span>
                </div>
                <CardDescription className="text-xs sm:text-sm">Essential tools to connect with homeowners</CardDescription>
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
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span>$20/month referral credit cap</span>
                  </li>
                </ul>
                {(currentPlan === 'trial' || currentPlan === 'contractor_pro') && (
                  <Button
                    onClick={() => handleSubscribe('contractor')}
                    variant="outline"
                    className="w-full"
                    style={{ borderColor: '#b91c1c', color: '#b91c1c' }}
                    data-testid="button-subscribe-contractor-basic"
                  >
                    {currentPlan === 'contractor_pro' ? 'Switch to Basic' : 'Select Basic'}
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

            {/* Pro Contractor Plan */}
            <Card className={`relative ${currentPlan === 'contractor_pro' ? 'ring-2 ring-red-500' : ''}`} data-testid="card-plan-contractor-pro">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-red-600 text-white">Most Popular</Badge>
              </div>
              <CardHeader className="pt-8 pb-4 sm:pb-6">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl flex items-center gap-2" style={{ color: '#b91c1c' }}>
                    <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                    Pro
                  </CardTitle>
                  {currentPlan === 'contractor_pro' && (
                    <Badge variant="secondary" className="text-xs">Current Plan</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold" style={{ color: '#b91c1c' }}>$40</span>
                  <span className="text-sm sm:text-base text-gray-600">/month</span>
                </div>
                <CardDescription className="text-xs sm:text-sm">Complete business management for solo contractors</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span><strong>Everything in Basic, plus:</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-red-600 mt-0.5" />
                    <span><strong>Full CRM</strong> - Client management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Briefcase className="h-5 w-5 text-red-600 mt-0.5" />
                    <span><strong>Job Scheduling</strong> - Calendar & tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="h-5 w-5 text-red-600 mt-0.5" />
                    <span><strong>Professional Quotes</strong> - Create & send</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Receipt className="h-5 w-5 text-red-600 mt-0.5" />
                    <span><strong>Invoicing</strong> - Bill & track payments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span>Business dashboard & analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-red-600 mt-0.5" />
                    <span>$40/month referral credit cap</span>
                  </li>
                </ul>
                {(currentPlan === 'trial' || currentPlan === 'contractor') && !isNativePlatform && (
                  <Button
                    onClick={() => handleSubscribe('contractor_pro')}
                    style={{ backgroundColor: '#b91c1c', color: 'white' }}
                    className="w-full hover:opacity-90"
                    data-testid="button-subscribe-contractor-pro"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    {currentPlan === 'contractor' ? 'Upgrade to Pro' : 'Start with Pro'}
                  </Button>
                )}
                {(currentPlan === 'trial' || currentPlan === 'contractor') && isNativePlatform && (
                  <p className="text-center text-xs text-gray-500 px-2" data-testid="text-contractor-pro-web-only">
                    Contractor Pro is available when you sign in at gotohomebase.com on the web.
                  </p>
                )}
                {currentPlan === 'contractor_pro' && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Base Plan */}
            <Card 
              className={`relative transition-all ${selectedPlan === 'base' ? 'ring-2 ring-[#3C258E]' : ''}`}
              data-testid="card-plan-base"
            >
              <CardHeader className="pb-4 sm:pb-6">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl" style={{ color: 'var(--purple-deep)' }}>
                    Base Plan
                  </CardTitle>
                  {currentPlan === 'base' && (
                    <Badge variant="secondary" className="text-xs">Current Plan</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--purple-deep)' }}>$5</span>
                  <span className="text-sm sm:text-base text-gray-600">/month</span>
                </div>
                <CardDescription className="text-xs sm:text-sm">Perfect for managing a primary residence</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span><strong>14-day free trial</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>Up to <strong>2 properties</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>Full maintenance scheduling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>Contractor directory access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>Service record tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>AI contractor recommendations</span>
                  </li>
                </ul>
                {currentPlan !== 'base' && (
                  <Button
                    onClick={() => handleSubscribe('base')}
                    variant="outline"
                    className="w-full"
                    style={{ borderColor: 'var(--purple-deep)', color: 'var(--purple-deep)' }}
                    data-testid="button-subscribe-base"
                  >
                    Select Base Plan
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card 
              className={`relative transition-all ${selectedPlan === 'premium' ? 'ring-2 ring-[#3C258E]' : ''}`}
              data-testid="card-plan-premium"
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-[#3C258E] text-white">Most Popular</Badge>
              </div>
              <CardHeader className="pt-8">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--purple-deep)' }}>
                    <Crown className="h-6 w-6 text-[#3C258E]" />
                    Premium Plan
                  </CardTitle>
                  {currentPlan === 'premium' && (
                    <Badge variant="secondary">Current Plan</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ color: 'var(--purple-deep)' }}>$20</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription>Ideal for landlords and rental properties</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span><strong>14-day free trial</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span><strong>3-6 properties</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>Full maintenance scheduling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>Contractor directory access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>Service record tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>AI contractor recommendations</span>
                  </li>
                </ul>
                {currentPlan !== 'premium' && (
                  <Button
                    onClick={() => handleSubscribe('premium')}
                    style={{ backgroundColor: 'var(--purple-deep)', color: 'white' }}
                    className="w-full hover:opacity-90"
                    data-testid="button-subscribe-premium"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Premium Plus Plan */}
            <Card 
              className={`relative transition-all ${selectedPlan === 'premium_plus' ? 'ring-2 ring-[#3C258E]' : ''}`}
              data-testid="card-plan-premium-plus"
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--purple-deep)' }}>
                    <Crown className="h-6 w-6 text-[#3C258E]" />
                    Premium Plus
                  </CardTitle>
                  {currentPlan === 'premium_plus' && (
                    <Badge variant="secondary">Current Plan</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ color: 'var(--purple-deep)' }}>$40</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription>Perfect for property managers</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span><strong>14-day free trial</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span><strong>7+ properties</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>Full maintenance scheduling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>Contractor directory access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>Service record tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-[#3C258E] mt-0.5" />
                    <span>AI contractor recommendations</span>
                  </li>
                </ul>
                {currentPlan !== 'premium_plus' && (
                  <Button
                    onClick={() => handleSubscribe('premium_plus')}
                    style={{ backgroundColor: 'var(--purple-deep)', color: 'white' }}
                    className="w-full hover:opacity-90"
                    data-testid="button-subscribe-premium-plus"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium Plus
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Billing History */}
        {billingHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle style={{ color: 'var(--purple-deep)' }}>Billing History</CardTitle>
              <CardDescription>Your payment and subscription history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {billingHistory.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`billing-event-${event.id}`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {event.status === 'paid' && (
                        <CheckCircle className="h-5 w-5 text-[#079669] mt-0.5" />
                      )}
                      {event.status === 'failed' && (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      {event.status === 'voided' && (
                        <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {format(new Date(event.periodStart), 'MMM d, yyyy')} - {format(new Date(event.periodEnd), 'MMM d, yyyy')}
                          </span>
                          <Badge
                            className={
                              event.status === 'paid'
                                ? 'bg-[#F0FAF4] text-[#09694A]'
                                : event.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {event.status}
                          </Badge>
                        </div>
                        {event.stripeInvoiceId && (
                          <p className="text-sm text-gray-600">
                            Invoice: {event.stripeInvoiceId}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">${parseFloat(event.amount).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        {event.createdAt && format(new Date(event.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ / Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle style={{ color: 'var(--purple-deep)' }}>Billing Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--purple-deep)' }}>14-Day Free Trial</h3>
              <p className="text-gray-600">
                All new accounts start with a 14-day free trial. No credit card required to start.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--purple-deep)' }}>Referral Rewards</h3>
              <p className="text-gray-600">
                For every active paying subscriber you refer, you'll receive $1 off your monthly subscription. Discounts are applied automatically each billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--purple-deep)' }}>Cancel Anytime</h3>
              <p className="text-gray-600">
                You can cancel your subscription at any time. Your access will continue until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--purple-deep)' }}>Secure Payments</h3>
              <p className="text-gray-600">
                {isNativePlatform
                  ? "Payments made in the app are processed securely through Apple's App Store. Web purchases are processed securely through Stripe. We never store your payment information."
                  : "All payments are processed securely through Stripe. We never store your payment information."}
              </p>
            </div>
            {isNativePlatform && (
              <div>
                <h3 className="font-semibold mb-1" style={{ color: 'var(--purple-deep)' }}>Restore Purchases</h3>
                <p className="text-gray-600 mb-2">
                  Already subscribed on this Apple ID? Restore your purchase to sync your subscription.
                </p>
                <Button
                  onClick={() => restoreMutation.mutate()}
                  disabled={restoreMutation.isPending}
                  variant="outline"
                  size="sm"
                  data-testid="button-restore-purchases"
                >
                  {restoreMutation.isPending ? 'Restoring...' : 'Restore Purchases'}
                </Button>
              </div>
            )}
            <div className="text-xs text-gray-500 pt-2">
              By subscribing, you agree to our{' '}
              <button
                type="button"
                className="underline hover:text-gray-700"
                data-testid="link-privacy-policy"
                onClick={() => openExternalUrl(`${window.location.origin}/privacy-policy`)}
              >
                Privacy Policy
              </button>{' '}
              and{' '}
              <button
                type="button"
                className="underline hover:text-gray-700"
                data-testid="link-eula"
                onClick={() => openExternalUrl('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
              >
                End User License Agreement (EULA)
              </button>.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
