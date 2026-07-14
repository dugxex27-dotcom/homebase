import { useState } from "react";
import { Crown, Home, Calendar, Wrench, Trophy, PiggyBank, Sparkles, Check, Clock, Gift, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useHomeownerSubscription } from "@/hooks/useHomeownerSubscription";

interface HomeownerBenefitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialDaysRemaining?: number;
}

const homeownerFeatures = [
  {
    icon: Calendar,
    title: "Maintenance Scheduling",
    description: "Stay on top of your home maintenance with smart scheduling",
    benefits: [
      "Seasonal maintenance reminders tailored to your climate",
      "Track completed and upcoming tasks",
      "Never miss important home care deadlines"
    ]
  },
  {
    icon: Wrench,
    title: "Service Records",
    description: "Keep a complete history of all work done on your home",
    benefits: [
      "Document DIY projects and contractor work",
      "Store receipts and warranty information",
      "Build your home's 'Carfax' for future buyers"
    ]
  },
  {
    icon: Home,
    title: "Home Wellness Score™",
    description: "See how well-maintained your home is at a glance",
    benefits: [
      "Gamified score based on completed maintenance",
      "Track improvement over time",
      "Identify areas needing attention"
    ]
  },
  {
    icon: Trophy,
    title: "Achievements",
    description: "Earn rewards for taking care of your home",
    benefits: [
      "Unlock badges for completing maintenance tasks",
      "Track your home care streaks",
      "Celebrate your DIY accomplishments"
    ]
  },
  {
    icon: PiggyBank,
    title: "DIY Savings Tracker",
    description: "See how much money you're saving by doing it yourself",
    benefits: [
      "Compare DIY costs vs professional rates",
      "Track lifetime savings across all projects",
      "Regional cost estimates for accurate comparisons"
    ]
  },
  {
    icon: Gift,
    title: "Referral Rewards",
    description: "Earn credits by sharing MyHomeBase™ with friends",
    benefits: [
      "Get $1/month credit per active referral",
      "Earn a free subscription with enough referrals",
      "Share via social media, text, or email"
    ]
  }
];

const freeFeatures = [
  { icon: Search, title: "Search Contractors", description: "Find and browse local contractors" },
  { icon: MessageSquare, title: "Messaging", description: "Send and receive messages with contractors" },
];

export function HomeownerBenefitsDialog({ open, onOpenChange, trialDaysRemaining }: HomeownerBenefitsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }}>
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle style={{ color: '#2c0f5b' }}>Unlock Full MyHomeBase™ Access</DialogTitle>
          <DialogDescription className="text-base">
            Get all the tools you need to keep your home in perfect condition
          </DialogDescription>
        </DialogHeader>

        {/* Free Features */}
        <div className="bg-green-50 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
            <Check className="h-5 w-5" />
            Always Free
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {freeFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-green-700">
                <feature.icon className="h-4 w-4" />
                <span>{feature.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 py-4">
          {homeownerFeatures.map((feature, index) => (
            <Card key={index} style={{ borderLeft: '4px solid var(--hw-primary)' }}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="p-2 rounded-lg" style={{ background: 'var(--purple-tint)' }}>
                      <feature.icon className="h-5 w-5" style={{ color: 'var(--hw-primary)' }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1" style={{ color: '#2c0f5b' }}>{feature.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{feature.description}</p>
                    <ul className="space-y-1">
                      {feature.benefits.map((benefit, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-lg p-4 mt-2" style={{ background: 'var(--purple-tint)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--hw-primary)' }} />
                <span className="font-semibold" style={{ color: '#2c0f5b' }}>MyHomeBase™ Subscription</span>
              </div>
              <p className="text-sm text-muted-foreground">Everything you need to maintain your home</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: '#2c0f5b' }}>$5<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <p className="text-xs text-muted-foreground">Try free for 14 days · card required at signup</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-homeowner-dialog">
            Maybe Later
          </Button>
          <Button asChild size="lg" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }} data-testid="button-subscribe-dialog">
            <Link href="/homeowner-pricing">
              <Crown className="h-4 w-4 mr-2" />
              View Plans
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface HomeownerFeatureGateProps {
  children: React.ReactNode;
  featureName: string;
  featureIcon?: React.ComponentType<{ className?: string }>;
}

export function HomeownerFeatureGate({ children, featureName, featureIcon: FeatureIcon = Crown }: HomeownerFeatureGateProps) {
  const [showBenefitsDialog, setShowBenefitsDialog] = useState(false);
  const { needsUpgrade, isLoading, trialDaysRemaining, isInTrial } = useHomeownerSubscription();

  if (isLoading) {
    return <>{children}</>;
  }

  if (!needsUpgrade) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg">
          <Card className="w-full max-w-md mx-4 shadow-lg border-2" style={{ borderColor: 'var(--purple-border)' }}>
            <CardContent className="py-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }}>
                  <Crown className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#2c0f5b' }}>Unlock {featureName}</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Subscribe to MyHomeBase™ to access {featureName.toLowerCase()} and all premium home management features.
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild size="lg" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }} data-testid="button-subscribe-gate">
                  <Link href="/homeowner-pricing">
                    <Crown className="h-4 w-4 mr-2" />
                    Start Free Trial - $5/mo
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowBenefitsDialog(true)}
                  data-testid="button-see-benefits"
                >
                  See all features
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="opacity-30 pointer-events-none" aria-hidden="true">
          {children}
        </div>
      </div>

      <HomeownerBenefitsDialog 
        open={showBenefitsDialog} 
        onOpenChange={setShowBenefitsDialog}
        trialDaysRemaining={trialDaysRemaining}
      />
    </>
  );
}

export function HomeownerTrialBanner() {
  const { isInTrial, trialDaysRemaining, needsUpgrade } = useHomeownerSubscription();
  const [showBenefitsDialog, setShowBenefitsDialog] = useState(false);

  if (!isInTrial && !needsUpgrade) {
    return null;
  }

  if (isInTrial) {
    return (
      <>
        <div className="rounded-lg p-4 mb-6 border" style={{ background: 'var(--purple-tint)', borderColor: 'var(--purple-border)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }}>
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold" style={{ color: '#2c0f5b' }}>
                  {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in your trial
                </h4>
                <p className="text-sm text-muted-foreground">Subscribe now to keep access to all features</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowBenefitsDialog(true)} data-testid="button-learn-more-trial">
                Learn More
              </Button>
              <Button asChild size="sm" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }} data-testid="button-subscribe-trial">
                <Link href="/homeowner-pricing">
                  <Crown className="h-4 w-4 mr-2" />
                  Subscribe Now
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <HomeownerBenefitsDialog 
          open={showBenefitsDialog} 
          onOpenChange={setShowBenefitsDialog}
          trialDaysRemaining={trialDaysRemaining}
        />
      </>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-amber-400 to-amber-600">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900">Your trial has ended</h4>
              <p className="text-sm text-amber-700">Subscribe to continue accessing premium features</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowBenefitsDialog(true)} data-testid="button-learn-more-expired">
              Learn More
            </Button>
            <Button asChild size="sm" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }} data-testid="button-subscribe-expired">
              <Link href="/homeowner-pricing">
                <Crown className="h-4 w-4 mr-2" />
                Subscribe - $5/mo
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <HomeownerBenefitsDialog 
        open={showBenefitsDialog} 
        onOpenChange={setShowBenefitsDialog}
      />
    </>
  );
}

export function PaidSubscriberGate({ children, featureName }: { children: React.ReactNode; featureName: string }) {
  const [showBenefitsDialog, setShowBenefitsDialog] = useState(false);
  const { isPaidSubscriber, isLoading } = useHomeownerSubscription();

  if (isLoading) {
    return null;
  }

  if (isPaidSubscriber) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg">
          <Card className="w-full max-w-md mx-4 shadow-lg border-2" style={{ borderColor: 'var(--purple-border)' }}>
            <CardContent className="py-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }}>
                  <Gift className="h-10 w-10 text-white" />
                </div>
              </div>
              <Badge className="mb-4" style={{ background: 'var(--purple-tint)', color: 'var(--hw-primary)' }}>Paid Subscriber Exclusive</Badge>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#2c0f5b' }}>Unlock {featureName}</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {featureName} is available exclusively for paid subscribers. Subscribe to unlock this feature and start earning rewards!
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild size="lg" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }} data-testid="button-subscribe-paid-gate">
                  <Link href="/homeowner-pricing">
                    <Crown className="h-4 w-4 mr-2" />
                    Subscribe Now - $5/mo
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowBenefitsDialog(true)}
                  data-testid="button-see-benefits-paid"
                >
                  See all features
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="opacity-30 pointer-events-none" aria-hidden="true">
          {children}
        </div>
      </div>

      <HomeownerBenefitsDialog 
        open={showBenefitsDialog} 
        onOpenChange={setShowBenefitsDialog}
      />
    </>
  );
}

// Component for free users to upgrade to access maintenance features
export function FreeUserUpgradePrompt() {
  const [showBenefitsDialog, setShowBenefitsDialog] = useState(false);

  const plans = [
    {
      name: 'Base',
      price: '$5',
      homes: '1-2 homes',
      features: ['Maintenance tracking', 'Home health score', 'DIY savings tracker', 'Service records'],
      planId: 'base'
    },
    {
      name: 'Premium',
      price: '$20',
      homes: '3-6 homes',
      features: ['All Base features', 'Priority contractor matching', 'Advanced maintenance insights'],
      planId: 'premium'
    },
    {
      name: 'Premium Plus',
      price: '$40',
      homes: 'Unlimited homes',
      features: ['All Premium features', 'Dedicated support', 'Bulk maintenance scheduling'],
      planId: 'premium_plus'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#eeedf9' }}>
      <Card className="border-2 shadow-lg max-w-4xl w-full" style={{ borderColor: 'var(--purple-border)' }}>
        <CardContent className="py-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="p-4 rounded-full" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }}>
              <Home className="h-10 w-10 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2" style={{ color: '#2c0f5b' }}>Upgrade to Access Maintenance Features</h3>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Free accounts can search for contractors and make payments. Upgrade to track your home maintenance, earn achievements, and more!
          </p>

          {/* Free Features Reminder */}
          <div className="bg-green-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              Always Free
            </h4>
            <div className="flex justify-center gap-6 text-sm text-green-700">
              <span className="flex items-center gap-1"><Search className="h-4 w-4" /> Contractor Search</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Messaging</span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {plans.map((plan) => (
              <Link key={plan.name} href={`/homeowner-pricing?plan=${plan.planId}`}>
                <Card 
                  className="relative border cursor-pointer transition-all hover:shadow-lg h-full"
                  style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
                >
                  <CardContent className="pt-6 pb-4">
                    <h4 className="font-bold text-lg" style={{ color: '#2c0f5b' }}>{plan.name}</h4>
                    <div className="text-3xl font-bold my-2" style={{ color: '#2c0f5b' }}>
                      {plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--hw-primary)' }}>{plan.homes}</p>
                    <ul className="text-sm text-left space-y-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }} data-testid="button-upgrade-free-user">
              <Link href="/homeowner-pricing">
                <Crown className="h-4 w-4 mr-2" />
                View Plans & Sign Up
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setShowBenefitsDialog(true)}
              data-testid="button-see-all-features"
            >
              See All Features
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            All paid plans include a 14-day free trial. Card required at signup — not charged for 14 days. Cancel anytime.
          </p>
        </CardContent>
      </Card>

      <HomeownerBenefitsDialog 
        open={showBenefitsDialog} 
        onOpenChange={setShowBenefitsDialog}
      />
    </div>
  );
}
