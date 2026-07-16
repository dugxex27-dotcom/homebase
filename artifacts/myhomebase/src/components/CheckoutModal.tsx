import { useCallback, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { X, Check } from "lucide-react";
import "./CheckoutModal.css";

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

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const el = overlayRef.current;
      if (!el) return;
      el.style.setProperty("--vvp-height", `${vv.height}px`);
      el.style.setProperty("--vvp-offset-top", `${vv.offsetTop}px`);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

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
      className="checkout-overlay"
    >
      <div className="checkout-sheet">
        <div className="checkout-header">
          <span className="checkout-title">Complete your subscription</span>
          <button
            onClick={onClose}
            aria-label="Close checkout"
            className="checkout-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Plan summary card */}
        {summary && (
          <div className="plan-summary-card">
            <div className="plan-summary-header">
              <div className="plan-summary-name-block">
                <div className="plan-summary-eyebrow">
                  {trialMode ? "14-day free trial, then" : "You're subscribing to"}
                </div>
                <div className="plan-summary-name">
                  {summary.name}
                </div>
              </div>
              <div className="plan-summary-price-block">
                <span className="plan-summary-price">{summary.price}</span>
                <span className="plan-summary-period">{summary.period}</span>
              </div>
            </div>
            <div className="plan-summary-benefits">
              {summary.benefits.map((benefit) => (
                <div key={benefit} className="plan-summary-benefit-row">
                  <div className="plan-summary-check-icon">
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span className="plan-summary-benefit-text">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stripe checkout */}
        <div className="checkout-body">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
