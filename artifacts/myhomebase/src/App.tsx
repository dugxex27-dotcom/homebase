import { lazy, useEffect } from "react";
import { Router as WouterRouter, Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "./lib/queryClient";
import LoadingFallback from "@/components/loading-fallback";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import UnauthenticatedLayout from "@/layouts/unauthenticated-layout";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { GuidedTour, ContractorGuidedTour, AgentGuidedTour } from "@/components/guided-tour";

// Scroll to top on route changes
function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location]);
  
  return null;
}

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
const Documents = lazy(() => import("./pages/documents"));
const ResaleReport = lazy(() => import("./pages/resale-report"));

// Lazy-loaded pages - Contractor
const ContractorDashboard = lazy(() => import("./pages/contractor-dashboard"));
const ContractorOnboarding = lazy(() => import("./pages/contractor-onboarding"));
const ContractorProfile = lazy(() => import("./pages/contractor-profile"));
const ContractorReferral = lazy(() => import("./pages/contractor-referral"));
const ServiceRecords = lazy(() => import("./pages/service-records"));
const ManageTeam = lazy(() => import("./pages/manage-team"));
const ContractorCRM = lazy(() => import("./pages/contractor-crm"));
const CrmLeadDetail = lazy(() => import("./pages/crm-lead-detail"));
const ContractorUpgrade = lazy(() => import("./pages/contractor-upgrade"));

// Lazy-loaded pages - Agent
const AgentDashboard = lazy(() => import("./pages/agent-dashboard"));
const AgentAccount = lazy(() => import("./pages/agent-account"));
const AgentReferral = lazy(() => import("./pages/agent-referral"));
const AgentHandoff = lazy(() => import("./pages/agent-handoff"));
const HandoffClaim = lazy(() => import("./pages/handoff-claim"));

// Lazy-loaded pages - Admin
const AdminDashboard = lazy(() => import("./pages/admin"));
const AdminSupport = lazy(() => import("./pages/admin-support"));
const AdminFlaggedReviews = lazy(() => import("./pages/admin-flagged-reviews"));
const DeveloperConsole = lazy(() => import("./pages/developer-console"));

// Lazy-loaded pages - Support
const Support = lazy(() => import("./pages/support"));
const SupportTicketDetail = lazy(() => import("./pages/support-ticket-detail"));
const Contact = lazy(() => import("./pages/contact"));
const FAQ = lazy(() => import("./pages/faq"));
const TermsOfService = lazy(() => import("./pages/terms-of-service"));
const PrivacyPolicy = lazy(() => import("./pages/privacy-policy"));
const LegalDisclaimer = lazy(() => import("./pages/legal-disclaimer"));
const HwsModalPage = lazy(() => import("./pages/hws-modal"));

// Lazy-loaded pages - Auth
const Landing = lazy(() => import("./pages/landing"));
const ComingSoon = lazy(() => import("./pages/coming-soon"));
const SignIn = lazy(() => import("./pages/signin"));
const SignInHomeowner = lazy(() => import("./pages/signin-homeowner"));
const SignInContractor = lazy(() => import("./pages/signin-contractor"));
const SignInAgent = lazy(() => import("./pages/signin-agent"));
const Invite = lazy(() => import("./pages/invite"));

// Lazy-loaded pages - Payment (public)
const PayInvoice = lazy(() => import("./pages/pay-invoice").then(m => ({ default: m.default })));
const PaymentSuccess = lazy(() => import("./pages/pay-invoice").then(m => ({ default: m.PaymentSuccessPage })));
const PaymentCancelled = lazy(() => import("./pages/pay-invoice").then(m => ({ default: m.PaymentCancelledPage })));
const SubscriptionSuccess = lazy(() => import("./pages/subscription-success"));

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Detect if running as installed PWA / from App Store (standalone mode)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  // Set data-role attribute and theme class on body for role-based theming
  useEffect(() => {
    const typedUser = user as { role?: string } | undefined;
    const role = typedUser?.role || 'homeowner';
    document.body.setAttribute('data-role', role);
    document.body.classList.remove('theme-homeowner', 'theme-contractor', 'theme-agent');
    document.body.classList.add(`theme-${role}`);
    
    return () => {
      document.body.removeAttribute('data-role');
      document.body.classList.remove('theme-homeowner', 'theme-contractor', 'theme-agent');
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
        <ScrollToTop />
        <Switch>
          <Route path="/invite/:code" component={Invite} />
          <Route path="/homeowner">{() => { window.location.replace('/homeowner.html'); return null; }}</Route>
          <Route path="/contractor">{() => { window.location.replace('/contractor.html'); return null; }}</Route>
          <Route path="/agent">{() => { window.location.replace('/agent.html'); return null; }}</Route>
          <Route path="/agent-onboarding">{() => { window.location.replace('/agent-onboarding.html'); return null; }}</Route>
          <Route path="/welcome">{() => { window.location.replace('/onboarding'); return null; }}</Route>
          <Route path="/onboarding">{() => { window.location.replace('/onboarding.html'); return null; }}</Route>
          <Route path="/signin/homeowner" component={SignInHomeowner} />
          <Route path="/signin/contractor" component={SignInContractor} />
          <Route path="/signin/agent" component={SignInAgent} />
          <Route path="/signin" component={SignIn} />
          <Route path="/test-upload" component={TestUpload} />
          <Route path="/complete-profile" component={CompleteProfile} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/legal-disclaimer" component={LegalDisclaimer} />
          <Route path="/support/:id" component={SupportTicketDetail} />
          <Route path="/support" component={Support} />
          <Route path="/hws-modal" component={HwsModalPage} />
          <Route path="/contact" component={Contact} />
          <Route path="/faq" component={FAQ} />
          <Route path="/pay/invoice/:invoiceId" component={PayInvoice} />
          <Route path="/pay/success" component={PaymentSuccess} />
          <Route path="/pay/cancelled" component={PaymentCancelled} />
          <Route path="/handoff/:token" component={HandoffClaim} />
          <Route path="/coming-soon" component={ComingSoon} />
          <Route path="/" component={isStandalone ? SignIn : Landing} />
          <Route component={isStandalone ? SignIn : Landing} />
        </Switch>
      </UnauthenticatedLayout>
    );
  }

  // Authenticated user routes
  const typedUser = user as { role?: string; email?: string; isAdmin?: boolean } | undefined;
  
  // Use server-provided isAdmin flag (more reliable than build-time env vars)
  const isAdmin = typedUser?.isAdmin === true;
  
  return (
    <AuthenticatedLayout>
      <ScrollToTop />
      <GuidedTour />
      <ContractorGuidedTour />
      <AgentGuidedTour />
      <Switch>
        {/* Home route */}
        <Route path="/" component={Home} />
        <Route path="/homeowner" component={Home} />
        <Route path="/dashboard" component={Home} />
        
        {/* Shared routes - all authenticated users */}
        <Route path="/test-upload" component={TestUpload} />
        <Route path="/complete-profile" component={CompleteProfile} />
        <Route path="/house-transfer/:token" component={HouseTransferAccept} />
        <Route path="/handoff/:token" component={HandoffClaim} />
        <Route path="/messages" component={Messages} />
        <Route path="/my-home" component={MyHome} />
        <Route path="/maintenance" component={Maintenance} />
        <Route path="/household-profile/:id" component={HouseholdProfile} />
        <Route path="/support/:id" component={SupportTicketDetail} />
        <Route path="/support" component={Support} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/legal-disclaimer" component={LegalDisclaimer} />
        <Route path="/signin" component={SignIn} />
        <Route path="/pay/invoice/:invoiceId" component={PayInvoice} />
        <Route path="/pay/success" component={PaymentSuccess} />
        <Route path="/pay/cancelled" component={PaymentCancelled} />
        <Route path="/subscription-success" component={SubscriptionSuccess} />
        
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
            <Route path="/documents" component={Documents} />
            <Route path="/disclosures">{() => { window.location.replace("/documents"); return null; }}</Route>
            <Route path="/resale-report/:houseId" component={ResaleReport} />
          </>
        )}
        
        {/* Contractor-specific routes */}
        {typedUser?.role === 'contractor' && (
          <>
            <Route path="/contractor-dashboard" component={ContractorDashboard} />
            <Route path="/contractor-onboarding" component={ContractorOnboarding} />
            <Route path="/contractor/upgrade" component={ContractorUpgrade} />
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
            <Route path="/agent-handoff" component={AgentHandoff} />
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
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <PWAInstallPrompt />
        <WouterRouter base={base}>
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
