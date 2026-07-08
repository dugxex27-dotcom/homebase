import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useContractorSubscription } from "@/hooks/useContractorSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, Sparkles, Check, Users, Calendar, FileText, CreditCard, Download, BarChart3, Clock, AlertTriangle, Mail, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { isNativePlatform, openExternalUrl } from "@/lib/nativeBrowser";
import {
  purchaseNativePlan,
  initNativePurchase,
  restoreNativePurchases,
  onNativePurchaseVerified,
  onNativePurchaseFailed,
  isNativePurchaseSupported,
} from "@/lib/nativePurchase";

interface ContractorFeatureGateProps {
  children: React.ReactNode;
  feature: 'crm' | 'clients' | 'jobs' | 'quotes' | 'invoices' | 'payments' | 'team' | 'imports' | 'analytics' | 'divisions' | 'bulk_import' | 'sso' | 'api_access';
  fallback?: React.ReactNode;
}

const featureLabels: Record<string, { label: string; icon: React.ReactNode; description: string; upgradeTier?: string }> = {
  crm: { label: 'CRM Features', icon: <Users className="h-5 w-5" />, description: 'Full customer relationship management' },
  clients: { label: 'Client Management', icon: <Users className="h-5 w-5" />, description: 'Manage your customer database' },
  jobs: { label: 'Job Scheduling', icon: <Calendar className="h-5 w-5" />, description: 'Schedule and track jobs' },
  quotes: { label: 'Quotes & Estimates', icon: <FileText className="h-5 w-5" />, description: 'Create professional quotes' },
  invoices: { label: 'Invoicing', icon: <FileText className="h-5 w-5" />, description: 'Send invoices and track payments' },
  payments: { label: 'Payment Processing', icon: <CreditCard className="h-5 w-5" />, description: 'Accept payments via Stripe' },
  team: { label: 'Team Management', icon: <Users className="h-5 w-5" />, description: 'Manage your team members' },
  imports: { label: 'Data Import', icon: <Download className="h-5 w-5" />, description: 'Import from other CRMs' },
  analytics: { label: 'Business Analytics', icon: <BarChart3 className="h-5 w-5" />, description: 'Detailed business insights' },
  divisions: { label: 'Division Management', icon: <Users className="h-5 w-5" />, description: 'Organize your team into divisions', upgradeTier: 'Business' },
  bulk_import: { label: 'Bulk Import', icon: <Download className="h-5 w-5" />, description: 'Bulk import team members via CSV', upgradeTier: 'Business' },
  sso: { label: 'Single Sign-On', icon: <Lock className="h-5 w-5" />, description: 'SSO is available on Enterprise. Contact sales to upgrade.', upgradeTier: 'Enterprise' },
  api_access: { label: 'API Access', icon: <BarChart3 className="h-5 w-5" />, description: 'Programmatic API access for integrations', upgradeTier: 'Enterprise' },
};

export function EnterpriseContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Interested in Enterprise?</DialogTitle>
          <DialogDescription>
            Get unlimited seats, SSO, API access, and a dedicated customer success manager.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {[
            'Unlimited team members',
            'SSO / SAML integration',
            'API access for integrations',
            'Dedicated customer success manager',
            'Custom onboarding & SLA support',
          ].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <a
            href="mailto:Doug@gotohomebase.com?subject=Enterprise+Plan+Inquiry"
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)' }}
          >
            <Mail className="h-4 w-4" />
            Email Doug@gotohomebase.com
          </a>
          <Button variant="ghost" className="w-full" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ContractorFeatureGate({ children, feature, fallback }: ContractorFeatureGateProps) {
  const { hasCrmAccess, hasDivisions, hasBulkImport, hasSSO, hasApiAccess, isLoading } = useContractorSubscription();
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);

  if (isLoading) {
    return <div className="animate-pulse bg-muted h-32 rounded-lg" />;
  }

  const hasAccess = (() => {
    switch (feature) {
      case 'divisions': return hasDivisions;
      case 'bulk_import': return hasBulkImport;
      case 'sso': return hasSSO;
      case 'api_access': return hasApiAccess;
      default: return hasCrmAccess;
    }
  })();

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Enterprise-tier features use the contact modal instead of a self-serve upgrade
  if (feature === 'sso' || feature === 'api_access') {
    const featureInfo = featureLabels[feature];
    return (
      <>
        <EnterpriseContactModal open={enterpriseOpen} onClose={() => setEnterpriseOpen(false)} />
        <Card className="border-2 border-dashed" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-fill)' }}>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 p-3 rounded-full w-fit" style={{ background: 'var(--theme-fill)' }}>
              <Lock className="h-6 w-6" style={{ color: 'var(--theme-accent)' }} />
            </div>
            <CardTitle className="text-lg">{featureInfo.label}</CardTitle>
            <CardDescription>Available on the Enterprise plan.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => setEnterpriseOpen(true)}
              style={{ background: 'linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)' }}
            >
              Contact Enterprise Sales →
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return <ContractorUpgradePrompt feature={feature} />;
}

interface ContractorUpgradePromptProps {
  feature: string;
}

function ContractorUpgradePrompt({ feature }: ContractorUpgradePromptProps) {
  const [, setLocation] = useLocation();
  const featureInfo = featureLabels[feature] || { label: feature, icon: <Lock className="h-5 w-5" />, description: '' };
  const tier = featureInfo.upgradeTier ?? 'Pro';

  return (
    <Card className="border-2 border-dashed" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-fill)' }}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 p-3 rounded-full w-fit" style={{ background: 'var(--theme-fill)' }}>
          <Lock className="h-6 w-6" style={{ color: 'var(--theme-accent)' }} />
        </div>
        <CardTitle className="text-lg">Upgrade to {tier}</CardTitle>
        <CardDescription>
          {featureInfo.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" style={{ background: 'var(--theme-fill)', color: 'var(--theme-accent)' }}>
            <Sparkles className="h-3 w-3 mr-1" />
            {tier} Feature
          </Badge>
        </div>
        <Button 
          onClick={() => setLocation('/contractor/upgrade')}
          style={{ background: 'linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)' }}
          data-testid="button-upgrade-pro"
        >
          Upgrade to {tier}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ContractorCRMUpgradePage() {
  const [, setLocation] = useLocation();
  const { currentPlan } = useContractorSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!isNativePlatform) return;
    initNativePurchase();
  }, []);

  useEffect(() => {
    const unsubVerified = onNativePurchaseVerified(async ({ plan, productId }) => {
      queryClient.setQueryData(['/api/auth/user'], (old: any) => old ? ({
        ...old,
        subscriptionStatus: 'active',
        subscriptionSource: 'apple',
        appleProductId: productId,
      }) : old);
      try {
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/contractor/subscription'] });
        await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
        await queryClient.refetchQueries({ queryKey: ['/api/contractor/subscription'] });
      } catch {}
      setIsPurchasing(false);
      toast({ title: "Subscription Activated", description: `Your Contractor ${plan === 'contractor_basic' ? 'Basic' : plan} subscription is now active.` });
      setLocation('/contractor-dashboard');
    });
    const unsubFailed = onNativePurchaseFailed(({ message }) => {
      setIsPurchasing(false);
      toast({ title: "Purchase Failed", description: message || "We couldn't complete your purchase. Please try again.", variant: "destructive" });
    });
    return () => { unsubVerified(); unsubFailed(); };
  }, [queryClient, toast, setLocation]);

  const handleNativeBasicPurchase = async () => {
    const userId = (user as { id?: string } | undefined)?.id;
    if (!userId) {
      toast({ title: "Sign in required", description: "Please sign in to purchase a subscription.", variant: "destructive" });
      return;
    }
    setIsPurchasing(true);
    try {
      await purchaseNativePlan('contractor_basic', userId);
    } catch (err) {
      setIsPurchasing(false);
      toast({ title: "Purchase Failed", description: err instanceof Error ? err.message : "Could not start purchase. Please try again.", variant: "destructive" });
    }
  };

  const handleNativeProPurchase = async () => {
    const userId = (user as { id?: string } | undefined)?.id;
    if (!userId) {
      toast({ title: "Sign in required", description: "Please sign in to purchase a subscription.", variant: "destructive" });
      return;
    }
    setIsPurchasing(true);
    try {
      await purchaseNativePlan('contractor_pro', userId);
    } catch (err) {
      setIsPurchasing(false);
      toast({ title: "Purchase Failed", description: err instanceof Error ? err.message : "Could not start purchase. Please try again.", variant: "destructive" });
    }
  };

  const handleRestore = async () => {
    const userId = (user as { id?: string } | undefined)?.id;
    if (!userId) return;
    setIsRestoring(true);
    try {
      const result = await restoreNativePurchases(userId);
      if (result.restored) {
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/contractor/subscription'] });
        toast({ title: "Purchases Restored", description: "Your subscription has been restored." });
      } else {
        toast({ title: "Nothing to Restore", description: "We couldn't find any previous purchases linked to your Apple ID." });
      }
    } catch (err) {
      toast({ title: "Restore Failed", description: err instanceof Error ? err.message : "Failed to restore purchases. Please try again.", variant: "destructive" });
    } finally {
      setIsRestoring(false);
    }
  };

  const proFeatures = [
    { icon: <Users className="h-5 w-5" />, title: 'Client Management', description: 'Full customer database with contact info, service history, and notes' },
    { icon: <Calendar className="h-5 w-5" />, title: 'Job Scheduling', description: 'Schedule jobs, assign team members, track progress' },
    { icon: <FileText className="h-5 w-5" />, title: 'Quotes & Invoices', description: 'Professional quotes and invoices with line items' },
    { icon: <CreditCard className="h-5 w-5" />, title: 'Accept Payments', description: 'Get paid directly through Stripe Connect' },
    { icon: <Users className="h-5 w-5" />, title: 'Team Management', description: 'Add team members with roles and permissions' },
    { icon: <Download className="h-5 w-5" />, title: 'Import Data', description: 'Import from Jobber, ServiceTitan, and more' },
    { icon: <BarChart3 className="h-5 w-5" />, title: 'Analytics Dashboard', description: 'Track revenue, jobs, and business growth' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <Badge className="mb-4" style={{ background: 'var(--theme-fill)', color: 'var(--theme-accent)' }}>
          <Sparkles className="h-3 w-3 mr-1" />
          Upgrade Your Business
        </Badge>
        <h1 className="text-3xl font-bold mb-2">Contractor Pro</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Everything you need to run your contracting business efficiently
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="border-2 border-muted">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Basic
              {currentPlan === 'basic' && (
                <Badge variant="outline">Current Plan</Badge>
              )}
            </CardTitle>
            <div className="text-3xl font-bold">$20<span className="text-base font-normal text-muted-foreground">/month</span></div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                Get found by homeowners
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                Receive and respond to messages
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                Send proposals to homeowners
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                Reviews and ratings profile
              </li>
            </ul>
            {isNativePlatform && currentPlan !== 'basic' && currentPlan !== 'pro' && (
              <div className="mt-3 space-y-1">
                <p className="text-sm font-semibold text-gray-900 text-center">$20.00/month · Auto-renews</p>
                <p className="text-xs text-muted-foreground text-center">14-day free trial included</p>
              </div>
            )}
            {isNativePlatform && currentPlan !== 'basic' && currentPlan !== 'pro' && (
              <Button
                className="w-full mt-3"
                style={{ background: 'linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)' }}
                onClick={handleNativeBasicPurchase}
                disabled={isPurchasing}
                data-testid="button-subscribe-basic-native"
              >
                {isPurchasing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : 'Subscribe to Basic'}
              </Button>
            )}
            {!isNativePlatform && currentPlan !== 'basic' && currentPlan !== 'pro' && (
              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={() => setLocation('/contractor/checkout?plan=basic')}
                data-testid="button-subscribe-basic"
              >
                Subscribe to Basic
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 relative overflow-hidden" style={{ borderColor: 'var(--theme-accent)' }}>
          <div className="absolute top-0 right-0 text-white text-xs px-3 py-1 rounded-bl-lg" style={{ background: 'var(--theme-accent)' }}>
            RECOMMENDED
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pro
              {currentPlan === 'pro' && (
                <Badge style={{ background: 'var(--theme-accent)', color: '#fff' }}>Current Plan</Badge>
              )}
            </CardTitle>
            <div className="text-3xl font-bold">$40<span className="text-base font-normal text-muted-foreground">/month</span></div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                Everything in Basic
              </li>
              <li className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--theme-accent)' }}>
                <Sparkles className="h-4 w-4" />
                Full CRM with client management
              </li>
              <li className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--theme-accent)' }}>
                <Sparkles className="h-4 w-4" />
                Job scheduling & tracking
              </li>
              <li className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--theme-accent)' }}>
                <Sparkles className="h-4 w-4" />
                Quotes, invoices & payments
              </li>
              <li className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--theme-accent)' }}>
                <Sparkles className="h-4 w-4" />
                Team management
              </li>
            </ul>
            {currentPlan !== 'pro' && !isNativePlatform && (
              <Button 
                className="w-full mt-4"
                style={{ background: 'linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)' }}
                onClick={() => setLocation('/contractor/checkout?plan=pro')}
                data-testid="button-upgrade-to-pro"
              >
                Upgrade to Pro
              </Button>
            )}
            {currentPlan !== 'pro' && isNativePlatform && (
              <div className="mt-3 space-y-1">
                <p className="text-sm font-semibold text-gray-900 text-center">$40.00/month · Auto-renews</p>
                <p className="text-xs text-muted-foreground text-center">14-day free trial included</p>
                <Button
                  className="w-full mt-2"
                  style={{ background: 'linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)' }}
                  onClick={handleNativeProPurchase}
                  disabled={isPurchasing}
                  data-testid="button-subscribe-pro-native"
                >
                  {isPurchasing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : 'Upgrade to Pro'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mb-4 text-center">Pro Features Include</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {proFeatures.map((feature, index) => (
          <Card key={index} className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'var(--theme-fill)', color: 'var(--theme-accent)' }}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isNativePlatform && (
        <div className="mt-8 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2" data-testid="contractor-native-subscription-disclosure">
            <p className="text-sm font-semibold text-gray-800">Subscription Terms</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Contractor Basic is <strong>$20.00/month</strong>, billed monthly. Auto-renews unless cancelled.</li>
              <li>Contractor Pro is <strong>$40.00/month</strong>, billed monthly. Auto-renews unless cancelled.</li>
              <li>Both plans include a <strong>14-day free trial</strong> for new subscribers.</li>
              <li>After the trial, payment is charged to your Apple ID.</li>
              <li>Cancel anytime in <strong>Settings → Apple ID → Subscriptions</strong>.</li>
            </ul>
            <div className="flex flex-wrap gap-4 pt-1">
              <button
                type="button"
                className="text-sm font-medium underline"
                style={{ color: 'var(--theme-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                data-testid="link-contractor-privacy-policy"
                onClick={() => openExternalUrl(`${window.location.origin}/privacy-policy`)}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                className="text-sm font-medium underline"
                style={{ color: 'var(--theme-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                data-testid="link-contractor-eula"
                onClick={() => openExternalUrl('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
              >
                Terms of Use (EULA)
              </button>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={handleRestore}
            disabled={isRestoring}
            data-testid="button-restore-contractor-purchases"
          >
            {isRestoring ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Restoring...</> : 'Restore Purchases'}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ContractorTrialBanner() {
  const { isInTrial, trialDaysRemaining, trialEndsAt } = useContractorSubscription();
  const [, setLocation] = useLocation();

  if (!isInTrial) return null;

  const formattedEndDate = trialEndsAt ? format(new Date(trialEndsAt), 'MMMM d, yyyy') : '';
  const isLowDays = trialDaysRemaining <= 3;

  return (
    <div className={`w-full py-3 px-4 ${isLowDays ? 'bg-amber-500' : 'bg-blue-600'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 text-white">
          <Clock className="h-5 w-5" />
          <div>
            <span className="font-semibold">
              {trialDaysRemaining === 1 
                ? 'Your free trial ends tomorrow!' 
                : `${trialDaysRemaining} days left in your free trial`}
            </span>
            <span className="hidden sm:inline ml-2 opacity-90">
              · Access ends {formattedEndDate}
            </span>
          </div>
        </div>
        <Button
          onClick={() => setLocation('/contractor/pricing')}
          variant="secondary"
          size="sm"
          className="bg-white text-blue-700 hover:bg-gray-100 font-semibold"
          data-testid="button-subscribe-trial-banner"
        >
          Subscribe Now
        </Button>
      </div>
    </div>
  );
}

export function ContractorTrialExpiredPaywall() {
  const [, setLocation] = useLocation();

  const plans = [
    {
      name: 'Basic',
      price: '$20',
      period: '/month',
      features: ['Get found by homeowners', 'Receive and respond to messages', 'Send proposals', 'Reviews profile', '$20/month referral credit cap'],
      recommended: false
    },
    {
      name: 'Pro',
      price: '$40',
      period: '/month',
      features: ['Everything in Basic', 'Full CRM with client management', 'Job scheduling', 'Quotes & invoices', 'Accept payments', 'Team management', '$40/month referral credit cap'],
      recommended: true
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1e3a5f' }}>
      <Card className="border-2 border-blue-300 shadow-lg max-w-4xl w-full bg-white">
        <CardContent className="py-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 p-4 rounded-full bg-amber-100 w-fit">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Free Trial Has Ended</h1>
            <p className="text-gray-600 max-w-lg mx-auto">
              Your 14-day free trial has expired. Subscribe to continue accessing MyHomeBase™ and connecting with homeowners. 
              Your profile and data are saved and ready when you return.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative ${plan.recommended ? 'border-2 border-blue-500' : 'border border-gray-200'}`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg">
                    RECOMMENDED
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-blue-700">
                    {plan.price}
                    <span className="text-base font-normal text-gray-500">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.recommended 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                      : 'bg-gray-600 hover:bg-gray-700'}`}
                    onClick={() => setLocation(`/contractor/pricing`)}
                    data-testid={`button-subscribe-${plan.name.toLowerCase()}`}
                  >
                    Subscribe to {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500">
            Questions? Contact us at gotohomebase2025@gmail.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
