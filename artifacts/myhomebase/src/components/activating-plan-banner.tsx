import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getQueryFn } from "@/lib/queryClient";

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
