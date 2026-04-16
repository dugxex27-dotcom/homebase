import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
        <div className="mhb-logo-row">
          <div className="mhb-logo-mark">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2L2 8v10h5v-6h6v6h5V8z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="mhb-logo-text">MyHomeBase™</div>
        </div>

        {/* Coming soon badge */}
        <div className="mhb-badge">
          <div className="mhb-badge-dot" />
          <div className="mhb-badge-text">Coming soon to iOS & Android</div>
        </div>

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
              Nearly half of insurance claims get denied.<br />
              The reason? No maintenance records.<br />
              We fix that. For $5 a month.
            </div>
          </div>

          {/* Stat chips — stacked, right column */}
          <div className="mhb-stat-stack">
            <div className="mhb-stat-chip">
              <div className="mhb-stat-num">42<span>%</span></div>
              <div className="mhb-stat-label">Claims denied</div>
            </div>
            <div className="mhb-stat-chip">
              <div className="mhb-stat-num">$5<span>/mo</span></div>
              <div className="mhb-stat-label">Full protection</div>
            </div>
            <div className="mhb-stat-chip">
              <div className="mhb-stat-num">1<span>k+</span></div>
              <div className="mhb-stat-label">Homes tracked</div>
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
