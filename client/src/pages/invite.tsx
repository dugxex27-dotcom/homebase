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
import { Helmet } from "react-helmet";

export default function Invite() {
  const [, params] = useRoute("/invite/:code");
  const referralCode = params?.code || "";
  
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
  const shareTitle = `${firstName} invited you to HomeBase!`;
  const shareDescription = "Join HomeBase to manage your home maintenance, connect with contractors, and save money on DIY projects. Get a 14-day free trial!";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2c0f5b 0%, #5b21b6 100%)' }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!referralInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2c0f5b 0%, #5b21b6 100%)' }}>
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#2c0f5b' }}>Invalid Invite Link</h2>
            <p className="mb-6 text-gray-600">This referral link is no longer valid.</p>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
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
        <title>{shareTitle} | HomeBase</title>
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

      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #2c0f5b 0%, #5b21b6 100%)' }}>
        {/* Header */}
        <header className="py-6 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-white text-2xl font-bold flex items-center gap-2">
              <HomeIcon className="w-8 h-8" />
              HomeBase
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
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: '#2c0f5b' }} data-testid="heading-invite">
                  {firstName} invited you to HomeBase!
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  Join thousands of homeowners who are taking control of their home maintenance
                </p>
                <Badge className="bg-green-100 text-green-700 text-lg px-4 py-2 font-semibold">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  14-Day Free Trial Included
                </Badge>
              </div>

              <Link href={`/signup?ref=${referralCode}`}>
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xl py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
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
                  <div className="p-3 rounded-lg bg-purple-100">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: '#2c0f5b' }}>
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
                  <div className="p-3 rounded-lg bg-blue-100">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: '#2c0f5b' }}>
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
                  <div className="p-3 rounded-lg bg-green-100">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: '#2c0f5b' }}>
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
                    <h3 className="font-bold text-lg mb-2" style={{ color: '#2c0f5b' }}>
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
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#2c0f5b' }}>
                Ready to Get Started?
              </h2>
              <p className="text-gray-600 mb-6">
                Join HomeBase today and get 14 days free. No credit card required.
              </p>
              <Link href={`/signup?ref=${referralCode}`}>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-xl"
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
            <p>&copy; 2025 HomeBase. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
