import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Check, Briefcase, Wrench, Shield, Rocket, ChevronRight, ChevronLeft, Plus, X } from "lucide-react";
import { EnterpriseContactModal } from "@/components/contractor-feature-gate";
import "./home.css";

const C = {
  primary: '#1560A2',
  deep: '#0C3460',
  tint: '#EAF4FD',
  eyebrow: '#AFD6F9',
  border: 'rgba(21,96,162,0.12)',
};

const SERVICES = [
  "Appliance Installation", "Appliance Repair & Maintenance", "Basement Remodeling",
  "Bathroom Remodeling", "Cabinet Installation", "Carpet Cleaning", "Carpet Installation",
  "Chimney & Fireplace Services", "Concrete & Masonry", "Custom Carpentry",
  "Deck Construction", "Drainage Solutions", "Drywall & Spackling Repair",
  "Electrical Services", "Epoxy Flooring", "Exterior Painting", "Fence Installation",
  "Fire & Water Damage Restoration", "Furniture Assembly", "Garage Door Services",
  "General Contracting", "Gutter Cleaning and Repair", "Gutter Installation",
  "Handyman Services", "Hardwood Flooring", "Home Automation & Tech Services",
  "Home Inspection", "House Cleaning", "HVAC Services", "Interior Painting",
  "Irrigation Systems", "Junk Removal", "Kitchen Remodeling", "Laminate & Vinyl Flooring",
  "Landscape Design", "Lawn & Landscaping", "Local Moving", "Locksmiths",
  "Mold Remediation", "Pest Control", "Plumbing Services", "Pool Installation",
  "Pool Maintenance", "Pressure Washing", "Roofing Services",
  "Security System Installation", "Septic Services", "Siding Installation",
  "Snow Removal", "Tile Installation", "Tree Service & Trimming",
  "Trim & Finish Carpentry", "Window Cleaning", "Windows & Door Installation",
];

const EXPERIENCE_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "20+"];

const inpStyle: React.CSSProperties = {
  width: '100%', background: '#F3F5F7', border: `1.5px solid ${C.border}`,
  borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 500,
  color: '#1a1a1a', boxSizing: 'border-box', fontFamily: 'inherit',
  outline: 'none', appearance: 'none' as const,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: C.primary,
  letterSpacing: '0.03em', marginBottom: 6, display: 'block',
};

const STEPS = [
  { icon: Briefcase, label: "Basics" },
  { icon: Wrench,    label: "Services" },
  { icon: Shield,    label: "Credentials" },
  { icon: Rocket,    label: "Done!" },
];

type TeamSizeOption = '' | 'just_me' | '2_10' | '11_99' | '100_plus';

type FormState = {
  company: string;
  name: string;
  phone: string;
  zipCode: string;
  yearsExperience: string;
  teamSizeSelection: TeamSizeOption;
  services: string[];
  customService: string;
  serviceFilter: string;
  licenseNumber: string;
  licenseState: string;
  insuranceCarrier: string;
  skipCredentials: boolean;
};

export default function ContractorOnboarding() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);

  // When arriving from the Google OAuth contractor flow, send the user to
  // pricing after onboarding so they can complete checkout.
  const fromOAuth =
    new URLSearchParams(window.location.search).get('fromOAuth') === 'true';

  const [form, setForm] = useState<FormState>({
    company: '', name: '', phone: '', zipCode: '', yearsExperience: '',
    teamSizeSelection: '',
    services: [], customService: '', serviceFilter: '',
    licenseNumber: '', licenseState: '', insuranceCarrier: '',
    skipCredentials: false,
  });

  useEffect(() => {
    fetch('/api/auth/user', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((user: { zipCode?: string } | null) => {
        if (user?.zipCode) {
          setForm(prev => prev.zipCode ? prev : { ...prev, zipCode: user.zipCode! });
        }
      })
      .catch(() => {});
  }, []);

  const set = (k: keyof FormState, v: string | string[] | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const toggleService = (s: string) =>
    set('services', form.services.includes(s)
      ? form.services.filter(x => x !== s)
      : [...form.services, s]);

  const addCustom = () => {
    const s = form.customService.trim();
    if (s && !form.services.includes(s)) {
      set('services', [...form.services, s]);
      set('customService', '');
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        company: form.company,
        name: form.name,
        phone: form.phone,
        postalCode: form.zipCode,
        services: form.services,
        yearsExperience: form.yearsExperience,
        teamSizeRange: form.teamSizeSelection || undefined,
      };
      if (!form.skipCredentials) {
        payload.licenseNumber = form.licenseNumber;
        payload.insuranceCarrier = form.insuranceCarrier;
      }
      const r = await fetch('/api/contractor/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!r.ok) throw new Error(await r.text());

      if (!form.skipCredentials && form.licenseNumber && form.licenseState) {
        await fetch('/api/contractor/licenses', {
          method: 'POST',
          body: JSON.stringify({
            licenseNumber: form.licenseNumber,
            state: form.licenseState,
            municipality: form.licenseState,
            licenseType: 'General Contractor',
          }),
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
      }
    },
    onSuccess: () => setStep(4),
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  const canNext = () => {
    if (step === 1) return form.company.trim().length > 0 && form.name.trim().length > 0 && form.teamSizeSelection !== '';
    if (step === 2) return form.services.length > 0;
    return true;
  };

  const next = () => {
    if (step === 3) { saveMutation.mutate(); return; }
    if (step < 4) setStep(s => s + 1);
  };

  const filteredServices = SERVICES.filter(s =>
    s.toLowerCase().includes(form.serviceFilter.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#f4f6f9', fontFamily: "'Inter', system-ui, sans-serif" }}>

      <EnterpriseContactModal open={enterpriseOpen} onClose={() => setEnterpriseOpen(false)} />

      {/* ── HEADER ─────────────────────────── */}
      <div className="dash-header" style={{ background: `linear-gradient(135deg, ${C.deep} 0%, ${C.primary} 100%)` }}>
        <span className="dash-eyebrow" style={{ color: C.eyebrow }}>CONTRACTOR SETUP</span>
        <div className="dash-title">
          {step < 4 ? "Let's get you set up" : "You're all set!"}
        </div>
        <div className="dash-subtitle">
          {step === 1 && "Tell us about your business"}
          {step === 2 && "What services do you offer?"}
          {step === 3 && "Add your credentials"}
          {step === 4 && "Your profile is ready — start finding jobs"}
        </div>

        {/* Step chips */}
        <div className="dash-chips" style={{ gap: 8 }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} className="dash-chip" style={{
                opacity: active ? 1 : done ? 0.85 : 0.45,
                background: active ? 'rgba(255,255,255,0.18)' : done ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
                border: active ? '1.5px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
              }}>
                <div className="dash-chip-num" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {done ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <div className="dash-chip-label">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {step < 4 && (
          <div style={{ margin: '12px 0 0', height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: 'rgba(255,255,255,0.7)', borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
        )}
      </div>

      {/* ── BODY ─────────────────────────── */}
      <div className="dash-body" style={{ flex: 1 }}>

        {/* ── STEP 1: Business Basics ── */}
        {step === 1 && (
          <>
            <span className="dash-section-label">Business Info</span>
            <div className="dash-light-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Company name *</label>
                  <input
                    style={inpStyle}
                    placeholder="e.g. Smith Plumbing & HVAC"
                    value={form.company}
                    onChange={e => set('company', e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={labelStyle}>Your name *</label>
                  <input
                    style={inpStyle}
                    placeholder="First & last name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phone number</label>
                  <input
                    style={inpStyle}
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Business zip code</label>
                  <input
                    style={inpStyle}
                    placeholder="e.g. 98101"
                    value={form.zipCode}
                    onChange={e => set('zipCode', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Years in business</label>
                  <select
                    style={inpStyle}
                    value={form.yearsExperience}
                    onChange={e => set('yearsExperience', e.target.value)}
                  >
                    <option value="">Select…</option>
                    {EXPERIENCE_OPTIONS.map(o => (
                      <option key={o} value={o}>{o === '20+' ? '20+ years' : `${o} year${o === '1' ? '' : 's'}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Phase 5 — Team size selection */}
            <span className="dash-section-label" style={{ marginTop: 8 }}>Team size</span>
            <div className="dash-light-card" style={{ marginBottom: 12 }}>
              {(() => {
                const options: { value: TeamSizeOption; label: string; sub: string; tier: string; tierColor: string }[] = [
                  { value: 'just_me',   label: 'Just me',      sub: 'Solo operator',                      tier: 'Basic or Pro',     tierColor: '#1560A2' },
                  { value: '2_10',      label: '2–10 people',  sub: 'Small team',                         tier: 'Pro required',     tierColor: '#7c3aed' },
                  { value: '11_99',     label: '11–99 people', sub: 'Growing business',                   tier: 'Business plan',    tierColor: '#d97706' },
                  { value: '100_plus',  label: '100+ people',  sub: "Enterprise — we'll reach out",       tier: 'Enterprise',       tierColor: '#dc2626' },
                ];
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {options.map(opt => {
                      const selected = form.teamSizeSelection === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => set('teamSizeSelection', opt.value)}
                          style={{
                            all: 'unset', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', borderRadius: 10,
                            border: `1.5px solid ${selected ? C.primary : C.border}`,
                            background: selected ? C.tint : '#fff',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: selected ? C.deep : '#111827' }}>{opt.label}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{opt.sub}</div>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                            borderRadius: 6, padding: '3px 9px',
                            background: selected ? opt.tierColor : '#f1f5f9',
                            color: selected ? '#fff' : '#64748b',
                            transition: 'all 0.15s',
                          }}>{opt.tier}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              {/* Contextual messaging */}
              {form.teamSizeSelection === 'just_me' && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#eff6ff', fontSize: 12, color: C.primary }}>
                  ✓ Start on Basic — upgrade to Pro anytime to unlock CRM and lead tools.
                </div>
              )}
              {form.teamSizeSelection === '2_10' && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#f5f3ff', fontSize: 12, color: '#7c3aed' }}>
                  ✓ Pro plan required for teams. Includes 3 tech seats and full CRM access.
                </div>
              )}
              {form.teamSizeSelection === '11_99' && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fcd34d', fontSize: 12, color: '#92400e' }}>
                  ✓ Looks like you need the Business plan — divisions, bulk import, and per-seat billing.
                </div>
              )}
              {form.teamSizeSelection === '100_plus' && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>✓ Enterprise plan — custom pricing for large teams.</span>
                  <button
                    onClick={() => setEnterpriseOpen(true)}
                    style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#b91c1c', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                  >
                    Contact us →
                  </button>
                </div>
              )}
            </div>

            <span className="dash-section-label" style={{ marginTop: 8 }}>What to expect</span>
            {[
              { icon: '🔍', t: 'Pre-qualified homeowner leads', s: 'Matched to your trade and service area' },
              { icon: '⭐', t: 'Verified contractor badge', s: 'Build trust before the first call' },
              { icon: '📋', t: 'CRM tools built for contractors', s: 'Quotes, jobs, invoices, and payments' },
            ].map(item => (
              <div key={item.t} className="dash-light-card" style={{ marginBottom: 8 }}>
                <div className="dash-light-card-row">
                  <div className="dash-light-card-icon" style={{ background: C.tint, color: C.primary, fontSize: 16 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dash-light-card-title">{item.t}</div>
                    <div className="dash-light-card-sub">{item.s}</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── STEP 2: Services ── */}
        {step === 2 && (
          <>
            <span className="dash-section-label">
              Services ({form.services.length} selected)
            </span>

            {/* Selected chips */}
            {form.services.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {form.services.map(s => (
                  <div key={s} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: C.primary, color: '#fff',
                    borderRadius: 20, padding: '5px 10px 5px 12px',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {s}
                    <button
                      onClick={() => toggleService(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 0, marginLeft: 2 }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Filter input */}
            <div className="dash-light-card" style={{ padding: '10px 14px', marginBottom: 8 }}>
              <input
                style={{ ...inpStyle, background: 'transparent', border: 'none', padding: '4px 0' }}
                placeholder="Search services…"
                value={form.serviceFilter}
                onChange={e => set('serviceFilter', e.target.value)}
              />
            </div>

            {/* Service grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
              {filteredServices.slice(0, 40).map(s => {
                const sel = form.services.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleService(s)}
                    style={{
                      padding: '9px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      border: sel ? `1.5px solid ${C.primary}` : `1px solid rgba(21,96,162,0.12)`,
                      background: sel ? C.tint : '#fff',
                      color: sel ? C.primary : '#6b7280',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    {sel && <Check size={10} style={{ marginRight: 4, flexShrink: 0 }} />}
                    {s}
                  </button>
                );
              })}
            </div>

            {/* Custom service */}
            <span className="dash-section-label" style={{ marginTop: 4 }}>Don't see yours?</span>
            <div className="dash-light-card" style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inpStyle, flex: 1 }}
                  placeholder="Type a custom service…"
                  value={form.customService}
                  onChange={e => set('customService', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustom()}
                />
                <button
                  onClick={addCustom}
                  disabled={!form.customService.trim()}
                  style={{
                    flexShrink: 0, background: C.primary, color: '#fff', border: 'none',
                    borderRadius: 10, padding: '0 14px', fontSize: 12, fontWeight: 700,
                    cursor: form.customService.trim() ? 'pointer' : 'default',
                    opacity: form.customService.trim() ? 1 : 0.5, fontFamily: 'inherit',
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3: Credentials ── */}
        {step === 3 && (
          <>
            <span className="dash-section-label">License</span>
            <div className="dash-light-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>License number</label>
                  <input
                    style={inpStyle}
                    placeholder="e.g. WA-12345"
                    value={form.licenseNumber}
                    onChange={e => set('licenseNumber', e.target.value)}
                    disabled={form.skipCredentials}
                  />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>License state</label>
                  <input
                    style={inpStyle}
                    placeholder="e.g. WA"
                    maxLength={2}
                    value={form.licenseState}
                    onChange={e => set('licenseState', e.target.value.toUpperCase())}
                    disabled={form.skipCredentials}
                  />
                </div>
              </div>
            </div>

            <span className="dash-section-label" style={{ marginTop: 4 }}>Insurance</span>
            <div className="dash-light-card" style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Insurance carrier</label>
              <input
                style={inpStyle}
                placeholder="e.g. Nationwide, State Farm"
                value={form.insuranceCarrier}
                onChange={e => set('insuranceCarrier', e.target.value)}
                disabled={form.skipCredentials}
              />
            </div>

            {/* Skip option */}
            <button
              onClick={() => set('skipCredentials', !form.skipCredentials)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: form.skipCredentials ? C.tint : '#fff',
                border: form.skipCredentials ? `1.5px solid ${C.primary}` : '1px solid rgba(21,96,162,0.12)',
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                width: '100%', fontFamily: 'inherit', marginBottom: 12,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: form.skipCredentials ? C.primary : 'transparent',
                border: form.skipCredentials ? `none` : `2px solid rgba(21,96,162,0.25)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {form.skipCredentials && <Check size={12} color="#fff" />}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>I'll add credentials later</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>You can add them from your profile settings anytime</div>
              </div>
            </button>

            {/* Why it matters */}
            <div className="dash-light-card" style={{ background: C.tint, border: `1px solid rgba(21,96,162,0.15)` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 6 }}>Why credentials matter</div>
              {[
                'Licensed contractors get 3× more inquiries',
                'Verified badge shown on your public profile',
                'Homeowners filter by license & insurance',
              ].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Check size={12} color={C.primary} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#374151' }}>{t}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 4 && (
          <>
            <div className="dash-light-card" style={{ textAlign: 'center', padding: '28px 20px', marginBottom: 12 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: `linear-gradient(135deg, ${C.deep}, ${C.primary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Rocket size={28} color="#fff" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
                Welcome to MyHomeBase™!
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                Your contractor profile is live. Here's what to do next.
              </div>
            </div>

            <span className="dash-section-label">Next steps</span>
            {[
              { icon: '📷', t: 'Add project photos', s: 'Show off your best work in your profile', link: '/contractor-profile' },
              { icon: '💳', t: 'Connect your bank', s: 'Get paid directly through MyHomeBase™', link: '/contractor-profile' },
              { icon: '🔗', t: 'Share your referral link', s: 'Refer contractors, earn monthly credits', link: '/contractor-referral' },
              { icon: '📋', t: 'Browse your leads', s: 'See pre-qualified homeowner requests', link: '/contractor-dashboard' },
            ].map(item => (
              <a key={item.t} href={item.link} style={{ textDecoration: 'none' }}>
                <div className="dash-light-card" style={{ marginBottom: 8 }}>
                  <div className="dash-light-card-row">
                    <div className="dash-light-card-icon" style={{ background: C.tint, fontSize: 16 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dash-light-card-title">{item.t}</div>
                      <div className="dash-light-card-sub">{item.s}</div>
                    </div>
                    <ChevronRight size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
                  </div>
                </div>
              </a>
            ))}
          </>
        )}

        {/* ── NAV BUTTONS ── */}
        {step < 4 ? (
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={saveMutation.isPending}
                style={{
                  flex: '0 0 auto', padding: '14px 18px', borderRadius: 14,
                  background: '#fff', border: `1.5px solid ${C.border}`,
                  color: C.primary, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <button
              onClick={next}
              disabled={!canNext() || saveMutation.isPending}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 14,
                background: canNext() && !saveMutation.isPending
                  ? `linear-gradient(135deg, ${C.deep}, ${C.primary})`
                  : 'rgba(21,96,162,0.25)',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: 14,
                cursor: canNext() && !saveMutation.isPending ? 'pointer' : 'default',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, transition: 'all 0.2s',
              }}
            >
              {saveMutation.isPending
                ? 'Saving…'
                : step === 3
                  ? 'Save & Finish'
                  : <>Continue <ChevronRight size={16} /></>}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setLocation(
              fromOAuth
                ? '/contractor-pricing?trial=true&onboarding=true'
                : '/contractor-dashboard'
            )}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 14, marginTop: 16,
              background: `linear-gradient(135deg, ${C.deep}, ${C.primary})`,
              color: '#fff', border: 'none', fontWeight: 700, fontSize: 15,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {fromOAuth ? 'Choose a plan →' : 'Go to my dashboard →'}
          </button>
        )}

        {step < 4 && (
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#9ca3af' }}>
            Step {step} of {STEPS.length - 1}
          </div>
        )}
      </div>
    </div>
  );
}
