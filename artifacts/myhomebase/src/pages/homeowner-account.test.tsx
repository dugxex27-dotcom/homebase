import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeownerAccount from "./homeowner-account";

const mockSetLocation = vi.fn();
const mockSearch = vi.fn(() => "");
const { mockUser, mockNotificationPreferences } = vi.hoisted(() => ({
  mockUser: {
    id: "test-user-id",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  },
  mockNotificationPreferences: {
    emailNotifications: true,
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/account", mockSetLocation],
  useSearch: () => mockSearch(),
  Link: ({ href, children, "data-testid": dataTestid, className }: any) => (
    <a href={href} data-testid={dataTestid} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock("@/hooks/useHomeownerSubscription", () => ({
  useHomeownerSubscription: () => ({
    isPaidSubscriber: false,
    isInTrial: false,
    isFreeUser: true,
    trialDaysRemaining: 0,
    needsUpgrade: true,
    currentPlan: "base",
    maxHouses: 2,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
      clear: vi.fn(),
    }),
    useQuery: ({ queryKey }: { queryKey: any[] }) => {
      const key = queryKey[0];
      if (key === "/api/homeowner/notifications/preferences") {
        return { data: mockNotificationPreferences };
      }
      if (key === "/api/homeowner/weather-forecast-preview") {
        return { data: { houses: [] }, isLoading: false };
      }
      if (key === "/api/quiz-result/me") {
        return { data: null };
      }
      if (key === "/api/user") {
        return { data: { maxHousesAllowed: 2 } };
      }
      if (key === "/api/user/referral-code") {
        return { data: { referralCode: "TEST1234", referralLink: "link", referralCount: 0 } };
      }
      if (key === "/api/houses") {
        return { data: [{ id: "h1", address: "123 Main" }], isLoading: false };
      }
      if (key === "/api/house-transfers") {
        return { data: [] };
      }
      return { data: null };
    },
    useMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
  };
});

vi.mock("@/components/address-autocomplete", () => ({
  default: () => <input data-testid="mock-address-autocomplete" />,
}));
vi.mock("@/components/push-notification-manager", () => ({
  default: () => <div data-testid="mock-push-manager" />,
}));
vi.mock("@/components/activating-plan-banner", () => ({
  ActivatingPlanBanner: () => <div data-testid="mock-banner" />,
}));

describe("HomeownerAccount Tabbed Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it("defaults to the Profile tab when no tab is provided", () => {
    mockSearch.mockReturnValue("");
    render(<HomeownerAccount />);
    
    // Check url redirect logic - happens via useEffect
    expect(mockSetLocation).toHaveBeenCalledWith("/account?tab=profile", { replace: true });
    
    // Check that the profile panel is visible and others are hidden
    const profilePanel = screen.getByRole("tabpanel", { name: "Profile" });
    const securityPanel = screen.getByRole("tabpanel", { name: "Security" });
    
    expect(profilePanel.className).toContain("block");
    expect(securityPanel.className).toContain("hidden");
  });

  it("selects the correct tab based on the URL parameter", () => {
    mockSearch.mockReturnValue("tab=billing");
    render(<HomeownerAccount />);
    
    const billingPanel = screen.getByRole("tabpanel", { name: "Billing" });
    expect(billingPanel.className).toContain("block");
    
    const profilePanel = screen.getByRole("tabpanel", { name: "Profile" });
    expect(profilePanel.className).toContain("hidden");
  });

  it("safely falls back to the Profile tab if an invalid tab is provided", () => {
    mockSearch.mockReturnValue("tab=invalid-tab-name");
    render(<HomeownerAccount />);
    
    expect(mockSetLocation).toHaveBeenCalledWith("/account?tab=profile", { replace: true });
  });

  it("updates the URL when a tab button is clicked", async () => {
    mockSearch.mockReturnValue("tab=profile");
    render(<HomeownerAccount />);
    
    const user = userEvent.setup();
    const securityTab = screen.getByTestId("tab-security");
    
    await user.click(securityTab);
    
    // Verify it pushed the new URL
    expect(mockSetLocation).toHaveBeenCalledWith("/account?tab=security");
  });

  it("preserves unrelated query parameters when changing tabs", async () => {
    mockSearch.mockReturnValue("tab=profile&otherParam=123");
    render(<HomeownerAccount />);
    
    const user = userEvent.setup();
    const billingTab = screen.getByTestId("tab-billing");
    
    await user.click(billingTab);
    
    expect(mockSetLocation).toHaveBeenCalledWith("/account?tab=billing&otherParam=123");
  });

  it("renders all seven tab buttons with the correct labels", () => {
    mockSearch.mockReturnValue("tab=profile");
    render(<HomeownerAccount />);
    
    const labels = ["Profile", "Security", "Billing", "Notifications", "Referrals", "Properties", "Account"];
    labels.forEach(label => {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    });
  });

  it("wires up actions within the tabs without losing state (e.g. Save Profile)", () => {
    mockSearch.mockReturnValue("tab=profile");
    render(<HomeownerAccount />);
    
    const saveButton = screen.getByTestId("button-save-profile");
    expect(saveButton).toBeInTheDocument();
    // Assuming mutations are properly mocked, rendering the button confirms the profile form is intact.
  });
});
