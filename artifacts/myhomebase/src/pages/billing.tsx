import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Calendar, ArrowLeft, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { User, SubscriptionCycleEvent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PageHero } from "@/components/page-hero";
import { openExternalUrl, openPaymentUrl, onBrowserFinished, isNativePlatform } from "@/lib/nativeBrowser";
import { CreditCard } from "lucide-react";
import { ActivatingPlanBanner } from "@/components/activating-plan-banner";
import {
  initNativePurchase,
  restoreNativePurchases,
  onNativePurchaseVerified,
  onNativePurchaseFailed,
} from "@/lib/nativePurchase";

type Plan = 'trial' | 'base' | 'premium' | 'premium_plus' | 'contractor' | 'contractor_pro' | 'grandfathered';

export default function Billing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [purchaseFailedOnce, setPurchaseFailedOnce] = useState(false);
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
      setPurchaseFailedOnce(false);
    });
    const unsubFailed = onNativePurchaseFailed(({ message }) => {
      console.error('[Billing] Native purchase failed:', message);
      // Session-loss (401 while Apple sheet was open): show the amber recovery
      // banner with Restore button instead of the generic destructive toast.
      const isSessionLoss = message?.includes('sign in again');
      if (isSessionLoss) {
        setPurchaseFailedOnce(true);
      }
    });
    return () => {
      unsubVerified();
      unsubFailed();
    };
  }, [queryClient, toast]);

  // Opens Stripe's hosted Customer Portal (card-on-file, next charge date, invoice
  // history/downloads — all handled by Stripe's own UI). Only meaningful for accounts
  // with a real Stripe customer; Grandfathered/trial/never-subscribed accounts have
  // nothing for Stripe's portal to manage, so the button is hidden for them (see below).
  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/billing/portal', 'GET');
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: ({ url }) => {
      openPaymentUrl(url);
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't open billing portal",
        description: error.message || "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      console.log('[Billing] Restore purchases requested');
      if (!userData?.id) {
        throw new Error('You must be signed in to restore purchases');
      }
      return restoreNativePurchases(userData.id);
    },
    onSuccess: async (result) => {
      console.log('[Billing] Restore purchases result:', result);
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/user'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/my-subscription'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/contractor/subscription'] }),
        ]);
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['/api/user'] }),
          queryClient.refetchQueries({ queryKey: ['/api/auth/user'] }),
          queryClient.refetchQueries({ queryKey: ['/api/my-subscription'] }),
          queryClient.refetchQueries({ queryKey: ['/api/contractor/subscription'] }),
        ]);
      } catch (error) {
        console.warn('[Billing] Failed to refresh subscription state after restore:', error);
      }
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
  const hasStripeCustomer = Boolean(userData?.stripeCustomerId);

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

        {isContractor && !hasStripeCustomer && (
          <Alert className="mb-6 border-blue-200 bg-blue-50" data-testid="contractor-billing-no-customer">
            <CreditCard className="h-4 w-4 text-blue-700" />
            <AlertDescription className="text-blue-900">
              <strong>Payment management is not set up yet.</strong>{' '}
              {hasActiveSubscription
                ? 'Your contractor access is active, but this account does not have a Stripe billing account connected.'
                : 'Complete contractor checkout to create your billing account and manage payment methods here.'}
              {!hasActiveSubscription && (
                <Button
                  variant="link"
                  className="h-auto p-0 ml-1 text-blue-800 font-semibold align-baseline"
                  onClick={() => setLocation('/contractor/checkout?plan=basic&onboarding=true')}
                  data-testid="button-start-contractor-checkout"
                >
                  Complete checkout
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Session-loss recovery banner — shown after a native purchase fails with a 401 */}
        {purchaseFailedOnce && isNativePlatform && !hasActiveSubscription && (
          <div
            className="max-w-2xl mx-auto rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col gap-3 mb-6"
            data-testid="purchase-failed-recovery-banner"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 text-amber-500">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Your purchase couldn't be confirmed</p>
                <p className="text-sm text-amber-800 mt-0.5">
                  If Apple charged you, use <strong>Restore Purchases</strong> below to activate your subscription.
                  Your Apple ID purchase history is the record of charge — we'll match it to your account.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => restoreMutation.mutate()}
              disabled={restoreMutation.isPending}
              className="self-start border-amber-400 text-amber-900 hover:bg-amber-100"
              data-testid="button-restore-after-failure"
            >
              {restoreMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Restoring…</>
              ) : (
                'Restore Purchases'
              )}
            </Button>
          </div>
        )}

        {/* Current Plan Display */}
        {currentPlan !== 'trial' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: isContractor ? '#b91c1c' : 'var(--purple-deep)' }}>
                {currentPlan === 'grandfathered' && <Crown className="h-5 w-5 text-yellow-600" />}
                Current Plan: {currentPlan === 'grandfathered' ? 'Grandfathered' : currentPlan === 'contractor_pro' || currentPlan === 'contractor' ? 'Contractor Plan' : currentPlan === 'premium_plus' ? 'Premium Plus' : currentPlan === 'premium' ? 'Premium' : 'Base'}
              </CardTitle>
              <CardDescription>
                {currentPlan === 'grandfathered' && (isContractor 
                  ? "You have unlimited access to all contractor features as a valued early adopter."
                  : "You have unlimited access to all features as a valued early adopter."
                )}
                {currentPlan === 'premium_plus' && "You're on the Premium Plus plan with access to 7+ properties."}
                {currentPlan === 'premium' && "You're on the Premium plan with access to 3-6 properties."}
                {currentPlan === 'base' && "You're on the Base plan with access to up to 2 properties."}
                {(currentPlan === 'contractor' || currentPlan === 'contractor_pro') && "You're on the current contractor plan: $20/month with three accepted people included, then $5/month per additional person."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Plan selection lives on the dedicated homeowner pricing page. */}
        {!isContractor && currentPlan !== 'grandfathered' && (
          <div className="flex justify-center mb-6 sm:mb-8">
            <Button
              asChild
              className="bg-[#3C258E] hover:bg-[#2C0F5B] text-white"
              data-testid="button-change-plan"
            >
              <a href="/homeowner-pricing">Change or upgrade plan</a>
            </Button>
          </div>
        )}

        {/* Manage Payment Method — opens Stripe's hosted Customer Portal for card-on-file,
            next charge date, and invoice history/downloads. Only shown for accounts with a
            real Stripe customer; Grandfathered/trial/never-subscribed accounts have nothing
            for Stripe's portal to manage. */}
        {hasStripeCustomer && (
          <div className="flex justify-center mb-6 sm:mb-8">
            <Button
              variant="outline"
              onClick={() => billingPortalMutation.mutate()}
              disabled={billingPortalMutation.isPending}
              data-testid="button-manage-payment-method"
            >
              {billingPortalMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opening billing portal…</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" />Manage Payment Method</>
              )}
            </Button>
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
                Try free for 14 days. Your card is saved securely at signup but not charged until your trial ends. Cancel before then and you owe nothing.
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
