import { useCallback, useEffect, useRef, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { X, Zap } from "lucide-react";
import "./CheckoutModal.css";

interface BoostRenewalCheckoutModalProps {
  boostId: string;
  serviceCategory: string;
  onClose: () => void;
}

export function BoostRenewalCheckoutModal({
  boostId,
  serviceCategory,
  onClose,
}: BoostRenewalCheckoutModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [checkoutError, setCheckoutError] = useState(false);
  const [checkoutAttempt, setCheckoutAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStripe(null);
    loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "")
      .then((instance) => {
        if (!cancelled) {
          if (instance) setStripe(instance);
          else setCheckoutError(true);
        }
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
      const response = await fetch(
        `/api/contractors/boost/${encodeURIComponent(boostId)}/create-renewal-checkout`,
        { method: "POST", credentials: "include" },
      );
      const data = await response.json();
      if (!response.ok || !data.clientSecret) {
        throw new Error(data.message || "Failed to start renewal");
      }
      return data.clientSecret as string;
    } catch (error) {
      setCheckoutError(true);
      throw error;
    }
  }, [boostId]);

  return (
    <div
      ref={overlayRef}
      className="checkout-overlay"
      data-testid="boost-renewal-checkout"
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div className="checkout-sheet">
        <div className="checkout-header">
          <span className="checkout-title">Renew visibility boost</span>
          <button onClick={onClose} aria-label="Close renewal checkout" className="checkout-close-btn">
            <X size={16} />
          </button>
        </div>

        <div className="plan-summary-card">
          <div className="plan-summary-header">
            <div className="plan-summary-name-block">
              <div className="plan-summary-eyebrow">30 more days</div>
              <div className="plan-summary-name">{serviceCategory}</div>
            </div>
            <div className="plan-summary-price-block">
              <span className="plan-summary-price">$49</span>
              <span className="plan-summary-period"> one-time</span>
            </div>
          </div>
          <div className="plan-summary-benefit-row">
            <div className="plan-summary-check-icon"><Zap size={11} /></div>
            <span className="plan-summary-benefit-text">
              Keep your business boosted in homeowner search results
            </span>
          </div>
        </div>

        <div className="checkout-body">
          {checkoutError ? (
            <div className="checkout-error" role="alert">
              <div className="checkout-error-title">We couldn&apos;t load checkout</div>
              <p className="checkout-error-message">Check your connection and try again.</p>
              <button
                type="button"
                className="checkout-retry-btn"
                onClick={() => {
                  setCheckoutError(false);
                  setCheckoutAttempt((attempt) => attempt + 1);
                }}
              >
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
            <div className="checkout-loading" role="status">Loading secure checkout…</div>
          )}
        </div>
      </div>
    </div>
  );
}