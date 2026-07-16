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
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mutable flags — set before any module is processed
// ---------------------------------------------------------------------------

const flags = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  triggerOnSuccess: false,
  // Updated by the mutate mock when triggerOnSuccess is true.
  // useQuery reads this to simulate the refetched house after a successful save.
  savedRoofYear: null as number | null,
  savedHvacYear: null as number | null,
  savedWaterHeaterYear: null as number | null,
  // Captured from the last useMutation({ onSuccess }) call in each render.
  // patchInstallYearMutation is always the last useMutation registered per render.
  patchOnSuccess: null as (() => void) | null,
  mutateSpy: vi.fn(),
  resetSpy: vi.fn(),
  setLocationSpy: vi.fn(),
  invalidateQueriesSpy: vi.fn(),
  // When true the house mock returns every profile field filled in, making
  // profileNudgeAllDone === true so the card should not render.
  allInstallYearsDone: false,
}));

// ---------------------------------------------------------------------------
// Module mocks
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
            yearBuilt: 2000,
            squareFootage: 2000,
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

        if (queryKey.length === 3 && queryKey[2] === "health-score") {
          return { data: { score: 55 }, isLoading: false };
        }

        if (key0 === "/api/homeowner/linked-invoices/unclaimed-count") {
          return { data: { count: 0 }, isLoading: false };
        }

        return { data: undefined, isLoading: false };
      },
    ),
    useMutation: vi.fn(
      (opts?: {
        onSuccess?: (...args: unknown[]) => void;
        [k: string]: unknown;
      }) => {
        // patchInstallYearMutation is the last useMutation call per render,
        // so this always ends up pointing to its onSuccess after each render.
        if (opts?.onSuccess) {
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
  flags.isPending = false;
  flags.isError = false;
  flags.triggerOnSuccess = false;
  flags.savedRoofYear = null;
  flags.savedHvacYear = null;
  flags.savedWaterHeaterYear = null;
  flags.patchOnSuccess = null;
  flags.allInstallYearsDone = false;
  flags.mutateSpy.mockClear();
  flags.resetSpy.mockClear();
  flags.setLocationSpy.mockClear();
  flags.invalidateQueriesSpy.mockClear();
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
