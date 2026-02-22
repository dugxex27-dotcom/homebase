import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Wrench, Building2 } from "lucide-react";
import heroImageDesktop from "@assets/homebase-hp-hero-desktop-nocopy_1765926450284.png";
import heroImageTablet from "@assets/homebase-hp-hero-tablet_1765940455985.png";
import heroImageMobile from "@assets/homebase-hp-hero-mobile_1765940883354.png";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EditableText, useSiteContent } from "@/components/editable-text";

export default function Landing() {
  const { toast } = useToast();
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleRoleSelection = (role: 'homeowner' | 'contractor' | 'agent') => {
    window.location.href = `/signin/${role}`;
  };

  const handleDemoLogin = async (role: 'homeowner' | 'contractor' | 'agent') => {
    setDemoLoading(role);
    try {
      const endpoint = role === 'homeowner' 
        ? '/api/auth/homeowner-demo-login'
        : role === 'contractor'
        ? '/api/auth/contractor-demo-login'
        : '/api/auth/agent-demo-login';
      
      await apiRequest(endpoint, 'POST', {});
      
      toast({
        title: "Demo login successful",
        description: `Welcome to the ${role} demo!`,
      });
      
      const redirectPath = role === 'homeowner' 
        ? '/'
        : role === 'contractor'
        ? '/contractor-dashboard'
        : '/agent-dashboard';
      window.location.href = redirectPath;
    } catch (error: any) {
      toast({
        title: "Demo login failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
      setDemoLoading(null);
    }
  };

  return (
    <div style={{ background: 'linear-gradient(to bottom, #f8f4fc, #faf9fb)' }}>
      {/* Hero Section - Desktop (1024px+) */}
      <div className="w-full relative hidden lg:block overflow-hidden" style={{ maxHeight: '370px' }}>
        <img 
          src={heroImageDesktop} 
          alt="MyHomeBase - Your digital home fingerprint" 
          className="w-full h-auto"
          data-testid="img-landing-hero-desktop"
        />
        {/* Text Overlay - Left aligned */}
        <div 
          className="absolute inset-0 flex flex-col justify-center"
          style={{ paddingLeft: '5%', paddingRight: '50%' }}
        >
          <EditableText
            contentKey="hero_headline"
            defaultValue="Your Home's Digital Record Starts Here"
            as="h1"
            className="mb-4"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: '32px',
              lineHeight: 1.2,
              color: '#ffffff',
              maxWidth: '420px'
            }}
            data-testid="text-hero-headline"
            renderContent={(text) => {
              const parts = text.split("Digital Record");
              if (parts.length === 2) {
                return <>{parts[0]}<span style={{ color: '#BAACEB' }}>Digital Record</span>{parts[1]}</>;
              }
              return text;
            }}
          />
          <EditableText
            contentKey="hero_subcopy_1"
            defaultValue="MyHomeBase keep your home history, contractors, realtor paperwork, and house maintenance list in a single dashboard."
            as="h2"
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
          />
          <a 
            href="#role-cards"
            className="mt-6 px-5 py-3 rounded-lg font-bold text-base transition-all hover:shadow-lg"
            style={{ 
              backgroundColor: '#ffffff',
              color: '#2c0f5b',
              fontFamily: "'Quicksand', sans-serif",
              width: 'fit-content'
            }}
            data-testid="button-choose-role-desktop"
          >
            Get Started
          </a>
        </div>
      </div>
      {/* Hero Section - Tablet (640px - 1023px) */}
      <div className="w-full relative hidden sm:block lg:hidden overflow-hidden" style={{ maxHeight: '300px' }}>
        <img 
          src={heroImageTablet} 
          alt="MyHomeBase - Your digital home fingerprint" 
          className="w-full h-auto"
          data-testid="img-landing-hero-tablet"
        />
        {/* Text Overlay - Left aligned */}
        <div 
          className="absolute inset-0 flex flex-col justify-center"
          style={{ paddingLeft: '5%', paddingRight: '45%' }}
        >
          <EditableText
            contentKey="hero_headline"
            defaultValue="Your Home's Digital Record Starts Here"
            as="h1"
            className="mb-3"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: '24px',
              lineHeight: 1.2,
              color: '#ffffff'
            }}
            renderContent={(text) => {
              const parts = text.split("Digital Record");
              if (parts.length === 2) {
                return <>{parts[0]}<span style={{ color: '#BAACEB' }}>Digital Record</span>{parts[1]}</>;
              }
              return text;
            }}
          />
          <EditableText
            contentKey="hero_subcopy_1"
            defaultValue="MyHomeBase keep your home history, contractors, realtor paperwork, and house maintenance list in a single dashboard."
            as="h2"
            className="mb-2"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#ffffff'
            }}
          />
          <a 
            href="#role-cards"
            className="mt-4 px-4 py-2 rounded-lg font-bold text-sm transition-all hover:shadow-lg"
            style={{ 
              backgroundColor: '#ffffff',
              color: '#2c0f5b',
              fontFamily: "'Quicksand', sans-serif",
              width: 'fit-content'
            }}
            data-testid="button-choose-role-tablet"
          >
            Get Started
          </a>
        </div>
      </div>
      {/* Hero Section - Mobile (<640px) - Image on top, purple text section below */}
      <div className="w-full sm:hidden">
        <img 
          src={heroImageMobile} 
          alt="MyHomeBase - Your digital home fingerprint" 
          className="w-full h-auto"
          data-testid="img-landing-hero-mobile"
        />
        {/* Purple Text Section Below Image */}
        <div 
          className="px-6 py-8 text-center"
          style={{ backgroundColor: '#2c0f5b' }}
        >
          <EditableText
            contentKey="hero_headline"
            defaultValue="Your Home's Digital Record Starts Here"
            as="h1"
            className="mb-4"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: '24px',
              lineHeight: 1.2,
              color: '#ffffff'
            }}
            renderContent={(text) => {
              const parts = text.split("Digital Record");
              if (parts.length === 2) {
                return <>{parts[0]}<span style={{ color: '#BAACEB' }}>Digital Record</span>{parts[1]}</>;
              }
              return text;
            }}
          />
          <EditableText
            contentKey="hero_subcopy_1"
            defaultValue="MyHomeBase keep your home history, contractors, realtor paperwork, and house maintenance list in a single dashboard."
            as="h2"
            className="mb-3"
            style={{ 
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 500,
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#ffffff'
            }}
          />
          <a 
            href="#role-cards"
            className="inline-block mt-6 px-5 py-3 rounded-lg font-bold text-sm transition-all hover:shadow-lg"
            style={{ 
              backgroundColor: '#ffffff',
              color: '#2c0f5b',
              fontFamily: "'Quicksand', sans-serif"
            }}
            data-testid="button-choose-role-mobile"
          >
            Get Started
          </a>
        </div>
      </div>
      {/* Role Selection Cards */}
      <div id="role-cards" className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h3
            className="font-bold mb-3 text-[24px]"
            style={{ color: '#2c0f5b' }}
          >
            <p className="mb-2">We're built for homeowners first and driven by a single question:</p>
            <p>What if your home history was stored like your car history? Now, it is.</p>
          </h3>
        </div>

        {/* Welcome Banner */}
        <div className="w-full py-4 mb-8 rounded-lg" style={{ backgroundColor: '#2c0f5b' }}>
          <a href="#card-homeowner" className="block text-center text-white font-bold text-xl no-underline hover:underline" style={{ fontFamily: "'Quicksand', sans-serif" }}>
            Try a Demo of MyHomeBase
          </a>
        </div>

        <div className="flex flex-col gap-8 w-full">
          {/* Homeowner Card */}
          <Card 
            id="card-homeowner"
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
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#2c0f5b' }}>
                  I'm a Homeowner
                </h3>
                <EditableText
                  contentKey="homeowner_card_description"
                  defaultValue={'"The Carfax-style home history your house has always needed."'}
                  as="p"
                  className="text-gray-600 mb-6"
                />
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
              <Button 
                variant="outline"
                className="w-full mt-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={(e) => { e.stopPropagation(); handleDemoLogin('homeowner'); }}
                disabled={demoLoading === 'homeowner'}
                data-testid="button-homeowner-demo"
              >
                {demoLoading === 'homeowner' ? 'Loading...' : 'Try Demo'}
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
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#1560a2' }}>
                  I'm a Contractor
                </h3>
                <EditableText
                  contentKey="contractor_card_description"
                  defaultValue="Grow your business, manage client relationships, and showcase your services to homeowners"
                  as="p"
                  className="text-gray-600 mb-6"
                />
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
              <Button 
                variant="outline"
                className="w-full mt-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={(e) => { e.stopPropagation(); handleDemoLogin('contractor'); }}
                disabled={demoLoading === 'contractor'}
                data-testid="button-contractor-demo"
              >
                {demoLoading === 'contractor' ? 'Loading...' : 'Try Demo'}
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
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#059669' }}>
                  I'm a Real Estate Agent
                </h3>
                <EditableText
                  contentKey="agent_card_description"
                  defaultValue="Earn commissions by referring homeowners and contractors to MyHomeBase"
                  as="p"
                  className="text-gray-600 mb-6"
                />
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
              <Button 
                variant="outline"
                className="w-full mt-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={(e) => { e.stopPropagation(); handleDemoLogin('agent'); }}
                disabled={demoLoading === 'agent'}
                data-testid="button-agent-demo"
              >
                {demoLoading === 'agent' ? 'Loading...' : 'Try Demo'}
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
