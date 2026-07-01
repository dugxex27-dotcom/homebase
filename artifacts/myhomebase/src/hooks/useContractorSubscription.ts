import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

export interface SeatInfo {
  includedTechSeats: number | null;
  additionalSeatPrice: number | null;
  currentTechCount: number;
  currentAdminCount: number;
  maxTechSeats: number | null;
  maxAdminSeats: number | null;
  maxManagerSeats: number | null;
  maxDispatcherSeats: number | null;
}

export interface ContractorSubscriptionStatus {
  isLoading: boolean;
  hasActiveSubscription: boolean;
  needsSubscription: boolean;
  isInTrial: boolean;
  trialExpired: boolean;
  trialDaysRemaining: number;
  trialEndsAt: string | null;
  currentPlan: 'none' | 'basic' | 'pro' | 'business' | 'enterprise';
  hasCrmAccess: boolean;
  subscriptionStatus: string;
  monthlyPrice: number;
  features: string[];
  needsUpgrade: boolean;
  planName: string;
  // Phase 4 — Scale-Up Plan fields
  companyTier: string | null;
  seatInfo: SeatInfo;
  divisionCount: number;
  hasDivisions: boolean;
  hasBulkImport: boolean;
  hasApiAccess: boolean;
  hasSSO: boolean;
}

const DEFAULT_SEAT_INFO: SeatInfo = {
  includedTechSeats: null,
  additionalSeatPrice: null,
  currentTechCount: 0,
  currentAdminCount: 0,
  maxTechSeats: null,
  maxAdminSeats: null,
  maxManagerSeats: null,
  maxDispatcherSeats: null,
};

export function useContractorSubscription(): ContractorSubscriptionStatus {
  const { user, isLoading: isAuthLoading } = useAuth();
  const typedUser = user as User | undefined;

  const { data: subscriptionData, isLoading: isSubLoading, isError } = useQuery({
    queryKey: ['/api/contractor/subscription'],
    enabled: !!typedUser && typedUser.role === 'contractor',
  });

  const isLoading = isAuthLoading || isSubLoading;

  if (isLoading || isError || !subscriptionData) {
    return {
      isLoading: isLoading || isError,
      hasActiveSubscription: false,
      needsSubscription: false,
      isInTrial: false,
      trialExpired: false,
      trialDaysRemaining: 0,
      trialEndsAt: null,
      currentPlan: 'none',
      hasCrmAccess: false,
      subscriptionStatus: 'unknown',
      monthlyPrice: 0,
      features: [],
      needsUpgrade: false,
      planName: 'No Plan',
      companyTier: null,
      seatInfo: DEFAULT_SEAT_INFO,
      divisionCount: 0,
      hasDivisions: false,
      hasBulkImport: false,
      hasApiAccess: false,
      hasSSO: false,
    };
  }

  const data = subscriptionData as any;

  // Demo accounts get full Pro access - never show subscription prompts
  if (data.isDemoAccount) {
    return {
      isLoading: false,
      hasActiveSubscription: true,
      needsSubscription: false,
      isInTrial: false,
      trialExpired: false,
      trialDaysRemaining: 0,
      trialEndsAt: null,
      currentPlan: 'pro',
      hasCrmAccess: true,
      subscriptionStatus: 'active',
      monthlyPrice: 0,
      features: data.features ?? [],
      needsUpgrade: false,
      planName: data.planName ?? 'Pro (Demo Account)',
      companyTier: null,
      seatInfo: DEFAULT_SEAT_INFO,
      divisionCount: 0,
      hasDivisions: false,
      hasBulkImport: false,
      hasApiAccess: false,
      hasSSO: false,
    };
  }

  const tier = data.companyTier as string | null ?? null;
  const hasDivisions = data.hasDivisions ?? ['business', 'contractor_business', 'enterprise', 'contractor_enterprise'].includes(tier ?? '');
  const hasBulkImport = data.bulkImportEnabled ?? hasDivisions;
  const hasApiAccess = data.apiAccessEnabled ?? tier === 'contractor_enterprise';
  const hasSSO = (data.ssoEnabled ?? false) && hasApiAccess;

  return {
    isLoading: false,
    hasActiveSubscription: data.hasActiveSubscription ?? false,
    needsSubscription: data.needsSubscription ?? false,
    isInTrial: data.isInTrial ?? false,
    trialExpired: data.trialExpired ?? false,
    trialDaysRemaining: data.trialDaysRemaining ?? 0,
    trialEndsAt: data.trialEndsAt ?? null,
    currentPlan: data.currentPlan ?? 'none',
    hasCrmAccess: data.hasCrmAccess ?? false,
    subscriptionStatus: data.subscriptionStatus ?? 'inactive',
    monthlyPrice: data.monthlyPrice ?? 0,
    features: data.features ?? [],
    needsUpgrade: !data.hasActiveSubscription || data.needsSubscription,
    planName: data.planName ?? 'No Plan',
    companyTier: tier,
    seatInfo: data.seatInfo ?? DEFAULT_SEAT_INFO,
    divisionCount: data.divisionCount ?? 0,
    hasDivisions,
    hasBulkImport,
    hasApiAccess,
    hasSSO,
  };
}
