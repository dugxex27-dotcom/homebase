import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Calendar, Search, Star, TrendingUp, Gift, Sparkles, FileText, AlertTriangle, ClipboardList, Bell, ChevronRight, ChevronDown, ChevronUp, Phone, Mail, Globe, MapPin, X as XIcon, Wrench, DollarSign, Info, CheckCircle2, Clock, Plus, Thermometer, Droplets, Home as HomeIcon } from "lucide-react";
import HouseMap from "@/components/house-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType, House } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useHomeownerSubscription } from "@/hooks/useHomeownerSubscription";
import { RESTART_HOMEOWNER_TOUR_EVENT } from "@/lib/guided-tour-events";
import { notifyInvoiceBadgeChanged } from "@/lib/queryClient";
import logoHomeowner from "@assets/my-homebase-logo-tm-final-white_1777417516350.png";
import { getHomeWellnessScoreStatus } from "@/lib/home-wellness-score";
import { AchievementProgressStrip } from "@/components/achievement-progress-strip";
import "./home.css";

// Sample house banner
function DemoWarningBanner() {
  const { user } = useAuth();

  if (!(user as any)?.isDemoAccount) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 sticky top-0 z-40 flex items-center justify-between text-sm shadow-sm" style={{ paddingLeft: 'calc(16px + env(safe-area-inset-left))', paddingRight: 'calc(16px + env(safe-area-inset-right))' }}>
      <div className="flex items-center gap-2 text-amber-800">
        <Info className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">You are viewing a sample home.</span>
      </div>
      <Button size="sm" onClick={() => window.location.href = '/signin'} className="bg-amber-600 hover:bg-amber-700 text-white border-0 text-xs px-3 h-8 shadow-sm transition-transform active:scale-95 font-bold shrink-0">
        Start My Real Home
      </Button>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getMonth() {
  return new Date().toLocaleString("default", { month: "long" });
}

const MECHANICAL_FEATURES: Array<{ key: "roofInstalledYear" | "hvacInstalledYear" | "waterHeaterInstalledYear"; label: string; icon: React.ReactNode; lifespan: [number, number]; category: string }> = [
  { key: "roofInstalledYear", label: "Roof", icon: <HomeIcon size={18} />, lifespan: [20, 25], category: "roofing" },
  { key: "hvacInstalledYear", label: "HVAC", icon: <Thermometer size={18} />, lifespan: [15, 20], category: "hvac" },
  { key: "waterHeaterInstalledYear", label: "Water Heater", icon: <Droplets size={18} />, lifespan: [8, 12], category: "plumbing" },
];

type ContractorProposalSummary = {
  status: string;
};

type ContractorRatingSummary = {
  averageRating: number;
  totalReviews: number;
};

type ContractorLeadSummary = {
  status: string;
  createdAt: string | Date | null;
};

type MaintenanceTasksResponse = {
  tasks?: {
    seasonal?: unknown[];
    weatherSpecific?: unknown[];
  };
};

type OnboardingProgress = {
  completedAt: string | null;
};

type QuizResult = {
  id: string;
  score: number;
  tier: string;
  completedAt: string;
  createdAt: string;
};

function getMechanicalAgeInfo(house: House) {
  const currentYear = new Date().getFullYear();
  return MECHANICAL_FEATURES.map(({ key, label, icon, lifespan, category }) => {
    const installedYear = house[key] as number | null | undefined;
    if (!installedYear) {
      return { label, icon, category, tone: "unknown" as const, text: "Add install year to raise your score" };
    }
    const age = currentYear - installedYear;
    const [min, max] = lifespan;
    const tone = age <= min ? "good" as const : age <= max ? "warn" as const : "alert" as const;
    const status = age <= min ? "Good condition" : age <= max ? "Aging — plan ahead" : "Past typical lifespan";
    return { label, icon, category, tone, text: `${age} yr${age === 1 ? "" : "s"} old · installed ${installedYear} · ${status}` };
  });
}

export default function Home() {
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  const [, setLocation] = useLocation();
  const { isPaidSubscriber, subscriptionStatus, isFreeUser, isLoading: subLoading } = useHomeownerSubscription();
  const queryClient = useQueryClient();
  const [onboardingBannerDismissed, setOnboardingBannerDismissed] = useState(false);

  useEffect(() => {
    if (!typedUser?.id) return;
    setOnboardingBannerDismissed(
      sessionStorage.getItem(`${ONBOARDING_BANNER_DISMISSED_KEY}:${typedUser.id}`) === "true",
    );
  }, [typedUser?.id]);

  // Redirect contractors and agents to their dashboards; redirect inactive homeowners to trial setup
  useEffect(() => {
    if (typedUser?.role === "contractor") {
      setLocation("/contractor-dashboard");
    } else if (typedUser?.role === "agent") {
      setLocation("/agent-dashboard");
    }
  }, [typedUser, setLocation]);

  const isContractor = typedUser?.role === "contractor" && !!typedUser.id;

  // Reuse the same authenticated data sources as the contractor dashboard,
  // review summary, and CRM screens. These queries are contractor-only so
  // homeowner dashboard loads do not request contractor data.
  const {
    data: contractorProposals = [],
    isLoading: isLoadingContractorProposals,
    isError: isContractorProposalsError,
  } = useQuery<ContractorProposalSummary[]>({
    queryKey: ["/api/proposals", typedUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/proposals?contractorId=${typedUser?.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch contractor projects");
      return response.json();
    },
    enabled: isContractor,
  });

  const {
    data: contractorRating,
    isLoading: isLoadingContractorRating,
    isError: isContractorRatingError,
  } = useQuery<ContractorRatingSummary>({
    queryKey: ["/api/contractors", typedUser?.id, "rating"],
    queryFn: async () => {
      const response = await fetch(`/api/contractors/${typedUser?.id}/rating`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch contractor rating");
      return response.json();
    },
    enabled: isContractor,
  });

  const {
    data: contractorLeads = [],
    isLoading: isLoadingContractorLeads,
    isError: isContractorLeadsError,
  } = useQuery<ContractorLeadSummary[]>({
    queryKey: ["/api/crm/leads", typedUser?.id],
    queryFn: async () => {
      const response = await fetch("/api/crm/leads", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch contractor leads");
      return response.json();
    },
    enabled: isContractor,
  });

  const activeProjectCount = contractorProposals.filter(
    (proposal) => proposal.status === "accepted",
  ).length;
  const recentNewLeadCount = contractorLeads.filter((lead) => {
    if (lead.status !== "new" || !lead.createdAt) return false;
    const createdAt = new Date(lead.createdAt).getTime();
    return !Number.isNaN(createdAt) && createdAt >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;


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

  const { data: quizResult, isLoading: isLoadingQuizResult } = useQuery<QuizResult | null>({
    queryKey: ["/api/quiz-result/me"],
    enabled: typedUser?.role === "homeowner",
  });

  const { data: onboardingProgress } = useQuery<OnboardingProgress>({
    queryKey: ["/api/onboarding/progress"],
    enabled: typedUser?.role === "homeowner" && !typedUser.id?.startsWith("demo-"),
  });

  const { data: unreadNotifications = [] } = useQuery<OnboardingReminder[]>({
    queryKey: ["/api/notifications/unread"],
    enabled: typedUser?.role === "homeowner" && !typedUser.id?.startsWith("demo-"),
  });

  // Houses
  const { data: houses = [], isLoading: isLoadingHouses } = useQuery<House[]>({
    queryKey: ["/api/houses"],
    enabled: typedUser?.role === "homeowner",
  });

  // Health scores per house (for stat chips). Fetch every house in parallel
  // instead of limiting the dashboard to a fixed number of score queries.
  const { data: scoresByHouseId = {} } = useQuery<Record<string, { score: number }>>({
    queryKey: ["/api/houses", houses.map((house) => house.id), "health-scores"],
    queryFn: async () => {
      const scoreEntries = await Promise.all(
        houses.map(async (house) => {
          const response = await fetch(`/api/houses/${house.id}/health-score`, {
            credentials: "include",
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch the health score for ${house.id}`);
          }
          return [house.id, await response.json()] as const;
        }),
      );

      return Object.fromEntries(scoreEntries) as Record<string, { score: number }>;
    },
    enabled: houses.length > 0 && typedUser?.role === "homeowner",
  });

  // Maintenance tasks for the task count chip. Fetch each property's task
  // plan so multi-property homeowners see the combined count.
  const { data: tasksByHouseId = {} } = useQuery<Record<string, MaintenanceTasksResponse>>({
    queryKey: ["/api/houses", houses.map((house) => house.id), "maintenance-tasks"],
    queryFn: async () => {
      const taskEntries = await Promise.all(
        houses.map(async (house) => {
          const response = await fetch(`/api/houses/${house.id}/maintenance-tasks`, {
            credentials: "include",
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch maintenance tasks for ${house.id}`);
          }
          return [house.id, await response.json()] as const;
        }),
      );

      return Object.fromEntries(taskEntries) as Record<string, MaintenanceTasksResponse>;
    },
    enabled: houses.length > 0 && typedUser?.role === "homeowner",
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

  // Pending contractor job records (contractor pushed completed job to homeowner)
  interface PendingJobRecord {
    id: string;
    contractorName: string | null;
    contractorCompany: string | null;
    serviceType: string;
    serviceDescription: string | null;
    completionNotes: string | null;
    equipmentInfo: Array<{ name: string; brand?: string; model?: string; serialNumber?: string; installedYear?: string }>;
    photos: string[];
    nextServiceDate: string | null;
    nextServiceNotes: string | null;
    status: string;
    createdAt: string;
  }
  const { data: pendingJobRecords = [] } = useQuery<PendingJobRecord[]>({
    queryKey: ["/api/homeowner/pending-job-records"],
    enabled: typedUser?.role === "homeowner",
    refetchInterval: 60000,
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
  const unlinkInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await fetch(`/api/homeowner/unlink-invoice/${invoiceId}`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to dismiss invoice');
      return res.json();
    },
    onSuccess: (_, invoiceId) => {
      queryClient.setQueryData<typeof linkedInvoices>(
        ["/api/homeowner/linked-invoices"],
        (current = []) => current.filter(invoice => invoice.id !== invoiceId),
      );
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/linked-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/linked-invoices/unclaimed-count"] });
    },
  });

  // Accept / decline contractor job records
  const acceptJobRecordMutation = useMutation({
    mutationFn: async ({ id, houseId }: { id: string; houseId: string }) => {
      const res = await fetch(`/api/homeowner/pending-job-records/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ houseId }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to accept');
      return res.json();
    },
    onSuccess: (_, { id }) => {
      setAcceptedJobRecordIds(prev => new Set(prev).add(id));
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/pending-job-records"] });
    },
  });
  const declineJobRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/homeowner/pending-job-records/${id}/decline`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to dismiss');
      return res.json();
    },
    onSuccess: (_, id) => {
      setDeclinedJobRecordIds(prev => new Set(prev).add(id));
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/pending-job-records"] });
    },
  });

  const markInvoicesViewedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/homeowner/linked-invoices/mark-all-viewed`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark invoices as viewed');
    },
    onMutate: async () => {
      const queryKey = ["/api/homeowner/linked-invoices/unclaimed-count"] as const;
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<{ count: number }>(queryKey);
      queryClient.setQueryData<{ count: number }>(queryKey, { count: 0 });
      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["/api/homeowner/linked-invoices/unclaimed-count"],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/linked-invoices/unclaimed-count"] });
    },
    onSuccess: () => {
      notifyInvoiceBadgeChanged();
    },
  });

  const dismissOnboardingBannerMutation = useMutation({
    mutationFn: async (notificationId: string | undefined) => {
      if (!notificationId) return;
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to mark onboarding reminder as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    },
  });

  // Install-year inline nudge — must be the last useMutation call in this component
  const [activeNudge, setActiveNudge] = useState<string | null>(null);
  const [nudgeYear, setNudgeYear] = useState("");
  // Ref-based guard: prevents double-firing mutate on rapid double-clicks before
  // the component can re-render and apply the isPending-based disabled state.
  const nudgeSavingRef = useRef(false);
  const patchInstallYearMutation = useMutation({
    mutationFn: async ({ houseId, field, year }: { houseId: string; field: string; year: number }) => {
      const res = await fetch(`/api/houses/${houseId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: year }),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      nudgeSavingRef.current = false;
      setActiveNudge(null);
      setNudgeYear("");
      if (variables) {
        const { houseId, field, year } = variables;
        queryClient.setQueryData<House[]>(["/api/houses"], (current = []) =>
          current.map((house) =>
            house.id === houseId ? { ...house, [field]: year } : house,
          ),
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/houses"] });
    },
    onError: () => {
      nudgeSavingRef.current = false;
    },
  });

  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [contractorInvoicesExpanded, setContractorInvoicesExpanded] = useState(false);
  const [claimedInvoiceIds, setClaimedInvoiceIds] = useState<Set<string>>(new Set());
  const [acceptedJobRecordIds, setAcceptedJobRecordIds] = useState<Set<string>>(new Set());
  const [declinedJobRecordIds, setDeclinedJobRecordIds] = useState<Set<string>>(new Set());
  const [jobRecordHouseOverrides, setJobRecordHouseOverrides] = useState<Record<string, string>>({});
  // Per-invoice house overrides: homeowner can reassign before saving
  const [invoiceHouseOverrides, setInvoiceHouseOverrides] = useState<Record<string, string>>({});
  const [changingHouseForInvoice, setChangingHouseForInvoice] = useState<string | null>(null);
  const [hwsModalOpen, setHwsModalOpen] = useState(false);
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  const [systemsModalOpen, setSystemsModalOpen] = useState(false);
  const [nudgeDismissedFromStorage, setNudgeDismissedFromStorage] = useState(false);
  const [nudgeDismissedThisSession, setNudgeDismissedThisSession] = useState(false);

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
  const houseScores = houses.map((house) => ({
    house,
    score: scoresByHouseId[house.id]?.score,
  }));
  const totalSystems = houses.reduce((sum, h) => sum + (Array.isArray(h.homeSystems) ? h.homeSystems.length : 0), 0);
  const taskPlans = Object.values(tasksByHouseId);
  const tasksCount = taskPlans.length > 0
    ? taskPlans.reduce(
        (total, taskPlan) =>
          total +
          (taskPlan.tasks?.seasonal?.length || 0) +
          (taskPlan.tasks?.weatherSpecific?.length || 0),
        0,
      )
    : null;

  const firstName = (typedUser as any)?.firstName || (typedUser as any)?.name?.split(" ")[0] || "";
  const climateZone = houses[0]?.climateZone || "your area";

  const getScoreClass = (s: number | undefined) =>
    s === undefined ? "" : getHomeWellnessScoreStatus(s).label === "Excellent" || getHomeWellnessScoreStatus(s).label === "Doing Well"
      ? "good"
      : getHomeWellnessScoreStatus(s).label === "Progressing" ? "warn" : "alert";

  // Profile nudge: show inline-edit card when any install year is missing
  const primaryHouse = houses[0] as House | undefined;
  const primaryHouseScore = primaryHouse ? scoresByHouseId[primaryHouse.id]?.score : undefined;
  const profileFields = primaryHouse
    ? [
        primaryHouse.yearBuilt,
        primaryHouse.squareFootage,
        primaryHouse.roofInstalledYear,
        primaryHouse.hvacInstalledYear,
        primaryHouse.waterHeaterInstalledYear,
      ]
    : [];
  const completedProfileFields = profileFields.filter(
    (value) => value !== null && value !== undefined,
  ).length;
  const profileCompletePct = profileFields.length > 0
    ? Math.round((completedProfileFields / profileFields.length) * 100)
    : 0;
  const isProfileComplete = profileCompletePct === 100;
  const isLowScore = primaryHouseScore !== undefined && primaryHouseScore < 30;
  const profileNudgeMissing = primaryHouse
    ? MECHANICAL_FEATURES.filter(f => !primaryHouse[f.key as keyof House])
    : [];
  const nudgeDismissed = isLowScore
    ? nudgeDismissedThisSession
    : nudgeDismissedFromStorage || nudgeDismissedThisSession;
  const showProfileNudge = profileNudgeMissing.length > 0 && !nudgeDismissed;
  const nudgeYearNum = parseInt(nudgeYear, 10);
  const nudgeYearValid = nudgeYear !== "" && !isNaN(nudgeYearNum) && nudgeYearNum >= 1900 && nudgeYearNum <= new Date().getFullYear();

  useEffect(() => {
    setNudgeDismissedFromStorage(
      primaryHouse
        ? localStorage.getItem(`profile-nudge-dismissed-${primaryHouse.id}`) === "1"
        : false,
    );
  }, [primaryHouse?.id]);

  const handleDismissProfileNudge = () => {
    if (primaryHouse && primaryHouseScore !== undefined && !isLowScore) {
      localStorage.setItem(`profile-nudge-dismissed-${primaryHouse.id}`, "1");
      setNudgeDismissedFromStorage(true);
    }
    setNudgeDismissedThisSession(true);
  };

  const handleNudgeSave = (field: string) => {
    if (!nudgeYearValid || !primaryHouse || patchInstallYearMutation.isPending || nudgeSavingRef.current) return;
    nudgeSavingRef.current = true;
    patchInstallYearMutation.mutate({ houseId: primaryHouse.id, field, year: nudgeYearNum });
  };

  const onboardingReminder = unreadNotifications.find(
    (notification) => notification.type === "onboarding_reminder",
  );
  const nextUpActions: Array<{
    title: string;
    detail: string;
    href: string;
    icon: React.ReactNode;
  }> = [];
  const pendingRecordCount = (pendingJobRecords as PendingJobRecord[]).filter(
    (record) => !acceptedJobRecordIds.has(record.id) && !declinedJobRecordIds.has(record.id),
  ).length;

  if (pendingRecordCount > 0) {
    nextUpActions.push({
      title: "Review contractor records",
      detail: `${pendingRecordCount} record${pendingRecordCount === 1 ? "" : "s"} ready to review`,
      href: "/service-records",
      icon: <CheckCircle2 size={18} />,
    });
  }
  if (!isProfileComplete) {
    nextUpActions.push({
      title: "Complete your home profile",
      detail: `${profileCompletePct}% complete`,
      href: "/maintenance",
      icon: <HomeIcon size={18} />,
    });
  }
  if (tasksCount && tasksCount > 0) {
    nextUpActions.push({
      title: "Review maintenance work",
      detail: `${tasksCount} task${tasksCount === 1 ? "" : "s"} in your plan`,
      href: "/maintenance",
      icon: <ClipboardList size={18} />,
    });
  }
  if (primaryHouseScore !== undefined) {
    nextUpActions.push({
      title: "Improve your Wellness Score",
      detail: `${primaryHouseScore} · ${getHomeWellnessScoreStatus(primaryHouseScore).label}`,
      href: "/maintenance",
      icon: <TrendingUp size={18} />,
    });
  }
  if (nextUpActions.length < 3) {
    nextUpActions.push({
      title: "Strengthen your home record",
      detail: "Add files, insurance details, or disclosures",
      href: "/documents",
      icon: <FileText size={18} />,
    });
  }
  if (nextUpActions.length < 3) {
    nextUpActions.push({
      title: "Find a trusted pro",
      detail: "Search by trade and location",
      href: "/contractors",
      icon: <Search size={18} />,
    });
  }
  const showOnboardingBanner =
    typedUser?.role === "homeowner" &&
    onboardingProgress !== undefined &&
    onboardingProgress.completedAt === null &&
    !onboardingBannerDismissed;

  const dismissOnboardingBanner = () => {
    if (typedUser?.id) {
      sessionStorage.setItem(`${ONBOARDING_BANNER_DISMISSED_KEY}:${typedUser.id}`, "true");
    }
    setOnboardingBannerDismissed(true);
    dismissOnboardingBannerMutation.mutate(onboardingReminder?.id);
  };

  const restartOnboardingTour = () => {
    window.dispatchEvent(new Event(RESTART_HOMEOWNER_TOUR_EVENT));
  };

  return (
    <div className="home-page">
      <DemoWarningBanner />

      {/* ── DASHBOARD HEADER (homeowners only) ──────────────── */}
      {typedUser?.role === "homeowner" && (
        <div className="bg-white border-b border-gray-200">
          {/* Title Row + CTA */}
          <div className="px-4 py-3 md:px-6 md:py-4">
            <div className="home-dashboard-width flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <h1 className="text-xl md:text-2xl font-extrabold text-[#2C0F5B] tracking-tight">Home</h1>
                <p className="truncate text-xs font-medium text-gray-500 md:text-sm">
                  {primaryHouse?.address || primaryHouse?.name || `${getGreeting()}${firstName ? `, ${firstName}` : ""}`}
                </p>
              </div>
              <Button className="bg-[#3C258E] hover:bg-[#2C0F5B] text-white h-9 px-4 rounded-full text-sm font-semibold shadow-sm transition-all" onClick={() => setLocation('/maintenance?action=log')}>
                <Plus className="w-4 h-4 mr-1.5" />
                Log Work
              </Button>
            </div>
          </div>

          {/* Compact Score Strip (Mobile only) */}
          {!isLoadingHouses && houses.length > 0 && (
            <div className="px-4 py-2.5 md:hidden bg-[#F9FAFB] border-t border-gray-100 flex items-center gap-3 overflow-x-auto hide-scrollbar">
              {houseScores.map(({ house, score }, i) => (
                <button key={house.id} onClick={() => setHwsModalOpen(true)} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200 flex-shrink-0 transition-transform hover:scale-[1.02] active:scale-95">
                  <div className={`w-2 h-2 rounded-full ${getScoreClass(score) === 'good' ? 'bg-green-500' : getScoreClass(score) === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-bold text-[#2C0F5B]">{score !== undefined ? score : "—"}</span>
                  <span className="text-xs font-semibold text-gray-500">Score</span>
                </button>
              ))}
              <button onClick={() => setTasksModalOpen(true)} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200 flex-shrink-0 transition-transform hover:scale-[1.02] active:scale-95">
                <span className="text-sm font-bold text-[#2C0F5B]">{tasksCount !== null ? tasksCount : "—"}</span>
                <span className="text-xs font-semibold text-gray-500">Upcoming tasks</span>
              </button>
            </div>
          )}
        </div>
      )}

      {typedUser?.role === "homeowner" && !isLoadingHouses && houses.length > 0 && nextUpActions.length > 0 && (
        <section className="border-b border-gray-200 bg-[#F9FAFB] px-4 py-4 md:px-6" aria-labelledby="next-up-heading">
          <div className="home-dashboard-width">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="next-up-heading" className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#65558F]">Next up</h2>
              <Link href="/maintenance" className="hidden text-xs font-bold text-[#3C258E] hover:underline md:inline">
                View all work
              </Link>
            </div>

            <Link
              href={nextUpActions[0].href}
              className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#DED8F7] bg-white p-4 shadow-sm transition hover:border-[#3C258E] active:scale-[0.99] md:hidden"
              data-testid="home-next-up-mobile"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEEDFE] text-[#3C258E]">
                {nextUpActions[0].icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-[#2C0F5B]">{nextUpActions[0].title}</span>
                <span className="mt-1 block text-sm text-gray-500">{nextUpActions[0].detail}</span>
              </span>
              <span className="inline-flex min-h-11 items-center rounded-full bg-[#3C258E] px-4 text-sm font-bold text-white">Start</span>
            </Link>

            {nextUpActions.length > 1 && (
              <div className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-3 md:hidden" aria-label="Upcoming work">
                {nextUpActions.slice(1, 3).map((action, index) => (
                  <Link
                    key={`${action.title}-mobile-upcoming-${index}`}
                    href={action.href}
                    className="flex min-h-11 items-center gap-2 py-2.5 text-sm font-semibold text-[#2C0F5B]"
                  >
                    <span className="text-[#65558F]">{action.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{action.title}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#8B7DB3]" />
                  </Link>
                ))}
              </div>
            )}

            <div className="hidden grid-cols-3 gap-3 md:grid" data-testid="home-next-up-desktop">
              {nextUpActions.slice(0, 3).map((action, index) => (
                <Link
                  key={`${action.title}-${index}`}
                  href={action.href}
                  className="group flex min-h-[92px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#B6A6F4] hover:shadow-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEEDFE] text-[#3C258E]">
                    {action.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-tight text-[#2C0F5B]">{action.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-gray-500">{action.detail}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#8B7DB3] transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {typedUser?.role === "homeowner" && !isLoadingQuizResult && (
        <div className="dash-body dash-quiz-section">
          <div className="home-dashboard-width">
            <AchievementProgressStrip className="mb-4" heading="Your awards" />
            <div className="dash-quiz-card" data-testid="dashboard-quiz-score">
              <div className="dash-quiz-score" aria-label={quizResult ? `Quiz score ${quizResult.score} out of 100` : undefined}>
                {quizResult ? quizResult.score : <TrendingUp size={22} aria-hidden="true" />}
              </div>
              <div className="dash-quiz-copy">
                <div className="dash-quiz-title">Home Readiness Checkup</div>
                <div className="dash-quiz-tier">
                  {quizResult ? quizResult.tier : "See how healthy your home is"}
                </div>
              </div>
              <Link href="/quiz/" className="dash-quiz-link">
                {quizResult ? "Retake quiz" : "Take the quiz"}
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {showOnboardingBanner && (
        <div className="dash-body" style={{ paddingBottom: 0 }}>
          <div className="home-dashboard-width">
            <div
              className="dash-light-card"
              data-testid="onboarding-tour-banner"
              style={{ borderLeft: "3px solid #7c3aed", marginBottom: 8 }}
            >
              <div className="dash-light-card-row">
                <div className="dash-light-card-icon" style={{ background: "#ede9fe" }}>
                  <Sparkles size={18} style={{ color: "#7c3aed" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dash-light-card-title">Finish setting up your home</div>
                  <div className="dash-light-card-sub">
                    Take a quick tour to see everything MyHomeBase™ can do for you.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismissOnboardingBanner}
                  aria-label="Dismiss onboarding tour reminder"
                  data-testid="button-dismiss-onboarding-banner"
                  style={{ border: 0, background: "transparent", color: "#7B6FA0", cursor: "pointer", padding: 4 }}
                >
                  <XIcon size={18} />
                </button>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={restartOnboardingTour}
                data-testid="button-restart-onboarding-tour"
                style={{ marginTop: 10, background: "#7c3aed", color: "#fff" }}
              >
                Restart guided tour
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── FIRST-TIME: NO HOUSES YET ───────────────────────── */}
      {typedUser?.role === "homeowner" && !isLoadingHouses && houses.length === 0 && (
        <div className="dash-body">
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--purple-deep)", marginBottom: 12 }}>
              Welcome to MyHomeBase™!
            </h2>
            <p style={{ fontSize: 14, color: "var(--purple-light)", marginBottom: 24, lineHeight: 1.6 }}>
              Create a living record of your home — systems, maintenance, upgrades, and health.
            </p>
            <Link href="/add-home">
              <button className="btn-primary" style={{ maxWidth: 280 }}
                data-testid="button-launch-home-record-first-time">
                Add My Home
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── MAIN DASHBOARD BODY ─────────────────────────────── */}
      {typedUser?.role === "homeowner" && !isLoadingHouses && houses.length > 0 && (
        <div className="bg-[#F9FAFB] p-4 md:p-6 lg:p-8 min-h-[calc(100vh-140px)]">
          <div className="home-dashboard-width">
            <div className="home-dashboard-grid" data-testid="home-dashboard-grid">

              {/* Left/Main Column: Next Actions & Property */}
              <div className="home-dashboard-main space-y-4 next-actions-container" data-testid="home-dashboard-main">
                {/* ── NEEDS ATTENTION: Pending contractor job records ─── */}

                {(pendingJobRecords as any[]).filter(r => !acceptedJobRecordIds.has(r.id) && !declinedJobRecordIds.has(r.id)).length > 0 && (
                  <div className="dash-light-card" style={{ borderLeft: '3px solid #7c3aed', marginBottom: 0 }} data-testid="pending-job-records-section">
                <div className="dash-light-card-row" style={{ marginBottom: 10 }}>
                  <div className="dash-light-card-icon" style={{ background: '#ede9fe' }}>
                    <CheckCircle2 size={18} style={{ color: '#7c3aed' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dash-light-card-title">From Your Contractors</div>
                    <div className="dash-light-card-sub">
                      {(pendingJobRecords as any[]).filter(r => !acceptedJobRecordIds.has(r.id) && !declinedJobRecordIds.has(r.id)).length} pending record{(pendingJobRecords as any[]).filter(r => !acceptedJobRecordIds.has(r.id) && !declinedJobRecordIds.has(r.id)).length !== 1 ? 's' : ''} — tap Accept to save to your home history
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(pendingJobRecords as any[]).filter(r => !acceptedJobRecordIds.has(r.id) && !declinedJobRecordIds.has(r.id)).map((record: any) => {
                    const isAccepted = acceptedJobRecordIds.has(record.id);
                    const effectiveHouseId = jobRecordHouseOverrides[record.id] ?? record.houseId ?? (houses.length === 1 ? (houses[0] as House)?.id : undefined);
                    const effectiveHouse = effectiveHouseId ? (houses as House[]).find(h => h.id === effectiveHouseId) : undefined;
                    const canAccept = !!effectiveHouseId;
                    const multiHouse = (houses as House[]).length > 1;

                    return (
                      <div key={record.id} style={{
                        background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10,
                        padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#2C0F5B' }}>
                              {record.serviceType}
                            </div>
                            <div style={{ fontSize: 11, color: '#7B6FA0', marginTop: 2 }}>
                              {record.contractorName}{record.contractorCompany ? ` · ${record.contractorCompany}` : ''}
                            </div>
                            {record.serviceDescription && (
                              <div style={{ fontSize: 12, color: '#4C3B6E', marginTop: 4, lineHeight: 1.4 }}>
                                {record.serviceDescription}
                              </div>
                            )}
                            {record.nextServiceDate && (
                              <div style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 600 }}>
                                <Clock size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                                Next service: {new Date(record.nextServiceDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </div>
                            )}
                            {Array.isArray(record.equipmentInfo) && record.equipmentInfo.length > 0 && (
                              <div style={{ fontSize: 11, color: '#7B6FA0', marginTop: 4 }}>
                                <Wrench size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                                {record.equipmentInfo.map((e: any) => e.name).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* House assignment + actions */}
                        <div style={{ borderTop: '1px solid #ddd6fe', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 11, color: '#2C0F5B', flex: 1 }}>
                            {multiHouse ? (
                              <select
                                value={effectiveHouseId ?? ''}
                                onChange={e => setJobRecordHouseOverrides(prev => ({ ...prev, [record.id]: e.target.value }))}
                                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid #ddd6fe', color: '#2C0F5B' }}
                                data-testid={`select-job-record-house-${record.id}`}
                              >
                                <option value="">— choose property —</option>
                                {(houses as House[]).map(h => (
                                  <option key={h.id} value={h.id}>{(h as any).name || (h as any).address}</option>
                                ))}
                              </select>
                            ) : effectiveHouse ? (
                              <span>📍 {(effectiveHouse as any).name || (effectiveHouse as any).address}</span>
                            ) : null}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => declineJobRecordMutation.mutate(record.id)}
                              disabled={declineJobRecordMutation.isPending}
                              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'none', border: '1px solid #ddd6fe', cursor: 'pointer', color: '#7B6FA0' }}
                              data-testid={`button-dismiss-job-record-${record.id}`}
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => canAccept && acceptJobRecordMutation.mutate({ id: record.id, houseId: effectiveHouseId! })}
                              disabled={!canAccept || acceptJobRecordMutation.isPending}
                              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: canAccept ? '#7c3aed' : '#ccc', color: '#fff', border: 'none', cursor: canAccept ? 'pointer' : 'default', fontWeight: 600 }}
                              data-testid={`button-accept-job-record-${record.id}`}
                            >
                              Accept ✓
                            </button>
                          </div>
                        </div>
                        {isAccepted && (
                          <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }} className="flex items-center gap-1">
                            <CheckCircle2 size={12} /> Saved to your home history
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── WATCH LIST: Aging systems that need attention ─────── */}
            {primaryHouse && (() => {
              const ageItems = getMechanicalAgeInfo(primaryHouse).filter(f => f.tone === 'alert' || f.tone === 'warn');
              if (ageItems.length === 0) return null;
              return (
                <div className="dash-light-card" style={{ borderLeft: `3px solid ${ageItems.some(f => f.tone === 'alert') ? '#dc2626' : '#f59e0b'}`, marginBottom: 8 }} data-testid="watch-list-section">
                  <div className="dash-light-card-row" style={{ marginBottom: 8 }}>
                    <div className="dash-light-card-icon" style={{ background: ageItems.some(f => f.tone === 'alert') ? '#fee2e2' : '#fef3c7' }}>
                      <AlertTriangle size={18} style={{ color: ageItems.some(f => f.tone === 'alert') ? '#dc2626' : '#d97706' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dash-light-card-title">
                        {ageItems.some(f => f.tone === 'alert') ? 'Needs Attention' : 'Plan Ahead'}
                      </div>
                      <div className="dash-light-card-sub">Aging systems that could become costly</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ageItems.map(f => (
                      <div key={f.label} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: f.tone === 'alert' ? '#fef2f2' : '#fffbeb',
                        border: `1px solid ${f.tone === 'alert' ? '#fecaca' : '#fde68a'}`,
                        borderRadius: 8, padding: '8px 10px',
                      }}>
                        <span className="flex items-center justify-center text-[#92400e]" style={f.tone === 'alert' ? { color: '#991b1b' } : {}}>{f.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: f.tone === 'alert' ? '#991b1b' : '#92400e' }}>{f.label}</div>
                          <div style={{ fontSize: 11, color: f.tone === 'alert' ? '#b91c1c' : '#b45309', marginTop: 1 }}>{f.text}</div>
                        </div>
                        <Link
                          href={`/find-contractors?category=${encodeURIComponent(f.category)}`}
                          style={{ fontSize: 11, color: f.tone === 'alert' ? '#dc2626' : '#d97706', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
                          data-testid={`watch-list-find-help-${f.category}`}
                        >
                          Find help →
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
                  {(house.yearBuilt || house.squareFootage) && (
                    <div className="property-card-metadata" aria-label="Property details">
                      {house.yearBuilt && (
                        <span data-testid={`property-year-built-${house.id}`}>
                          Built {house.yearBuilt}
                        </span>
                      )}
                      {house.yearBuilt && house.squareFootage && (
                        <span className="property-card-metadata-divider" aria-hidden="true">•</span>
                      )}
                      {house.squareFootage && (
                        <span data-testid={`property-square-footage-${house.id}`}>
                          {house.squareFootage.toLocaleString()} sq ft
                        </span>
                      )}
                    </div>
                  )}
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

            {/* Profile nudge card — inline install-year entry */}
            {showProfileNudge && (
              <div className="dash-light-card" data-testid="profile-nudge-card" style={{ marginBottom: 8 }}>
                <div className="dash-light-card-row">
                  <div className="dash-light-card-icon">
                    <Wrench size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dash-light-card-title">Complete your home profile</div>
                    <div className="dash-light-card-sub">Add install years to raise your Home Wellness Score™</div>
                  </div>
                  <button
                    type="button"
                    aria-label={isLowScore ? "Hide for this visit" : "Dismiss profile nudge"}
                    data-testid="button-dismiss-profile-nudge"
                    onClick={handleDismissProfileNudge}
                    title={isLowScore ? "This will reappear on your next visit until your score improves" : undefined}
                    style={{ background: "none", border: 0, cursor: "pointer", padding: 4 }}
                  >
                    <XIcon size={16} />
                  </button>
                </div>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {profileNudgeMissing.map(f => (
                    <div key={f.key}>
                      {activeNudge === f.key ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{f.icon} {f.label}</span>
                            <input
                              data-testid={`input-install-year-${f.key}`}
                              type="number"
                              placeholder="e.g. 2010"
                              value={nudgeYear}
                              onChange={e => setNudgeYear(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleNudgeSave(f.key);
                                if (e.key === 'Escape') { setActiveNudge(null); setNudgeYear(""); }
                              }}
                              style={{
                                width: 90, padding: '4px 8px', fontSize: 13,
                                border: '1px solid var(--purple-border)', borderRadius: 6,
                                outline: 'none',
                              }}
                            />
                            <button
                              data-testid={`button-save-install-year-${f.key}`}
                              disabled={!nudgeYearValid || patchInstallYearMutation.isPending}
                              onClick={() => handleNudgeSave(f.key)}
                              style={{
                                padding: '4px 10px', fontSize: 12, fontWeight: 700,
                                background: nudgeYearValid ? 'var(--purple)' : '#ccc',
                                color: '#fff', border: 'none', borderRadius: 6, cursor: nudgeYearValid ? 'pointer' : 'default',
                              }}
                            >
                              Save
                            </button>
                            <button
                              data-testid={`button-cancel-install-year-${f.key}`}
                              onClick={() => { nudgeSavingRef.current = false; setActiveNudge(null); setNudgeYear(""); }}
                              style={{
                                padding: '4px 8px', fontSize: 12, fontWeight: 600,
                                background: 'none', border: '1px solid var(--purple-border)',
                                borderRadius: 6, cursor: 'pointer', color: 'var(--purple-deep)',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                          {patchInstallYearMutation.isError && (
                            <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>
                              Couldn't save — please try again.
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          data-testid={`button-nudge-${f.key}`}
                          onClick={() => { setActiveNudge(f.key); setNudgeYear(""); patchInstallYearMutation.reset(); }}
                          style={{
                            width: '100%', textAlign: 'left', background: 'var(--purple-tint)',
                            border: '1px dashed var(--purple-border)', borderRadius: 8,
                            padding: '7px 10px', fontSize: 13, cursor: 'pointer',
                            color: 'var(--purple-deep)', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: '8px'
                          }}
                        >
                          <span className="flex items-center justify-center">{f.icon}</span>
                          <span>{f.label} — tap to add install year</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {linkedInvoices.map(inv => {
                      const isClaimed = claimedInvoiceIds.has(inv.id);
                      // Effective house: homeowner override > contractor-set > auto-select for single-home owners
                      const effectiveHouseId = invoiceHouseOverrides[inv.id] ?? inv.houseId ?? (houses.length === 1 ? (houses[0] as House)?.id : undefined);
                      const effectiveHouse = effectiveHouseId ? (houses as House[]).find(h => h.id === effectiveHouseId) : undefined;
                      const isChanging = changingHouseForInvoice === inv.id;
                      const multiHouse = (houses as House[]).length > 1;
                      const canSave = !isClaimed && !!effectiveHouseId;

                      return (
                        <div key={inv.id} style={{
                          background: 'var(--purple-tint)', border: '1px solid var(--purple-border)', borderRadius: 10,
                          padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
                        }}>
                          {/* Top row: title + status + view link */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#2C0F5B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                            <a
                              href={`/pay/invoice/${inv.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dash-light-card-btn"
                              style={{ fontSize: 11, padding: '4px 8px', flexShrink: 0 }}
                            >
                              View →
                            </a>
                          </div>

                          {/* Home assignment row */}
                          {!isClaimed && (
                            <div style={{ borderTop: '1px solid var(--purple-border)', paddingTop: 8 }}>
                              {isChanging ? (
                                /* Inline home picker */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ fontSize: 11, color: '#7B6FA0', fontWeight: 600 }}>Select the correct property:</div>
                                  <select
                                    defaultValue={effectiveHouseId ?? ''}
                                    onChange={(e) => {
                                      setInvoiceHouseOverrides(prev => ({ ...prev, [inv.id]: e.target.value }));
                                      setChangingHouseForInvoice(null);
                                    }}
                                    style={{
                                      width: '100%', padding: '6px 8px', borderRadius: 6,
                                      border: '1.5px solid var(--purple-border)', backgroundColor: '#fff',
                                      color: '#2C0F5B', fontSize: 12, outline: 'none',
                                    }}
                                    data-testid={`select-house-override-${inv.id}`}
                                  >
                                    <option value="">— choose a property —</option>
                                    {(houses as House[]).map((h) => (
                                      <option key={h.id} value={h.id}>
                                        {(h as any).name || (h as any).address || h.id}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    style={{ fontSize: 11, color: '#7B6FA0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    onClick={() => setChangingHouseForInvoice(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                  <div style={{ fontSize: 11, color: '#2C0F5B', display: 'flex', alignItems: 'center' }}>
                                    {effectiveHouse
                                      ? <><MapPin size={12} className="inline mr-1" /> <strong>{(effectiveHouse as any).name || (effectiveHouse as any).address || 'Your home'}</strong></>
                                      : <span style={{ color: '#dc2626' }} className="flex items-center gap-1"><Wrench size={12} /> No property selected — choose one before saving</span>
                                    }
                                    {multiHouse && effectiveHouse && (
                                      <button
                                        style={{ marginLeft: 8, fontSize: 11, color: '#7B6FA0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                        onClick={() => setChangingHouseForInvoice(inv.id)}
                                        data-testid={`button-change-house-${inv.id}`}
                                      >
                                        Change
                                      </button>
                                    )}
                                    {multiHouse && !effectiveHouse && (
                                      <button
                                        style={{ marginLeft: 4, fontSize: 11, color: '#1560a2', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                                        onClick={() => setChangingHouseForInvoice(inv.id)}
                                        data-testid={`button-select-house-${inv.id}`}
                                      >
                                        Select property
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button
                                      style={{ fontSize: 11, padding: '4px 8px', color: '#7B6FA0', background: 'transparent', border: '1px solid var(--purple-border)', borderRadius: 7, cursor: unlinkInvoiceMutation.isPending ? 'default' : 'pointer' }}
                                      disabled={unlinkInvoiceMutation.isPending}
                                      onClick={() => unlinkInvoiceMutation.mutate(inv.id)}
                                      data-testid={`button-unlink-invoice-${inv.id}`}
                                    >
                                      Not mine
                                    </button>
                                    <button
                                      className="btn-primary"
                                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, opacity: canSave ? 1 : 0.45, cursor: canSave ? 'pointer' : 'default' }}
                                      disabled={!canSave || claimInvoiceMutation.isPending || unlinkInvoiceMutation.isPending}
                                      onClick={() => canSave && claimInvoiceMutation.mutate({ invoiceId: inv.id, houseId: effectiveHouseId! })}
                                      data-testid={`button-claim-invoice-${inv.id}`}
                                    >
                                      Save to history
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {isClaimed && (
                            <div style={{ borderTop: '1px solid var(--purple-border)', paddingTop: 8, fontSize: 11, color: '#22c55e', fontWeight: 600 }} className="flex items-center gap-1">
                              <CheckCircle2 size={12} /> Saved to {effectiveHouse ? ((effectiveHouse as any).name || (effectiveHouse as any).address) : 'your home history'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

              </div>
              {/* Right Column: Score & Actions to Improve */}
              <aside className="home-dashboard-rail space-y-6" data-testid="home-dashboard-rail">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 bg-[#F9FAFB]">
                    <h3 className="text-sm font-bold text-[#2C0F5B] mb-3">Home Wellness Score™</h3>
                    <div className="flex items-end gap-3 mb-4">
                      <span className="text-4xl font-extrabold" style={{ color: getScoreClass(primaryHouseScore) === 'good' ? '#16a34a' : getScoreClass(primaryHouseScore) === 'warn' ? '#d97706' : '#dc2626' }}>
                        {primaryHouseScore ?? "—"}
                      </span>
                      <span className="text-sm font-semibold text-gray-500 mb-1 leading-tight">
                        {primaryHouseScore !== undefined ? getHomeWellnessScoreStatus(primaryHouseScore).label : "Calculating..."}
                      </span>
                    </div>
                    {/* Honest band */}
                    <Progress value={primaryHouseScore ? primaryHouseScore / 10 : 0} className="h-2 mb-2" />
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span>0</span>
                      <span>1000</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Actions to Improve</h4>
                    <div className="space-y-3">
                      {showProfileNudge && (
                        <div className="flex items-start gap-3 p-3 bg-[#EEEDFE] rounded-xl border border-[#DED8F7]">
                           <Wrench className="w-4 h-4 text-[#3C258E] mt-0.5 shrink-0" />
                           <div>
                             <p className="text-xs font-bold text-[#2C0F5B]">Add install years</p>
                             <p className="text-[11px] text-[#4C3B6E] mt-0.5 leading-snug">Add age for roof or HVAC to boost score</p>
                           </div>
                        </div>
                      )}
                      {!inspectionSummary && (
                        <Link href="/documents?upload=inspection" className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-xl border border-gray-100 hover:border-[#DED8F7] transition cursor-pointer">
                           <FileText className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                           <div>
                             <p className="text-xs font-bold text-[#2C0F5B]">Upload Inspection</p>
                             <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">AI extracts issues to track</p>
                           </div>
                        </Link>
                      )}
                      {tasksCount !== null && tasksCount > 0 && (
                        <Link href="/maintenance" className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-xl border border-gray-100 hover:border-[#DED8F7] transition cursor-pointer">
                           <ClipboardList className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                           <div>
                             <p className="text-xs font-bold text-[#2C0F5B]">Complete {tasksCount} tasks</p>
                             <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">Log maintenance to raise your score</p>
                           </div>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </aside>

            </div>
          </div>
        </div>
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
                <h2 className="hdm-heading">What your Home Wellness Score™ means</h2>
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
                      <p className="hdm-score-tier">
                        {score === undefined ? "Score calculating…" : getHomeWellnessScoreStatus(score).label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hdm-tiers">
                <p className="hdm-tiers-label">Score guide</p>
                {[
                  { range: "800 – 1000", label: "Excellent", desc: "Strong documentation and consistent maintenance.", color: "#2f7d32", bg: "#f0fdf4" },
                  { range: "600 – 799", label: "Doing Well", desc: "A solid record with a few useful improvements remaining.", color: "#6da936", bg: "#f7fee7" },
                  { range: "400 – 599", label: "Progressing", desc: "Important gaps remain, but each completed action improves the record.", color: "#a3a51b", bg: "#fffbeb" },
                  { range: "0 – 399", label: "Critical", desc: "Start with the recommended actions to document and protect the home.", color: "#e03e3e", bg: "#fef2f2" },
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
                  { icon: <Wrench size={16} />, text: "Systems logged and tracked" },
                  { icon: <Calendar size={16} />, text: "Install years recorded for roof, HVAC, water heater" },
                  { icon: <ClipboardList size={16} />, text: "Maintenance tasks completed" },
                  { icon: <FileText size={16} />, text: "Inspection report on file" },
                  { icon: <CheckCircle2 size={16} />, text: "Contractor invoices saved" },
                ].map(f => (
                  <div key={f.text} className="hdm-factor-row">
                    <span className="hdm-factor-icon flex items-center justify-center text-[#2C0F5B]">{f.icon}</span>
                    <p className="hdm-factor-text">{f.text}</p>
                  </div>
                ))}
              </div>
              <div className="hdm-mech-ages">
                <p className="hdm-tiers-label">Mechanical feature age</p>
                {houses.map(house => (
                  <div key={house.id} className="hdm-mech-house">
                    {houses.length > 1 && (
                      <p className="hdm-mech-house-name">{house.name || "Property"}</p>
                    )}
                    {getMechanicalAgeInfo(house).map(f => (
                      <div key={f.label} className="hdm-mech-row">
                        <span className="hdm-mech-icon">{f.icon}</span>
                        <div className="hdm-mech-info">
                          <p className="hdm-mech-label">{f.label}</p>
                          <p className={`hdm-mech-status hdm-mech-status-${f.tone}`}>{f.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {houses[0]?.id && (
                  <Link href={`/household-profile/${houses[0].id}`} onClick={() => setHwsModalOpen(false)} className="hdm-mech-edit-link">
                    Update install years →
                  </Link>
                )}
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
                    ? `${tasksCount} task${tasksCount !== 1 ? "s" : ""} in your maintenance plan — generated for your properties and climate zone.`
                    : "Your AI Maintenance Coach generates a personalized task plan each month based on your home, climate zone, and season."}
                </p>
                <div className="hdm-divider" />
              </div>
              <div className="hdm-info-cards">
                {[
                  { icon: <TrendingUp size={16} />, title: "Climate-aware", desc: `Tasks are tailored for ${climateZone}.` },
                  { icon: <Calendar size={16} />, title: "Monthly rotation", desc: "Tasks update each month so nothing gets missed year-round." },
                  { icon: <CheckCircle2 size={16} />, title: "Raises your Home Wellness Score™", desc: "Completing tasks improves your Home Wellness Score™." },
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
                <p className="hdm-subtitle">Every tracked system generates maintenance reminders, raises your Home Wellness Score™, and becomes part of your permanent home record.</p>
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
                  {
                    href: "/contractor-dashboard",
                    Icon: Calendar,
                    label: "Active Projects",
                    sub: "Current work",
                    body: isLoadingContractorProposals
                      ? "Loading active projects…"
                      : isContractorProposalsError
                        ? "Active projects unavailable"
                        : activeProjectCount > 0
                          ? `${activeProjectCount} active project${activeProjectCount === 1 ? "" : "s"}`
                          : "No active projects yet",
                  },
                  {
                    href: "/contractor-dashboard",
                    Icon: Star,
                    label: "Reviews",
                    sub: "Customer feedback",
                    body: isLoadingContractorRating
                      ? "Loading review summary…"
                      : isContractorRatingError
                        ? "Reviews unavailable"
                        : contractorRating && contractorRating.totalReviews > 0
                          ? `${contractorRating.averageRating.toFixed(1)}/5 stars from ${contractorRating.totalReviews} review${contractorRating.totalReviews === 1 ? "" : "s"}`
                          : "No reviews yet",
                  },
                  {
                    href: "/contractor-dashboard",
                    Icon: Search,
                    label: "New Leads",
                    sub: "Opportunities",
                    body: isLoadingContractorLeads
                      ? "Loading new leads…"
                      : isContractorLeadsError
                        ? "New leads unavailable"
                        : recentNewLeadCount > 0
                          ? `${recentNewLeadCount} new lead${recentNewLeadCount === 1 ? "" : "s"} this week`
                          : "No new leads this week",
                  },
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

type OnboardingReminder = {
  id: string;
  type: string;
};

const ONBOARDING_BANNER_DISMISSED_KEY = "mhb_onboarding_banner_dismissed";
