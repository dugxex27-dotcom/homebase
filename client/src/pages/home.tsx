import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, Calendar, Search, MapPin } from "lucide-react";
import Header from "@/components/header";
import HeroSection from "@/components/hero-section";
import ProductCard from "@/components/product-card";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@shared/schema";
import { Link } from "wouter";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'products' | 'maintenance' | 'contractors'>('products');

  const { data: featuredProducts, isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products', 'featured'],
    queryFn: async () => {
      const response = await fetch('/api/products?featured=true');
      if (!response.ok) throw new Error('Failed to fetch featured products');
      return response.json();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      
      {/* Category Tabs */}
      <section className="bg-card py-8 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="flex bg-muted rounded-xl p-1">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-6 py-3 rounded-lg text-sm font-medium flex items-center transition-colors ${
                  activeTab === 'products'
                    ? 'bg-card text-card-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="mr-2 h-4 w-4" />
                DIY Products
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-6 py-3 rounded-lg text-sm font-medium flex items-center transition-colors ${
                  activeTab === 'maintenance'
                    ? 'bg-card text-card-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Maintenance Schedule
              </button>
              <button
                onClick={() => setActiveTab('contractors')}
                className={`px-6 py-3 rounded-lg text-sm font-medium flex items-center transition-colors ${
                  activeTab === 'contractors'
                    ? 'bg-card text-card-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="mr-2 h-4 w-4" />
                Find Contractors
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Content Section */}
      <section className="bg-muted py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {activeTab === 'products' && (
            <>
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Featured DIY Products
                </h2>
                <p className="text-lg text-muted-foreground">
                  Quality tools and materials for your next project
                </p>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card rounded-xl shadow-sm border border-border p-4 animate-pulse">
                      <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded mb-3 w-3/4"></div>
                      <div className="flex justify-between items-center">
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                        <div className="h-8 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {featuredProducts?.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

              <div className="text-center mt-8">
                <Link href="/products">
                  <Button className="bg-primary text-white px-6 py-3 hover:bg-blue-700">
                    View All Products
                  </Button>
                </Link>
              </div>
            </>
          )}

          {activeTab === 'maintenance' && (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Seasonal Maintenance Schedule
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Keep your home in top condition with our location-based maintenance recommendations
              </p>
              <Link href="/maintenance">
                <Button className="bg-primary text-white px-8 py-3 hover:bg-primary/90">
                  View Maintenance Schedule
                </Button>
              </Link>
            </div>
          )}

          {activeTab === 'contractors' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-card rounded-2xl shadow-lg p-6 border border-border">
                <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
                  Find Trusted Contractors
                </h2>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      What do you need help with?
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Gutter cleaning, drywall repair, custom cabinetry..."
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="City, State or ZIP code"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Link href="/contractors">
                    <Button className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center self-end">
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Contractor CTA Section */}
      <section id="contractor-cta" className="bg-primary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Are You a Contractor?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Join our network of trusted professionals and connect with homeowners in your area. 
              Build your business with qualified leads and showcase your expertise.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-white text-primary hover:bg-gray-50">
                Join as a Contractor
              </Button>
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-primary">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <Logo className="h-8 w-auto text-primary" />
              </div>
              <p className="text-gray-400 mb-4">
                Connecting homeowners with trusted contractors and quality DIY products for all your home improvement needs.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">For Homeowners</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/contractors" className="hover:text-white transition-colors">Find Contractors</Link></li>
                <li><Link href="/products" className="hover:text-white transition-colors">DIY Products</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Project Ideas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Safety Tips</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">For Contractors</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#contractor-cta" className="hover:text-white transition-colors">Join Network</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Success Stories</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Resources</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 HomeConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
