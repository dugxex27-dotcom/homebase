import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Wrench, Building2 } from "lucide-react";
import Logo from "@/components/logo";

export default function Landing() {
  const handleRoleSelection = (role: 'homeowner' | 'contractor' | 'agent') => {
    window.location.href = `/signin?role=${role}`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #f8f4fc, #faf9fb)' }}>
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Logo className="h-16 w-auto mx-auto mb-6" style={{ color: '#2c0f5b' }} />
          <h1 className="text-5xl font-bold mb-4" style={{ color: '#2c0f5b' }}>
            Welcome to Home Base
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your comprehensive home maintenance platform connecting homeowners with trusted contractors
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Homeowner Card */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-purple-400"
            onClick={() => handleRoleSelection('homeowner')}
            data-testid="card-role-homeowner"
          >
            <CardContent className="p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-full bg-purple-100">
                  <Home className="h-12 w-12 text-purple-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#2c0f5b' }}>
                I'm a Homeowner
              </h2>
              <p className="text-gray-600 mb-6">
                Manage maintenance schedules, track service records, and connect with trusted contractors for your property
              </p>
              <ul className="text-left space-y-2 mb-6 text-sm text-gray-700">
                <li>✓ Multi-property management</li>
                <li>✓ Maintenance scheduling</li>
                <li>✓ Contractor directory</li>
                <li>✓ Service record tracking</li>
              </ul>
              <Button 
                className="w-full"
                style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                data-testid="button-homeowner-signup"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>

          {/* Contractor Card */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-red-400"
            onClick={() => handleRoleSelection('contractor')}
            data-testid="card-role-contractor"
          >
            <CardContent className="p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-full bg-red-100">
                  <Wrench className="h-12 w-12 text-red-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#b91c1c' }}>
                I'm a Contractor
              </h2>
              <p className="text-gray-600 mb-6">
                Grow your business, manage client relationships, and showcase your services to homeowners
              </p>
              <ul className="text-left space-y-2 mb-6 text-sm text-gray-700">
                <li>✓ Professional profile</li>
                <li>✓ Client management</li>
                <li>✓ Proposal tools</li>
                <li>✓ Service tracking</li>
              </ul>
              <Button 
                className="w-full"
                style={{ backgroundColor: '#b91c1c', color: 'white' }}
                data-testid="button-contractor-signup"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>

          {/* Real Estate Agent Card */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-400"
            onClick={() => handleRoleSelection('agent')}
            data-testid="card-role-agent"
          >
            <CardContent className="p-8 text-center">
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-full bg-blue-100">
                  <Building2 className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#1560a2' }}>
                I'm a Real Estate Agent
              </h2>
              <p className="text-gray-600 mb-6">
                Earn commissions by referring homeowners and contractors to Home Base
              </p>
              <ul className="text-left space-y-2 mb-6 text-sm text-gray-700">
                <li>✓ Earn $10 per referral</li>
                <li>✓ Track your referrals</li>
                <li>✓ Automated payouts</li>
                <li>✓ Unique referral link</li>
              </ul>
              <Button 
                className="w-full"
                style={{ backgroundColor: '#1560a2', color: 'white' }}
                data-testid="button-agent-signup"
              >
                Become an Affiliate
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a href="/signin" className="font-medium hover:underline" style={{ color: '#2c0f5b' }}>
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
