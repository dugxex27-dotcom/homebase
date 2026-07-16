import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getQueryFn } from "@/lib/queryClient";

const FAST_POLL_INTERVAL_MS = 5_000;
const MAX_FAST_POLL_MS = 60_000;

function useActivatingPlanStatus(): boolean {
  const { user } = useAuth();
  const typedUser = user as any;
  const role: string | undefined = typedUser?.role;
  const stripeCustomerId: string | undefined = typedUser?.stripeCustomerId;

  const { data: homeownerUserData } = useQuery<any>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!stripeCustomerId && role === "homeowner",
  });

  const { data: contractorSubData } = useQuery<any>({
    queryKey: ["/api/contractor/subscription"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!stripeCustomerId && role === "contractor",
  });

  if (!stripeCustomerId) return false;

  if (role === "homeowner") {
    const status = homeownerUserData?.subscriptionStatus ?? typedUser?.subscriptionStatus;
    return status === "inactive";
  }

  if (role === "contractor") {
    const status = contractorSubData?.subscriptionStatus ?? typedUser?.subscriptionStatus;
    return status === "inactive";
  }

  return false;
}

export function ActivatingPlanBanner() {
  const queryClient = useQueryClient();
  const isActivating = useActivatingPlanStatus();
  const [dismissed, setDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fast-poll window is independent of whether the banner is dismissed.
  // The window opens when activation is first detected and closes either
  // when the status transitions to active (isActivating → false) or after
  // MAX_FAST_POLL_MS, whichever comes first.
  const [fastPollExpired, setFastPollExpired] = useState(false);

  // Incrementing pollEpoch re-triggers the useEffect to restart the timer,
  // which is how the retry button opens a fresh 60-second window.
  const [pollEpoch, setPollEpoch] = useState(0);

  useEffect(() => {
    if (!isActivating) {
      // Status resolved — reset so a future activation cycle gets a fresh window.
      setFastPollExpired(false);
      return;
    }
    // Start (or restart) the expiry timer each time the window opens or retries.
    setFastPollExpired(false);
    const timer = setTimeout(() => setFastPollExpired(true), MAX_FAST_POLL_MS);
    return () => clearTimeout(timer);
  }, [isActivating, pollEpoch]);

  // Fast-polling is tied to the activation state, NOT to banner visibility.
  // This means polling continues even if the user dismisses the banner,
  // so features still unlock automatically in the background.
  const fastPollActive = isActivating && !fastPollExpired;

  // Speed up /api/auth/user during the activation window.
  // React Query uses the shortest refetchInterval across all active observers,
  // so this subscriber speeds up the shared query without changing useAuth.ts.
  useQuery<any>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: fastPollActive,
    refetchInterval: FAST_POLL_INTERVAL_MS,
    staleTime: 0,
  });

  // Speed up /api/user (homeowner subscription status).
  useQuery<any>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: fastPollActive,
    refetchInterval: FAST_POLL_INTERVAL_MS,
    staleTime: 0,
  });

  // Speed up /api/contractor/subscription so contractor status transitions
  // to active in sync with /api/auth/user — prevents stale cached inactive
  // data from blocking auto-dismiss on the contractor path.
  useQuery<any>({
    queryKey: ["/api/contractor/subscription"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: fastPollActive,
    refetchInterval: FAST_POLL_INTERVAL_MS,
    staleTime: 0,
  });

  if (!isActivating || dismissed) return null;

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/my-subscription"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/contractor/subscription"] });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/auth/user"] }),
        queryClient.refetchQueries({ queryKey: ["/api/user"] }),
        queryClient.refetchQueries({ queryKey: ["/api/contractor/subscription"] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleRetry() {
    setDismissed(false);
    setPollEpoch((e) => e + 1);
  }

  if (fastPollExpired) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#fff7ed",
          border: "1px solid #fb923c",
          borderRadius: 8,
          padding: "10px 14px",
          margin: "0 0 12px 0",
          fontSize: 14,
          color: "#9a3412",
          flexWrap: "wrap",
        }}
      >
        <AlertTriangle
          style={{ width: 16, height: 16, flexShrink: 0 }}
        />
        <span style={{ flex: 1, minWidth: 200 }}>
          <strong>Taking longer than expected</strong> — your plan may still be activating.{" "}
          <a
            href="mailto:support@myhomebase.app"
            style={{ color: "#9a3412", textDecoration: "underline", fontWeight: 600 }}
          >
            Contact support
          </a>{" "}
          if this persists.
        </span>
        <button
          onClick={handleRetry}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "#ffedd5",
            border: "1px solid #fb923c",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 13,
            fontWeight: 600,
            color: "#9a3412",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <RefreshCw style={{ width: 13, height: 13 }} />
          Try again
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9a3412",
            padding: 2,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            opacity: 0.7,
          }}
        >
          <X style={{ width: 15, height: 15 }} />
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#fffbeb",
        border: "1px solid #fcd34d",
        borderRadius: 8,
        padding: "10px 14px",
        margin: "0 0 12px 0",
        fontSize: 14,
        color: "#92400e",
        flexWrap: "wrap",
      }}
    >
      <Loader2
        style={{ width: 16, height: 16, flexShrink: 0, animation: "spin 1s linear infinite" }}
      />
      <span style={{ flex: 1, minWidth: 200 }}>
        <strong>Your subscription is activating</strong> — this usually takes a
        few seconds.
      </span>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "#fef3c7",
          border: "1px solid #fcd34d",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 13,
          fontWeight: 600,
          color: "#92400e",
          cursor: isRefreshing ? "not-allowed" : "pointer",
          opacity: isRefreshing ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        <RefreshCw style={{ width: 13, height: 13 }} />
        {isRefreshing ? "Refreshing…" : "Refresh now"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#92400e",
          padding: 2,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          opacity: 0.7,
        }}
      >
        <X style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );
}
