import { Switch, Route } from "wouter";
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
import ContractorSignIn from "./pages/contractor-signin";
import SimpleContractorSignIn from "./pages/simple-contractor-signin";
import DemoContractorSignIn from "./pages/demo-contractor-signin";
import HomeownerAccount from "./pages/homeowner-account";
import Messages from "./pages/messages";
import MyHome from "./pages/my-home";
import HouseTransferAccept from "./pages/house-transfer-accept";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

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

  // Show sign-in page if not authenticated
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/contractor-signin" component={DemoContractorSignIn} />
        <Route component={SignIn} />
      </Switch>
    );
  }

  // Authenticated user routes
  const typedUser = user as { role?: string } | undefined;
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Public routes */}
      <Route path="/house-transfer/:token" component={HouseTransferAccept} />
      
      {/* Always available routes */}
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/messages" component={Messages} />
      <Route path="/my-home" component={MyHome} />
      <Route path="/signin" component={SignIn} />
      <Route path="/contractor-signin" component={ContractorSignIn} />
      
      {/* Homeowner-specific routes */}
      {typedUser?.role === 'homeowner' && (
        <>
          <Route path="/contractors" component={Contractors} />
          <Route path="/products" component={Products} />
          <Route path="/contractor/:id" component={ContractorDetail} />
          <Route path="/service-records" component={HomeownerServiceRecords} />
          <Route path="/account" component={HomeownerAccount} />
        </>
      )}
      
      {/* Contractor-specific routes */}
      {typedUser?.role === 'contractor' && (
        <>
          <Route path="/contractor-dashboard" component={ContractorDashboard} />
          <Route path="/contractor-profile" component={ContractorProfile} />
          <Route path="/service-records" component={ServiceRecords} />
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
