import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/header";
import ContractorCard from "@/components/contractor-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Search, ChevronDown, X, Home } from "lucide-react";
import type { Contractor, House } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { getDistanceOptions, getDistanceUnit, extractCountryFromAddress, convertDistanceForStorage } from '@shared/distance-utils';

export default function Contractors() {
  const [location] = useLocation();
  const [filters, setFilters] = useState<any>({});
  const [sortBy, setSortBy] = useState('best-match');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Authentication
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const homeownerId = (user as any)?.id;
  const userRole = (user as any)?.role;
  
  // Local state for form controls
  const [selectedDistance, setSelectedDistance] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('');
  const [hasEmergencyServices, setHasEmergencyServices] = useState<boolean>(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState<boolean>(false);
  const [selectedHouseId, setSelectedHouseId] = useState<string>('');
  const servicesDropdownRef = useRef<HTMLDivElement>(null);
  
  // Country detection for distance units
  const [userCountry, setUserCountry] = useState<string>('US');

  // Fetch houses for authenticated homeowners
  const { data: houses = [], isLoading: housesLoading } = useQuery<House[]>({
    queryKey: ['/api/houses'],
    enabled: isAuthenticated && !!homeownerId && userRole === 'homeowner'
  });

  // Auto-select first house when houses are loaded
  useEffect(() => {
    if (houses.length > 0 && !selectedHouseId) {
      setSelectedHouseId(houses[0].id);
    }
  }, [houses, selectedHouseId]);

  // Detect country from selected house address
  useEffect(() => {
    if (selectedHouseId && houses.length > 0) {
      const selectedHouse = houses.find(house => house.id === selectedHouseId);
      if (selectedHouse && selectedHouse.address) {
        const detectedCountry = extractCountryFromAddress(selectedHouse.address);
        if (detectedCountry) {
          setUserCountry(detectedCountry);
        }
      }
    }
  }, [selectedHouseId, houses]);

  // Services list from FilterSidebar
  const services = [
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
    "Demo Contractor",
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

  // Track if we've already initialized filters from URL to prevent resets
  const hasInitializedFromUrl = useRef(false);

  // Parse URL parameters on initial load only
  useEffect(() => {
    if (hasInitializedFromUrl.current) return;
    
    const params = new URLSearchParams(location.split('?')[1] || '');
    const searchQuery = params.get('q') || '';
    const searchLocation = params.get('location') || '';
    
    if (searchQuery || searchLocation) {
      // Use search endpoint when there are search parameters
      setFilters({ searchQuery, searchLocation });
      hasInitializedFromUrl.current = true;
    }
  }, [location]);

  // Separate effect to handle house matching from URL location parameter
  useEffect(() => {
    if (!hasInitializedFromUrl.current) return;
    
    const params = new URLSearchParams(location.split('?')[1] || '');
    const searchLocation = params.get('location') || '';
    
    // If location parameter exists and houses are loaded, try to find matching house
    if (searchLocation && houses.length > 0 && !selectedHouseId) {
      const matchingHouse = houses.find((house: House) => 
        house.address.toLowerCase().includes(searchLocation.toLowerCase()) ||
        searchLocation.toLowerCase().includes(house.address.toLowerCase())
      );
      if (matchingHouse) {
        setSelectedHouseId(matchingHouse.id);
      }
    }
  }, [houses, selectedHouseId]);

  // Auto-set location filter when a house is initially selected
  useEffect(() => {
    if (selectedHouseId && houses.length > 0) {
      const selectedHouse = houses.find((h: House) => h.id === selectedHouseId);
      if (selectedHouse && !filters.searchLocation) {
        setFilters((prev: any) => ({ 
          ...prev, 
          searchLocation: selectedHouse.address 
        }));
      }
    }
  }, [selectedHouseId, houses]);

  // Handle click outside to close services dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(event.target as Node)) {
        setServicesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle service selection
  const handleServiceChange = (service: string, checked: boolean) => {
    if (checked) {
      setSelectedServices([...selectedServices, service]);
    } else {
      setSelectedServices(selectedServices.filter(s => s !== service));
    }
  };

  const { data: contractors, isLoading, error } = useQuery<(Contractor & { isBoosted?: boolean })[]>({
    queryKey: filters.searchQuery || filters.searchLocation 
      ? ['/api/contractors/search', filters]
      : ['/api/contractors', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Always include filter parameters
      if (filters.services) params.set('services', filters.services.join(','));
      if (filters.minRating) params.set('minRating', filters.minRating.toString());
      if (filters.availableThisWeek) params.set('availableThisWeek', 'true');
      if (filters.hasEmergencyServices) params.set('hasEmergencyServices', 'true');
      if (filters.maxDistance) params.set('maxDistance', filters.maxDistance.toString());
      
      if (filters.searchQuery || filters.searchLocation) {
        // Add search parameters
        if (filters.searchQuery) params.set('q', filters.searchQuery);
        if (filters.searchLocation) params.set('location', filters.searchLocation);
        
        // Track search analytics for any filter or search activity
        try {
          await fetch('/api/analytics/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchTerm: filters.searchQuery || filters.services?.join(', ') || 'contractor search',
              serviceType: filters.services?.join(', '),
              searchContext: 'contractor_directory'
            })
          });
        } catch (error) {
          console.error('Failed to track search:', error);
        }
        
        const response = await fetch(`/api/contractors/search?${params}`);
        if (!response.ok) throw new Error('Failed to search contractors');
        return response.json();
      } else {
        const response = await fetch(`/api/contractors?${params}`);
        if (!response.ok) throw new Error('Failed to fetch contractors');
        return response.json();
      }
    },
  });

  const handleFiltersChange = (newFilters: any) => {
    // Preserve search parameters if they exist, but completely replace other filters
    const searchParams = {
      ...(filters.searchQuery && { searchQuery: filters.searchQuery }),
      ...(filters.searchLocation && { searchLocation: filters.searchLocation })
    };
    setFilters({ ...searchParams, ...newFilters });
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
            <p className="text-xl max-w-3xl mx-auto" style={{ color: '#b6a6f4' }}>
              Connect with verified professionals specializing in niche home services
            </p>
          </div>
        </div>
      </section>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Find Contractor Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-6" style={{ color: '#ffffff' }}>
            Find Contractor
          </h2>
          
          {/* Horizontal Filters */}
          <div className="bg-card rounded-xl shadow-sm border p-6 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-6">Find Your Perfect Contractor</h3>
            
            {/* House Selection Banner - Only show for authenticated homeowners with houses */}
            {isAuthenticated && userRole === 'homeowner' && houses.length > 0 && selectedHouseId && (
              <div className="col-span-full mb-4 p-4 rounded-lg" style={{ backgroundColor: '#3d1f6b', border: '2px solid #b6a6f4' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5" style={{ color: '#b6a6f4' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#b6a6f4' }}>Searching near:</p>
                      <p className="text-lg font-bold text-white">
                        {houses.find((h: House) => h.id === selectedHouseId)?.name}
                      </p>
                      <p className="text-sm" style={{ color: '#d1c9f0' }}>
                        {houses.find((h: House) => h.id === selectedHouseId)?.address}
                      </p>
                    </div>
                  </div>
                  <Select 
                    value={selectedHouseId} 
                    onValueChange={(value) => {
                      setSelectedHouseId(value);
                      // Update location filter when home changes
                      const selectedHouse = houses.find((h: House) => h.id === value);
                      if (selectedHouse) {
                        setFilters((prev: any) => ({ 
                          ...prev, 
                          searchLocation: selectedHouse.address 
                        }));
                      }
                    }}
                    data-testid="filter-home"
                  >
                    <SelectTrigger className="w-64 h-auto min-h-[60px] py-3" style={{ backgroundColor: '#1e1e20', color: '#ffffff' }}>
                      <SelectValue placeholder="Change property..." />
                    </SelectTrigger>
                    <SelectContent>
                      {houses.map((house: House) => (
                        <SelectItem key={house.id} value={house.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{house.name}</span>
                            <span className="text-xs text-muted-foreground">{house.address}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">

              {/* Distance Filter */}
              <div className="flex flex-col h-full">
                <label className="text-sm font-medium text-foreground mb-3 block whitespace-nowrap">Distance ({getDistanceUnit(userCountry)})</label>
                <div>
                  <select 
                    className="w-full h-[42px] px-3 py-2 border border-muted rounded-md"
                    style={{ color: '#ffffff', backgroundColor: '#1e1e20' }}
                    value={selectedDistance}
                    onChange={(e) => {
                      setSelectedDistance(e.target.value);
                    }}
                    data-testid="filter-distance"
                  >
                    <option value="">Any distance</option>
                    {getDistanceOptions(userCountry).map((option) => (
                      <option key={option.value} value={option.value.toString()}>
                        Within {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  🌍 {userCountry === 'US' ? 'Using miles for US locations' : 'Using kilometers for international locations'}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="flex flex-col h-full">
                <label className="text-sm font-medium text-foreground mb-3 block">Minimum Rating</label>
                <div>
                  <select 
                    className="w-full h-[42px] px-3 py-2 border border-muted rounded-md"
                    style={{ color: '#ffffff', backgroundColor: '#1e1e20' }}
                    value={selectedRating}
                    onChange={(e) => {
                      setSelectedRating(e.target.value);
                    }}
                    data-testid="filter-rating"
                  >
                    <option value="">Any rating</option>
                    <option value="5">5 stars</option>
                    <option value="4">4+ stars</option>
                    <option value="3">3+ stars</option>
                  </select>
                </div>
              </div>

              {/* Services Filter */}
              <div className="flex flex-col h-full relative lg:col-span-2 lg:max-w-[75%]" ref={servicesDropdownRef}>
                <label className="text-sm font-medium text-foreground mb-3 block">Services</label>
                <div>
                  <button
                  type="button"
                  className="w-full h-[42px] px-3 py-2 border border-muted rounded-md text-left flex items-center justify-between"
                  style={{ color: '#ffffff', backgroundColor: '#1e1e20' }}
                  onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                  data-testid="filter-services"
                >
                  <span className="truncate">
                    {selectedServices.length === 0
                      ? 'All services'
                      : selectedServices.length === 1
                      ? selectedServices[0]
                      : `${selectedServices.length} services selected`
                    }
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {servicesDropdownOpen && (
                  <div className="absolute z-50 w-full mt-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Select Services ({selectedServices.length})
                        </span>
                        {selectedServices.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedServices([])}
                            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            data-testid="clear-services"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto">
                        {services.map((service) => (
                          <div key={service} className="flex items-center space-x-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                            <Checkbox
                              id={`service-${service}`}
                              checked={selectedServices.includes(service)}
                              onCheckedChange={(checked) => handleServiceChange(service, checked as boolean)}
                            />
                            <label
                              htmlFor={`service-${service}`}
                              className="text-sm text-gray-700 dark:text-gray-300 leading-tight cursor-pointer flex-1"
                            >
                              {service}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* Emergency Services */}
              <div className="flex flex-col h-full">
                <label className="text-sm font-medium text-foreground mb-3 block">Emergency Services</label>
                <div>
                  <div className="h-[42px] flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="emergency-services"
                      className="rounded"
                      checked={hasEmergencyServices}
                      onChange={(e) => {
                        setHasEmergencyServices(e.target.checked);
                      }}
                      data-testid="filter-emergency"
                    />
                    <label htmlFor="emergency-services" className="text-sm text-foreground">
                      Available 24/7
                    </label>
                  </div>
                </div>
              </div>

              {/* Apply Filters Button */}
              <div className="flex flex-col h-full">
                <label className="text-sm font-medium text-foreground mb-3 block opacity-0 pointer-events-none" aria-hidden="true">
                  Filters
                </label>
                <div>
                  <button 
                    className="w-full h-[42px] px-4 rounded-md text-white font-medium hover:opacity-90"
                    style={{ backgroundColor: '#3c258e' }}
                    onClick={() => {
                      const newFilters: any = {};
                      
                      if (selectedDistance) {
                        // Convert display distance to storage format (always store in miles)
                        const storageDistance = convertDistanceForStorage(parseFloat(selectedDistance), userCountry);
                        newFilters.maxDistance = storageDistance;
                      }
                      
                      if (selectedRating) {
                        newFilters.minRating = parseFloat(selectedRating);
                      }
                      
                      if (hasEmergencyServices) {
                        newFilters.hasEmergencyServices = true;
                      }
                      
                      if (selectedServices.length > 0) {
                        newFilters.services = selectedServices;
                      }
                      
                      handleFiltersChange(newFilters);
                      setServicesDropdownOpen(false);
                    }}
                    data-testid="button-apply-filters"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Contractors Section */}
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
                <h3 className="text-lg font-medium mb-2 text-[#ffffff]">No contractors found</h3>
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
      </main>
    </div>
  );
}
