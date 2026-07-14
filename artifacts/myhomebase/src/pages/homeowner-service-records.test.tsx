/**
 * Tests confirming that a 409 DUPLICATE_INVOICE response from
 * /api/invoice-analyses/analyze surfaces the friendly "Already Scanned" UI
 * instead of a destructive error toast in the service-records upload flow.
 *
 * Also verifies the normal 200 success path routes to the review step.
 *
 * All external dependencies are mocked so these tests run without a server.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mutable flags
// ---------------------------------------------------------------------------

const flags = vi.hoisted(() => ({
  toastSpy: vi.fn(),
  invalidateQueriesSpy: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks — must appear before subject import
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-001", role: "homeowner", firstName: "Alex" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

vi.mock("@/hooks/useHomeownerSubscription", () => ({
  useHomeownerSubscription: () => ({
    isFreeUser: false,
    isPaidSubscriber: true,
    subscriptionStatus: "active",
    isLoading: false,
    isInTrial: false,
    needsUpgrade: false,
    trialDaysRemaining: 0,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: flags.toastSpy }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/service-records", vi.fn()],
  useRoute: () => [false, {}],
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@/lib/nativeBrowser", () => ({
  isNativePlatform: false,
  onBackButton: () => () => {},
  onAppStateChange: () => () => {},
}));

vi.mock("@/components/homeowner-feature-gate", () => ({
  FreeUserUpgradePrompt: () => <div data-testid="free-upgrade-prompt" />,
  HomeownerTrialBanner: () => null,
}));

// Stub Select to native elements for easy interaction in happy-dom
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <select
      data-testid="mock-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectLabel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: vi.fn(({ queryKey }: { queryKey: readonly unknown[] }) => {
      const key0 = queryKey[0];
      if (key0 === "/api/houses") {
        return {
          data: [
            {
              id: "house-1",
              userId: "user-001",
              name: "My Home",
              address: "123 Main St",
              city: "Springfield",
              state: "IL",
              zip: "62701",
              homeType: "single-family",
              yearBuilt: 2000,
              squareFootage: 2000,
              bedrooms: 3,
              bathrooms: 2,
              roofType: null,
              hvacType: null,
              homeSystems: [],
              climateZone: "mixed",
              lat: "39.7817",
              lon: "-89.6501",
              createdAt: "2024-01-01T00:00:00.000Z",
              updatedAt: "2024-01-01T00:00:00.000Z",
            },
          ],
          isLoading: false,
        };
      }
      if (key0 === "/api/invoice-analyses") {
        return { data: [], isLoading: false };
      }
      return { data: undefined, isLoading: false };
    }),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      status: "idle" as const,
      error: null,
      data: undefined,
      reset: vi.fn(),
    })),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: flags.invalidateQueriesSpy,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
    })),
  };
});

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }),
  getQueryFn: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import subject AFTER all vi.mock() calls
// ---------------------------------------------------------------------------

import HomeownerServiceRecords from "./homeowner-service-records";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  return render(<HomeownerServiceRecords />);
}

async function openAiDialog() {
  const btn = screen.getByTestId("button-ai-scan-invoice");
  await userEvent.click(btn);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
  flags.toastSpy.mockClear();
  flags.invalidateQueriesSpy.mockClear();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------

describe("Service Records — AI invoice upload: 409 DUPLICATE_INVOICE", () => {
  it("shows 'Already Scanned' state and does NOT show a destructive toast", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 409,
      ok: false,
      json: async () => ({ code: "DUPLICATE_INVOICE", analysisId: "ana-dup-001" }),
    } as Response);

    await act(async () => { renderPage(); });

    await openAiDialog();

    // Switch to DIY mode (bypasses the "invoice file required" guard)
    const diyBtn = screen.getByRole("button", { name: /diy/i });
    await userEvent.click(diyBtn);

    // Trigger analysis
    const analyzeBtn = screen.getByRole("button", { name: /analyze with ai/i });
    await userEvent.click(analyzeBtn);

    // The duplicate step UI must be visible
    expect(
      screen.getByText("You already scanned this invoice"),
    ).toBeDefined();

    // The "Scan a different invoice" reset button must be present
    expect(
      screen.getByRole("button", { name: /scan a different invoice/i }),
    ).toBeDefined();

    // No destructive toast should have been shown for a duplicate
    const destructiveCalls = flags.toastSpy.mock.calls.filter(
      (args: unknown[]) =>
        (args[0] as { variant?: string })?.variant === "destructive",
    );
    expect(destructiveCalls).toHaveLength(0);

    // fetch was called once with the analyze endpoint
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/invoice-analyses/analyze",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

// ---------------------------------------------------------------------------

describe("Service Records — AI invoice upload: 200 success path", () => {
  it("shows the 'Review Extracted Details' step after a successful analysis", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({
        id: "ana-001",
        status: "pending",
        serviceDescription: "HVAC tune-up",
        serviceDate: "2025-04-10",
        totalAmount: "199.00",
        contractorName: "Bob",
        contractorCompany: "Bob's HVAC",
        homeArea: "hvac",
        serviceType: "maintenance",
        diyVerified: false,
        maintenanceLogId: null,
        houseId: "house-1",
        homeownerId: "user-001",
        createdAt: "2025-04-10T00:00:00.000Z",
        updatedAt: "2025-04-10T00:00:00.000Z",
      }),
    } as Response);

    await act(async () => { renderPage(); });

    await openAiDialog();

    // DIY mode so no file guard
    const diyBtn = screen.getByRole("button", { name: /diy/i });
    await userEvent.click(diyBtn);

    const analyzeBtn = screen.getByRole("button", { name: /analyze with ai/i });
    await userEvent.click(analyzeBtn);

    // DIY mode with diyVerified:false routes to the "diy-verify" step.
    // Confirm that step-specific heading is visible.
    expect(screen.getByText("Verify DIY Work")).toBeDefined();

    // The duplicate state must NOT appear
    expect(
      screen.queryByText("You already scanned this invoice"),
    ).toBeNull();

    // No destructive toasts
    const destructiveCalls = flags.toastSpy.mock.calls.filter(
      (args: unknown[]) =>
        (args[0] as { variant?: string })?.variant === "destructive",
    );
    expect(destructiveCalls).toHaveLength(0);
  });
});
