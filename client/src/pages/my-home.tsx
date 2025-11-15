import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertHouseSchema } from "@shared/schema";
import type { House } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Wrench, Home, MapPin, Edit, Trash2, Plus, Building, Thermometer, AlertTriangle, ChevronRight, Crown, BarChart3, Copy, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Form schema for house creation/editing
const houseFormSchema = insertHouseSchema.extend({
  homeSystems: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
});

type HouseFormData = z.infer<typeof houseFormSchema>;

const CLIMATE_ZONES = [
  // United States
  { value: "1", label: "Zone 1 - Very Cold (Alaska, Northern Maine)" },
  { value: "2", label: "Zone 2 - Cold (Northern States)" },
  { value: "3", label: "Zone 3 - Cool (Northern Mid-States)" },
  { value: "4", label: "Zone 4 - Mixed (Mid-Atlantic, Lower Great Lakes)" },
  { value: "5", label: "Zone 5 - Warm-Humid (Southeast)" },
  { value: "6", label: "Zone 6 - Hot-Humid (Deep South, Gulf Coast)" },
  { value: "7", label: "Zone 7 - Very Hot-Humid (Southern Florida)" },
  { value: "8", label: "Zone 8 - Hot-Dry (Southwest)" },
  
  // Canada
  { value: "ca_1", label: "Canada Zone 1 - Very Cold (Northern Territories, Northern Quebec)" },
  { value: "ca_2", label: "Canada Zone 2 - Cold (Prairie Provinces, Northern Ontario)" },
  { value: "ca_3", label: "Canada Zone 3 - Cool (Central Canada)" },
  { value: "ca_4", label: "Canada Zone 4 - Moderate (Toronto, Montreal, Ottawa)" },
  { value: "ca_5", label: "Canada Zone 5 - Mild (Southern Ontario, Atlantic Canada)" },
  { value: "ca_6", label: "Canada Zone 6 - Coastal (Vancouver, Victoria)" },
  
  // United Kingdom
  { value: "uk_1", label: "UK Zone 1 - Scottish Highlands, Northern Scotland" },
  { value: "uk_2", label: "UK Zone 2 - Northern England, Wales, Central Scotland" },
  { value: "uk_3", label: "UK Zone 3 - Southern England, Northern Ireland" },
  { value: "uk_4", label: "UK Zone 4 - London, Southeast England" },
  { value: "uk_5", label: "UK Zone 5 - Southwest England, Coastal Areas" },
  
  // Australia
  { value: "au_1", label: "Australia Zone 1 - Tropical North (Darwin, Cairns)" },
  { value: "au_2", label: "Australia Zone 2 - Sub-tropical (Brisbane, Gold Coast)" },
  { value: "au_3", label: "Australia Zone 3 - Temperate (Sydney, Melbourne)" },
  { value: "au_4", label: "Australia Zone 4 - Cool Temperate (Tasmania, Alpine areas)" },
  { value: "au_5", label: "Australia Zone 5 - Mediterranean (Perth, Adelaide)" },
  { value: "au_6", label: "Australia Zone 6 - Hot Dry (Central Australia)" },
  { value: "au_7", label: "Australia Zone 7 - Desert (Outback)" },
  { value: "au_8", label: "Australia Zone 8 - Coastal (Various coastal regions)" },
];

const HOME_SYSTEMS = [
  "Central Air",
  "Heat Pump",
  "Gas Furnace",
  "Electric Heat",
  "Baseboard Heat",
  "Boiler",
  "Forced Air",
  "Radiant Heat",
  "Window AC Units",
  "Ductless Mini-Split",
  "Solar Panels",
  "Geothermal",
  "Well Water",
  "City Water",
  "Septic System",
  "City Sewer",
  "Gas Water Heater",
  "Electric Water Heater",
  "Tankless Water Heater",
  "Security System",
  "Irrigation System",
  "Pool/Spa",
  "Fireplace",
  "Wood Stove",
  "Generator"
];

interface MaintenanceTasksResponse {
  house: House;
  currentMonth: string;
  region: string;
  tasks: {
    seasonal: string[];
    weatherSpecific: string[];
    priority: 'high' | 'medium' | 'low';
  };
}

export default function MyHome() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check authentication and role - allow both homeowners and contractors
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !['homeowner', 'contractor'].includes((user as any)?.role))) {
      setLocation('/');
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#2c0f5b' }}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-2">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated as homeowner or contractor
  if (!isAuthenticated || !['homeowner', 'contractor'].includes((user as any)?.role)) {
    return null;
  }

  // Fetch user's houses
  const { data: houses = [], isLoading: housesLoading } = useQuery<House[]>({
    queryKey: ['/api/houses'],
    queryFn: async () => {
      const response = await fetch('/api/houses');
      if (!response.ok) throw new Error('Failed to fetch houses');
      return response.json();
    },
  });

  // Fetch maintenance tasks for selected house
  const { data: maintenanceTasks, isLoading: tasksLoading } = useQuery<MaintenanceTasksResponse>({
    queryKey: ['/api/houses/tasks', selectedHouse?.id],
    queryFn: async () => {
      if (!selectedHouse) return null;
      const response = await fetch(`/api/houses/${selectedHouse.id}/maintenance-tasks`);
      if (!response.ok) throw new Error('Failed to fetch maintenance tasks');
      return response.json();
    },
    enabled: !!selectedHouse,
  });

  // Set default selected house when houses load
  useEffect(() => {
    if (houses.length > 0 && !selectedHouse) {
      const defaultHouse = houses.find(h => h.isDefault) || houses[0];
      setSelectedHouse(defaultHouse);
    }
  }, [houses, selectedHouse]);
  
  // Property limit logic
  const hasReachedLimit = !(user as any)?.isPremium && houses.length >= 2;
  const canAddProperty = (user as any)?.isPremium || houses.length < 2;
  const hasMultipleProperties = houses.length >= 3;
  const isSuperUser = hasMultipleProperties && (user as any)?.isPremium;

  // Geolocation functions for address autocomplete
  const getAddressSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      // Use LocationIQ API for address suggestions with focus on UK, Canada, Australia
      const response = await fetch(
        `https://us1.locationiq.com/v1/search.php?key=${import.meta.env.VITE_LOCATIONIQ_API_KEY || 'pk.3e1d1a4cb7bf7b8b11e0e0a2d9f4e5c6'}&q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=gb,ca,au,us`
      );
      
      if (!response.ok) {
        // Fallback to OpenStreetMap Nominatim
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=gb,ca,au,us`
        );
        if (nominatimResponse.ok) {
          const data = await nominatimResponse.json();
          setAddressSuggestions(data);
          setShowSuggestions(true);
        }
      } else {
        const data = await response.json();
        setAddressSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setAddressSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const geocodeAddress = async (address: string) => {
    try {
      // Use LocationIQ for geocoding
      const response = await fetch(
        `https://us1.locationiq.com/v1/search.php?key=${import.meta.env.VITE_LOCATIONIQ_API_KEY || 'pk.3e1d1a4cb7bf7b8b11e0e0a2d9f4e5c6'}&q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`
      );
      
      let result = null;
      if (!response.ok) {
        // Fallback to OpenStreetMap Nominatim
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`
        );
        if (nominatimResponse.ok) {
          const data = await nominatimResponse.json();
          result = data[0];
        }
      } else {
        const data = await response.json();
        result = data[0];
      }

      if (result) {
        const countryCode = result.address?.country_code?.toLowerCase();
        const country = result.address?.country;
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        // Auto-detect climate zone based on location
        let detectedZone = '';
        if (countryCode === 'gb') {
          // UK climate zones based on latitude
          if (lat > 57) detectedZone = 'uk_1'; // Scottish Highlands
          else if (lat > 55) detectedZone = 'uk_2'; // Northern England, Scotland
          else if (lat > 52) detectedZone = 'uk_3'; // Southern England, Northern Ireland
          else if (lat > 50.5) detectedZone = 'uk_4'; // London, Southeast
          else detectedZone = 'uk_5'; // Southwest England, Coastal
        } else if (countryCode === 'ca') {
          // Canada climate zones based on latitude
          if (lat > 60) detectedZone = 'ca_1'; // Very Cold
          else if (lat > 55) detectedZone = 'ca_2'; // Cold
          else if (lat > 50) detectedZone = 'ca_3'; // Cool
          else if (lat > 45) detectedZone = 'ca_4'; // Moderate
          else if (lat > 40) detectedZone = 'ca_5'; // Mild
          else detectedZone = 'ca_6'; // Coastal
        } else if (countryCode === 'au') {
          // Australia climate zones based on latitude and location
          const state = result.address?.state?.toLowerCase();
          if (lat < -35) detectedZone = 'au_4'; // Cool Temperate (Tasmania)
          else if (lat < -30 && (state?.includes('western') || state?.includes('south'))) detectedZone = 'au_5'; // Mediterranean
          else if (lat < -30) detectedZone = 'au_3'; // Temperate
          else if (lat < -25) detectedZone = 'au_2'; // Sub-tropical
          else if (lat < -20) detectedZone = 'au_1'; // Tropical North
          else if (lon > 130) detectedZone = 'au_6'; // Hot Dry Central
          else detectedZone = 'au_7'; // Desert Outback
        } else if (countryCode === 'us') {
          // US climate zones (existing logic)
          if (lat > 47) detectedZone = '1';
          else if (lat > 45) detectedZone = '2';
          else if (lat > 42) detectedZone = '3';
          else if (lat > 38) detectedZone = '4';
          else if (lat > 33) detectedZone = '5';
          else if (lat > 30) detectedZone = '6';
          else if (lat > 25) detectedZone = '7';
          else detectedZone = '8';
        }

        if (detectedZone) {
          form.setValue('climateZone', detectedZone);
          toast({
            title: "Climate zone detected",
            description: `Auto-set climate zone for ${country}`,
          });
        }
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
  };

  // Debounce address suggestions
  const [addressDebounceTimer, setAddressDebounceTimer] = useState<NodeJS.Timeout>();
  
  const handleAddressChange = (address: string) => {
    form.setValue('address', address);
    
    // Clear existing timer
    if (addressDebounceTimer) {
      clearTimeout(addressDebounceTimer);
    }
    
    // Set new timer for suggestions
    const suggestionTimer = setTimeout(() => {
      getAddressSuggestions(address);
    }, 300);
    setAddressDebounceTimer(suggestionTimer);
    
    // Set separate timer for geocoding
    const geocodeTimer = setTimeout(() => {
      if (address.length > 10) {
        geocodeAddress(address);
      }
    }, 1000);
  };

  const handleSuggestionSelect = (suggestion: any) => {
    const fullAddress = suggestion.display_name;
    form.setValue('address', fullAddress);
    setShowSuggestions(false);
    setAddressSuggestions([]);
    
    // Auto-geocode the selected address
    geocodeAddress(fullAddress);
  };

  const form = useForm<HouseFormData>({
    resolver: zodResolver(houseFormSchema),
    defaultValues: {
      name: "",
      address: "",
      climateZone: "",
      homeSystems: [],
      isDefault: houses.length === 0,
    },
  });

  // Create house mutation
  const createHouseMutation = useMutation({
    mutationFn: async (data: HouseFormData) => {
      const houseData = {
        ...data,
        homeownerId: (user as any)?.id,
      };
      const response = await apiRequest('/api/houses', 'POST', houseData);
      return response.json();
    },
    onSuccess: (newHouse) => {
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
      setShowCreateDialog(false);
      setSelectedHouse(newHouse);
      toast({
        title: "Success",
        description: "Your home has been added successfully!",
      });
      form.reset();
    },
    onError: (error: any) => {
      // Handle property limit errors
      if (error.status === 403 && error.body?.code === "PLAN_LIMIT_EXCEEDED") {
        setShowCreateDialog(false);
        setShowUpgradeDialog(true);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to create house. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update house mutation
  const updateHouseMutation = useMutation({
    mutationFn: async ({ houseId, data }: { houseId: string; data: Partial<HouseFormData> }) => {
      const response = await apiRequest(`/api/houses/${houseId}`, 'PUT', data);
      return response.json();
    },
    onSuccess: (updatedHouse) => {
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
      setEditingHouse(null);
      if (selectedHouse?.id === updatedHouse.id) {
        setSelectedHouse(updatedHouse);
      }
      toast({
        title: "Success",
        description: "Your home has been updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update house. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete house mutation
  const deleteHouseMutation = useMutation({
    mutationFn: async (houseId: string) => {
      const response = await apiRequest(`/api/houses/${houseId}`, 'DELETE');
      return response.json();
    },
    onSuccess: (_, deletedHouseId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
      if (selectedHouse?.id === deletedHouseId) {
        setSelectedHouse(null);
      }
      toast({
        title: "Success",
        description: "House deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete house. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Super user functionality (already defined above with premium check)
  
  const handleBulkDelete = async () => {
    if (selectedForBulk.length === 0) return;
    
    try {
      await Promise.all(
        selectedForBulk.map(id => deleteHouseMutation.mutateAsync(id))
      );
      setSelectedForBulk([]);
      setBulkSelectMode(false);
      toast({
        title: "Success",
        description: `${selectedForBulk.length} properties deleted successfully`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to delete some properties",
        variant: "destructive",
      });
    }
  };

  const handleBulkSelect = (houseId: string, selected: boolean) => {
    if (selected) {
      setSelectedForBulk(prev => [...prev, houseId]);
    } else {
      setSelectedForBulk(prev => prev.filter(id => id !== houseId));
    }
  };

  const createPropertyFromTemplate = async (templateHouse: House) => {
    // Check property limit before attempting to create
    if (hasReachedLimit) {
      setShowTemplateDialog(false);
      setShowUpgradeDialog(true);
      return;
    }
    
    const templateData = {
      name: `${templateHouse.name} - Copy`,
      address: "",
      climateZone: templateHouse.climateZone,
      homeSystems: templateHouse.homeSystems || [],
      isDefault: false,
      homeownerId: (user as any)?.id,
    };
    
    try {
      await createHouseMutation.mutateAsync(templateData);
      setShowTemplateDialog(false);
    } catch (error) {
      // Error handling already in mutation
    }
  };

  const onSubmit = (data: HouseFormData) => {
    if (editingHouse) {
      updateHouseMutation.mutate({ houseId: editingHouse.id, data });
    } else {
      createHouseMutation.mutate(data);
    }
  };

  const handleEdit = (house: House) => {
    setEditingHouse(house);
    form.reset({
      name: house.name,
      address: house.address,
      climateZone: house.climateZone,
      homeSystems: house.homeSystems,
      isDefault: house.isDefault,
    });
    setShowCreateDialog(true);
  };

  const handleDelete = (house: House) => {
    if (confirm(`Are you sure you want to delete ${house.name}?`)) {
      deleteHouseMutation.mutate(house.id);
    }
  };

  if (housesLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#2c0f5b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-2">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#2c0f5b' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4" data-testid="text-page-title">
            My Home
          </h1>
          <p className="text-xl" style={{ color: '#b6a6f4' }}>
            Manage your personal property and track maintenance tasks
          </p>
        </div>

        {houses.length === 0 ? (
          // No houses - show create form
          <Card className="border-gray-300 shadow-lg" style={{ background: '#f2f2f2' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                <Home className="h-6 w-6" />
                Add Your First Home
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6" style={{ color: '#2c0f5b' }}>
                Let's get started by adding your home information. This will help us provide personalized maintenance recommendations.
              </p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                className="hover:opacity-90"
                data-testid="button-add-home"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add My Home
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* House Selection */}
            {/* Super User Section for 3+ properties */}
            {isSuperUser && (
              <Card className="border-purple-600 shadow-lg" style={{ background: 'linear-gradient(135deg, #2c0f5b 0%, #4c1d95 100%)' }}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <Crown className="h-6 w-6 text-yellow-400" />
                      Super User Dashboard
                      <Badge variant="secondary" className="bg-yellow-400 text-purple-900 font-medium">
                        {houses.length} Properties
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Quick Stats */}
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <BarChart3 className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                      <p className="text-white font-semibold">{houses.length}</p>
                      <p className="text-purple-200 text-sm">Total Properties</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <Settings className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                      <p className="text-white font-semibold">{houses.filter(h => h.isDefault).length}</p>
                      <p className="text-purple-200 text-sm">Default Property</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <Calendar className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                      <p className="text-white font-semibold">Active</p>
                      <p className="text-purple-200 text-sm">All Properties</p>
                    </div>
                  </div>
                  
                  {/* Super User Actions */}
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      onClick={() => setBulkSelectMode(!bulkSelectMode)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      variant="outline"
                      data-testid="button-bulk-select"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {bulkSelectMode ? 'Exit Bulk Mode' : 'Bulk Management'}
                    </Button>
                    
                    <Button 
                      onClick={() => setShowTemplateDialog(true)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      variant="outline"
                      data-testid="button-template"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Create from Template
                    </Button>
                    
                    {bulkSelectMode && selectedForBulk.length > 0 && (
                      <Button 
                        onClick={handleBulkDelete}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        data-testid="button-bulk-delete"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedForBulk.length})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-gray-300 shadow-lg" style={{ background: '#f2f2f2' }}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between" style={{ color: '#2c0f5b' }}>
                  <div className="flex items-center gap-2">
                    <Building className="h-6 w-6" />
                    Your Properties
                    {isSuperUser && (
                      <Badge variant="outline" className="border-purple-600 text-purple-600">
                        <Crown className="h-3 w-3 mr-1" />
                        Super User
                      </Badge>
                    )}
                  </div>
                  {canAddProperty ? (
                    <Button 
                      onClick={() => {
                        setEditingHouse(null);
                        form.reset({
                          name: "",
                          address: "",
                          climateZone: "",
                          homeSystems: [],
                          isDefault: false,
                        });
                        setShowCreateDialog(true);
                      }}
                      style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                      className="hover:opacity-90"
                      data-testid="button-add-property"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowUpgradeDialog(true)}
                      style={{ backgroundColor: '#b6a6f4', color: '#2c0f5b', borderColor: '#2c0f5b' }}
                      className="hover:opacity-90 border-2"
                      data-testid="button-upgrade-required"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Add More
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {houses.map((house) => (
                    <div
                      key={house.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedHouse?.id === house.id
                          ? 'border-purple-600 bg-purple-50'
                          : selectedForBulk.includes(house.id) 
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-purple-400'
                      } ${bulkSelectMode ? '' : 'cursor-pointer'}`}
                      onClick={() => !bulkSelectMode && setSelectedHouse(house)}
                      data-testid={`card-house-${house.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {bulkSelectMode && (
                            <input
                              type="checkbox"
                              checked={selectedForBulk.includes(house.id)}
                              onChange={(e) => handleBulkSelect(house.id, e.target.checked)}
                              className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 flex-shrink-0"
                              data-testid={`checkbox-bulk-${house.id}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <Home className="h-5 w-5 flex-shrink-0" style={{ color: '#2c0f5b' }} />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold" style={{ color: '#2c0f5b' }}>
                              {house.name}
                              {house.isDefault && (
                                <Badge variant="secondary" className="ml-2">Default</Badge>
                              )}
                            </h3>
                            <p className="text-sm flex items-center gap-1 break-words" style={{ color: '#2c0f5b' }}>
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="break-words">{house.address}</span>
                            </p>
                            <p className="text-sm" style={{ color: '#2c0f5b' }}>
                              Climate Zone: {house.climateZone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 sm:self-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(house);
                            }}
                            data-testid={`button-edit-house-${house.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {houses.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(house);
                              }}
                              data-testid={`button-delete-house-${house.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {selectedHouse?.id === house.id && (
                            <ChevronRight className="h-4 w-4" style={{ color: '#2c0f5b' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Tasks for Selected House */}
            {selectedHouse && (
              <Card className="border-gray-300 shadow-lg" style={{ background: '#f2f2f2' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                    <Wrench className="h-6 w-6" />
                    {maintenanceTasks?.currentMonth} Maintenance Tasks - {selectedHouse.name}
                  </CardTitle>
                  {maintenanceTasks && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#2c0f5b' }}>
                      <Thermometer className="h-4 w-4" />
                      <span>Region: {maintenanceTasks.region}</span>
                      <Badge 
                        variant={maintenanceTasks.tasks.priority === 'high' ? 'destructive' : 
                                maintenanceTasks.tasks.priority === 'medium' ? 'default' : 'secondary'}
                      >
                        {maintenanceTasks.tasks.priority.toUpperCase()} Priority
                      </Badge>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {tasksLoading ? (
                    <div className="text-center py-8">
                      <div className="text-lg" style={{ color: '#2c0f5b' }}>Loading maintenance tasks...</div>
                    </div>
                  ) : maintenanceTasks ? (
                    <div className="space-y-6">
                      {/* Seasonal Tasks */}
                      {maintenanceTasks.tasks.seasonal.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                            <Calendar className="h-4 w-4" />
                            Seasonal Tasks
                          </h3>
                          <div className="space-y-2">
                            {maintenanceTasks.tasks.seasonal.map((task, index) => (
                              <div
                                key={index}
                                className="p-3 border rounded-lg bg-white"
                                data-testid={`task-seasonal-${index}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" style={{ color: '#2c0f5b' }} />
                                  <span style={{ color: '#2c0f5b' }}>{task}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Weather-Specific Tasks */}
                      {maintenanceTasks.tasks.weatherSpecific.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                            <AlertTriangle className="h-4 w-4" />
                            Weather-Specific Tasks
                          </h3>
                          <div className="space-y-2">
                            {maintenanceTasks.tasks.weatherSpecific.map((task, index) => (
                              <div
                                key={index}
                                className="p-3 border rounded-lg bg-white"
                                data-testid={`task-weather-${index}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" style={{ color: '#2c0f5b' }} />
                                  <span style={{ color: '#2c0f5b' }}>{task}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {maintenanceTasks.tasks.seasonal.length === 0 && maintenanceTasks.tasks.weatherSpecific.length === 0 && (
                        <div className="text-center py-8">
                          <div className="text-lg" style={{ color: '#2c0f5b' }}>
                            No specific maintenance tasks for this month.
                          </div>
                          <p className="text-sm mt-2" style={{ color: '#2c0f5b' }}>
                            Check back next month for updated recommendations.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-lg" style={{ color: '#2c0f5b' }}>
                        Select a house to view maintenance tasks
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create/Edit House Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingHouse ? 'Edit Property' : 'Add New Property'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Main House, Vacation Home" 
                          {...field}
                          data-testid="input-house-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (UK, Canada, Australia, US supported)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="Start typing address (e.g., 10 Downing Street, London)" 
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleAddressChange(e.target.value);
                            }}
                            data-testid="input-house-address"
                          />
                          {isLoadingSuggestions && (
                            <div className="absolute right-3 top-3">
                              <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                            </div>
                          )}
                          {/* Address suggestions dropdown */}
                          {showSuggestions && addressSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
                              {addressSuggestions.map((suggestion, index) => (
                                <div
                                  key={index}
                                  className="px-4 py-2 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onClick={() => handleSuggestionSelect(suggestion)}
                                  data-testid={`address-suggestion-${index}`}
                                >
                                  <div className="font-medium text-sm text-gray-900">
                                    {suggestion.display_name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {suggestion.address?.country || 'Unknown country'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                      <div className="text-xs text-gray-500 mt-1">
                        🌍 International support: Type addresses from UK, Canada, Australia, or US for automatic climate zone detection
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="climateZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Climate Zone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-climate-zone">
                            <SelectValue placeholder="Select climate zone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CLIMATE_ZONES.map((zone) => (
                            <SelectItem key={zone.value} value={zone.value}>
                              {zone.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="homeSystems"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home Systems (Optional)</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            const currentSystems = field.value || [];
                            if (!currentSystems.includes(value)) {
                              field.onChange([...currentSystems, value]);
                            }
                          }}
                        >
                          <SelectTrigger data-testid="select-home-systems">
                            <SelectValue placeholder="Add home systems" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOME_SYSTEMS.map((system) => (
                              <SelectItem key={system} value={system}>
                                {system}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value.map((system, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                const newSystems = field.value.filter((_, i) => i !== index);
                                field.onChange(newSystems);
                              }}
                              data-testid={`badge-system-${index}`}
                            >
                              {system} ×
                            </Badge>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createHouseMutation.isPending || updateHouseMutation.isPending}
                    style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                    className="hover:opacity-90"
                    data-testid="button-save-house"
                  >
                    {createHouseMutation.isPending || updateHouseMutation.isPending 
                      ? 'Saving...' 
                      : editingHouse ? 'Update Property' : 'Add Property'
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Template Creation Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Property from Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">Select a property to use as a template. The new property will copy the climate zone and home systems configuration.</p>
              <div className="grid gap-3 max-h-80 overflow-y-auto">
                {houses.map((house) => (
                  <div
                    key={house.id}
                    className="p-4 border rounded-lg hover:bg-purple-50 cursor-pointer transition-colors"
                    onClick={() => createPropertyFromTemplate(house)}
                    data-testid={`template-house-${house.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Copy className="h-5 w-5 text-purple-600" />
                      <div>
                        <h4 className="font-semibold text-purple-900">{house.name}</h4>
                        <p className="text-sm text-gray-600">{house.address}</p>
                        <p className="text-sm text-gray-500">Climate Zone: {house.climateZone}</p>
                        {house.homeSystems && house.homeSystems.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {house.homeSystems.slice(0, 3).map((system, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {system}
                              </Badge>
                            ))}
                            {house.homeSystems.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{house.homeSystems.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upgrade Dialog */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-900">
                <Crown className="h-6 w-6 text-purple-600" />
                Upgrade to Premium
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <div className="bg-purple-50 p-6 rounded-lg">
                  <Crown className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">
                    Manage More Properties
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You've reached the limit of 2 properties on the Base plan ($3/month). Upgrade to Premium ($10/month) to manage up to 10 properties and unlock advanced features.
                  </p>
                  <div className="space-y-2 text-left bg-white p-4 rounded border">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Up to 10 properties</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Bulk management tools</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Property templates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Advanced analytics</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUpgradeDialog(false)}
                  className="flex-1"
                  data-testid="button-cancel-upgrade"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={() => {
                    setShowUpgradeDialog(false);
                    window.location.href = '/billing';
                  }}
                  style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                  className="hover:opacity-90 flex-1"
                  data-testid="button-upgrade-now"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}