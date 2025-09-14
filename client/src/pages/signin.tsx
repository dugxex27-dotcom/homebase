import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Wrench, ArrowRight } from "lucide-react";
import logoImage from '@assets/homebase-logo_1756861910640.png';

export default function SignIn() {
  const [selectedRole, setSelectedRole] = useState<'homeowner' | 'contractor' | null>(null);

  const handleRoleSelect = (role: 'homeowner' | 'contractor') => {
    setSelectedRole(role);
  };

  const handleSignIn = async () => {
    if (!selectedRole) return;
    
    if (selectedRole === 'contractor') {
      // Redirect to safe contractor signin
      window.location.href = '/contractor-signin';
      return;
    }
    
    try {
      // For homeowners, create a demo session
      const response = await fetch('/api/auth/homeowner-demo-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          role: selectedRole,
          email: 'demo@homeowner.com',
          name: 'Demo Homeowner'
        }),
      });
      
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to sign in:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={logoImage} 
            alt="Home Base" 
            className="h-24 w-auto mx-auto mb-4"
          />
          <p className="text-lg" style={{ color: '#ffffff' }}>
            Your trusted home services marketplace
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-foreground">
              Sign In to Your Account
            </CardTitle>
            <p className="text-muted-foreground">
              Choose your account type to continue
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-3">
              <Button
                variant={selectedRole === 'homeowner' ? 'default' : 'outline'}
                className={`w-full h-auto p-6 flex items-center justify-start space-x-4 text-left transition-all ${
                  selectedRole === 'homeowner' 
                    ? 'text-white ring-2 ring-primary/20' 
                    : 'hover:bg-primary/5 hover:border-primary/20'
                }`}
                style={{ 
                  background: selectedRole === 'homeowner' ? '#3c258e' : '#2c0f5b'
                }}
                onClick={() => handleRoleSelect('homeowner')}
              >
                <div className={`p-3 rounded-full ${
                  selectedRole === 'homeowner' ? 'bg-white/20' : ''
                }`}
                style={{
                  backgroundColor: selectedRole === 'homeowner' ? undefined : '#3c258e'
                }}>
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-center text-[20px]" style={{ color: '#ffffff' }}>I'm a Homeowner</div>
                  <div className="text-sm text-center leading-tight" style={{ color: '#ffffff' }}>
                    Find contractors<br />
                    and manage home maintenance
                  </div>
                </div>
                {selectedRole === 'homeowner' && (
                  <ArrowRight className="w-5 h-5 text-white" />
                )}
              </Button>

              <Button
                variant={selectedRole === 'contractor' ? 'default' : 'outline'}
                className={`w-full h-auto p-6 flex items-center justify-start space-x-4 text-left transition-all ${
                  selectedRole === 'contractor' 
                    ? 'text-white ring-2 ring-primary/20' 
                    : 'hover:bg-primary/5 hover:border-primary/20'
                }`}
                style={{ 
                  background: selectedRole === 'contractor' ? '#518ebc' : '#1560a2'
                }}
                onClick={() => handleRoleSelect('contractor')}
              >
                <div className={`p-3 rounded-full ${
                  selectedRole === 'contractor' ? 'bg-white/20' : ''
                }`}
                style={{
                  backgroundColor: selectedRole === 'contractor' ? undefined : '#3798ef'
                }}>
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-center text-[20pt]" style={{ color: '#ffffff' }}>I'm a Contractor</div>
                  <div className="text-sm text-center leading-tight" style={{ color: '#ffffff' }}>
                    Connect with clients, manage appointments,<br />
                    and grow your business
                  </div>
                </div>
                {selectedRole === 'contractor' && (
                  <ArrowRight className="w-5 h-5 text-white" />
                )}
              </Button>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleSignIn}
              disabled={!selectedRole}
              className="w-full mt-6 py-3 text-lg font-semibold"
              style={{ 
                background: selectedRole === 'contractor' ? '#518ebc' : '#3c258e'
              }}
              size="lg"
            >
              {selectedRole === 'contractor' ? 'Access Contractor Demo' : 'Continue as Homeowner'}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-4">
              Demo authentication for testing purposes
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}