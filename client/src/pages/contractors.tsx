import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/header";
import ContractorCard from "@/components/contractor-card";
import FilterSidebar from "@/components/filter-sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Contractor } from "@shared/schema";

export default function Contractors() {
  const [location] = useLocation();
  const [filters, setFilters] = useState<any>({});
  const [sortBy, setSortBy] = useState('best-match');
  const [searchQuery, setSearchQuery] = useState('');

  // Parse URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const searchQuery = params.get('q') || '';
    const searchLocation = params.get('location') || '';
    
    if (searchQuery || searchLocation) {
      // Use search endpoint when there are search parameters
      setFilters({ searchQuery, searchLocation });
    }
  }, [location]);

  const { data: contractors, isLoading, error } = useQuery<(Contractor & { isBoosted?: boolean })[]>({
    queryKey: filters.searchQuery || filters.searchLocation 
      ? ['/api/contractors/search', filters]
      : ['/api/contractors', filters],
    queryFn: async () => {
      if (filters.searchQuery || filters.searchLocation) {
        const params = new URLSearchParams();
        if (filters.searchQuery) params.set('q', filters.searchQuery);
        if (filters.searchLocation) params.set('location', filters.searchLocation);
        
        const response = await fetch(`/api/contractors/search?${params}`);
        if (!response.ok) throw new Error('Failed to search contractors');
        return response.json();
      } else {
        const params = new URLSearchParams();
        if (filters.services) params.set('services', filters.services.join(','));
        if (filters.minRating) params.set('minRating', filters.minRating.toString());
        if (filters.availableThisWeek) params.set('availableThisWeek', 'true');
        if (filters.hasEmergencyServices) params.set('hasEmergencyServices', 'true');
        if (filters.maxDistance) params.set('maxDistance', filters.maxDistance.toString());
        
        const response = await fetch(`/api/contractors?${params}`);
        if (!response.ok) throw new Error('Failed to fetch contractors');
        return response.json();
      }
    },
  });

  const handleFiltersChange = (newFilters: any) => {
    setFilters({ ...filters, ...newFilters });
  };

  // Sort contractors based on selected option
  const sortedContractors = contractors ? [...contractors].sort((a, b) => {
    switch (sortBy) {
      case 'highest-rated':
        return parseFloat(b.rating) - parseFloat(a.rating);
      case 'most-reviews':
        return b.reviewCount - a.reviewCount;
      case 'distance':
        return parseFloat(a.distance || '0') - parseFloat(b.distance || '0');
      default:
        return 0;
    }
  }) : [];

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Contractors</h2>
            <p className="text-gray-600">Sorry, we couldn't load the contractors. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2c0f5b' }}>
      <Header />
      
      {/* Hero Section */}
      <section className="py-16" style={{ background: '#2c0f5b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6" style={{ color: '#ffffff' }}>
              Find Trusted Contractors
            </h1>
            <p className="text-xl max-w-3xl mx-auto mb-8" style={{ color: '#b6a6f4' }}>
              Connect with verified professionals specializing in niche home services
            </p>
            <div className="flex justify-center">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="rounded-xl px-4 py-2 shadow-sm" style={{ backgroundColor: '#b6a6f4' }}>
                  <div className="font-semibold" style={{ color: '#ffffff' }}>500+</div>
                  <div className="text-gray-600 dark:text-gray-300">Verified Pros</div>
                </div>
                <div className="rounded-xl px-4 py-2 shadow-sm" style={{ backgroundColor: '#b6a6f4' }}>
                  <div className="font-semibold" style={{ color: '#ffffff' }}>4.8★</div>
                  <div className="text-gray-600 dark:text-gray-300">Avg Rating</div>
                </div>
                <div className="rounded-xl px-4 py-2 shadow-sm" style={{ backgroundColor: '#b6a6f4' }}>
                  <div className="font-semibold" style={{ color: '#ffffff' }}>10k+</div>
                  <div className="text-gray-600 dark:text-gray-300">Projects</div>
                </div>
                <div className="rounded-xl px-4 py-2 shadow-sm" style={{ backgroundColor: '#b6a6f4' }}>
                  <div className="font-semibold" style={{ color: '#ffffff' }}>Licensed</div>
                  <div className="text-gray-600 dark:text-gray-300">& Insured</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <FilterSidebar onFiltersChange={handleFiltersChange} />
          
          <div className="flex-1">
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2" style={{ color: '#ffffff' }}>
                    Available Contractors
                  </h2>
                  <p className="text-lg" style={{ color: '#b6a6f4' }}>
                    {isLoading ? 'Loading...' : `${sortedContractors.length} verified contractors specializing in niche services`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm" style={{ color: '#ffffff' }}>
                    Sort by:
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best-match">Best Match</SelectItem>
                      <SelectItem value="highest-rated">Highest Rated</SelectItem>
                      <SelectItem value="most-reviews">Most Reviews</SelectItem>
                      <SelectItem value="distance">Distance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#f2f2f2' }} />
                <Input
                  type="text"
                  placeholder="Search for christmas light hanging, snow removal, pool installation, house cleaning..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 text-lg border-muted"
                  style={{ color: '#f2f2f2' }}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6 animate-pulse">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-4 w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-4 w-1/2"></div>
                        <div className="flex gap-2 mb-4">
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                          <div className="h-6 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 bg-gray-200 rounded flex-1"></div>
                          <div className="h-8 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedContractors.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No contractors found</h3>
                <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {sortedContractors.map((contractor) => (
                    <ContractorCard key={contractor.id} contractor={contractor} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-8 flex justify-center">
                  <nav className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" disabled className="hover:bg-[#3c258e]">
                      <ChevronLeft className="h-4 w-4" style={{ color: '#b6a6f4' }} />
                    </Button>
                    <Button size="sm" className="hover:bg-[#3c258e]" style={{ backgroundColor: '#b6a6f4', color: '#2c0f5b' }}>1</Button>
                    <Button variant="outline" size="sm" className="hover:bg-[#3c258e]" style={{ color: '#b6a6f4' }}>2</Button>
                    <Button variant="outline" size="sm" className="hover:bg-[#3c258e]" style={{ color: '#b6a6f4' }}>3</Button>
                    <span className="px-3 py-2 text-gray-500">...</span>
                    <Button variant="outline" size="sm" className="hover:bg-[#3c258e]" style={{ color: '#b6a6f4' }}>8</Button>
                    <Button variant="outline" size="sm" className="hover:bg-[#3c258e]">
                      <ChevronRight className="h-4 w-4" style={{ color: '#b6a6f4' }} />
                    </Button>
                  </nav>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
