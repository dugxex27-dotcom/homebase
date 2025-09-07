import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Building } from "lucide-react";
import Logo from "@/components/logo";

export default function DemoContractorSignIn() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoSignIn = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/contractor-demo-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'demo.contractor@example.com',
          name: 'Demo Contractor',
          company: 'Demo Construction LLC',
          role: 'contractor'
        }),
      });

      if (response.ok) {
        // Redirect to homepage to trigger re-authentication check
        window.location.href = '/';
      } else {
        throw new Error('Failed to sign in');
      }
    } catch (error) {
      console.error('Error during sign-in:', error);
      alert('Sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1560a2' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8" style={{ background: '#1560a2' }}>
          <Logo className="h-12 w-auto text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contractor Demo</h1>
          <p className="text-gray-600 text-lg">
            One-click contractor access for testing
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-gray-900 flex items-center justify-center gap-2">
              <Wrench className="w-6 h-6 text-amber-600" />
              Quick Demo Access
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Instantly access the contractor dashboard with demo data
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900 mb-1">Demo Contractor Profile</h4>
                  <p className="text-sm text-amber-700">
                    <strong>Name:</strong> Demo Contractor<br />
                    <strong>Company:</strong> Demo Construction LLC<br />
                    <strong>Email:</strong> demo.contractor@example.com
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleDemoSignIn}
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
                  Access Contractor Dashboard
                </>
              )}
            </Button>

            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">
                Demo mode creates a temporary contractor session
              </p>
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900 text-sm"
                onClick={() => window.location.href = '/'}
              >
                Back to main page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}