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
import MaintenanceSimple from "./pages/maintenance-simple";
import ContractorDashboard from "./pages/contractor-dashboard";
import ServiceRecords from "./pages/service-records";
import CustomerServiceRecords from "./pages/customer-service-records";
import HomeownerServiceRecords from "./pages/homeowner-service-records";
import SignIn from "./pages/signin";
import ContractorSignIn from "./pages/contractor-signin";
import SimpleContractorSignIn from "./pages/simple-contractor-signin";
import DemoContractorSignIn from "./pages/demo-contractor-signin";
import TestSimple from "./pages/test-simple";
import HomeownerAccount from "./pages/homeowner-account";
import Messages from "./pages/messages";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/test" component={TestSimple} />
      <Route component={TestSimple} />
    </Switch>
  );
}

function App() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">Home Base</h1>
      <p className="text-lg text-gray-600">App is running successfully!</p>
      <div className="mt-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Test Button
        </button>
      </div>
    </div>
  );
}

export default App;
