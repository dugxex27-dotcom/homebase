import { useContractorSubscription } from "@/hooks/useContractorSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, Check, Users, Calendar, FileText, CreditCard, Download, BarChart3, Clock, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface ContractorFeatureGateProps {
  children: React.ReactNode;
  feature: 'crm' | 'clients' | 'jobs' | 'quotes' | 'invoices' | 'payments' | 'team' | 'imports' | 'analytics';
  fallback?: React.ReactNode;
}

const featureLabels: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  crm: { label: 'CRM Features', icon: <Users className="h-5 w-5" />, description: 'Full customer relationship management' },
  clients: { label: 'Client Management', icon: <Users className="h-5 w-5" />, description: 'Manage your customer database' },
  jobs: { label: 'Job Scheduling', icon: <Calendar className="h-5 w-5" />, description: 'Schedule and track jobs' },
  quotes: { label: 'Quotes & Estimates', icon: <FileText className="h-5 w-5" />, description: 'Create professional quotes' },
  invoices: { label: 'Invoicing', icon: <FileText className="h-5 w-5" />, description: 'Send invoices and track payments' },
  payments: { label: 'Payment Processing', icon: <CreditCard className="h-5 w-5" />, description: 'Accept payments via Stripe' },
  team: { label: 'Team Management', icon: <Users className="h-5 w-5" />, description: 'Manage your team members' },
  imports: { label: 'Data Import', icon: <Download className="h-5 w-5" />, description: 'Import from other CRMs' },
  analytics: { label: 'Business Analytics', icon: <BarChart3 className="h-5 w-5" />, description: 'Detailed business insights' },
};

export function ContractorFeatureGate({ children, feature, fallback }: ContractorFeatureGateProps) {
  const { hasCrmAccess, isLoading } = useContractorSubscription();

  if (isLoading) {
    return <div className="animate-pulse bg-muted h-32 rounded-lg" />;
  }

  if (hasCrmAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <ContractorUpgradePrompt feature={feature} />;
}

interface ContractorUpgradePromptProps {
  feature: string;
}

function ContractorUpgradePrompt({ feature }: ContractorUpgradePromptProps) {
  const [, setLocation] = useLocation();
  const featureInfo = featureLabels[feature] || { label: feature, icon: <Lock className="h-5 w-5" />, description: '' };

  return (
    <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-background">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 w-fit">
          <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <CardTitle className="text-lg">Upgrade to Pro</CardTitle>
        <CardDescription>
          {featureInfo.description} is available with Contractor Pro
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
            <Sparkles className="h-3 w-3 mr-1" />
            Pro Feature
          </Badge>
        </div>
        <Button 
          onClick={() => setLocation('/contractor/upgrade')}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          data-testid="button-upgrade-pro"
        >
          Upgrade to Pro - $40/month
        </Button>
      </CardContent>
    </Card>
  );
}

export function ContractorCRMUpgradePage() {
  const [, setLocation] = useLocation();
  const { currentPlan } = useContractorSubscription();

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
        <Badge className="mb-4 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
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
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs px-3 py-1 rounded-bl-lg">
            RECOMMENDED
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pro
              {currentPlan === 'pro' && (
                <Badge className="bg-purple-500">Current Plan</Badge>
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
              <li className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                <Sparkles className="h-4 w-4" />
                Full CRM with client management
              </li>
              <li className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                <Sparkles className="h-4 w-4" />
                Job scheduling & tracking
              </li>
              <li className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                <Sparkles className="h-4 w-4" />
                Quotes, invoices & payments
              </li>
              <li className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                <Sparkles className="h-4 w-4" />
                Team management
              </li>
            </ul>
            {currentPlan !== 'pro' && (
              <Button 
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                onClick={() => setLocation('/contractor/checkout?plan=pro')}
                data-testid="button-upgrade-to-pro"
              >
                Upgrade to Pro
              </Button>
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
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
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
    <div className={`w-full py-2 px-4 text-center text-sm ${isLowDays ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
      <Clock className="inline h-4 w-4 mr-2" />
      {trialDaysRemaining === 1 
        ? 'Your free trial ends tomorrow!' 
        : `${trialDaysRemaining} days left in your free trial`}
      {' · '}
      <button
        onClick={() => setLocation('/contractor/pricing')}
        className="underline font-medium hover:no-underline"
        data-testid="button-upgrade-trial-banner"
      >
        Subscribe now
      </button>
      {' to keep access after ' + formattedEndDate}
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
              Your 14-day free trial has expired. Subscribe to continue accessing HomeBase and connecting with homeowners. 
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
            Questions? Contact us at support@gotohomebase.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
