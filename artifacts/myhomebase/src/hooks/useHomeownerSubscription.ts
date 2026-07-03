import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

export interface SubscriptionStatus {
  isLoading: boolean;
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

  const { data: userData, isLoading: isUserLoading, isError: isUserError } = useQuery({
    queryKey: ['/api/user'],
    enabled: !!typedUser && typedUser.role === 'homeowner',
  });

  const { data: subscriptionData, isLoading: isSubLoading, isError: isSubError } = useQuery({
    queryKey: ['/api/my-subscription'],
    enabled: !!typedUser && typedUser.role === 'homeowner',
  });

  const isLoading = isAuthLoading || isUserLoading || isSubLoading;
  const hasError = isUserError || isSubError;

  // During loading or error states, DON'T treat user as free (could block paying users)
  if (isLoading || !userData || hasError) {
    return {
      isLoading: isLoading || hasError,
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

  const data = userData as any;
  const subData = subscriptionData as any;
  
  // Demo accounts get full access - use subscription endpoint data directly
  if (subData?.isDemoAccount) {
    return {
      isLoading: false,
      isInTrial: false,
      trialDaysRemaining: 0,
      hasActiveSubscription: true,
      isPaidSubscriber: true,
      trialExpired: false,
      subscriptionStatus: 'active',
      needsUpgrade: false,
      currentPlan: subData.currentPlan || 'premium_plus',
      maxHouses: subData.maxHouses ?? 'unlimited',
      currentHouses: subData.currentHouses ?? 0,
      canAddHomes: true,
      isFreeUser: false,
    };
  }
  
  const subscriptionStatus = data.subscriptionStatus || 'inactive';
  const now = new Date();
  
  // Calculate effective trial end date - use trialEndsAt if set, otherwise createdAt + 14 days
  let effectiveTrialEndsAt: Date | null = null;
  if (data.trialEndsAt) {
    effectiveTrialEndsAt = new Date(data.trialEndsAt);
  } else if (data.createdAt) {
    // For older accounts without trialEndsAt, calculate based on account creation + 14 days
    effectiveTrialEndsAt = new Date(new Date(data.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000);
  }

  // Calculate trial status
  // User is only in trial if they have status 'trialing' AND a valid future trial end date
  const isInTrial = subscriptionStatus === 'trialing' && !!effectiveTrialEndsAt && effectiveTrialEndsAt > now;
  const trialDaysRemaining = effectiveTrialEndsAt && effectiveTrialEndsAt > now
    ? Math.max(0, Math.ceil((effectiveTrialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  // Trial is expired if:
  // 1. Status is 'trialing' and effectiveTrialEndsAt is in the past (or missing createdAt to calculate)
  // 2. TrialEndsAt/effectiveTrialEndsAt exists and is in the past (regardless of status, unless active/grandfathered)
  const trialExpired = Boolean(
    (subscriptionStatus === 'trialing' && (!effectiveTrialEndsAt || effectiveTrialEndsAt <= now)) || // Trial ended or can't calculate
    (effectiveTrialEndsAt && effectiveTrialEndsAt <= now && subscriptionStatus !== 'active' && subscriptionStatus !== 'grandfathered')
  );

  // Check if user has an active paid subscription
  const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'grandfathered';
  
  // Active server status is the source of truth. Apple IAP users do not have
  // a Stripe subscription id, so checking Stripe only would hide paid access.
  const isPaidSubscriber = hasActiveSubscription;

  // User needs upgrade if:
  // 1. Trial expired and no active subscription
  // 2. Status is inactive or cancelled
  // 3. Status is trialing but no valid trial (missing trial end date)
  const needsUpgrade = !hasActiveSubscription && !isInTrial && 
    (trialExpired || subscriptionStatus === 'inactive' || subscriptionStatus === 'cancelled' || subscriptionStatus === null);

  // Plan info from subscription endpoint
  const currentPlan = subData?.currentPlan || 'free';
  const maxHouses = subData?.maxHouses ?? 0;
  const currentHouses = subData?.currentHouses ?? 0;
  const canAddHomes = subData?.canAddHomes ?? false;
  const isFreeUser = currentPlan === 'free' && !isInTrial && !hasActiveSubscription;

  return {
    isLoading: false,
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
