import { useState } from "react";
import { Crown, Users, Briefcase, FileText, Receipt, LayoutDashboard, Check, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useContractorSubscription } from "@/hooks/useContractorSubscription";

interface ProBenefitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const proFeatures = [
  {
    icon: Users,
    title: "Client Management",
    description: "Build lasting relationships with a complete client database",
    benefits: [
      "Store detailed client information and contact preferences",
      "Track service history and lifetime revenue per client",
      "Quick access to client notes and important details"
    ]
  },
  {
    icon: Briefcase,
    title: "Job Scheduling",
    description: "Stay organized with powerful job management tools",
    benefits: [
      "Schedule and track jobs with real-time status updates",
      "Set priorities and manage your daily workload",
      "Track labor costs and materials for each job"
    ]
  },
  {
    icon: FileText,
    title: "Professional Quotes",
    description: "Win more jobs with polished, professional quotes",
    benefits: [
      "Create itemized quotes with automatic calculations",
      "Track quote status from draft to accepted",
      "Convert accepted quotes directly to invoices"
    ]
  },
  {
    icon: Receipt,
    title: "Invoice Management",
    description: "Get paid faster with streamlined invoicing",
    benefits: [
      "Generate professional invoices in seconds",
      "Track payments and outstanding balances",
      "Send reminders for overdue invoices"
    ]
  },
  {
    icon: LayoutDashboard,
    title: "Business Dashboard",
    description: "See your business performance at a glance",
    benefits: [
      "Track total revenue and monthly trends",
      "Monitor active jobs and pending quotes",
      "Identify overdue invoices instantly"
    ]
  }
];

export function ProBenefitsDialog({ open, onOpenChange }: ProBenefitsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-purple-700">
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle>Upgrade to Contractor Pro</DialogTitle>
          <DialogDescription className="text-base">
            Unlock powerful CRM tools to grow your business and save hours every week
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {proFeatures.map((feature, index) => (
            <Card key={index} className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <feature.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{feature.title}</h4>
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

        <div className="bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 rounded-lg p-4 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="font-semibold">Contractor Pro</span>
              </div>
              <p className="text-sm text-muted-foreground">Everything you need to run your business</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">$40<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <p className="text-xs text-muted-foreground">Double the referral credits ($40/mo cap)</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-pro-dialog">
            Maybe Later
          </Button>
          <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800" data-testid="button-upgrade-pro-dialog">
            <Link href="/contractor/upgrade">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProFeatureGateProps {
  children: React.ReactNode;
  featureName: string;
  featureIcon?: React.ComponentType<{ className?: string }>;
  needsUpgrade?: boolean; // Optional - will use hook if not provided
}

export function ProFeatureGate({ children, featureName, featureIcon: FeatureIcon = Crown, needsUpgrade: needsUpgradeProp }: ProFeatureGateProps) {
  const [showBenefitsDialog, setShowBenefitsDialog] = useState(false);
  const { hasCrmAccess, isLoading } = useContractorSubscription();
  
  // Use prop if provided, otherwise use hook
  const needsUpgrade = needsUpgradeProp !== undefined ? needsUpgradeProp : !hasCrmAccess;

  // During loading, show a subtle loading state
  if (isLoading && needsUpgradeProp === undefined) {
    return (
      <div className="animate-pulse">
        <div className="bg-muted h-64 rounded-lg" />
      </div>
    );
  }

  if (!needsUpgrade) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg">
          <Card className="w-full max-w-md mx-4 shadow-lg border-2 border-purple-200 dark:border-purple-800">
            <CardContent className="py-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-700">
                  <Lock className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Unlock {featureName}</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Upgrade to Contractor Pro to access {featureName.toLowerCase()} and other powerful business tools.
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800" data-testid="button-upgrade-gate">
                  <Link href="/contractor/upgrade">
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro - $40/mo
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowBenefitsDialog(true)}
                  data-testid="button-see-pro-benefits"
                >
                  See all Pro features
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="opacity-30 pointer-events-none" aria-hidden="true">
          {children}
        </div>
      </div>

      <ProBenefitsDialog open={showBenefitsDialog} onOpenChange={setShowBenefitsDialog} />
    </>
  );
}

export function ProUpgradeBanner({ onShowBenefits }: { onShowBenefits: () => void }) {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-purple-700">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold">Upgrade to Contractor Pro</h4>
            <p className="text-sm text-muted-foreground">Get access to Client Management, Jobs, Quotes, Invoices & Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onShowBenefits} data-testid="button-learn-more-banner">
            Learn More
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700" data-testid="button-upgrade-banner">
            <Link href="/contractor/upgrade">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
