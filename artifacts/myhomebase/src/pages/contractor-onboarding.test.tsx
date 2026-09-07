import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mutation = vi.hoisted(() => ({
  mutationFn: null as null | (() => Promise<void>),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/contractor-onboarding", vi.fn()],
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: { mutationFn: () => Promise<void> }) => {
    mutation.mutationFn = options.mutationFn;
    return { mutate: vi.fn(), isPending: false };
  },
}));

import ContractorOnboarding, { CONTRACTOR_TEAM_SIZE_OPTIONS } from "./contractor-onboarding";

afterEach(cleanup);

describe("contractor onboarding email", () => {
  beforeEach(() => {
    mutation.mutationFn = null;
    vi.restoreAllMocks();
  });

  it("pre-fills an empty email, keeps it editable, and saves the edited value", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        email: "profile@example.com",
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    render(<ContractorOnboarding />);

    const emailInput = await screen.findByLabelText("Email address");
    await waitFor(() => expect(emailInput).toHaveValue("profile@example.com"));

    fireEvent.change(emailInput, { target: { value: "business@example.com" } });
    expect(emailInput).toHaveValue("business@example.com");

    await mutation.mutationFn?.();

    const profileRequest = fetchMock.mock.calls.find(
      ([url, options]) => url === "/api/contractor/profile" && options?.method === "PUT",
    );
    expect(profileRequest).toBeDefined();
    expect(JSON.parse(String(profileRequest?.[1]?.body))).toMatchObject({
      email: "business@example.com",
    });
  });
});

describe("contractor onboarding team sizes", () => {
  it("caps the selectable team-size buckets at 50 people", () => {
    expect(CONTRACTOR_TEAM_SIZE_OPTIONS.map((option) => option.value)).toEqual([
      "just_me",
      "2_10",
      "11_25",
      "26_50",
    ]);
    expect(CONTRACTOR_TEAM_SIZE_OPTIONS.at(-1)?.label).toBe("26–50 people");
  });

  it("does not expose enterprise or contact-sales messaging", () => {
    const optionCopy = CONTRACTOR_TEAM_SIZE_OPTIONS
      .flatMap((option) => [option.value, option.label, option.sub, option.tier])
      .join(" ")
      .toLowerCase();

    expect(optionCopy).not.toContain("enterprise");
    expect(optionCopy).not.toContain("100_plus");
    expect(optionCopy).not.toContain("100+");
    expect(optionCopy).not.toContain("contact");
    expect(optionCopy).not.toContain("business plan");
  });
});