import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, Search, Star, TrendingUp, Gift, Sparkles, FileText, AlertTriangle, ClipboardList, Bell, User, ChevronRight, ChevronUp } from "lucide-react";
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
import logoHomeowner from "@assets/my-homebase-logo-tm-howner-white-final_1776538414393.png";
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

  // Redirect contractors and agents to their dashboards; redirect inactive homeowners to trial setup
  useEffect(() => {
    if (typedUser?.role === "contractor") {
      setLocation("/contractor-dashboard");
    } else if (typedUser?.role === "agent") {
      setLocation("/agent-dashboard");
    } else if (typedUser?.role === "homeowner" && !subLoading && subscriptionStatus === "inactive") {
      setLocation("/homeowner-pricing?onboarding=true");
    }
  }, [typedUser, setLocation, subscriptionStatus, subLoading]);

  // Back-to-top button
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  // Referral progress
  const referralCount = (referralData as any)?.referralCount || 0;
  const maxHouses = (userData as any)?.maxHousesAllowed ?? 2;
  const subscriptionCost = maxHouses >= 7 ? 40 : maxHouses >= 3 ? 20 : 5;
  const referralsNeeded = subscriptionCost;
  const referralsRemaining = Math.max(0, referralsNeeded - referralCount);
  const progressPercentage = Math.min(100, (referralCount / referralsNeeded) * 100);

  // Stat chip computations
  const scores = [score0?.score, score1?.score].filter((s): s is number => s !== undefined);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const totalSystems = houses.reduce((sum, h) => sum + (Array.isArray(h.homeSystems) ? h.homeSystems.length : 0), 0);
  const tasksCount = tasksData
    ? ((tasksData as any).tasks?.seasonal?.length || 0) + ((tasksData as any).tasks?.weatherSpecific?.length || 0)
    : null;

  const firstName = (typedUser as any)?.firstName || (typedUser as any)?.name?.split(" ")[0] || "";
  const climateZone = houses[0]?.climateZone || "your area";

  const scoreClass = avgScore === null ? "" : avgScore >= 60 ? "good" : avgScore >= 30 ? "warn" : "alert";

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>

      {/* ── DASHBOARD HEADER (homeowners only) ──────────────── */}
      {typedUser?.role === "homeowner" && (
        <div className="dash-header">
          <div className="dash-header-top">
            <div className="dash-header-actions">
              <Link href="/account" className="dash-icon-btn" aria-label="Account">
                <User size={15} />
              </Link>
            </div>
          </div>

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
              <div className="dash-chip">
                <div className={`dash-chip-num ${scoreClass}`}>
                  {avgScore !== null ? avgScore : "—"}
                </div>
                <div className="dash-chip-label">HWS™ Score</div>
              </div>
              <div className="dash-chip">
                <div className="dash-chip-num">
                  {tasksCount !== null ? tasksCount : "—"}
                </div>
                <div className="dash-chip-label">Tasks this month</div>
              </div>
              <div className="dash-chip">
                <div className="dash-chip-num">{totalSystems || "—"}</div>
                <div className="dash-chip-label">Systems tracked</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FIRST-TIME: NO HOUSES YET ───────────────────────── */}
      {typedUser?.role === "homeowner" && houses.length === 0 && (
        <div className="dash-body">
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#2d1f6e", marginBottom: 12 }}>
              Welcome to MyHomeBase™!
            </h2>
            <p style={{ fontSize: 14, color: "#9b97c4", marginBottom: 24, lineHeight: 1.6 }}>
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
              <div style={{
                background: "#FFFBF0",
                border: "1px solid #F3D99A",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36, background: "#FEF3C7",
                    borderRadius: 10, display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>
                    <ClipboardList size={18} style={{ color: "#92400e" }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#78350f" }}>
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
                    <div style={{ fontSize: 10, color: "#92400e", marginTop: 2 }}>
                      {inspectionSummary.inspectionDate || "Date unknown"} · {inspectionSummary.inspectorName || "Unknown"}
                    </div>
                  </div>
                </div>
                <Link href="/documents">
                  <button className="dash-light-card-btn">View →</button>
                </Link>
              </div>
            )}

            {/* Upload Inspection Prompt */}
            {!inspectionSummary && (
              <Link href="/documents" className="upload-prompt-card">
                <div className="upload-prompt-icon">
                  <ClipboardList size={18} />
                </div>
                <div className="upload-prompt-copy">
                  <div className="upload-prompt-title">Upload inspection report</div>
                  <div className="upload-prompt-sub">AI extracts everything automatically</div>
                </div>
                <span className="upload-prompt-link">Upload →</span>
              </Link>
            )}

            {/* Resale Readiness */}
            <div className="dash-light-card" data-tour-id="resale-report">
              <div className="dash-light-card-row">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <div className="dash-light-card-icon">
                    <TrendingUp size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="dash-light-card-title">Thinking about selling?</div>
                    <div className="dash-light-card-sub">AI-powered Resale Readiness Report</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  {houses.map((h: House) => (
                    <Link key={h.id} href={`/resale-report/${h.id}`}>
                      <button
                        className="dash-light-card-btn"
                        data-testid={`button-resale-report-${h.id}`}
                      >
                        {houses.length > 1 ? (h.name || "Report") : "Get Report"} →
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Referral Card — paid subscribers only */}
            {isPaidSubscriber && (
              <div className="dash-light-card" data-tour-id="referral">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div className="dash-light-card-icon">
                    <Gift size={18} />
                  </div>
                  <div>
                    <div className="dash-light-card-title">Earn a Free Subscription</div>
                    <div className="dash-light-card-sub">
                      {referralsRemaining === 0
                        ? "You've earned a free subscription!"
                        : `${referralsRemaining} more paid referral${referralsRemaining !== 1 ? "s" : ""} needed`}
                    </div>
                  </div>
                </div>
                <Progress value={progressPercentage} className="h-2 mb-3" data-testid="progress-referral-subscription" />
                <Link href="/homeowner-referral">
                  <button className="dash-light-card-btn" data-testid="button-share-invite-link" style={{ width: "100%", justifyContent: "center" }}>
                    Share Your Invite Link →
                  </button>
                </Link>
              </div>
            )}

          </div>
        </HomeownerFeatureGate>
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
                    <Card className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: "#f2f2f2" }}>
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

      {showBackToTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" data-testid="button-back-to-top" style={{ position: 'fixed', bottom: '88px', right: '16px', zIndex: 50, width: 44, height: 44, borderRadius: '50%', backgroundColor: '#2c0f5b', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(44,15,91,0.45)' }}>
          <ChevronUp style={{ width: 20, height: 20 }} />
        </button>
      )}
    </div>
  );
}
