import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Wrench, Building2 } from "lucide-react";
import heroImageDesktop from "@assets/homebase-hp-hero-desktop-nocopy_1765926450284.png";
import heroImageTablet from "@assets/homebase-hp-hero-tablet_1765940455985.png";
import heroImageMobile from "@assets/homebase-hp-hero-mobile_1765940883354.png";

export default function Landing() {
  const handleRoleSelection = (role: 'homeowner' | 'contractor' | 'agent') => {
    window.location.href = `/signin/${role}`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #f8f4fc, #faf9fb)' }}>
      {/* Hero Section - Desktop (1024px+) */}
      <div className="w-full relative hidden lg:block">
        <img 
          src={heroImageDesktop} 
          alt="HomeBase - Your digital home fingerprint" 
          className="w-full h-auto"
          data-testid="img-landing-hero-desktop"
        />
        {/* Text Overlay - Left aligned */}
        <div 
          className="absolute inset-0 flex flex-col justify-center"
          style={{ paddingLeft: '5%', paddingRight: '50%' }}
        >
          <p 
            className="mb-2"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: '14px',
              color: '#ffffff',
              letterSpacing: '0.5px'
            }}
            data-testid="text-hero-eyebrow"
          >
            Welcome to HomeBase
          </p>
          <h1 
            className="mb-4"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: '32px',
              lineHeight: 1.2,
              color: '#ffffff'
            }}
            data-testid="text-hero-headline"
          >
            Your Home's <span style={{ color: '#00D4FF' }}>Digital</span><br />
            Fingerprint Starts Here
          </h1>
          <p 
            className="mb-3"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#ffffff',
              maxWidth: '420px'
            }}
            data-testid="text-hero-subcopy-1"
          >
            A single, living record that keeps a home's systems, maintenance, upgrades, and history organized in one place.
          </p>
          <p 
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#ffffff',
              maxWidth: '420px'
            }}
            data-testid="text-hero-subcopy-2"
          >
            Built for homeowners first — and shared seamlessly with contractors and real estate agents when it matters.
          </p>
        </div>
      </div>
      {/* Hero Section - Tablet (640px - 1023px) */}
      <div className="w-full relative hidden sm:block lg:hidden">
        <img 
          src={heroImageTablet} 
          alt="HomeBase - Your digital home fingerprint" 
          className="w-full h-auto"
          data-testid="img-landing-hero-tablet"
        />
        {/* Text Overlay - Left aligned */}
        <div 
          className="absolute inset-0 flex flex-col justify-center"
          style={{ paddingLeft: '5%', paddingRight: '45%' }}
        >
          <p 
            className="mb-2"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: '12px',
              color: '#ffffff',
              letterSpacing: '0.5px'
            }}
          >
            Welcome to HomeBase
          </p>
          <h1 
            className="mb-3"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: '24px',
              lineHeight: 1.2,
              color: '#c3d7ee'
            }}
          >
            Your Home's <span style={{ color: '#0072ce' }}>Digital</span> Record Starts Here
          </h1>
          <p 
            className="mb-2"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#ffffff',
              maxWidth: '320px'
            }}
          >
            A single, living record that keeps a home's systems, maintenance, upgrades, and history organized in one place.
          </p>
          <p 
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#ffffff',
              maxWidth: '320px'
            }}
          >
            Built for homeowners first — and shared seamlessly with contractors and real estate agents when it matters.
          </p>
        </div>
      </div>
      {/* Hero Section - Mobile (<640px) - Image on top, purple text section below */}
      <div className="w-full sm:hidden">
        <img 
          src={heroImageMobile} 
          alt="HomeBase - Your digital home fingerprint" 
          className="w-full h-auto"
          data-testid="img-landing-hero-mobile"
        />
        {/* Purple Text Section Below Image */}
        <div 
          className="px-6 py-8 text-center"
          style={{ backgroundColor: '#2c0f5b' }}
        >
          <p 
            className="mb-2"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: '12px',
              color: '#ffffff',
              letterSpacing: '0.5px'
            }}
          >
            Welcome to HomeBase
          </p>
          <h1 
            className="mb-4"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: '24px',
              lineHeight: 1.2,
              color: '#ffffff'
            }}
          >
            Your Home's <span style={{ color: '#00D4FF' }}>Digital</span><br />
            Fingerprint Starts Here
          </h1>
          <p 
            className="mb-3"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 500,
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#ffffff'
            }}
          >
            A single, living record that keeps a home's systems, maintenance, upgrades, and history organized in one place.
          </p>
          <p 
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 500,
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#ffffff'
            }}
          >
            Built for homeowners first — and shared seamlessly with contractors and real estate agents when it matters.
          </p>
        </div>
      </div>
      {/* Role Selection Cards */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3" style={{ color: '#2c0f5b' }}>Get Started Today</h2>
          <p className="text-lg text-gray-600">Choose how you'd like to use HomeBase</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Homeowner Card */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-purple-400 flex flex-col"
            onClick={() => handleRoleSelection('homeowner')}
            data-testid="card-role-homeowner"
          >
            <CardContent className="p-8 text-center sm:text-left flex flex-col flex-grow">
              <div className="flex-grow">
                <div className="mb-6 flex justify-center sm:justify-start">
                  <div className="p-4 rounded-full bg-purple-100 inline-flex">
                    <Home className="h-12 w-12 text-purple-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#2c0f5b' }}>
                  I'm a Homeowner
                </h2>
                <p className="text-gray-600 mb-6">"The Carfax-style home history your house has always needed."</p>
                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                  <li>✓ Multi-property management</li>
                  <li>✓ Maintenance scheduling</li>
                  <li>✓ Contractor directory</li>
                  <li>✓ Service record tracking</li>
                </ul>
              </div>
              <Button 
                className="w-full mt-auto"
                style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                data-testid="button-homeowner-signup"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>

          {/* Contractor Card */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-400 flex flex-col"
            onClick={() => handleRoleSelection('contractor')}
            data-testid="card-role-contractor"
          >
            <CardContent className="p-8 text-center sm:text-left flex flex-col flex-grow">
              <div className="flex-grow">
                <div className="mb-6 flex justify-center sm:justify-start">
                  <div className="p-4 rounded-full bg-blue-100 inline-flex">
                    <Wrench className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#1560a2' }}>
                  I'm a Contractor
                </h2>
                <p className="text-gray-600 mb-6">
                  Grow your business, manage client relationships, and showcase your services to homeowners
                </p>
                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                  <li>✓ Professional profile</li>
                  <li>✓ Client management</li>
                  <li>✓ Proposal tools</li>
                  <li>✓ Service tracking</li>
                </ul>
              </div>
              <Button 
                className="w-full mt-auto"
                style={{ backgroundColor: '#1560a2', color: 'white' }}
                data-testid="button-contractor-signup"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>

          {/* Real Estate Agent Card */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-emerald-400 flex flex-col"
            onClick={() => handleRoleSelection('agent')}
            data-testid="card-role-agent"
          >
            <CardContent className="p-8 text-center sm:text-left flex flex-col flex-grow">
              <div className="flex-grow">
                <div className="mb-6 flex justify-center sm:justify-start">
                  <div className="p-4 rounded-full bg-emerald-100 inline-flex">
                    <Building2 className="h-12 w-12 text-emerald-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#059669' }}>
                  I'm a Real Estate Agent
                </h2>
                <p className="text-gray-600 mb-6">
                  Earn commissions by referring homeowners and contractors to HomeBase
                </p>
                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                  <li>✓ Earn referral bonuses</li>
                  <li>✓ Track your referrals</li>
                  <li>✓ Automated payouts</li>
                  <li>✓ Unique referral link</li>
                </ul>
              </div>
              <Button 
                className="w-full mt-auto"
                style={{ backgroundColor: '#059669', color: 'white' }}
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
