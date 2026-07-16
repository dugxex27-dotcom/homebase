import { useCallback, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { X } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? "");

interface CheckoutModalProps {
  plan: string;
  trialMode: boolean;
  onClose: () => void;
}

export function CheckoutModal({ plan, trialMode, onClose }: CheckoutModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

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
        <div style={{ padding: "20px" }}>
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
