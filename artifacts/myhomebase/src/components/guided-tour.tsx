import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, CheckCircle2, Home, Wrench, ClipboardList, Package, Users, Trophy, ArrowRight, Star, Settings, TrendingUp, FolderOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/my-homebase-logo-tm-final-white_1777413931548.png";

const TOUR_STATE_KEY = "mhb_guided_tour";

interface TourState {
  phase: "welcome" | "tour" | "inactive";
  stepIndex: number;
}

interface StepDef {
  tourId: string;
  page: string;
  title: string;
  body: string;
  icon: typeof Home;
  preferBelow?: boolean;
}

const STEPS: StepDef[] = [
  {
    tourId: "health-score",
    page: "/",
    title: "Your Home Wellness Score™",
    body: "This score reflects how well-documented your home is. It grows every time you complete a maintenance task — giving you better protection for insurance claims and resale.",
    icon: Star,
    preferBelow: false,
  },
  {
    tourId: "property-details",
    page: "/",
    title: "Your Home Profile",
    body: "Add your home's mechanical systems — HVAC, roof, plumbing, and more — to get personalized maintenance tasks tailored to your specific home.",
    icon: Home,
    preferBelow: true,
  },
  {
    tourId: "resale-report",
    page: "/",
    title: "AI Resale Readiness Report",
    body: "Thinking about selling? Generate an AI-powered report that grades your home's resale readiness, highlights buyer strengths, surfaces concerns to fix, and gives you a prioritized action plan.",
    icon: TrendingUp,
    preferBelow: true,
  },
  {
    tourId: "home-systems",
    page: "/maintenance",
    title: "Home Systems & Features",
    body: "Check off every system your home has — heating, cooling, water, roof, and more. Log each system's installation year to unlock age-based maintenance recommendations personalized to your equipment.",
    icon: Settings,
    preferBelow: true,
  },
  {
    tourId: "task-list",
    page: "/maintenance",
    title: "Monthly Maintenance Tasks",
    body: "Every month you get a personalized maintenance list based on your home's location, climate, and features. These tasks protect your home's health and your insurance coverage.",
    icon: ClipboardList,
    preferBelow: false,
  },
  {
    tourId: "task-complete",
    page: "/maintenance",
    title: "Completing a Task",
    body: "Tap any task card to view details and mark it complete. Your Home Wellness Score™ goes up with every task — building your verified maintenance record over time.",
    icon: CheckCircle2,
    preferBelow: false,
  },
  {
    tourId: "service-records",
    page: "/service-records",
    title: "Your Service History",
    body: "Every task you complete and every contractor visit gets logged here automatically. You can also add records manually — with dates, costs, and photos all in one place.",
    icon: Wrench,
    preferBelow: true,
  },
  {
    tourId: "appliances",
    page: "/maintenance",
    title: "Home Appliances",
    body: "Add your appliances with model and serial numbers. We'll store your owner's manuals and alert you to any recalls or warranty expirations automatically.",
    icon: Package,
    preferBelow: false,
  },
  {
    tourId: "documents",
    page: "/documents",
    title: "Documents & Disclosures",
    body: "Store all your home records in one secure place — inspection reports, warranties, permits, insurance docs, and seller disclosure forms. Everything you need for a smooth sale or insurance claim.",
    icon: FolderOpen,
    preferBelow: true,
  },
  {
    tourId: "find-contractors",
    page: "/contractors",
    title: "Finding Contractors",
    body: "Find verified contractors in your area — linked to real service records and homeowner reviews. When you hire through MyHomeBase™, they can upload your service records directly.",
    icon: Users,
    preferBelow: true,
  },
  {
    tourId: "achievements",
    page: "/achievements",
    title: "Achievements & Referrals",
    body: "Earn medals and achievements as you complete tasks. Complete every task in a month for a Perfect Month medal. Share your referral code — you both get a free month!",
    icon: Trophy,
    preferBelow: false,
  },
];

function useGuidedTourState() {
  const [tourState, setTourStateRaw] = useState<TourState>({ phase: "inactive", stepIndex: 0 });

  const setTourState = useCallback((state: TourState) => {
    setTourStateRaw(state);
    localStorage.setItem(TOUR_STATE_KEY, JSON.stringify(state));
  }, []);

  return { tourState, setTourState };
}

// Tooltip positioning
function computeTooltipStyle(rect: DOMRect, preferBelow: boolean): React.CSSProperties {
  const TOOLTIP_W = 320;
  const TOOLTIP_H = 220;
  const GAP = 16;
  const MARGIN = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top: number;
  const spaceBelow = vh - (rect.bottom + GAP + TOOLTIP_H);
  const spaceAbove = rect.top - GAP - TOOLTIP_H;

  if (preferBelow && spaceBelow > 0) {
    top = rect.bottom + GAP;
  } else if (!preferBelow && spaceAbove > 0) {
    top = rect.top - TOOLTIP_H - GAP;
  } else if (spaceBelow > 0) {
    top = rect.bottom + GAP;
  } else if (spaceAbove > 0) {
    top = rect.top - TOOLTIP_H - GAP;
  } else {
    top = Math.max(MARGIN, Math.min(vh - TOOLTIP_H - MARGIN, rect.top + rect.height / 2 - TOOLTIP_H / 2));
  }

  // Horizontal: center on element, clamp to viewport
  let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
  left = Math.max(MARGIN, Math.min(vw - TOOLTIP_W - MARGIN, left));

  return { top, left, width: TOOLTIP_W };
}

// Arrow pointing from tooltip to element
function ArrowSvg({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 20) return null;
  return (
    <svg
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10001, pointerEvents: "none" }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#7c3aed" />
        </marker>
      </defs>
      <line
        x1={from.x} y1={from.y}
        x2={to.x} y2={to.y}
        stroke="#7c3aed"
        strokeWidth="2.5"
        strokeDasharray="6 4"
        markerEnd="url(#arrowhead)"
      />
    </svg>
  );
}

// Welcome / Completion modals
function WelcomeModal({
  agent,
  onStart,
  onSkip,
}: {
  agent: { firstName: string; lastName: string; profileImageUrl?: string | null } | null;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[10010] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="relative rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
        style={{ background: "linear-gradient(135deg, #2c0f5b 0%, #4a1a8c 100%)" }}
      >
        <div className="flex justify-center mb-4">
          <img src={logoPath} alt="MyHomeBase™" className="h-14 object-contain" />
        </div>

        {agent && (
          <div className="flex flex-col items-center mb-5">
            {agent.profileImageUrl ? (
              <img
                src={`/public/${agent.profileImageUrl}`}
                alt={`${agent.firstName} ${agent.lastName}`}
                className="w-14 h-14 rounded-full object-cover border-2 border-purple-300 mb-2"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center text-white text-xl font-bold mb-2">
                {agent.firstName[0]}{agent.lastName[0]}
              </div>
            )}
            <p className="text-purple-200 text-sm">
              Referred by <span className="font-semibold text-white">{agent.firstName} {agent.lastName}</span>
            </p>
          </div>
        )}

        <h1 className="text-2xl font-bold text-white mb-2">Welcome to MyHomeBase™</h1>
        <p className="text-purple-200 text-sm mb-6 leading-relaxed">
          Your personal home management platform. We'll show you around in about 3 minutes.
        </p>

        <Button
          onClick={onStart}
          className="w-full mb-3 font-bold py-3 text-base"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}
        >
          Let's Go
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-sm text-purple-300 hover:text-white transition-colors"
        >
          Skip Tour
        </button>
      </div>
    </div>
  );
}

function CompletionModal({
  onDone,
  onShare,
}: {
  onDone: () => void;
  onShare: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[10010] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="relative rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
        style={{ background: "linear-gradient(135deg, #2c0f5b 0%, #4a1a8c 100%)" }}
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">You're All Set!</h1>
        <p className="text-purple-200 text-sm mb-6 leading-relaxed">
          Here's what to do next to start protecting your home.
        </p>

        <div className="text-left space-y-3 mb-6">
          {[
            { icon: ClipboardList, text: "Complete your first maintenance task this month" },
            { icon: Home, text: "Add your home's mechanical features for personalized tasks" },
            { icon: Users, text: "Invite your contractor to upload your service records directly" },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="w-7 h-7 rounded-full bg-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-purple-100">{text}</p>
            </div>
          ))}
        </div>

        <Button
          onClick={onDone}
          className="w-full mb-3 font-bold py-3 text-base"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}
        >
          Go To My Dashboard
        </Button>
        <button
          onClick={onShare}
          className="w-full text-sm text-purple-300 hover:text-white transition-colors"
        >
          Share MyHomeBase™ with a Friend
        </button>
      </div>
    </div>
  );
}

// The "Continue Your Tour" resume banner
export function TourResumeBanner({ onContinue, onDismiss }: { onContinue: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9990] flex items-center justify-between px-4 py-3 shadow-lg" style={{ background: "#2c0f5b" }}>
      <div className="flex items-center gap-2 text-white text-sm font-medium">
        <Home className="w-4 h-4 text-purple-300 flex-shrink-0" />
        <span>Continue your setup tour where you left off</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onContinue}
          className="text-xs font-semibold"
          style={{ background: "#10b981", color: "white" }}
        >
          Continue <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
        <button onClick={onDismiss} className="text-purple-300 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Main guided tour component — mount in App.tsx
export function GuidedTour() {
  const { user } = useAuth();
  const typedUser = user as User | undefined;
  const [location, setLocation] = useLocation();
  const qc = useQueryClient();

  const { tourState, setTourState } = useGuidedTourState();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const findTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigatedForStepRef = useRef<number | null>(null);
  const setLocationRef = useRef(setLocation);
  useEffect(() => { setLocationRef.current = setLocation; }, [setLocation]);

  // Wizard progress from server
  const { data: wizardProgress } = useQuery<{ step: number; completedAt: string | null; data: object }>({
    queryKey: ["/api/homeowner/wizard-progress"],
    enabled: !!typedUser && typedUser.role === "homeowner" && !typedUser.id?.startsWith("demo-"),
  });

  // Referring agent
  const { data: referringAgent } = useQuery<{
    firstName: string;
    lastName: string;
    profileImageUrl?: string | null;
  } | null>({
    queryKey: ["/api/referring-agent"],
    queryFn: async () => {
      const res = await fetch("/api/referring-agent");
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!typedUser && typedUser.role === "homeowner" && !typedUser.id?.startsWith("demo-"),
  });

  // Save tour completion to server
  const completeMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/homeowner/wizard-progress", { step: 10, data: { tourCompleted: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/homeowner/wizard-progress"] }),
  });

  // Initialize tour state from localStorage + server
  useEffect(() => {
    if (!typedUser || typedUser.role !== "homeowner" || typedUser.id?.startsWith("demo-")) {
      setHasInitialized(true);
      return;
    }
    if (wizardProgress === undefined) return; // still loading

    // Already completed
    if (wizardProgress?.completedAt) {
      setHasInitialized(true);
      return;
    }

    // Load from localStorage
    const saved = localStorage.getItem(TOUR_STATE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TourState;
        if (parsed.phase === "tour" || parsed.phase === "welcome") {
          setTourState(parsed);
        }
      } catch {}
    } else {
      // First visit — show welcome
      setTourState({ phase: "welcome", stepIndex: 0 });
    }

    setHasInitialized(true);
  }, [typedUser, wizardProgress, setTourState]);

  const currentStep = tourState.phase === "tour" ? STEPS[tourState.stepIndex] : null;

  // Stable ref to current step so closures inside timers always read the latest value
  const currentStepRef = useRef(currentStep);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);

  // Find element and measure it — reads from ref so it's always stable
  const findElement = useCallback(() => {
    const step = currentStepRef.current;
    if (!step) return false;
    const el = document.querySelector(`[data-tour-id="${step.tourId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const el2 = document.querySelector(`[data-tour-id="${step.tourId}"]`);
        if (el2) setTargetRect(el2.getBoundingClientRect());
      }, 350);
      return true;
    }
    return false;
  }, []); // stable — reads refs, not captured values

  // Navigate to the correct page when the step changes, then poll for the element.
  // Intentionally does NOT depend on `location` or `setLocation` to avoid re-triggering
  // the effect every time the URL updates (which caused the infinite render loop).
  useEffect(() => {
    if (tourState.phase !== "tour" || !currentStep) {
      setTargetRect(null);
      return;
    }

    // Clear old timers
    if (findTimerRef.current) clearTimeout(findTimerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);

    const needsNavigation = location !== currentStep.page;

    if (needsNavigation && navigatedForStepRef.current !== tourState.stepIndex) {
      // Only navigate once per step to prevent looping
      navigatedForStepRef.current = tourState.stepIndex;
      setTargetRect(null);
      setIsNavigating(true);
      setLocationRef.current(currentStep.page);
      // Poll until the target element appears in the DOM
      let attempts = 0;
      pollRef.current = setInterval(() => {
        const found = findElement();
        attempts++;
        if (found || attempts > 30) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setIsNavigating(false);
        }
      }, 200);
    } else if (!needsNavigation) {
      // Already on the right page — just find the element
      navigatedForStepRef.current = null;
      setIsNavigating(false);
      findTimerRef.current = setTimeout(findElement, 300);
    }

    return () => {
      if (findTimerRef.current) clearTimeout(findTimerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourState.phase, tourState.stepIndex]);

  // Update rect on resize/scroll
  useEffect(() => {
    if (!currentStep || tourState.phase !== "tour") return;
    const update = () => {
      const el = document.querySelector(`[data-tour-id="${currentStep.tourId}"]`);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, { capture: true });
    };
  }, [tourState.phase, currentStep]);

  const goNext = useCallback(() => {
    const nextIndex = tourState.stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setTargetRect(null);
      setTourState({ phase: "tour", stepIndex: nextIndex });
    } else {
      // Tour complete — keep "inactive" state in localStorage so it never reappears
      setTourState({ phase: "inactive", stepIndex: 0 });
      completeMutation.mutate();
      setLocation("/");
    }
  }, [tourState.stepIndex, setTourState, completeMutation, setLocation]);

  const skipTour = useCallback(() => {
    // Keep "inactive" state in localStorage so tour never reappears, even if API call fails
    setTourState({ phase: "inactive", stepIndex: 0 });
    completeMutation.mutate();
  }, [setTourState, completeMutation]);

  const startTour = useCallback(() => {
    const newState: TourState = { phase: "tour", stepIndex: 0 };
    setTourState(newState);
    setTargetRect(null);
  }, [setTourState]);

  const continueTour = useCallback(() => {
    setTourState({ ...tourState, phase: "tour" });
  }, [tourState, setTourState]);

  // Only the pages that are actually part of the tour (plus "/" for the welcome modal)
  const TOUR_PAGES = Array.from(new Set(STEPS.map((s) => s.page)));
  const isOnTourPage = TOUR_PAGES.includes(location);

  // Don't render for non-homeowners / demo / not initialized
  if (!hasInitialized) return null;
  if (!typedUser || typedUser.role !== "homeowner" || typedUser.id?.startsWith("demo-")) return null;
  if (tourState.phase === "inactive") return null;

  // Only show tour UI on pages that are part of the tour flow
  if (!isOnTourPage) return null;

  // Welcome modal
  if (tourState.phase === "welcome") {
    return createPortal(
      <WelcomeModal agent={referringAgent || null} onStart={startTour} onSkip={skipTour} />,
      document.body
    );
  }

  if (tourState.phase === "tour" && currentStep) {
    const PAD = 10;
    const isOnWrongPage = location !== currentStep.page;
    const Icon = currentStep.icon;

    // Tooltip and arrow geometry
    let tooltipStyle: React.CSSProperties = {};
    let arrowFrom = { x: 0, y: 0 };
    let arrowTo = { x: 0, y: 0 };
    let showArrow = false;

    if (targetRect) {
      tooltipStyle = computeTooltipStyle(targetRect, currentStep.preferBelow !== false);
      const tleft = (tooltipStyle.left as number) || 0;
      const ttop = (tooltipStyle.top as number) || 0;
      const tw = (tooltipStyle.width as number) || 320;

      // Arrow from center of tooltip to center of element
      arrowFrom = { x: tleft + tw / 2, y: ttop + 110 };
      arrowTo = {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2,
      };
      showArrow = true;
    } else {
      // Centered fallback
      tooltipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 320 };
    }

    return createPortal(
      <>
        {/* Dimming overlay — allows click-through to highlighted element */}
        <div
          className="fixed inset-0 z-[9998]"
          style={{ pointerEvents: "none", background: targetRect ? "transparent" : "rgba(0,0,0,0.5)" }}
        />

        {/* Spotlight hole using box-shadow */}
        {targetRect && !isOnWrongPage && (
          <div
            style={{
              position: "fixed",
              top: targetRect.top - PAD,
              left: targetRect.left - PAD,
              width: targetRect.width + PAD * 2,
              height: targetRect.height + PAD * 2,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
              borderRadius: 10,
              zIndex: 9999,
              pointerEvents: "none",
              transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        )}

        {/* Arrow */}
        {showArrow && !isOnWrongPage && (
          <ArrowSvg from={arrowFrom} to={arrowTo} />
        )}

        {/* Tooltip */}
        <div
          style={{
            position: "fixed",
            zIndex: 10002,
            ...tooltipStyle,
          }}
        >
          <div
            className="rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #2c0f5b 0%, #4a1a8c 100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-400 bg-opacity-30 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-purple-200" />
                </div>
                <span className="text-purple-300 text-xs font-medium">
                  Step {tourState.stepIndex + 1} of {STEPS.length}
                </span>
              </div>
              <button onClick={skipTour} className="text-purple-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-2">
              <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                <div
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    background: "linear-gradient(90deg, #10b981, #059669)",
                    width: `${((tourState.stepIndex + 1) / STEPS.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-4">
              <h3 className="text-white font-bold text-base mb-1">{currentStep.title}</h3>
              <p className="text-purple-200 text-sm leading-relaxed mb-4">{currentStep.body}</p>

              {isNavigating && (
                <p className="text-purple-300 text-xs mb-3 animate-pulse">Navigating...</p>
              )}

              <div className="flex justify-between items-center">
                <button
                  onClick={skipTour}
                  className="text-purple-400 text-xs hover:text-purple-200 transition-colors"
                >
                  Skip tour
                </button>
                <Button
                  onClick={goNext}
                  size="sm"
                  className="font-semibold text-sm"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}
                >
                  {tourState.stepIndex < STEPS.length - 1 ? "Next" : "Finish"}{" "}
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Resume banner (when on wrong page mid-tour) */}
        {isOnWrongPage && !isNavigating && (
          <TourResumeBanner onContinue={continueTour} onDismiss={skipTour} />
        )}
      </>,
      document.body
    );
  }

  return null;
}
