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
import Maintenance from "./pages/maintenance";
import ContractorDashboard from "./pages/contractor-dashboard";
import SignIn from "./pages/signin";
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
    return <SignIn />;
  }

  // Authenticated user routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Homeowner routes */}
      {user?.role === 'homeowner' && (
        <>
          <Route path="/contractors" component={Contractors} />
          <Route path="/products" component={Products} />
          <Route path="/maintenance" component={Maintenance} />
          <Route path="/contractor/:id" component={ContractorProfile} />
        </>
      )}
      {/* Contractor routes */}
      {user?.role === 'contractor' && (
        <>
          <Route path="/dashboard" component={ContractorDashboard} />
        </>
      )}
      <Route path="/signin" component={SignIn} />
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
