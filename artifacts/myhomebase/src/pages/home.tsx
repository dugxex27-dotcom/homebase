import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Calendar, Search, Star, TrendingUp, Gift, Sparkles, FileText, AlertTriangle, ClipboardList, Bell, ChevronRight, ChevronDown, ChevronUp, Phone, Mail, Globe, MapPin, X as XIcon, Wrench, DollarSign, Info } from "lucide-react";
import HouseMap from "@/components/house-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType, House } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { HomeownerFeatureGate } from "@/components/homeowner-feature-gate";
import { useHomeownerSubscription } from "@/hooks/useHomeownerSubscription";
import logoHomeowner from "@assets/my-homebase-logo-tm-final-white_1777417516350.png";
import "./home.css";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getMonth() {
  return new Date().toLocaleString("default", { month: "long" });
}

export default function Home() {
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  const [, setLocation] = useLocation();
  const { isPaidSubscriber, subscriptionStatus, isLoading: subLoading } = useHomeownerSubscription();
  const queryClient = useQueryClient();

  // Redirect contractors and agents to their dashboards; redirect inactive homeowners to trial setup
  useEffect(() => {
    if (typedUser?.role === "contractor") {
      setLocation("/contractor-dashboard");
    } else if (typedUser?.role === "agent") {
      setLocation("/agent-dashboard");
    } else if (typedUser?.role === "homeowner" && !subLoading && subscriptionStatus === "inactive") {
      const pendingPlan = sessionStorage.getItem('pendingPlan');
      if (pendingPlan) {
        sessionStorage.removeItem('pendingPlan');
        setLocation(`/homeowner-pricing?onboarding=true&plan=${encodeURIComponent(pendingPlan)}`);
      } else {
        setLocation("/homeowner-pricing?onboarding=true");
      }
    }
  }, [typedUser, setLocation, subscriptionStatus, subLoading]);


  // Inspection summary
  const { data: inspectionSummary } = useQuery<{
    id: string; inspectionDate: string | null; inspectorName: string | null;
    flaggedItemCount: number; propertyAddress: string | null; uploadedAt: string;
  } | null>({
    queryKey: ["/api/homeowner/inspection-summary"],
    enabled: typedUser?.role === "homeowner",
  });

  // Referral data
  const { data: referralData } = useQuery({
    queryKey: ["/api/user/referral-code"],
    enabled: typedUser?.role === "homeowner" && isPaidSubscriber,
  });

  // User data
  const { data: userData } = useQuery({
    queryKey: ["/api/user"],
    enabled: typedUser?.role === "homeowner",
  });

  // Houses
  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ["/api/houses"],
    enabled: typedUser?.role === "homeowner",
  });

  // Health scores per house (for stat chips)
  const { data: score0 } = useQuery<{ score: number }>({
    queryKey: ["/api/houses", houses[0]?.id, "health-score"],
    enabled: !!houses[0]?.id && typedUser?.role === "homeowner",
  });
  const { data: score1 } = useQuery<{ score: number }>({
    queryKey: ["/api/houses", houses[1]?.id, "health-score"],
    enabled: !!houses[1]?.id && typedUser?.role === "homeowner",
  });

  // Maintenance tasks for task count chip
  const { data: tasksData } = useQuery({
    queryKey: ["/api/houses", houses[0]?.id, "maintenance-tasks"],
    enabled: !!houses[0]?.id && typedUser?.role === "homeowner",
  });

  // Referring agent (only present if agent brought this user onto the app)
  const { data: referringAgent } = useQuery<{
    firstName: string; lastName: string; email: string | null;
    phone: string | null; website: string | null; officeAddress: string | null;
    referralCode: string | null; profileImageUrl: string | null;
  } | null>({
    queryKey: ["/api/referring-agent"],
    enabled: typedUser?.role === "homeowner",
  });

  // Linked invoices from contractors (via connection code)
  const { data: linkedInvoices = [] } = useQuery<Array<{
    id: string; invoiceNumber: string; title: string; status: string;
    total: string; amountDue: string; dueDate: string | null;
    createdAt: string; contractorName: string; companyName: string | null; houseId: string | null;
  }>>({
    queryKey: ["/api/homeowner/linked-invoices"],
    enabled: typedUser?.role === "homeowner",
  });

  // Count of unclaimed linked invoices for badge notification
  const { data: unclaimedInvoiceData } = useQuery<{ count: number }>({
    queryKey: ["/api/homeowner/linked-invoices/unclaimed-count"],
    enabled: typedUser?.role === "homeowner",
    refetchInterval: 60000,
  });
  const claimInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, houseId }: { invoiceId: string; houseId: string }) => {
      const res = await fetch(`/api/claim-invoice/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ houseId }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to claim invoice');
      return res.json();
    },
    onSuccess: (_, { invoiceId }) => {
      setClaimedInvoiceIds(prev => new Set(prev).add(invoiceId));
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/linked-invoices/unclaimed-count"] });
    },
  });

  const markInvoicesViewedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/homeowner/linked-invoices/mark-all-viewed`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark invoices as viewed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/linked-invoices/unclaimed-count"] });
    },
  });

  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [contractorInvoicesExpanded, setContractorInvoicesExpanded] = useState(false);
  const [claimedInvoiceIds, setClaimedInvoiceIds] = useState<Set<string>>(new Set());
  const [hwsModalOpen, setHwsModalOpen] = useState(false);
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  const [systemsModalOpen, setSystemsModalOpen] = useState(false);

  // Lock body scroll when any stat chip modal is open
  useEffect(() => {
    const anyOpen = hwsModalOpen || tasksModalOpen || systemsModalOpen;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [hwsModalOpen, tasksModalOpen, systemsModalOpen]);

  const allSystems = [...new Set(houses.flatMap((h: House) => Array.isArray(h.homeSystems) ? h.homeSystems as string[] : []))];

  // Use server count directly; query is invalidated on every claim so it stays accurate
  const unclaimedInvoiceCount = unclaimedInvoiceData?.count ?? 0;

  // Referral progress
  const referralCount = (referralData as any)?.referralCount || 0;
  const maxHouses = (userData as any)?.maxHousesAllowed ?? 2;
  const subscriptionCost = maxHouses >= 7 ? 40 : maxHouses >= 3 ? 20 : 5;
  const referralsNeeded = subscriptionCost;
  const referralsRemaining = Math.max(0, referralsNeeded - referralCount);
  const progressPercentage = Math.min(100, (referralCount / referralsNeeded) * 100);

  // Stat chip computations
  const rawScores = [score0?.score, score1?.score];
  const houseScores = houses.map((h, i) => ({ house: h, score: rawScores[i] }));
  const totalSystems = houses.reduce((sum, h) => sum + (Array.isArray(h.homeSystems) ? h.homeSystems.length : 0), 0);
  const tasksCount = tasksData
    ? ((tasksData as any).tasks?.seasonal?.length || 0) + ((tasksData as any).tasks?.weatherSpecific?.length || 0)
    : null;

  const firstName = (typedUser as any)?.firstName || (typedUser as any)?.name?.split(" ")[0] || "";
  const climateZone = houses[0]?.climateZone || "your area";

  const getScoreClass = (s: number | undefined) =>
    s === undefined ? "" : s >= 60 ? "good" : s >= 30 ? "warn" : "alert";

  return (
    <div>

      {/* ── DASHBOARD HEADER (homeowners only) ──────────────── */}
      {typedUser?.role === "homeowner" && (
        <div className="dash-header">
          <span className="dash-eyebrow">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </span>
          <div className="dash-title">Your dashboard</div>
          <div className="dash-subtitle">
            {houses.length > 0
              ? `${houses.length} ${houses.length === 1 ? "property" : "properties"} · ${totalSystems} systems tracked`
              : "Start by adding your first property"}
          </div>

          {houses.length > 0 && (
            <div className="dash-chips">
              {houseScores.map(({ house, score }, i) => (
                <button className="dash-chip dash-chip-btn" key={house.id} onClick={() => setHwsModalOpen(true)}>
                  <div className={`dash-chip-num ${getScoreClass(score)}`}>
                    {score !== undefined ? score : "—"}
                  </div>
                  <div className="dash-chip-label dash-chip-label-info">
                    {houses.length === 1 ? "HWS™ Score" : `${house.name || `Property ${i + 1}`} HWS™`}
                    <Info size={9} className="dash-chip-info-icon" />
                  </div>
                </button>
              ))}
              <button className="dash-chip dash-chip-btn" onClick={() => setTasksModalOpen(true)}>
                <div className="dash-chip-num">
                  {tasksCount !== null ? tasksCount : "—"}
                </div>
                <div className="dash-chip-label dash-chip-label-info">
                  Tasks this month
                  <Info size={9} className="dash-chip-info-icon" />
                </div>
              </button>
              <button className="dash-chip dash-chip-btn" onClick={() => setSystemsModalOpen(true)}>
                <div className="dash-chip-num">{totalSystems || "—"}</div>
                <div className="dash-chip-label dash-chip-label-info">
                  Systems tracked
                  <Info size={9} className="dash-chip-info-icon" />
                </div>
              </button>
            </div>
          )}

        </div>
      )}

      {/* ── FIRST-TIME: NO HOUSES YET ───────────────────────── */}
      {typedUser?.role === "homeowner" && houses.length === 0 && (
        <div className="dash-body">
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--purple-deep)", marginBottom: 12 }}>
              Welcome to MyHomeBase™!
            </h2>
            <p style={{ fontSize: 14, color: "var(--purple-light)", marginBottom: 24, lineHeight: 1.6 }}>
              Create a living record of your home — systems, maintenance, upgrades, and health.
            </p>
            <Link href="/maintenance">
              <button className="btn-primary" style={{ maxWidth: 280 }}
                data-testid="button-launch-home-record-first-time">
                Launch Your Home Record
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── MAIN DASHBOARD BODY ─────────────────────────────── */}
      {typedUser?.role === "homeowner" && houses.length > 0 && (
        <HomeownerFeatureGate featureName="Home Dashboard">
          <div className="dash-body">

            {/* Agent Banner — in body (purple-tint area) per reference design */}
            {referringAgent && (
              <button className="dash-agent-banner" onClick={() => setAgentModalOpen(true)} aria-label="View your agent">
                <div className="dash-agent-banner-photo">
                  {referringAgent.profileImageUrl
                    ? <img src={referringAgent.profileImageUrl} alt={`${referringAgent.firstName} ${referringAgent.lastName}`} className="dash-agent-banner-img" />
                    : <span className="dash-agent-banner-initial">{referringAgent.firstName?.[0]?.toUpperCase() ?? "A"}</span>}
                </div>
                <div className="dash-agent-banner-copy">
                  <div className="dash-agent-banner-label">Your Real Estate Agent</div>
                  <div className="dash-agent-banner-name">{referringAgent.firstName} {referringAgent.lastName}</div>
                </div>
                <div className="dash-agent-banner-cta">View info →</div>
              </button>
            )}

            {/* Property Cards */}
            <span className="dash-section-label">Your {houses.length === 1 ? "property" : "properties"}</span>
            <div data-tour-id="health-score">
              {houses.map((house: House) => (
                <div key={`map-${house.id}`} className="property-card">
                  <HouseMap
                    houseId={house.id}
                    homeownerId={typedUser?.id ?? ""}
                    houseName={house.name}
                    houseAddress={house.address}
                    checkedSystems={Array.isArray(house.homeSystems) ? house.homeSystems as string[] : []}
                  />
                </div>
              ))}
            </div>

            {/* AI Maintenance Coach card */}
            <Link href="/ai-help" className="ai-coach-card" data-tour-id="property-details">
              <div className="ai-coach-icon">
                <Sparkles size={20} />
              </div>
              <div className="ai-coach-copy">
                <div className="ai-coach-eyebrow">AI Maintenance Coach</div>
                <div className="ai-coach-title">Get your {getMonth()} plan</div>
                <div className="ai-coach-sub">Personalized for {climateZone}</div>
              </div>
              <button className="ai-coach-btn" onClick={(e) => e.preventDefault()}>
                Ask AI →
              </button>
            </Link>

            {/* Inspection Summary (if present) */}
            {inspectionSummary && (
              <Link href="/documents" className="action-row" style={{ textDecoration: 'none' }}>
                <div className="action-icon" style={{ background: '#FEF3C7' }}>
                  <ClipboardList size={18} style={{ color: '#92400e' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="action-title">
                    Home Inspection on File
                    {inspectionSummary.flaggedItemCount > 0 && (
                      <span style={{
                        marginLeft: 6, fontSize: 9, fontWeight: 700,
                        background: "#FEE2E2", color: "#991B1B",
                        borderRadius: 5, padding: "2px 7px",
                        textTransform: "uppercase", letterSpacing: "0.04em",
                      }}>
                        {inspectionSummary.flaggedItemCount} flagged
                      </span>
                    )}
                  </div>
                  <div className="action-sub">
                    {inspectionSummary.inspectionDate || "Date unknown"} · {inspectionSummary.inspectorName || "Unknown"}
                  </div>
                </div>
                <span className="action-cta">View →</span>
              </Link>
            )}

            {/* Upload Inspection Prompt */}
            {!inspectionSummary && (
              <Link href="/documents?upload=inspection" className="action-row" style={{ textDecoration: 'none' }}>
                <div className="action-icon" style={{ background: '#EEF2FF' }}>
                  <ClipboardList size={18} style={{ color: '#4338CA' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="action-title">Upload home inspection PDF</div>
                  <div className="action-sub">AI extracts roof, HVAC, deficiencies & more</div>
                </div>
                <span className="action-cta">Upload →</span>
              </Link>
            )}

            {/* Resale Readiness */}
            <div className="action-row" data-tour-id="resale-report">
              <div className="action-icon">
                <TrendingUp size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="action-title">Thinking about selling?</div>
                <div className="action-sub">AI-powered Resale Readiness Report</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                {houses.map((h: House) => (
                  <Link key={h.id} href={`/resale-report/${h.id}`}>
                    <span className="action-cta" data-testid={`button-resale-report-${h.id}`}>
                      {houses.length > 1 ? (h.name || "Report") : "Get Report"} →
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Referral Card — paid subscribers only */}
            {isPaidSubscriber && (
              <>
                <div className="action-row" data-tour-id="referral">
                  <div className="action-icon">
                    <Gift size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="action-title">Earn a Free Subscription</div>
                    <div className="action-sub">
                      {referralsRemaining === 0
                        ? "You've earned a free subscription!"
                        : `${referralsRemaining} more paid referral${referralsRemaining !== 1 ? "s" : ""} needed`}
                    </div>
                  </div>
                  <Link href="/homeowner-referral">
                    <span className="action-cta" data-testid="button-share-invite-link">Share →</span>
                  </Link>
                </div>
                <Link href="/homeowner-referral" style={{ fontSize: 13, color: 'var(--purple)', textAlign: 'center', display: 'block', marginTop: 4, marginBottom: 8, textDecoration: 'none', fontWeight: 600 }}>
                  Share Your Invite Link →
                </Link>
              </>
            )}

            {/* From Your Contractors — linked invoices */}
            {linkedInvoices.length > 0 && (
              <div className="dash-light-card" data-tour-id="contractor-invoices">
                <button
                  className="dash-light-card-row"
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => {
                    const expanding = !contractorInvoicesExpanded;
                    setContractorInvoicesExpanded(expanding);
                    if (expanding && linkedInvoices.length > 0) {
                      markInvoicesViewedMutation.mutate();
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div className="dash-light-card-icon">
                      <Wrench size={18} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div>
                        <div className="dash-light-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          From Your Contractors
                          {unclaimedInvoiceCount > 0 && (
                            <span
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                                background: '#dc2626', color: '#fff',
                                fontSize: 10, fontWeight: 700, lineHeight: 1,
                              }}
                              data-testid="badge-unclaimed-invoices"
                            >
                              {unclaimedInvoiceCount > 9 ? '9+' : unclaimedInvoiceCount}
                            </span>
                          )}
                        </div>
                        <div className="dash-light-card-sub">{linkedInvoices.length} invoice{linkedInvoices.length !== 1 ? 's' : ''} linked to your account</div>
                      </div>
                    </div>
                  </div>
                  {contractorInvoicesExpanded ? <ChevronUp size={16} style={{ color: '#2C0F5B', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: '#2C0F5B', flexShrink: 0 }} />}
                </button>

                {contractorInvoicesExpanded && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {linkedInvoices.map(inv => {
                      const isClaimed = claimedInvoiceIds.has(inv.id);
                      // Use house from invoice when set; fall back to sole house for single-property homeowners.
                      // For multi-house homeowners without a specific house on the invoice, direct to the pay page.
                      const claimHouseId = inv.houseId || (houses.length === 1 ? houses[0]?.id : null);
                      return (
                        <div key={inv.id} style={{
                          background: 'var(--purple-tint)', border: '1px solid var(--purple-border)', borderRadius: 10,
                          padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#2C0F5B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {inv.title}
                              </div>
                              <span style={{
                                fontSize: 10, fontWeight: 600, borderRadius: 5, padding: '1px 6px',
                                background: inv.status === 'paid' ? '#dcfce7' : inv.status === 'overdue' ? '#fee2e2' : inv.status === 'sent' ? '#dbeafe' : '#f3f4f6',
                                color: inv.status === 'paid' ? '#16a34a' : inv.status === 'overdue' ? '#dc2626' : inv.status === 'sent' ? '#1d4ed8' : '#6b7280',
                                textTransform: 'uppercase',
                              }}>
                                {inv.status}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#7B6FA0', marginTop: 2 }}>
                              {inv.companyName || inv.contractorName} · ${parseFloat(inv.total).toFixed(2)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <a
                              href={`/pay/invoice/${inv.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dash-light-card-btn"
                              style={{ fontSize: 11, padding: '4px 8px' }}
                            >
                              View →
                            </a>
                            {!isClaimed && claimHouseId && (
                              <button
                                className="btn-primary"
                                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7 }}
                                disabled={claimInvoiceMutation.isPending}
                                onClick={() => claimInvoiceMutation.mutate({ invoiceId: inv.id, houseId: claimHouseId })}
                                data-testid={`button-claim-invoice-${inv.id}`}
                              >
                                Save to history
                              </button>
                            )}
                            {isClaimed && (
                              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✓ Saved</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </HomeownerFeatureGate>
      )}

      {/* ── HWS SCORE MODAL ─────────────────────────────── */}
      {hwsModalOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setHwsModalOpen(false)}>
          <div className="mhb-modal-card" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setHwsModalOpen(false)} aria-label="Close"><XIcon size={20} strokeWidth={2.5} /></button>
            <div className="hdm-wrap">
              <div className="hdm-bar hdm-bar-purple" />
              <div className="hdm-header">
                <p className="hdm-eyebrow hdm-eyebrow-purple">Home Wellness Score™</p>
                <h2 className="hdm-heading">What your HWS™ score means</h2>
                <p className="hdm-subtitle">Your score reflects how well-documented and maintained your home is — the same record insurers and buyers rely on.</p>
                <div className="hdm-divider" />
              </div>
              <div className="hdm-score-display">
                {houseScores.map(({ house, score }, i) => (
                  <div key={house.id} className="hdm-score-row">
                    <div className={`hdm-score-badge hdm-score-badge-${getScoreClass(score) || 'neutral'}`}>
                      {score !== undefined ? score : "—"}
                    </div>
                    <div>
                      <p className="hdm-score-label">{houses.length === 1 ? "Your Home" : house.name || `Property ${i + 1}`}</p>
                      <p className="hdm-score-tier">{
                        score === undefined ? "Score calculating…" :
                        score >= 60 ? "Healthy — well-documented" :
                        score >= 30 ? "Needs attention — gaps in record" :
                        "At risk — significant gaps"
                      }</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hdm-tiers">
                <p className="hdm-tiers-label">Score guide</p>
                {[
                  { range: "60 – 100", label: "Healthy", desc: "Strong documentation, insurer-ready record.", color: "#4a9e2f", bg: "#f0fdf4" },
                  { range: "30 – 59",  label: "Needs attention", desc: "Gaps that could affect a claim or a sale.", color: "#EF9F27", bg: "#fffbeb" },
                  { range: "0 – 29",   label: "At risk", desc: "Missing records that could cost you thousands.", color: "#e03e3e", bg: "#fef2f2" },
                ].map(t => (
                  <div key={t.range} className="hdm-tier-row" style={{ background: t.bg }}>
                    <div className="hdm-tier-badge" style={{ color: t.color }}>{t.range}</div>
                    <div>
                      <p className="hdm-tier-title" style={{ color: t.color }}>{t.label}</p>
                      <p className="hdm-tier-desc">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hdm-factors">
                <p className="hdm-tiers-label">What raises your score</p>
                {[
                  { icon: "🔧", text: "Systems logged and tracked" },
                  { icon: "📋", text: "Maintenance tasks completed" },
                  { icon: "📄", text: "Inspection report on file" },
                  { icon: "🧾", text: "Contractor invoices saved" },
                ].map(f => (
                  <div key={f.text} className="hdm-factor-row">
                    <span className="hdm-factor-icon">{f.icon}</span>
                    <p className="hdm-factor-text">{f.text}</p>
                  </div>
                ))}
              </div>
              <div className="hdm-cta-row">
                <Link href="/maintenance" onClick={() => setHwsModalOpen(false)}>
                  <button className="btn-primary hdm-cta-btn">Improve My Score →</button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TASKS THIS MONTH MODAL ───────────────────────── */}
      {tasksModalOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setTasksModalOpen(false)}>
          <div className="mhb-modal-card" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setTasksModalOpen(false)} aria-label="Close"><XIcon size={20} strokeWidth={2.5} /></button>
            <div className="hdm-wrap">
              <div className="hdm-bar hdm-bar-amber" />
              <div className="hdm-header">
                <p className="hdm-eyebrow hdm-eyebrow-amber">Maintenance Tasks</p>
                <h2 className="hdm-heading">Your {getMonth()} task plan</h2>
                <p className="hdm-subtitle">
                  {tasksCount !== null
                    ? `${tasksCount} task${tasksCount !== 1 ? "s" : ""} this month — generated by your AI Maintenance Coach based on your home, climate zone, and season.`
                    : "Your AI Maintenance Coach generates a personalized task plan each month based on your home, climate zone, and season."}
                </p>
                <div className="hdm-divider" />
              </div>
              <div className="hdm-info-cards">
                {[
                  { icon: "🌡️", title: "Climate-aware", desc: `Tasks are tailored for ${climateZone}.` },
                  { icon: "📅", title: "Monthly rotation", desc: "Tasks update each month so nothing gets missed year-round." },
                  { icon: "✅", title: "Raises your HWS™", desc: "Completing tasks improves your Home Wellness Score." },
                ].map(c => (
                  <div key={c.title} className="hdm-info-card">
                    <span className="hdm-info-icon">{c.icon}</span>
                    <div>
                      <p className="hdm-info-title">{c.title}</p>
                      <p className="hdm-info-desc">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hdm-cta-row">
                <Link href="/maintenance" onClick={() => setTasksModalOpen(false)}>
                  <button className="btn-primary hdm-cta-btn">View All Tasks →</button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SYSTEMS TRACKED MODAL ───────────────────────── */}
      {systemsModalOpen && (
        <div className="mhb-overlay" role="dialog" aria-modal="true" onClick={() => setSystemsModalOpen(false)}>
          <div className="mhb-modal-card" onClick={e => e.stopPropagation()}>
            <button className="mhb-modal-close" onClick={() => setSystemsModalOpen(false)} aria-label="Close"><XIcon size={20} strokeWidth={2.5} /></button>
            <div className="hdm-wrap">
              <div className="hdm-bar hdm-bar-teal" />
              <div className="hdm-header">
                <p className="hdm-eyebrow hdm-eyebrow-teal">Home Systems</p>
                <h2 className="hdm-heading">{totalSystems || "—"} system{totalSystems !== 1 ? "s" : ""} in your record</h2>
                <p className="hdm-subtitle">Every tracked system generates maintenance reminders, raises your HWS™ score, and becomes part of your permanent home record.</p>
                <div className="hdm-divider" />
              </div>
              {allSystems.length > 0 ? (
                <div className="hdm-systems-grid">
                  {allSystems.map(sys => (
                    <div key={sys} className="hdm-system-chip">
                      <span className="hdm-system-dot" />
                      {sys}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="hdm-empty-msg">No systems tracked yet. Add them to start building your home record.</p>
              )}
              <div className="hdm-divider" style={{ margin: '16px 20px 0' }} />
              <div className="hdm-cta-row">
                <Link href="/maintenance" onClick={() => setSystemsModalOpen(false)}>
                  <button className="btn-primary hdm-cta-btn">Manage Systems →</button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REFERRING AGENT MODAL ───────────────────────── */}
      {agentModalOpen && referringAgent && (
        <div className="dash-agent-modal-overlay" onClick={() => setAgentModalOpen(false)}>
          <div className="dash-agent-modal" onClick={e => e.stopPropagation()}>
            <button className="dash-agent-modal-close" onClick={() => setAgentModalOpen(false)} aria-label="Close">
              <XIcon size={18} />
            </button>
            <div className="dash-agent-modal-avatar">
              {referringAgent.profileImageUrl
                ? <img src={referringAgent.profileImageUrl} alt={referringAgent.firstName} className="dash-agent-modal-photo" />
                : <span>{referringAgent.firstName?.[0]?.toUpperCase() ?? "A"}</span>}
            </div>
            <div className="dash-agent-modal-name">{referringAgent.firstName} {referringAgent.lastName}</div>
            <div className="dash-agent-modal-role">Real Estate Agent</div>
            <div className="dash-agent-modal-divider" />
            <div className="dash-agent-modal-details">
              {referringAgent.email && (
                <a href={`mailto:${referringAgent.email}`} className="dash-agent-modal-row">
                  <Mail size={14} className="dash-agent-modal-row-icon" />
                  <span>{referringAgent.email}</span>
                </a>
              )}
              {referringAgent.phone && (
                <a href={`tel:${referringAgent.phone}`} className="dash-agent-modal-row">
                  <Phone size={14} className="dash-agent-modal-row-icon" />
                  <span>{referringAgent.phone}</span>
                </a>
              )}
              {referringAgent.website && (
                <a href={referringAgent.website} target="_blank" rel="noopener noreferrer" className="dash-agent-modal-row">
                  <Globe size={14} className="dash-agent-modal-row-icon" />
                  <span>{referringAgent.website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
              {referringAgent.officeAddress && (
                <div className="dash-agent-modal-row">
                  <MapPin size={14} className="dash-agent-modal-row-icon" />
                  <span>{referringAgent.officeAddress}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CONTRACTOR SECTION (unchanged) ──────────────────── */}
      {typedUser?.role === "contractor" && (
        <section className="py-8 sm:py-12 lg:py-16" style={{ backgroundColor: "var(--theme-primary)" }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4" style={{ color: "white" }}>
                  Your Business Dashboard
                </h2>
                <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: "#9ed0ef" }}>
                  Manage your contracting business and grow your client base
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 items-stretch" style={{ marginBottom: "-100px" }}>
                {[
                  { href: "/contractor-profile", Icon: Users, label: "My Profile", sub: "Update info", body: "Manage your professional profile and service offerings" },
                  { href: "/messages", Icon: Bell, label: "Messages", sub: "Client communication", body: "Communicate with potential and existing clients" },
                  { href: "/contractor-dashboard", Icon: Calendar, label: "Active Projects", sub: "Current work", body: "3 active projects scheduled this week" },
                  { href: "/contractor-dashboard", Icon: Star, label: "Reviews", sub: "Customer feedback", body: "4.8/5 stars from 127 recent reviews" },
                  { href: "/contractor-dashboard", Icon: Search, label: "New Leads", sub: "Opportunities", body: "5 new client inquiries this week" },
                ].map(({ href, Icon, label, sub, body }) => (
                  <Link key={label} href={href} className="h-full">
                    <Card className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: "var(--gray-100)" }}>
                      <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                        <div className="flex items-center mb-3 sm:mb-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors flex-shrink-0" style={{ backgroundColor: "var(--theme-primary)" }}>
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: "white" }} />
                          </div>
                          <div className="ml-3 sm:ml-4">
                            <h3 className="text-base sm:text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>{label}</h3>
                            <p className="text-xs sm:text-sm" style={{ color: "var(--theme-primary)" }}>{sub}</p>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm" style={{ color: "var(--theme-primary)" }}>{body}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
