import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertHomeApplianceSchema, insertMaintenanceLogSchema, insertCustomMaintenanceTaskSchema, insertHomeSystemSchema } from "@shared/schema";
import type { HomeAppliance, MaintenanceLog, House, CustomMaintenanceTask, HomeSystem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Wrench, DollarSign, MapPin, RotateCcw, ChevronDown, Settings, Plus, Edit, Trash2, Home, FileText, Building2, User, Building, Phone, MessageSquare } from "lucide-react";
import { AppointmentScheduler } from "@/components/appointment-scheduler";
import { CustomMaintenanceTasks } from "@/components/custom-maintenance-tasks";

// Google Maps API type declarations
declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteService: any;
          PlacesServiceStatus: any;
        };
      };
    };
  }
}

interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  month: number;
  climateZones: string[];
  priority: string;
  estimatedTime: string;
  difficulty: string;
  category: string;
  tools: string[] | null;
  cost: string | null;
  systemRequirements?: string[];
}

// Form schema for appliance creation/editing
const applianceFormSchema = insertHomeApplianceSchema.extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
});

// Form schema for maintenance log creation/editing
const maintenanceLogFormSchema = insertMaintenanceLogSchema.extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
});

// Form schema for house creation/editing
const houseFormSchema = z.object({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
  name: z.string().min(1, "House name is required"),
  address: z.string().min(1, "Address is required"),
  climateZone: z.string().min(1, "Climate zone is required"),
  homeSystems: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
});

// Form schema for custom maintenance task creation/editing
const customTaskFormSchema = insertCustomMaintenanceTaskSchema.extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
  tools: z.array(z.string()).optional(),
});

// Form schema for home system creation/editing
const homeSystemFormSchema = insertHomeSystemSchema.extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
  specificMonths: z.array(z.string()).optional(),
});

type ApplianceFormData = z.infer<typeof applianceFormSchema>;
type MaintenanceLogFormData = z.infer<typeof maintenanceLogFormSchema>;
type HouseFormData = z.infer<typeof houseFormSchema>;
type CustomTaskFormData = z.infer<typeof customTaskFormSchema>;

const APPLIANCE_TYPES = [
  { value: "hvac", label: "HVAC System" },
  { value: "water_heater", label: "Water Heater" },
  { value: "washer", label: "Washing Machine" },
  { value: "dryer", label: "Dryer" },
  { value: "dishwasher", label: "Dishwasher" },
  { value: "refrigerator", label: "Refrigerator" },
  { value: "oven", label: "Oven/Range" },
  { value: "garbage_disposal", label: "Garbage Disposal" },
  { value: "furnace", label: "Furnace" },
  { value: "boiler", label: "Boiler" },
  { value: "sump_pump", label: "Sump Pump" },
  { value: "water_softener", label: "Water Softener" },
  { value: "generator", label: "Generator" },
  { value: "pool_equipment", label: "Pool Equipment" },
  { value: "other", label: "Other" }
];

const APPLIANCE_LOCATIONS = [
  { value: "kitchen", label: "Kitchen" },
  { value: "basement", label: "Basement" },
  { value: "garage", label: "Garage" },
  { value: "utility_room", label: "Utility Room" },
  { value: "laundry_room", label: "Laundry Room" },
  { value: "attic", label: "Attic" },
  { value: "outdoor", label: "Outdoor" },
  { value: "main_floor", label: "Main Floor" },
  { value: "second_floor", label: "Second Floor" },
  { value: "other", label: "Other" }
];

const SERVICE_TYPES = [
  { value: "maintenance", label: "Routine Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "installation", label: "Installation" },
  { value: "replacement", label: "Replacement" },
  { value: "inspection", label: "Inspection" },
  { value: "cleaning", label: "Professional Cleaning" },
  { value: "upgrade", label: "Upgrade/Improvement" },
  { value: "emergency", label: "Emergency Service" },
  { value: "other", label: "Other" }
];

const HOME_AREAS = [
  { value: "hvac", label: "HVAC System" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "roof", label: "Roof" },
  { value: "foundation", label: "Foundation" },
  { value: "siding", label: "Siding/Exterior" },
  { value: "windows", label: "Windows" },
  { value: "doors", label: "Doors" },
  { value: "flooring", label: "Flooring" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "basement", label: "Basement" },
  { value: "attic", label: "Attic" },
  { value: "garage", label: "Garage" },
  { value: "landscaping", label: "Landscaping/Yard" },
  { value: "driveway", label: "Driveway/Walkways" },
  { value: "gutters", label: "Gutters" },
  { value: "chimney", label: "Chimney" },
  { value: "septic", label: "Septic System" },
  { value: "well", label: "Well/Water System" },
  { value: "other", label: "Other" }
];



const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Climate zone mapping based on US regions
const getClimateZoneFromCoordinates = (lat: number, lng: number): string => {
  // Pacific Northwest: Washington, Oregon, Northern California
  if ((lat >= 42 && lat <= 49 && lng >= -124.5 && lng <= -116.5) || 
      (lat >= 39 && lat <= 42 && lng >= -124.5 && lng <= -120)) {
    return "pacific-northwest";
  }
  
  // California (excluding northern part already covered)
  if (lat >= 32.5 && lat <= 42 && lng >= -124.5 && lng <= -114) {
    return "california";
  }
  
  // Southwest: Arizona, Nevada, Utah, New Mexico, parts of Colorado
  if ((lat >= 31 && lat <= 42 && lng >= -114 && lng <= -102) ||
      (lat >= 36.5 && lat <= 41 && lng >= -109 && lng <= -102)) {
    return "southwest";
  }
  
  // Mountain West: Montana, Idaho, Wyoming, Colorado (northern parts)
  if (lat >= 41 && lat <= 49 && lng >= -116.5 && lng <= -102) {
    return "mountain-west";
  }
  
  // Great Plains: North Dakota, South Dakota, Nebraska, Kansas, Oklahoma, parts of Texas
  if (lat >= 25.8 && lat <= 49 && lng >= -102 && lng <= -94) {
    return "great-plains";
  }
  
  // Midwest: Minnesota, Wisconsin, Iowa, Missouri, Illinois, Indiana, Ohio, Michigan
  if (lat >= 36.5 && lat <= 49 && lng >= -94 && lng <= -80.5) {
    return "midwest";
  }
  
  // Southeast: Florida, Georgia, Alabama, Mississippi, Louisiana, Arkansas, Tennessee, Kentucky, South Carolina, North Carolina, Virginia, West Virginia
  if (lat >= 24.5 && lat <= 39.5 && lng >= -94 && lng <= -75.5) {
    return "southeast";
  }
  
  // Northeast: Maine, New Hampshire, Vermont, Massachusetts, Rhode Island, Connecticut, New York, New Jersey, Pennsylvania, Delaware, Maryland
  if (lat >= 38.5 && lat <= 47.5 && lng >= -80.5 && lng <= -66.5) {
    return "northeast";
  }
  
  // Default fallback based on latitude
  if (lat >= 47) return "pacific-northwest";
  if (lat >= 42) return "northeast";
  if (lat >= 36) return "midwest";
  if (lat >= 32) return "southeast";
  return "southwest";
};

// Address suggestion interface
interface AddressSuggestion {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// Get address suggestions using Google Places API (fallback to manual geocoding)
const getAddressSuggestions = async (input: string): Promise<AddressSuggestion[]> => {
  try {
    // Check if Google Places API is available
    const googleMaps = (window as any).google?.maps?.places;
    if (googleMaps) {
      return new Promise((resolve) => {
        const service = new googleMaps.AutocompleteService();
        service.getPlacePredictions({
          input,
          componentRestrictions: { country: 'us' },
          types: ['address']
        }, (predictions: any, status: any) => {
          if (status === googleMaps.PlacesServiceStatus.OK && predictions) {
            resolve(predictions);
          } else {
            resolve([]);
          }
        });
      });
    }
    
    // Fallback: Use Nominatim for suggestions
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=5&countrycodes=us&addressdetails=1`
    );
    const data = await response.json();
    
    return data.map((item: any) => ({
      description: item.display_name,
      place_id: item.place_id.toString(),
      structured_formatting: {
        main_text: item.display_name.split(',')[0],
        secondary_text: item.display_name.split(',').slice(1).join(',').trim()
      }
    }));
  } catch (error) {
    console.error('Address suggestion error:', error);
    return [];
  }
};

// Geocoding function using a free service
const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    // Using Nominatim (OpenStreetMap) free geocoding service
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

const CLIMATE_ZONES = [
  { value: "pacific-northwest", label: "Pacific Northwest" },
  { value: "northeast", label: "Northeast" },
  { value: "southeast", label: "Southeast" },
  { value: "midwest", label: "Midwest" },
  { value: "southwest", label: "Southwest" },
  { value: "mountain-west", label: "Mountain West" },
  { value: "california", label: "California" },
  { value: "great-plains", label: "Great Plains" }
];

const HOME_SYSTEMS = {
  heating: [
    { value: "gas-furnace", label: "Gas Furnace" },
    { value: "oil-furnace", label: "Oil Furnace" },
    { value: "electric-furnace", label: "Electric Furnace" },
    { value: "heat-pump", label: "Heat Pump" },
    { value: "boiler", label: "Boiler" },
    { value: "radiant-floor", label: "Radiant Floor Heating" },
    { value: "wood-stove", label: "Wood Stove/Fireplace" }
  ],
  cooling: [
    { value: "central-ac", label: "Central AC" },
    { value: "window-ac", label: "Window AC Units" },
    { value: "mini-split", label: "Mini-Split System" },
    { value: "evaporative", label: "Evaporative Cooler" }
  ],
  water: [
    { value: "gas-water-heater", label: "Gas Water Heater" },
    { value: "electric-water-heater", label: "Electric Water Heater" },
    { value: "tankless-gas", label: "Tankless Gas" },
    { value: "tankless-electric", label: "Tankless Electric" },
    { value: "solar-water", label: "Solar Water Heating" },
    { value: "well-water", label: "Well Water System" },
    { value: "water-softener", label: "Water Softener" }
  ],
  features: [
    { value: "solar-panels", label: "Solar Panels" },
    { value: "pool", label: "Swimming Pool" },
    { value: "spa", label: "Hot Tub/Spa" },
    { value: "generator", label: "Backup Generator" },
    { value: "septic", label: "Septic System" },
    { value: "sump-pump", label: "Sump Pump" },
    { value: "security-system", label: "Security System" },
    { value: "sprinkler-system", label: "Irrigation/Sprinkler System" }
  ]
};

export default function Maintenance() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedZone, setSelectedZone] = useState<string>("pacific-northwest");
  const [selectedHouseId, setSelectedHouseId] = useState<string>("house-1");
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [homeSystems, setHomeSystems] = useState<string[]>([]);
  const [showSystemFilters, setShowSystemFilters] = useState(false);
  const [isApplianceDialogOpen, setIsApplianceDialogOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<HomeAppliance | null>(null);
  const [isMaintenanceLogDialogOpen, setIsMaintenanceLogDialogOpen] = useState(false);
  const [editingMaintenanceLog, setEditingMaintenanceLog] = useState<MaintenanceLog | null>(null);
  const [isHouseDialogOpen, setIsHouseDialogOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  
  // Home systems dialog state
  const [isHomeSystemDialogOpen, setIsHomeSystemDialogOpen] = useState(false);
  const [editingHomeSystem, setEditingHomeSystem] = useState<HomeSystem | null>(null);
  const [selectedSystemType, setSelectedSystemType] = useState<string>("");
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [addressDebounceTimer, setAddressDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [suggestionDebounceTimer, setSuggestionDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // For demo purposes, we'll use a default homeowner ID
  const homeownerId = "demo-homeowner-123";

  // Fetch houses for the current user
  const { data: houses = [], isLoading: housesLoading } = useQuery({
    queryKey: ['/api/houses'],
    queryFn: () => fetch('/api/houses?homeownerId=demo-homeowner-123').then(res => res.json())
  });

  // Update home systems and climate zone when house changes
  useEffect(() => {
    const selectedHouse = houses.find((house: House) => house.id === selectedHouseId);
    if (selectedHouse) {
      setHomeSystems(selectedHouse.homeSystems);
      setSelectedZone(selectedHouse.climateZone.toLowerCase().replace(/ /g, '-'));
    }
  }, [selectedHouseId, houses]);

  // Appliance queries and mutations
  const { data: appliances, isLoading: appliancesLoading } = useQuery<HomeAppliance[]>({
    queryKey: ['/api/appliances', { homeownerId }],
    queryFn: async () => {
      const response = await fetch(`/api/appliances?homeownerId=${homeownerId}`);
      if (!response.ok) throw new Error('Failed to fetch appliances');
      return response.json();
    },
  });

  // Maintenance log queries and mutations
  const { data: maintenanceLogs, isLoading: maintenanceLogsLoading } = useQuery<MaintenanceLog[]>({
    queryKey: ['/api/maintenance-logs', { homeownerId }],
    queryFn: async () => {
      const response = await fetch(`/api/maintenance-logs?homeownerId=${homeownerId}`);
      if (!response.ok) throw new Error('Failed to fetch maintenance logs');
      return response.json();
    },
  });

  // Home systems queries
  const { data: homeSystemsData, isLoading: homeSystemsLoading } = useQuery<HomeSystem[]>({
    queryKey: ['/api/home-systems', { homeownerId, houseId: selectedHouseId }],
    queryFn: async () => {
      const response = await fetch(`/api/home-systems?homeownerId=${homeownerId}&houseId=${selectedHouseId}`);
      if (!response.ok) throw new Error('Failed to fetch home systems');
      return response.json();
    },
  });

  // Function to find previous contractors for similar maintenance tasks
  const findPreviousContractor = (taskCategory: string, taskTitle: string) => {
    if (!maintenanceLogs || maintenanceLogs.length === 0) return null;
    
    // Look for maintenance logs with similar service types or home areas
    const similarServices = maintenanceLogs.filter(log => {
      const serviceType = log.serviceType?.toLowerCase() || '';
      const homeArea = log.homeArea?.toLowerCase() || '';
      const category = taskCategory.toLowerCase();
      const title = taskTitle.toLowerCase();
      
      return (
        serviceType.includes(category) ||
        homeArea.includes(category) ||
        serviceType.includes(title.split(' ')[0]) || // First word of task title
        (category === 'hvac' && (serviceType.includes('hvac') || serviceType.includes('heating') || serviceType.includes('cooling'))) ||
        (category === 'plumbing' && serviceType.includes('plumbing')) ||
        (category === 'electrical' && serviceType.includes('electrical')) ||
        (category === 'roofing' && (serviceType.includes('roof') || serviceType.includes('gutter'))) ||
        (category === 'exterior' && (serviceType.includes('exterior') || serviceType.includes('siding') || serviceType.includes('pressure wash'))) ||
        (category === 'landscaping' && serviceType.includes('landscaping'))
      );
    });
    
    // Find the most recent contractor
    if (similarServices.length > 0) {
      const mostRecent = similarServices.sort((a, b) => 
        new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
      )[0];
      
      if (mostRecent.contractorName || mostRecent.contractorCompany) {
        return {
          contractorName: mostRecent.contractorName,
          contractorCompany: mostRecent.contractorCompany,
          contractorId: mostRecent.contractorId,
          lastServiceDate: mostRecent.serviceDate,
          serviceType: mostRecent.serviceType
        };
      }
    }
    
    return null;
  };

  const applianceForm = useForm<ApplianceFormData>({
    resolver: zodResolver(applianceFormSchema),
    defaultValues: {
      homeownerId,
      applianceType: "",
      brand: "",
      model: "",
      yearInstalled: undefined,
      serialNumber: "",
      notes: "",
      location: "",
      warrantyExpiration: "",
      lastServiceDate: "",
    },
  });

  const createApplianceMutation = useMutation({
    mutationFn: async (data: ApplianceFormData) => {
      const response = await fetch('/api/appliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create appliance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appliances'] });
      setIsApplianceDialogOpen(false);
      applianceForm.reset();
      toast({ title: "Success", description: "Appliance added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add appliance", variant: "destructive" });
    },
  });

  const updateApplianceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ApplianceFormData> }) => {
      const response = await fetch(`/api/appliances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update appliance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appliances'] });
      setIsApplianceDialogOpen(false);
      setEditingAppliance(null);
      applianceForm.reset();
      toast({ title: "Success", description: "Appliance updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update appliance", variant: "destructive" });
    },
  });

  const deleteApplianceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/appliances/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete appliance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appliances'] });
      toast({ title: "Success", description: "Appliance deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete appliance", variant: "destructive" });
    },
  });

  // Maintenance log form handling
  const maintenanceLogForm = useForm<MaintenanceLogFormData>({
    resolver: zodResolver(maintenanceLogFormSchema),
    defaultValues: {
      homeownerId,
      serviceType: "maintenance",
      serviceDate: new Date().toISOString().split('T')[0],
      homeArea: "",
      serviceDescription: "",
      cost: undefined,
      contractorName: "",
      contractorCompany: "",
      contractorId: "",
      notes: "",
      warrantyPeriod: "",
      nextServiceDue: "",
    },
  });

  const createMaintenanceLogMutation = useMutation({
    mutationFn: async (data: MaintenanceLogFormData) => {
      const response = await fetch('/api/maintenance-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create maintenance log');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-logs'] });
      setIsMaintenanceLogDialogOpen(false);
      maintenanceLogForm.reset();
      toast({ title: "Success", description: "Maintenance log added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add maintenance log", variant: "destructive" });
    },
  });

  const updateMaintenanceLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MaintenanceLogFormData> }) => {
      const response = await fetch(`/api/maintenance-logs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update maintenance log');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-logs'] });
      setIsMaintenanceLogDialogOpen(false);
      setEditingMaintenanceLog(null);
      maintenanceLogForm.reset();
      toast({ title: "Success", description: "Maintenance log updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update maintenance log", variant: "destructive" });
    },
  });

  const deleteMaintenanceLogMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/maintenance-logs/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete maintenance log');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-logs'] });
      toast({ title: "Success", description: "Maintenance log deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete maintenance log", variant: "destructive" });
    },
  });

  // House form handling
  const houseForm = useForm<HouseFormData>({
    resolver: zodResolver(houseFormSchema),
    defaultValues: {
      homeownerId,
      name: "",
      address: "",
      climateZone: "",
      homeSystems: [],
      isDefault: false,
    },
  });

  const createHouseMutation = useMutation({
    mutationFn: async (data: HouseFormData) => {
      const response = await fetch('/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create house');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
      setIsHouseDialogOpen(false);
      houseForm.reset();
      toast({ title: "Success", description: "House added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add house", variant: "destructive" });
    },
  });

  const updateHouseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HouseFormData> }) => {
      const response = await fetch(`/api/houses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update house');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
      setIsHouseDialogOpen(false);
      setEditingHouse(null);
      houseForm.reset();
      toast({ title: "Success", description: "House updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update house", variant: "destructive" });
    },
  });

  const deleteHouseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/houses/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete house');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
      // If we deleted the currently selected house, select the first available house
      if (selectedHouseId === editingHouse?.id) {
        const remainingHouses = houses.filter((h: House) => h.id !== editingHouse?.id);
        if (remainingHouses.length > 0) {
          setSelectedHouseId(remainingHouses[0].id);
        }
      }
      toast({ title: "Success", description: "House deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete house", variant: "destructive" });
    },
  });

  // Home systems form handling
  type HomeSystemFormData = z.infer<typeof homeSystemFormSchema>;

  const homeSystemForm = useForm<HomeSystemFormData>({
    resolver: zodResolver(homeSystemFormSchema),
    defaultValues: {
      homeownerId,
      houseId: selectedHouseId,
      systemType: "",
      yearInstalled: undefined,
      lastServiceYear: undefined,
      brand: "",
      model: "",
      notes: "",
    },
  });

  const createHomeSystemMutation = useMutation({
    mutationFn: async (data: HomeSystemFormData) => {
      const response = await fetch('/api/home-systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create home system');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/home-systems'] });
      setIsHomeSystemDialogOpen(false);
      homeSystemForm.reset();
      setSelectedSystemType("");
      toast({ title: "Success", description: "Home system added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add home system", variant: "destructive" });
    },
  });

  const updateHomeSystemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HomeSystemFormData> }) => {
      const response = await fetch(`/api/home-systems/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update home system');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/home-systems'] });
      setIsHomeSystemDialogOpen(false);
      setEditingHomeSystem(null);
      homeSystemForm.reset();
      setSelectedSystemType("");
      toast({ title: "Success", description: "Home system updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update home system", variant: "destructive" });
    },
  });

  const deleteHomeSystemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/home-systems/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete home system');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/home-systems'] });
      toast({ title: "Success", description: "Home system deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete home system", variant: "destructive" });
    },
  });

  // Load completed tasks and home systems from localStorage on component mount
  useEffect(() => {
    const storedTasks = localStorage.getItem('maintenance-completed-tasks');
    if (storedTasks) {
      try {
        setCompletedTasks(JSON.parse(storedTasks));
      } catch {
        setCompletedTasks({});
      }
    }

    const storedSystems = localStorage.getItem('home-systems');
    if (storedSystems) {
      try {
        setHomeSystems(JSON.parse(storedSystems));
      } catch {
        setHomeSystems([]);
      }
    }
  }, []);

  // Save completed tasks and home systems to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('maintenance-completed-tasks', JSON.stringify(completedTasks));
  }, [completedTasks]);

  useEffect(() => {
    localStorage.setItem('home-systems', JSON.stringify(homeSystems));
  }, [homeSystems]);

  // Generate unique key for task completion tracking (includes month/year)
  const getTaskKey = (taskId: string, month: number, year: number) => {
    return `${taskId}-${month}-${year}`;
  };

  // Toggle task completion
  const toggleTaskCompletion = (taskId: string) => {
    const currentYear = new Date().getFullYear();
    const taskKey = getTaskKey(taskId, selectedMonth, currentYear);
    
    setCompletedTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };

  // Check if task is completed
  const isTaskCompleted = (taskId: string) => {
    const currentYear = new Date().getFullYear();
    const taskKey = getTaskKey(taskId, selectedMonth, currentYear);
    return completedTasks[taskKey] || false;
  };

  // Reset all tasks for current month/year
  const resetMonthTasks = () => {
    const currentYear = new Date().getFullYear();
    const updatedTasks = { ...completedTasks };
    
    // Remove all completed tasks for current month/year
    Object.keys(updatedTasks).forEach(key => {
      if (key.includes(`-${selectedMonth}-${currentYear}`)) {
        delete updatedTasks[key];
      }
    });
    
    setCompletedTasks(updatedTasks);
  };

  // Toggle home system selection
  const toggleHomeSystem = (system: string) => {
    setHomeSystems(prev => 
      prev.includes(system) 
        ? prev.filter(s => s !== system)
        : [...prev, system]
    );
  };

  // Handle adding a new home system
  const handleAddHomeSystem = (systemType: string) => {
    setSelectedSystemType(systemType);
    setEditingHomeSystem(null);
    homeSystemForm.reset({
      homeownerId,
      houseId: selectedHouseId,
      systemType,
      yearInstalled: undefined,
      lastServiceYear: undefined,
      brand: "",
      model: "",
      notes: "",
    });
    setIsHomeSystemDialogOpen(true);
  };

  // Handle editing an existing home system
  const handleEditHomeSystem = (system: HomeSystem) => {
    setEditingHomeSystem(system);
    setSelectedSystemType(system.systemType);
    homeSystemForm.reset({
      homeownerId: system.homeownerId,
      houseId: system.houseId,
      systemType: system.systemType,
      yearInstalled: system.yearInstalled,
      lastServiceYear: system.lastServiceYear,
      brand: system.brand || "",
      model: system.model || "",
      notes: system.notes || "",
    });
    setIsHomeSystemDialogOpen(true);
  };

  // Get existing system data for a specific system type
  const getSystemData = (systemType: string) => {
    return homeSystemsData?.find(system => 
      system.systemType === systemType && system.houseId === selectedHouseId
    );
  };

  // House helper functions
  const handleEditHouse = (house: House) => {
    setEditingHouse(house);
    houseForm.reset({
      homeownerId,
      name: house.name,
      address: house.address,
      climateZone: house.climateZone,
      homeSystems: house.homeSystems,
      isDefault: house.isDefault,
    });
    setIsHouseDialogOpen(true);
  };

  const handleDeleteHouse = (house: House) => {
    if (houses.length <= 1) {
      toast({ 
        title: "Cannot Delete", 
        description: "You must have at least one house.", 
        variant: "destructive" 
      });
      return;
    }
    setEditingHouse(house);
    deleteHouseMutation.mutate(house.id);
  };

  const handleAddNewHouse = () => {
    setEditingHouse(null);
    houseForm.reset({
      homeownerId,
      name: "",
      address: "",
      climateZone: "",
      homeSystems: [],
      isDefault: false,
    });
    setIsHouseDialogOpen(true);
  };

  // Handle address suggestions
  const handleAddressSuggestions = async (input: string) => {
    if (input.length > 3) {
      try {
        const suggestions = await getAddressSuggestions(input);
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(suggestions.length > 0);
      } catch (error) {
        console.error('Failed to get address suggestions:', error);
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
      }
    } else {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    }
  };

  // Auto-detect climate zone from address with debounce
  const handleAddressChange = (address: string, onChange: (value: string) => void) => {
    onChange(address);
    
    // Clear existing timers
    if (addressDebounceTimer) {
      clearTimeout(addressDebounceTimer);
    }
    if (suggestionDebounceTimer) {
      clearTimeout(suggestionDebounceTimer);
    }
    
    // Get suggestions (debounce for 300ms)
    if (address.length > 3) {
      const suggestionTimer = setTimeout(() => {
        handleAddressSuggestions(address);
      }, 300);
      setSuggestionDebounceTimer(suggestionTimer);
    } else {
      setShowAddressSuggestions(false);
    }
    
    // Set new timer for geocoding (debounce for 1 second)
    if (address.length > 10) {
      const timer = setTimeout(async () => {
        setIsGeocodingAddress(true);
        try {
          const coords = await geocodeAddress(address);
          if (coords) {
            const detectedZone = getClimateZoneFromCoordinates(coords.lat, coords.lng);
            houseForm.setValue('climateZone', detectedZone);
            toast({
              title: "Climate Zone Detected",
              description: `Automatically set to ${CLIMATE_ZONES.find(z => z.value === detectedZone)?.label}`,
            });
          }
        } catch (error) {
          console.error('Failed to detect climate zone:', error);
        } finally {
          setIsGeocodingAddress(false);
        }
      }, 1000); // 1 second debounce
      
      setAddressDebounceTimer(timer);
    }
  };

  // Handle address suggestion selection
  const handleAddressSuggestionSelect = (suggestion: AddressSuggestion, onChange: (value: string) => void) => {
    onChange(suggestion.description);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    
    // Trigger climate zone detection immediately for selected address
    setTimeout(async () => {
      setIsGeocodingAddress(true);
      try {
        const coords = await geocodeAddress(suggestion.description);
        if (coords) {
          const detectedZone = getClimateZoneFromCoordinates(coords.lat, coords.lng);
          houseForm.setValue('climateZone', detectedZone);
          toast({
            title: "Climate Zone Detected",
            description: `Automatically set to ${CLIMATE_ZONES.find(z => z.value === detectedZone)?.label}`,
          });
        }
      } catch (error) {
        console.error('Failed to detect climate zone:', error);
      } finally {
        setIsGeocodingAddress(false);
      }
    }, 100);
  };

  const onSubmitHouse = (data: HouseFormData) => {
    if (editingHouse) {
      updateHouseMutation.mutate({ id: editingHouse.id, data });
    } else {
      createHouseMutation.mutate(data);
    }
  };

  // Appliance helper functions
  const handleEditAppliance = (appliance: HomeAppliance) => {
    setEditingAppliance(appliance);
    applianceForm.reset({
      homeownerId: appliance.homeownerId,
      applianceType: appliance.applianceType,
      brand: appliance.brand,
      model: appliance.model,
      yearInstalled: appliance.yearInstalled || undefined,
      serialNumber: appliance.serialNumber ?? "",
      notes: appliance.notes ?? "",
      location: appliance.location ?? "",
      warrantyExpiration: appliance.warrantyExpiration ?? "",
      lastServiceDate: appliance.lastServiceDate ?? "",
    });
    setIsApplianceDialogOpen(true);
  };

  // Maintenance log helper functions
  const handleEditMaintenanceLog = (log: MaintenanceLog) => {
    setEditingMaintenanceLog(log);
    maintenanceLogForm.reset({
      homeownerId: log.homeownerId,
      serviceType: log.serviceType,
      serviceDate: log.serviceDate,
      homeArea: log.homeArea,
      serviceDescription: log.serviceDescription,
      cost: log.cost || undefined,
      contractorName: log.contractorName ?? "",
      contractorCompany: log.contractorCompany ?? "",
      contractorId: log.contractorId ?? "",
      notes: log.notes ?? "",
      warrantyPeriod: log.warrantyPeriod ?? "",
      nextServiceDue: log.nextServiceDue ?? "",
    });
    setIsMaintenanceLogDialogOpen(true);
  };

  const handleAddNewAppliance = () => {
    setEditingAppliance(null);
    applianceForm.reset({
      homeownerId,
      applianceType: "",
      brand: "",
      model: "",
      yearInstalled: undefined,
      serialNumber: "",
      notes: "",
      location: "",
      warrantyExpiration: "",
      lastServiceDate: "",
    });
    setIsApplianceDialogOpen(true);
  };

  const onSubmitAppliance = (data: ApplianceFormData) => {
    if (editingAppliance) {
      updateApplianceMutation.mutate({ id: editingAppliance.id, data });
    } else {
      createApplianceMutation.mutate(data);
    }
  };

  const handleAddNewMaintenanceLog = () => {
    setEditingMaintenanceLog(null);
    maintenanceLogForm.reset({
      homeownerId,
      serviceType: "maintenance",
      serviceDate: new Date().toISOString().split('T')[0],
      homeArea: "",
      serviceDescription: "",
      cost: undefined,
      contractorName: "",
      contractorCompany: "",
      contractorId: "",
      notes: "",
      warrantyPeriod: "",
      nextServiceDue: "",
    });
    setIsMaintenanceLogDialogOpen(true);
  };

  const onSubmitMaintenanceLog = (data: MaintenanceLogFormData) => {
    if (editingMaintenanceLog) {
      updateMaintenanceLogMutation.mutate({ id: editingMaintenanceLog.id, data });
    } else {
      createMaintenanceLogMutation.mutate(data);
    }
  };

  const onSubmitHomeSystem = (data: HomeSystemFormData) => {
    if (editingHomeSystem) {
      updateHomeSystemMutation.mutate({ id: editingHomeSystem.id, data });
    } else {
      createHomeSystemMutation.mutate(data);
    }
  };

  const getApplianceTypeLabel = (type: string) => {
    return APPLIANCE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getApplianceLocationLabel = (location: string) => {
    return APPLIANCE_LOCATIONS.find(l => l.value === location)?.label || location;
  };

  const getServiceTypeLabel = (type: string) => {
    return SERVICE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getHomeAreaLabel = (area: string) => {
    return HOME_AREAS.find(a => a.value === area)?.label || area;
  };

  // Generate maintenance tasks based on month and location
  const getMaintenanceTasksForMonth = (month: number): MaintenanceTask[] => {
    const isWinter = month === 12 || month === 1 || month === 2;
    const isSpring = month === 3 || month === 4 || month === 5;
    const isSummer = month === 6 || month === 7 || month === 8;
    const isFall = month === 9 || month === 10 || month === 11;

    const tasks: MaintenanceTask[] = [];

    // Universal monthly tasks
    tasks.push(
      {
        id: "monthly-smoke-detectors",
        title: "Test Smoke and Carbon Monoxide Detectors",
        description: "Check batteries and functionality by pressing test buttons. Replace batteries if chirping or low.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "high",
        estimatedTime: "15 minutes",
        difficulty: "easy",
        category: "Safety",
        tools: ["9V batteries"],
        cost: "$10-15"
      },
      {
        id: "monthly-hvac-filter",
        title: "Change HVAC Air Filters",
        description: "Replace air filters every 30-60 days, more frequently during heavy use seasons. Check size and MERV rating.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "high",
        estimatedTime: "10 minutes",
        difficulty: "easy",
        category: "HVAC",
        tools: ["New air filter"],
        cost: "$15-40"
      },
      {
        id: "monthly-water-check",
        title: "Check Water Systems",
        description: "Test water pressure, look for leaks under sinks, and run garbage disposal with citrus peels.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "medium",
        estimatedTime: "15 minutes",
        difficulty: "easy",
        category: "Plumbing",
        tools: ["Baking soda", "Vinegar", "Citrus peels"],
        cost: "$0-5"
      }
    );

    // Winter tasks (December, January, February)
    if (isWinter) {
      // Cold climate winter tasks
      if (["pacific-northwest", "northeast", "midwest", "mountain-west"].includes(selectedZone)) {
        tasks.push({
          id: "winter-heating-check",
          title: "Inspect Heating System Operation",
          description: month === 12 ? "Schedule professional HVAC maintenance before peak winter season." : 
                      month === 1 ? "Monitor heating system efficiency and check for unusual sounds or smells." :
                      "Check heating vents for blockages and ensure consistent heating throughout home.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: month === 12 ? "2 hours" : "30 minutes",
          difficulty: month === 12 ? "moderate" : "easy",
          category: "HVAC",
          tools: month === 12 ? null : ["Flashlight"],
          cost: month === 12 ? "$100-200" : "$0"
        });
      }

      // Mild climate winter tasks
      if (["southeast", "southwest", "california"].includes(selectedZone)) {
        tasks.push({
          id: "winter-mild-maintenance",
          title: "Winter Home Preparation",
          description: month === 12 ? "Clean and inspect fireplace and chimney if applicable." :
                      month === 1 ? "Check for any moisture issues and inspect exterior paint for winter damage." :
                      "Prune dormant trees and shrubs, clean and store outdoor furniture.",
          month: month,
          climateZones: ["southeast", "southwest", "california"],
          priority: "medium",
          estimatedTime: "1-2 hours",
          difficulty: "moderate",
          category: month === 2 ? "Landscaping" : "General",
          tools: month === 2 ? ["Pruning shears", "Garden gloves"] : ["Flashlight", "Cleaning supplies"],
          cost: "$10-30"
        });
      }
    }

    // Spring tasks (March, April, May)
    if (isSpring) {
      tasks.push({
        id: "spring-exterior-prep",
        title: "Spring Exterior Maintenance",
        description: month === 3 ? "Inspect roof for winter damage and check gutters for clogs or damage." :
                    month === 4 ? "Power wash deck, patio, and exterior siding. Check exterior paint." :
                    "Deep clean windows inside and out, inspect and repair window screens.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "high",
        estimatedTime: month === 4 ? "3-4 hours" : "2-3 hours",
        difficulty: "moderate",
        category: month === 3 ? "Roofing" : month === 4 ? "Exterior" : "Windows",
        tools: month === 3 ? ["Ladder", "Binoculars"] : 
              month === 4 ? ["Power washer", "Cleaning supplies"] : 
              ["Window cleaner", "Squeegee", "Repair kit"],
        cost: month === 3 ? "$0-50" : month === 4 ? "$20-40" : "$15-35"
      });
    }

    // Summer tasks (June, July, August)
    if (isSummer) {
      // Hot climate summer tasks
      if (["southeast", "southwest", "california", "great-plains"].includes(selectedZone)) {
        tasks.push({
          id: "summer-cooling-maintenance",
          title: "Cooling System Maintenance",
          description: month === 6 ? "Deep clean AC filters and check refrigerant levels professionally." :
                      month === 7 ? "Monitor AC efficiency, clean vents and registers throughout home." :
                      "Inspect AC ductwork for leaks and ensure optimal cooling performance.",
          month: month,
          climateZones: ["southeast", "southwest", "california", "great-plains"],
          priority: "high",
          estimatedTime: month === 6 ? "2 hours" : "1 hour",
          difficulty: month === 6 ? "moderate" : "easy",
          category: "HVAC",
          tools: ["New air filter", "Vacuum", "Cleaning supplies"],
          cost: month === 6 ? "$50-100" : "$0-25"
        });
      }
    }

    // Fall tasks (September, October, November)
    if (isFall) {
      // Cold climate fall winterization
      if (["pacific-northwest", "northeast", "midwest", "mountain-west"].includes(selectedZone)) {
        tasks.push({
          id: "fall-winterization",
          title: "Fall Winterization Prep",
          description: month === 9 ? "Inspect and service heating system before cold weather arrives." :
                      month === 10 ? "Winterize outdoor water systems, drain and store hoses." :
                      "Final exterior home inspection, seal gaps and cracks before winter.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: month === 9 ? "2-3 hours" : "1-2 hours",
          difficulty: "moderate",
          category: month === 9 ? "HVAC" : month === 10 ? "Plumbing" : "Weatherization",
          tools: month === 10 ? ["Hose storage", "Shut-off tools"] : ["Caulk", "Weather stripping"],
          cost: "$25-75"
        });
      }
    }

    // System-specific tasks
    tasks.push(
      {
        id: "monthly-gas-furnace",
        title: "Check Gas Furnace Filter and Vents",
        description: "Inspect furnace filter for clogs and ensure all vents are unobstructed for proper airflow.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "medium",
        estimatedTime: "15 minutes",
        difficulty: "easy",
        category: "HVAC",
        tools: null,
        cost: "$0",
        systemRequirements: ["gas-furnace"]
      },
      {
        id: "monthly-heat-pump",
        title: "Clean Heat Pump Outdoor Unit",
        description: "Remove debris from around outdoor unit and check for ice buildup in winter.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "california"],
        priority: "medium",
        estimatedTime: "20 minutes",
        difficulty: "easy",
        category: "HVAC",
        tools: ["Garden hose", "Soft brush"],
        cost: "$0",
        systemRequirements: ["heat-pump"]
      },
      {
        id: "monthly-generator",
        title: "Test Backup Generator",
        description: "Run generator for 15-30 minutes to ensure proper operation and check fuel levels.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "high",
        estimatedTime: "30 minutes",
        difficulty: "moderate",
        category: "Electrical",
        tools: null,
        cost: "$0",
        systemRequirements: ["generator"]
      }
    );

    // Pool tasks (summer only)
    if (isSummer) {
      tasks.push(
        {
          id: "summer-pool",
          title: "Pool Maintenance and Chemical Balance",
          description: "Test and balance pool chemicals, clean skimmer baskets, and brush pool walls.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "high",
          estimatedTime: "1-2 hours",
          difficulty: "moderate",
          category: "Pool",
          tools: ["Pool test kit", "Pool chemicals", "Pool brush", "Skimmer net"],
          cost: "$30-60",
          systemRequirements: ["pool"]
        },
        {
          id: "summer-spa",
          title: "Hot Tub/Spa Water Treatment",
          description: "Test water chemistry, clean filters, and check for proper heating and circulation.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "high",
          estimatedTime: "45 minutes",
          difficulty: "moderate",
          category: "Spa",
          tools: ["Spa test strips", "Spa chemicals"],
          cost: "$25-45",
          systemRequirements: ["spa"]
        }
      );
    }

    // Solar panel tasks
    if (isSummer || month === 3 || month === 9) {
      tasks.push({
        id: `solar-${month}`,
        title: isSummer ? "Clean Solar Panels" : "Solar Panel System Inspection",
        description: isSummer ? 
          "Remove dust, pollen, and debris from solar panels to maintain efficiency." :
          "Check mounting hardware, wiring connections, and monitor system performance data.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "medium",
        estimatedTime: isSummer ? "2-3 hours" : "1 hour",
        difficulty: "moderate",
        category: "Solar",
        tools: isSummer ? ["Garden hose", "Soft brush", "Squeegee"] : ["Multimeter", "Binoculars"],
        cost: isSummer ? "$0-20" : "$0",
        systemRequirements: ["solar-panels"]
      });
    }

    return tasks;
  };

  const maintenanceTasks = getMaintenanceTasksForMonth(selectedMonth);

  const filteredTasks = maintenanceTasks.filter(task => {
    // Filter by climate zone
    if (!task.climateZones.includes(selectedZone)) {
      return false;
    }
    
    // Filter by home systems - if task has system requirements, user must have at least one
    if (task.systemRequirements && task.systemRequirements.length > 0) {
      return task.systemRequirements.some(requirement => homeSystems.includes(requirement));
    }
    
    // If no system requirements, show the task
    return true;
  });

  // Generate maintenance notifications for current month tasks
  const generateMaintenanceNotificationsMutation = useMutation({
    mutationFn: async (tasks: MaintenanceTask[]) => {
      const response = await fetch('/api/notifications/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeownerId: "demo-homeowner-123",
          tasks: tasks
        }),
      });
      if (!response.ok) throw new Error('Failed to create maintenance notifications');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Auto-generate notifications when viewing current month
  useEffect(() => {
    const currentMonth = new Date().getMonth() + 1;
    if (selectedMonth === currentMonth && filteredTasks.length > 0) {
      generateMaintenanceNotificationsMutation.mutate(filteredTasks);
    }
  }, [selectedMonth, filteredTasks.length]);

  const completedCount = filteredTasks.filter(task => isTaskCompleted(task.id)).length;
  const totalTasks = filteredTasks.length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'moderate': return 'text-yellow-600 dark:text-yellow-400';
      case 'difficult': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-purple-50 dark:bg-gray-900">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 dark:from-purple-950/20 dark:via-purple-900/20 dark:to-purple-950/20 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Smart <span className="text-purple-600 dark:text-purple-400">Maintenance</span> Schedule
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              Keep your home in perfect condition with personalized maintenance schedules based on your location and home systems
            </p>
          </div>
        </div>
      </section>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Home Maintenance & Appliances
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Keep your home in perfect condition with personalized maintenance recommendations and appliance tracking
          </p>
          
          {/* Property Selector Card */}
          <div className="bg-card border rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Building className="inline w-4 h-4 mr-1" />
                  Select Property
                </label>
                <Select value={selectedHouseId} onValueChange={setSelectedHouseId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a property..." />
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
              
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddNewHouse}
                    className="whitespace-nowrap border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add House
                  </Button>
                  {selectedHouseId && houses.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const selectedHouse = houses.find((h: House) => h.id === selectedHouseId);
                        if (selectedHouse) handleEditHouse(selectedHouse);
                      }}
                      className="whitespace-nowrap border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {selectedHouseId && houses.length > 1 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const selectedHouse = houses.find((h: House) => h.id === selectedHouseId);
                        if (selectedHouse) handleDeleteHouse(selectedHouse);
                      }}
                      className="whitespace-nowrap text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
                
                {selectedHouseId && houses.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{houses.find((house: House) => house.id === selectedHouseId)?.climateZone}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Home className="w-4 h-4" />
                      <span>{houses.find((house: House) => house.id === selectedHouseId)?.homeSystems.length || 0} systems configured</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="text-sm text-muted-foreground">
                  <Building className="inline w-4 h-4 mr-1" />
                  {houses.find((house: House) => house.id === selectedHouseId)?.name || 'Loading...'} • 
                  <Calendar className="inline w-4 h-4 ml-2 mr-1" />
                  {MONTHS[selectedMonth - 1]} • {CLIMATE_ZONES.find(z => z.value === selectedZone)?.label}
                </div>
                
                {totalTasks > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">
                      Progress: {completedCount}/{totalTasks} completed
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetMonthTasks}
                      className="text-xs border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset Month
                    </Button>
                  </div>
                )}
                
                <div className="ml-auto">
                  <AppointmentScheduler 
                    triggerButtonText="Schedule Visit" 
                    triggerButtonVariant="outline"
                  />
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-6 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Month
                  </label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <MapPin className="inline w-4 h-4 mr-1" />
                    Climate Zone (auto-set by property)
                  </label>
                  <Select value={selectedZone} onValueChange={setSelectedZone} disabled>
                    <SelectTrigger className="opacity-60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIMATE_ZONES.map((zone) => (
                        <SelectItem key={zone.value} value={zone.value}>
                          {zone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Home Systems Filter */}
              <Collapsible open={showSystemFilters} onOpenChange={setShowSystemFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                    <div className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Home Systems & Features ({homeSystems.length} selected)
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSystemFilters ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 border rounded-lg bg-muted/50">
                    {Object.entries(HOME_SYSTEMS).map(([category, systems]) => (
                      <div key={category}>
                        <h4 className="font-medium text-sm mb-3 capitalize text-foreground">
                          {category === 'features' ? 'Special Features' : `${category} System`}
                        </h4>
                        <div className="space-y-2">
                          {systems.map((system) => {
                            const systemData = getSystemData(system.label);
                            return (
                              <div key={system.value} className="flex items-center justify-between space-x-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={system.value}
                                    checked={homeSystems.includes(system.value)}
                                    onCheckedChange={() => toggleHomeSystem(system.value)}
                                  />
                                  <label
                                    htmlFor={system.value}
                                    className="text-sm text-muted-foreground cursor-pointer"
                                  >
                                    {system.label}
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {systemData && (
                                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                      {systemData.yearInstalled || 'Unknown'}
                                    </span>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                    onClick={() => systemData ? handleEditHomeSystem(systemData) : handleAddHomeSystem(system.label)}
                                    data-testid={`button-add-date-${system.value}`}
                                  >
                                    {systemData ? <Edit className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Service Records Quick Access */}
            {maintenanceLogs && maintenanceLogs.length > 0 && (
              <div className="mb-6">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500 p-2 rounded-lg">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Recent Service History</h3>
                          <p className="text-sm text-muted-foreground">
                            {maintenanceLogs.length} service record{maintenanceLogs.length !== 1 ? 's' : ''} tracked
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const serviceRecordsSection = document.getElementById('service-records');
                          serviceRecordsSection?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        data-testid="button-view-service-records"
                        className="border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      >
                        View All Records
                      </Button>
                    </div>
                    {maintenanceLogs.slice(0, 2).map((log) => (
                      <div key={log.id} className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-gray-300 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-sm text-foreground">{log.serviceDescription}</h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{new Date(log.serviceDate).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{getHomeAreaLabel(log.homeArea)}</span>
                              {log.contractorName && (
                                <>
                                  <span>•</span>
                                  <span>{log.contractorName}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {log.cost && (
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              ${log.cost}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredTasks.map((task) => {
                const completed = isTaskCompleted(task.id);
                const previousContractor = findPreviousContractor(task.category, task.title);
                
                return (
                  <Card 
                    key={task.id} 
                    className={`hover:shadow-md transition-all ${
                      completed ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3 flex-1">
                          <Checkbox
                            checked={completed}
                            onCheckedChange={() => toggleTaskCompletion(task.id)}
                            className="mt-1"
                          />
                          <CardTitle className={`text-lg font-semibold ${
                            completed ? 'text-green-700 dark:text-green-300 line-through' : 'text-foreground'
                          }`}>
                            {task.title}
                          </CardTitle>
                        </div>
                        <Badge className={`${getPriorityColor(task.priority)} border ml-2`}>
                          {task.priority} priority
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed">
                        {task.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span>{task.estimatedTime}</span>
                        </div>
                        <div className="flex items-center">
                          <Badge variant="secondary" className={getDifficultyColor(task.difficulty)}>
                            {task.difficulty}
                          </Badge>
                        </div>
                        {task.cost && (
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span>{task.cost}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Badge variant="outline" className="text-xs">
                            {task.category}
                          </Badge>
                        </div>
                      </div>

                      {task.tools && task.tools.length > 0 && (
                        <div>
                          <div className="flex items-center mb-2">
                            <Wrench className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="text-sm font-medium">Tools needed:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {task.tools.map((tool, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Previous Contractor Section */}
                      {previousContractor && (
                        <div className="border-t pt-4 mt-4">
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <User className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    Previous contractor used for {previousContractor.serviceType}
                                  </span>
                                </div>
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                  <div className="font-medium">
                                    {previousContractor.contractorName}
                                    {previousContractor.contractorCompany && (
                                      <span className="font-normal"> - {previousContractor.contractorCompany}</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    Last service: {new Date(previousContractor.lastServiceDate).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                {previousContractor.contractorId ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/40"
                                    onClick={() => window.open(`/contractor-profile/${previousContractor.contractorId}`, '_blank')}
                                    data-testid={`button-view-contractor-${task.id}`}
                                  >
                                    <User className="w-3 h-3 mr-1" />
                                    View Profile
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/40"
                                    onClick={() => {
                                      toast({
                                        title: "Contact Contractor",
                                        description: `You can contact ${previousContractor.contractorName} for this service again. Check your previous service records for contact details.`
                                      });
                                    }}
                                    data-testid={`button-contact-contractor-${task.id}`}
                                  >
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    Contact Again
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No tasks for this month and location
                  </h3>
                  <p className="text-muted-foreground">
                    Try selecting a different month or climate zone to see recommended maintenance tasks.
                  </p>
                </div>
              )}
            </div>

        {/* Custom Maintenance Tasks Section */}
        <div className="mt-12">
          <CustomMaintenanceTasks 
            homeownerId={homeownerId} 
            houseId={selectedHouseId}
          />
        </div>

        {/* My Appliances Section */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">My Appliances</h2>
              <p className="text-muted-foreground">
                Track your home appliances to help contractors provide better service
              </p>
            </div>
            <Button onClick={handleAddNewAppliance} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4" />
              Add Appliance
            </Button>
          </div>

            {appliancesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : appliances && appliances.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appliances.map((appliance) => (
                  <Card key={appliance.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Home className="w-5 h-5 text-muted-foreground" />
                          <h4 className="font-semibold text-foreground">
                            {getApplianceTypeLabel(appliance.applianceType)}
                          </h4>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEditAppliance(appliance)}
                            className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => deleteApplianceMutation.mutate(appliance.id)}
                            disabled={deleteApplianceMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Brand:</span>
                          <span className="font-medium">{appliance.brand}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model:</span>
                          <span className="font-medium">{appliance.model}</span>
                        </div>
                        {appliance.yearInstalled && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Year:</span>
                            <span className="font-medium">{appliance.yearInstalled}</span>
                          </div>
                        )}
                        {appliance.location && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Location:</span>
                            <span className="font-medium">{getApplianceLocationLabel(appliance.location)}</span>
                          </div>
                        )}
                        {appliance.lastServiceDate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Service:</span>
                            <span className="font-medium">{new Date(appliance.lastServiceDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {appliance.notes && (
                        <div className="mt-3 p-2 bg-muted rounded text-xs">
                          <span className="text-muted-foreground">{appliance.notes}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Home className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No appliances yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking your home appliances to help contractors provide better service.
                </p>
                <Button onClick={handleAddNewAppliance} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Appliance
                </Button>
              </div>
            )}
        </div>

        {/* Maintenance Log Section */}
        <div id="service-records" className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Service Records</h2>
                <p className="text-muted-foreground">Complete history of maintenance and repairs performed on your home</p>
              </div>
            </div>
            <Button onClick={handleAddNewMaintenanceLog} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Service Record
            </Button>
          </div>

          {maintenanceLogsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : maintenanceLogs && maintenanceLogs.length > 0 ? (
              <div className="space-y-4">
                {maintenanceLogs.map((log) => (
                  <Card key={log.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 p-2 rounded">
                            <Wrench className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground mb-1">
                              {log.serviceDescription}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(log.serviceDate).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {getHomeAreaLabel(log.homeArea)}
                              </span>
                              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                                {getServiceTypeLabel(log.serviceType)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEditMaintenanceLog(log)}
                            className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => deleteMaintenanceLogMutation.mutate(log.id)}
                            disabled={deleteMaintenanceLogMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {log.cost && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">${log.cost}</span>
                          </div>
                        )}
                        {log.contractorName && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{log.contractorName}</span>
                          </div>
                        )}
                        {log.contractorCompany && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span>{log.contractorCompany}</span>
                          </div>
                        )}
                        {log.nextServiceDue && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>Due: {new Date(log.nextServiceDue).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {log.notes && (
                        <div className="mt-4 p-3 bg-muted rounded text-sm">
                          <span className="text-muted-foreground">{log.notes}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No service records yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking maintenance and repairs to build a complete home service history.
                </p>
                <Button onClick={handleAddNewMaintenanceLog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Service Record
                </Button>
              </div>
            )}
        </div>

        {/* Appliance Form Dialog */}
        <Dialog open={isApplianceDialogOpen} onOpenChange={setIsApplianceDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAppliance ? 'Edit Appliance' : 'Add New Appliance'}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...applianceForm}>
              <form onSubmit={applianceForm.handleSubmit(onSubmitAppliance)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={applianceForm.control}
                    name="applianceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appliance Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select appliance type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {APPLIANCE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={applianceForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {APPLIANCE_LOCATIONS.map((location) => (
                              <SelectItem key={location.value} value={location.value}>
                                {location.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={applianceForm.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Whirlpool, GE" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={applianceForm.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="Model number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={applianceForm.control}
                    name="yearInstalled"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Installed</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="2020" 
                            {...field}
                            onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={applianceForm.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Serial number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={applianceForm.control}
                    name="warrantyExpiration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Expiration</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={applianceForm.control}
                    name="lastServiceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Service Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={applianceForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea 
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Any special notes or maintenance history..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsApplianceDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createApplianceMutation.isPending || updateApplianceMutation.isPending}
                  >
                    {createApplianceMutation.isPending || updateApplianceMutation.isPending ? 'Saving...' : editingAppliance ? 'Update' : 'Add'} Appliance
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Maintenance Log Form Dialog */}
        <Dialog open={isMaintenanceLogDialogOpen} onOpenChange={setIsMaintenanceLogDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMaintenanceLog ? 'Edit Service Record' : 'Add New Service Record'}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...maintenanceLogForm}>
              <form onSubmit={maintenanceLogForm.handleSubmit(onSubmitMaintenanceLog)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={maintenanceLogForm.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={maintenanceLogForm.control}
                    name="homeArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Area</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select home area" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HOME_AREAS.map((area) => (
                              <SelectItem key={area.value} value={area.value}>
                                {area.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={maintenanceLogForm.control}
                  name="serviceDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Annual HVAC tune-up, Gutter cleaning, Roof repair" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={maintenanceLogForm.control}
                    name="serviceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={maintenanceLogForm.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Service cost" 
                            {...field}
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={maintenanceLogForm.control}
                    name="contractorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contractor Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Contractor or technician name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={maintenanceLogForm.control}
                    name="contractorCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Company or service provider" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={maintenanceLogForm.control}
                    name="warrantyPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Period</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 1 year, 6 months" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={maintenanceLogForm.control}
                    name="nextServiceDue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Service Due</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={maintenanceLogForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea 
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Any additional notes about the service..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsMaintenanceLogDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMaintenanceLogMutation.isPending || updateMaintenanceLogMutation.isPending}
                  >
                    {createMaintenanceLogMutation.isPending || updateMaintenanceLogMutation.isPending ? 'Saving...' : editingMaintenanceLog ? 'Update' : 'Add'} Service Record
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* House Management Dialog */}
        <Dialog open={isHouseDialogOpen} onOpenChange={setIsHouseDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingHouse ? 'Edit House' : 'Add New House'}</DialogTitle>
            </DialogHeader>
            <Form {...houseForm}>
              <form onSubmit={houseForm.handleSubmit(onSubmitHouse)} className="space-y-4">
                <FormField
                  control={houseForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>House Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Main House, Vacation Home" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={houseForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="Start typing your address..." 
                            {...field} 
                            onChange={(e) => handleAddressChange(e.target.value, field.onChange)}
                            onFocus={() => {
                              if (addressSuggestions.length > 0) {
                                setShowAddressSuggestions(true);
                              }
                            }}
                            onBlur={() => {
                              // Delay hiding suggestions to allow clicks
                              setTimeout(() => setShowAddressSuggestions(false), 200);
                            }}
                          />
                          
                          {/* Address Suggestions Dropdown */}
                          {showAddressSuggestions && addressSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {addressSuggestions.map((suggestion, index) => (
                                <div
                                  key={suggestion.place_id || index}
                                  className="px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm border-b border-border last:border-b-0"
                                  onClick={() => handleAddressSuggestionSelect(suggestion, field.onChange)}
                                >
                                  <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
                                  <div className="text-xs text-muted-foreground">{suggestion.structured_formatting.secondary_text}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {isGeocodingAddress && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="animate-spin">⟳</span>
                          Detecting climate zone...
                        </p>
                      )}
                      {addressSuggestions.length > 0 && !showAddressSuggestions && (
                        <p className="text-xs text-muted-foreground">
                          Click on the input to see {addressSuggestions.length} address suggestions
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={houseForm.control}
                  name="climateZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Climate Zone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Will auto-detect from address" />
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
                      <p className="text-xs text-muted-foreground">
                        Climate zone will be automatically detected when you enter an address. You can manually override if needed.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <FormField
                  control={houseForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded border-input"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Set as default property
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsHouseDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createHouseMutation.isPending || updateHouseMutation.isPending}
                  >
                    {createHouseMutation.isPending || updateHouseMutation.isPending ? 'Saving...' : editingHouse ? 'Update' : 'Add'} House
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Home System Form Dialog */}
        <Dialog open={isHomeSystemDialogOpen} onOpenChange={setIsHomeSystemDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingHomeSystem ? `Edit ${selectedSystemType}` : `Add ${selectedSystemType}`}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...homeSystemForm}>
              <form onSubmit={homeSystemForm.handleSubmit(onSubmitHomeSystem)} className="space-y-4">
                <FormField
                  control={homeSystemForm.control}
                  name="yearInstalled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Installed</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 2020" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={homeSystemForm.control}
                  name="lastServiceYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Service Year (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 2023" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={homeSystemForm.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Carrier" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={homeSystemForm.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 24ABC3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={homeSystemForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Additional information..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsHomeSystemDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createHomeSystemMutation.isPending || updateHomeSystemMutation.isPending}
                  >
                    {createHomeSystemMutation.isPending || updateHomeSystemMutation.isPending ? (
                      "Saving..."
                    ) : (
                      editingHomeSystem ? "Update System" : "Add System"
                    )}
                  </Button>
                  {editingHomeSystem && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this system?')) {
                          deleteHomeSystemMutation.mutate(editingHomeSystem.id);
                          setIsHomeSystemDialogOpen(false);
                        }
                      }}
                      disabled={deleteHomeSystemMutation.isPending}
                    >
                      {deleteHomeSystemMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}