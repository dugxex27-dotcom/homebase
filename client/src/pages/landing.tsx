import { useState, useEffect } from "react";
import { Info } from "lucide-react";
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
        {/* Logo */}
        <img
          src={logoWhite}
          alt="MyHomeBase"
          className="mhb-logo"
        />

        {/* Two-column layout: copy left, stats right */}
        <div className="mhb-hero-body">
          <div className="mhb-hero-copy">
            {/* Headline */}
            <div className="mhb-headline">
              Your home's<br />
              <span className="mhb-headline-accent">complete record.</span><br />
              Finally.
            </div>

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
              className="mhb-stat-chip mhb-referral-chip"
              onMouseLeave={() => setClaimsOpen(false)}
            >
              <div className="mhb-stat-num">42<span>%</span></div>
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
              <div className="mhb-stat-num">$5<span>/mo</span></div>
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
                    Earn <strong>$1/month</strong> for every user you refer who becomes a paid subscriber.<br /><br />
                    Refer <strong>5 homeowners</strong> or <strong>20 contractors</strong> and your MyHomeBase subscription is <strong>free for life.</strong>
                  </div>
                  <div className="mhb-referral-popover-footer">
                    Your referral link is in your profile after signup.
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
