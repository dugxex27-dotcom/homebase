import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SiGoogle } from "react-icons/si";
import { Eye, EyeOff } from "lucide-react";
import Logo from '@/components/logo';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  resetCode: z.string().min(6, "Reset code must be 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  zipCode: z.string().min(5, "Please enter a valid zip code").max(10, "Zip code is too long"),
  role: z.enum(["homeowner", "contractor", "agent"], {
    required_error: "Please select your role",
  }),
  inviteCode: z.string().optional(),
  referralCode: z.string().optional(),
  // Company fields for contractors (only create, not join)
  companyName: z.string().optional(),
  companyBio: z.string().optional(),
  companyPhone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // If contractor, require company fields to create a company
  if (data.role === "contractor") {
    return data.companyName && data.companyBio && data.companyPhone;
  }
  return true; // Skip validation for homeowners and agents
}, {
  message: "Company name, bio, and phone are required for contractors",
  path: ["companyName"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function SignIn() {
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });


  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      resetCode: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("/api/auth/login", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate auth query to refresh user state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
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
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });


  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await apiRequest("/api/auth/forgot-password", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reset code sent",
        description: "A password reset code has been sent to your email. Please check your inbox.",
      });
      // Move to reset step and pre-fill email
      setResetStep('reset');
      resetPasswordForm.setValue('email', forgotPasswordForm.getValues('email'));
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message || "Could not process your request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      const response = await apiRequest("/api/auth/reset-password", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "Your password has been reset. You can now sign in with your new password.",
      });
      // Close dialog and reset forms
      setShowForgotPassword(false);
      setResetStep('request');
      forgotPasswordForm.reset();
      resetPasswordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: error.message || "Invalid reset code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };


  const handleForgotPasswordSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data);
  };

  const handleResetPasswordSubmit = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/login';
  };

  const handleDemoLogin = async () => {
    try {
      console.log('[Demo Login] Starting homeowner demo login...');
      
      // Clear any existing session first
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        queryClient.clear();
      } catch (e) {
        // Ignore logout errors - user might not be logged in
      }
      
      const response = await apiRequest('/api/auth/homeowner-demo-login', 'POST', {
        email: 'demo@homeowner.com',
        name: 'Demo Homeowner',
        role: 'homeowner'
      });
      
      console.log('[Demo Login] Response received:', response.ok, response.status);
      
      if (response.ok) {
        console.log('[Demo Login] Success! Redirecting...');
        toast({
          title: "Demo login successful",
          description: "Logged in as demo homeowner.",
        });
        // Use window.location for a full page refresh to ensure session is picked up
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('[Demo Login] Error:', error?.message || error);
      toast({
        title: "Demo login failed",
        description: error?.message || "Could not log in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContractorDemoLogin = async () => {
    try {
      console.log('[Demo Login] Starting contractor demo login...');
      
      // Clear any existing session first
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        queryClient.clear();
      } catch (e) {
        // Ignore logout errors - user might not be logged in
      }
      
      const response = await apiRequest('/api/auth/contractor-demo-login', 'POST', {
        email: 'demo@contractor.com',
        name: 'Demo Contractor',
        role: 'contractor'
      });
      
      console.log('[Demo Login] Response received:', response.ok, response.status);
      
      if (response.ok) {
        console.log('[Demo Login] Success! Redirecting...');
        toast({
          title: "Demo login successful",
          description: "Logged in as demo contractor.",
        });
        // Use window.location for a full page refresh to ensure session is picked up
        window.location.href = '/contractor-dashboard';
      }
    } catch (error: any) {
      console.error('[Demo Login] Error:', error?.message || error);
      toast({
        title: "Demo login failed",
        description: error?.message || "Could not log in. Please try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="h-12 w-auto mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">
            Your trusted home services marketplace
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-foreground">
              Sign In to Your Account
            </CardTitle>
            <p className="text-muted-foreground">
              Welcome back! Please sign in to continue
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google OAuth Button - Hidden */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 hidden"
              onClick={handleGoogleLogin}
              data-testid="button-google-oauth"
            >
              <SiGoogle className="w-5 h-5" />
              Continue with Google
            </Button>

            <div className="relative hidden">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            {...field}
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showLoginPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              {...field}
                              data-testid="input-password"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              data-testid="button-toggle-login-password"
                            >
                              {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </Form>

            {/* Sign up link */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Don't have an account?{' '}
              </span>
              <a
                href="/onboarding"
                className="text-primary hover:underline font-medium"
                data-testid="link-create-account"
              >
                Create one
              </a>
            </div>

            {/* Demo Login Buttons */}
            <div className="pt-4 border-t">
              <p className="text-center text-sm text-muted-foreground mb-3">
                Demo Login (for testing)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleDemoLogin}
                  data-testid="button-demo-homeowner"
                  style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                >
                  Homeowner Demo
                </Button>
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleContractorDemoLogin}
                  data-testid="button-demo-contractor"
                  style={{ backgroundColor: '#1560a2', color: 'white' }}
                >
                  Contractor Demo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forgot Password Dialog */}
        <Dialog open={showForgotPassword} onOpenChange={(open) => {
          setShowForgotPassword(open);
          if (!open) {
            setResetStep('request');
            forgotPasswordForm.reset();
            resetPasswordForm.reset();
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {resetStep === 'request' ? 'Reset Your Password' : 'Enter Reset Code'}
              </DialogTitle>
              <DialogDescription>
                {resetStep === 'request' 
                  ? 'Enter your email address and we\'ll send you a password reset code.'
                  : 'Enter the 6-digit code sent to your email and choose a new password.'}
              </DialogDescription>
            </DialogHeader>

            {resetStep === 'request' ? (
              <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            {...field}
                            data-testid="input-forgot-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1"
                      data-testid="button-cancel-forgot"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={forgotPasswordMutation.isPending}
                      data-testid="button-send-reset-code"
                    >
                      {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Code'}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Form {...resetPasswordForm}>
                <form onSubmit={resetPasswordForm.handleSubmit(handleResetPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={resetPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            {...field}
                            disabled
                            data-testid="input-reset-email"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetPasswordForm.control}
                    name="resetCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reset Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter 6-digit code"
                            {...field}
                            maxLength={6}
                            data-testid="input-reset-code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetPasswordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter new password"
                              {...field}
                              data-testid="input-new-password"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                              data-testid="button-toggle-new-password"
                            >
                              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetPasswordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmNewPassword ? "text" : "password"}
                              placeholder="Confirm new password"
                              {...field}
                              data-testid="input-confirm-new-password"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                              data-testid="button-toggle-confirm-new-password"
                            >
                              {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setResetStep('request')}
                      className="flex-1"
                      data-testid="button-back-to-email"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={resetPasswordMutation.isPending}
                      data-testid="button-reset-password"
                    >
                      {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
