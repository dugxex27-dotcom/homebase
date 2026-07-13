/**
 * Unit tests for OnboardingFlowController
 *
 * Confirms that the overlay is native-only and respects the returning-user gate.
 * All external dependencies (Capacitor, React Query, auth hook, API client,
 * address autocomplete) are mocked so these tests run in a pure happy-dom
 * environment without a running server.
 *
 * NOTE: OnboardingFlow renders via createPortal into document.body, not into
 * the container div returned by render(). All "renders nothing" assertions
 * therefore use screen.queryBy* against document.body, not container emptiness.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mutable flags — must be set before imports are processed
// ---------------------------------------------------------------------------

const flags = vi.hoisted(() => ({
  isNative: false,
  queryData: null as null | Record<string, unknown>,
  queryEnabled: false,
  invalidateQueriesSpy: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/nativeBrowser", () => ({
  get isNativePlatform() {
    return flags.isNative;
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-001", role: "homeowner" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: vi.fn(({ enabled }: { enabled?: boolean }) => {
      flags.queryEnabled = !!enabled;
      return { data: flags.queryData, isLoading: false };
    }),
    useMutation: vi.fn((options: any) => {
      const mutateFn = async (variables: unknown) => {
        try {
          const result = await options.mutationFn(variables);
          options.onSuccess?.(result);
        } catch (err) {
          options.onError?.(err);
        }
      };
      return {
        mutate: vi.fn((variables: unknown) => { mutateFn(variables); }),
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      };
    }),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: flags.invalidateQueriesSpy,
    })),
  };
});

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockResolvedValue({ json: async () => ({ referrerName: "Jane" }) }),
}));

vi.mock("@/components/address-autocomplete", () => ({
  default: ({
    onChange,
    onSelect,
    placeholder,
    value,
  }: {
    onChange: (v: string) => void;
    onSelect: (formatted: string, raw: { lat: string; lon: string; display_name: string }) => void;
    placeholder?: string;
    value: string;
    className?: string;
  }) => (
    <div data-testid="address-autocomplete">
      <input
        aria-label={placeholder ?? "address"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="address-input"
      />
      <button
        data-testid="address-select-trigger"
        type="button"
        onClick={() => {
          const formatted = "123 Main St, Springfield, IL";
          onChange(formatted);
          onSelect(formatted, {
            lat: "39.7817",
            lon: "-89.6501",
            display_name: formatted,
          });
        }}
      >
        Select address
      </button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Import subject AFTER all vi.mock() calls
// ---------------------------------------------------------------------------

import { OnboardingFlowController } from "./onboarding-flow";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderController() {
  return render(<OnboardingFlowController />);
}

/** Find the primary action button inside the portal (document.body). */
function getSubmitButton() {
  return within(document.body).getByRole("button", { name: "Add My Home" });
}
function querySubmitButton() {
  return within(document.body).queryByRole("button", { name: "Add My Home" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
  flags.isNative = false;
  flags.queryData = null;
  flags.queryEnabled = false;
  flags.invalidateQueriesSpy.mockClear();
});

describe("OnboardingFlowController — native gate", () => {
  it("renders no overlay on web (isNativePlatform = false)", () => {
    flags.isNative = false;

    renderController();

    // Portal renders into document.body; nothing should appear when gated out.
    expect(screen.queryByText(/got a referral code/i)).toBeNull();
    expect(screen.queryByText(/add your first home/i)).toBeNull();
  });

  it("does not query the API when not on native", () => {
    flags.isNative = false;

    renderController();

    expect(flags.queryEnabled).toBe(false);
  });

  it("renders no overlay when the user has already completed onboarding (completedAt set)", () => {
    flags.isNative = true;
    flags.queryData = {
      id: "prog-001",
      userId: "user-001",
      currentStep: 4,
      completedSteps: [2, 3],
      skippedSteps: [],
      referralCodeApplied: null,
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: "2025-01-01T01:00:00.000Z",
    };

    renderController();

    // completedAt is set → controller returns null → portal never mounts.
    expect(screen.queryByText(/got a referral code/i)).toBeNull();
    expect(screen.queryByText(/add your first home/i)).toBeNull();
  });

  it("renders the overlay when native, not completed, and progress data is available", () => {
    flags.isNative = true;
    flags.queryData = {
      id: "prog-001",
      userId: "user-001",
      currentStep: 2,
      completedSteps: [],
      skippedSteps: [],
      referralCodeApplied: null,
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: null,
    };

    renderController();

    expect(screen.getByText(/got a referral code/i)).toBeDefined();
  });
});

describe("OnboardingFlowController — address step gate", () => {
  beforeEach(() => {
    flags.isNative = true;
    flags.queryData = {
      id: "prog-001",
      userId: "user-001",
      currentStep: 3,
      completedSteps: [2],
      skippedSteps: [],
      referralCodeApplied: null,
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: null,
    };
  });

  it("disables the Add My Home button before an address is selected", () => {
    renderController();

    expect(getSubmitButton()).toBeDisabled();
  });

  it("enables the Add My Home button after an address is selected from the dropdown", async () => {
    const user = userEvent.setup();
    renderController();

    await user.click(screen.getByTestId("address-select-trigger"));

    expect(getSubmitButton()).not.toBeDisabled();
  });

  it("re-disables the Add My Home button when the address field is cleared after selection", async () => {
    const user = userEvent.setup();
    renderController();

    // First select an address (sets addressReady = true)
    await user.click(screen.getByTestId("address-select-trigger"));
    expect(getSubmitButton()).not.toBeDisabled();

    // Then clear the field (handleAddressChange("") → addressReady = false)
    const input = screen.getByTestId("address-input");
    await user.clear(input);

    expect(getSubmitButton()).toBeDisabled();
  });

  it("does not show the Add My Home button on a non-native/completed session", () => {
    // Sanity check: without native flag, the entire overlay is absent.
    flags.isNative = false;

    renderController();

    expect(querySubmitButton()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Skip address path tests
// Confirms that "I'll add my home later" hands off to GuidedTour immediately
// ---------------------------------------------------------------------------

describe("OnboardingFlowController — GuidedTour handoff via skip address", () => {
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    flags.isNative = true;
    flags.queryData = {
      id: "prog-001",
      userId: "user-001",
      currentStep: 3,
      completedSteps: [2],
      skippedSteps: [],
      referralCodeApplied: null,
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: null,
    };
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  it("calls invalidateQueries with /api/onboarding/progress when skip address is tapped", async () => {
    renderController();

    const skipBtn = within(document.body).getByRole("button", {
      name: /I'll add my home later/i,
    });

    await act(async () => {
      fireEvent.click(skipBtn);
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(flags.invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["/api/onboarding/progress"],
    });
  });

  it("does not use a setTimeout delay — onClose fires immediately on the skip path", async () => {
    renderController();

    const skipBtn = within(document.body).getByRole("button", {
      name: /I'll add my home later/i,
    });

    await act(async () => {
      fireEvent.click(skipBtn);
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    // The submit-address path uses setTimeout(onClose, 1400); the skip path
    // must not — onClose is called synchronously after mutateAsync resolves.
    const timedCloseCall = setTimeoutSpy.mock.calls.find(
      ([, delay]) => delay === 1400
    );
    expect(timedCloseCall).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Referral step transition tests
// Confirms that both exit paths from step 2 advance the flow to step 3 (address)
// ---------------------------------------------------------------------------

describe("OnboardingFlowController — referral step transitions to address step", () => {
  beforeEach(() => {
    flags.isNative = true;
    flags.queryData = {
      id: "prog-001",
      userId: "user-001",
      currentStep: 2,
      completedSteps: [],
      skippedSteps: [],
      referralCodeApplied: null,
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: null,
    };
  });

  it("advances to the address step when 'Skip, I don't have a code' is clicked", async () => {
    renderController();

    // Step 2 is visible
    expect(screen.getByText(/got a referral code/i)).toBeDefined();

    await act(async () => {
      within(document.body)
        .getByRole("button", { name: /skip.*don't have a code/i })
        .click();
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    // Step 3 (address) is now visible; the address autocomplete mock renders
    expect(screen.getByTestId("address-autocomplete")).toBeDefined();
    // And the referral prompt is gone
    expect(screen.queryByText(/got a referral code/i)).toBeNull();
  });

  it("advances to the address step when 'Continue' is clicked after applying a referral code", async () => {
    const user = userEvent.setup();
    renderController();

    // Step 2 is visible
    expect(screen.getByText(/got a referral code/i)).toBeDefined();

    // Type a referral code into the input field
    await user.type(
      within(document.body).getByPlaceholderText(/enter code/i),
      "FRIEND10"
    );

    // Click Apply — triggers referralMutation.mutate → mutationFn → onSuccess → setReferralApplied(true)
    await act(async () => {
      within(document.body).getByRole("button", { name: "Apply" }).click();
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });

    // "Code applied!" banner confirms referralApplied = true and the apply path worked
    expect(screen.getByText(/code applied/i)).toBeDefined();
    expect(screen.getByText(/referred by jane/i)).toBeDefined();

    // Click Continue — handleReferralNext → progressMutation.mutateAsync → setStep(3)
    await act(async () => {
      within(document.body).getByRole("button", { name: /^continue$/i }).click();
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    // Step 3 (address) is now visible
    expect(screen.getByTestId("address-autocomplete")).toBeDefined();
    // And the referral prompt is gone
    expect(screen.queryByText(/got a referral code/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GuidedTour handoff tests
// Confirms the onClose → invalidateQueries chain that triggers the welcome modal
// ---------------------------------------------------------------------------

describe("OnboardingFlowController — GuidedTour handoff after onboarding completion", () => {
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on setTimeout without replacing its implementation so real async
    // resolution still works. We capture the scheduled callback and delay to
    // assert the handoff, then fire it manually.
    setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    flags.isNative = true;
    flags.queryData = {
      id: "prog-001",
      userId: "user-001",
      currentStep: 3,
      completedSteps: [2],
      skippedSteps: [],
      referralCodeApplied: null,
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: null,
    };
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  /**
   * Simulate selecting an address then clicking "Add My Home".
   * Flushes the async mutateAsync chain via multiple microtask yields so that
   * the setTimeout(onClose, 1400) call has been scheduled by the time we return.
   */
  async function submitAddress() {
    fireEvent.click(screen.getByTestId("address-select-trigger"));
    await act(async () => {
      fireEvent.click(within(document.body).getByRole("button", { name: "Add My Home" }));
      // Drain the microtask queue: each awaited mutateAsync internally
      // resolves via Promise, so a few yields are enough.
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
  }

  /** Return the first setTimeout call whose delay is exactly 1400ms. */
  function findOnCloseTimer() {
    return setTimeoutSpy.mock.calls.find(
      ([, delay]) => delay === 1400
    ) as [() => void, number] | undefined;
  }

  it("schedules onClose within a 1400ms setTimeout after address submit mutations succeed", async () => {
    renderController();

    await submitAddress();

    // handleAddressSubmit must have called setTimeout(onClose, 1400)
    expect(findOnCloseTimer()).toBeDefined();
  });

  it("calls invalidateQueries with the /api/onboarding/progress key when the scheduled onClose fires", async () => {
    renderController();

    await submitAddress();

    const timer = findOnCloseTimer();
    expect(timer).toBeDefined();

    // Invoke the scheduled callback directly — this is the onClose that the
    // GuidedTour welcome modal depends on
    act(() => {
      timer![0]();
    });

    expect(flags.invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["/api/onboarding/progress"],
    });
  });
});
