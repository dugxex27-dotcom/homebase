import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/home";
import Contractors from "./pages/contractors";
import Products from "./pages/products";
import ContractorProfile from "./pages/contractor-profile";
import Maintenance from "./pages/maintenance";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/contractors" component={Contractors} />
      <Route path="/products" component={Products} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/contractor/:id" component={ContractorProfile} />
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
