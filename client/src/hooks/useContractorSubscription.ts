import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

export interface ContractorSubscriptionStatus {
  isLoading: boolean;
  hasActiveSubscription: boolean;
  needsSubscription: boolean;
  isInTrial: boolean;
  trialExpired: boolean;
  trialDaysRemaining: number;
  trialEndsAt: string | null;
  currentPlan: 'none' | 'basic' | 'pro';
  hasCrmAccess: boolean;
  subscriptionStatus: string;
  monthlyPrice: number;
  features: string[];
  needsUpgrade: boolean;
  planName: string;
}

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
    };
  }

  const data = subscriptionData as any;
  
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
  };
}
