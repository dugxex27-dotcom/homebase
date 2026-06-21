import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff } from "lucide-react";
import logoContractor from '@assets/my-homebase-logo-tm-final-white_1777417516350.png';

const C = {
  header: '#1560A2',
  bg: '#eef4fc',
  primary: '#1560A2',
  border: 'rgba(24,95,165,0.12)',
  cardBorder: 'rgba(24,95,165,0.1)',
  eyebrow: '#B5D4F4',
  inactive: '#7badd4',
  label: '#1560A2',
};

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
}).refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });
const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  zipCode: z.string().min(5, "Please enter a valid zip code").max(10, "Zip code is too long"),
  referralCode: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const inpStyle = { background: '#F3F5F7', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', fontSize: 13, fontWeight: 500, color: C.label, height: 'auto', boxShadow: 'none', outline: 'none' } as React.CSSProperties;
const labelStyle = { fontSize: 11, fontWeight: 700, color: C.label, letterSpacing: '0.03em', marginBottom: 4, display: 'block' } as React.CSSProperties;

const GoogleSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function SignInContractor() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    document.body.classList.add('signin-page');
    return () => document.body.classList.remove('signin-page');
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) registerForm.setValue('referralCode', refParam);
  }, []);

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" }, mode: "onBlur" });
  const registerForm = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema), defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "", zipCode: "", referralCode: "" }, mode: "onBlur" });
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const resetPasswordForm = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { email: "", resetCode: "", newPassword: "", confirmPassword: "" } });

  function resolvePostAuthRedirect(defaultPath: string): string {
    const urlHandoffToken = new URLSearchParams(window.location.search).get('handoff_token');
    const sessionHandoffToken = sessionStorage.getItem('pendingHandoffToken');
    const handoffToken = urlHandoffToken || sessionHandoffToken;
    if (handoffToken) return `/handoff/${handoffToken}`;
    return defaultPath;
  }

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => (await apiRequest("/api/auth/login", "POST", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: "Welcome back!" });
      setLocation(resolvePostAuthRedirect('/contractor-dashboard'));
    },
    onError: (e: Error) => toast({ title: "Login failed", description: e.message || "Invalid credentials.", variant: "destructive" }),
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => (await apiRequest("/api/auth/register", "POST", { ...data, role: 'contractor' })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: "Account created!", description: "Welcome to MyHomeBase™." });
      setLocation('/contractor-onboarding');
    },
    onError: (e: Error) => toast({ title: "Registration failed", description: e.message, variant: "destructive" }),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => (await apiRequest("/api/auth/forgot-password", "POST", data)).json(),
    onSuccess: () => { toast({ title: "Reset code sent" }); setResetStep('reset'); resetPasswordForm.setValue('email', forgotPasswordForm.getValues('email')); },
    onError: (e: Error) => toast({ title: "Request failed", description: e.message, variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => (await apiRequest("/api/auth/reset-password", "POST", data)).json(),
    onSuccess: () => { toast({ title: "Password reset successful" }); setShowForgotPassword(false); setResetStep('request'); forgotPasswordForm.reset(); resetPasswordForm.reset(); },
    onError: (e: Error) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  const handleContractorDemoLogin = async () => {
    try {
      try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
      const response = await apiRequest('/api/auth/contractor-demo-login', 'POST', { email: 'demo@contractor.com', name: 'Demo Contractor', role: 'contractor' });
      if (response.ok) {
        const data = await response.json();
        queryClient.setQueryData(['/api/auth/user'], data.user);
        toast({ title: "Demo login successful" });
      }
    } catch (error: any) {
      toast({ title: "Demo login failed", description: error?.message, variant: "destructive" });
    }
  };

  const referralCodeValue = registerForm.watch("referralCode");

  const toggleBtn = (active: boolean) => ({
    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? '#fff' : 'transparent',
    color: active ? C.label : C.inactive,
    fontFamily: 'inherit',
  } as React.CSSProperties);

  const primaryBtn = (pending: boolean) => ({
    width: '100%', background: C.primary, borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700, color: '#fff',
    border: 'none', cursor: pending ? 'default' : 'pointer', marginBottom: 14, opacity: pending ? 0.7 : 1, fontFamily: 'inherit',
  } as React.CSSProperties);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg }}>

      {/* ── Role header ── */}
      <div style={{ background: C.header, padding: 'calc(40px + var(--native-safe-top, 0px)) 24px 44px', textAlign: 'center', flexShrink: 0, position: 'relative' }}>
        <div style={{ marginBottom: 18, position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center' }}>
          <a href="/" style={{ display: 'inline-block' }}>
            <img src={logoContractor} alt="MyHomeBase™ — go to home" style={{ width: 200, height: 'auto', display: 'block' }} />
          </a>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 20, padding: '4px 12px', marginBottom: 14, position: 'relative', zIndex: 2, background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#B5D4F4' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#B5D4F4', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Contractor</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.15, position: 'relative', zIndex: 2, marginBottom: 8 }}>Welcome back</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', position: 'relative', zIndex: 2, lineHeight: 1.5 }}>Sign in to your contractor account</div>
        <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 28, borderRadius: '28px 28px 0 0', background: C.bg, zIndex: 1 }} />
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '28px 20px 24px', display: 'flex', flexDirection: 'column', maxWidth: 480, width: '100%', margin: '0 auto' }}>

          <div style={{ display: 'flex', background: 'rgba(24,95,165,0.1)', borderRadius: 12, padding: 3, marginBottom: 18 }}>
            <button type="button" onClick={() => setActiveTab('login')} style={toggleBtn(activeTab === 'login')} data-testid="tab-login-contractor">Sign in</button>
            <button type="button" onClick={() => setActiveTab('register')} style={toggleBtn(activeTab === 'register')} data-testid="tab-register-contractor">Register</button>
          </div>

          {activeTab === 'login' && (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} data-testid="form-login-contractor">
                <FormField control={loginForm.control} name="email" render={({ field }) => (
                  <FormItem style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Email address</label>
                    <FormControl><Input type="email" placeholder="you@email.com" {...field} data-testid="input-email-contractor" style={inpStyle} className="focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={loginForm.control} name="password" render={({ field }) => (
                  <FormItem style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Password</label>
                    <FormControl>
                      <div style={{ position: 'relative' }}>
                        <Input type={showLoginPassword ? 'text' : 'password'} placeholder="••••••••" {...field} data-testid="input-password-contractor" style={{ ...inpStyle, paddingRight: 44 }} className="focus-visible:ring-0 focus-visible:ring-offset-0" />
                        <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} data-testid="button-toggle-login-password-contractor" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.inactive, display: 'flex', padding: 0 }}>
                          {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div style={{ textAlign: 'right', marginBottom: 14 }}>
                  <button type="button" onClick={() => setShowForgotPassword(true)} data-testid="link-forgot-password-contractor" style={{ fontSize: 11, fontWeight: 700, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Forgot password?</button>
                </div>
                <button type="submit" disabled={loginMutation.isPending} data-testid="button-login-contractor" style={primaryBtn(loginMutation.isPending)}>
                  {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.inactive }}>or</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                <a href="/auth/google" data-testid="button-google-signin-contractor" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#1a1a1a', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <GoogleSVG />Continue with Google
                </a>
              </form>
            </Form>
          )}

          {activeTab === 'register' && (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit((d) => registerMutation.mutate(d))} data-testid="form-register-contractor">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <FormField control={registerForm.control} name="firstName" render={({ field }) => (
                    <FormItem style={{ marginBottom: 10 }}><label style={labelStyle}>First name</label><FormControl><Input placeholder="First" {...field} data-testid="input-first-name-contractor" style={inpStyle} className="focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={registerForm.control} name="lastName" render={({ field }) => (
                    <FormItem style={{ marginBottom: 10 }}><label style={labelStyle}>Last name</label><FormControl><Input placeholder="Last" {...field} data-testid="input-last-name-contractor" style={inpStyle} className="focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={registerForm.control} name="email" render={({ field }) => (
                  <FormItem style={{ marginBottom: 10 }}><label style={labelStyle}>Email address</label><FormControl><Input type="email" placeholder="you@email.com" {...field} data-testid="input-register-email-contractor" style={inpStyle} className="focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={registerForm.control} name="password" render={({ field }) => (
                  <FormItem style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Password</label>
                    <FormControl>
                      <div style={{ position: 'relative' }}>
                        <Input type={showRegisterPassword ? 'text' : 'password'} placeholder="Min 6 characters" {...field} data-testid="input-password-contractor" style={{ ...inpStyle, paddingRight: 44 }} className="focus-visible:ring-0 focus-visible:ring-offset-0" />
                        <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} data-testid="button-toggle-register-password-contractor" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.inactive, display: 'flex', padding: 0 }}>
                          {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Confirm password</label>
                    <FormControl>
                      <div style={{ position: 'relative' }}>
                        <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" {...field} data-testid="input-confirm-password-contractor" style={{ ...inpStyle, paddingRight: 44 }} className="focus-visible:ring-0 focus-visible:ring-offset-0" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} data-testid="button-toggle-confirm-password-contractor" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.inactive, display: 'flex', padding: 0 }}>
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={registerForm.control} name="zipCode" render={({ field }) => (
                  <FormItem style={{ marginBottom: 10 }}><label style={labelStyle}>Zip code</label><FormControl><Input placeholder="Enter your zip code" {...field} data-testid="input-zip-code-contractor" style={inpStyle} className="focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl><FormMessage /></FormItem>
                )} />
                {referralCodeValue && (
                  <FormField control={registerForm.control} name="referralCode" render={({ field }) => (
                    <FormItem style={{ marginBottom: 10 }}><label style={labelStyle}>Referral code</label><FormControl><Input {...field} readOnly data-testid="input-referral-code-contractor" style={{ ...inpStyle, opacity: 0.7 }} className="focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
                <button type="submit" disabled={registerMutation.isPending} data-testid="button-register-contractor" style={primaryBtn(registerMutation.isPending)}>
                  {registerMutation.isPending ? 'Creating account…' : 'Create Account'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.inactive }}>or</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                <a href="/auth/google" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#1a1a1a', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <GoogleSVG />Continue with Google
                </a>
              </form>
            </Form>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: C.inactive }}>
          {activeTab === 'login'
            ? <><span>Don't have an account? </span><button type="button" onClick={() => setActiveTab('register')} style={{ color: C.primary, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>Register free</button></>
            : <><span>Already have an account? </span><button type="button" onClick={() => setActiveTab('login')} style={{ color: C.primary, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>Sign in</button></>
          }
        </div>
        <div style={{ textAlign: 'center', paddingBottom: 24 }}>
          <button type="button" onClick={handleContractorDemoLogin} data-testid="button-contractor-demo" style={{ fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.25)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
            Demo login
          </button>
        </div>
      </div>

      <Dialog open={showForgotPassword} onOpenChange={(open) => { setShowForgotPassword(open); if (!open) { setResetStep('request'); forgotPasswordForm.reset(); resetPasswordForm.reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{resetStep === 'request' ? 'Reset Your Password' : 'Enter Reset Code'}</DialogTitle>
            <DialogDescription>{resetStep === 'request' ? "Enter your email and we'll send a reset code." : "Enter the 6-digit code sent to your email."}</DialogDescription>
          </DialogHeader>
          {resetStep === 'request' ? (
            <Form {...forgotPasswordForm}>
              <form onSubmit={forgotPasswordForm.handleSubmit((d) => forgotPasswordMutation.mutate(d))} className="space-y-4">
                <FormField control={forgotPasswordForm.control} name="email" render={({ field }) => (
                  <FormItem><label style={labelStyle}>Email Address</label><FormControl><Input type="email" placeholder="Enter your email" {...field} data-testid="input-forgot-email-contractor" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} className="flex-1" data-testid="button-cancel-forgot-contractor">Cancel</Button>
                  <Button type="submit" className="flex-1 text-white" disabled={forgotPasswordMutation.isPending} style={{ backgroundColor: C.primary }} data-testid="button-send-reset-code-contractor">{forgotPasswordMutation.isPending ? 'Sending…' : 'Send Reset Code'}</Button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit((d) => resetPasswordMutation.mutate(d))} className="space-y-4">
                <FormField control={resetPasswordForm.control} name="email" render={({ field }) => (
                  <FormItem><label style={labelStyle}>Email Address</label><FormControl><Input type="email" {...field} disabled data-testid="input-reset-email-contractor" /></FormControl></FormItem>
                )} />
                <FormField control={resetPasswordForm.control} name="resetCode" render={({ field }) => (
                  <FormItem><label style={labelStyle}>Reset Code</label><FormControl><Input placeholder="Enter 6-digit code" {...field} data-testid="input-reset-code-contractor" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={resetPasswordForm.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <label style={labelStyle}>New Password</label>
                    <FormControl>
                      <div className="relative">
                        <Input type={showNewPassword ? "text" : "password"} placeholder="Enter new password" {...field} data-testid="input-new-password-contractor" className="pr-10" />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={resetPasswordForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <label style={labelStyle}>Confirm New Password</label>
                    <FormControl>
                      <div className="relative">
                        <Input type={showConfirmNewPassword ? "text" : "password"} placeholder="Confirm new password" {...field} data-testid="input-confirm-new-password-contractor" className="pr-10" />
                        <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setResetStep('request'); resetPasswordForm.reset(); }} className="flex-1" data-testid="button-back-contractor">Back</Button>
                  <Button type="submit" className="flex-1 text-white" disabled={resetPasswordMutation.isPending} style={{ backgroundColor: C.primary }} data-testid="button-reset-password-contractor">{resetPasswordMutation.isPending ? 'Resetting…' : 'Reset Password'}</Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
