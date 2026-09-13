import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fixtures = vi.hoisted(() => ({
  appliances: [] as Array<Record<string, unknown>>,
  manuals: new Map<string, Array<Record<string, unknown>>>(),
  toast: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "owner-1", role: "homeowner", firstName: "Owner" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));
vi.mock("@/hooks/useHomeownerSubscription", () => ({
  useHomeownerSubscription: () => ({
    isFreeUser: false, isPaidSubscriber: true, subscriptionStatus: "active",
    isLoading: false, isInTrial: false, needsUpgrade: false, trialDaysRemaining: 0,
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: fixtures.toast }) }));
vi.mock("wouter", () => ({
  useLocation: () => ["/maintenance", vi.fn()],
  useSearch: () => "",
  useRoute: () => [false, {}],
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/lib/nativeBrowser", () => ({
  isNativePlatform: false, onBackButton: () => () => {}, onAppStateChange: () => () => {},
}));
vi.mock("@/components/homeowner-feature-gate", () => ({
  FreeUserUpgradePrompt: () => null,
  HomeownerTrialBanner: () => null,
  HomeownerFeatureGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/home-health-score", () => ({ default: () => null }));
vi.mock("@/components/house-map", () => ({ default: () => null }));
vi.mock("@/components/appointment-scheduler", () => ({ AppointmentScheduler: () => null }));
vi.mock("@/components/custom-maintenance-tasks", () => ({ CustomMaintenanceTasks: () => null }));
vi.mock("@shared/location-maintenance-data", () => ({
  US_MAINTENANCE_DATA: {}, getRegionFromClimateZone: () => "national", getDueMaintenanceTasks: () => null,
}));
vi.mock("@shared/cost-helpers", () => ({ enrichTasksWithCosts: (tasks: unknown[]) => tasks }));
vi.mock("@shared/cost-baselines", () => ({ formatCostEstimate: () => "", formatDIYSavings: () => "" }));

import Maintenance from "./maintenance";

const house = {
  id: "house-1", homeownerId: "owner-1", name: "My Home", address: "1 Main St",
  city: "Town", state: "IL", zip: "60000", homeType: "single-family",
  yearBuilt: 2000, squareFootage: 1800, bedrooms: 3, bathrooms: 2,
  climateZone: "mixed", homeSystems: [], createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

function json(data: unknown, status = 200) {
  return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

function installApiMock() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url === "/api/houses") return json([house]);
    if (url.startsWith("/api/appliances?")) return json(fixtures.appliances);
    const manualList = url.match(/^\/api\/appliances\/([^/]+)\/manuals$/);
    if (manualList && method === "GET") return json(fixtures.manuals.get(manualList[1]) ?? []);
    if (manualList && method === "POST") {
      const body = JSON.parse(String(init?.body));
      const manual = { ...body, id: "manual-1", applianceId: manualList[1], createdAt: "2026-09-07" };
      fixtures.manuals.set(manualList[1], [manual]);
      return json(manual, 201);
    }
    const manual = url.match(/^\/api\/appliance-manuals\/([^/]+)$/);
    if (manual && method === "PATCH") {
      const body = JSON.parse(String(init?.body));
      const current = fixtures.manuals.get("appliance-1") ?? [];
      const updated = { ...current.find((item) => item.id === manual[1]), ...body };
      fixtures.manuals.set("appliance-1", current.map((item) => item.id === manual[1] ? updated : item));
      return json(updated);
    }
    if (manual && method === "DELETE") {
      fixtures.manuals.set("appliance-1", (fixtures.manuals.get("appliance-1") ?? []).filter((item) => item.id !== manual[1]));
      return json(null, 204);
    }
    if (url === "/api/appliances/appliance-1" && method === "DELETE") {
      fixtures.appliances = [];
      fixtures.manuals.delete("appliance-1");
      return json(null, 204);
    }
    if (url === "/api/appliances" && method === "POST") {
      const appliance = { ...JSON.parse(String(init?.body)), id: "appliance-1", createdAt: "2026-09-07" };
      fixtures.appliances = [appliance];
      return json(appliance, 201);
    }
    return json([]);
  }));
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async ({ queryKey }) => {
          const response = await fetch(String(queryKey[0]));
          if (!response.ok) throw new Error("Request failed");
          return response.json();
        },
      },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}><Maintenance /></QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fixtures.appliances = [];
  fixtures.manuals.clear();
  fixtures.toast.mockClear();
});

describe("maintenance appliance manuals", () => {
  it("shows property loading instead of the empty-home onboarding", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/houses") {
        return await new Promise<Response>(() => {});
      }
      return json([]);
    }));

    renderPage();

    expect(await screen.findByTestId("maintenance-properties-loading")).toBeInTheDocument();
    expect(screen.queryByText("Add Your First Property to Get Started")).not.toBeInTheDocument();
  });

  it("shows the seeded demo property instead of zero-property onboarding", async () => {
    installApiMock();
    renderPage();

    expect(await screen.findByText("My Home")).toBeInTheDocument();
    expect(screen.queryByText("Add Your First Property to Get Started")).not.toBeInTheDocument();
  });

  it("creates, reloads, edits, deletes a manual, then removes its appliance", async () => {
    installApiMock();
    const user = userEvent.setup();
    const first = renderPage();

    await user.click(await screen.findByRole("button", { name: /add appliance/i }));
    await user.type(screen.getByPlaceholderText(/kitchen dishwasher/i), "Kitchen Dishwasher");
    await user.type(screen.getByPlaceholderText(/whirlpool/i), "Acme");
    await user.type(screen.getByPlaceholderText(/wdf520padm/i), "DW-1");
    await user.click(screen.getByRole("button", { name: /add appliance/i }));

    const applianceButton = await screen.findByRole("button", { name: /kitchen dishwasher/i });
    await user.click(applianceButton);
    await user.click(await screen.findByRole("button", { name: /add manual/i }));
    await user.type(screen.getByPlaceholderText(/owner's manual/i), "Owner Manual");
    await user.type(screen.getByPlaceholderText(/file will be uploaded/i), "/objects/owner.pdf");
    await user.click(screen.getByRole("button", { name: /add manual/i }));
    expect(await screen.findByText("Owner Manual")).toBeInTheDocument();

    first.unmount();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /kitchen dishwasher/i }));
    expect(await screen.findByText("Owner Manual")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Owner Manual" }));
    const title = screen.getByPlaceholderText(/owner's manual/i);
    await user.clear(title);
    await user.type(title, "Updated Manual");
    await user.click(screen.getByRole("button", { name: /update manual/i }));
    expect(await screen.findByText("Updated Manual")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Updated Manual" }));
    await waitFor(() => expect(screen.queryByText("Updated Manual")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Delete Kitchen Dishwasher" }));
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() => expect(screen.queryByText("Kitchen Dishwasher")).not.toBeInTheDocument());
  }, 10_000);
});