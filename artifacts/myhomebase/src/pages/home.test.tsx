/**
 * Unit tests for the install-year inline-edit feature on the dashboard (Home page).
 *
 * Covers four flows:
 * 1. Tapping a nudge item expands the inline input (does NOT navigate away).
 * 2. Entering a valid year and pressing Save calls PATCH and, on success, removes the item.
 * 3. Pressing Cancel closes the form without calling mutate.
 * 4. A 500 from the server shows the error message inline and keeps the form open.
 *
 * All external dependencies are mocked so these tests run without a server.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  act,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mutable flags — set before any module is processed
// ---------------------------------------------------------------------------

const flags = vi.hoisted(() => ({
  role: "homeowner" as "homeowner" | "contractor",
  isPending: false,
  isError: false,
  triggerOnSuccess: false,
  // Updated by the mutate mock when triggerOnSuccess is true.
  // useQuery reads this to simulate the refetched house after a successful save.
  savedRoofYear: null as number | null,
  savedHvacYear: null as number | null,
  savedWaterHeaterYear: null as number | null,
  propertyYearBuilt: 2000 as number | null,
  propertySquareFootage: 2000 as number | null,
  // Captured from the install-year mutation in each render.
  patchOnSuccess: null as (() => void) | null,
  mutateSpy: vi.fn(),
  resetSpy: vi.fn(),
  setLocationSpy: vi.fn(),
  invalidateQueriesSpy: vi.fn(),
  // When true the house mock returns every profile field filled in, making
  // profileNudgeAllDone === true so the card should not render.
  allInstallYearsDone: false,
  healthScore: 55 as number | undefined,
  contractorProposals: undefined as Array<{ status: string }> | undefined,
  contractorRating: undefined as
    | { averageRating: number; totalReviews: number }
    | undefined,
  contractorLeads: undefined as
    | Array<{ status: string; createdAt: string | null }>
    | undefined,
  onboardingProgress: undefined as { completedAt: string | null } | undefined,
  unreadNotifications: [] as Array<{ id: string; type: string }>,
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-001", role: flags.role, firstName: "Alex" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

vi.mock("@/hooks/useHomeownerSubscription", () => ({
  useHomeownerSubscription: () => ({
    isPaidSubscriber: true,
    subscriptionStatus: "active",
    isLoading: false,
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", flags.setLocationSpy],
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/house-map", () => ({
  default: () => <div data-testid="mock-house-map" />,
}));

vi.mock("@/components/homeowner-feature-gate", () => ({
  HomeownerFeatureGate: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/lib/nativeBrowser", () => ({
  isNativePlatform: false,
  onBackButton: () => () => {},
  onAppStateChange: () => () => {},
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: vi.fn(
      ({
        queryKey,
        enabled,
      }: {
        queryKey: readonly unknown[];
        enabled?: boolean;
      }) => {
        if (!enabled && enabled !== undefined)
          return { data: undefined, isLoading: false };

        const key0 = queryKey[0];

        if (key0 === "/api/houses" && queryKey.length === 1) {
          // When allInstallYearsDone is true every profileNudgeItem is "done"
          // so the card should not render. Otherwise the default house is missing
          // the three install years, leaving the nudge card visible.
          const baseHouse = {
            id: "house-1",
            userId: "user-001",
            address: "123 Main St",
            city: "Springfield",
            state: "IL",
            zip: "62701",
            homeType: "single-family",
            yearBuilt: flags.propertyYearBuilt,
            squareFootage: flags.propertySquareFootage,
            bedrooms: 3,
            bathrooms: 2,
            roofType: null,
            hvacType: null,
            homeSystems: ["Roof"],
            climateZone: null,
            lat: "39.7817",
            lon: "-89.6501",
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
          };
          const installYears = flags.allInstallYearsDone
            ? {
                roofInstalledYear: 2010,
                hvacInstalledYear: 2015,
                waterHeaterInstalledYear: 2018,
              }
            : {
                // After a successful save, flags.savedRoofYear is set so the
                // next render sees the item as "done" and removes it from the list.
                roofInstalledYear: flags.savedRoofYear,
                hvacInstalledYear: flags.savedHvacYear,
                waterHeaterInstalledYear: flags.savedWaterHeaterYear,
              };
          return {
            data: [{ ...baseHouse, ...installYears }],
            isLoading: false,
          };
        }

        if (queryKey.length === 3 && queryKey[2] === "health-scores") {
          return { data: { "house-1": { score: flags.healthScore } }, isLoading: false };
        }

        if (queryKey.length === 3 && queryKey[2] === "maintenance-tasks") {
          return {
            data: {
              "house-1": {
                tasks: {
                  seasonal: ["Check HVAC filters"],
                  weatherSpecific: ["Inspect roof"],
                },
              },
            },
            isLoading: false,
          };
        }

        if (key0 === "/api/homeowner/linked-invoices/unclaimed-count") {
          return { data: { count: 0 }, isLoading: false };
        }

        if (key0 === "/api/proposals") {
          return {
            data: flags.contractorProposals,
            isLoading: false,
            isError: false,
          };
        }

        if (
          key0 === "/api/contractors" &&
          queryKey.length === 3 &&
          queryKey[2] === "rating"
        ) {
          return {
            data: flags.contractorRating,
            isLoading: false,
            isError: false,
          };
        }

        if (key0 === "/api/crm/leads") {
          return {
            data: flags.contractorLeads,
            isLoading: false,
            isError: false,
          };
        }

        if (key0 === "/api/onboarding/progress") {
          return { data: flags.onboardingProgress, isLoading: false };
        }

        if (key0 === "/api/notifications/unread") {
          return { data: flags.unreadNotifications, isLoading: false };
        }

        return { data: undefined, isLoading: false };
      },
    ),
    useMutation: vi.fn(
      (opts?: {
        mutationFn?: (...args: unknown[]) => unknown;
        onSuccess?: (...args: unknown[]) => void;
        [k: string]: unknown;
      }) => {
        const isInstallYearMutation = opts?.mutationFn
          ?.toString()
          .includes("/profile");
        if (isInstallYearMutation && opts?.onSuccess) {
          flags.patchOnSuccess = opts.onSuccess as () => void;
        }
        return {
          mutate: (args: unknown) => {
            flags.mutateSpy(args);
            if (flags.triggerOnSuccess && flags.patchOnSuccess) {
              // Simulate a successful save: update the house data so the
              // refetched query will mark the saved field as done.
              const typed = args as { field?: string; year?: number } | undefined;
              if (typed?.field === "roofInstalledYear" && typed?.year != null) {
                flags.savedRoofYear = typed.year;
              }
              if (typed?.field === "hvacInstalledYear" && typed?.year != null) {
                flags.savedHvacYear = typed.year;
              }
              if (typed?.field === "waterHeaterInstalledYear" && typed?.year != null) {
                flags.savedWaterHeaterYear = typed.year;
              }
              flags.patchOnSuccess();
            }
          },
          mutateAsync: vi.fn().mockResolvedValue({}),
          isPending: flags.isPending,
          isError: flags.isError,
          isSuccess: false,
          isIdle: true,
          status: "idle" as const,
          error: null,
          data: undefined,
          reset: flags.resetSpy,
        };
      },
    ),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: flags.invalidateQueriesSpy,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
    })),
  };
});

// ---------------------------------------------------------------------------
// Import subject AFTER all vi.mock() calls
// ---------------------------------------------------------------------------

import Home from "./home";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHome() {
  return render(<Home />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
  flags.role = "homeowner";
  flags.isPending = false;
  flags.isError = false;
  flags.triggerOnSuccess = false;
  flags.savedRoofYear = null;
  flags.savedHvacYear = null;
  flags.savedWaterHeaterYear = null;
  flags.propertyYearBuilt = 2000;
  flags.propertySquareFootage = 2000;
  flags.patchOnSuccess = null;
  flags.allInstallYearsDone = false;
  flags.healthScore = 55;
  flags.mutateSpy.mockClear();
  flags.resetSpy.mockClear();
  flags.setLocationSpy.mockClear();
  flags.invalidateQueriesSpy.mockClear();
  flags.contractorProposals = undefined;
  flags.contractorRating = undefined;
  flags.contractorLeads = undefined;
  flags.onboardingProgress = undefined;
  flags.unreadNotifications = [];
  sessionStorage.removeItem("mhb_onboarding_banner_dismissed:user-001");
  localStorage.clear();
});

// ---------------------------------------------------------------------------

describe("Property card details", () => {
  it("keeps property content in the main column beside the score rail", () => {
    renderHome();

    const grid = screen.getByTestId("home-dashboard-grid");
    const main = screen.getByTestId("home-dashboard-main");
    const rail = screen.getByTestId("home-dashboard-rail");
    const propertyMap = screen.getByTestId("mock-house-map");

    expect(grid.children).toHaveLength(2);
    expect(grid.children[0]).toBe(main);
    expect(grid.children[1]).toBe(rail);
    expect(main.contains(propertyMap)).toBe(true);
    expect(rail.textContent).toContain("Home Wellness Score");
  });

  it("shows year built and formatted square footage when both are saved", () => {
    flags.propertyYearBuilt = 1998;
    flags.propertySquareFootage = 2450;

    renderHome();

    expect(screen.getByTestId("property-year-built-house-1").textContent).toBe("Built 1998");
    expect(screen.getByTestId("property-square-footage-house-1").textContent).toBe("2,450 sq ft");
  });

  it("shows either saved detail independently and hides missing details", () => {
    flags.propertyYearBuilt = null;
    flags.propertySquareFootage = 1800;
    const { rerender } = renderHome();

    expect(screen.queryByTestId("property-year-built-house-1")).toBeNull();
    expect(screen.getByTestId("property-square-footage-house-1").textContent).toBe("1,800 sq ft");

    flags.propertyYearBuilt = 2005;
    flags.propertySquareFootage = null;
    rerender(<Home />);

    expect(screen.getByTestId("property-year-built-house-1").textContent).toBe("Built 2005");
    expect(screen.queryByTestId("property-square-footage-house-1")).toBeNull();
  });

  it("does not render an empty metadata row when both details are missing", () => {
    flags.propertyYearBuilt = null;
    flags.propertySquareFootage = null;

    renderHome();

    expect(screen.queryByLabelText("Property details")).toBeNull();
  });
});

describe("Homeowner onboarding tour banner", () => {
  it("shows for incomplete onboarding and hides after dismissing the matching reminder", async () => {
    flags.onboardingProgress = { completedAt: null };
    flags.unreadNotifications = [
      { id: "onboarding-notification-1", type: "onboarding_reminder" },
    ];
    const user = userEvent.setup();

    renderHome();

    expect(screen.getByTestId("onboarding-tour-banner")).toBeDefined();
    await user.click(screen.getByTestId("button-dismiss-onboarding-banner"));

    expect(flags.mutateSpy).toHaveBeenCalledWith("onboarding-notification-1");
    expect(screen.queryByTestId("onboarding-tour-banner")).toBeNull();
  });

  it("restarts the guided tour from the banner", async () => {
    flags.onboardingProgress = { completedAt: null };
    const restartSpy = vi.fn();
    window.addEventListener("mhb:restart-homeowner-tour", restartSpy);
    const user = userEvent.setup();

    renderHome();
    await user.click(screen.getByTestId("button-restart-onboarding-tour"));

    expect(restartSpy).toHaveBeenCalledTimes(1);
    window.removeEventListener("mhb:restart-homeowner-tour", restartSpy);
  });

  it("stays dismissed after the dashboard remounts in the same session", async () => {
    flags.onboardingProgress = { completedAt: null };
    flags.unreadNotifications = [
      { id: "onboarding-notification-1", type: "onboarding_reminder" },
    ];
    const user = userEvent.setup();
    const firstRender = renderHome();

    await user.click(screen.getByTestId("button-dismiss-onboarding-banner"));
    firstRender.unmount();
    renderHome();

    expect(screen.queryByTestId("onboarding-tour-banner")).toBeNull();
  });

  it("does not show after onboarding is complete", () => {
    flags.onboardingProgress = { completedAt: "2026-09-08T12:00:00.000Z" };

    renderHome();

    expect(screen.queryByTestId("onboarding-tour-banner")).toBeNull();
  });
});

describe("Contractor dashboard business stats", () => {
  it("sends a signed-in contractor to the dashboard while keeping the business summary visible", () => {
    flags.role = "contractor";
    flags.contractorProposals = [
      { status: "accepted" },
      { status: "accepted" },
      { status: "draft" },
    ];
    flags.contractorRating = { averageRating: 4.6, totalReviews: 3 };
    flags.contractorLeads = [
      {
        status: "new",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        status: "contacted",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        status: "new",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    renderHome();

    expect(flags.setLocationSpy).toHaveBeenCalledWith("/contractor-dashboard");
    expect(screen.getByText("Active Projects")).toBeDefined();
    expect(screen.getByText("Reviews")).toBeDefined();
    expect(screen.getByText("New Leads")).toBeDefined();
    expect(screen.getByText("2 active projects")).toBeDefined();
    expect(screen.getByText("4.6/5 stars from 3 reviews")).toBeDefined();
    expect(screen.getByText("1 new lead this week")).toBeDefined();
    expect(screen.queryByText("3 active projects scheduled this week")).toBeNull();
    expect(screen.queryByText("4.8/5 stars from 127 recent reviews")).toBeNull();
    expect(screen.queryByText("5 new client inquiries this week")).toBeNull();
  });

  it("shows honest zero states without rendering a zero rating", () => {
    flags.role = "contractor";
    flags.contractorProposals = [];
    flags.contractorRating = { averageRating: 0, totalReviews: 0 };
    flags.contractorLeads = [
      {
        status: "new",
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    renderHome();

    expect(screen.getByText("No active projects yet")).toBeDefined();
    expect(screen.getByText("No reviews yet")).toBeDefined();
    expect(screen.getByText("No new leads this week")).toBeDefined();
    expect(screen.queryByText(/0\/5/)).toBeNull();
    expect(screen.queryByText(/from 0 reviews?/i)).toBeNull();
  });

  it("does not request or render contractor stats for homeowners", () => {
    flags.role = "homeowner";
    flags.contractorProposals = [{ status: "accepted" }];
    flags.contractorRating = { averageRating: 5, totalReviews: 1 };
    flags.contractorLeads = [
      {
        status: "new",
        createdAt: new Date().toISOString(),
      },
    ];

    renderHome();

    expect(screen.queryByText("Active Projects")).toBeNull();
    expect(screen.queryByText("Reviews")).toBeNull();
    expect(screen.queryByText("New Leads")).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — expand inline input", () => {
  it("clicking a nudge item shows the year input in-place and does not navigate", async () => {
    const user = userEvent.setup();
    renderHome();

    const nudgeBtn = screen.getByTestId("button-nudge-roofInstalledYear");
    expect(nudgeBtn).toBeDefined();

    await user.click(nudgeBtn);

    // The inline input appeared
    expect(
      screen.getByTestId("input-install-year-roofInstalledYear"),
    ).toBeDefined();

    // The trigger button is gone (replaced by the inline form)
    expect(
      screen.queryByTestId("button-nudge-roofInstalledYear"),
    ).toBeNull();

    // No router navigation was triggered
    expect(flags.setLocationSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — save valid year", () => {
  it("pressing Save calls PATCH and removes the item from the checklist on success", async () => {
    flags.triggerOnSuccess = true;

    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-roofInstalledYear"),
      "2010",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );
    expect(saveBtn).not.toBeDisabled();

    await act(async () => {
      await user.click(saveBtn);
    });

    // mutate was called with the correct payload
    expect(flags.mutateSpy).toHaveBeenCalledOnce();
    expect(flags.mutateSpy).toHaveBeenCalledWith({
      houseId: "house-1",
      field: "roofInstalledYear",
      year: 2010,
    });

    // onSuccess fired: form closed and house data updated → item no longer
    // in the checklist (flags.savedRoofYear = 2010 so roofInstalledYear is
    // now "done", causing it to drop out of profileNudgeMissing).
    expect(
      screen.queryByTestId("input-install-year-roofInstalledYear"),
    ).toBeNull();
    expect(
      screen.queryByTestId("button-nudge-roofInstalledYear"),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — cancel closes form without saving", () => {
  it("pressing Cancel closes the form and does not call mutate", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-roofInstalledYear"),
      "2005",
    );

    await user.click(
      screen.getByTestId("button-cancel-install-year-roofInstalledYear"),
    );

    expect(flags.mutateSpy).not.toHaveBeenCalled();

    // Form is gone; nudge trigger button is back
    expect(
      screen.queryByTestId("input-install-year-roofInstalledYear"),
    ).toBeNull();
    expect(
      screen.getByTestId("button-nudge-roofInstalledYear"),
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — Save button disabled for invalid input", () => {
  it("Save button is disabled when the input is empty", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));

    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );
    // No year typed yet — input is empty, button must be disabled
    expect(saveBtn).toBeDisabled();
  });

  it("Save button is disabled when the year is below 1900", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-roofInstalledYear"),
      "1800",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );
    expect(saveBtn).toBeDisabled();
  });

  it("Save button is disabled when the year is in the future", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    const futureYear = String(new Date().getFullYear() + 1);
    await user.type(
      screen.getByTestId("input-install-year-roofInstalledYear"),
      futureYear,
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );
    expect(saveBtn).toBeDisabled();
  });

  it("Save button is disabled for non-numeric input", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-roofInstalledYear"),
      "abcd",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );
    expect(saveBtn).toBeDisabled();
  });

  it("Save button stays disabled for pasted partial years and enables for a valid pasted year", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    const input = screen.getByTestId("input-install-year-roofInstalledYear");
    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );

    await user.click(input);
    for (const partialYear of ["2", "20", "201"]) {
      await user.clear(input);
      await user.paste(partialYear);
      expect(saveBtn).toBeDisabled();
    }

    await user.clear(input);
    await user.paste("2010");
    expect(saveBtn).not.toBeDisabled();
  });

  it("Save button re-enables after clearing an out-of-range year and typing a valid one", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    const input = screen.getByTestId("input-install-year-roofInstalledYear");

    // Type an invalid year → button must be disabled
    await user.type(input, "1800");
    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );
    expect(saveBtn).toBeDisabled();

    // Clear and type a valid year → button must re-enable
    await user.clear(input);
    await user.type(input, "2010");
    expect(saveBtn).not.toBeDisabled();
  });

  it("Save button re-enables after clearing non-numeric input and typing a valid year", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    const input = screen.getByTestId("input-install-year-roofInstalledYear");

    // Type non-numeric → button must be disabled
    await user.type(input, "abcd");
    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );
    expect(saveBtn).toBeDisabled();

    // Clear and type a valid year → button must re-enable
    await user.clear(input);
    await user.type(input, "2005");
    expect(saveBtn).not.toBeDisabled();
  });

  it("Save button stays disabled for every partial-year keystroke and enables only when the full 4-digit year is typed", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    const input = screen.getByTestId("input-install-year-roofInstalledYear");
    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );

    // "2" — one digit, not a valid 4-digit year
    await user.type(input, "2");
    expect(saveBtn).toBeDisabled();

    // "20" — two digits
    await user.type(input, "0");
    expect(saveBtn).toBeDisabled();

    // "201" — three digits
    await user.type(input, "1");
    expect(saveBtn).toBeDisabled();

    // "2010" — complete, valid 4-digit year in range → Save must enable
    await user.type(input, "0");
    expect(saveBtn).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — keyboard shortcuts", () => {
  it("pressing Enter with a valid year calls mutate (same as clicking Save)", async () => {
    flags.triggerOnSuccess = true;

    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-roofInstalledYear"),
      "2015",
    );

    await act(async () => {
      await user.keyboard("{Enter}");
    });

    expect(flags.mutateSpy).toHaveBeenCalledOnce();
    expect(flags.mutateSpy).toHaveBeenCalledWith({
      houseId: "house-1",
      field: "roofInstalledYear",
      year: 2015,
    });
  });

  it("pressing Escape closes the form without calling mutate", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-roofInstalledYear"),
      "2015",
    );

    await user.keyboard("{Escape}");

    expect(flags.mutateSpy).not.toHaveBeenCalled();

    expect(
      screen.queryByTestId("input-install-year-roofInstalledYear"),
    ).toBeNull();
    expect(
      screen.getByTestId("button-nudge-roofInstalledYear"),
    ).toBeDefined();
  });

  it("pressing Escape on the HVAC form closes it without calling mutate", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-hvacInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
      "2018",
    );

    await user.keyboard("{Escape}");

    expect(flags.mutateSpy).not.toHaveBeenCalled();

    expect(
      screen.queryByTestId("input-install-year-hvacInstalledYear"),
    ).toBeNull();
    expect(
      screen.getByTestId("button-nudge-hvacInstalledYear"),
    ).toBeDefined();
  });

  it("pressing Escape on the water heater form closes it without calling mutate", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    );
    await user.type(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
      "2020",
    );

    await user.keyboard("{Escape}");

    expect(flags.mutateSpy).not.toHaveBeenCalled();

    expect(
      screen.queryByTestId("input-install-year-waterHeaterInstalledYear"),
    ).toBeNull();
    expect(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    ).toBeDefined();
  });

  it("pressing Enter with an invalid year does nothing (form stays open, mutate not called)", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    const input = screen.getByTestId("input-install-year-roofInstalledYear");
    await user.type(input, "99");

    await user.keyboard("{Enter}");

    expect(flags.mutateSpy).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("input-install-year-roofInstalledYear"),
    ).toBeDefined();
  });

  it("pressing Enter with a year far in the future does nothing and keeps the form open", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    const input = screen.getByTestId("input-install-year-roofInstalledYear");
    await user.type(input, "2099");

    await user.keyboard("{Enter}");

    expect(flags.mutateSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("input-install-year-roofInstalledYear")).toBeDefined();
  });

  it("pressing Enter with a year before 1800 does nothing and keeps the form open", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    const input = screen.getByTestId("input-install-year-roofInstalledYear");
    await user.type(input, "1799");

    await user.keyboard("{Enter}");

    expect(flags.mutateSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("input-install-year-roofInstalledYear")).toBeDefined();
  });

  it("pressing Enter after non-numeric text is rejected by the number input keeps the form open", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    const input = screen.getByTestId("input-install-year-roofInstalledYear");
    await user.type(input, "not-a-year");

    expect(input).toHaveValue(null);

    await user.keyboard("{Enter}");

    expect(flags.mutateSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("input-install-year-roofInstalledYear")).toBeDefined();
  });

  it("pressing Enter while isPending is true does not call mutate — roof", async () => {
    flags.isPending = true;

    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-roofInstalledYear"),
      "2015",
    );

    await act(async () => {
      await user.keyboard("{Enter}");
    });

    expect(flags.mutateSpy).not.toHaveBeenCalled();
  });

  it("pressing Enter while isPending is true does not call mutate — HVAC", async () => {
    flags.isPending = true;

    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-hvacInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
      "2018",
    );

    await act(async () => {
      await user.keyboard("{Enter}");
    });

    expect(flags.mutateSpy).not.toHaveBeenCalled();
  });

  it("pressing Enter while isPending is true does not call mutate — water heater", async () => {
    flags.isPending = true;

    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-waterHeaterInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
      "2020",
    );

    await act(async () => {
      await user.keyboard("{Enter}");
    });

    expect(flags.mutateSpy).not.toHaveBeenCalled();
  });

  it("pressing Enter on HVAC then getting a server error shows the error and keeps the form open", async () => {
    const user = userEvent.setup();
    const { rerender } = renderHome();

    await user.click(screen.getByTestId("button-nudge-hvacInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
      "2014",
    );

    await act(async () => {
      await user.keyboard("{Enter}");
    });

    expect(flags.mutateSpy).toHaveBeenCalledOnce();

    flags.isError = true;
    act(() => {
      rerender(<Home />);
    });

    expect(screen.getByText(/couldn't save/i)).toBeDefined();
    expect(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
    ).toBeDefined();
  });

  it("pressing Enter on water heater then getting a server error shows the error and keeps the form open", async () => {
    const user = userEvent.setup();
    const { rerender } = renderHome();

    await user.click(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    );
    await user.type(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
      "2017",
    );

    await act(async () => {
      await user.keyboard("{Enter}");
    });

    expect(flags.mutateSpy).toHaveBeenCalledOnce();

    flags.isError = true;
    act(() => {
      rerender(<Home />);
    });

    expect(screen.getByText(/couldn't save/i)).toBeDefined();
    expect(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — server error shown inline", () => {
  it("a 500 from the server shows the error message inline and keeps the form open", async () => {
    const user = userEvent.setup();
    const { rerender } = renderHome();

    // Open the form and enter a valid year
    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-roofInstalledYear"),
      "2010",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );
    expect(saveBtn).not.toBeDisabled();

    // Click Save — mutate fires but does NOT call onSuccess (no triggerOnSuccess)
    await user.click(saveBtn);
    expect(flags.mutateSpy).toHaveBeenCalledOnce();

    // Simulate the mutation settling into error state (as tanstack-query would
    // do when the server returns 500), then re-render the component.
    flags.isError = true;
    act(() => {
      rerender(<Home />);
    });

    // Error message is visible inside the still-open form
    expect(screen.getByText(/couldn't save/i)).toBeDefined();
    expect(
      screen.getByTestId("input-install-year-roofInstalledYear"),
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — rapid double-click fires mutate only once", () => {
  it("two rapid clicks on Save for roof only call mutate once", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-roofInstalledYear"),
      "2010",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-roofInstalledYear",
    );
    expect(saveBtn).not.toBeDisabled();

    // Fire two clicks synchronously before React can re-render and apply the
    // isPending-based disabled state. The ref guard in handleNudgeSave must
    // block the second call even when the disabled attribute has not yet been
    // applied to the DOM.
    act(() => {
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);
    });

    expect(flags.mutateSpy).toHaveBeenCalledOnce();
  });

  it("two rapid clicks on Save for HVAC only call mutate once", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-hvacInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
      "2018",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-hvacInstalledYear",
    );
    expect(saveBtn).not.toBeDisabled();

    act(() => {
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);
    });

    expect(flags.mutateSpy).toHaveBeenCalledOnce();
  });

  it("two rapid clicks on Save for water heater only call mutate once", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    );
    await user.type(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
      "2020",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-waterHeaterInstalledYear",
    );
    expect(saveBtn).not.toBeDisabled();

    act(() => {
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);
    });

    expect(flags.mutateSpy).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------

describe("Profile nudge card — visibility based on completion", () => {
  it("card is absent when all install years AND homeSystems are present on the house", () => {
    flags.allInstallYearsDone = true;
    renderHome();

    // profileNudgeAllDone is true → showProfileNudge is false → card not rendered
    expect(screen.queryByTestId("profile-nudge-card")).toBeNull();
  });

  it("card shows when at least one profile field is missing", () => {
    // Default house mock has null hvacInstalledYear and waterHeaterInstalledYear
    renderHome();

    expect(screen.getByTestId("profile-nudge-card")).toBeDefined();
  });

  it("hides immediately after dismissal even while profile fields are still missing", async () => {
    const user = userEvent.setup();
    renderHome();

    expect(screen.getByTestId("profile-nudge-card")).toBeDefined();

    await user.click(screen.getByTestId("button-dismiss-profile-nudge"));

    expect(screen.queryByTestId("profile-nudge-card")).toBeNull();
    expect(flags.savedRoofYear).toBeNull();
    expect(flags.savedHvacYear).toBeNull();
    expect(flags.savedWaterHeaterYear).toBeNull();
  });

  it("stays hidden when the dismissal key was stored before rendering", () => {
    localStorage.setItem("profile-nudge-dismissed-house-1", "1");

    renderHome();

    expect(screen.queryByTestId("profile-nudge-card")).toBeNull();
    expect(flags.savedRoofYear).toBeNull();
    expect(flags.savedHvacYear).toBeNull();
    expect(flags.savedWaterHeaterYear).toBeNull();
  });

  it("ignores a stored dismissal when the health score is critically low", () => {
    flags.healthScore = 29;
    localStorage.setItem("profile-nudge-dismissed-house-1", "1");

    renderHome();

    expect(screen.getByTestId("profile-nudge-card")).toBeDefined();
  });

  it("respects a session dismissal when the health score is critically low", async () => {
    flags.healthScore = 29;
    const user = userEvent.setup();

    renderHome();
    await user.click(screen.getByTestId("button-dismiss-profile-nudge"));

    expect(screen.queryByTestId("profile-nudge-card")).toBeNull();
  });

  it("does not persist a low-score dismissal and shows again on the next visit", async () => {
    flags.healthScore = 29;
    const user = userEvent.setup();
    const firstVisit = renderHome();

    await user.click(screen.getByTestId("button-dismiss-profile-nudge"));

    expect(screen.queryByTestId("profile-nudge-card")).toBeNull();
    expect(localStorage.getItem("profile-nudge-dismissed-house-1")).toBeNull();

    firstVisit.unmount();
    renderHome();

    expect(screen.getByTestId("profile-nudge-card")).toBeDefined();
  });

  it("does not persist a dismissal while the score is unresolved and shows for a low score on return", async () => {
    flags.healthScore = undefined;
    const user = userEvent.setup();
    const firstVisit = renderHome();

    await user.click(screen.getByTestId("button-dismiss-profile-nudge"));

    expect(localStorage.getItem("profile-nudge-dismissed-house-1")).toBeNull();

    firstVisit.unmount();
    flags.healthScore = 29;
    renderHome();

    expect(screen.getByTestId("profile-nudge-card")).toBeDefined();
  });

  it("persists a normal-score dismissal across visits", async () => {
    flags.healthScore = 30;
    const user = userEvent.setup();
    const firstVisit = renderHome();

    await user.click(screen.getByTestId("button-dismiss-profile-nudge"));

    expect(localStorage.getItem("profile-nudge-dismissed-house-1")).toBe("1");

    firstVisit.unmount();
    renderHome();

    expect(screen.queryByTestId("profile-nudge-card")).toBeNull();
  });

  it("stays hidden for an all-done profile even when the score is low", () => {
    flags.healthScore = 29;
    flags.allInstallYearsDone = true;

    renderHome();

    expect(screen.queryByTestId("profile-nudge-card")).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — HVAC field expand and save", () => {
  it("clicking the HVAC nudge shows the year input in-place and does not navigate", async () => {
    const user = userEvent.setup();
    renderHome();

    const nudgeBtn = screen.getByTestId("button-nudge-hvacInstalledYear");
    expect(nudgeBtn).toBeDefined();

    await user.click(nudgeBtn);

    expect(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
    ).toBeDefined();

    // Trigger button replaced by inline form
    expect(
      screen.queryByTestId("button-nudge-hvacInstalledYear"),
    ).toBeNull();

    // No router navigation triggered
    expect(flags.setLocationSpy).not.toHaveBeenCalled();
  });

  it("pressing Save on HVAC calls PATCH with the correct field and removes the item on success", async () => {
    flags.triggerOnSuccess = true;

    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-hvacInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
      "2012",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-hvacInstalledYear",
    );
    expect(saveBtn).not.toBeDisabled();

    await act(async () => {
      await user.click(saveBtn);
    });

    expect(flags.mutateSpy).toHaveBeenCalledOnce();
    expect(flags.mutateSpy).toHaveBeenCalledWith({
      houseId: "house-1",
      field: "hvacInstalledYear",
      year: 2012,
    });

    // onSuccess fired: form closed and item removed from the checklist
    expect(
      screen.queryByTestId("input-install-year-hvacInstalledYear"),
    ).toBeNull();
    expect(
      screen.queryByTestId("button-nudge-hvacInstalledYear"),
    ).toBeNull();
  });

  it("pressing Cancel on HVAC closes the form without calling mutate", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByTestId("button-nudge-hvacInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
      "2012",
    );

    await user.click(
      screen.getByTestId("button-cancel-install-year-hvacInstalledYear"),
    );

    expect(flags.mutateSpy).not.toHaveBeenCalled();

    expect(
      screen.queryByTestId("input-install-year-hvacInstalledYear"),
    ).toBeNull();
    expect(
      screen.getByTestId("button-nudge-hvacInstalledYear"),
    ).toBeDefined();
  });

  it("a 500 from the server shows the error message inline and keeps the HVAC form open", async () => {
    const user = userEvent.setup();
    const { rerender } = renderHome();

    await user.click(screen.getByTestId("button-nudge-hvacInstalledYear"));
    await user.type(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
      "2012",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-hvacInstalledYear",
    );
    expect(saveBtn).not.toBeDisabled();

    await user.click(saveBtn);
    expect(flags.mutateSpy).toHaveBeenCalledOnce();

    flags.isError = true;
    act(() => {
      rerender(<Home />);
    });

    expect(screen.getByText(/couldn't save/i)).toBeDefined();
    expect(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — water heater field expand and save", () => {
  it("clicking the water heater nudge shows the year input in-place and does not navigate", async () => {
    const user = userEvent.setup();
    renderHome();

    const nudgeBtn = screen.getByTestId(
      "button-nudge-waterHeaterInstalledYear",
    );
    expect(nudgeBtn).toBeDefined();

    await user.click(nudgeBtn);

    expect(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
    ).toBeDefined();

    // Trigger button replaced by inline form
    expect(
      screen.queryByTestId("button-nudge-waterHeaterInstalledYear"),
    ).toBeNull();

    // No router navigation triggered
    expect(flags.setLocationSpy).not.toHaveBeenCalled();
  });

  it("pressing Save on water heater calls PATCH with the correct field and removes the item on success", async () => {
    flags.triggerOnSuccess = true;

    const user = userEvent.setup();
    renderHome();

    await user.click(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    );
    await user.type(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
      "2019",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-waterHeaterInstalledYear",
    );
    expect(saveBtn).not.toBeDisabled();

    await act(async () => {
      await user.click(saveBtn);
    });

    expect(flags.mutateSpy).toHaveBeenCalledOnce();
    expect(flags.mutateSpy).toHaveBeenCalledWith({
      houseId: "house-1",
      field: "waterHeaterInstalledYear",
      year: 2019,
    });

    // onSuccess fired: form closed and item removed from the checklist
    expect(
      screen.queryByTestId("input-install-year-waterHeaterInstalledYear"),
    ).toBeNull();
    expect(
      screen.queryByTestId("button-nudge-waterHeaterInstalledYear"),
    ).toBeNull();
  });

  it("pressing Cancel on water heater closes the form without calling mutate", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    );
    await user.type(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
      "2019",
    );

    await user.click(
      screen.getByTestId(
        "button-cancel-install-year-waterHeaterInstalledYear",
      ),
    );

    expect(flags.mutateSpy).not.toHaveBeenCalled();

    expect(
      screen.queryByTestId("input-install-year-waterHeaterInstalledYear"),
    ).toBeNull();
    expect(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    ).toBeDefined();
  });

  it("a 500 from the server shows the error message inline and keeps the water heater form open", async () => {
    const user = userEvent.setup();
    const { rerender } = renderHome();

    await user.click(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    );
    await user.type(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
      "2019",
    );

    const saveBtn = screen.getByTestId(
      "button-save-install-year-waterHeaterInstalledYear",
    );
    expect(saveBtn).not.toBeDisabled();

    await user.click(saveBtn);
    expect(flags.mutateSpy).toHaveBeenCalledOnce();

    flags.isError = true;
    act(() => {
      rerender(<Home />);
    });

    expect(screen.getByText(/couldn't save/i)).toBeDefined();
    expect(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — only one field open at a time", () => {
  it("opening roof then switching to HVAC collapses the roof form", async () => {
    const user = userEvent.setup();
    renderHome();

    // Open roof
    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    expect(
      screen.getByTestId("input-install-year-roofInstalledYear"),
    ).toBeDefined();

    // Open HVAC — should collapse roof
    await user.click(screen.getByTestId("button-nudge-hvacInstalledYear"));
    expect(
      screen.queryByTestId("input-install-year-roofInstalledYear"),
    ).toBeNull();
    expect(
      screen.getByTestId("button-nudge-roofInstalledYear"),
    ).toBeDefined();
    expect(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
    ).toBeDefined();

    // mutate was never called (no save happened)
    expect(flags.mutateSpy).not.toHaveBeenCalled();
  });

  it("opening HVAC then switching to water heater collapses the HVAC form", async () => {
    const user = userEvent.setup();
    renderHome();

    // Open HVAC
    await user.click(screen.getByTestId("button-nudge-hvacInstalledYear"));
    expect(
      screen.getByTestId("input-install-year-hvacInstalledYear"),
    ).toBeDefined();

    // Open water heater — should collapse HVAC
    await user.click(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    );
    expect(
      screen.queryByTestId("input-install-year-hvacInstalledYear"),
    ).toBeNull();
    expect(
      screen.getByTestId("button-nudge-hvacInstalledYear"),
    ).toBeDefined();
    expect(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
    ).toBeDefined();

    expect(flags.mutateSpy).not.toHaveBeenCalled();
  });

  it("opening water heater then switching to roof collapses the water heater form", async () => {
    const user = userEvent.setup();
    renderHome();

    // Open water heater
    await user.click(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    );
    expect(
      screen.getByTestId("input-install-year-waterHeaterInstalledYear"),
    ).toBeDefined();

    // Open roof — should collapse water heater
    await user.click(screen.getByTestId("button-nudge-roofInstalledYear"));
    expect(
      screen.queryByTestId("input-install-year-waterHeaterInstalledYear"),
    ).toBeNull();
    expect(
      screen.getByTestId("button-nudge-waterHeaterInstalledYear"),
    ).toBeDefined();
    expect(
      screen.getByTestId("input-install-year-roofInstalledYear"),
    ).toBeDefined();

    expect(flags.mutateSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------

describe("Install-year nudge — Save button disabled while mutation is pending (double-click guard)", () => {
  const fields = [
    { key: "roofInstalledYear", label: "Roof" },
    { key: "hvacInstalledYear", label: "HVAC" },
    { key: "waterHeaterInstalledYear", label: "Water Heater" },
  ] as const;

  for (const { key, label } of fields) {
    it(`${label}: Save button is disabled when isPending is true`, async () => {
      flags.isPending = true;
      const user = userEvent.setup();
      renderHome();

      await user.click(screen.getByTestId(`button-nudge-${key}`));
      await user.type(screen.getByTestId(`input-install-year-${key}`), "2010");

      const saveBtn = screen.getByTestId(`button-save-install-year-${key}`);
      expect(saveBtn).toBeDisabled();
    });

    it(`${label}: clicking a disabled Save while isPending does not call mutate`, async () => {
      flags.isPending = true;
      const user = userEvent.setup();
      renderHome();

      await user.click(screen.getByTestId(`button-nudge-${key}`));
      await user.type(screen.getByTestId(`input-install-year-${key}`), "2010");

      const saveBtn = screen.getByTestId(`button-save-install-year-${key}`);
      expect(saveBtn).toBeDisabled();

      // userEvent respects the disabled attribute and will not fire a click
      // on a disabled button, matching real browser behavior.
      await user.click(saveBtn);

      expect(flags.mutateSpy).not.toHaveBeenCalled();
    });
  }
});
