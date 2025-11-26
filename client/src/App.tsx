import { lazy, useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "./lib/queryClient";
import LoadingFallback from "@/components/loading-fallback";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import UnauthenticatedLayout from "@/layouts/unauthenticated-layout";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// Lazy-loaded pages - Common
const Home = lazy(() => import("./pages/home"));
const Messages = lazy(() => import("./pages/messages"));
const MyHome = lazy(() => import("./pages/my-home"));
const Maintenance = lazy(() => import("./pages/maintenance"));
const HouseholdProfile = lazy(() => import("./pages/household-profile"));
const CompleteProfile = lazy(() => import("./pages/complete-profile"));
const TestUpload = lazy(() => import("./pages/test-upload"));
const HouseTransferAccept = lazy(() => import("./pages/house-transfer-accept"));
const NotFound = lazy(() => import("./pages/not-found"));

// Lazy-loaded pages - Homeowner
const Contractors = lazy(() => import("./pages/contractors"));
const Products = lazy(() => import("./pages/products"));
const ContractorDetail = lazy(() => import("./pages/contractor-detail"));
const HomeownerServiceRecords = lazy(() => import("./pages/homeowner-service-records"));
const HomeownerAccount = lazy(() => import("./pages/homeowner-account"));
const HomeownerReferral = lazy(() => import("./pages/homeowner-referral"));
const HomeownerPricing = lazy(() => import("./pages/homeowner-pricing"));
const Achievements = lazy(() => import("./pages/achievements"));
const AIContractorHelp = lazy(() => import("./pages/ai-contractor-help"));
const Billing = lazy(() => import("./pages/billing"));

// Lazy-loaded pages - Contractor
const ContractorDashboard = lazy(() => import("./pages/contractor-dashboard"));
const ContractorProfile = lazy(() => import("./pages/contractor-profile"));
const ContractorReferral = lazy(() => import("./pages/contractor-referral"));
const ServiceRecords = lazy(() => import("./pages/service-records"));
const ManageTeam = lazy(() => import("./pages/manage-team"));
const ContractorCRM = lazy(() => import("./pages/contractor-crm"));
const CrmLeadDetail = lazy(() => import("./pages/crm-lead-detail"));

// Lazy-loaded pages - Agent
const AgentDashboard = lazy(() => import("./pages/agent-dashboard"));
const AgentAccount = lazy(() => import("./pages/agent-account"));
const AgentReferral = lazy(() => import("./pages/agent-referral"));

// Lazy-loaded pages - Admin
const AdminDashboard = lazy(() => import("./pages/admin"));
const AdminSupport = lazy(() => import("./pages/admin-support"));
const AdminFlaggedReviews = lazy(() => import("./pages/admin-flagged-reviews"));
const DeveloperConsole = lazy(() => import("./pages/developer-console"));

// Lazy-loaded pages - Support
const Support = lazy(() => import("./pages/support"));
const SupportTicketDetail = lazy(() => import("./pages/support-ticket-detail"));
const TermsOfService = lazy(() => import("./pages/terms-of-service"));
const PrivacyPolicy = lazy(() => import("./pages/privacy-policy"));
const LegalDisclaimer = lazy(() => import("./pages/legal-disclaimer"));

// Lazy-loaded pages - Auth
const Landing = lazy(() => import("./pages/landing"));
const SignIn = lazy(() => import("./pages/signin"));
const SignInHomeowner = lazy(() => import("./pages/signin-homeowner"));
const SignInContractor = lazy(() => import("./pages/signin-contractor"));
const SignInAgent = lazy(() => import("./pages/signin-agent"));
const Onboarding = lazy(() => import("./pages/onboarding"));
const Invite = lazy(() => import("./pages/invite"));

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Set data-role attribute on body for role-based theming
  useEffect(() => {
    const typedUser = user as { role?: string } | undefined;
    const role = typedUser?.role || 'homeowner';
    document.body.setAttribute('data-role', role);
    
    return () => {
      document.body.removeAttribute('data-role');
    };
  }, [user]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingFallback />;
  }

  // Unauthenticated routes
  if (!isAuthenticated) {
    return (
      <UnauthenticatedLayout>
        <Switch>
          <Route path="/invite/:code" component={Invite} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/signin/homeowner" component={SignInHomeowner} />
          <Route path="/signin/contractor" component={SignInContractor} />
          <Route path="/signin/agent" component={SignInAgent} />
          <Route path="/signin" component={SignIn} />
          <Route path="/test-upload" component={TestUpload} />
          <Route path="/complete-profile" component={CompleteProfile} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/legal-disclaimer" component={LegalDisclaimer} />
          <Route path="/" component={Landing} />
          <Route component={Landing} />
        </Switch>
      </UnauthenticatedLayout>
    );
  }

  // Authenticated user routes
  const typedUser = user as { role?: string; email?: string } | undefined;
  
  // Check if user is admin (based on ADMIN_EMAILS environment variable)
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean);
  const isAdmin = typedUser?.email && adminEmails.includes(typedUser.email);
  
  return (
    <AuthenticatedLayout>
      <Switch>
        {/* Home route */}
        <Route path="/" component={Home} />
        
        {/* Shared routes - all authenticated users */}
        <Route path="/test-upload" component={TestUpload} />
        <Route path="/complete-profile" component={CompleteProfile} />
        <Route path="/house-transfer/:token" component={HouseTransferAccept} />
        <Route path="/messages" component={Messages} />
        <Route path="/my-home" component={MyHome} />
        <Route path="/maintenance" component={Maintenance} />
        <Route path="/household-profile/:id" component={HouseholdProfile} />
        <Route path="/support/:id" component={SupportTicketDetail} />
        <Route path="/support" component={Support} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/legal-disclaimer" component={LegalDisclaimer} />
        <Route path="/signin" component={SignIn} />
        
        {/* Admin routes */}
        {isAdmin && (
          <>
            <Route path="/admin/developer-console" component={DeveloperConsole} />
            <Route path="/admin/flagged-reviews" component={AdminFlaggedReviews} />
            <Route path="/admin/support/:id" component={AdminSupport} />
            <Route path="/admin/support" component={AdminSupport} />
            <Route path="/admin" component={AdminDashboard} />
          </>
        )}
        
        {/* Homeowner-specific routes */}
        {typedUser?.role === 'homeowner' && (
          <>
            <Route path="/contractors" component={Contractors} />
            <Route path="/find-contractors" component={Contractors} />
            <Route path="/products" component={Products} />
            <Route path="/contractor/:id" component={ContractorDetail} />
            <Route path="/service-records" component={HomeownerServiceRecords} />
            <Route path="/account" component={HomeownerAccount} />
            <Route path="/homeowner-referral" component={HomeownerReferral} />
            <Route path="/homeowner-pricing" component={HomeownerPricing} />
            <Route path="/achievements" component={Achievements} />
            <Route path="/ai-help" component={AIContractorHelp} />
            <Route path="/billing" component={Billing} />
          </>
        )}
        
        {/* Contractor-specific routes */}
        {typedUser?.role === 'contractor' && (
          <>
            <Route path="/contractor-dashboard" component={ContractorDashboard} />
            <Route path="/crm/leads/:id" component={CrmLeadDetail} />
            <Route path="/crm" component={ContractorCRM} />
            <Route path="/contractor-profile" component={ContractorProfile} />
            <Route path="/contractor-referral" component={ContractorReferral} />
            <Route path="/service-records" component={ServiceRecords} />
            <Route path="/manage-team" component={ManageTeam} />
            <Route path="/contractor/:id" component={ContractorDetail} />
          </>
        )}
        
        {/* Agent-specific routes */}
        {typedUser?.role === 'agent' && (
          <>
            <Route path="/agent-dashboard" component={AgentDashboard} />
            <Route path="/agent-account" component={AgentAccount} />
            <Route path="/agent-referral" component={AgentReferral} />
            <Route path="/billing" component={Billing} />
          </>
        )}
        
        {/* 404 fallback */}
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <PWAInstallPrompt />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
