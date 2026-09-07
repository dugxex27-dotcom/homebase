import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchClientSecretSpy = vi.hoisted(() => vi.fn());

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckoutProvider: ({ options, children }: any) => {
    fetchClientSecretSpy(options.fetchClientSecret);
    return <div data-testid="embedded-checkout-provider">{children}</div>;
  },
  EmbeddedCheckout: () => <div>Secure Stripe payment form</div>,
}));

import { BoostRenewalCheckoutModal } from "./BoostRenewalCheckoutModal";

describe("BoostRenewalCheckoutModal", () => {
  beforeEach(() => {
    fetchClientSecretSpy.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ clientSecret: "cs_test_embedded" }),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders Stripe Embedded Checkout and fetches its renewal client secret", async () => {
    render(
      <BoostRenewalCheckoutModal
        boostId="boost-123"
        serviceCategory="Plumbing"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Renew visibility boost")).toBeTruthy();
    expect(screen.getByText("Plumbing")).toBeTruthy();
    expect(await screen.findByText("Secure Stripe payment form")).toBeTruthy();

    await waitFor(() => expect(fetchClientSecretSpy).toHaveBeenCalledOnce());
    const clientSecret = await fetchClientSecretSpy.mock.calls[0][0]();
    expect(clientSecret).toBe("cs_test_embedded");
    expect(fetch).toHaveBeenCalledWith(
      "/api/contractors/boost/boost-123/create-renewal-checkout",
      { method: "POST", credentials: "include" },
    );
  });

  it("closes without navigating away from the app", async () => {
    const onClose = vi.fn();
    render(
      <BoostRenewalCheckoutModal
        boostId="boost-123"
        serviceCategory="Plumbing"
        onClose={onClose}
      />,
    );

    await screen.findByText("Secure Stripe payment form");
    fireEvent.click(screen.getByRole("button", { name: "Close renewal checkout" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});