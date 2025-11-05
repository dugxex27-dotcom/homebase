import { useState } from "react";
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
import logoImage from '@assets/homebase-logo_1756861910640.png';

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
  role: z.enum(["homeowner", "contractor"], {
    required_error: "Please select your role",
  }),
  inviteCode: z.string().optional(),
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
  return true;
}, {
  message: "Company name, bio, and phone are required for contractors",
  path: ["companyName"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function SignIn() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      zipCode: "",
      role: undefined,
      inviteCode: "",
      companyName: "",
      companyBio: "",
      companyPhone: "",
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

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const response = await apiRequest("/api/auth/register", "POST", {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        zipCode: data.zipCode,
        inviteCode: data.inviteCode || undefined,
        companyName: data.companyName,
        companyBio: data.companyBio,
        companyPhone: data.companyPhone,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate auth query to refresh user state
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Account created!",
        description: "Welcome to Home Base. Your account has been created successfully.",
      });
      
      // Redirect based on role
      const role = data.user?.role || 'homeowner';
      if (role === 'contractor') {
        setLocation('/contractor-dashboard');
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

  const handleRegisterSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
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
      const response = await apiRequest('/api/auth/homeowner-demo-login', 'POST', {
        email: 'demo@homeowner.com',
        name: 'Demo Homeowner',
        role: 'homeowner'
      });
      
      if (response.ok) {
        // Invalidate auth cache to refresh user data
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        toast({
          title: "Demo login successful",
          description: "Logged in as demo homeowner.",
        });
        // Redirect to homeowner dashboard
        setLocation('/');
      }
    } catch (error) {
      toast({
        title: "Demo login failed",
        description: "Could not log in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContractorDemoLogin = async () => {
    try {
      const response = await apiRequest('/api/auth/contractor-demo-login', 'POST', {
        email: 'demo@contractor.com',
        name: 'Demo Contractor',
        role: 'contractor'
      });
      
      if (response.ok) {
        // Invalidate auth cache to refresh user data
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        toast({
          title: "Demo login successful",
          description: "Logged in as demo contractor.",
        });
        // Redirect to contractor dashboard
        setLocation('/contractor-dashboard');
      }
    } catch (error) {
      toast({
        title: "Demo login failed",
        description: "Could not log in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const selectedRole = registerForm.watch("role");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={logoImage} 
            alt="Home Base" 
            className="h-24 w-auto mx-auto mb-4"
            data-testid="img-logo"
          />
          <p className="text-lg" style={{ color: '#ffffff' }}>
            Your trusted home services marketplace
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-foreground">
              {mode === 'login' ? 'Sign In to Your Account' : 'Create Your Account'}
            </CardTitle>
            <p className="text-muted-foreground">
              {mode === 'login' 
                ? 'Welcome back! Please sign in to continue' 
                : 'Join Home Base to get started'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleLogin}
              data-testid="button-google-oauth"
              style={{ color: '#ffffff' }}
            >
              <SiGoogle className="w-5 h-5" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground" style={{ color: '#ffffff' }}>
                  Or continue with email
                </span>
              </div>
            </div>

            {mode === 'login' ? (
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
                            className="text-white placeholder:text-white"
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
                              className="text-white placeholder:text-white pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
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
                    style={{ background: '#3c258e' }}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...registerForm}>
                <form key="register-form" onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="First name"
                              {...field}
                              data-testid="input-first-name"
                              style={{ color: '#ffffff' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Last name"
                              {...field}
                              data-testid="input-last-name"
                              style={{ color: '#ffffff' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-2"
                      style={{ color: '#ffffff' }}
                      data-testid="input-register-email"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm font-medium text-destructive mt-2">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showRegisterPassword ? "text" : "password"}
                              placeholder="Create a password (min 6 characters)"
                              {...field}
                              data-testid="input-password"
                              style={{ color: '#ffffff' }}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                              data-testid="button-toggle-register-password"
                            >
                              {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              {...field}
                              data-testid="input-confirm-password"
                              style={{ color: '#ffffff' }}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                              data-testid="button-toggle-confirm-password"
                            >
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your zip code"
                            {...field}
                            data-testid="input-zip-code"
                            style={{ color: '#ffffff' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>I am a</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value="homeowner" 
                                id="homeowner"
                                data-testid="radio-homeowner"
                              />
                              <Label htmlFor="homeowner" className="cursor-pointer">
                                Homeowner
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value="contractor" 
                                id="contractor"
                                data-testid="radio-contractor"
                              />
                              <Label htmlFor="contractor" className="cursor-pointer">
                                Contractor
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Company fields for contractors */}
                  {selectedRole === 'contractor' && (
                    <>
                      <div className="text-sm text-muted-foreground mb-2">
                        Create your company profile (team members can be added later via invite)
                      </div>
                      
                      <FormField
                        control={registerForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., ABC Plumbing"
                                {...field}
                                data-testid="input-company-name"
                                style={{ color: '#ffffff' }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="companyBio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Bio</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Brief description of your company"
                                {...field}
                                data-testid="input-company-bio"
                                style={{ color: '#ffffff' }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="companyPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Phone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="(555) 123-4567"
                                {...field}
                                data-testid="input-company-phone"
                                style={{ color: '#ffffff' }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={registerForm.control}
                    name="inviteCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invite Code (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter invite code if you have one"
                            {...field}
                            data-testid="input-invite-code"
                            style={{ color: '#ffffff' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                    style={{ 
                      background: selectedRole === 'contractor' ? '#518ebc' : '#3c258e'
                    }}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </Form>
            )}

            {/* Toggle between login and register */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-primary hover:underline font-medium"
                data-testid="link-toggle-mode"
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </div>

            {/* Demo Login Buttons */}
            <div className="pt-4 border-t">
              <p className="text-center text-sm text-muted-foreground mb-3">
                Demo Login (for testing)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleDemoLogin}
                  data-testid="button-demo-homeowner"
                  style={{ color: '#ffffff' }}
                >
                  Homeowner Demo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleContractorDemoLogin}
                  data-testid="button-demo-contractor"
                  style={{ color: '#ffffff' }}
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
