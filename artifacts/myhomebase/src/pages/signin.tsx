import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff } from "lucide-react";
import logoWhite from '@assets/my-homebase-logo-tm-final-white_1777417516350.png';

const C = {
  header: '#2C0F5B',
  bg: '#f0eef8',
  primary: '#3C258E',
  border: 'rgba(83,74,183,0.12)',
  eyebrow: '#B6A6F4',
  inactive: '#B6A6F4',
  label: '#2C0F5B',
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

type LoginFormData = z.infer<typeof loginSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const inpStyle = { background: '#F3F5F7', border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', fontSize: 13, fontWeight: 500, color: C.label, height: 'auto', boxShadow: 'none', outline: 'none' } as React.CSSProperties;
const labelStyle = { fontSize: 11, fontWeight: 700, color: C.label, letterSpacing: '0.03em', marginBottom: 4, display: 'block' } as React.CSSProperties;

const GoogleSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function SignIn() {
  const [showLoginPassword, setShowLoginPassword] = useState(false);
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

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" }, mode: "onBlur" });
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const resetPasswordForm = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { email: "", resetCode: "", newPassword: "", confirmPassword: "" } });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Invalid credentials");
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: "Welcome back!" });
      const role = data.user?.role || 'homeowner';
      if (role === 'contractor') setLocation('/contractor-dashboard');
      else if (role === 'agent') setLocation('/agent-dashboard');
      else setLocation('/');
    },
    onError: (e: Error) => toast({ title: "Login failed", description: e.message || "Invalid credentials. Please try again.", variant: "destructive" }),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Request failed");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Reset code sent", description: "Check your inbox for the 6-digit code." });
      setResetStep('reset');
      resetPasswordForm.setValue('email', forgotPasswordForm.getValues('email'));
    },
    onError: (e: Error) => toast({ title: "Request failed", description: e.message, variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Reset failed");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Password reset successful", description: "You can now sign in with your new password." });
      setShowForgotPassword(false);
      setResetStep('request');
      forgotPasswordForm.reset();
      resetPasswordForm.reset();
    },
    onError: (e: Error) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  const handleDemoLogin = async (role: 'homeowner' | 'contractor') => {
    try {
      try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); queryClient.clear(); } catch {}
      const endpoint = role === 'homeowner' ? '/api/auth/homeowner-demo-login' : '/api/auth/contractor-demo-login';
      const response = await apiRequest(endpoint, 'POST', {});
      if (response.ok) {
        toast({ title: "Demo login successful" });
        window.location.href = role === 'contractor' ? '/contractor-dashboard' : '/';
      }
    } catch (error: any) {
      toast({ title: "Demo login failed", description: error?.message, variant: "destructive" });
    }
  };

  const primaryBtn = (pending: boolean) => ({
    width: '100%', background: C.primary, borderRadius: 13, padding: '14px 0', fontSize: 15, fontWeight: 700, color: '#fff',
    border: 'none', cursor: pending ? 'default' : 'pointer', marginBottom: 14, opacity: pending ? 0.7 : 1, fontFamily: 'inherit',
  } as React.CSSProperties);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg }}>

      {/* ── Header ── */}
      <div style={{ background: C.header, padding: '40px 24px 44px', textAlign: 'center', flexShrink: 0, position: 'relative' }}>
        <div style={{ marginBottom: 18, position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center' }}>
          <a href="/" style={{ display: 'inline-block' }}>
            <img src={logoWhite} alt="MyHomeBase™ — go to home" style={{ width: 200, height: 'auto', display: 'block' }} />
          </a>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.15, position: 'relative', zIndex: 2, marginBottom: 8 }}>Welcome back</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', position: 'relative', zIndex: 2, lineHeight: 1.5 }}>Sign in to your account</div>
        <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 28, borderRadius: '28px 28px 0 0', background: C.bg, zIndex: 1 }} />
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '28px 20px 24px', display: 'flex', flexDirection: 'column', maxWidth: 480, width: '100%', margin: '0 auto' }}>

          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} data-testid="form-login">
              <FormField control={loginForm.control} name="email" render={({ field }) => (
                <FormItem style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Email address</label>
                  <FormControl><Input type="email" placeholder="you@email.com" {...field} data-testid="input-email" style={inpStyle} className="focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={loginForm.control} name="password" render={({ field }) => (
                <FormItem style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Password</label>
                  <FormControl>
                    <div style={{ position: 'relative' }}>
                      <Input type={showLoginPassword ? 'text' : 'password'} placeholder="••••••••" {...field} data-testid="input-password" style={{ ...inpStyle, paddingRight: 44 }} className="focus-visible:ring-0 focus-visible:ring-offset-0" />
                      <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} data-testid="button-toggle-login-password" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.inactive, display: 'flex', padding: 0 }}>
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div style={{ textAlign: 'right', marginBottom: 14 }}>
                <button type="button" onClick={() => setShowForgotPassword(true)} data-testid="link-forgot-password" style={{ fontSize: 11, fontWeight: 700, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={loginMutation.isPending} data-testid="button-login" style={primaryBtn(loginMutation.isPending)}>
                {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.inactive }}>or</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <button type="button" data-testid="button-google-signin" onClick={() => { window.location.href = '/auth/google'; }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#1a1a1a', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', fontFamily: 'inherit' }}>
                <GoogleSVG />Continue with Google
              </button>
            </form>
          </Form>
        </div>

        {/* Bottom links */}
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: C.inactive, marginBottom: 8 }}>
          <span>Don't have an account? </span>
          <a href="/onboarding" data-testid="link-create-account" style={{ color: C.primary, fontWeight: 700, textDecoration: 'none' }}>Register free</a>
        </div>
        <div style={{ textAlign: 'center', paddingBottom: 24, display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button type="button" onClick={() => handleDemoLogin('homeowner')} data-testid="button-demo-homeowner" style={{ fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.25)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
            Homeowner demo
          </button>
          <button type="button" onClick={() => handleDemoLogin('contractor')} data-testid="button-demo-contractor" style={{ fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.25)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
            Contractor demo
          </button>
        </div>
      </div>

      {/* ── Forgot Password Dialog ── */}
      <Dialog open={showForgotPassword} onOpenChange={(open) => { setShowForgotPassword(open); if (!open) { setResetStep('request'); forgotPasswordForm.reset(); resetPasswordForm.reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{resetStep === 'request' ? 'Reset Your Password' : 'Enter Reset Code'}</DialogTitle>
            <DialogDescription>
              {resetStep === 'request' ? "Enter your email and we'll send you a reset code." : 'Enter the 6-digit code sent to your email and choose a new password.'}
            </DialogDescription>
          </DialogHeader>
          {resetStep === 'request' ? (
            <Form {...forgotPasswordForm}>
              <form onSubmit={forgotPasswordForm.handleSubmit((d) => forgotPasswordMutation.mutate(d))} className="space-y-4">
                <FormField control={forgotPasswordForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <label style={labelStyle}>Email address</label>
                    <FormControl><Input type="email" placeholder="Enter your email" {...field} data-testid="input-forgot-email" style={inpStyle} className="focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setShowForgotPassword(false)} data-testid="button-cancel-forgot" style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)', cursor: 'pointer', fontFamily: 'inherit', color: C.label }}>Cancel</button>
                  <button type="submit" disabled={forgotPasswordMutation.isPending} data-testid="button-send-reset-code" style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: C.primary, border: 'none', cursor: forgotPasswordMutation.isPending ? 'default' : 'pointer', fontFamily: 'inherit', color: '#fff', opacity: forgotPasswordMutation.isPending ? 0.7 : 1 }}>
                    {forgotPasswordMutation.isPending ? 'Sending…' : 'Send Reset Code'}
                  </button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit((d) => resetPasswordMutation.mutate(d))} className="space-y-4">
                <FormField control={resetPasswordForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <label style={labelStyle}>Email address</label>
                    <FormControl><Input type="email" {...field} disabled data-testid="input-reset-email" style={{ ...inpStyle, opacity: 0.6 }} className="focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={resetPasswordForm.control} name="resetCode" render={({ field }) => (
                  <FormItem>
                    <label style={labelStyle}>Reset code</label>
                    <FormControl><Input placeholder="Enter 6-digit code" {...field} maxLength={6} data-testid="input-reset-code" style={inpStyle} className="focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={resetPasswordForm.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <label style={labelStyle}>New password</label>
                    <FormControl>
                      <div style={{ position: 'relative' }}>
                        <Input type={showNewPassword ? 'text' : 'password'} placeholder="Min 6 characters" {...field} data-testid="input-new-password" style={{ ...inpStyle, paddingRight: 44 }} className="focus-visible:ring-0 focus-visible:ring-offset-0" />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} data-testid="button-toggle-new-password" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.inactive, display: 'flex', padding: 0 }}>
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={resetPasswordForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <label style={labelStyle}>Confirm password</label>
                    <FormControl>
                      <div style={{ position: 'relative' }}>
                        <Input type={showConfirmNewPassword ? 'text' : 'password'} placeholder="Confirm password" {...field} data-testid="input-confirm-new-password" style={{ ...inpStyle, paddingRight: 44 }} className="focus-visible:ring-0 focus-visible:ring-offset-0" />
                        <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} data-testid="button-toggle-confirm-new-password" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.inactive, display: 'flex', padding: 0 }}>
                          {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => { setResetStep('request'); resetPasswordForm.reset(); }} data-testid="button-back-to-request" style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)', cursor: 'pointer', fontFamily: 'inherit', color: C.label }}>Back</button>
                  <button type="submit" disabled={resetPasswordMutation.isPending} data-testid="button-reset-password" style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: C.primary, border: 'none', cursor: resetPasswordMutation.isPending ? 'default' : 'pointer', fontFamily: 'inherit', color: '#fff', opacity: resetPasswordMutation.isPending ? 0.7 : 1 }}>
                    {resetPasswordMutation.isPending ? 'Resetting…' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
