import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logoImage from '@assets/homebase-logo_1756861910640.png';

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/auth/register", "POST", {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        zipCode: data.zipCode || undefined,
        inviteCode: data.inviteCode || undefined,
        referralCode: data.referralCode || undefined,
        companyName: data.companyName || undefined,
        companyBio: data.companyBio || undefined,
        companyPhone: data.companyPhone || undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate auth query to refresh user state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Welcome to Home Base!",
        description: "Your account has been created successfully. Let's get started!",
      });
      
      // Redirect based on role
      const role = data.user?.role || 'homeowner';
      if (role === 'contractor') {
        setLocation('/contractor-dashboard');
      } else if (role === 'agent') {
        setLocation('/agent-dashboard');
      } else {
        setLocation('/');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleComplete = (data: any) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img 
            src={logoImage} 
            alt="Home Base" 
            className="h-20 w-auto mx-auto mb-4"
            data-testid="img-logo"
          />
          <h1 className="text-3xl font-bold text-foreground mb-2">Join Home Base</h1>
          <p className="text-lg text-muted-foreground">
            Your trusted home services marketplace
          </p>
        </div>

        <OnboardingWizard 
          onComplete={handleComplete}
          isLoading={registerMutation.isPending}
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <a 
              href="/signin" 
              className="text-primary hover:underline font-medium"
              data-testid="link-signin"
            >
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
