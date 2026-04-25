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
  const [quizOpen, setQuizOpen] = useState(() => !sessionStorage.getItem('mhb_quiz_dismissed'));
  const [referralOpen, setReferralOpen] = useState(false);
  const [claimsOpen, setClaimsOpen] = useState(false);
  const [signinOpen, setSigninOpen] = useState(false);
  const [referralTab, setReferralTab] = useState<'hw' | 'ct'>('hw');
  const [hwSlider, setHwSlider] = useState(0);
  const [ctSlider, setCtSlider] = useState(0);
  const [plansOpen, setPlansOpen] = useState(false);
  const [selectedPlanCard, setSelectedPlanCard] = useState<'base' | 'premium' | 'plus'>('premium');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!quizOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeQuiz(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [quizOpen]);

  const closeQuiz = () => {
    sessionStorage.setItem('mhb_quiz_dismissed', '1');
    setQuizOpen(false);
  };

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

  useEffect(() => {
    if (!plansOpen) return;
    const close = () => setPlansOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [plansOpen]);

  const handleRoleSelection = (role: 'homeowner' | 'contractor' | 'agent', plan?: 'base' | 'premium' | 'plus') => {
    const url = plan ? `/signin/${role}?plan=${plan}` : `/signin/${role}`;
    window.location.href = url;
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

      {/* Quiz full-page modal */}
      {quizOpen && (
        <div className="mhb-quiz-modal" role="dialog" aria-modal="true" aria-label="Home Health Score Quiz">
          <button className="mhb-quiz-modal-close" onClick={closeQuiz} aria-label="Close quiz">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <iframe
            className="mhb-quiz-modal-frame"
            src="/quiz.html"
            title="Home Health Score Quiz"
          />
        </div>
      )}

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
              href="/quiz/"
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
            >
              <div className="mhb-stat-num"><strong>42</strong><span>%</span></div>
              <div className="mhb-referral-footer">
                <div className="mhb-stat-label">Claims denied</div>
                <button
                  className="mhb-referral-trigger"
                  onClick={(e) => { e.stopPropagation(); setClaimsOpen(v => !v); }}
                  aria-label="The numbers behind 42%"
                ><Info size={11} strokeWidth={2.5} /></button>
              </div>
              {claimsOpen && (
                <div
                  className="mhb-referral-popover"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="mhb-referral-close" onClick={() => setClaimsOpen(false)} aria-label="Close">✕</button>
                  <div className="msc-card-wrap"><div className="msc-inner">
                    <div className="msc-bar" />
                    <div className="msc-header">
                      <p className="msc-eyebrow">Insurance Reality Check</p>
                      <h2 className="msc-heading">The numbers behind 42%</h2>
                      <p className="msc-subtitle">Most homeowners don't know these numbers until it's too late.</p>
                      <div className="msc-divider" />
                    </div>
                    <div className="msc-cards">
                      <div className="msc-card msc-card-purple" style={{ animationDelay: '0.05s' }}>
                        <div className="msc-icon msc-icon-purple"><span className="msc-icon-stat">42%</span></div>
                        <div><p className="msc-card-title">of claims denied or underpaid nationally</p><p className="msc-card-sub">Nearly half of all property claims</p></div>
                      </div>
                      <div className="msc-card msc-card-dark" style={{ animationDelay: '0.15s' }}>
                        <div className="msc-icon msc-icon-dark"><span className="msc-icon-avg">avg</span><span className="msc-icon-stat">$18K</span></div>
                        <div><p className="msc-card-title">average cost of a denied property claim</p><p className="msc-card-sub">$18,311 left on the table</p></div>
                      </div>
                      <div className="msc-card msc-card-dark" style={{ animationDelay: '0.25s' }}>
                        <div className="msc-icon msc-icon-dark"><span className="msc-icon-avg">avg</span><span className="msc-icon-stat">$88K</span></div>
                        <div><p className="msc-card-title">average fire and lightning claim payout</p><p className="msc-card-sub">The stakes are real</p></div>
                      </div>
                      <div className="msc-card msc-card-purple" style={{ animationDelay: '0.35s' }}>
                        <div className="msc-icon msc-icon-purple"><span className="msc-icon-stat">#1</span></div>
                        <div><p className="msc-card-title">reason for denial — no maintenance records</p><p className="msc-card-sub">The most preventable reason</p></div>
                      </div>
                    </div>
                    <div style={{ margin: '14px 20px 0' }}><div className="msc-divider" /></div>
                    <div className="msc-cta-wrap" style={{ animationDelay: '0.45s' }}>
                      <div>
                        <p className="msc-cta-price">$5/month</p>
                        <p className="msc-cta-desc">What MyHomeBase costs<br />to protect yourself</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p className="msc-cta-vs">vs. denied claim</p>
                        <p className="msc-cta-amount">$18,311</p>
                      </div>
                    </div>
                    <div className="msc-source-row">
                      <div className="msc-source-line" />
                      <p className="msc-source-text">Source: Weiss Ratings</p>
                      <div className="msc-source-line" />
                    </div>
                  </div></div>
                </div>
              )}
            </div>
            <div
              className="mhb-stat-chip mhb-referral-chip"
            >
              <div className="mhb-stat-num"><strong>$5</strong><span>/mo</span></div>
              <div className="mhb-referral-footer">
                <div className="mhb-stat-label">Full protection</div>
                <button
                  className="mhb-referral-trigger"
                  onClick={(e) => { e.stopPropagation(); setPlansOpen(v => !v); }}
                  aria-label="View pricing plans"
                ><Info size={11} strokeWidth={2.5} /></button>
              </div>

              {plansOpen && (
                <div className="mhb-referral-popover mpr-popover" onClick={(e) => e.stopPropagation()}>
                  <button className="mhb-referral-close" onClick={() => setPlansOpen(false)} aria-label="Close">✕</button>

                  {/* Card shell */}
                  <div className="mpr-card-wrap">
                    <div className="mpr-card">

                      {/* Gradient bar */}
                      <div className="mpr-bar" />

                      {/* Header */}
                      <div className="mpr-header">
                        <p className="mpr-eyebrow">Subscription</p>
                        <h2 className="mpr-heading">Choose Your Plan</h2>
                        <p className="mpr-body">Select the plan that fits your property management needs. Upgrade or downgrade anytime.</p>
                        <div className="mpr-divider" />
                      </div>

                      {/* Plan cards */}
                      <div className="mpr-plans">

                        {/* Base */}
                        <div
                          className={`mpr-plan-card ${selectedPlanCard === 'base' ? 'mpr-plan-selected' : ''}`}
                          onClick={() => setSelectedPlanCard('base')}
                        >
                          <div className="mpr-plan-header">
                            <div>
                              <p className="mpr-plan-name">Base Plan</p>
                              <p className="mpr-plan-sub">Perfect for getting started</p>
                            </div>
                            <div className="mpr-plan-price-wrap">
                              <p className="mpr-plan-price">$5</p>
                              <p className="mpr-plan-per">/month</p>
                            </div>
                          </div>
                          <div className="mpr-plan-features">
                            {['Up to 2 properties','Full maintenance scheduling','Contractor directory access','Service record tracking','Home Wellness Score™','DIY savings tracker','Email support'].map(f => (
                              <div key={f} className="mpr-feature-row"><span className="mpr-check">✓</span>{f}</div>
                            ))}
                          </div>
                          <button
                            className={`mpr-plan-btn ${selectedPlanCard === 'base' ? 'mpr-plan-btn-selected' : 'mpr-plan-btn-ghost'}`}
                            onClick={(e) => { e.stopPropagation(); handleRoleSelection('homeowner', 'base'); }}
                          >Select Base Plan</button>
                        </div>

                        {/* Premium — featured */}
                        <div
                          className={`mpr-plan-card mpr-plan-featured ${selectedPlanCard === 'premium' ? 'mpr-plan-selected' : ''}`}
                          onClick={() => setSelectedPlanCard('premium')}
                        >
                          <div className="mpr-popular-badge">Most Popular</div>
                          <div className="mpr-plan-header mpr-plan-header-featured">
                            <div>
                              <p className="mpr-plan-name">Premium Plan</p>
                              <p className="mpr-plan-sub">For active property managers</p>
                            </div>
                            <div className="mpr-plan-price-wrap">
                              <p className="mpr-plan-price">$20</p>
                              <p className="mpr-plan-per">/month</p>
                            </div>
                          </div>
                          <div className="mpr-plan-features mpr-plan-features-featured">
                            <div className="mpr-feature-row"><span className="mpr-check">✓</span>3–6 properties</div>
                            <div className="mpr-feature-row"><span className="mpr-plus">+</span>Everything in Base</div>
                          </div>
                          <button
                            className="mpr-plan-btn mpr-plan-btn-primary"
                            onClick={(e) => { e.stopPropagation(); handleRoleSelection('homeowner', 'premium'); }}
                          >Select Premium Plan</button>
                        </div>

                        {/* Premium Plus */}
                        <div
                          className={`mpr-plan-card ${selectedPlanCard === 'plus' ? 'mpr-plan-selected' : ''}`}
                          onClick={() => setSelectedPlanCard('plus')}
                        >
                          <div className="mpr-plan-header">
                            <div>
                              <p className="mpr-plan-name">Premium Plus</p>
                              <p className="mpr-plan-sub">For serious property portfolios</p>
                            </div>
                            <div className="mpr-plan-price-wrap">
                              <p className="mpr-plan-price">$40</p>
                              <p className="mpr-plan-per">/month</p>
                            </div>
                          </div>
                          <div className="mpr-plan-features">
                            <div className="mpr-feature-row"><span className="mpr-check">✓</span>7+ properties</div>
                            <div className="mpr-feature-row"><span className="mpr-plus">+</span>Everything in Premium</div>
                          </div>
                          <button
                            className={`mpr-plan-btn ${selectedPlanCard === 'plus' ? 'mpr-plan-btn-selected' : 'mpr-plan-btn-ghost'}`}
                            onClick={(e) => { e.stopPropagation(); handleRoleSelection('homeowner', 'plus'); }}
                          >Select Premium Plus</button>
                        </div>
                      </div>

                      {/* 14-day trial note */}
                      <div className="mpr-free-banner">
                        <p className="mpr-free-title">All Plans Include a 14-Day Free Trial</p>
                        <p className="mpr-free-sub">Try MyHomeBase™ risk-free. Cancel anytime during your trial with no charges.</p>
                      </div>

                      {/* Manage / Billing */}
                      <div className="mpr-manage-row">
                        <button className="mpr-manage-btn mpr-manage-btn-left">Manage Subscription</button>
                        <button className="mpr-manage-btn">View Billing History</button>
                      </div>

                      {/* FAQ */}
                      <div className="mpr-faq">
                        <p className="mpr-faq-label">Frequently Asked Questions</p>
                        <div className="mpr-faq-list">
                          {[
                            { q: 'Can I change my plan at any time?', a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any charges.' },
                            { q: 'What happens if I exceed my property limit?', a: 'You\'ll be prompted to upgrade to the next tier when you try to add a property beyond your current plan\'s limit. Your existing properties remain accessible.' },
                            { q: 'Do you offer refunds?', a: 'Every new account includes a 14-day free trial. Your card is saved securely but not charged during the trial. If you cancel before the trial ends, you won\'t be charged at all. After the trial, subscriptions are billed monthly with no long-term contracts.' },
                          ].map((item, i) => (
                            <div
                              key={i}
                              className={`mpr-faq-item ${i < 2 ? 'mpr-faq-item-border' : ''}`}
                              onClick={(e) => { e.stopPropagation(); setOpenFaqIdx(openFaqIdx === i ? null : i); }}
                            >
                              <div className="mpr-faq-q-row">
                                <p className="mpr-faq-q">{item.q}</p>
                                <span className="mpr-faq-chevron" style={{ transform: openFaqIdx === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                              </div>
                              {openFaqIdx === i && (
                                <p className="mpr-faq-a">{item.a}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </div>
            <div
              className="mhb-stat-chip mhb-referral-chip"
            >
              <div className="mhb-stat-num mhb-referral-headline">
                Refer 5.<br />Pay nothing.
              </div>
              <div className="mhb-referral-footer">
                <div className="mhb-stat-label">Free for life</div>
                <button
                  className="mhb-referral-trigger"
                  onClick={(e) => { e.stopPropagation(); setReferralOpen(v => !v); }}
                  aria-label="Learn more about referrals"
                ><Info size={11} strokeWidth={2.5} /></button>
              </div>
              {referralOpen && (
                <div className="mhb-referral-popover mrr-popover" onClick={(e) => e.stopPropagation()}>
                  <button className="mhb-referral-close" onClick={() => setReferralOpen(false)} aria-label="Close">✕</button>

                  {/* Tabs */}
                  <div className="mrr-tabs">
                    <button
                      className={`mrr-tab ${referralTab === 'hw' ? 'mrr-tab-active-hw' : 'mrr-tab-inactive'}`}
                      onClick={() => setReferralTab('hw')}
                    >Homeowner — $5/mo</button>
                    <button
                      className={`mrr-tab ${referralTab === 'ct' ? 'mrr-tab-active-ct' : 'mrr-tab-inactive'}`}
                      onClick={() => setReferralTab('ct')}
                    >Contractor — $20/mo</button>
                  </div>

                  {/* Card wrapper */}
                  <div className="mrr-card-wrap">

                    {/* ── HOMEOWNER ── */}
                    {referralTab === 'hw' && (
                      <div className="mrr-card mrr-card-hw">
                        <div className="mrr-bar mrr-bar-hw" />
                        <div className="mrr-header">
                          <p className="mrr-eyebrow mrr-eyebrow-hw">How it works</p>
                          <h2 className="mrr-heading">Refer a neighbor.<br />Pay less. Refer five. Pay nothing.</h2>
                          <p className="mrr-body-text">Every homeowner you refer knocks $1 off your monthly plan. Refer 5 and your subscription is completely free — for as long as they stay subscribed.</p>
                          <div className="mrr-divider mrr-divider-hw" />
                        </div>
                        <div className="mrr-steps-section">
                          <p className="mrr-steps-label mrr-steps-label-hw">Your monthly cost</p>
                          <div className="mrr-steps">
                            {[0,1,2,3,4,5].map(i => {
                              const cost = 5 - i;
                              const free = cost === 0;
                              const pct = Math.round((cost / 5) * 100);
                              return (
                                <div key={i} className="mrr-step-row" style={{ opacity: hwSlider >= i ? 1 : 0.3 }}>
                                  <span className="mrr-step-ref">{i} ref{i !== 1 ? 's' : ''}</span>
                                  <div className="mrr-step-bar-wrap mrr-step-bar-wrap-hw">
                                    <div className="mrr-step-bar" style={{ width: `${pct}%`, background: free ? '#09694A' : '#3C258E' }} />
                                  </div>
                                  <span className="mrr-step-cost" style={{ color: free ? '#09694A' : '#3C258E' }}>{free ? 'Free' : `$${cost}`}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="mrr-slider-box mrr-slider-box-hw">
                          <div className="mrr-slider-header">
                            <span className="mrr-slider-label mrr-slider-label-hw">Homeowners referred</span>
                            <span className="mrr-slider-count mrr-slider-count-hw">{hwSlider}</span>
                          </div>
                          <input type="range" min="0" max="5" value={hwSlider} step="1" className="mrr-range mrr-range-hw" onChange={e => setHwSlider(Number(e.target.value))} />
                          <div className="mrr-cost-row">
                            <span className="mrr-cost-label mrr-cost-label-hw">Your cost</span>
                            <span className="mrr-cost-value" style={{ color: hwSlider === 5 ? '#09694A' : '#3C3489' }}>
                              {hwSlider === 5 ? 'Free' : `$${5 - hwSlider}`}
                            </span>
                          </div>
                        </div>
                        <div className="mrr-cta">
                          <button className="mrr-cta-btn mrr-cta-btn-hw">Start referring homeowners →</button>
                        </div>
                      </div>
                    )}

                    {/* ── CONTRACTOR ── */}
                    {referralTab === 'ct' && (
                      <div className="mrr-card mrr-card-ct">
                        <div className="mrr-bar mrr-bar-ct" />
                        <div className="mrr-header">
                          <p className="mrr-eyebrow mrr-eyebrow-ct">How it works</p>
                          <h2 className="mrr-heading">Bring homeowners.<br />Pay less. Or nothing.</h2>
                          <p className="mrr-body-text">Every homeowner you bring to MyHomeBase takes $1 off your monthly plan. Refer 20 and your subscription is completely free — for as long as they stay subscribed.</p>
                          <div className="mrr-divider mrr-divider-ct" />
                        </div>
                        <div className="mrr-steps-section">
                          <p className="mrr-steps-label mrr-steps-label-ct">Your monthly cost</p>
                          <div className="mrr-steps">
                            {[0,5,10,15,20].map(i => {
                              const cost = 20 - i;
                              const free = cost === 0;
                              const pct = Math.round((cost / 20) * 100);
                              return (
                                <div key={i} className="mrr-step-row" style={{ opacity: ctSlider >= i ? 1 : 0.3 }}>
                                  <span className="mrr-step-ref">{i} ref{i !== 1 ? 's' : ''}</span>
                                  <div className="mrr-step-bar-wrap mrr-step-bar-wrap-ct">
                                    <div className="mrr-step-bar" style={{ width: `${pct}%`, background: free ? '#09694A' : '#1560A2' }} />
                                  </div>
                                  <span className="mrr-step-cost" style={{ color: free ? '#09694A' : '#1560A2' }}>{free ? 'Free' : `$${cost}`}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="mrr-slider-box mrr-slider-box-ct">
                          <div className="mrr-slider-header">
                            <span className="mrr-slider-label mrr-slider-label-ct">Homeowners referred</span>
                            <span className="mrr-slider-count mrr-slider-count-ct">{ctSlider}</span>
                          </div>
                          <input type="range" min="0" max="20" value={ctSlider} step="1" className="mrr-range mrr-range-ct" onChange={e => setCtSlider(Number(e.target.value))} />
                          <div className="mrr-cost-row">
                            <span className="mrr-cost-label mrr-cost-label-ct">Your cost</span>
                            <span className="mrr-cost-value" style={{ color: ctSlider === 20 ? '#09694A' : '#0C447C' }}>
                              {ctSlider === 20 ? 'Free' : `$${20 - ctSlider}`}
                            </span>
                          </div>
                        </div>
                        <div className="mrr-cta">
                          <button className="mrr-cta-btn mrr-cta-btn-ct">Start referring homeowners →</button>
                        </div>
                      </div>
                    )}

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
