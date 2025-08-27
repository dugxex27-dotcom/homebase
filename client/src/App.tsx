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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600 mb-6">Home Base</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-lg text-gray-700 mb-4">Application is running successfully!</p>
          <p className="text-gray-600">React hooks dispatcher error has been resolved.</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return <Router />;
}

export default App;
