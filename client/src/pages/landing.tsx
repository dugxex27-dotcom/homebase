import { useState, useEffect } from "react";
import { Info, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoWhite from "@assets/my-homebase-logo-tm-white-final_1776357152257.png";
import "./landing.css";

function useLandingBodyClass() {
  useEffect(() => {
    document.body.classList.add('mhb-landing-active');
    return () => document.body.classList.remove('mhb-landing-active');
  }, []);
}

export default function Landing() {
  useLandingBodyClass();
  const { toast } = useToast();
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [claimsOpen, setClaimsOpen] = useState(false);
  const [signinOpen, setSigninOpen] = useState(false);

  useEffect(() => {
    if (!referralOpen) return;
    const close = () => setReferralOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [referralOpen]);

  useEffect(() => {
    if (!claimsOpen) return;
    const close = () => setClaimsOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [claimsOpen]);

  useEffect(() => {
    if (!signinOpen) return;
    const close = () => setSigninOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [signinOpen]);

  const handleRoleSelection = (role: 'homeowner' | 'contractor' | 'agent') => {
    window.location.href = `/signin/${role}`;
  };

  const handleDemoLogin = async (role: 'homeowner' | 'contractor' | 'agent') => {
    setDemoLoading(role);
    try {
      const endpoint =
        role === 'homeowner' ? '/api/auth/homeowner-demo-login' :
        role === 'contractor' ? '/api/auth/contractor-demo-login' :
        '/api/auth/agent-demo-login';

      await apiRequest(endpoint, 'POST', {});

      toast({ title: "Demo login successful", description: `Welcome to the ${role} demo!` });

      const redirect =
        role === 'homeowner' ? '/' :
        role === 'contractor' ? '/contractor-dashboard' :
        '/agent-dashboard';
      window.location.href = redirect;
    } catch (error: any) {
      toast({ title: "Demo login failed", description: error?.message || "Please try again.", variant: "destructive" });
      setDemoLoading(null);
    }
  };

  return (
    <div className="mhb-welcome">
      <div className="mhb-status-spacer" />

      {/* Hero */}
      <div className="mhb-hero">
        {/* Top bar: logo left, sign-in right */}
        <div className="mhb-hero-topbar">
          <img
            src={logoWhite}
            alt="MyHomeBase — Home Wellness Score and Home Record App"
            className="mhb-logo"
          />
          <div className="mhb-signin-flyout-wrap">
            <button
              className="mhb-hero-signin"
              aria-label="Sign In"
              aria-expanded={signinOpen}
              onClick={(e) => { e.stopPropagation(); setSigninOpen(v => !v); }}
            >
              <UserCircle size={26} strokeWidth={1.75} />
              <span>Sign in</span>
            </button>
            {signinOpen && (
              <div className="mhb-signin-flyout" onClick={(e) => e.stopPropagation()}>
                <div className="mhb-signin-flyout-title">Sign in as…</div>
                <a href="/signin/homeowner" className="mhb-signin-flyout-item mhb-signin-flyout-purple">
                  <span className="mhb-signin-flyout-dot" />
                  <span className="mhb-signin-flyout-label">Homeowner</span>
                  <span className="mhb-signin-flyout-arrow">›</span>
                </a>
                <a href="/signin/contractor" className="mhb-signin-flyout-item mhb-signin-flyout-blue">
                  <span className="mhb-signin-flyout-dot" />
                  <span className="mhb-signin-flyout-label">Contractor</span>
                  <span className="mhb-signin-flyout-arrow">›</span>
                </a>
                <a href="/signin/agent" className="mhb-signin-flyout-item mhb-signin-flyout-green">
                  <span className="mhb-signin-flyout-dot" />
                  <span className="mhb-signin-flyout-label">Real Estate Agent</span>
                  <span className="mhb-signin-flyout-arrow">›</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Two-column layout: copy left, stats right */}
        <div className="mhb-hero-body">
          <div className="mhb-hero-copy">
            {/* Headline */}
            <h1 className="mhb-headline">
              <span style={{ display: 'block', marginBottom: '3.5px' }}>Your home's<br />complete record.</span>
              <span className="mhb-headline-accent">Finally.</span>
            </h1>

            {/* Sub */}
            <div className="mhb-sub">
              <span className="mhb-sub-highlight">Nearly half of insurance claims get denied.</span><br />
              The reason? No maintenance records.<br />
              We fix that. For $5 a month.
            </div>

            {/* CTA link */}
            <a
              href="https://gotohomebase.com/info"
              target="_blank"
              rel="noopener noreferrer"
              className="mhb-cta-link"
            >
              Home Maintenance Info →
            </a>
          </div>

          {/* Stat chips — stacked, right column */}
          <div className="mhb-stat-stack">
            {/* Coming soon badge — sits above tiles */}
            <div className="mhb-badge">
              <div className="mhb-badge-dot" />
              <div className="mhb-badge-text">Coming soon to iOS & Android</div>
            </div>

            <div
              className="mhb-stat-chip mhb-referral-chip mhb-claims-chip"
              onMouseLeave={() => setClaimsOpen(false)}
            >
              <div className="mhb-stat-num"><strong>42</strong><span>%</span></div>
              <div className="mhb-referral-footer">
                <div className="mhb-stat-label">Claims denied</div>
                <button
                  className="mhb-referral-trigger"
                  onClick={(e) => { e.stopPropagation(); setClaimsOpen(v => !v); }}
                  onMouseEnter={() => setClaimsOpen(true)}
                  aria-label="The numbers behind 42%"
                ><Info size={11} strokeWidth={2.5} /></button>
              </div>
              {claimsOpen && (
                <div
                  className="mhb-referral-popover"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="mhb-referral-close"
                    onClick={() => setClaimsOpen(false)}
                    aria-label="Close"
                  >✕</button>
                  <div className="mhb-referral-popover-title">The numbers behind 42%</div>
                  <div className="mhb-referral-popover-body">
                    <strong>42%</strong> of claims denied or underpaid nationally<br />
                    <strong>$18,311</strong> average cost of a denied property claim<br />
                    <strong>$88,000</strong> average fire and lightning claim payout<br />
                    <strong>#1 reason</strong> for denial — no maintenance records<br />
                    <strong>$5/month</strong> — what MyHomeBase costs to protect yourself
                  </div>
                  <div className="mhb-referral-popover-footer">
                    Source: Weiss Ratings
                  </div>
                </div>
              )}
            </div>
            <div className="mhb-stat-chip">
              <div className="mhb-stat-num"><strong>$5</strong><span>/mo</span></div>
              <div className="mhb-stat-label">Full protection</div>
            </div>
            <div
              className="mhb-stat-chip mhb-referral-chip"
              onMouseLeave={() => setReferralOpen(false)}
            >
              <div className="mhb-stat-num mhb-referral-headline">
                Refer 5.<br />Pay nothing.
              </div>
              <div className="mhb-referral-footer">
                <div className="mhb-stat-label">Free for life</div>
                <button
                  className="mhb-referral-trigger"
                  onClick={(e) => { e.stopPropagation(); setReferralOpen(v => !v); }}
                  onMouseEnter={() => setReferralOpen(true)}
                  aria-label="Learn more about referrals"
                ><Info size={11} strokeWidth={2.5} /></button>
              </div>
              {referralOpen && (
                <div
                  className="mhb-referral-popover"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="mhb-referral-close"
                    onClick={() => setReferralOpen(false)}
                    aria-label="Close"
                  >✕</button>
                  <div className="mhb-referral-popover-title">How it works</div>
                  <div className="mhb-referral-popover-body">
                    The more homeowners you bring to MyHomeBase, the less your subscription costs. Bring enough and it's free — for as long as they're a paid subscriber.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="mhb-sheet">
        <div className="mhb-handle" />
        <div className="mhb-sheet-label">I am a...</div>

        <div className="mhb-user-types">
          {/* Homeowner */}
          <button
            className="mhb-utb mhb-utb-purple"
            onClick={() => handleRoleSelection('homeowner')}
            data-testid="button-homeowner-signup"
            aria-label="Sign up as a Homeowner"
          >
            <div className="mhb-utb-icon">
              <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2L2 7v9h4v-5h6v5h4V7z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="mhb-utb-text">
              <div className="mhb-utb-title">Homeowner</div>
              <div className="mhb-utb-sub">Track, protect &amp; document</div>
            </div>
            <div className="mhb-utb-arrow">›</div>
          </button>

          {/* Contractor */}
          <button
            className="mhb-utb mhb-utb-blue"
            onClick={() => handleRoleSelection('contractor')}
            data-testid="button-contractor-signup"
            aria-label="Sign up as a Contractor"
          >
            <div className="mhb-utb-icon">
              <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 13l3-6 3 3 3-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="13" cy="5" r="2" stroke="#fff" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="mhb-utb-text">
              <div className="mhb-utb-title">Contractor</div>
              <div className="mhb-utb-sub">Grow your business</div>
            </div>
            <div className="mhb-utb-arrow">›</div>
          </button>

          {/* Real estate agent */}
          <button
            className="mhb-utb mhb-utb-green"
            onClick={() => handleRoleSelection('agent')}
            data-testid="button-agent-signup"
            aria-label="Sign up as a Real Estate Agent"
          >
            <div className="mhb-utb-icon">
              <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="8" width="14" height="8" rx="1.5" stroke="#fff" strokeWidth="1.5" />
                <path d="M5 8V6a4 4 0 018 0v2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="mhb-utb-text">
              <div className="mhb-utb-title">Real Estate Agent</div>
              <div className="mhb-utb-sub">Refer and earn</div>
            </div>
            <div className="mhb-utb-arrow">›</div>
          </button>
        </div>

        {/* Google Sign-In */}
        <div className="mhb-google-section">
          <div className="mhb-or-divider">
            <div className="mhb-or-line" />
            <div className="mhb-or-text">or</div>
            <div className="mhb-or-line" />
          </div>
          <a href="/auth/google" className="mhb-google-btn">
            <svg className="mhb-google-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>
        </div>

        {/* Demo strip */}
        <div className="mhb-demo-strip">
          <button
            className="mhb-demo-link"
            onClick={() => handleDemoLogin('homeowner')}
            disabled={demoLoading === 'homeowner'}
            data-testid="button-homeowner-demo"
          >
            {demoLoading === 'homeowner' ? 'Loading…' : 'Homeowner demo'}
          </button>
          <button
            className="mhb-demo-link"
            onClick={() => handleDemoLogin('contractor')}
            disabled={demoLoading === 'contractor'}
            data-testid="button-contractor-demo"
          >
            {demoLoading === 'contractor' ? 'Loading…' : 'Contractor demo'}
          </button>
          <button
            className="mhb-demo-link"
            onClick={() => handleDemoLogin('agent')}
            disabled={demoLoading === 'agent'}
            data-testid="button-agent-demo"
          >
            {demoLoading === 'agent' ? 'Loading…' : 'Agent demo'}
          </button>
        </div>

        {/* Sign in */}
        <div className="mhb-signin-row">
          Already have an account?
          <a className="mhb-signin-link" href="/signin" data-testid="link-signin">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
