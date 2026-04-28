import { useState, useEffect, useRef } from "react";
import { Info, UserCircle, X } from "lucide-react";
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

  // ── Existing modal/UI state ──
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [claimsOpen, setClaimsOpen] = useState(false);
  const [deniedOpen, setDeniedOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [signinOpen, setSigninOpen] = useState(false);
  const [referralTab, setReferralTab] = useState<'hw' | 'ct'>('hw');
  const [hwSlider, setHwSlider] = useState(0);
  const [ctSlider, setCtSlider] = useState(0);
  const [selectedPlanCard, setSelectedPlanCard] = useState<'base' | 'premium' | 'plus'>('premium');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  // ── Sign-in flyout ──
  const signinFlyoutRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!signinOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (signinFlyoutRef.current && !signinFlyoutRef.current.contains(e.target as Node)) {
        setSigninOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSigninOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [signinOpen]);

  // ── New state ──
  const [selectedRole, setSelectedRole] = useState<'homeowner' | 'contractor' | 'agent' | null>(null);
  const [homeownerModalOpen, setHomeownerModalOpen] = useState(false);
  const [contractorModalOpen, setContractorModalOpen] = useState(false);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  // ── Quiz escape key ──
  useEffect(() => {
    if (!quizOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setQuizOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [quizOpen]);

  // ── Quiz postMessage ──
  useEffect(() => {
    function handleQuizMessage(event: MessageEvent) {
      if (!event.data || event.data.type !== 'mhb_quiz_result') return;
      const result = { score: event.data.score, tier: event.data.tier, completedAt: event.data.completedAt };
      localStorage.setItem('mhb_quiz_result', JSON.stringify(result));
      fetch('/api/quiz-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(result),
      }).catch(() => {});
    }
    window.addEventListener('message', handleQuizMessage);
    return () => window.removeEventListener('message', handleQuizMessage);
  }, []);

  // ── Lock body scroll when any overlay modal is open ──
  useEffect(() => {
    const anyOpen = quizOpen || claimsOpen || deniedOpen || costOpen || plansOpen || referralOpen ||
      homeownerModalOpen || contractorModalOpen || agentModalOpen || faqOpen;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [quizOpen, claimsOpen, deniedOpen, costOpen, plansOpen, referralOpen, homeownerModalOpen, contractorModalOpen, agentModalOpen, faqOpen]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRoleSelection = (role: 'homeowner' | 'contractor' | 'agent', plan?: string) => {
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
    <div className="mhb-landing">

      {/* ═══ QUIZ FULL-SCREEN MODAL ═══ */}
      {quizOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" aria-label="Home Health Score Quiz" onClick={() => setQuizOpen(false)}>
          <div className="mhb-quiz-modal" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setQuizOpen(false)} aria-label="Close quiz">
              <X size={20} strokeWidth={2.5} />
            </button>
            <iframe
              className="mhb-quiz-frame"
              src="/quiz/quiz.html"
              title="Home Health Score Quiz"
            />
          </div>
        </div>
      )}

      {/* ═══ 42% DENIED MODAL ═══ */}
      {deniedOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setDeniedOpen(false)}>
          <div className="mhb-modal-card" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setDeniedOpen(false)} aria-label="Close">
              <X size={20} strokeWidth={2.5} />
            </button>
            <div className="mdn-wrap">
              <div className="mdn-bar" />
              <div className="mdn-header">
                <p className="mdn-eyebrow">Why Claims Get Denied</p>
                <h2 className="mdn-heading">42% of claims are denied or underpaid.</h2>
                <p className="mdn-subtitle">That's not a rounding error — it's nearly every other homeowner who files a claim.</p>
                <div className="mdn-divider" />
              </div>

              <div className="mdn-reason-list">
                <div className="mdn-reason mdn-reason-top">
                  <div className="mdn-reason-badge">#1</div>
                  <div className="mdn-reason-body">
                    <p className="mdn-reason-title">No maintenance records</p>
                    <p className="mdn-reason-desc">Insurers require proof that the affected system was properly maintained. Without service history, they assume neglect — and deny.</p>
                  </div>
                </div>
                <div className="mdn-reason">
                  <div className="mdn-reason-badge mdn-reason-badge-gray">#2</div>
                  <div className="mdn-reason-body">
                    <p className="mdn-reason-title">Late or incomplete documentation</p>
                    <p className="mdn-reason-desc">Receipts, contractor invoices, and inspection reports submitted after the fact are often rejected. Timing and completeness matter.</p>
                  </div>
                </div>
                <div className="mdn-reason">
                  <div className="mdn-reason-badge mdn-reason-badge-gray">#3</div>
                  <div className="mdn-reason-body">
                    <p className="mdn-reason-title">Pre-existing condition ruling</p>
                    <p className="mdn-reason-desc">Without a dated maintenance log, adjusters can claim the damage was pre-existing — shifting the burden of proof to you.</p>
                  </div>
                </div>
                <div className="mdn-reason">
                  <div className="mdn-reason-badge mdn-reason-badge-gray">#4</div>
                  <div className="mdn-reason-body">
                    <p className="mdn-reason-title">Policy exclusions triggered by neglect</p>
                    <p className="mdn-reason-desc">Most homeowner policies explicitly exclude damage resulting from deferred maintenance. One missed service call can void coverage.</p>
                  </div>
                </div>
              </div>

              <div className="mdn-divider" style={{ margin: '0 20px' }} />

              <div className="mdn-fix-row">
                <div className="mdn-fix-icon">✓</div>
                <div>
                  <p className="mdn-fix-title">MyHomeBase solves all four.</p>
                  <p className="mdn-fix-desc">Every service record, inspection, and contractor invoice — logged, dated, and stored permanently. When an adjuster asks, you have the answer.</p>
                </div>
              </div>

              <div className="mdn-source-row">
                <div className="mdn-source-line" />
                <p className="mdn-source-text">Source: Weiss Ratings · IRC Property Claims Study</p>
                <div className="mdn-source-line" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ $18K COST MODAL ═══ */}
      {costOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setCostOpen(false)}>
          <div className="mhb-modal-card" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setCostOpen(false)} aria-label="Close">
              <X size={20} strokeWidth={2.5} />
            </button>
            <div className="mco-wrap">
              <div className="mco-bar" />
              <div className="mco-header">
                <p className="mco-eyebrow">The Real Cost of a Denied Claim</p>
                <h2 className="mco-heading">$18,311 — left on the table.</h2>
                <p className="mco-subtitle">That's the average amount homeowners lose when a property claim is denied or underpaid. Here's what's actually at stake.</p>
                <div className="mco-divider" />
              </div>

              <div className="mco-breakdown">
                <p className="mco-breakdown-label">Common claim categories & average payouts</p>
                {[
                  { label: 'Fire & lightning damage', amount: '$88,000', pct: 100, color: '#dc2626' },
                  { label: 'Wind & hail damage',      amount: '$13,000', pct: 15,  color: '#d97706' },
                  { label: 'Water damage & freezing', amount: '$12,500', pct: 14,  color: '#2563eb' },
                  { label: 'Theft & burglary',        amount: '$4,400',  pct: 5,   color: '#7c3aed' },
                  { label: 'Liability claims',        amount: '$30,000', pct: 34,  color: '#059669' },
                ].map(row => (
                  <div key={row.label} className="mco-bar-row">
                    <div className="mco-bar-meta">
                      <span className="mco-bar-name">{row.label}</span>
                      <span className="mco-bar-amt">{row.amount}</span>
                    </div>
                    <div className="mco-bar-track">
                      <div className="mco-bar-fill" style={{ width: `${row.pct}%`, background: row.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mco-footer-note">
                <span className="mco-footer-icon">💡</span>
                <p className="mco-footer-text">MyHomeBase costs $5/month. The average denied claim costs $18,311. Documentation is the difference.</p>
              </div>

              <div className="mco-source-row">
                <div className="mco-source-line" />
                <p className="mco-source-text">Source: III Property Claims Study · NAIC Data</p>
                <div className="mco-source-line" />
              </div>
            </div>
          </div>
        </div>
      )}

      {claimsOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setClaimsOpen(false)}>
          <div className="mhb-modal-card" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setClaimsOpen(false)} aria-label="Close">
              <X size={20} strokeWidth={2.5} />
            </button>
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
        </div>
      )}

      {/* ═══ PLANS MODAL ═══ */}
      {plansOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setPlansOpen(false)}>
          <div className="mhb-modal-card" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setPlansOpen(false)} aria-label="Close">
              <X size={20} strokeWidth={2.5} />
            </button>
            <div className="mpr-card-wrap">
              <div className="mpr-card">
                <div className="mpr-bar" />
                <div className="mpr-header">
                  <p className="mpr-eyebrow">Subscription</p>
                  <h2 className="mpr-heading">Choose Your Plan</h2>
                  <p className="mpr-body">Select the plan that fits your property management needs. Upgrade or downgrade anytime.</p>
                  <div className="mpr-divider" />
                </div>
                <div className="mpr-plans">
                  <div className={`mpr-plan-card ${selectedPlanCard === 'base' ? 'mpr-plan-selected' : ''}`} onClick={() => setSelectedPlanCard('base')}>
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
                    <button className={`mpr-plan-btn ${selectedPlanCard === 'base' ? 'mpr-plan-btn-selected' : 'mpr-plan-btn-ghost'}`}
                      onClick={(e) => { e.stopPropagation(); handleRoleSelection('homeowner', 'base'); }}>Select Base Plan</button>
                  </div>
                  <div className={`mpr-plan-card mpr-plan-featured ${selectedPlanCard === 'premium' ? 'mpr-plan-selected' : ''}`} onClick={() => setSelectedPlanCard('premium')}>
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
                    <button className="mpr-plan-btn mpr-plan-btn-primary"
                      onClick={(e) => { e.stopPropagation(); handleRoleSelection('homeowner', 'premium'); }}>Select Premium Plan</button>
                  </div>
                  <div className={`mpr-plan-card ${selectedPlanCard === 'plus' ? 'mpr-plan-selected' : ''}`} onClick={() => setSelectedPlanCard('plus')}>
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
                    <button className={`mpr-plan-btn ${selectedPlanCard === 'plus' ? 'mpr-plan-btn-selected' : 'mpr-plan-btn-ghost'}`}
                      onClick={(e) => { e.stopPropagation(); handleRoleSelection('homeowner', 'plus'); }}>Select Premium Plus</button>
                  </div>
                </div>
                <div className="mpr-free-banner">
                  <p className="mpr-free-title">All Plans Include a 14-Day Free Trial</p>
                  <p className="mpr-free-sub">Try MyHomeBase™ risk-free. Cancel anytime during your trial with no charges.</p>
                </div>
                <div className="mpr-manage-row">
                  <button className="mpr-manage-btn mpr-manage-btn-left">Manage Subscription</button>
                  <button className="mpr-manage-btn">View Billing History</button>
                </div>
                <div className="mpr-faq">
                  <p className="mpr-faq-label">Frequently Asked Questions</p>
                  <div className="mpr-faq-list">
                    {[
                      { q: 'Can I change my plan at any time?', a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any charges.' },
                      { q: 'What happens if I exceed my property limit?', a: 'You\'ll be prompted to upgrade to the next tier when you try to add a property beyond your current plan\'s limit. Your existing properties remain accessible.' },
                      { q: 'Do you offer refunds?', a: 'Every new account includes a 14-day free trial. Your card is saved securely but not charged during the trial. If you cancel before the trial ends, you won\'t be charged at all. After the trial, subscriptions are billed monthly with no long-term contracts.' },
                    ].map((item, i) => (
                      <div key={i} className={`mpr-faq-item ${i < 2 ? 'mpr-faq-item-border' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setOpenFaqIdx(openFaqIdx === i ? null : i); }}>
                        <div className="mpr-faq-q-row">
                          <p className="mpr-faq-q">{item.q}</p>
                          <span className="mpr-faq-chevron" style={{ transform: openFaqIdx === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        </div>
                        {openFaqIdx === i && <p className="mpr-faq-a">{item.a}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REFERRAL MODAL ═══ */}
      {referralOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setReferralOpen(false)}>
          <div className="mhb-modal-card" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setReferralOpen(false)} aria-label="Close">
              <X size={20} strokeWidth={2.5} />
            </button>
            <div className="mrr-tabs">
              <button className={`mrr-tab ${referralTab === 'hw' ? 'mrr-tab-active-hw' : 'mrr-tab-inactive'}`} onClick={() => setReferralTab('hw')}>Homeowner — $5/mo</button>
              <button className={`mrr-tab ${referralTab === 'ct' ? 'mrr-tab-active-ct' : 'mrr-tab-inactive'}`} onClick={() => setReferralTab('ct')}>Contractor — $20/mo</button>
            </div>
            <div className="mrr-card-wrap">
              {referralTab === 'hw' && (
                <div className="mrr-card mrr-card-hw">
                  <div className="mrr-bar mrr-bar-hw" />
                  <div className="mrr-header">
                    <p className="mrr-eyebrow mrr-eyebrow-hw">How it works</p>
                    <h2 className="mrr-heading">Refer a neighbor.<br />Pay less. Refer five. Pay nothing.</h2>
                    <p className="mrr-body-text">Every homeowner you refer knocks $1 off your monthly plan. Refer 5 and your subscription is completely free — for as long as they stay paid subscribers.</p>
                    <div className="mrr-divider mrr-divider-hw" />
                  </div>
                  <div className="mrr-steps-section">
                    <p className="mrr-steps-label mrr-steps-label-hw">Your monthly cost</p>
                    <div className="mrr-steps">
                      {[0,1,2,3,4,5].map(i => {
                        const cost = 5 - i; const free = cost === 0; const pct = Math.round((cost / 5) * 100);
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
                    <button className="mrr-cta-btn mrr-cta-btn-hw" onClick={() => handleRoleSelection('homeowner')}>Start referring homeowners →</button>
                  </div>
                </div>
              )}
              {referralTab === 'ct' && (
                <div className="mrr-card mrr-card-ct">
                  <div className="mrr-bar mrr-bar-ct" />
                  <div className="mrr-header">
                    <p className="mrr-eyebrow mrr-eyebrow-ct">How it works</p>
                    <h2 className="mrr-heading">Bring homeowners.<br />Pay less. Or nothing.</h2>
                    <p className="mrr-body-text">Every homeowner you bring to MyHomeBase takes $1 off your monthly plan. Refer 20 and your subscription is completely free — for as long as they are paid subscribers.</p>
                    <div className="mrr-divider mrr-divider-ct" />
                  </div>
                  <div className="mrr-steps-section">
                    <p className="mrr-steps-label mrr-steps-label-ct">Your monthly cost</p>
                    <div className="mrr-steps">
                      {[0,5,10,15,20].map(i => {
                        const cost = 20 - i; const free = cost === 0; const pct = Math.round((cost / 20) * 100);
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
                    <button className="mrr-cta-btn mrr-cta-btn-ct" onClick={() => handleRoleSelection('contractor')}>Start referring homeowners →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ HOMEOWNER LEARN MORE MODAL ═══ */}
      {homeownerModalOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setHomeownerModalOpen(false)}>
          <div className="mhb-modal-card mhb-role-modal" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setHomeownerModalOpen(false)} aria-label="Close"><X size={20} strokeWidth={2.5} /></button>
            <div className="mhb-role-modal-bar mhb-role-modal-bar-purple" />
            <div className="mhb-role-modal-inner">
              <p className="mhb-role-modal-eyebrow">For Homeowners</p>
              <h2 className="mhb-role-modal-heading">Your home has a record.<br />Now it has a score.</h2>
              <p className="mhb-role-modal-body">MyHomeBase™ is your home's permanent record book — built for the moment you need it most. Whether you're filing an insurance claim, selling your house, or just staying on top of seasonal maintenance, every document, every repair, every inspection lives here.</p>
              <div className="mhb-role-modal-features">
                {[
                  { icon: '📊', title: 'Home Wellness Score™', desc: 'A live score from 0–1,000 based on system age, maintenance history, and task completion. Know it. Improve it. Show it when you sell.' },
                  { icon: '📋', title: 'Service Record Tracking', desc: 'Log every repair, inspection, and upgrade — dated, documented, and retrievable in seconds when an adjuster comes calling.' },
                  { icon: '📍', title: 'Geo-Located Task List', desc: "Seasonal reminders built around your location and your home's specific systems — not a generic checklist." },
                  { icon: '🔒', title: 'Claim Protection', desc: 'Build the paper trail insurers require. The #1 reason claims are denied is missing maintenance records. Fix that for $5/month.' },
                ].map(f => (
                  <div key={f.title} className="mhb-role-modal-feature">
                    <span className="mhb-role-modal-feature-icon">{f.icon}</span>
                    <div>
                      <p className="mhb-role-modal-feature-title">{f.title}</p>
                      <p className="mhb-role-modal-feature-desc">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mhb-role-modal-cta-row">
                <button className="mhb-role-modal-cta-primary" onClick={() => { setHomeownerModalOpen(false); handleRoleSelection('homeowner'); }}>Create my account →</button>
                <button className="mhb-role-modal-cta-ghost" onClick={() => { setHomeownerModalOpen(false); setQuizOpen(true); }}>Take the quiz first</button>
              </div>
              <p className="mhb-role-modal-trial">14-day free trial · No credit card required</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONTRACTOR LEARN MORE MODAL ═══ */}
      {contractorModalOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setContractorModalOpen(false)}>
          <div className="mhb-modal-card mhb-role-modal" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setContractorModalOpen(false)} aria-label="Close"><X size={20} strokeWidth={2.5} /></button>
            <div className="mhb-role-modal-bar mhb-role-modal-bar-blue" />
            <div className="mhb-role-modal-inner">
              <p className="mhb-role-modal-eyebrow mhb-role-modal-eyebrow-blue">For Contractors</p>
              <h2 className="mhb-role-modal-heading">Your next client is already in the app.</h2>
              <p className="mhb-role-modal-body">MyHomeBase™ connects you with homeowners who are actively maintaining their properties. Get listed in a trusted directory, manage your client relationships, and grow your business through referrals.</p>
              <div className="mhb-role-modal-features">
                {[
                  { icon: '📂', title: 'Contractor Directory Listing', desc: 'Be found by homeowners who are already investing in their properties. Your profile appears alongside relevant service records.' },
                  { icon: '👥', title: 'CRM & Lead Management', desc: 'Track your homeowner clients, manage active jobs, and follow up on leads — all in one place.' },
                  { icon: '📄', title: 'Service Record Integration', desc: "When you complete a job, the record is logged directly into the homeowner's history. Builds trust and repeat business." },
                  { icon: '💰', title: 'Referral Revenue', desc: 'Refer homeowners and earn $1/month off your plan for each one — refer 20 and your subscription is free.' },
                ].map(f => (
                  <div key={f.title} className="mhb-role-modal-feature">
                    <span className="mhb-role-modal-feature-icon">{f.icon}</span>
                    <div>
                      <p className="mhb-role-modal-feature-title">{f.title}</p>
                      <p className="mhb-role-modal-feature-desc">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mhb-role-modal-cta-row">
                <button className="mhb-role-modal-cta-primary mhb-role-modal-cta-blue" onClick={() => { setContractorModalOpen(false); handleRoleSelection('contractor'); }}>Create my account →</button>
              </div>
              <p className="mhb-role-modal-trial">14-day free trial · No credit card required</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AGENT LEARN MORE MODAL ═══ */}
      {agentModalOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setAgentModalOpen(false)}>
          <div className="mhb-modal-card mhb-role-modal" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setAgentModalOpen(false)} aria-label="Close"><X size={20} strokeWidth={2.5} /></button>
            <div className="mhb-role-modal-bar mhb-role-modal-bar-green" />
            <div className="mhb-role-modal-inner">
              <p className="mhb-role-modal-eyebrow mhb-role-modal-eyebrow-green">For Real Estate Agents</p>
              <h2 className="mhb-role-modal-heading">Give every listing a verifiable history.</h2>
              <p className="mhb-role-modal-body">MyHomeBase™ lets you offer your clients something no other agent can — a documented, scored home history that builds buyer confidence, reduces inspection surprises, and closes deals faster.</p>
              <div className="mhb-role-modal-features">
                {[
                  { icon: '🏡', title: 'Home Wellness Score™ for Listings', desc: 'Attach a verified Home Wellness Score to every listing. Buyers see it as transparency. Sellers see it as value.' },
                  { icon: '📤', title: 'Handoff Reports', desc: 'Generate a comprehensive handoff report at closing — every maintenance record, every upgrade, verified and ready for the buyer.' },
                  { icon: '🤝', title: 'Referral Earnings', desc: "Refer homeowners to MyHomeBase and earn recurring monthly revenue for as long as they're subscribed." },
                  { icon: '⭐', title: 'Differentiate Your Services', desc: "Stand out in a crowded market. Offering a documented home history is a competitive advantage most agents don't have." },
                ].map(f => (
                  <div key={f.title} className="mhb-role-modal-feature">
                    <span className="mhb-role-modal-feature-icon">{f.icon}</span>
                    <div>
                      <p className="mhb-role-modal-feature-title">{f.title}</p>
                      <p className="mhb-role-modal-feature-desc">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mhb-role-modal-cta-row">
                <button className="mhb-role-modal-cta-primary mhb-role-modal-cta-green" onClick={() => { setAgentModalOpen(false); handleRoleSelection('agent'); }}>Create my account →</button>
              </div>
              <p className="mhb-role-modal-trial">14-day free trial · No credit card required</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FAQ MODAL ═══ */}
      {faqOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setFaqOpen(false)}>
          <div className="mhb-faq-modal" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setFaqOpen(false)} aria-label="Close"><X size={20} strokeWidth={2.5} /></button>
            <div className="mhb-faq-modal-bar" />
            <div className="mhb-faq-modal-inner">
              <p className="mhb-faq-modal-eyebrow">Frequently Asked Questions</p>
              <h2 className="mhb-faq-modal-heading">Everything you want to know.</h2>
              <div className="mhb-faq-list">
                {[
                  {
                    q: 'What is MyHomeBase™?',
                    a: 'MyHomeBase™ is a home documentation and protection platform. It gives your home a permanent, verifiable record — maintenance history, service logs, inspection reports, and more — organized in one place and accessible the moment you need it.'
                  },
                  {
                    q: 'How does it help with insurance claims?',
                    a: 'The #1 reason home insurance claims are denied is a lack of documented maintenance records. MyHomeBase™ lets you log every repair, inspection, and upgrade so that when an adjuster asks for proof of maintenance, you have it ready instantly.'
                  },
                  {
                    q: 'What is the Home Wellness Score™?',
                    a: 'The Home Wellness Score™ is a 0–1,000 score for your home — updated in real time based on system age, maintenance history, and completed tasks. Think of it like a credit score, but for your house. A higher score means a better-documented, better-maintained home.'
                  },
                  {
                    q: 'How much does MyHomeBase™ cost?',
                    a: 'MyHomeBase™ is $5/month for homeowners, contractors  plans starting at $20/month, with referral credits that can bring your cost to $0.'
                  },
                  {
                    q: 'Is there a free trial?',
                    a: 'Yes — all plans include a 14-day free trial. No credit card required to get started.'
                  },
                  {
                    q: 'Can I cancel anytime?',
                    a: 'Absolutely. There are no contracts or cancellation fees. You can cancel your subscription at any time from your account settings.'
                  },
                  {
                    q: 'How does the referral program work?',
                    a: 'Both homeowners and contractors can refer others to MyHomeBase™. Each person you refer who becomes a paid subscriber takes $1 off your monthly plan. Refer enough people and your subscription is completely free.'
                  },
                  {
                    q: 'Who else can use MyHomeBase™?',
                    a: 'MyHomeBase™ is built for three groups: homeowners who want to protect their investment, contractors who want to grow their business and manage client records, and real estate agents who want to offer verified home histories with their listings.'
                  },
                ].map((item, i) => (
                  <div key={i} className={`mhb-faq-item ${openFaqIdx === i ? 'mhb-faq-item-open' : ''}`}>
                    <button className="mhb-faq-q" onClick={() => setOpenFaqIdx(openFaqIdx === i ? null : i)}>
                      <span>{item.q}</span>
                      <span className="mhb-faq-chevron">{openFaqIdx === i ? '▲' : '▼'}</span>
                    </button>
                    {openFaqIdx === i && <p className="mhb-faq-a">{item.a}</p>}
                  </div>
                ))}
              </div>
              <div className="mhb-faq-cta-row">
                <a href="/quiz" className="mhb-faq-cta">Check my home's risk — free →</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          SECTION 01 — NAVIGATION
      ═══════════════════════════════════════ */}
      <nav className="mhb-nav">
        <div className="mhb-nav-inner">
          <div className="mhb-nav-left">
            <a href="/" className="mhb-nav-logo-link">
              <img src={logoWhite} alt="MyHomeBase" className="mhb-nav-logo" />
            </a>
            <div className="mhb-nav-links">
              <button className="mhb-nav-link" onClick={() => scrollTo('how-it-works')}>How It Works</button>
              <button className="mhb-nav-link" onClick={() => scrollTo('pricing')}>Pricing</button>
              <button className="mhb-nav-link" onClick={() => setFaqOpen(true)}>FAQ</button>
            </div>
          </div>
          <div className="mhb-nav-right">
            <button className="mhb-nav-demo-btn" onClick={() => handleDemoLogin('homeowner')} disabled={demoLoading === 'homeowner'}>
              {demoLoading === 'homeowner' ? 'Loading…' : 'Homeowner Demo'}
            </button>
            <div className="mhb-signin-flyout-wrap" ref={signinFlyoutRef}>
              <button
                className={`mhb-nav-signin-btn${signinOpen ? ' mhb-nav-signin-btn-active' : ''}`}
                onClick={() => setSigninOpen(o => !o)}
                aria-expanded={signinOpen}
                aria-haspopup="true"
              >
                Sign In
              </button>
              {signinOpen && (
                <div className="mhb-signin-flyout" role="menu">
                  <div className="mhb-signin-flyout-header">
                    <span>Sign in as…</span>
                    <button className="mhb-signin-flyout-close" onClick={() => setSigninOpen(false)} aria-label="Close">
                      <X size={14} />
                    </button>
                  </div>
                  <a href="/signin/homeowner" className="mhb-signin-flyout-role mhb-signin-flyout-homeowner" role="menuitem">
                    <div className="mhb-signin-flyout-icon">
                      <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 2L2 7v9h4v-5h6v5h4V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="mhb-signin-flyout-role-text">
                      <span className="mhb-signin-flyout-role-title">Homeowner</span>
                      <span className="mhb-signin-flyout-role-sub">Track, protect &amp; document</span>
                    </div>
                    <span className="mhb-signin-flyout-arrow">→</span>
                  </a>
                  <a href="/signin/contractor" className="mhb-signin-flyout-role mhb-signin-flyout-contractor" role="menuitem">
                    <div className="mhb-signin-flyout-icon">
                      <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 13l3-6 3 3 3-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="13" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div className="mhb-signin-flyout-role-text">
                      <span className="mhb-signin-flyout-role-title">Contractor</span>
                      <span className="mhb-signin-flyout-role-sub">Grow your business</span>
                    </div>
                    <span className="mhb-signin-flyout-arrow">→</span>
                  </a>
                  <a href="/signin/agent" className="mhb-signin-flyout-role mhb-signin-flyout-agent" role="menuitem">
                    <div className="mhb-signin-flyout-icon">
                      <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="8" width="14" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 8V6a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="mhb-signin-flyout-role-text">
                      <span className="mhb-signin-flyout-role-title">Real Estate Agent</span>
                      <span className="mhb-signin-flyout-role-sub">Refer and earn</span>
                    </div>
                    <span className="mhb-signin-flyout-arrow">→</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile-only demo text link below nav */}
      <div className="mhb-nav-demo-underbar">
        <button className="mhb-nav-demo-underbar-btn" onClick={() => handleDemoLogin('homeowner')} disabled={demoLoading === 'homeowner'}>
          {demoLoading === 'homeowner' ? 'Loading…' : 'Try the homeowner demo →'}
        </button>
      </div>

      {/* ═══════════════════════════════════════
          SECTION 02 — HERO
      ═══════════════════════════════════════ */}
      <section className="mhb-hero-section">
        <div className="mhb-hero-content">
          {/* Insurance stat: deploy mid-page or below the fold as a secondary proof point */}
          {/* <p className="mhb-hero-eyebrow">42% of home insurance claims get denied.</p> */}
          <h1 className="mhb-hero-h1">Finally. A system that runs your home so you don't have to.</h1>
          <p className="mhb-hero-sub">
            Homeownership is a full-time job nobody trained you for. MyHomeBase tells you exactly what your home needs, when to do it, and who to call — so nothing falls through the cracks.
          </p>
          <div className="mhb-hero-ctas">
            <a href="/signin" className="mhb-hero-cta-primary">
              Start for $5/month — No guesswork. No surprises.
            </a>
            <button className="mhb-hero-cta-secondary" onClick={() => scrollTo('how-it-works')}>
              See how it works ↓
            </button>
          </div>
          <p className="mhb-hero-tagline">Your home has a record. Now it has a score.</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 03 — STAT TILES
      ═══════════════════════════════════════ */}
      <section className="mhb-stats-section">
        <div className="mhb-stats-grid">
          <button className="mhb-stat-tile" onClick={() => setDeniedOpen(true)} aria-label="Claims denied nationally">
            <div className="mhb-stat-tile-num">42%</div>
            <div className="mhb-stat-tile-label">Claims denied nationally</div>
            <div className="mhb-stat-tile-hint"><Info size={12} strokeWidth={2.5} /> Tap to learn more</div>
          </button>
          <button className="mhb-stat-tile" onClick={() => setCostOpen(true)} aria-label="Average denied claim cost">
            <div className="mhb-stat-tile-num">$18K</div>
            <div className="mhb-stat-tile-label">Average denied claim cost</div>
            <div className="mhb-stat-tile-hint"><Info size={12} strokeWidth={2.5} /> Tap to learn more</div>
          </button>
          <button className="mhb-stat-tile mhb-stat-tile-accent" onClick={() => setPlansOpen(true)} aria-label="View pricing plans">
            <div className="mhb-stat-tile-num">$5<span className="mhb-stat-tile-per">/mo</span></div>
            <div className="mhb-stat-tile-label">Full protection</div>
            <div className="mhb-stat-tile-hint"><Info size={12} strokeWidth={2.5} /> See plans</div>
          </button>
          <button className="mhb-stat-tile mhb-stat-tile-green" onClick={() => setReferralOpen(true)} aria-label="Referral program">
            <div className="mhb-stat-tile-num mhb-stat-tile-refer">Refer 5.</div>
            <div className="mhb-stat-tile-label">Free for life</div>
            <div className="mhb-stat-tile-hint"><Info size={12} strokeWidth={2.5} /> How it works</div>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 04 — QUIZ ENTRY
      ═══════════════════════════════════════ */}
      <section id="quiz" className="mhb-quiz-entry-section">
        <div className="mhb-quiz-entry-inner">
          <p className="mhb-section-eyebrow mhb-quiz-eyebrow">Free 2-minute quiz</p>
          <h2 className="mhb-quiz-entry-heading">How well do you know your home?</h2>
          <p className="mhb-quiz-entry-body">
            10 questions about your home's systems and maintenance habits. Get a personalized risk score — and find out exactly where you might be leaving your biggest investment exposed.
          </p>
          <button className="mhb-quiz-entry-cta" onClick={() => setQuizOpen(true)}>
            Start the quiz →
          </button>
          <div className="mhb-quiz-trust">
            <span className="mhb-quiz-trust-item">⏱ ~2 minutes</span>
            <span className="mhb-quiz-trust-dot">·</span>
            <span className="mhb-quiz-trust-item">🔓 No account needed</span>
            <span className="mhb-quiz-trust-dot">·</span>
            <span className="mhb-quiz-trust-item">📊 Personalized result</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 05 — HOW IT WORKS
      ═══════════════════════════════════════ */}
      <section id="how-it-works" className="mhb-how-section">
        <div className="mhb-how-inner">
          <p className="mhb-section-eyebrow">How MyHomeBase works</p>
          <h2 className="mhb-section-heading">Your home, documented.<br />Your claims, protected.</h2>

          <div className="mhb-how-features">

            <div className="mhb-how-feature">
              <div className="mhb-how-feature-copy">
                <div className="mhb-how-feature-num">01</div>
                <h3 className="mhb-how-feature-title">Home Wellness Score™</h3>
                <p className="mhb-how-feature-body">Your home gets a score from 0 to 1,000 — updated in real time based on system age, maintenance history, and completed tasks. Like a credit score, but for your house. Know it. Improve it. Show it when you sell.</p>
              </div>
              <div className="mhb-phone-frame">
                <div className="mhb-phone-screen">
                  <div className="mhb-phone-status">
                    <span>9:41</span>
                    <span className="mhb-phone-status-icons">●●●</span>
                  </div>
                  <div className="mhb-phone-header">
                    <span className="mhb-phone-header-title">Home Wellness Score™</span>
                    <span className="mhb-phone-header-address">123 Maple St</span>
                  </div>
                  <div className="mhb-phone-score-area">
                    <svg className="mhb-score-ring-svg" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r="66" fill="none" stroke="#ede9fe" strokeWidth="10"/>
                      <circle cx="80" cy="80" r="66" fill="none" stroke="url(#scoreGrad)" strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray="414.69"
                        strokeDashoffset="82.94"
                        transform="rotate(-90 80 80)"/>
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#7c3aed"/>
                          <stop offset="100%" stopColor="#3C258E"/>
                        </linearGradient>
                      </defs>
                      <text x="80" y="72" textAnchor="middle" fontSize="36" fontWeight="800" fill="#1a0a3e">801</text>
                      <text x="80" y="92" textAnchor="middle" fontSize="11" fontWeight="700" fill="#7c3aed" letterSpacing="1">EXCELLENT</text>
                      <text x="80" y="108" textAnchor="middle" fontSize="9" fill="#9090b0">out of 1,000</text>
                    </svg>
                  </div>
                  <div className="mhb-phone-bars">
                    {[
                      { label: 'HVAC Systems', pct: 92, color: '#7c3aed' },
                      { label: 'Roof & Structure', pct: 85, color: '#3C258E' },
                      { label: 'Plumbing', pct: 78, color: '#5b21b6' },
                      { label: 'Electrical', pct: 95, color: '#7c3aed' },
                    ].map(b => (
                      <div key={b.label} className="mhb-phone-bar-row">
                        <span className="mhb-phone-bar-label">{b.label}</span>
                        <div className="mhb-phone-bar-track">
                          <div className="mhb-phone-bar-fill" style={{ width: `${b.pct}%`, background: b.color }} />
                        </div>
                        <span className="mhb-phone-bar-val">{b.pct}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mhb-phone-badge">
                    <span className="mhb-phone-badge-dot" />
                    Last updated today
                  </div>
                </div>
              </div>
            </div>

            <div className="mhb-how-feature mhb-how-feature-reverse">
              <div className="mhb-how-feature-copy">
                <div className="mhb-how-feature-num">02</div>
                <h3 className="mhb-how-feature-title">Service Record Tracking</h3>
                <p className="mhb-how-feature-body">Every repair, inspection, and upgrade — logged, dated, and stored permanently. When an insurance adjuster asks for proof, you'll have it. When a buyer asks for history, you'll have that too.</p>
              </div>
              <div className="mhb-phone-frame">
                <div className="mhb-phone-screen">
                  <div className="mhb-phone-status">
                    <span>9:41</span>
                    <span className="mhb-phone-status-icons">●●●</span>
                  </div>
                  <div className="mhb-phone-header">
                    <span className="mhb-phone-header-title">Service Records</span>
                    <span className="mhb-phone-header-address">123 Maple St · 14 records</span>
                  </div>
                  <div className="mhb-phone-records">
                    {[
                      { label: 'HVAC Tune-Up', date: 'Mar 12, 2025', tag: 'HVAC', color: '#7c3aed' },
                      { label: 'Roof Inspection', date: 'Jan 4, 2025', tag: 'Roof', color: '#1560A2' },
                      { label: 'Plumbing Repair', date: 'Nov 18, 2024', tag: 'Plumbing', color: '#09694A' },
                      { label: 'Electrical Panel Check', date: 'Sep 2, 2024', tag: 'Electrical', color: '#b45309' },
                      { label: 'Gutter Cleaning', date: 'Aug 15, 2024', tag: 'Exterior', color: '#5b21b6' },
                    ].map((r, i) => (
                      <div key={r.label} className="mhb-record-item">
                        <div className="mhb-record-timeline">
                          <div className="mhb-record-dot" style={{ background: r.color }} />
                          {i < 4 && <div className="mhb-record-line" />}
                        </div>
                        <div className="mhb-record-body">
                          <div className="mhb-record-top">
                            <span className="mhb-record-name">{r.label}</span>
                            <span className="mhb-record-tag" style={{ color: r.color, background: r.color + '18' }}>{r.tag}</span>
                          </div>
                          <span className="mhb-record-date">{r.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mhb-phone-badge">
                    <span className="mhb-phone-badge-dot" style={{ background: '#1560A2' }} />
                    All records verified
                  </div>
                </div>
              </div>
            </div>

            <div className="mhb-how-feature">
              <div className="mhb-how-feature-copy">
                <div className="mhb-how-feature-num">03</div>
                <h3 className="mhb-how-feature-title">Geo-Located Task List</h3>
                <p className="mhb-how-feature-body">Seasonal maintenance reminders based on your actual location and your home's specific systems. No generic checklists — just what your home needs, when it needs it.</p>
              </div>
              <div className="mhb-phone-frame">
                <div className="mhb-phone-screen">
                  <div className="mhb-phone-status">
                    <span>9:41</span>
                    <span className="mhb-phone-status-icons">●●●</span>
                  </div>
                  <div className="mhb-phone-header">
                    <span className="mhb-phone-header-title">My Task List</span>
                    <span className="mhb-phone-header-address">📍 Seattle, WA · Fall Season</span>
                  </div>
                  <div className="mhb-phone-tasks">
                    <div className="mhb-task-section-label">Due this month</div>
                    {[
                      { emoji: '🍂', text: 'Clean gutters before fall rain', priority: 'High', done: false },
                      { emoji: '❄️', text: 'Winterize exterior hose bibs', priority: 'High', done: false },
                      { emoji: '🌿', text: 'HVAC filter replacement', priority: 'Med', done: false },
                    ].map(t => (
                      <div key={t.text} className="mhb-task-item">
                        <div className="mhb-task-checkbox" />
                        <div className="mhb-task-content">
                          <span className="mhb-task-emoji">{t.emoji}</span>
                          <span className="mhb-task-text">{t.text}</span>
                        </div>
                        <span className={`mhb-task-priority mhb-task-priority-${t.priority.toLowerCase()}`}>{t.priority}</span>
                      </div>
                    ))}
                    <div className="mhb-task-section-label mhb-task-section-done">Completed</div>
                    {[
                      { emoji: '🔧', text: 'Test smoke detectors', done: true },
                      { emoji: '🪟', text: 'Seal window weatherstripping', done: true },
                    ].map(t => (
                      <div key={t.text} className="mhb-task-item mhb-task-item-done">
                        <div className="mhb-task-checkbox mhb-task-checkbox-done">✓</div>
                        <div className="mhb-task-content">
                          <span className="mhb-task-emoji">{t.emoji}</span>
                          <span className="mhb-task-text">{t.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mhb-phone-badge" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                    <span className="mhb-phone-badge-dot" style={{ background: '#f97316' }} />
                    <span style={{ color: '#c2410c' }}>3 tasks need attention</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 07 — ROLE SELECTION
      ═══════════════════════════════════════ */}
      <section id="role-section" className="mhb-role-section">
        <div className="mhb-role-inner">
          <h2 className="mhb-role-heading">I am a…</h2>
          <div className="mhb-role-tiles">

            {/* Homeowner */}
            <div className={`mhb-role-tile mhb-role-tile-purple ${selectedRole === 'homeowner' ? 'mhb-role-tile-expanded' : ''}`}>
              <button
                className="mhb-role-tile-btn"
                onClick={() => setSelectedRole(selectedRole === 'homeowner' ? null : 'homeowner')}
              >
                <div className="mhb-role-tile-icon">
                  <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 2L2 7v9h4v-5h6v5h4V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="mhb-role-tile-text">
                  <div className="mhb-role-tile-title">Homeowner</div>
                  <div className="mhb-role-tile-sub">Track, protect &amp; document</div>
                </div>
                <div className="mhb-role-tile-chevron" style={{ transform: selectedRole === 'homeowner' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</div>
              </button>
              {selectedRole === 'homeowner' && (
                <div className="mhb-role-actions">
                  <button className="mhb-role-action mhb-role-action-primary" onClick={() => handleRoleSelection('homeowner')} data-testid="button-homeowner-signup">Register</button>
                  <a href="/signin/homeowner" className="mhb-role-action mhb-role-action-ghost">Sign In</a>
                  <button className="mhb-role-action mhb-role-action-text" onClick={() => setHomeownerModalOpen(true)}>Learn more first →</button>
                </div>
              )}
            </div>

            {/* Contractor */}
            <div className={`mhb-role-tile mhb-role-tile-blue ${selectedRole === 'contractor' ? 'mhb-role-tile-expanded' : ''}`}>
              <button
                className="mhb-role-tile-btn"
                onClick={() => setSelectedRole(selectedRole === 'contractor' ? null : 'contractor')}
              >
                <div className="mhb-role-tile-icon">
                  <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 13l3-6 3 3 3-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="13" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="mhb-role-tile-text">
                  <div className="mhb-role-tile-title">Contractor</div>
                  <div className="mhb-role-tile-sub">Grow your business</div>
                </div>
                <div className="mhb-role-tile-chevron" style={{ transform: selectedRole === 'contractor' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</div>
              </button>
              {selectedRole === 'contractor' && (
                <div className="mhb-role-actions">
                  <button className="mhb-role-action mhb-role-action-blue" onClick={() => handleRoleSelection('contractor')} data-testid="button-contractor-signup">Register</button>
                  <a href="/signin/contractor" className="mhb-role-action mhb-role-action-ghost">Sign In</a>
                  <button className="mhb-role-action mhb-role-action-text" onClick={() => setContractorModalOpen(true)}>Learn more first →</button>
                </div>
              )}
            </div>

            {/* Agent */}
            <div className={`mhb-role-tile mhb-role-tile-green ${selectedRole === 'agent' ? 'mhb-role-tile-expanded' : ''}`}>
              <button
                className="mhb-role-tile-btn"
                onClick={() => setSelectedRole(selectedRole === 'agent' ? null : 'agent')}
              >
                <div className="mhb-role-tile-icon">
                  <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="8" width="14" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 8V6a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="mhb-role-tile-text">
                  <div className="mhb-role-tile-title">Real Estate Agent</div>
                  <div className="mhb-role-tile-sub">Refer and earn</div>
                </div>
                <div className="mhb-role-tile-chevron" style={{ transform: selectedRole === 'agent' ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</div>
              </button>
              {selectedRole === 'agent' && (
                <div className="mhb-role-actions">
                  <button className="mhb-role-action mhb-role-action-green" onClick={() => handleRoleSelection('agent')} data-testid="button-agent-signup">Register</button>
                  <a href="/signin/agent" className="mhb-role-action mhb-role-action-ghost">Sign In</a>
                  <button className="mhb-role-action mhb-role-action-text" onClick={() => setAgentModalOpen(true)}>Learn more first →</button>
                </div>
              )}
            </div>

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
            <button className="mhb-demo-link" onClick={() => handleDemoLogin('homeowner')} disabled={demoLoading === 'homeowner'} data-testid="button-homeowner-demo">
              {demoLoading === 'homeowner' ? 'Loading…' : 'Homeowner demo'}
            </button>
            <button className="mhb-demo-link" onClick={() => handleDemoLogin('contractor')} disabled={demoLoading === 'contractor'} data-testid="button-contractor-demo">
              {demoLoading === 'contractor' ? 'Loading…' : 'Contractor demo'}
            </button>
            <button className="mhb-demo-link" onClick={() => handleDemoLogin('agent')} disabled={demoLoading === 'agent'} data-testid="button-agent-demo">
              {demoLoading === 'agent' ? 'Loading…' : 'Agent demo'}
            </button>
          </div>

          <p className="mhb-role-trial-note">All plans include a 14-day free trial. No credit card required to start.</p>
          <p className="mhb-role-signin-row">Already have an account? <a className="mhb-role-signin-link" href="/signin" data-testid="link-signin">Sign in</a></p>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 08 — PRICING
      ═══════════════════════════════════════ */}
      <section id="pricing" className="mhb-pricing-section">
        <div className="mhb-pricing-inner">
          <p className="mhb-section-eyebrow">Simple, honest pricing</p>
          <h2 className="mhb-section-heading">Less than a cup of coffee.<br />More than you'd pay out of pocket.</h2>
          <div className="mhb-pricing-compare">
            <div className="mhb-pricing-left">
              <p className="mhb-pricing-amount">$5<span>/month</span></p>
              <p className="mhb-pricing-label">MyHomeBase™</p>
            </div>
            <div className="mhb-pricing-vs">vs.</div>
            <div className="mhb-pricing-right">
              <p className="mhb-pricing-amount mhb-pricing-amount-red">$18,311</p>
              <p className="mhb-pricing-label">Average denied claim</p>
            </div>
          </div>
          <p className="mhb-pricing-tagline">Do the math.</p>
          <button className="mhb-pricing-details-btn" onClick={() => setPlansOpen(true)}>
            See full plan details →
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 09 — PRE-FOOTER CTA
      ═══════════════════════════════════════ */}
      <section className="mhb-prefooter-section">
        <div className="mhb-prefooter-inner">
          <h2 className="mhb-prefooter-heading">Your home is probably your biggest investment.</h2>
          <p className="mhb-prefooter-sub">Treat it like one. Start your free home health check — takes 2 minutes.</p>
          <a href="/quiz" className="mhb-prefooter-cta">
            Check my home's risk — free →
          </a>
        </div>
      </section>


    </div>
  );
}
