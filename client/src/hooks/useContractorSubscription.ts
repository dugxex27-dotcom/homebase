import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

export interface ContractorSubscriptionStatus {
  isLoading: boolean;
  hasActiveSubscription: boolean;
  currentPlan: 'none' | 'basic' | 'pro';
  hasCrmAccess: boolean;
  subscriptionStatus: string;
  monthlyPrice: number;
  features: string[];
  needsUpgrade: boolean;
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
      currentPlan: 'none',
      hasCrmAccess: false,
      subscriptionStatus: 'unknown',
      monthlyPrice: 0,
      features: [],
      needsUpgrade: false,
    };
  }

  const data = subscriptionData as any;
  
  return {
    isLoading: false,
    hasActiveSubscription: data.hasActiveSubscription ?? false,
    currentPlan: data.currentPlan ?? 'none',
    hasCrmAccess: data.hasCrmAccess ?? false,
    subscriptionStatus: data.subscriptionStatus ?? 'inactive',
    monthlyPrice: data.monthlyPrice ?? 0,
    features: data.features ?? [],
    needsUpgrade: !data.hasActiveSubscription,
  };
}
