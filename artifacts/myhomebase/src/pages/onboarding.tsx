import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, waitForAuthSession } from "@/lib/queryClient";
import logoImage from '@assets/my-homebase-logo-tm-final_1776295160061.png';

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Capture handoff_token from URL param or sessionStorage so we can redirect
  // the new buyer back to their claim page after registration.
  const urlParams = new URLSearchParams(window.location.search);
  const handoffToken = urlParams.get("handoff_token") || sessionStorage.getItem("pendingHandoffToken") || null;
  if (handoffToken) {
    sessionStorage.setItem("pendingHandoffToken", handoffToken);
  }

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
    onSuccess: async (data) => {
      await waitForAuthSession(data.user);

      // If the user completed the quiz before signing up, associate their result
      // with their new account now that they are authenticated.
      try {
        const raw = localStorage.getItem('mhb_quiz_result');
        if (raw) {
          const quizResult = JSON.parse(raw);
          if (quizResult?.score !== undefined && quizResult?.tier && quizResult?.completedAt) {
            fetch('/api/quiz-result', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(quizResult),
            }).catch(() => {
              // Non-critical — the anonymous result is already in the database
            });
          }
        }
      } catch {
        // Ignore parse errors
      }

      toast({
        title: "Welcome to MyHomeBase™!",
        description: "Your account has been created successfully. Let's get started!",
      });
      
      // Redirect based on role — homeowners with a pending handoff go to their claim page
      const role = data.user?.role || 'homeowner';
      if (role === 'contractor') {
        setLocation('/contractor-dashboard');
      } else if (role === 'agent') {
        setLocation('/agent-dashboard');
      } else {
        const pendingToken = sessionStorage.getItem("pendingHandoffToken");
        if (pendingToken) {
          setLocation(`/handoff/${pendingToken}`);
        } else {
          setLocation('/');
        }
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
            alt="MyHomeBase™" 
            className="h-20 w-auto mx-auto mb-4"
            data-testid="img-logo"
          />
          <h1 className="text-3xl font-bold text-foreground mb-2">Join MyHomeBase™</h1>
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
