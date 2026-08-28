import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

export interface SeatInfo {
  includedTeamSeats: number;
  additionalTeamSeatPrice: number;
  acceptedTeamCount: number;
  reservedTeamCount: number;
  billedTeamSeatCount: number;
  teamSeatLimit: number;
}

export interface ContractorSubscriptionStatus {
  isLoading: boolean;
  hasActiveSubscription: boolean;
  needsSubscription: boolean;
  isInTrial: boolean;
  trialExpired: boolean;
  trialDaysRemaining: number;
  trialEndsAt: string | null;
  currentPlan: 'none' | 'basic' | 'pro' | 'business';
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
}

const DEFAULT_SEAT_INFO: SeatInfo = {
  includedTeamSeats: 3,
  additionalTeamSeatPrice: 5,
  acceptedTeamCount: 0,
  reservedTeamCount: 0,
  billedTeamSeatCount: 0,
  teamSeatLimit: 50,
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
    };
  }

  const data = subscriptionData as any;

  // Demo accounts represent the current unified Contractor Basic plan.
  if (data.isDemoAccount) {
    return {
      isLoading: false,
      hasActiveSubscription: true,
      needsSubscription: false,
      isInTrial: false,
      trialExpired: false,
      trialDaysRemaining: 0,
      trialEndsAt: null,
      currentPlan: 'basic',
      hasCrmAccess: true,
      subscriptionStatus: 'active',
      monthlyPrice: 0,
      features: data.features ?? [],
      needsUpgrade: false,
      planName: data.planName ?? 'Contractor Basic (Demo Account)',
      companyTier: null,
      seatInfo: DEFAULT_SEAT_INFO,
      divisionCount: 0,
      hasDivisions: true,
      hasBulkImport: false,
    };
  }

  const tier = data.companyTier as string | null ?? null;
  const hasDivisions = data.hasDivisions
    ?? ((data.hasActiveSubscription ?? false) && !(data.needsSubscription ?? false));
  const hasBulkImport = data.bulkImportEnabled ?? hasDivisions;

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
  };
}
