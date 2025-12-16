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
  const subscriptionStatus = data.subscriptionStatus || 'inactive';
  const trialEndsAt = data.trialEndsAt ? new Date(data.trialEndsAt) : null;
  const now = new Date();

  // Calculate trial status
  const isInTrial = subscriptionStatus === 'trialing' && !!trialEndsAt && trialEndsAt > now;
  const trialDaysRemaining = trialEndsAt 
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const trialExpired = trialEndsAt ? trialEndsAt <= now && subscriptionStatus !== 'active' : false;

  // Check if user has an active paid subscription
  const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'grandfathered';
  
  // A user is a paid subscriber if they have an active subscription (not just trialing)
  const isPaidSubscriber = hasActiveSubscription && !!data.stripeSubscriptionId;

  // User needs upgrade if trial expired and no active subscription
  const needsUpgrade = (trialExpired || subscriptionStatus === 'inactive' || subscriptionStatus === 'cancelled') 
    && !hasActiveSubscription && !isInTrial;

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
