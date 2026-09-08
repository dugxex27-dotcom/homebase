import type { ReactNode } from "react";

export function EmbeddedCheckoutProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function EmbeddedCheckout() {
  return (
    <form aria-label="Secure Stripe payment form">
      <label>
        Card number
        <input aria-label="Card number" inputMode="numeric" />
      </label>
      <button type="submit">Pay</button>
    </form>
  );
}