import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fixtures = vi.hoisted(() => ({
  tasks: [
    {
      id: "heating-prep",
      title: "Check heating system preparation",
      description: "Test the heating system before cool weather arrives.",
      priority: "high",
      actionSummary: "Test the heating system before the first cold night.",
      steps: ["Turn on the thermostat", "Listen for unusual sounds"],
      toolsAndSupplies: ["Flashlight", "Notepad"],
      estimatedTime: "45 minutes",
      difficulty: "moderate",
      category: "HVAC",
      tools: ["Flashlight"],
      intentFamily: "hvac",
      fallbackUsed: false,
      monitoringOnly: false,
      costApplicability: "costable",
      costEstimate: { proLow: 120, proHigh: 220, materialsLow: 15, materialsHigh: 35, currency: "USD" },
    },
    {
      id: "air-quality",
      title: "Monitor air quality systems",
      description: "Monitor AQI and keep filtration supplies ready during fire season.",
      priority: "high",
      actionSummary: "Monitor indoor and outdoor air quality during fire season.",
      steps: ["Check the AQI", "Run HEPA filtration when needed"],
      toolsAndSupplies: ["AQI app", "Replacement filter"],
      estimatedTime: "10 minutes",
      difficulty: "easy",
      category: "Safety",
      tools: ["AQI app"],
      intentFamily: "air_quality",
      fallbackUsed: false,
      monitoringOnly: true,
      costApplicability: "monitoring_only",
    },
    {
      id: "summer-damage",
      title: "Inspect for summer damage",
      description: "Look for exterior wear before fall rains arrive.",
      priority: "high",
      actionSummary: "Inspect the exterior for damage while conditions are dry.",
      steps: ["Walk the exterior", "Photograph damage"],
      toolsAndSupplies: ["Camera", "Notepad"],
      estimatedTime: "1–2 hours",
      difficulty: "difficult",
      category: "Exterior",
      tools: ["Camera"],
      intentFamily: "exterior_inspection",
      fallbackUsed: false,
      monitoringOnly: false,
      costApplicability: "costable",
      costEstimate: { proLow: 180, proHigh: 360, materialsLow: 20, materialsHigh: 50, currency: "USD" },
    },
    {
      id: "washer-filter",
      title: "Clean washing machine drain filter",
      description: "Clean the drain filter before the heavy laundry season.",
      priority: "high",
      actionSummary: "Clean the washer drain filter and test for leaks.",
      steps: ["Open the access panel", "Remove debris and test for leaks"],
      toolsAndSupplies: ["Towels", "Shallow pan"],
      estimatedTime: "30 minutes",
      difficulty: "easy",
      category: "Appliances",
      tools: ["Towels"],
      intentFamily: "appliance_maintenance",
      fallbackUsed: false,
      monitoringOnly: false,
      costApplicability: "costable",
      costEstimate: { proLow: 75, proHigh: 125, materialsLow: 5, materialsHigh: 15, currency: "USD" },
    },
    {
      id: "passive-monitor",
      title: "Track indoor air quality trends",
      description: "Observe indoor air quality readings during smoke events.",
      priority: "medium",
      actionSummary: "Observe air quality readings and note changes over time.",
      steps: ["Review the monitor", "Record unusual readings"],
      toolsAndSupplies: ["AQI app"],
      estimatedTime: "5 minutes",
      difficulty: "easy",
      category: "Safety",
      tools: ["AQI app"],
      intentFamily: "air_quality",
      fallbackUsed: false,
      monitoringOnly: true,
      costApplicability: "monitoring_only",
    },
  ],
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
  US_MAINTENANCE_DATA: { "Pacific Northwest": {} },
  getRegionFromClimateZone: () => "Pacific Northwest",
  getDueMaintenanceTasks: () => ({
    seasonal: fixtures.tasks,
    weatherSpecific: [],
    priority: "high",
  }),
}));
vi.mock("@shared/cost-helpers", () => ({
  enrichTasksWithCosts: (tasks: Array<Record<string, unknown>>) =>
    tasks.map((task) => ({
      ...task,
      // Simulate the generic baseline that enrichment can produce when a
      // regional task has no explicit cost. The display should reject this
      // baseline for air-quality monitoring.
      costEstimate: task.costEstimate ?? {
        proLow: 50, proHigh: 100, materialsLow: 10, materialsHigh: 30, currency: "USD",
      },
    })),
}));
vi.mock("@shared/cost-baselines", () => ({
  formatCostEstimate: (estimate: { proLow: number; proHigh?: number }) =>
    `$${estimate.proLow}–$${estimate.proHigh ?? estimate.proLow}`,
  formatDIYSavings: (estimate: { materialsLow?: number; materialsHigh?: number }) =>
    `DIY $${estimate.materialsLow ?? 0}–$${estimate.materialsHigh ?? estimate.materialsLow ?? 0}`,
}));

import Maintenance from "./maintenance";

const house = {
  id: "house-1", homeownerId: "owner-1", name: "My Home", address: "1 Main St",
  city: "Town", state: "WA", zip: "60000", homeType: "single-family",
  yearBuilt: 2000, squareFootage: 1800, bedrooms: 3, bathrooms: 2,
      climateZone: "pacific-northwest", homeSystems: ["gas-furnace"], createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

function renderPage() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    if (String(input) === "/api/houses") {
      return new Response(JSON.stringify([house]), { status: 200 });
    }
    return new Response("[]", { status: 200 });
  }));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}><Maintenance /></QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fixtures.toast.mockClear();
});

describe("regional maintenance task details", () => {
  it("renders enriched steps, time, difficulty, tools, and costs without inventing air-quality costs", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findAllByText("Check heating system preparation")).not.toHaveLength(0);
    await user.click(screen.getAllByTestId("title-task-check-heating-system-preparation")[0]);
    expect(await screen.findByText("Turn on the thermostat")).toBeInTheDocument();
    expect(screen.getByText("45 minutes")).toBeInTheDocument();
    expect(screen.getByText("moderate")).toBeInTheDocument();
    expect(screen.getAllByText("Flashlight").length).toBeGreaterThan(0);
    expect(screen.getByText("DIY $15–$35")).toBeInTheDocument();
    expect(screen.getByText("$120–$220")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close/i }));
    await user.click(screen.getAllByTestId("title-task-monitor-air-quality-systems")[0]);
    expect(await screen.findByText("Run HEPA filtration when needed")).toBeInTheDocument();
    expect(screen.getByText("10 minutes")).toBeInTheDocument();
    expect(screen.getByText("easy")).toBeInTheDocument();
    expect(screen.getAllByText("AQI app").length).toBeGreaterThan(0);
    expect(screen.queryByText(/DIY \$\d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close/i }));
    await user.click(screen.getAllByTestId("title-task-track-indoor-air-quality-trends")[0]);
    expect(await screen.findByText("Record unusual readings")).toBeInTheDocument();
    expect(screen.getByText("5 minutes")).toBeInTheDocument();
    expect(screen.queryByText(/DIY \$\d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
  });

  it("keeps enriched details for the other regional examples", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Check heating system preparation");

    await user.click(screen.getAllByTestId("title-task-inspect-for-summer-damage")[0]);
    expect(await screen.findByText("Photograph damage")).toBeInTheDocument();
    expect(screen.getByText("1–2 hours")).toBeInTheDocument();
    expect(screen.getByText("difficult")).toBeInTheDocument();
    expect(screen.getByText("DIY $20–$50")).toBeInTheDocument();
    expect(screen.getByText("$180–$360")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close/i }));
    await user.click(screen.getAllByTestId("title-task-clean-washing-machine-drain-filter")[0]);
    expect(await screen.findByText("Remove debris and test for leaks")).toBeInTheDocument();
    expect(screen.getByText("30 minutes")).toBeInTheDocument();
    expect(screen.getAllByText("Towels").length).toBeGreaterThan(0);
    expect(screen.getByText("DIY $5–$15")).toBeInTheDocument();
    expect(screen.getByText("$75–$125")).toBeInTheDocument();
  });
});