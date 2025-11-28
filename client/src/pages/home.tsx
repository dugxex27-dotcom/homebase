import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, Calendar, Search, MapPin, Star, CheckCircle, TrendingUp, Shield, Home as HomeIcon, Wrench, Bell, BarChart3, Gift, Sparkles } from "lucide-react";
import HeroSection from "@/components/hero-section";
import Logo from "@/components/logo";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import { Link, useLocation } from "wouter";

export default function Home() {
  const { user } = useAuth();
  const typedUser = user as User | undefined;
  const [, setLocation] = useLocation();

  // Redirect contractors and agents to their dashboards
  useEffect(() => {
    if (typedUser?.role === 'contractor') {
      setLocation('/contractor-dashboard');
    } else if (typedUser?.role === 'agent') {
      setLocation('/agent-dashboard');
    }
  }, [typedUser, setLocation]);

  // Referral data query for homeowners
  const { data: referralData } = useQuery({
    queryKey: ['/api/user/referral-code'],
    enabled: typedUser?.role === 'homeowner',
  });

  // User data query for subscription details
  const { data: userData } = useQuery({
    queryKey: ['/api/user'],
    enabled: typedUser?.role === 'homeowner',
  });

  // Calculate referral progress for homeowners
  const referralCount = (referralData as any)?.referralCount || 0;
  const maxHouses = (userData as any)?.maxHousesAllowed ?? 2;
  const subscriptionCost = maxHouses >= 7 ? 40 : maxHouses >= 3 ? 20 : 5;
  const referralsNeeded = subscriptionCost;
  const referralsRemaining = Math.max(0, referralsNeeded - referralCount);
  const progressPercentage = Math.min(100, (referralCount / referralsNeeded) * 100);

  return (
    <div className="min-h-screen" style={{ 
      background: typedUser?.role === 'homeowner' 
        ? 'linear-gradient(180deg, #8B70D4 0%, #9B82DC 50%, #8B70D4 100%)' 
        : '#1560a2' 
    }}>
      <HeroSection />
      
      {/* Referral Card Section - Homeowners Only */}
      {typedUser?.role === 'homeowner' && (
        <section className="py-8 sm:py-12" style={{ background: 'transparent' }}>
          <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
            <Card className="bg-white border-purple-200 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-center">
                  <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold" style={{ color: '#2c0f5b' }}>
                    <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                    Earn a Free Subscription
                  </div>
                </CardTitle>
                <p className="text-center text-gray-600 mt-2">
                  Get {referralsNeeded} paid referrals. Free as long as they remain subscribers.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2 px-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold" style={{ color: '#2c0f5b' }}>
                        {referralCount}
                      </div>
                      <div className="text-sm text-gray-600">Paid Referrals</div>
                    </div>
                    <div className="text-2xl text-gray-400">/</div>
                    <div className="text-center">
                      <div className="text-3xl font-bold" style={{ color: '#2c0f5b' }}>
                        {referralsNeeded}
                      </div>
                      <div className="text-sm text-gray-600">Needed</div>
                    </div>
                  </div>
                  
                  <Progress 
                    value={progressPercentage} 
                    className="h-8 mb-4" 
                    data-testid="progress-referral-subscription" 
                  />
                  
                  <p className="text-center text-lg sm:text-xl font-medium" style={{ color: referralsRemaining === 0 ? '#10b981' : '#6b46c1' }}>
                    {referralsRemaining === 0 ? (
                      "🎉 You've earned a free subscription!"
                    ) : (
                      `You're ${referralsRemaining} paid referral${referralsRemaining !== 1 ? 's' : ''} away from a free subscription.`
                    )}
                  </p>
                  
                  <div className="text-center mt-6">
                    <Link href="/homeowner-referral">
                      <Button 
                        size="lg"
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                        data-testid="button-share-invite-link"
                      >
                        Share Your Invite Link
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
      
      {/* AI Help Feature - Homeowners Only */}
      {typedUser?.role === 'homeowner' && (
        <section className="py-8 sm:py-12" style={{ background: 'transparent' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
            <Card className="border-2 border-purple-300 bg-white shadow-xl">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-purple-700">Not Sure Who to Contact?</h3>
                    </div>
                    <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
                      Let our AI assistant analyze your home problem and recommend the right type of contractor. 
                      Get instant, expert guidance tailored to your specific situation!
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600 justify-center md:justify-start">
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Instant Analysis
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Expert Recommendations
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Direct Contractor Search
                      </Badge>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <Link href="/ai-help" className="w-full md:w-auto">
                      <Button 
                        size="lg" 
                        className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base lg:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                        data-testid="button-ai-help"
                      >
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        Try AI Help Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
      
      {/* Contractor Dashboard - shown directly after hero for contractors */}
      {typedUser?.role === 'contractor' && (
        <section className="py-8 sm:py-12 lg:py-16" style={{ backgroundColor: '#1560a2' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4" style={{ color: 'white' }}>
                  Your Business Dashboard
                </h2>
                <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: '#9ed0ef' }}>
                  Manage your contracting business and grow your client base
                </p>
              </div>

              {/* Contractor Dashboard Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 items-stretch" style={{ marginBottom: '-100px' }}>
                <Link href="/contractor-profile" className="h-full">
                  <Card className="border-gray-300 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: '#f2f2f2' }}>
                    <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors flex-shrink-0" style={{ backgroundColor: '#1560a2' }}>
                          <Users className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'white' }} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <h3 className="text-base sm:text-lg font-semibold" style={{ color: '#1560a2' }}>My Profile</h3>
                          <p className="text-xs sm:text-sm" style={{ color: '#1560a2' }}>Update info</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm" style={{ color: '#1560a2' }}>
                        Manage your professional profile and service offerings
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/messages" className="h-full">
                  <Card className="border-gray-300 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: '#f2f2f2' }}>
                    <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors flex-shrink-0" style={{ backgroundColor: '#1560a2' }}>
                          <Bell className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'white' }} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <h3 className="text-base sm:text-lg font-semibold" style={{ color: '#1560a2' }}>Messages</h3>
                          <p className="text-xs sm:text-sm" style={{ color: '#1560a2' }}>Client communication</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm" style={{ color: '#1560a2' }}>
                        Communicate with potential and existing clients
                      </p>
                    </CardContent>
                  </Card>
                </Link>


                <Link href="/contractor-dashboard" className="h-full">
                  <Card className="border-gray-300 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: '#f2f2f2' }}>
                    <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors flex-shrink-0" style={{ backgroundColor: '#1560a2' }}>
                          <Calendar className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'white' }} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <h3 className="text-base sm:text-lg font-semibold" style={{ color: '#1560a2' }}>Active Projects</h3>
                          <p className="text-xs sm:text-sm" style={{ color: '#1560a2' }}>Current work</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm" style={{ color: '#1560a2' }}>
                        3 active projects scheduled this week
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/contractor-dashboard" className="h-full">
                  <Card className="border-gray-300 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: '#f2f2f2' }}>
                    <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors flex-shrink-0" style={{ backgroundColor: '#1560a2' }}>
                          <Star className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'white' }} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <h3 className="text-base sm:text-lg font-semibold" style={{ color: '#1560a2' }}>Reviews</h3>
                          <p className="text-xs sm:text-sm" style={{ color: '#1560a2' }}>Customer feedback</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm" style={{ color: '#1560a2' }}>
                        4.8/5 stars from 127 recent reviews
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/contractor-dashboard" className="h-full">
                  <Card className="border-gray-300 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: '#f2f2f2' }}>
                    <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors flex-shrink-0" style={{ backgroundColor: '#1560a2' }}>
                          <Search className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'white' }} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <h3 className="text-base sm:text-lg font-semibold" style={{ color: '#1560a2' }}>New Leads</h3>
                          <p className="text-xs sm:text-sm" style={{ color: '#1560a2' }}>Opportunities</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm" style={{ color: '#1560a2' }}>
                        5 new client inquiries this week
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className="text-white py-8 sm:py-12 lg:py-16" style={{ backgroundColor: '#2c0f5b' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div className="w-1/3 sm:w-1/4 h-auto" style={{ color: '#b6a6f4' }}>
                  <Logo className="w-full h-auto" />
                </div>
              </div>
              <p className="text-gray-400 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                Your trusted partner for connecting with skilled contractors, discovering quality DIY products, and maintaining your home with confidence.
              </p>
            </div>

            {/* Only show homeowner links for homeowners */}
            {typedUser?.role === 'homeowner' && (
              <div className="text-center">
                <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-white">For Homeowners</h4>
                <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
                  <li><Link href="/contractors" className="hover:text-purple-400 transition-colors">Find Contractors</Link></li>
                  <li><Link href="/products" className="hover:text-purple-400 transition-colors">DIY Products</Link></li>
                  <li><Link href="/maintenance" className="hover:text-purple-400 transition-colors">Maintenance Schedule</Link></li>
                  <li><Link href="/maintenance#service-records" className="hover:text-purple-400 transition-colors">Service History</Link></li>
                  <li><Link href="/homeowner-pricing" className="hover:text-purple-400 transition-colors" data-testid="link-pricing-footer">Pricing Plans</Link></li>
                </ul>
              </div>
            )}

            <div className="text-center">
              <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-white">Support</h4>
              <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
                <li><Link href="/support" className="transition-colors hover:text-purple-400">Help Center</Link></li>
                <li><Link href="/support" className="transition-colors hover:text-purple-400">Contact Us</Link></li>
              </ul>
            </div>

            <div className="text-center">
              <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-white">Legal</h4>
              <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
                <li><Link href="/terms-of-service" className="transition-colors hover:text-purple-400">Terms of Service</Link></li>
                <li><Link href="/privacy-policy" className="transition-colors hover:text-purple-400">Privacy Policy</Link></li>
                <li><Link href="/legal-disclaimer" className="transition-colors hover:text-purple-400">Legal Disclaimer</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center text-gray-400 text-sm sm:text-base">
            <p>&copy; 2025 Home Base. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
