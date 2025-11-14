import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, Calendar, Search, MapPin, Star, CheckCircle, TrendingUp, Shield, Home as HomeIcon, Wrench, Bell, BarChart3, X, ChevronDown, Trophy, Lock, Sparkles } from "lucide-react";
import HeroSection from "@/components/hero-section";
import ProductCard from "@/components/product-card";
import Logo from "@/components/logo";
import HomeHealthScore from "@/components/home-health-score";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import type { Product, User, House } from "@shared/schema";
import { Link, useLocation } from "wouter";

const AVAILABLE_SERVICES = [
  "Appliance Installation",
  "Appliance Repair & Maintenance",
  "Basement Remodeling",
  "Bathroom Remodeling",
  "Cabinet Installation",
  "Carpet Installation",
  "Closet Organization",
  "Concrete & Masonry",
  "Custom Carpentry",
  "Custom Home Building",
  "Deck Construction",
  "Drainage Solutions",
  "Drywall & Spackling Repair",
  "Dumpster Rental",
  "Electrical Services",
  "Epoxy Flooring",
  "Exterior Painting",
  "Fence Installation",
  "Fire & Water Damage Restoration",
  "Furniture Assembly",
  "Garage Door Services",
  "General Contracting",
  "Gutter Cleaning and Repair",
  "Gutter Installation",
  "Handyman Services",
  "Hardwood Flooring",
  "Holiday Light Installation",
  "Home Inspection",
  "House Cleaning",
  "HVAC Services",
  "Interior Painting",
  "Irrigation Systems",
  "Junk Removal",
  "Kitchen Remodeling",
  "Laminate & Vinyl Flooring",
  "Landscape Design",
  "Lawn & Landscaping",
  "Masonry & Paver Installation",
  "Mold Remediation",
  "Pest Control",
  "Plumbing Services",
  "Pool Installation",
  "Pool Maintenance",
  "Pressure Washing",
  "Roofing Services",
  "Security System Installation",
  "Septic Services",
  "Siding Installation",
  "Snow Removal",
  "Tile Installation",
  "Tree Service & Trimming",
  "Trim & Finish Carpentry",
  "Windows & Door Installation"
];

export default function Home() {
  const { user } = useAuth();
  const typedUser = user as User | undefined;
  const [, setLocation] = useLocation();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedHouseId, setSelectedHouseId] = useState<string>('');
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  // Redirect contractors and agents to their dashboards
  useEffect(() => {
    if (typedUser?.role === 'contractor') {
      setLocation('/contractor-dashboard');
    } else if (typedUser?.role === 'agent') {
      setLocation('/agent-dashboard');
    }
  }, [typedUser, setLocation]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setShowServiceDropdown(false);
      }
    };

    if (showServiceDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showServiceDropdown]);

  // Fetch user's houses for homeowners
  const { data: userHouses = [], isLoading: housesLoading } = useQuery<House[]>({
    queryKey: ['/api/houses'],
    queryFn: async () => {
      if (typedUser?.role !== 'homeowner') return [];
      const response = await fetch('/api/houses');
      if (!response.ok) throw new Error('Failed to fetch houses');
      return response.json();
    },
    enabled: typedUser?.role === 'homeowner',
  });

  // Set default selected house to first house when houses load
  useEffect(() => {
    if (userHouses.length > 0 && !selectedHouseId) {
      setSelectedHouseId(userHouses[0].id);
    }
  }, [userHouses, selectedHouseId]);

  // Fetch achievements for homeowners
  const { data: achievementsData } = useQuery<any>({
    queryKey: ['/api/achievements/user'],
    queryFn: async () => {
      if (typedUser?.role !== 'homeowner') return { achievements: [] };
      const response = await fetch('/api/achievements/user');
      if (!response.ok) throw new Error('Failed to fetch achievements');
      return response.json();
    },
    enabled: typedUser?.role === 'homeowner',
  });

  const { data: featuredProducts, isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products', 'featured'],
    queryFn: async () => {
      const response = await fetch('/api/products?featured=true');
      if (!response.ok) throw new Error('Failed to fetch featured products');
      return response.json();
    },
  });

  // Find the selected house for Health Score
  const selectedHouse = userHouses.find(h => h.id === selectedHouseId);

  return (
    <div className="min-h-screen" style={{ background: typedUser?.role === 'homeowner' ? '#2c0f5b' : '#1560a2' }}>
      <HeroSection />
      
      {/* Home Health Score Section */}
      {typedUser?.role === 'homeowner' && selectedHouseId && selectedHouse && (
        <section className="py-12" style={{ backgroundColor: '#2c0f5b' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <HomeHealthScore houseId={selectedHouseId} houseName={selectedHouse.name || 'My Home'} />
            </div>
          </div>
        </section>
      )}

      {/* Homeowner Achievements Section */}
      {typedUser?.role === 'homeowner' && achievementsData?.achievements && achievementsData.achievements.length > 0 && (
        <section className="py-12" style={{ backgroundColor: '#2c0f5b' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <Card style={{ backgroundColor: '#f2f2f2' }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-yellow-500" />
                      <div>
                        <CardTitle style={{ color: '#2c0f5b' }}>Your Achievements</CardTitle>
                        <p className="text-sm" style={{ color: '#6b7280' }}>
                          {achievementsData.achievements.length} {achievementsData.achievements.length === 1 ? 'badge' : 'badges'} unlocked
                        </p>
                      </div>
                    </div>
                    <Link href="/achievements">
                      <Button variant="outline" data-testid="button-view-all-achievements" style={{ color: '#6d28d9' }}>
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {achievementsData.achievements.slice(0, 3).map((achievement: any) => (
                      <div
                        key={achievement.achievementKey}
                        className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300"
                        data-testid={`achievement-preview-${achievement.achievementKey}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
                            <Trophy className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm" style={{ color: '#2c0f5b' }}>
                              {achievement.name}
                            </h4>
                          </div>
                        </div>
                        <p className="text-xs" style={{ color: '#6b7280' }}>
                          {achievement.description}
                        </p>
                        {achievement.unlockedAt && (
                          <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}
      {/* Contractor Dashboard - shown directly after hero for contractors */}
      {typedUser?.role === 'contractor' && (
        <section className="py-16" style={{ backgroundColor: '#1560a2' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4" style={{ color: 'white' }}>
                  Your Business Dashboard
                </h2>
                <p className="text-xl max-w-2xl mx-auto" style={{ color: '#9ed0ef' }}>
                  Manage your contracting business and grow your client base
                </p>
              </div>

              {/* Contractor Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4 items-stretch" style={{ marginBottom: '-100px' }}>
                <Link href="/contractor-profile" className="h-full">
                  <Card className="border-gray-300 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: '#f2f2f2' }}>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors" style={{ backgroundColor: '#1560a2' }}>
                          <Users className="h-6 w-6" style={{ color: 'white' }} />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold" style={{ color: '#1560a2' }}>My Profile</h3>
                          <p className="text-sm" style={{ color: '#1560a2' }}>Update info</p>
                        </div>
                      </div>
                      <p className="text-sm" style={{ color: '#1560a2' }}>
                        Manage your professional profile and service offerings
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/messages" className="h-full">
                  <Card className="border-gray-300 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: '#f2f2f2' }}>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors" style={{ backgroundColor: '#1560a2' }}>
                          <Bell className="h-6 w-6" style={{ color: 'white' }} />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold" style={{ color: '#1560a2' }}>Messages</h3>
                          <p className="text-sm" style={{ color: '#1560a2' }}>Client communication</p>
                        </div>
                      </div>
                      <p className="text-sm" style={{ color: '#1560a2' }}>
                        Communicate with potential and existing clients
                      </p>
                    </CardContent>
                  </Card>
                </Link>


                <Link href="/contractor-dashboard" className="h-full">
                  <Card className="border-gray-300 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: '#f2f2f2' }}>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors" style={{ backgroundColor: '#1560a2' }}>
                          <Calendar className="h-6 w-6" style={{ color: 'white' }} />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold" style={{ color: '#1560a2' }}>Active Projects</h3>
                          <p className="text-sm" style={{ color: '#1560a2' }}>Current work</p>
                        </div>
                      </div>
                      <p className="text-sm" style={{ color: '#1560a2' }}>
                        3 active projects scheduled this week
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/contractor-dashboard" className="h-full">
                  <Card className="border-gray-300 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: '#f2f2f2' }}>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors" style={{ backgroundColor: '#1560a2' }}>
                          <Star className="h-6 w-6" style={{ color: 'white' }} />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold" style={{ color: '#1560a2' }}>Reviews</h3>
                          <p className="text-sm" style={{ color: '#1560a2' }}>Customer feedback</p>
                        </div>
                      </div>
                      <p className="text-sm" style={{ color: '#1560a2' }}>
                        4.8/5 stars from 127 recent reviews
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/contractor-dashboard" className="h-full">
                  <Card className="border-gray-300 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group h-full flex flex-col" style={{ background: '#f2f2f2' }}>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:opacity-80 transition-colors" style={{ backgroundColor: '#1560a2' }}>
                          <Search className="h-6 w-6" style={{ color: 'white' }} />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold" style={{ color: '#1560a2' }}>New Leads</h3>
                          <p className="text-sm" style={{ color: '#1560a2' }}>Opportunities</p>
                        </div>
                      </div>
                      <p className="text-sm" style={{ color: '#1560a2' }}>
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
      {/* AI Help Feature - Homeowners Only */}
      {typedUser?.role === 'homeowner' && (
        <section className="bg-gradient-to-br from-purple-100 via-blue-100 to-purple-100 pt-[40px] pb-[40px] mt-[60px] mb-[10px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50 shadow-xl">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                      <h3 className="text-2xl font-bold text-purple-700">Not Sure Who to Contact?</h3>
                    </div>
                    <p className="text-gray-700 mb-4">
                      Let our AI assistant analyze your home problem and recommend the right type of contractor. 
                      Get instant, expert guidance tailored to your specific situation!
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
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
                  <div className="flex-shrink-0">
                    <Link href="/ai-help">
                      <Button 
                        size="lg" 
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                        data-testid="button-ai-help"
                      >
                        <Sparkles className="w-5 h-5 mr-2" />
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
      {/* Additional Features Section */}
      <section style={{ background: typedUser?.role === 'homeowner' ? '#2c0f5b' : '#1560a2', paddingTop: '14px', paddingBottom: '30px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#ffffff' }}>
              Why Choose Home Base?
            </h2>
            {typedUser?.role === 'homeowner' ? (
              <p className="text-xl max-w-3xl mx-auto" style={{ color: '#b6a6f4' }}>
                We've designed every feature to make home management simple, reliable, and efficient
              </p>
            ) : (
              <p className="text-xl max-w-3xl mx-auto" style={{ color: '#9ed0ef' }}>
                The platform contractors trust to grow their business and connect with quality clients
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {typedUser?.role === 'homeowner' ? (
              // Homeowner Features
              (<>
                <Card className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#2c0f5b' }}>
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3" style={{ color: '#2c0f5b' }}>Verified Professionals</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      All contractors are thoroughly vetted with background checks, license verification, and customer reviews
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#2c0f5b' }}>
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3" style={{ color: '#2c0f5b' }}>Quality Products</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Browse professional-grade tools and materials for your home improvement projects
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#2c0f5b' }}>
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3" style={{ color: '#2c0f5b' }}>Cost Savings</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Preventive maintenance and competitive contractor pricing help you save thousands on home repairs
                    </p>
                  </CardContent>
                </Card>
              </>)
            ) : (
              // Contractor Features
              (<>
                <Card className="border-gray-300 dark:border-gray-600" style={{ backgroundColor: '#f2f2f2' }}>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#1560a2' }}>
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3" style={{ color: '#1560a2' }}>Quality Leads</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Connect with motivated homeowners who value professional service and quality workmanship
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-gray-300 dark:border-gray-600" style={{ backgroundColor: '#f2f2f2' }}>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#1560a2' }}>
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3" style={{ color: '#1560a2' }}>Grow Your Business</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Tools and features designed to help you manage projects, track earnings, and expand your client base
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-gray-300 dark:border-gray-600" style={{ backgroundColor: '#f2f2f2' }}>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#1560a2' }}>
                      <Star className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3" style={{ color: '#1560a2' }}>Build Reputation</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Showcase your expertise through customer reviews and build a trusted reputation in your community
                    </p>
                  </CardContent>
                </Card>
              </>)
            )}
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="text-white py-16" style={{ backgroundColor: '#2c0f5b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-1/4 h-auto" style={{ color: '#b6a6f4' }}>
                  <Logo className="w-full h-auto" />
                </div>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Your trusted partner for connecting with skilled contractors, discovering quality DIY products, and maintaining your home with confidence.
              </p>
            </div>

            {/* Only show homeowner links for homeowners */}
            {typedUser?.role === 'homeowner' && (
              <div className="text-center">
                <h4 className="text-lg font-semibold mb-6 text-white">For Homeowners</h4>
                <ul className="space-y-3 text-gray-400">
                  <li><Link href="/contractors" className="hover:text-purple-400 transition-colors">Find Contractors</Link></li>
                  <li><Link href="/products" className="hover:text-purple-400 transition-colors">DIY Products</Link></li>
                  <li><Link href="/maintenance" className="hover:text-purple-400 transition-colors">Maintenance Schedule</Link></li>
                  <li><Link href="/maintenance#service-records" className="hover:text-purple-400 transition-colors">Service History</Link></li>
                </ul>
              </div>
            )}

            <div className="text-center">
              <h4 className="text-lg font-semibold mb-6 text-white">For Contractors</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/contractor-signin" className="transition-colors hover:text-purple-400">Join Network</Link></li>
                <li><a href="#" className="transition-colors hover:text-purple-400">Pricing Plans</a></li>
                <li><a href="#" className="transition-colors hover:text-purple-400">Success Stories</a></li>
                <li><a href="#" className="transition-colors hover:text-purple-400">Resources</a></li>
              </ul>
            </div>

            <div className="text-center">
              <h4 className="text-lg font-semibold mb-6 text-white">Support</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="transition-colors hover:text-purple-400">Help Center</a></li>
                <li><a href="#" className="transition-colors hover:text-purple-400">Contact Us</a></li>
                <li><a href="#" className="transition-colors hover:text-purple-400">Terms of Service</a></li>
                <li><a href="#" className="transition-colors hover:text-purple-400">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Home Base. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
