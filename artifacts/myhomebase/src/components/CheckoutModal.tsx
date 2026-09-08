import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { X, Check } from "lucide-react";
import "./CheckoutModal.css";

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
    name: "Contractor Plan",
    price: "$20",
    period: "/month",
    benefits: [
      "Three accepted people included",
      "$5/month per additional accepted person",
      "Full CRM, scheduling & invoicing",
      "Up to $20/mo in referral credits",
    ],
  },
};

interface CheckoutModalProps {
  plan: string;
  fromPlan?: string;
  trialMode: boolean;
  onClose: () => void;
}

const PLAN_LEVEL: Record<string, number> = {
  base: 1,
  premium: 2,
  premium_plus: 3,
};
export function CheckoutModal({ plan, fromPlan, trialMode, onClose }: CheckoutModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const summary = PLAN_SUMMARY[plan] ?? null;
  const benefits = getBenefits(plan, fromPlan);
  const [checkoutError, setCheckoutError] = useState(false);
  const [checkoutAttempt, setCheckoutAttempt] = useState(0);
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      overlayRef.current?.classList.add("checkout-overlay--legacy-viewport");
      return;
    }

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

  useEffect(() => {
    let cancelled = false;
    setStripe(null);

    loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "")
      .then((stripeInstance) => {
        if (cancelled) return;
        if (!stripeInstance) {
          setCheckoutError(true);
          return;
        }
        setStripe(stripeInstance);
      })
      .catch(() => {
        if (!cancelled) setCheckoutError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [checkoutAttempt]);

  const fetchClientSecret = useCallback(async () => {
    try {
      const deviceFingerprint = btoa([navigator.userAgent, navigator.language, screen.width, screen.height, new Date().getTimezoneOffset()].join('|')).slice(0, 40);
      const res = await apiRequest("/api/create-subscription-checkout", "POST", {
        plan,
        trialMode,
        embedded: true,
        deviceFingerprint,
      });
      const data = await res.json();
      if (!data.clientSecret) throw new Error(data.message ?? "Failed to start checkout");
      return data.clientSecret as string;
    } catch (error) {
      setCheckoutError(true);
      throw error;
    }
  }, [plan, trialMode]);

  const retryCheckout = () => {
    setCheckoutError(false);
    setCheckoutAttempt((attempt) => attempt + 1);
  };

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
              {benefits.map((benefit) => (
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
          {checkoutError ? (
            <div className="checkout-error" role="alert">
              <div className="checkout-error-title">We couldn&apos;t load checkout</div>
              <p className="checkout-error-message">
                Check your connection and try again. Your plan selection is still saved.
              </p>
              <button type="button" className="checkout-retry-btn" onClick={retryCheckout}>
                Try again
              </button>
            </div>
          ) : stripe ? (
            <EmbeddedCheckoutProvider
              key={checkoutAttempt}
              stripe={stripe}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="checkout-loading" role="status">
              Loading secure checkout…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getBenefits(plan: string, fromPlan?: string): string[] {
  const summary = PLAN_SUMMARY[plan];
  if (!summary) return [];

  const fromLevel = fromPlan ? PLAN_LEVEL[fromPlan] : undefined;
  const targetLevel = PLAN_LEVEL[plan];
  if (fromLevel === undefined || targetLevel === undefined || fromLevel >= targetLevel) {
    return summary.benefits;
  }

  return Object.entries(PLAN_LEVEL)
    .filter(([, level]) => level > fromLevel && level <= targetLevel)
    .sort(([, firstLevel], [, secondLevel]) => firstLevel - secondLevel)
    .flatMap(([planSlug]) => PLAN_SUMMARY[planSlug]?.benefits ?? []);
}
