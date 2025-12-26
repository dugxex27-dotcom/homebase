import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Loader2,
  DollarSign,
  Building2,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StripeConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export function StripeConnectOnboarding() {
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { data: status, isLoading, refetch } = useQuery<StripeConnectStatus>({
    queryKey: ['/api/contractor/stripe-connect/status'],
    refetchOnWindowFocus: true,
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/contractor/stripe-connect/create', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create Stripe account');
      }
      return response.json();
    },
    onSuccess: async () => {
      await refetch();
      toast({
        title: "Account Created",
        description: "Your Stripe Connect account has been created. Complete the onboarding to start accepting payments.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/contractor/stripe-connect/onboarding-link', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create onboarding link');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        setIsRedirecting(true);
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dashboardMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/contractor/stripe-connect/dashboard-link', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dashboard link');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  // Not connected - show setup prompt
  if (!status?.hasAccount) {
    return (
      <Card className="border-2 border-dashed border-blue-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-blue-100">
            <CreditCard className="h-8 w-8 text-blue-700" />
          </div>
          <CardTitle>Accept Payments from Customers</CardTitle>
          <CardDescription>
            Connect your Stripe account to accept credit card payments directly through HomeBase invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-gray-50">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <h4 className="font-medium">Get Paid Faster</h4>
              <p className="text-sm text-muted-foreground">Accept card payments instantly</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <Building2 className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium">Direct Deposits</h4>
              <p className="text-sm text-muted-foreground">Funds go to your bank account</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <Shield className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <h4 className="font-medium">Secure & Trusted</h4>
              <p className="text-sm text-muted-foreground">Powered by Stripe</p>
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={() => createAccountMutation.mutate()}
            disabled={createAccountMutation.isPending}
            data-testid="button-connect-stripe"
          >
            {createAccountMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Connect with Stripe
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment processing powered by Stripe.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Account exists but onboarding incomplete
  if (!status.onboardingComplete || !status.chargesEnabled) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Setup
              </CardTitle>
              <CardDescription>Complete your Stripe onboarding to start accepting payments</CardDescription>
            </div>
            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              Incomplete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Your Stripe account needs additional information before you can accept payments.
            </AlertDescription>
          </Alert>

          <Button 
            className="w-full"
            onClick={() => onboardingMutation.mutate()}
            disabled={onboardingMutation.isPending || isRedirecting}
            data-testid="button-complete-stripe-onboarding"
          >
            {(onboardingMutation.isPending || isRedirecting) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Complete Stripe Setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Fully connected and ready
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Setup
            </CardTitle>
            <CardDescription>Your account is ready to accept payments</CardDescription>
          </div>
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-green-50 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">Charges</span>
            </div>
            <p className="text-sm text-green-600">Enabled</p>
          </div>
          <div className="p-4 rounded-lg bg-green-50 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">Payouts</span>
            </div>
            <p className="text-sm text-green-600">{status.payoutsEnabled ? 'Enabled' : 'Pending'}</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => dashboardMutation.mutate()}
          disabled={dashboardMutation.isPending}
          data-testid="button-stripe-dashboard"
        >
          {dashboardMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-2" />
          )}
          View Stripe Dashboard
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Manage your payouts, view transaction history, and update account settings in Stripe.
        </p>
      </CardContent>
    </Card>
  );
}
