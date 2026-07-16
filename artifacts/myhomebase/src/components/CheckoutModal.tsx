import { useCallback, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { X, Check } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "");

interface PlanSummaryInfo {
  name: string;
  price: string;
  period: string;
  benefits: string[];
}

const PLAN_SUMMARY: Record<string, PlanSummaryInfo> = {
  base: {
    name: "Base Plan",
    price: "$5",
    period: "/month",
    benefits: [
      "Manage up to 2 homes",
      "Personalized maintenance schedules",
      "Home document vault & AI coach",
    ],
  },
  premium: {
    name: "Premium Plan",
    price: "$20",
    period: "/month",
    benefits: [
      "Manage up to 6 homes",
      "Priority contractor matching",
      "Advanced maintenance insights",
    ],
  },
  premium_plus: {
    name: "Premium Plus",
    price: "$40",
    period: "/month",
    benefits: [
      "Unlimited homes",
      "Full AI-powered document analysis",
      "Dedicated support & claim packages",
    ],
  },
  basic: {
    name: "Contractor Basic",
    price: "$20",
    period: "/month",
    benefits: [
      "Get discovered by homeowners",
      "Messaging, proposals & reviews",
      "Up to $20/mo in referral credits",
    ],
  },
  pro: {
    name: "Contractor Pro",
    price: "$40",
    period: "/month",
    benefits: [
      "Full CRM, scheduling & invoicing",
      "Accept payments via Stripe Connect",
      "Team management & analytics",
    ],
  },
};

interface CheckoutModalProps {
  plan: string;
  trialMode: boolean;
  onClose: () => void;
}

export function CheckoutModal({ plan, trialMode, onClose }: CheckoutModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const summary = PLAN_SUMMARY[plan] ?? null;

  const fetchClientSecret = useCallback(async () => {
    const res = await apiRequest("/api/create-subscription-checkout", "POST", {
      plan,
      trialMode,
      embedded: true,
    });
    const data = await res.json();
    if (!data.clientSecret) throw new Error(data.message ?? "Failed to start checkout");
    return data.clientSecret as string;
  }, [plan, trialMode]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(28,14,60,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "540px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 32px 80px rgba(44,15,91,0.35)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 12px",
            borderBottom: "1px solid #EEEDFE",
          }}
        >
          <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "16px", color: "#2C0F5B" }}>
            Complete your subscription
          </span>
          <button
            onClick={onClose}
            aria-label="Close checkout"
            style={{
              background: "#EEEDFE",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3C258E",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Plan summary card */}
        {summary && (
          <div
            style={{
              margin: "16px 20px 0",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #3C258E 0%, #5B3FBF 100%)",
              padding: "16px 20px",
              fontFamily: "Inter, sans-serif",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75, marginBottom: "4px" }}>
                  {trialMode ? "14-day free trial, then" : "You're subscribing to"}
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.2 }}>
                  {summary.name}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1 }}>{summary.price}</span>
                <span style={{ fontSize: "13px", fontWeight: 400, opacity: 0.8 }}>{summary.period}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {summary.benefits.map((benefit) => (
                <div key={benefit} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 500 }}>
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span style={{ opacity: 0.92 }}>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stripe checkout */}
        <div style={{ padding: "20px" }}>
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
