import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, Wrench, PartyPopper, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet";

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const [syncing, setSyncing] = useState(true);
  const queryClient = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role') || 'homeowner';
  
  const dashboardPath = role === 'contractor' ? '/contractor-dashboard' : '/maintenance';

  useEffect(() => {
    const syncSubscription = async () => {
      try {
        await apiRequest('/api/sync-subscription', 'POST');
      } catch (error) {
        console.error('Failed to sync subscription:', error);
      } finally {
        setSyncing(false);
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/my-subscription'] });
        queryClient.invalidateQueries({ queryKey: ['/api/contractor/subscription'] });
      }
    };
    syncSubscription();
  }, [queryClient]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation(dashboardPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation, dashboardPath]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#eeedf9' }}>
      <Helmet>
        <title>Welcome to MyHomeBase! | Subscription Confirmed</title>
      </Helmet>
      
      <Card className="max-w-md mx-4 shadow-lg border-2 border-green-200">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="p-4 rounded-full bg-green-100">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <div className="absolute -top-2 -right-2 p-2 rounded-full bg-purple-100">
                <PartyPopper className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-3" style={{ color: '#2c0f5b' }}>
            Welcome to MyHomeBase!
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">
            Your subscription is now active. Thank you for choosing MyHomeBase!
          </p>
          
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              {role === 'contractor' ? (
                <Wrench className="h-5 w-5 text-purple-600" />
              ) : (
                <Home className="h-5 w-5 text-purple-600" />
              )}
              <span className="font-semibold" style={{ color: '#2c0f5b' }}>
                {role === 'contractor' ? 'Contractor Account' : 'Homeowner Account'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              You now have full access to all {role === 'contractor' ? 'contractor' : 'homeowner'} features.
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Redirecting to your dashboard in {countdown} seconds...
          </p>
          
          <Button 
            onClick={() => setLocation(dashboardPath)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
          >
            Go to Dashboard Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
