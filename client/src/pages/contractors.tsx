import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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

  // Fetch contractors used at the selected house
  const { data: contractorsUsedAtHouse = [], isLoading: contractorsUsedLoading } = useQuery<Contractor[]>({
    queryKey: ['/api/houses', selectedHouseId, 'contractors-used'],
    enabled: isAuthenticated && !!homeownerId && userRole === 'homeowner' && !!selectedHouseId
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
    "Carpet Cleaning",
    "Carpet Installation",
    "Chimney & Fireplace Services",
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
    "Local Moving",
    "Locksmiths",
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
    "Window Cleaning",
    "Windows & Door Installation"
  ];

  // Track if we've already initialized filters from URL to prevent resets
  const hasInitializedFromUrl = useRef(false);

  // Map task categories to actual service names in the contractors list
  const mapCategoryToServices = (category: string): string[] => {
    const categoryMap: Record<string, string[]> = {
      'hvac': ['HVAC Installation', 'HVAC Services', 'Handyman Services'],
      'plumbing': ['Plumbing Services', 'Handyman Services'],
      'electrical': ['Electrical Services', 'Handyman Services'],
      'roofing': ['Roofing Services', 'Handyman Services'],
      'landscaping': ['Lawn & Landscaping', 'Landscape Design', 'Handyman Services'],
      'painting': ['Interior Painting', 'Exterior Painting', 'Handyman Services'],
      'flooring': ['Carpet Installation', 'Hardwood Flooring', 'Laminate & Vinyl Flooring', 'Tile Installation', 'Handyman Services'],
      'exterior': ['Exterior Painting', 'Pressure Washing', 'Siding Installation', 'Handyman Services'],
      'carpentry': ['Trim & Finish Carpentry', 'Deck Building & Repair', 'Handyman Services'],
      'foundation': ['Foundation Repair', 'Handyman Services'],
      'appliance': ['Appliance Repair', 'Handyman Services'],
      'garage': ['Garage Door Services', 'Handyman Services'],
      'gutter': ['Gutter Cleaning & Repair', 'Handyman Services'],
      'insulation': ['Insulation Services', 'Handyman Services'],
      'tree': ['Tree Service & Trimming', 'Handyman Services']
    };
    
    const lowerCategory = category.toLowerCase();
    return categoryMap[lowerCategory] || [category, 'Handyman Services'];
  };

  // Parse URL parameters on initial load only
  useEffect(() => {
    if (hasInitializedFromUrl.current) return;
    
    const params = new URLSearchParams(location.split('?')[1] || '');
    const searchQuery = params.get('q') || '';
    const searchLocation = params.get('location') || '';
    const category = params.get('category') || '';
    const service = params.get('service') || '';
    const houseId = params.get('houseId') || '';
    const maxDistance = params.get('maxDistance') || '';
    
    // Build filters from URL params
    const urlFilters: any = {};
    if (searchQuery) urlFilters.searchQuery = searchQuery;
    if (searchLocation) urlFilters.searchLocation = searchLocation;
    
    // Map category to actual service names
    let servicesToFilter: string[] = [];
    if (category) {
      servicesToFilter = mapCategoryToServices(category);
    }
    if (service) {
      // Also check if the service itself exists in our services list
      if (services.includes(service)) {
        servicesToFilter.push(service);
      }
    }
    if (servicesToFilter.length > 0) {
      urlFilters.services = Array.from(new Set(servicesToFilter)); // Remove duplicates
    }
    
    if (maxDistance) {
      const parsedDistance = parseInt(maxDistance);
      if (!isNaN(parsedDistance) && parsedDistance > 0) {
        urlFilters.maxDistance = parsedDistance;
      }
    }
    if (houseId) urlFilters.houseId = houseId;
    
    if (Object.keys(urlFilters).length > 0) {
      // Set filters and enable search when URL params exist
      setFilters(urlFilters);
      setHasAppliedFilters(true);
      hasInitializedFromUrl.current = true;
      
      // Pre-fill the search query field
      if (searchQuery) setSearchQuery(searchQuery);
      
      // Pre-select the house and distance in UI
      if (houseId) setSelectedHouseId(houseId);
      if (maxDistance) setSelectedDistance(maxDistance);
      // Pre-select services in UI
      if (servicesToFilter.length > 0) {
        setSelectedServices(servicesToFilter);
      }
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

  // Don't auto-set location filter - wait for user to search
  // (This prevents showing contractors without an explicit search)

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

  // Track if filters have been applied at least once
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);

  const { data: contractors, isLoading, error } = useQuery<(Contractor & { isBoosted?: boolean })[]>({
    queryKey: filters.searchQuery || filters.searchLocation 
      ? ['/api/contractors/search', filters]
      : ['/api/contractors', filters],
    enabled: hasAppliedFilters, // Only fetch when user has explicitly applied filters
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Always include filter parameters
      if (filters.services) params.set('services', filters.services.join(','));
      if (filters.minRating) params.set('minRating', filters.minRating.toString());
      if (filters.availableThisWeek) params.set('availableThisWeek', 'true');
      if (filters.hasEmergencyServices) params.set('hasEmergencyServices', 'true');
      if (filters.maxDistance) params.set('maxDistance', filters.maxDistance.toString());
      if (filters.houseId) params.set('houseId', filters.houseId);
      
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
        // Treat missing distance as Infinity so contractors without location data sort last
        const distA = a.distance ? parseFloat(a.distance) : Infinity;
        const distB = b.distance ? parseFloat(b.distance) : Infinity;
        return distA - distB;
      default:
        return 0;
    }
  }) : [];

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
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
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Hero Section */}
      <section className="py-8 sm:py-12 lg:py-16" style={{ background: 'transparent' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">
              Find Trusted Contractors
            </h1>
            <p className="text-sm sm:text-base lg:text-lg max-w-3xl mx-auto text-gray-600">
              Connect with verified professionals specializing in niche home services
            </p>
          </div>
        </div>
      </section>
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* Find Contractor Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">
            Find Contractor
          </h2>
          
          {/* Horizontal Filters */}
          <div className="bg-card rounded-xl shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-6">Find Your Perfect Contractor</h3>
            
            {/* House Selection Banner - Only show for authenticated homeowners with houses */}
            {isAuthenticated && userRole === 'homeowner' && houses.length > 0 && selectedHouseId && (
              <div className="col-span-full mb-4 p-3 sm:p-4 rounded-lg" style={{ backgroundColor: '#f0ebfa', border: '2px solid #b6a6f4' }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Home className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: '#6B46C1' }} />
                    <div>
                      <p className="text-xs sm:text-sm font-medium" style={{ color: '#6B46C1' }}>Searching near:</p>
                      <p className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#2c0f5b' }}>
                        {houses.find((h: House) => h.id === selectedHouseId)?.name}
                      </p>
                      <p className="text-xs sm:text-sm" style={{ color: '#4a3670' }}>
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
                    <SelectTrigger className="w-full sm:w-64 h-auto min-h-[52px] sm:min-h-[60px] py-2 sm:py-3 text-sm sm:text-base" style={{ backgroundColor: '#ffffff', color: '#2c0f5b', border: '1px solid #b6a6f4' }}>
                      <SelectValue placeholder="Change property..." />
                    </SelectTrigger>
                    <SelectContent>
                      {houses.map((house: House) => (
                        <SelectItem key={house.id} value={house.id}>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm sm:text-base">{house.name}</span>
                            <span className="text-xs text-muted-foreground">{house.address}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">

              {/* Distance Filter */}
              <div className="flex flex-col h-full">
                <label className="text-sm font-medium text-foreground mb-3 block whitespace-nowrap">Distance ({getDistanceUnit(userCountry)})</label>
                <div>
                  <select 
                    className="w-full h-[42px] px-3 py-2 border rounded-md"
                    style={{ color: '#2c0f5b', backgroundColor: '#ffffff', borderColor: '#b6a6f4' }}
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
                <div className="text-xs text-gray-600 mt-1">
                  🌍 {userCountry === 'US' ? 'Using miles for US locations' : 'Using kilometers for international locations'}
                </div>
              </div>

              {/* Rating Filter */}
              <div className="flex flex-col h-full">
                <label className="text-sm font-medium text-foreground mb-3 block">Minimum Rating</label>
                <div>
                  <select 
                    className="w-full h-[42px] px-3 py-2 border rounded-md"
                    style={{ color: '#2c0f5b', backgroundColor: '#ffffff', borderColor: '#b6a6f4' }}
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
                  className="w-full h-[42px] px-3 py-2 border rounded-md text-left flex items-center justify-between"
                  style={{ color: '#2c0f5b', backgroundColor: '#ffffff', borderColor: '#b6a6f4' }}
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
                      setHasAppliedFilters(true); // Enable contractor search
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

        {/* Your Contractors at This House Section */}
        {isAuthenticated && userRole === 'homeowner' && selectedHouseId && contractorsUsedAtHouse.length > 0 && (
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 text-gray-900">
                Your Contractors at {houses.find(h => h.id === selectedHouseId)?.name}
              </h2>
              <p className="text-sm sm:text-base lg:text-lg" style={{ color: '#2c0f5b' }}>
                {contractorsUsedAtHouse.length} {contractorsUsedAtHouse.length === 1 ? 'contractor' : 'contractors'} you've worked with at this property
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {contractorsUsedAtHouse.map((contractor) => (
                <div key={contractor.id} className="relative">
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      Previously Used
                    </div>
                  </div>
                  <ContractorCard contractor={contractor} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Contractors Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">
                Available Contractors
              </h2>
              <p className="text-lg text-gray-600">
                {isLoading ? 'Loading...' : `${sortedContractors.length} verified contractors specializing in niche services`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Sort by:
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48" style={{ backgroundColor: '#ffffff', color: '#2c0f5b', borderColor: '#b6a6f4' }}>
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

        {!hasAppliedFilters && !filters.searchQuery && !filters.searchLocation ? (
              <div className="text-center py-16 bg-card rounded-xl shadow-sm border">
                <div className="max-w-md mx-auto">
                  <Search className="w-16 h-16 mx-auto mb-4" style={{ color: '#b6a6f4' }} />
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Ready to Find Contractors?</h3>
                  <p className="text-muted-foreground mb-4">
                    Use the filters above to search for contractors by distance, services, rating, and more.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Select your preferences and click "Apply Filters" to see available contractors.
                  </p>
                </div>
              </div>
            ) : isLoading ? (
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
                <h3 className="text-lg font-medium mb-2 text-gray-900">No contractors found</h3>
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
                    <span className="px-3 py-2 text-gray-400">...</span>
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
