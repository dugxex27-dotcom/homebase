import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Building, Star, Users } from "lucide-react";
import Logo from "@/components/logo";

export default function ContractorSignIn() {
  const [isLoading, setIsLoading] = useState(false);

  const handleContractorSignIn = async () => {
    setIsLoading(true);
    
    try {
      // Set the role as contractor
      const response = await fetch('/api/auth/select-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'contractor' }),
      });
      
      if (response.ok) {
        // Small delay to ensure role is set, then redirect
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 100);
      } else {
        throw new Error('Failed to set contractor role');
      }
    } catch (error) {
      console.error('Error during contractor sign-in:', error);
      setIsLoading(false);
      // Show user-friendly error
      alert('There was an issue with sign-in. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Logo className="h-12 w-auto text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contractor Portal</h1>
          <p className="text-gray-600 text-lg">
            Join Home Base and connect with homeowners in your area
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-gray-900 flex items-center justify-center gap-2">
              <Wrench className="w-6 h-6 text-amber-600" />
              Contractor Sign In
            </CardTitle>
            <p className="text-gray-600">
              Access your professional dashboard and manage client appointments
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Benefits for Contractors */}
            <div className="space-y-4 bg-amber-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">What you get as a contractor:</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-gray-700">Connect with verified homeowners</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-gray-700">Manage appointments and projects</span>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-gray-700">Build your reputation with reviews</span>
                </div>
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-gray-700">Showcase your specialized services</span>
                </div>
              </div>
            </div>

            {/* Sign In Button */}
            <Button 
              onClick={handleContractorSignIn}
              disabled={isLoading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-lg font-medium"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <>
                  <Wrench className="w-5 h-5 mr-2" />
                  Sign In as Contractor
                </>
              )}
            </Button>

            {/* Additional Information */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">
                New to Home Base?
              </p>
              <p className="text-xs text-gray-500">
                Signing in will create your contractor profile automatically. You can complete your business details and service offerings after authentication.
              </p>
            </div>

            {/* Switch to Homeowner */}
            <div className="text-center">
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900"
                onClick={() => window.location.href = '/signin'}
              >
                Looking for contractors instead? Sign in as a homeowner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-2">Trusted by contractors across the region</p>
          <div className="flex justify-center items-center gap-6 text-xs text-gray-400">
            <span>✓ Verified homeowners</span>
            <span>✓ Secure payments</span>
            <span>✓ Professional network</span>
          </div>
        </div>
      </div>
    </div>
  );
}