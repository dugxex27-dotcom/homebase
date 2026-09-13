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
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mutable flags
// ---------------------------------------------------------------------------

const flags = vi.hoisted(() => ({
  toastSpy: vi.fn(),
  invalidateQueriesSpy: vi.fn(),
  setQueryDataSpy: vi.fn(),
  notifyInvoiceBadgeChangedSpy: vi.fn(),
  apiRequestSpy: vi.fn(),
  invoiceAnalyses: [] as Array<Record<string, unknown>>,
  maintenanceLogs: [] as Array<Record<string, unknown>>,
  houses: [
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
  ] as Array<Record<string, unknown>>,
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
        return { data: flags.houses, isLoading: false };
      }
      if (key0 === "/api/invoice-analyses") {
        return { data: flags.invoiceAnalyses, isLoading: false, isError: false };
      }
      if (key0 === "/api/maintenance-logs") {
        return { data: flags.maintenanceLogs, isLoading: false, isError: false };
      }
      return { data: undefined, isLoading: false };
    }),
    useMutation: vi.fn((options: {
      mutationFn?: (variables: unknown) => Promise<unknown>;
      onSuccess?: (data: unknown) => void;
      onError?: (error: Error, variables: unknown) => void;
    }) => {
      const run = async (variables: unknown) => {
        try {
          const data = await options.mutationFn?.(variables);
          options.onSuccess?.(data);
          return data;
        } catch (error) {
          options.onError?.(error as Error, variables);
          throw error;
        }
      };
      return {
        mutate: vi.fn((variables: unknown) => { void run(variables).catch(() => undefined); }),
        mutateAsync: vi.fn(run),
        isPending: false,
        isError: false,
        isSuccess: false,
        isIdle: true,
        status: "idle" as const,
        error: null,
        data: undefined,
        reset: vi.fn(),
      };
    }),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: flags.invalidateQueriesSpy,
      getQueryData: vi.fn(),
      setQueryData: flags.setQueryDataSpy,
    })),
  };
});

vi.mock("@/lib/queryClient", () => ({
  apiRequest: flags.apiRequestSpy,
  getQueryFn: vi.fn(),
  notifyInvoiceBadgeChanged: flags.notifyInvoiceBadgeChangedSpy,
  queryClient: {
    invalidateQueries: vi.fn(),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import subject AFTER all vi.mock() calls
// ---------------------------------------------------------------------------

import HomeownerServiceRecords, { isScoringMaintenanceLog } from "./homeowner-service-records";

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

beforeEach(() => {
  flags.apiRequestSpy.mockResolvedValue({
    ok: true,
    json: async () => ({}),
  });
  global.fetch = vi.fn().mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({}),
  } as Response);
});

afterEach(() => {
  cleanup();
  flags.invoiceAnalyses = [];
  flags.maintenanceLogs = [];
  flags.houses = [flags.houses[0]];
  flags.toastSpy.mockClear();
  flags.invalidateQueriesSpy.mockClear();
  flags.setQueryDataSpy.mockClear();
  flags.notifyInvoiceBadgeChangedSpy.mockClear();
  flags.apiRequestSpy.mockReset();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------

describe("Service Records — linked invoice badge", () => {
  it("marks all linked invoices viewed when the page mounts", async () => {
    renderPage();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/homeowner/linked-invoices/mark-all-viewed",
        { method: "POST" },
      );
      expect(flags.setQueryDataSpy).toHaveBeenCalledWith(
        ["/api/homeowner/linked-invoices/unclaimed-count"],
        { count: 0 },
      );
      expect(flags.notifyInvoiceBadgeChangedSpy).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------

describe("Service Records — invoice scan history", () => {
  it("shows every status and reopens a pending scan for review", async () => {
    flags.invoiceAnalyses = [
      {
        id: "analysis-pending",
        homeownerId: "user-001",
        houseId: "house-1",
        status: "pending",
        completionMethod: "contractor",
        invoiceUrls: ["/public/invoices/pending.jpg"],
        receiptUrls: [],
        serviceDescription: "Furnace inspection",
        serviceDate: "2026-08-15",
        totalAmount: "145.00",
        contractorName: "Taylor",
        contractorCompany: "Comfort Co",
        homeArea: "hvac",
        serviceType: "inspection",
        aiConfidence: "high",
        diyVerified: false,
        createdAt: "2026-08-16T00:00:00.000Z",
      },
      { id: "analysis-confirmed", homeownerId: "user-001", houseId: "house-1", status: "confirmed", completionMethod: "contractor", invoiceUrls: [], receiptUrls: [], serviceDescription: "Roof repair", aiConfidence: "medium", diyVerified: false, createdAt: "2026-08-14T00:00:00.000Z" },
      { id: "analysis-rejected", homeownerId: "user-001", houseId: "house-1", status: "rejected", completionMethod: "contractor", invoiceUrls: [], receiptUrls: [], serviceDescription: "Not an invoice", aiConfidence: "low", diyVerified: false, createdAt: "2026-08-13T00:00:00.000Z" },
    ];

    renderPage();
    await userEvent.click(screen.getByTestId("button-toggle-invoice-history"));

    expect(screen.getByTestId("status-invoice-analysis-analysis-pending").textContent).toBe("Pending");
    expect(screen.getByTestId("status-invoice-analysis-analysis-confirmed").textContent).toBe("Confirmed");
    expect(screen.getByTestId("status-invoice-analysis-analysis-rejected").textContent).toBe("Rejected");
    expect(screen.getByTestId("img-invoice-thumbnail-analysis-pending").getAttribute("src")).toBe("/public/invoices/pending.jpg");
    expect(screen.queryByTestId("button-rereview-invoice-analysis-confirmed")).toBeNull();
    expect(screen.queryByTestId("button-rereview-invoice-analysis-rejected")).toBeNull();

    await userEvent.click(screen.getByTestId("button-rereview-invoice-analysis-pending"));
    expect(screen.getByText("Review Extracted Details")).toBeDefined();
    expect((screen.getByDisplayValue("Furnace inspection") as HTMLInputElement).value).toBe("Furnace inspection");
    expect((screen.getByDisplayValue("145") as HTMLInputElement).value).toBe("145");
  });
});

// ---------------------------------------------------------------------------

describe("Service Records — home area", () => {
  it("shows a DIY record's home area alongside its date and service type", () => {
    flags.maintenanceLogs = [
      {
        id: "diy-roof-record",
        homeownerId: "user-001",
        houseId: "house-1",
        serviceDescription: "Replaced damaged shingles",
        serviceDate: "2026-09-01T12:00:00.000Z",
        homeArea: "roof",
        serviceType: "repair",
      },
    ];

    renderPage();

    const record = document.querySelector('[data-log-id="diy-roof-record"]');
    expect(record).not.toBeNull();
    expect(record?.textContent).toContain("Roof");
    expect(record?.textContent).toContain("Repair");
    expect(record?.textContent).toContain(
      new Date("2026-09-01T12:00:00.000Z").toLocaleDateString(),
    );
  });
});

// ---------------------------------------------------------------------------

describe("Service Records — maintenance log date errors", () => {
  it("shows the API message inline by the service date for a log over 13 months old", async () => {
    const apiMessage = "Service date cannot be more than 12 months in the past.";
    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/maintenance-logs" && init?.method === "POST") {
        return {
          status: 400,
          ok: false,
          json: async () => ({ code: "SERVICE_DATE_TOO_OLD", message: apiMessage }),
        } as Response;
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({}),
      } as Response;
    });

    renderPage();
    await userEvent.click(screen.getByTestId("button-add-service-record"));

    const dateInput = screen.getByLabelText("Service Date");
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, "2025-08-01");
    await userEvent.click(screen.getByTestId("button-submit-service-record"));

    await waitFor(() => expect(screen.getByText(apiMessage)).toBeDefined());
    expect(dateInput.getAttribute("aria-invalid")).toBe("true");
    expect(flags.toastSpy).not.toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });
});

// ---------------------------------------------------------------------------

describe("Service Records — locked record deletion", () => {
  it("shows the score-lock explanation inline without a destructive toast", async () => {
    flags.maintenanceLogs = [{
      id: "scored-record",
      homeownerId: "user-001",
      houseId: "house-1",
      serviceDescription: "Verified HVAC service",
      serviceDate: "2026-08-15T12:00:00.000Z",
      serviceType: "maintenance",
    }];
    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/maintenance-logs/scored-record" && init?.method === "DELETE") {
        return {
          status: 403,
          ok: false,
          json: async () => ({ code: "VERIFIED_RECORD", message: "Verified records cannot be deleted" }),
        } as Response;
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({}),
      } as Response;
    });

    renderPage();
    await userEvent.click(screen.getByTestId("button-delete-record-scored-record"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This record has been counted in your Home Health Score and cannot be deleted.",
    );
    expect(flags.toastSpy).not.toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });
});

// ---------------------------------------------------------------------------

describe("Service Records — scoring history filter", () => {
  it("includes the first day of the cutoff month without shifting date-only values to the prior month", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";

    try {
      const now = new Date(2026, 8, 11, 12);
      const cutoffRecord = { serviceDate: "2025-09-01" } as MaintenanceLog;
      const precedingRecord = { serviceDate: "2025-08-31" } as MaintenanceLog;

      expect(isScoringMaintenanceLog(cutoffRecord, now)).toBe(true);
      expect(isScoringMaintenanceLog(precedingRecord, now)).toBe(false);
    } finally {
      process.env.TZ = previousTimezone;
    }
  });

  it("filters records by the rolling scoring window and updates the hidden-record count", async () => {
    const now = new Date();
    const scoringDate = new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString();
    const historicalDate = new Date(now.getFullYear(), now.getMonth() - 13, 15).toISOString();

    flags.maintenanceLogs = [
      { id: "scoring-1", serviceDescription: "Recent HVAC service", serviceDate: scoringDate, serviceType: "maintenance" },
      { id: "scoring-2", serviceDescription: "Recent roof service", serviceDate: scoringDate, serviceType: "repair" },
      { id: "historical-1", serviceDescription: "Old plumbing service", serviceDate: historicalDate, serviceType: "repair" },
    ];

    renderPage();

    expect(screen.getByTestId("score-impact-summary").textContent).toContain("2 of 3 records are counting toward your score");
    expect(document.querySelector('[data-log-id="scoring-1"]')).not.toBeNull();
    expect(document.querySelector('[data-log-id="scoring-2"]')).not.toBeNull();
    expect(screen.getByTestId("button-toggle-older-records").textContent).toContain("1 Older Record");

    await userEvent.click(screen.getByTestId("filter-maintenance-scoring"));
    expect(screen.getByTestId("score-impact-summary").textContent).toContain("2 of 2 records are counting toward your score");
    expect(document.querySelector('[data-log-id="scoring-1"]')).not.toBeNull();
    expect(document.querySelector('[data-log-id="scoring-2"]')).not.toBeNull();
    expect(document.querySelector('[data-log-id="historical-1"]')).toBeNull();
    expect(screen.queryByTestId("button-toggle-older-records")).toBeNull();

    await userEvent.click(screen.getByTestId("filter-maintenance-historical"));
    expect(screen.getByTestId("score-impact-summary").textContent).toContain("0 of 1 record is counting toward your score");
    expect(document.querySelector('[data-log-id="scoring-1"]')).toBeNull();
    expect(document.querySelector('[data-log-id="historical-1"]')).not.toBeNull();

    await userEvent.click(screen.getByTestId("filter-maintenance-all"));
    expect(document.querySelector('[data-log-id="scoring-1"]')).not.toBeNull();
    expect(screen.getByTestId("button-toggle-older-records").textContent).toContain("1 Older Record");
  });
});

// ---------------------------------------------------------------------------

describe("Service Records — AI invoice upload: 409 DUPLICATE_INVOICE", () => {
  it("shows 'Already Scanned' state and does NOT show a destructive toast", async () => {
    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/invoice-analyses/analyze") {
        return {
          status: 409,
          ok: false,
          json: async () => ({
            code: "DUPLICATE_INVOICE",
            analysisId: "ana-dup-001",
            createdAt: "2025-06-12T15:30:00.000Z",
          }),
        } as Response;
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({}),
      } as Response;
    });

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
    expect(screen.getByText("Originally scanned June 12, 2025")).toBeDefined();

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

  it("expands older records, then scrolls to and highlights the existing record", async () => {
    flags.invoiceAnalyses = [{
      id: "ana-dup-001",
      maintenanceLogId: "existing-record",
      houseId: "house-1",
      status: "confirmed",
    }];
    flags.maintenanceLogs = [
      {
        id: "newest-record",
        homeownerId: "user-001",
        houseId: "house-1",
        serviceDescription: "Newest service",
        serviceDate: new Date().toISOString(),
        homeArea: "hvac",
        serviceType: "maintenance",
      },
      {
        id: "second-record",
        homeownerId: "user-001",
        houseId: "house-1",
        serviceDescription: "Second service",
        serviceDate: new Date().toISOString(),
        homeArea: "plumbing",
        serviceType: "repair",
      },
      {
        id: "existing-record",
        homeownerId: "user-001",
        houseId: "house-1",
        serviceDescription: "Existing roof repair",
        serviceDate: new Date().toISOString(),
        homeArea: "roof",
        serviceType: "repair",
      },
    ];
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => ({
      status: String(input) === "/api/invoice-analyses/analyze" ? 409 : 200,
      ok: String(input) !== "/api/invoice-analyses/analyze",
      json: async () => String(input) === "/api/invoice-analyses/analyze"
        ? { code: "DUPLICATE_INVOICE", analysisId: "ana-dup-001" }
        : {},
    } as Response));

    renderPage();
    expect(document.querySelector('[data-log-id="existing-record"]')).toBeNull();
    await openAiDialog();
    await userEvent.click(screen.getByRole("button", { name: /diy/i }));
    await userEvent.click(screen.getByRole("button", { name: /analyze with ai/i }));
    await userEvent.click(screen.getByRole("button", { name: /view existing record/i }));

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" }));
    const record = document.querySelector('[data-log-id="existing-record"]');
    expect(record).toHaveClass("service-record-highlight");
  });

  it("explains when an active home-area filter hides the existing record", async () => {
    flags.invoiceAnalyses = [{
      id: "ana-dup-001",
      maintenanceLogId: "existing-record",
      houseId: "house-1",
      status: "confirmed",
    }];
    flags.maintenanceLogs = [{
      id: "existing-record",
      homeownerId: "user-001",
      houseId: "house-1",
      serviceDescription: "Existing roof repair",
      serviceDate: new Date().toISOString(),
      homeArea: "roof",
      serviceType: "repair",
    }];
    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => ({
      status: String(input) === "/api/invoice-analyses/analyze" ? 409 : 200,
      ok: String(input) !== "/api/invoice-analyses/analyze",
      json: async () => String(input) === "/api/invoice-analyses/analyze"
        ? { code: "DUPLICATE_INVOICE", analysisId: "ana-dup-001" }
        : {},
    } as Response));

    renderPage();
    await userEvent.selectOptions(screen.getByTestId("mock-select"), "hvac");
    expect(document.querySelector('[data-log-id="existing-record"]')).toBeNull();

    await openAiDialog();
    await userEvent.click(screen.getByRole("button", { name: /diy/i }));
    await userEvent.click(screen.getByRole("button", { name: /analyze with ai/i }));
    await userEvent.click(screen.getByRole("button", { name: /view existing record/i }));

    expect(flags.toastSpy).toHaveBeenCalledWith({
      title: "Existing record is hidden",
      description: "Clear your service record filters to view the matching record.",
    });
  });
});

// ---------------------------------------------------------------------------

describe("Service Records — AI invoice upload: 200 success path", () => {
  it("shows the 'Review Extracted Details' step after a successful analysis", async () => {
    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) !== "/api/invoice-analyses/analyze") {
        return {
          status: 200,
          ok: true,
          json: async () => ({}),
        } as Response;
      }
      return {
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
      } as Response;
    });

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
    expect(flags.setQueryDataSpy).toHaveBeenCalledWith(
      ["/api/invoice-analyses"],
      expect.any(Function),
    );
    const historyUpdateCall = flags.setQueryDataSpy.mock.calls.find(
      ([queryKey]) => (queryKey as string[])[0] === "/api/invoice-analyses",
    );
    const updateHistory = historyUpdateCall?.[1] as (current: Array<{ id: string }>) => Array<{ id: string }>;
    expect(updateHistory([{ id: "older-analysis" }]).map((analysis) => analysis.id)).toEqual([
      "ana-001",
      "older-analysis",
    ]);

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

describe("Service Records — old invoice confirmation notice", () => {
  it("explains that an old saved record does not affect the current score", async () => {
    flags.invoiceAnalyses = [{
      id: "analysis-old",
      homeownerId: "user-001",
      houseId: "house-1",
      status: "pending",
      completionMethod: "contractor",
      invoiceUrls: [],
      receiptUrls: [],
      serviceDescription: "Old roof repair",
      serviceDate: "2020-03-15",
      totalAmount: "250.00",
      homeArea: "roof",
      serviceType: "repair",
      aiConfidence: "high",
      diyVerified: false,
      createdAt: "2020-03-16T00:00:00.000Z",
    }];
    flags.apiRequestSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ outsideScoringWindow: true, newAchievements: [] }),
    });

    renderPage();
    await userEvent.click(screen.getByTestId("button-toggle-invoice-history"));
    await userEvent.click(screen.getByTestId("button-rereview-invoice-analysis-old"));
    await userEvent.click(screen.getByTestId("button-ai-confirm"));

    const notice = "This record was saved to your history, but it's older than 12 months so it won't affect your current Home Wellness Score.";
    await waitFor(() => expect(screen.getByText(notice)).toBeDefined());
    expect(flags.toastSpy).toHaveBeenCalledWith({
      title: "Record created",
      description: notice,
    });
  });
});
