import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Building, Mail, User } from "lucide-react";
import Logo from "@/components/logo";

export default function SimpleContractorSignIn() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    company: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // For now, create a simple contractor session without OAuth
      const response = await fetch('/api/auth/contractor-demo-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          role: 'contractor'
        }),
      });

      if (response.ok) {
        // Redirect to contractor dashboard
        window.location.href = '/dashboard';
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="h-12 w-auto text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contractor Portal</h1>
          <p className="text-gray-600 text-lg">
            Quick access for contractors (Demo Mode)
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-gray-900 flex items-center justify-center gap-2">
              <Wrench className="w-6 h-6 text-amber-600" />
              Contractor Demo Sign In
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Enter your details to access the contractor dashboard
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="contractor@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="John Smith"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="Smith Construction LLC"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-lg font-medium mt-6"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <>
                    <Wrench className="w-5 h-5 mr-2" />
                    Sign In to Dashboard
                  </>
                )}
              </Button>
            </form>

            <div className="text-center mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">
                Demo Mode: This creates a temporary contractor session for testing
              </p>
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900 text-sm"
                onClick={() => window.location.href = '/signin'}
              >
                Back to main sign-in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}