import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Home from "./pages/home";
import Contractors from "./pages/contractors";
import Products from "./pages/products";
import ContractorProfile from "./pages/contractor-profile";
import ContractorDetail from "./pages/contractor-detail";
import Maintenance from "./pages/maintenance";
import ContractorDashboard from "./pages/contractor-dashboard";
import ServiceRecords from "./pages/service-records";
import CustomerServiceRecords from "./pages/customer-service-records";
import HomeownerServiceRecords from "./pages/homeowner-service-records";
import SignIn from "./pages/signin";
import HomeownerAccount from "./pages/homeowner-account";
import Messages from "./pages/messages";
import MyHome from "./pages/my-home";
import HouseTransferAccept from "./pages/house-transfer-accept";
import Achievements from "./pages/achievements";
import AdminDashboard from "./pages/admin";
import CompleteProfile from "./pages/complete-profile";
import ManageTeam from "./pages/manage-team";
import TestUpload from "./pages/test-upload";
import AIContractorHelp from "./pages/ai-contractor-help";
import Billing from "./pages/billing";
import Landing from "./pages/landing";
import NotFound from "@/pages/not-found";

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary mb-2">Home Base</div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Show landing page and auth pages if not authenticated
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/signin" component={SignIn} />
        <Route path="/test-upload" component={TestUpload} />
        <Route path="/complete-profile" component={CompleteProfile} />
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Authenticated user routes
  const typedUser = user as { role?: string; email?: string } | undefined;
  
  // Check if user is admin (based on ADMIN_EMAILS environment variable)
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean);
  const isAdmin = typedUser?.email && adminEmails.includes(typedUser.email);
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Test upload - always available */}
      <Route path="/test-upload" component={TestUpload} />
      
      {/* Complete profile route - accessible to authenticated users */}
      <Route path="/complete-profile" component={CompleteProfile} />
      
      {/* Public routes */}
      <Route path="/house-transfer/:token" component={HouseTransferAccept} />
      
      {/* Admin route */}
      {isAdmin && <Route path="/admin" component={AdminDashboard} />}
      
      {/* Always available routes */}
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/messages" component={Messages} />
      <Route path="/my-home" component={MyHome} />
      <Route path="/signin" component={SignIn} />
      
      {/* Homeowner-specific routes */}
      {typedUser?.role === 'homeowner' && (
        <>
          <Route path="/contractors" component={Contractors} />
          <Route path="/find-contractors" component={Contractors} />
          <Route path="/products" component={Products} />
          <Route path="/contractor/:id" component={ContractorDetail} />
          <Route path="/service-records" component={HomeownerServiceRecords} />
          <Route path="/account" component={HomeownerAccount} />
          <Route path="/achievements" component={Achievements} />
          <Route path="/ai-help" component={AIContractorHelp} />
          <Route path="/billing" component={Billing} />
        </>
      )}
      
      {/* Contractor-specific routes */}
      {typedUser?.role === 'contractor' && (
        <>
          <Route path="/contractor-dashboard" component={ContractorDashboard} />
          <Route path="/contractor-profile" component={ContractorProfile} />
          <Route path="/service-records" component={ServiceRecords} />
          <Route path="/manage-team" component={ManageTeam} />
        </>
      )}
      
      {/* 404 fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
