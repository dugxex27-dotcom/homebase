import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Home as HomeIcon, 
  Users, 
  Calendar, 
  TrendingUp, 
  Shield, 
  Sparkles,
  CheckCircle 
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { Helmet } from "react-helmet";

export default function Invite() {
  const [, params] = useRoute("/invite/:code");
  const referralCode = params?.code || "";

  useEffect(() => {
    document.body.classList.add('invite-page');
    return () => document.body.classList.remove('invite-page');
  }, []);
  
  const { data: referralInfo, isLoading } = useQuery({
    queryKey: ['/api/referrals', referralCode],
    queryFn: async () => {
      const response = await fetch(`/api/referrals/${referralCode}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Invalid referral code');
        }
        throw new Error('Failed to load referral information');
      }
      return response.json();
    },
    enabled: !!referralCode,
  });

  const firstName = referralInfo?.firstName || 'A friend';
  const hostUrl = window.location.origin;
  const shareUrl = `${hostUrl}/invite/${referralCode}`;
  const shareTitle = `${firstName} invited you to MyHomeBase™!`;
  const shareDescription = "Join MyHomeBase™ to manage your home maintenance, connect with contractors, and save money on DIY projects. Get a 14-day free trial!";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2C0F5B 0%, #3C258E 100%)' }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!referralInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2C0F5B 0%, #3C258E 100%)' }}>
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--purple-deep)' }}>Invalid Invite Link</h2>
            <p className="mb-6 text-gray-600">This referral link is no longer valid.</p>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-[#3C258E] to-[#1560A2] hover:from-[#2C0F5B] hover:to-[#0C3460]">
                Sign Up Anyway
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{shareTitle} | MyHomeBase™</title>
        <meta name="description" content={shareDescription} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:title" content={shareTitle} />
        <meta property="og:description" content={shareDescription} />
        <meta property="og:image" content={`${hostUrl}/og-invite.png`} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={shareUrl} />
        <meta property="twitter:title" content={shareTitle} />
        <meta property="twitter:description" content={shareDescription} />
        <meta property="twitter:image" content={`${hostUrl}/og-invite.png`} />
      </Helmet>

      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #2C0F5B 0%, #3C258E 100%)' }}>
        {/* Header */}
        <header className="py-6 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-white text-2xl font-bold flex items-center gap-2">
              <HomeIcon className="w-8 h-8" />
              MyHomeBase™
            </div>
            <Link href="/signin">
              <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" data-testid="button-signin">
                Sign In
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Hero Card */}
          <Card className="mb-8 bg-white shadow-2xl">
            <CardContent className="p-8 sm:p-12">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#3C258E] to-[#1560A2] mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--purple-deep)' }} data-testid="heading-invite">
                  {firstName} invited you to MyHomeBase™!
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  Join thousands of homeowners who are taking control of their home maintenance
                </p>
                <Badge className="bg-[#F0FAF4] text-[#09694A] text-lg px-4 py-2 font-semibold">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  14-Day Free Trial Included
                </Badge>
              </div>

              <Link href={`/signup?ref=${referralCode}`}>
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-[#3C258E] to-[#1560A2] hover:from-[#2C0F5B] hover:to-[#0C3460] text-white text-xl py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  data-testid="button-signup-referral"
                >
                  Get Started Free
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-white/95 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-[#EEEDFE]">
                    <Calendar className="w-6 h-6 text-[#3C258E]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--purple-deep)' }}>
                      Smart Maintenance Tracking
                    </h3>
                    <p className="text-gray-600">
                      Never forget important home maintenance tasks. Get personalized schedules based on your home and climate.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-[#E6F1FB]">
                    <Users className="w-6 h-6 text-[#1560A2]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--purple-deep)' }}>
                      Trusted Contractor Network
                    </h3>
                    <p className="text-gray-600">
                      Find and connect with verified contractors in your area. Save time and avoid the hassle of endless searching.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-[#F0FAF4]">
                    <TrendingUp className="w-6 h-6 text-[#079669]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--purple-deep)' }}>
                      DIY Savings Tracker
                    </h3>
                    <p className="text-gray-600">
                      Track how much you save by doing projects yourself. See your savings grow over time!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-yellow-100">
                    <Shield className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--purple-deep)' }}>
                      Complete Service History
                    </h3>
                    <p className="text-gray-600">
                      Keep all your home maintenance records in one place. Perfect for resale value and warranty claims.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Card */}
          <Card className="border-2 border-[#CECBF6]" style={{ background: 'linear-gradient(135deg, #EEEDFE, #E6F1FB)' }}>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--purple-deep)' }}>
                Ready to Get Started?
              </h2>
              <p className="text-gray-600 mb-6">
                Join MyHomeBase™ today and get 14 days free. No credit card required.
              </p>
              <Link href={`/signup?ref=${referralCode}`}>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-[#3C258E] to-[#1560A2] hover:from-[#2C0F5B] hover:to-[#0C3460] text-white px-8 py-6 text-lg rounded-xl"
                  data-testid="button-cta-signup"
                >
                  Start Your Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-white/20">
          <div className="max-w-4xl mx-auto text-center text-white/80 text-sm">
            <div className="flex items-center justify-center gap-4 mb-4">
              <a 
                href="https://www.facebook.com/share/1H6GxEER1K/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="Facebook"
              >
                <SiFacebook className="w-5 h-5" style={{ color: '#1877F2' }} />
              </a>
              <a 
                href="https://www.instagram.com/gotohomebase?igsh=MTV3OHJpazkwZXVwYQ==" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="Instagram"
              >
                <SiInstagram className="w-5 h-5" style={{ color: '#E4405F' }} />
              </a>
            </div>
            <p>&copy; 2026 MyHomeBase™. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
