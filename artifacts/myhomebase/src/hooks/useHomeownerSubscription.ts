import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

export interface SubscriptionStatus {
  isLoading: boolean;
  isError: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number;
  hasActiveSubscription: boolean;
  isPaidSubscriber: boolean;
  trialExpired: boolean;
  subscriptionStatus: string;
  needsUpgrade: boolean;
  currentPlan: 'free' | 'base' | 'premium' | 'premium_plus';
  maxHouses: number | 'unlimited';
  currentHouses: number;
  canAddHomes: boolean;
  isFreeUser: boolean;
}

export function useHomeownerSubscription(): SubscriptionStatus {
  const { user, isLoading: isAuthLoading } = useAuth();
  const typedUser = user as User | undefined;

  const { data: subscriptionData, isLoading: isSubLoading, isError: isSubError } = useQuery({
    queryKey: ['/api/my-subscription'],
    enabled: !!typedUser && typedUser.role === 'homeowner',
  });

  const isLoading = isAuthLoading || isSubLoading;

  // The subscription endpoint is the sole source of truth. Never convert an
  // unresolved request into a confirmed free account.
  if (isLoading || !subscriptionData || isSubError) {
    return {
      isLoading,
      isError: isSubError,
      isInTrial: false,
      trialDaysRemaining: 0,
      hasActiveSubscription: false,
      isPaidSubscriber: false,
      trialExpired: false,
      subscriptionStatus: 'unknown',
      needsUpgrade: false,
      currentPlan: 'free',
      maxHouses: 0,
      currentHouses: 0,
      canAddHomes: false,
      isFreeUser: false, // Never block users during loading/error - could wrongly block subscribers
    };
  }

  const subData = subscriptionData as any;
  const subscriptionStatus = subData.subscriptionStatus || 'inactive';
  const isInTrial = Boolean(subData.isTrialing);
  const trialDaysRemaining = subData.trialDaysRemaining ?? 0;
  const hasActiveSubscription = Boolean(
    subData.hasActiveSubscription ||
    subscriptionStatus === 'active' ||
    subscriptionStatus === 'grandfathered',
  );
  const isPaidSubscriber = hasActiveSubscription;
  const trialExpired = !hasActiveSubscription && !isInTrial && subscriptionStatus === 'trialing';
  const needsUpgrade = !hasActiveSubscription && !isInTrial &&
    ['inactive', 'cancelled', 'trialing'].includes(subscriptionStatus);
  const currentPlan = subData?.currentPlan || 'free';
  const maxHouses = subData?.maxHouses ?? 0;
  const currentHouses = subData?.currentHouses ?? 0;
  const canAddHomes = subData?.canAddHomes ?? false;

  const isFreeUser = currentPlan === 'free' && !isInTrial && !hasActiveSubscription;

  return {
    isLoading: false,
    isError: false,
    isInTrial,
    trialDaysRemaining,
    hasActiveSubscription,
    isPaidSubscriber,
    trialExpired,
    subscriptionStatus,
    needsUpgrade,
    currentPlan,
    maxHouses,
    currentHouses,
    canAddHomes,
    isFreeUser,
  };
}
