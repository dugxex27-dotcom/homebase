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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SiGoogle } from "react-icons/si";
import logoImage from '@assets/homebase-logo_1756861910640.png';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
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
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function SignIn() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
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
    },
    mode: "onBlur",
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("/api/auth/login", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
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
      });
      return response.json();
    },
    onSuccess: (data) => {
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

  const handleLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleRegisterSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    window.location.href = '/auth/google';
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
                            style={{ color: '#ffffff' }}
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
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                            data-testid="input-password"
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
                <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
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

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field: { onChange, onBlur, name, ref } }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            onChange={onChange}
                            onBlur={onBlur}
                            name={name}
                            ref={ref}
                            data-testid="input-register-email"
                            style={{ color: '#ffffff' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Create a password (min 6 characters)"
                            {...field}
                            data-testid="input-password"
                            style={{ color: '#ffffff' }}
                          />
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
                          <Input
                            type="password"
                            placeholder="Confirm your password"
                            {...field}
                            data-testid="input-confirm-password"
                            style={{ color: '#ffffff' }}
                          />
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
      </div>
    </div>
  );
}
