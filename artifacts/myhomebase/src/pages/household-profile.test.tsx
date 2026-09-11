/**
 * Unit tests confirming the profile checklist updates live as the homeowner
 * fills in the editor.
 *
 * Test 1 — fill-in wiring:
 *   Opens the editor by clicking a missing checklist row, then invokes
 *   onFieldChange with the new value, and confirms the checklist item flips
 *   to the "filled" checked state before any save occurs.
 *
 * Test 2 — focus wiring:
 *   Clicks a filled checklist row and confirms the editor is opened with the
 *   correct focusField prop so the browser can scroll/focus that field.
 *
 * HouseholdProfileEditor is mocked so tests do not depend on Radix UI's
 * pointer-event behavior in happy-dom. The captured onFieldChange is invoked
 * directly to simulate what react-hook-form's form.watch() subscription does
 * when the user types in the real editor.
 *
 * IMPORTANT — stable mock references:
 *   The page derives `house` from `useQuery` data via Array.find(). If the
 *   mock returns new object references on every call, `house` changes identity
 *   each render, triggering the `useEffect([house])` that calls
 *   setDraftProgress, which re-renders, which calls useQuery again — an
 *   infinite loop that hangs the test runner before any test body executes.
 *   Keeping MOCK_HOUSES as a stable module-level reference breaks the loop.
 */

import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Stable mock data — defined at module level so every useQuery call returns
// the SAME array/object reference, preventing the re-render loop.
// ---------------------------------------------------------------------------

const MOCK_HOUSE = {
  id: "house-abc",
  name: "My Home",
  address: "123 Test St",
  // homeType is intentionally null — this is the missing field under test
  homeType: null as string | null,
  // yearBuilt is already filled — used in test 2
  yearBuilt: 2005,
  squareFootage: null,
  roofType: null,
  hvacType: null,
  roofInstalledYear: null,
  hvacInstalledYear: null,
  waterHeaterInstalledYear: null,
  homeSystems: [] as string[],
};

const MOCK_HOUSES = [MOCK_HOUSE];
const MOCK_QUERY_RESULT = { data: MOCK_HOUSES, isLoading: false };
const EMPTY_QUERY_RESULT = { data: undefined, isLoading: false };

// ---------------------------------------------------------------------------
// Captured editor props — updated by the mock component each render.
// Using module-level lets (not vi.hoisted) is safe because vi.mock factories
// capture these via closure; the factories execute lazily (on first import),
// after all module-level code has run.
// ---------------------------------------------------------------------------

let capturedOpen = false;
let capturedFocusField: string | null = null;
let capturedOnFieldChange: ((v: Record<string, unknown>) => void) | null = null;
let capturedOnOpenChange: ((open: boolean) => void) | null = null;
let capturedCurrentProfile: Record<string, unknown> | undefined;
const setQueryDataMock = vi.fn();
const saveProfileMock = vi.fn().mockResolvedValue({});

function installQueryCacheUpdater() {
  setQueryDataMock.mockImplementation((
    _queryKey: readonly unknown[],
    updater: (houses: typeof MOCK_HOUSES | undefined) => typeof MOCK_HOUSES | undefined,
  ) => {
    const updatedHouses = updater(MOCK_HOUSES);
    if (updatedHouses) {
      MOCK_HOUSES.splice(0, MOCK_HOUSES.length, ...updatedHouses);
    }
  });
}

installQueryCacheUpdater();

function resetCaptures() {
  capturedOpen = false;
  capturedFocusField = null;
  capturedOnFieldChange = null;
  capturedOnOpenChange = null;
  capturedCurrentProfile = undefined;
  setQueryDataMock.mockReset();
  installQueryCacheUpdater();
  saveProfileMock.mockClear();
  MOCK_HOUSE.squareFootage = null;
  MOCK_HOUSES.splice(0, MOCK_HOUSES.length, MOCK_HOUSE);
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("wouter", () => ({
  useRoute: (_pattern: string) => [true, { id: "house-abc" }],
}));

vi.mock("@/components/household-profile-editor", () => ({
  HouseholdProfileEditor: (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    focusField?: string | null;
    onFieldChange?: (v: Record<string, unknown>) => void;
    currentProfile?: Record<string, unknown>;
    [key: string]: unknown;
  }) => {
    capturedOpen = props.open;
    capturedOnOpenChange = props.onOpenChange;
    capturedFocusField = props.focusField ?? null;
    capturedOnFieldChange = props.onFieldChange ?? null;
    capturedCurrentProfile = props.currentProfile;
    if (!props.open) return null;
    return (
      <div data-testid="mock-editor">
        <button
          data-testid="mock-save-profile"
          onClick={async () => {
            const updatedValues = { squareFootage: 2400 };
            await saveProfileMock(updatedValues);
            setQueryDataMock(
              ["/api/houses"],
              (cachedHouses: typeof MOCK_HOUSES | undefined) => cachedHouses?.map(
                (cachedHouse) => cachedHouse.id === "house-abc"
                  ? { ...cachedHouse, ...updatedValues }
                  : cachedHouse,
              ),
            );
            props.onOpenChange(false);
          }}
        >
          Save profile
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/maintenance-schedule-display", () => ({
  MaintenanceScheduleDisplay: () => <div data-testid="mock-schedule" />,
}));

// Synchronous mock returning STABLE references to prevent re-render loops.
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(({ queryKey }: { queryKey: readonly unknown[] }) => {
    if (queryKey[0] === "/api/houses") return MOCK_QUERY_RESULT;
    return EMPTY_QUERY_RESULT;
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
    invalidateQueries: vi.fn(),
    setQueryData: setQueryDataMock,
    getQueryData: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Import subject AFTER all vi.mock() declarations
// ---------------------------------------------------------------------------

import HouseholdProfilePage from "./household-profile";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  return render(<HouseholdProfilePage />);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
  resetCaptures();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Profile checklist — live checklist update while editor is open", () => {
  it("checklist item flips to checked when onFieldChange fires with the filled value before saving", () => {
    renderPage();

    // homeType starts as null → checklist row should be in the "missing" state
    const homeTypeRow = screen.getByTestId("checklist-field-homeType");
    expect(homeTypeRow.getAttribute("aria-label")).toMatch(/missing/i);

    // Clicking the missing checklist row opens the editor focused on that field
    act(() => {
      fireEvent.click(homeTypeRow);
    });
    expect(capturedOpen).toBe(true);
    expect(capturedFocusField).toBe("select-home-type");

    // Simulate the live onFieldChange callback that react-hook-form's
    // form.watch() subscription fires as the user selects a home type.
    // No save has occurred yet — this is the pure live-update path.
    act(() => {
      capturedOnFieldChange?.({
        homeType: "single_family",
        yearBuilt: 2005,
        roofType: undefined,
        hvacType: undefined,
        roofInstalledYear: undefined,
        hvacInstalledYear: undefined,
        waterHeaterInstalledYear: undefined,
      });
    });

    // The checklist item must now show as filled — the server has not been
    // called and the editor has not been closed yet.
    expect(homeTypeRow.getAttribute("aria-label")).toMatch(/filled/i);
  });

  it("keeps the progress percentage in sync as multiple checklist fields are filled before saving", () => {
    renderPage();

    const homeTypeRow = screen.getByTestId("checklist-field-homeType");
    const squareFootageRow = screen.getByTestId("checklist-field-squareFootage");
    const roofTypeRow = screen.getByTestId("checklist-field-roofType");
    const hvacTypeRow = screen.getByTestId("checklist-field-hvacType");
    const progressBar = screen.getByTestId("profile-progress-bar");

    expect(homeTypeRow.getAttribute("aria-label")).toMatch(/missing/i);
    expect(squareFootageRow.getAttribute("aria-label")).toMatch(/missing/i);
    expect(roofTypeRow.getAttribute("aria-label")).toMatch(/missing/i);
    expect(hvacTypeRow.getAttribute("aria-label")).toMatch(/missing/i);
    expect(progressBar).toHaveAttribute("aria-valuenow", "12");
    expect(screen.getByText("12% complete")).toBeInTheDocument();

    fireEvent.click(homeTypeRow);

    act(() => {
      capturedOnFieldChange?.({
        homeType: "single_family",
        squareFootage: 2400,
        roofType: "asphalt_shingle",
        hvacType: "central_air",
      });
    });

    expect(homeTypeRow.getAttribute("aria-label")).toMatch(/filled/i);
    expect(squareFootageRow.getAttribute("aria-label")).toMatch(/filled/i);
    expect(roofTypeRow.getAttribute("aria-label")).toMatch(/filled/i);
    expect(hvacTypeRow.getAttribute("aria-label")).toMatch(/filled/i);
    expect(progressBar).toHaveAttribute("aria-valuenow", "62");
    expect(screen.getByText("62% complete")).toBeInTheDocument();
  });
});

describe("Profile checklist — editor focus wiring for filled fields", () => {
  it("clicking a filled checklist row opens the editor with the matching focusField", () => {
    renderPage();

    // yearBuilt is 2005 on the server → checklist row starts in the "filled" state
    const yearBuiltRow = screen.getByTestId("checklist-field-yearBuilt");
    expect(yearBuiltRow.getAttribute("aria-label")).toMatch(/filled/i);

    // Clicking the filled row should still open the editor and pass the correct
    // focusField so the browser scrolls to and focuses the year-built input.
    act(() => {
      fireEvent.click(yearBuiltRow);
    });
    expect(capturedOpen).toBe(true);
    expect(capturedFocusField).toBe("input-year-built");
  });
});

describe("Profile editor — immediate reopen after saving", () => {
  it("passes home systems selected in Maintenance to the editor", () => {
    MOCK_HOUSE.homeSystems.push("central-ac", "sump-pump");

    renderPage();
    fireEvent.click(screen.getByTestId("button-edit-profile"));

    expect(capturedCurrentProfile?.homeSystems).toEqual(["central-ac", "sump-pump"]);

    MOCK_HOUSE.homeSystems.length = 0;
  });

  it("passes a successfully saved value back to the editor before the houses query refetches", async () => {
    renderPage();

    fireEvent.click(screen.getByTestId("button-edit-profile"));
    expect(capturedCurrentProfile?.squareFootage).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-save-profile"));
    });
    expect(saveProfileMock).toHaveBeenCalledWith({ squareFootage: 2400 });
    expect(setQueryDataMock).toHaveBeenCalledWith(
      ["/api/houses"],
      expect.any(Function),
    );
    expect(MOCK_HOUSES[0].squareFootage).toBe(2400);
    expect(capturedOpen).toBe(false);

    fireEvent.click(screen.getByTestId("button-edit-profile"));
    expect(capturedOpen).toBe(true);
    expect(capturedCurrentProfile?.squareFootage).toBe(2400);
  });
});

describe("Property Details — Home Systems", () => {
  it("shows Not specified when no home systems are selected", () => {
    renderPage();

    const label = screen.getByText("Home Systems");
    expect(label.nextElementSibling).toHaveTextContent("Not specified");
  });

  it("lists every selected home system", () => {
    MOCK_HOUSE.homeSystems.push("central_air", "sump_pump");

    renderPage();

    const label = screen.getByText("Home Systems");
    expect(label.nextElementSibling).toHaveTextContent("Central Air, Sump Pump");

    MOCK_HOUSE.homeSystems.length = 0;
  });
});
