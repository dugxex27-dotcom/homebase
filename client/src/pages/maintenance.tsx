import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import HomeHealthScore from "@/components/home-health-score";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertMaintenanceLogSchema, insertCustomMaintenanceTaskSchema, insertHomeSystemSchema, insertTaskOverrideSchema, insertHomeApplianceSchema, insertHomeApplianceManualSchema } from "@shared/schema";
import type { MaintenanceLog, House, CustomMaintenanceTask, HomeSystem, TaskOverride, HomeAppliance, HomeApplianceManual, InvoiceAnalysis } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { HomeownerFeatureGate, HomeownerTrialBanner, FreeUserUpgradePrompt } from "@/components/homeowner-feature-gate";
import { useHomeownerSubscription } from "@/hooks/useHomeownerSubscription";
import { Calendar, Clock, Wrench, DollarSign, MapPin, RotateCcw, ChevronDown, ChevronUp, Settings, Plus, Edit, Trash2, Home, FileText, Building2, User, Building, Phone, MessageSquare, AlertTriangle, Thermometer, Cloud, Monitor, Book, ExternalLink, Upload, Trophy, Mail, Handshake, Globe, TrendingDown, PiggyBank, Truck, CheckCircle2, Circle, Download, X, Search, Loader2, Scan, AlertCircle, Sparkles, RefreshCw, ChevronRight } from "lucide-react";
import { AppointmentScheduler } from "@/components/appointment-scheduler";
import { CustomMaintenanceTasks } from "@/components/custom-maintenance-tasks";
import HouseMap from "@/components/house-map";
import logoHomeowner from "@assets/my-homebase-logo-tm-howner-white-final_1776538414393.png";
import "./home.css";
import { US_MAINTENANCE_DATA, getRegionFromClimateZone, getCurrentMonthTasks } from "@shared/location-maintenance-data";
import { enrichTasksWithCosts } from "@shared/cost-helpers";
import { formatCostEstimate, formatDIYSavings, type CostEstimate } from "@shared/cost-baselines";

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
  actionSummary?: string; // Single sentence action summary
  steps?: string[]; // Bullet point steps
  toolsAndSupplies?: string[]; // Tools and supplies checklist
  month: number;
  climateZones: string[];
  priority: string;
  estimatedTime: string;
  difficulty: string;
  category: string;
  tools: string[] | null;
  cost: string | null;
  systemRequirements?: string[]; // Home systems required for this task
  costEstimate?: CostEstimate;
  impact?: string; // What happens if not completed
  impactCost?: string; // Potential costs if not done
}



// Form schema for maintenance log creation/editing
const maintenanceLogFormSchema = insertMaintenanceLogSchema.extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
  homeArea: z.string().optional(),
  serviceDescription: z.string().optional(),
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

// Form schema for appliance creation/editing
const applianceFormSchema = insertHomeApplianceSchema.extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
  houseId: z.string().min(1, "House ID is required"),
  name: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
});

// Form schema for appliance manual creation/editing
const applianceManualFormSchema = insertHomeApplianceManualSchema.extend({
  applianceId: z.string().min(1, "Appliance ID is required"),
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1, "Type is required"),
  source: z.string().min(1, "Source is required"),
  url: z.string().min(1, "URL is required"),
});

// Form schema for home system creation/editing
const homeSystemFormSchema = insertHomeSystemSchema.extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
  specificMonths: z.array(z.string()).optional(),
  serialNumber: z.string().optional(),
});

type MaintenanceLogFormData = z.infer<typeof maintenanceLogFormSchema>;
type HouseFormData = z.infer<typeof houseFormSchema>;
type CustomTaskFormData = z.infer<typeof customTaskFormSchema>;



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

// Generate stable task ID from task title for override tracking
const generateTaskId = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
};

// Helper function to get task override for a specific task
const getTaskOverride = (taskTitle: string, overrides: TaskOverride[]): TaskOverride | undefined => {
  const taskId = generateTaskId(taskTitle);
  return overrides.find(override => override.taskId === taskId);
};

// Helper function to check if a task is enabled (default true unless disabled by override)
const isTaskEnabled = (taskTitle: string, overrides: TaskOverride[]): boolean => {
  const override = getTaskOverride(taskTitle, overrides);
  return override ? override.isEnabled : true;
};

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
    { value: "wood-stove", label: "Wood Stove/Fireplace" },
    { value: "humidifier", label: "Whole-Home Humidifier" }
  ],
  cooling: [
    { value: "central-ac", label: "Central AC" },
    { value: "window-ac", label: "Window AC Units" },
    { value: "mini-split", label: "Mini-Split System" },
    { value: "evaporative", label: "Evaporative Cooler" },
    { value: "dehumidifier", label: "Whole-Home Dehumidifier" },
    { value: "air-purifier", label: "Air Purifier / Filtration" }
  ],
  water: [
    { value: "gas-water-heater", label: "Gas Water Heater" },
    { value: "electric-water-heater", label: "Electric Water Heater" },
    { value: "tankless-gas", label: "Tankless Gas Water Heater" },
    { value: "tankless-electric", label: "Tankless Electric Water Heater" },
    { value: "solar-water", label: "Solar Water Heating" },
    { value: "well-water", label: "Well Water System" },
    { value: "water-softener", label: "Water Softener" },
    { value: "reverse-osmosis", label: "Reverse Osmosis System" }
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
  ],
  exterior: [
    { value: "roof-asphalt", label: "Asphalt Shingle Roof" },
    { value: "roof-metal", label: "Metal Roof" },
    { value: "roof-tile", label: "Tile / Slate Roof" },
    { value: "roof-flat", label: "Flat Roof (TPO/EPDM)" },
    { value: "gutters", label: "Gutters & Downspouts" },
    { value: "siding-vinyl", label: "Vinyl Siding" },
    { value: "siding-fibercement", label: "Fiber Cement Siding" },
    { value: "siding-wood", label: "Wood Siding" },
    { value: "windows-ext", label: "Exterior Windows" },
    { value: "entry-doors", label: "Entry Doors" },
    { value: "garage-door", label: "Garage Door" },
    { value: "deck-wood", label: "Wood Deck" },
    { value: "deck-composite", label: "Composite Deck" }
  ],
  electrical: [
    { value: "electrical-panel", label: "Electrical Panel (Breaker Box)" },
    { value: "electrical-subpanel", label: "Sub Panel" },
    { value: "surge-protector", label: "Whole-home Surge Protector" },
    { value: "ev-charger", label: "EV Charger (Level 2)" },
    { value: "smoke-co-detectors", label: "Smoke / CO Detectors" }
  ],
  structural: [
    { value: "foundation-slab", label: "Foundation (Slab)" },
    { value: "foundation-crawl", label: "Foundation (Crawl Space)" },
    { value: "foundation-basement", label: "Foundation (Full Basement)" },
    { value: "vapor-barrier", label: "Vapor Barrier" },
    { value: "radon-mitigation", label: "Radon Mitigation System" },
    { value: "waterproofing", label: "Basement Waterproofing" }
  ],
  insulation: [
    { value: "attic-insulation", label: "Attic Insulation" },
    { value: "wall-insulation", label: "Wall Insulation" },
    { value: "crawl-insulation", label: "Crawl Space Insulation" },
    { value: "attic-ventilation", label: "Attic Ventilation" },
    { value: "air-sealing", label: "Air Sealing" }
  ]
};

const APPLIANCE_TYPES: { category: string; items: { value: string; label: string; brands: string[] }[] }[] = [
  {
    category: "Kitchen",
    items: [
      { value: "Refrigerator", label: "Refrigerator", brands: ["Samsung", "LG", "Whirlpool", "GE", "Frigidaire", "Bosch", "Sub-Zero", "KitchenAid", "Maytag"] },
      { value: "Dishwasher", label: "Dishwasher", brands: ["Bosch", "Whirlpool", "GE", "Frigidaire", "KitchenAid", "Samsung", "LG", "Miele", "Maytag"] },
      { value: "Range / Oven", label: "Range / Oven", brands: ["GE", "Whirlpool", "Samsung", "LG", "Frigidaire", "Wolf", "Viking", "Bosch", "KitchenAid"] },
      { value: "Cooktop", label: "Cooktop", brands: ["GE", "Bosch", "Samsung", "LG", "Wolf", "Miele", "Frigidaire", "KitchenAid", "Thermador"] },
      { value: "Microwave", label: "Microwave", brands: ["Panasonic", "GE", "Samsung", "LG", "Toshiba", "Frigidaire", "Whirlpool", "Sharp", "Breville"] },
      { value: "Garbage Disposal", label: "Garbage Disposal", brands: ["InSinkErator", "Moen", "Waste King", "GE", "Whirlpool", "KitchenAid"] },
      { value: "Refrigerator (Garage)", label: "Refrigerator (Garage)", brands: ["Samsung", "LG", "Whirlpool", "GE", "Frigidaire", "Maytag", "Haier"] },
    ],
  },
  {
    category: "Laundry",
    items: [
      { value: "Washing Machine", label: "Washing Machine", brands: ["Whirlpool", "LG", "Samsung", "GE", "Maytag", "Speed Queen", "Electrolux", "Bosch", "Miele"] },
      { value: "Dryer", label: "Dryer", brands: ["Whirlpool", "LG", "Samsung", "GE", "Maytag", "Speed Queen", "Electrolux", "Bosch", "Miele"] },
      { value: "Washer/Dryer Combo", label: "Washer/Dryer Combo", brands: ["LG", "Samsung", "Bosch", "Whirlpool", "GE", "Miele"] },
    ],
  },
  {
    category: "Outdoor & Power",
    items: [
      { value: "Lawn Mower", label: "Lawn Mower", brands: ["Honda", "John Deere", "Husqvarna", "Toro", "Cub Cadet", "Greenworks", "EGO", "RYOBI"] },
      { value: "Riding Mower / Tractor", label: "Riding Mower / Tractor", brands: ["John Deere", "Husqvarna", "Cub Cadet", "Toro", "Craftsman", "Troy-Bilt", "Ariens"] },
      { value: "Snow Blower", label: "Snow Blower", brands: ["Toro", "Husqvarna", "Ariens", "Cub Cadet", "Troy-Bilt", "Craftsman", "Honda", "EGO"] },
      { value: "Pool Pump", label: "Pool Pump", brands: ["Pentair", "Hayward", "Jandy", "Zodiac", "Sta-Rite", "AquaStar"] },
      { value: "Generator (Portable)", label: "Generator (Portable)", brands: ["Honda", "Generac", "Champion", "Briggs & Stratton", "Westinghouse", "Pulsar"] },
      { value: "Generator (Standby)", label: "Generator (Standby)", brands: ["Generac", "Kohler", "Cummins", "Briggs & Stratton", "Honda", "Champion"] },
    ],
  },
  {
    category: "Other",
    items: [
      { value: "Garage Door Opener", label: "Garage Door Opener", brands: ["LiftMaster", "Chamberlain", "Genie", "Craftsman", "Linear", "Ryobi", "Overhead Door"] },
      { value: "Ceiling Fan", label: "Ceiling Fan", brands: ["Hunter", "Minka-Aire", "Hampton Bay", "Casablanca", "Progress Lighting", "Emerson"] },
      { value: "Central Vacuum", label: "Central Vacuum", brands: ["Beam", "NuTone", "Vacuflo", "Broan", "Hayden", "HP Products"] },
      { value: "Smart Home Hub", label: "Smart Home Hub", brands: ["Google", "Amazon", "Samsung SmartThings", "Apple", "Hubitat"] },
      { value: "Security System Panel", label: "Security System Panel", brands: ["ADT", "Ring", "SimpliSafe", "Honeywell", "DSC", "Bosch", "2GIG"] },
      { value: "Other", label: "Other Appliance", brands: [] },
    ],
  },
];

// System lifespan and maintenance recommendations
interface SystemRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  urgency: 'critical' | 'important' | 'routine';
  estimatedCost?: string;
}

function generateAgeBasedRecommendations(system: HomeSystem): SystemRecommendation[] {
  if (!system.installationYear) return [];
  
  const currentYear = new Date().getFullYear();
  const age = currentYear - system.installationYear;
  const systemLabel = Object.values(HOME_SYSTEMS)
    .flat()
    .find(s => s.value === system.systemType)?.label || system.systemType;
  
  const recommendations: SystemRecommendation[] = [];
  
  // Heating Systems - Furnaces (gas, oil, electric)
  if (system.systemType.includes('furnace')) {
    if (age >= 15) {
      recommendations.push({
        title: `${systemLabel} Nearing End of Life`,
        description: `Your ${systemLabel.toLowerCase()} is ${age} years old. Furnaces typically last 15-20 years. Consider budgeting for replacement and schedule annual professional maintenance to maximize remaining lifespan.`,
        priority: 'high',
        urgency: age >= 18 ? 'critical' : 'important',
        estimatedCost: '$3,000 - $7,000'
      });
    } else if (age >= 10) {
      recommendations.push({
        title: `Annual ${systemLabel} Professional Service`,
        description: `Your ${systemLabel.toLowerCase()} is ${age} years old. Schedule annual professional maintenance to ensure efficiency and catch potential issues early.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$150 - $300'
      });
    } else if (age >= 3) {
      recommendations.push({
        title: `${systemLabel} Regular Maintenance`,
        description: `Your ${systemLabel.toLowerCase()} is ${age} years old. Change filters monthly and schedule annual professional inspections.`,
        priority: 'low',
        urgency: 'routine',
        estimatedCost: '$100 - $200'
      });
    }
  }
  
  // Heat Pumps
  else if (system.systemType === 'heat-pump') {
    if (age >= 12) {
      recommendations.push({
        title: `${systemLabel} Approaching End of Life`,
        description: `Your heat pump is ${age} years old. Heat pumps typically last 12-15 years. Plan for replacement and ensure bi-annual maintenance.`,
        priority: 'high',
        urgency: age >= 14 ? 'critical' : 'important',
        estimatedCost: '$4,000 - $8,000'
      });
    } else if (age >= 5) {
      recommendations.push({
        title: `Bi-Annual ${systemLabel} Service`,
        description: `Your heat pump is ${age} years old. Schedule professional service twice yearly (spring and fall) to maintain efficiency.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$150 - $300 per service'
      });
    }
  }
  
  // Boilers
  else if (system.systemType === 'boiler') {
    if (age >= 20) {
      recommendations.push({
        title: `${systemLabel} Nearing End of Life`,
        description: `Your boiler is ${age} years old. Boilers typically last 20-30 years. Schedule professional inspection and budget for eventual replacement.`,
        priority: 'high',
        urgency: age >= 25 ? 'critical' : 'important',
        estimatedCost: '$4,000 - $9,000'
      });
    } else if (age >= 10) {
      recommendations.push({
        title: `Annual ${systemLabel} Inspection`,
        description: `Your boiler is ${age} years old. Annual professional inspection and cleaning ensures safe and efficient operation.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$200 - $400'
      });
    }
  }
  
  // Radiant Floor Heating
  else if (system.systemType === 'radiant-floor') {
    if (age >= 25) {
      recommendations.push({
        title: `${systemLabel} System Check`,
        description: `Your radiant floor heating is ${age} years old. While these systems can last 35+ years, schedule a professional inspection to check for leaks or circulation issues.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$200 - $500'
      });
    }
  }
  
  // Wood Stove/Fireplace
  else if (system.systemType === 'wood-stove') {
    recommendations.push({
      title: `Annual Chimney Inspection and Cleaning`,
      description: `Wood stoves and fireplaces require annual chimney sweeping to prevent creosote buildup and fire hazards. Schedule before heating season.`,
      priority: 'high',
      urgency: 'important',
      estimatedCost: '$150 - $350'
    });
  }
  
  // Cooling Systems - Central AC
  else if (system.systemType === 'central-ac') {
    if (age >= 12) {
      recommendations.push({
        title: `${systemLabel} Nearing Replacement`,
        description: `Your central AC is ${age} years old. Most central AC units last 12-15 years. Consider replacement, especially if efficiency has decreased or repairs are becoming frequent.`,
        priority: 'high',
        urgency: age >= 14 ? 'critical' : 'important',
        estimatedCost: '$3,500 - $7,500'
      });
    } else if (age >= 5) {
      recommendations.push({
        title: `Annual ${systemLabel} Service`,
        description: `Your central AC is ${age} years old. Schedule annual professional maintenance before cooling season to ensure peak efficiency.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$100 - $200'
      });
    }
  }
  
  // Window AC Units
  else if (system.systemType === 'window-ac') {
    if (age >= 10) {
      recommendations.push({
        title: `${systemLabel} Replacement Consideration`,
        description: `Your window AC units are ${age} years old. Most window units last 8-12 years. Consider upgrading to more efficient models.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$300 - $800 per unit'
      });
    }
  }
  
  // Mini-Split Systems
  else if (system.systemType === 'mini-split') {
    if (age >= 15) {
      recommendations.push({
        title: `${systemLabel} Approaching Replacement`,
        description: `Your mini-split system is ${age} years old. These systems typically last 15-20 years. Schedule professional maintenance and plan for eventual replacement.`,
        priority: 'high',
        urgency: age >= 18 ? 'critical' : 'important',
        estimatedCost: '$2,000 - $5,000'
      });
    } else if (age >= 5) {
      recommendations.push({
        title: `Annual ${systemLabel} Maintenance`,
        description: `Your mini-split is ${age} years old. Clean filters monthly and schedule annual professional service.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$100 - $250'
      });
    }
  }
  
  // Evaporative Cooler
  else if (system.systemType === 'evaporative') {
    if (age >= 15) {
      recommendations.push({
        title: `${systemLabel} Replacement Consideration`,
        description: `Your evaporative cooler is ${age} years old. These units typically last 15-20 years. Inspect for rust and water leaks.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$1,500 - $3,500'
      });
    }
    recommendations.push({
      title: `Seasonal ${systemLabel} Maintenance`,
      description: `Clean pads, check water distribution, and inspect for mineral buildup before cooling season.`,
      priority: 'medium',
      urgency: 'routine',
      estimatedCost: '$100 - $200'
    });
  }
  
  // Water Systems - Water Heaters
  else if (system.systemType.includes('water-heater') || system.systemType.includes('tankless')) {
    const isTankless = system.systemType.includes('tankless');
    const typicalLifespan = isTankless ? 20 : 10;
    
    if (age >= typicalLifespan) {
      recommendations.push({
        title: `${systemLabel} Replacement Needed`,
        description: `Your water heater is ${age} years old. ${isTankless ? 'Tankless water heaters' : 'Tank water heaters'} typically last ${typicalLifespan}-${typicalLifespan + 5} years. Plan for replacement soon to avoid emergency failure.`,
        priority: 'high',
        urgency: age >= typicalLifespan + 2 ? 'critical' : 'important',
        estimatedCost: isTankless ? '$1,500 - $3,500' : '$800 - $2,000'
      });
    } else if (age >= typicalLifespan - 3) {
      recommendations.push({
        title: `${systemLabel} Annual Maintenance`,
        description: `Your water heater is ${age} years old. ${isTankless ? 'Flush system to remove mineral buildup' : 'Flush tank and check anode rod'} annually to extend lifespan.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$100 - $200'
      });
    }
  }
  
  // Solar Water Heating
  else if (system.systemType === 'solar-water') {
    if (age >= 15) {
      recommendations.push({
        title: `${systemLabel} System Inspection`,
        description: `Your solar water heating system is ${age} years old. Check panels, pumps, and heat exchangers for efficiency. Systems typically last 15-25 years.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$200 - $500'
      });
    }
  }
  
  // Well Water System
  else if (system.systemType === 'well-water') {
    if (age >= 20) {
      recommendations.push({
        title: `Well Pump Approaching End of Life`,
        description: `Your well pump is ${age} years old. Well pumps typically last 15-25 years. Consider replacement planning and annual water quality testing.`,
        priority: 'high',
        urgency: age >= 23 ? 'critical' : 'important',
        estimatedCost: '$1,500 - $4,000'
      });
    } else {
      recommendations.push({
        title: `Annual Well Water Quality Test`,
        description: `Test your well water annually for bacteria, nitrates, and other contaminants to ensure safe drinking water.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$50 - $150'
      });
    }
  }
  
  // Water Softener
  else if (system.systemType === 'water-softener') {
    if (age >= 15) {
      recommendations.push({
        title: `${systemLabel} Replacement Consideration`,
        description: `Your water softener is ${age} years old. Most units last 10-20 years. Check for salt bridging and resin bed wear.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$800 - $2,500'
      });
    }
    recommendations.push({
      title: `Water Softener Maintenance`,
      description: `Check salt levels monthly, clean brine tank annually, and test water hardness regularly.`,
      priority: 'low',
      urgency: 'routine',
      estimatedCost: '$50 - $100'
    });
  }
  
  // Special Features - Solar Panels
  else if (system.systemType === 'solar-panels') {
    if (age >= 20) {
      recommendations.push({
        title: `Solar Panel Efficiency Assessment`,
        description: `Your solar panels are ${age} years old. Panels degrade 0.5-1% per year. Schedule professional inspection to assess current efficiency and plan for replacement around year 25-30.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$200 - $500 for inspection'
      });
    }
    recommendations.push({
      title: `Bi-Annual Solar Panel Cleaning`,
      description: `Clean panels twice yearly to maintain peak efficiency, more often in dusty or high-pollen areas.`,
      priority: 'low',
      urgency: 'routine',
      estimatedCost: '$150 - $300'
    });
  }
  
  // Swimming Pool
  else if (system.systemType === 'pool') {
    if (age >= 8) {
      recommendations.push({
        title: `Pool Equipment Inspection`,
        description: `Your pool equipment is ${age} years old. Pool pumps and filters typically last 8-12 years. Inspect for wear, unusual noises, and efficiency loss.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$800 - $2,500 for equipment replacement'
      });
    }
    recommendations.push({
      title: `Weekly Pool Maintenance`,
      description: `Test water chemistry weekly, clean filters monthly, and schedule professional seasonal maintenance.`,
      priority: 'medium',
      urgency: 'routine',
      estimatedCost: '$100 - $200 monthly for service'
    });
  }
  
  // Hot Tub/Spa
  else if (system.systemType === 'spa') {
    if (age >= 10) {
      recommendations.push({
        title: `${systemLabel} Equipment Check`,
        description: `Your spa is ${age} years old. Hot tub equipment typically lasts 5-15 years. Check pumps, heaters, and jets for wear.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$500 - $2,000'
      });
    }
    recommendations.push({
      title: `Spa Water Maintenance`,
      description: `Test and balance water chemistry 2-3 times per week. Replace filters every 1-2 years.`,
      priority: 'medium',
      urgency: 'routine',
      estimatedCost: '$50 - $100 monthly'
    });
  }
  
  // Backup Generator
  else if (system.systemType === 'generator') {
    if (age >= 15) {
      recommendations.push({
        title: `${systemLabel} Replacement Planning`,
        description: `Your backup generator is ${age} years old. Standby generators typically last 10-20 years with proper maintenance.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$3,000 - $15,000'
      });
    }
    recommendations.push({
      title: `Annual Generator Service`,
      description: `Schedule annual professional maintenance including oil changes, filter replacement, and load testing.`,
      priority: 'high',
      urgency: 'important',
      estimatedCost: '$200 - $400'
    });
  }
  
  // Septic System
  else if (system.systemType === 'septic') {
    if (age >= 25) {
      recommendations.push({
        title: `${systemLabel} Professional Inspection`,
        description: `Your septic system is ${age} years old. Septic systems last 20-40 years with proper care. Schedule professional inspection and consider replacement planning.`,
        priority: 'high',
        urgency: 'important',
        estimatedCost: '$3,000 - $10,000 for replacement'
      });
    }
    recommendations.push({
      title: `Septic Tank Pumping (Every 3-5 Years)`,
      description: `Regular pumping prevents system failure and extends lifespan. Schedule every 3-5 years based on household size.`,
      priority: 'high',
      urgency: 'important',
      estimatedCost: '$300 - $600'
    });
  }
  
  // Sump Pump
  else if (system.systemType === 'sump-pump') {
    if (age >= 7) {
      recommendations.push({
        title: `${systemLabel} Replacement Needed`,
        description: `Your sump pump is ${age} years old. Sump pumps typically last 7-10 years. Replace before failure to avoid basement flooding.`,
        priority: 'high',
        urgency: age >= 9 ? 'critical' : 'important',
        estimatedCost: '$400 - $1,000'
      });
    }
    recommendations.push({
      title: `Seasonal Sump Pump Test`,
      description: `Test pump quarterly by pouring water into pit. Clean intake screen and check discharge line before rainy season.`,
      priority: 'high',
      urgency: 'important',
      estimatedCost: '$0'
    });
  }
  
  // Security System
  else if (system.systemType === 'security-system') {
    if (age >= 10) {
      recommendations.push({
        title: `${systemLabel} Upgrade Consideration`,
        description: `Your security system is ${age} years old. Technology advances quickly. Consider upgrading to modern smart security systems.`,
        priority: 'low',
        urgency: 'routine',
        estimatedCost: '$500 - $2,500'
      });
    }
    recommendations.push({
      title: `Security System Maintenance`,
      description: `Test sensors monthly, replace batteries annually, and update software/firmware regularly.`,
      priority: 'medium',
      urgency: 'routine',
      estimatedCost: '$50 - $150'
    });
  }
  
  // Irrigation/Sprinkler System
  else if (system.systemType === 'sprinkler-system') {
    if (age >= 15) {
      recommendations.push({
        title: `${systemLabel} Component Replacement`,
        description: `Your irrigation system is ${age} years old. Valves, controllers, and heads may need replacement after 10-20 years.`,
        priority: 'medium',
        urgency: 'routine',
        estimatedCost: '$500 - $2,000'
      });
    }
    recommendations.push({
      title: `Seasonal Sprinkler Maintenance`,
      description: `Winterize before frost, inspect heads and valves in spring, adjust for proper coverage throughout growing season.`,
      priority: 'medium',
      urgency: 'routine',
      estimatedCost: '$100 - $300'
    });
  }
  
  // ── Roof & Exterior ──────────────────────────────────────────────────────
  else if (system.systemType === 'Asphalt Shingle Roof' || system.systemType === 'roof-asphalt') {
    if (age >= 20) {
      recommendations.push({ title: 'Roof Replacement Due', description: `Your asphalt shingle roof is ${age} years old. Typical lifespan is 20–30 years. Have a roofer evaluate it promptly.`, priority: 'high', urgency: 'critical', estimatedCost: '$7,000 – $15,000' });
    } else if (age >= 15) {
      recommendations.push({ title: 'Roof Inspection Recommended', description: `At ${age} years, your roof is in its second half of life. Schedule an annual professional inspection and check for missing or curling shingles.`, priority: 'high', urgency: 'important', estimatedCost: '$150 – $400' });
    }
    recommendations.push({ title: 'Annual Roof Check', description: 'Inspect after major storms. Clear debris from valleys and around penetrations. Look for curling, cracking, or missing shingles.', priority: 'medium', urgency: 'routine', estimatedCost: '$0 – $200' });
  }
  else if (system.systemType === 'Metal Roof' || system.systemType === 'roof-metal') {
    if (age >= 40) {
      recommendations.push({ title: 'Metal Roof Inspection', description: `Your metal roof is ${age} years old (lifespan 40–70 yrs). Check fasteners, seams, and coatings.`, priority: 'medium', urgency: 'important', estimatedCost: '$500 – $2,000' });
    }
    recommendations.push({ title: 'Metal Roof Maintenance', description: 'Inspect fasteners and seams every 3–5 years. Re-coat if paint or sealant is fading. Clear debris to prevent rust spots.', priority: 'low', urgency: 'routine', estimatedCost: '$300 – $1,500' });
  }
  else if (system.systemType === 'Tile / Slate Roof' || system.systemType === 'roof-tile') {
    if (age >= 50) {
      recommendations.push({ title: 'Roof Underlayment Replacement', description: `Tile/slate roofs last 50–100 years, but the underlayment beneath may need replacement around ${age} years. Have it inspected.`, priority: 'high', urgency: 'important', estimatedCost: '$5,000 – $12,000' });
    }
    recommendations.push({ title: 'Tile Roof Inspection', description: 'Inspect annually for cracked or slipped tiles. Walk carefully — tile is fragile. Check flashing around chimneys and valleys.', priority: 'medium', urgency: 'routine', estimatedCost: '$150 – $500' });
  }
  else if (system.systemType === 'Flat Roof (TPO/EPDM)' || system.systemType === 'roof-flat') {
    if (age >= 12) {
      recommendations.push({ title: 'Flat Roof Replacement', description: `Your flat roof is ${age} years old. TPO/EPDM typically lasts 10–20 years. Inspect for blistering, ponding water, and seam separation.`, priority: 'high', urgency: age >= 18 ? 'critical' : 'important', estimatedCost: '$5,000 – $14,000' });
    }
    recommendations.push({ title: 'Flat Roof Maintenance', description: 'Inspect seams and drains twice a year. Clear debris after storms. Patch small punctures promptly to prevent moisture intrusion.', priority: 'high', urgency: 'routine', estimatedCost: '$200 – $800' });
  }
  else if (system.systemType === 'Gutters & Downspouts' || system.systemType === 'gutters') {
    if (age >= 20) {
      recommendations.push({ title: 'Gutter Replacement', description: `Your gutters are ${age} years old. Aluminum gutters last 20–30 years. Look for rust, sagging, or separating seams.`, priority: 'medium', urgency: 'routine', estimatedCost: '$800 – $2,500' });
    }
    recommendations.push({ title: 'Gutter Cleaning', description: 'Clean gutters twice a year (spring and fall). Inspect downspout extensions — water should discharge at least 6 ft from the foundation.', priority: 'high', urgency: 'routine', estimatedCost: '$100 – $300' });
  }
  else if (['Vinyl Siding', 'Fiber Cement Siding', 'Wood Siding', 'siding-vinyl', 'siding-fibercement', 'siding-wood'].includes(system.systemType)) {
    const lifespan = system.systemType.includes('vinyl') || system.systemType === 'Vinyl Siding' ? 25 : system.systemType.includes('fiber') || system.systemType === 'Fiber Cement Siding' ? 35 : 20;
    if (age >= lifespan - 5) {
      recommendations.push({ title: 'Siding Replacement Planning', description: `Your siding is ${age} years old (typical lifespan ${lifespan} yrs). Budget for replacement and look for warping, cracking, or moisture damage.`, priority: 'medium', urgency: age >= lifespan ? 'important' : 'routine', estimatedCost: '$6,000 – $20,000' });
    }
    recommendations.push({ title: 'Siding Inspection', description: 'Check annually for cracks, gaps, warping, or mold. Caulk around windows and trim. Power-wash every 1–2 years.', priority: 'medium', urgency: 'routine', estimatedCost: '$100 – $500' });
  }
  else if (system.systemType === 'Exterior Windows' || system.systemType === 'windows-ext') {
    if (age >= 20) {
      recommendations.push({ title: 'Window Replacement', description: `Your windows are ${age} years old. Seals often fail after 15–25 years causing fogging, drafts, and energy loss.`, priority: 'medium', urgency: 'important', estimatedCost: '$300 – $900 per window' });
    }
    recommendations.push({ title: 'Window Maintenance', description: 'Check weatherstripping and caulking annually. Look for fogging between panes (seal failure). Clean tracks and lubricate hardware.', priority: 'low', urgency: 'routine', estimatedCost: '$50 – $200' });
  }
  else if (system.systemType === 'Entry Doors' || system.systemType === 'entry-doors') {
    if (age >= 25) {
      recommendations.push({ title: 'Door Replacement Consideration', description: `Entry doors typically last 20–30 years. At ${age} years, check for warping, poor sealing, and compromised security.`, priority: 'medium', urgency: 'routine', estimatedCost: '$800 – $3,500' });
    }
    recommendations.push({ title: 'Door Maintenance', description: 'Inspect weatherstripping annually. Lubricate hinges and deadbolts. Re-caulk exterior trim. Check threshold seal.', priority: 'low', urgency: 'routine', estimatedCost: '$30 – $150' });
  }
  else if (system.systemType === 'Garage Door' || system.systemType === 'garage-door') {
    if (age >= 15) {
      recommendations.push({ title: 'Garage Door / Opener Evaluation', description: `Your garage door is ${age} years old. Springs last 10–15 years and are a safety hazard when worn. Have a pro evaluate.`, priority: 'high', urgency: age >= 15 ? 'important' : 'routine', estimatedCost: '$200 – $600 (springs) / $800 – $2,500 (full door)' });
    }
    recommendations.push({ title: 'Garage Door Maintenance', description: 'Lubricate rollers, hinges, and tracks annually. Test auto-reverse safety feature monthly. Replace weather seal when cracked.', priority: 'medium', urgency: 'routine', estimatedCost: '$0 – $100' });
  }
  else if (['Wood Deck', 'Composite Deck', 'deck-wood', 'deck-composite'].includes(system.systemType)) {
    const isWood = system.systemType === 'Wood Deck' || system.systemType === 'deck-wood';
    if (age >= (isWood ? 12 : 20)) {
      recommendations.push({ title: `${systemLabel} Evaluation`, description: `${isWood ? `Wood decks` : `Composite decks`} last ${isWood ? '10–20' : '20–30'} years. At ${age} years, check for rot, loose fasteners, and structural integrity.`, priority: 'high', urgency: 'important', estimatedCost: isWood ? '$3,000 – $15,000' : '$8,000 – $25,000' });
    }
    recommendations.push({ title: `${systemLabel} Maintenance`, description: isWood ? 'Seal or stain every 2–3 years. Check joists for rot annually. Replace cracked boards promptly.' : 'Clean with soap and water twice a year. Check fasteners and framing annually. Avoid abrasive cleaners.', priority: 'medium', urgency: 'routine', estimatedCost: isWood ? '$300 – $1,500' : '$100 – $400' });
  }

  // ── Electrical ───────────────────────────────────────────────────────────
  else if (system.systemType === 'Electrical Panel (Breaker Box)' || system.systemType === 'electrical-panel') {
    if (age >= 25) {
      recommendations.push({ title: 'Electrical Panel Inspection', description: `Your electrical panel is ${age} years old. Panels over 25–40 years should be professionally inspected. Look for recalled brands (Zinsco, Federal Pacific).`, priority: 'high', urgency: age >= 35 ? 'critical' : 'important', estimatedCost: '$150 – $400 (inspection) / $1,500 – $4,000 (replacement)' });
    }
    recommendations.push({ title: 'Panel Annual Check', description: 'Look for tripping breakers, warm panel cover, or burning smells. Label all breakers. Ensure adequate capacity for home loads.', priority: 'high', urgency: 'routine', estimatedCost: '$0' });
  }
  else if (system.systemType === 'Smoke / CO Detectors' || system.systemType === 'smoke-co-detectors') {
    if (age >= 10) {
      recommendations.push({ title: 'Detector Replacement Required', description: `Smoke and CO detectors must be replaced every 10 years. Yours are ${age} years old — replace immediately.`, priority: 'high', urgency: 'critical', estimatedCost: '$30 – $80 each' });
    }
    recommendations.push({ title: 'Monthly Detector Test', description: 'Press the test button monthly. Replace batteries annually (or get 10-year sealed battery models). Vacuum gently to clear dust from sensors.', priority: 'high', urgency: 'routine', estimatedCost: '$10 – $30/year' });
  }

  // ── Plumbing ─────────────────────────────────────────────────────────────
  else if (system.systemType === 'Supply Pipes (Galvanized)' || system.systemType === 'pipes-galvanized') {
    if (age >= 30) {
      recommendations.push({ title: 'Galvanized Pipe Replacement', description: `Galvanized pipes corrode from the inside and have a lifespan of 40–70 years, but water quality and pressure degrade significantly after ${age} years. Budget for full replacement.`, priority: 'high', urgency: age >= 50 ? 'critical' : 'important', estimatedCost: '$4,000 – $15,000' });
    } else {
      recommendations.push({ title: 'Galvanized Pipe Monitoring', description: 'Check water pressure and color at faucets. Orange/brown water signals interior corrosion. Have pipes inspected to plan ahead for replacement.', priority: 'medium', urgency: 'routine', estimatedCost: '$100 – $300' });
    }
  }
  else if (['Supply Pipes (Copper)', 'Supply Pipes (PEX)', 'Supply Pipes (CPVC)', 'pipes-copper', 'pipes-pex', 'pipes-cpvc'].includes(system.systemType)) {
    if (age >= 40) {
      recommendations.push({ title: 'Pipe Inspection', description: `At ${age} years, have a plumber inspect joints and fittings for pinhole leaks or degradation.`, priority: 'medium', urgency: 'important', estimatedCost: '$150 – $400' });
    }
    recommendations.push({ title: 'Annual Leak Check', description: 'Inspect under sinks, at water heater connections, and at shutoff valves for drips. Ensure water pressure is 40–80 PSI (install a regulator if over 80).', priority: 'medium', urgency: 'routine', estimatedCost: '$0' });
  }
  else if (system.systemType === 'Main Sewer Line' || system.systemType === 'sewer-line') {
    if (age >= 30) {
      recommendations.push({ title: 'Sewer Scope Inspection', description: `Sewer lines 30+ years old are prone to root intrusion, bellying, and cracking. Schedule a camera inspection.`, priority: 'high', urgency: age >= 40 ? 'critical' : 'important', estimatedCost: '$150 – $300 (scope) / $3,000 – $25,000 (replacement)' });
    }
    recommendations.push({ title: 'Drain Maintenance', description: 'Avoid flushing wipes, grease, or non-biodegradable items. Scope the line every 5–7 years in older homes. Know your cleanout location.', priority: 'medium', urgency: 'routine', estimatedCost: '$100 – $300' });
  }

  // ── Foundation & Structure ───────────────────────────────────────────────
  else if (['Foundation (Slab)', 'Foundation (Crawl Space)', 'Foundation (Full Basement)', 'foundation-slab', 'foundation-crawl', 'foundation-basement'].includes(system.systemType)) {
    if (age >= 20) {
      recommendations.push({ title: 'Foundation Inspection', description: `Have a structural engineer or foundation specialist inspect for cracks, settling, water intrusion, and drainage issues — especially with a ${age}-year-old foundation.`, priority: age >= 40 ? 'high' : 'medium', urgency: 'important', estimatedCost: '$300 – $700 (inspection) / $5,000 – $50,000+ (repairs)' });
    }
    recommendations.push({ title: 'Annual Foundation Check', description: 'Walk the perimeter annually. Look for new cracks wider than 1/8", doors that stick, uneven floors, or water staining. Grade soil away from the foundation.', priority: 'high', urgency: 'routine', estimatedCost: '$0' });
  }
  else if (system.systemType === 'Radon Mitigation System' || system.systemType === 'radon-mitigation') {
    if (age >= 10) {
      recommendations.push({ title: 'Radon System Inspection', description: `Radon mitigation fans typically last 10–15 years. At ${age} years, verify the fan is still operating and test radon levels.`, priority: 'high', urgency: age >= 12 ? 'important' : 'routine', estimatedCost: '$15 – $30 (test kit) / $150 – $300 (fan replacement)' });
    }
    recommendations.push({ title: 'Radon Level Testing', description: 'Test radon levels every 2 years or after significant home renovations. EPA action level is 4 pCi/L. Keep fan indicator/manometer visible.', priority: 'high', urgency: 'routine', estimatedCost: '$15 – $30' });
  }

  // ── Attic & Insulation ───────────────────────────────────────────────────
  else if (system.systemType === 'Attic Insulation' || system.systemType === 'attic-insulation') {
    if (age >= 20) {
      recommendations.push({ title: 'Attic Insulation Upgrade', description: `Blown-in insulation settles over time. At ${age} years, measure your current R-value (recommended R-38 to R-60 for most climates). Adding insulation can cut energy bills 15–20%.`, priority: 'medium', urgency: 'routine', estimatedCost: '$1,500 – $4,000' });
    }
    recommendations.push({ title: 'Attic Insulation Check', description: 'Inspect annually for signs of moisture, pest damage, or compression. Ensure attic access hatch is insulated and sealed. Check that ventilation paths are unblocked.', priority: 'medium', urgency: 'routine', estimatedCost: '$0' });
  }
  else if (system.systemType === 'Attic Ventilation' || system.systemType === 'attic-ventilation') {
    recommendations.push({ title: 'Attic Ventilation Inspection', description: 'Check ridge vents, soffit vents, and gable vents annually for blockages, pest nests, or damage. Proper ventilation prevents ice dams, moisture, and premature shingle aging.', priority: 'medium', urgency: 'routine', estimatedCost: '$0 – $300' });
  }

  return recommendations;
}

// Task Detail Dialog Props
interface TaskDetailDialogProps {
  task: MaintenanceTask | null;
  open: boolean;
  onClose: () => void;
  completed: boolean;
  isCustomTask: boolean;
  displayDescription: string;
  previousContractor: any;
  taskOverride: TaskOverride | undefined;
  onViewContractor: (id: string) => void;
  onContractorComplete: (task: MaintenanceTask) => void;
  showCustomizeTask: string | null;
  setShowCustomizeTask: (id: string | null) => void;
  getTaskOverride: (taskTitle: string, overrides: TaskOverride[]) => TaskOverride | undefined;
  isTaskEnabled: (taskTitle: string, overrides: TaskOverride[]) => boolean;
  generateTaskId: (title: string) => string;
  upsertTaskOverrideMutation: any;
  deleteTaskOverrideMutation: any;
  completeTaskMutation: any;
  toast: any;
  taskOverrides: TaskOverride[] | undefined;
  selectedHouseId: string;
  houseName?: string;
}

function TaskDetailDialog({
  task,
  open,
  onClose,
  completed,
  isCustomTask,
  displayDescription,
  previousContractor,
  taskOverride,
  onViewContractor,
  onContractorComplete,
  showCustomizeTask,
  setShowCustomizeTask,
  getTaskOverride,
  isTaskEnabled,
  generateTaskId,
  upsertTaskOverrideMutation,
  deleteTaskOverrideMutation,
  completeTaskMutation,
  toast,
  taskOverrides,
  selectedHouseId,
  houseName,
}: TaskDetailDialogProps) {
  if (!task) return null;

  const getPriorityBadge = () => {
    if (task.priority === 'high') {
      return (
        <Badge className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-medium">
          HIGH PRIORITY
        </Badge>
      );
    }
    if (task.priority === 'medium') {
      return (
        <Badge className="bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-medium">
          MEDIUM PRIORITY
        </Badge>
      );
    }
    if (task.priority === 'low') {
      return (
        <Badge className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">
          LOW PRIORITY
        </Badge>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90dvh] overflow-y-auto p-0">
        <div className={`${completed ? 'bg-green-50' : 'bg-white'}`}>
          <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              {houseName && (
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                  <Home className="w-4 h-4" />
                  <span>{houseName}</span>
                </div>
              )}
              <div className="flex items-center gap-3 mb-2">
                {getPriorityBadge()}
                <Badge variant="outline" className="text-xs">
                  {task.category}
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#2c0f5b' }}>
                {task.title}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="prose max-w-none">
              <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
                {task.actionSummary || displayDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900">Cost Information</h3>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">DIY Cost:</span>
                    <span className="font-semibold text-green-600 text-lg">
                      {task.costEstimate ? formatDIYSavings(task.costEstimate) : '–'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Professional Cost:</span>
                    <span className="font-semibold text-gray-900 text-lg">
                      {task.costEstimate ? formatCostEstimate(task.costEstimate) : 'TBD'}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900">Task Details</h3>
                  {task.difficulty && (
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">Difficulty: <span className="font-medium">{task.difficulty}</span></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-700">Time: <span className="font-medium">{task.estimatedTime}</span></span>
                  </div>
                  {task.cost && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-gray-700">{task.cost}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {!completed && (
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 text-base"
                      onClick={() => {
                        completeTaskMutation.mutate({
                          houseId: selectedHouseId,
                          taskTitle: task.title,
                          completionMethod: 'diy',
                          costEstimate: task.costEstimate,
                        });
                        onClose();
                      }}
                      disabled={completeTaskMutation.isPending}
                    >
                      {completeTaskMutation.isPending ? 'Saving...' : 'Completed DIY'}
                    </Button>
                    <Button
                      className="w-full text-white hover:opacity-90 font-medium py-4 text-base border-0"
                      style={{ backgroundColor: '#2c0f5b' }}
                      onClick={() => {
                        onContractorComplete(task);
                        onClose();
                      }}
                    >
                      Completed by Contractor
                    </Button>
                  </div>
                )}
                
                <a
                  href={`/contractors?category=${encodeURIComponent(task.category)}&service=${encodeURIComponent(task.title)}&houseId=${selectedHouseId}&maxDistance=20`}
                  className="block w-full text-center py-3 px-4 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Find a Contractor
                </a>
                {!isContractor && (
                  <a
                    href={`/messages?taskTitle=${encodeURIComponent(task.title)}&taskDescription=${encodeURIComponent(task.description || '')}&houseId=${encodeURIComponent(selectedHouseId || '')}`}
                    className="flex items-center justify-center gap-2 w-full text-center py-3 px-4 bg-purple-50 text-purple-700 font-medium rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/>
                    </svg>
                    Message a Contractor with AI
                  </a>
                )}
              </div>
            </div>

            {task.steps && task.steps.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="font-semibold mb-3" style={{ color: '#2c0f5b' }}>Steps to Complete:</h3>
                <ul className="space-y-2">
                  {task.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {task.toolsAndSupplies && task.toolsAndSupplies.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                  <Wrench className="w-5 h-5" />
                  Tools & Supplies Needed:
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {task.toolsAndSupplies.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <div className="w-4 h-4 border-2 border-amber-400 rounded flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {task.tools && task.tools.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                  <Wrench className="w-4 h-4 text-red-500" />
                  Tools Needed:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.tools.map((tool, index) => (
                    <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!isCustomTask && (
              <div className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center" style={{ color: '#2c0f5b' }}>
                    <Settings className="w-4 h-4 mr-2" />
                    Customize This Task
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCustomizeTask(showCustomizeTask === task.id ? null : task.id)}
                    className="text-sm"
                  >
                    {showCustomizeTask === task.id ? 'Hide' : 'Show'} Options
                  </Button>
                </div>

                <Collapsible open={showCustomizeTask === task.id}>
                  <CollapsibleContent>
                    {(() => {
                      const currentOverride = getTaskOverride(task.title, taskOverrides || []);
                      const taskId = generateTaskId(task.title);
                      
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`dialog-enable-${taskId}`}
                                checked={isTaskEnabled(task.title, taskOverrides || [])}
                                onCheckedChange={(checked) => {
                                  upsertTaskOverrideMutation.mutate({
                                    taskId,
                                    isEnabled: checked as boolean,
                                    frequencyType: currentOverride?.frequencyType || undefined,
                                    specificMonths: currentOverride?.specificMonths || undefined,
                                  });
                                }}
                              />
                              <label htmlFor={`dialog-enable-${taskId}`} className="text-sm font-medium" style={{ color: '#2c0f5b' }}>
                                Enable this task
                              </label>
                            </div>
                            {currentOverride && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteTaskOverrideMutation.mutate(taskId)}
                                className="text-xs"
                              >
                                Reset to Default
                              </Button>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block" style={{ color: '#2c0f5b' }}>
                              Task Frequency
                            </label>
                            <Select
                              value={currentOverride?.frequencyType || 'default'}
                              onValueChange={(value) => {
                                if (value === 'default') {
                                  if (currentOverride) {
                                    deleteTaskOverrideMutation.mutate(taskId);
                                  }
                                } else {
                                  upsertTaskOverrideMutation.mutate({
                                    taskId,
                                    isEnabled: isTaskEnabled(task.title, taskOverrides || []),
                                    frequencyType: value,
                                    specificMonths: currentOverride?.specificMonths || undefined,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">Default (As Shown)</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="biannually">Twice per Year</SelectItem>
                                <SelectItem value="annually">Once per Year</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block" style={{ color: '#2c0f5b' }}>
                              Custom Description (Optional)
                            </label>
                            <textarea
                              className="w-full p-2 border rounded-md min-h-[80px]"
                              placeholder="Enter custom instructions for this task..."
                              defaultValue={currentOverride?.customDescription || ''}
                              onBlur={(e) => {
                                const newDescription = e.target.value.trim();
                                if (newDescription !== (currentOverride?.customDescription || '')) {
                                  upsertTaskOverrideMutation.mutate({
                                    taskId,
                                    isEnabled: isTaskEnabled(task.title, taskOverrides || []),
                                    frequencyType: currentOverride?.frequencyType || undefined,
                                    specificMonths: currentOverride?.specificMonths || undefined,
                                    customDescription: newDescription || undefined,
                                  });
                                }
                              }}
                            />
                            <p className="text-xs mt-1" style={{ color: '#2c0f5b' }}>
                              Leave blank to use the default description
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {previousContractor && (
              <div className="rounded-lg p-4" style={{ backgroundColor: '#2c0f5b' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <User className="w-5 h-5 mr-2 text-white" />
                      <span className="font-medium text-white">
                        Previous contractor used for {previousContractor.serviceType}
                      </span>
                    </div>
                    <div className="text-white">
                      <div className="font-medium text-lg">
                        {previousContractor.contractorName}
                        {previousContractor.contractorCompany && (
                          <span className="font-normal text-white/80"> - {previousContractor.contractorCompany}</span>
                        )}
                      </div>
                      <div className="text-sm mt-1 text-white/80">
                        Last service: {new Date(previousContractor.lastServiceDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {previousContractor.contractorId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-sm"
                        style={{ backgroundColor: '#b6a6f4', color: '#ffffff', borderColor: '#b6a6f4' }}
                        onClick={() => onViewContractor(previousContractor.contractorId)}
                      >
                        <User className="w-4 h-4 mr-1" />
                        View Profile
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-sm"
                        style={{ backgroundColor: '#b6a6f4', color: '#ffffff', borderColor: '#b6a6f4' }}
                        onClick={() => {
                          toast({
                            title: "Contact Contractor",
                            description: `You can contact ${previousContractor.contractorName} for this service again. Check your previous service records for contact details.`
                          });
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Contact Again
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Task Card Component - Simplified Click-to-Open Design
interface TaskCardProps {
  task: MaintenanceTask;
  completed: boolean;
  displayDescription: string;
  generateTaskId: (title: string) => string;
  onOpenDialog: () => void;
}

function TaskCard({
  task,
  completed,
  displayDescription,
  generateTaskId,
  onOpenDialog,
}: TaskCardProps) {
  const getPriorityBadge = () => {
    if (task.priority === 'high') {
      return (
        <Badge className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-medium" data-testid={`badge-priority-${task.priority}`}>
          HIGH PRIORITY
        </Badge>
      );
    }
    if (task.priority === 'medium') {
      return (
        <Badge className="bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-medium" data-testid={`badge-priority-${task.priority}`}>
          MEDIUM PRIORITY
        </Badge>
      );
    }
    if (task.priority === 'low') {
      return (
        <Badge className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium" data-testid={`badge-priority-${task.priority}`}>
          LOW PRIORITY
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card 
      className={`transition-all border-0 shadow-sm hover:shadow-md cursor-pointer ${completed ? 'bg-green-100' : 'bg-white'}`}
      data-testid={`card-task-${task.id}`}
      onClick={onOpenDialog}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex-1" style={{ color: '#2c0f5b' }} data-testid={`title-task-${generateTaskId(task.title)}`}>
            {task.title}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getPriorityBadge()}
            {completed && (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            )}
          </div>
        </div>

        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
          {task.actionSummary || displayDescription}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            {task.costEstimate && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-green-500" />
                {formatDIYSavings(task.costEstimate)}
              </span>
            )}
            {task.estimatedTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                {task.estimatedTime}
              </span>
            )}
          </div>
          <span className="text-blue-600 font-medium text-sm">View Details →</span>
        </div>
      </div>
    </Card>
  );
}

export default function Maintenance() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedZone, setSelectedZone] = useState<string>("pacific-northwest");
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [homeSystems, setHomeSystems] = useState<string[]>([]);
  const [showSystemFilters, setShowSystemFilters] = useState(false);

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { needsUpgrade, isInTrial, trialDaysRemaining, isFreeUser, isLoading: subscriptionLoading } = useHomeownerSubscription();
  
  // Task override states
  const [showCustomizeTask, setShowCustomizeTask] = useState<string | null>(null);

  // Appliance management states
  const [isApplianceDialogOpen, setIsApplianceDialogOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<HomeAppliance | null>(null);
  const [isApplianceManualDialogOpen, setIsApplianceManualDialogOpen] = useState(false);
  const [editingApplianceManual, setEditingApplianceManual] = useState<HomeApplianceManual | null>(null);
  const [selectedApplianceId, setSelectedApplianceId] = useState<string>("");
  // Appliance type selector (dialog only — auto-fills name & filters brands)
  const [dialogApplianceType, setDialogApplianceType] = useState<string>("");
  // Brand autocomplete
  const [brandSearch, setBrandSearch] = useState("");
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  // Model lookup
  const [modelLookupLoading, setModelLookupLoading] = useState(false);
  
  // Service logs filter state
  const [homeAreaFilter, setHomeAreaFilter] = useState<string>("all");
  const [serviceRecordsHouseFilter, setServiceRecordsHouseFilter] = useState<string>("all");
  const [isServiceRecordsExpanded, setIsServiceRecordsExpanded] = useState<boolean>(true);
  const [showAllRecords, setShowAllRecords] = useState<boolean>(false);

  // AI Invoice Scan dialog state
  const [aiInvoiceOpen, setAiInvoiceOpen] = useState(false);
  const [aiStep, setAiStep] = useState<"upload" | "diy-verify" | "review" | "done">("upload");
  const [aiCompletionMethod, setAiCompletionMethod] = useState<"contractor" | "diy">("contractor");
  const [aiInvoiceFiles, setAiInvoiceFiles] = useState<File[]>([]);
  const [aiReceiptFiles, setAiReceiptFiles] = useState<File[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<InvoiceAnalysis | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiConfirming, setAiConfirming] = useState(false);
  const [aiEditDescription, setAiEditDescription] = useState("");
  const [aiEditDate, setAiEditDate] = useState("");
  const [aiEditAmount, setAiEditAmount] = useState("");
  const [aiEditContractorName, setAiEditContractorName] = useState("");
  const [aiEditContractorCompany, setAiEditContractorCompany] = useState("");
  const [aiEditHomeArea, setAiEditHomeArea] = useState("");
  const [aiEditServiceType, setAiEditServiceType] = useState("");
  const [aiDiyVerifyFiles, setAiDiyVerifyFiles] = useState<{ before: File[]; after: File[]; receipt: File[] }>({ before: [], after: [], receipt: [] });
  const [aiDiyVerifying, setAiDiyVerifying] = useState(false);
  const [aiDiyVerifyResult, setAiDiyVerifyResult] = useState<{ diyVerified: boolean; verificationNotes: string | null } | null>(null);

  // AI Maintenance Coach state
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachResult, setCoachResult] = useState<{ briefing: string; topTasks: { title: string; reason: string }[] } | null>(null);
  const [highlightedTask, setHighlightedTask] = useState<string | null>(null);
  const selectedHouseIdRef = useRef(selectedHouseId);
  useEffect(() => { selectedHouseIdRef.current = selectedHouseId; }, [selectedHouseId]);

  // Delete confirmation dialog states
  const [deleteApplianceConfirmOpen, setDeleteApplianceConfirmOpen] = useState(false);
  const [applianceToDelete, setApplianceToDelete] = useState<HomeAppliance | null>(null);
  const [deleteSystemConfirmOpen, setDeleteSystemConfirmOpen] = useState(false);
  const [systemToDelete, setSystemToDelete] = useState<HomeSystem | null>(null);

  // Task detail dialog state
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [isTaskDetailDialogOpen, setIsTaskDetailDialogOpen] = useState(false);

  // Use authenticated user's ID  
  const homeownerId = (user as any)?.id;
  const userRole = (user as any)?.role;
  const isContractor = userRole === 'contractor';

  // Fetch houses for the authenticated user (only for homeowners)
  const { data: houses = [], isLoading: housesLoading } = useQuery({
    queryKey: ['/api/houses'],
    queryFn: async () => {
      const response = await fetch('/api/houses');
      if (!response.ok) throw new Error('Failed to fetch houses');
      return response.json();
    },
    enabled: isAuthenticated && !!homeownerId && !isContractor
  });

  // Auto-select first house when houses are loaded
  useEffect(() => {
    if (houses.length > 0 && !selectedHouseId) {
      setSelectedHouseId(houses[0].id);
    }
  }, [houses, selectedHouseId]);

  // Update home systems and climate zone when house changes
  useEffect(() => {
    const selectedHouse = houses.find((house: House) => house.id === selectedHouseId);
    if (selectedHouse) {
      setHomeSystems(selectedHouse.homeSystems);
      setSelectedZone(selectedHouse.climateZone.toLowerCase().replace(/ /g, '-'));
    }
  }, [selectedHouseId, houses]);




  // Maintenance log queries and mutations (only for homeowners)
  const { data: maintenanceLogs, isLoading: maintenanceLogsLoading } = useQuery<MaintenanceLog[]>({
    queryKey: ['/api/maintenance-logs', { homeownerId, houseId: serviceRecordsHouseFilter === 'all' ? undefined : serviceRecordsHouseFilter }],
    queryFn: async () => {
      const url = serviceRecordsHouseFilter === 'all' 
        ? '/api/maintenance-logs' 
        : `/api/maintenance-logs?houseId=${serviceRecordsHouseFilter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch maintenance logs');
      return response.json();
    },
    enabled: isAuthenticated && !!homeownerId && !isContractor
  });

  // Home systems queries (only for homeowners)
  const { data: homeSystemsData, isLoading: homeSystemsLoading } = useQuery<HomeSystem[]>({
    queryKey: ['/api/home-systems', { homeownerId, houseId: selectedHouseId }],
    queryFn: async () => {
      const response = await fetch(`/api/home-systems?houseId=${selectedHouseId}`);
      if (!response.ok) throw new Error('Failed to fetch home systems');
      return response.json();
    },
    enabled: isAuthenticated && !!homeownerId && !!selectedHouseId && !isContractor
  });

  // Appliances queries (only for homeowners)
  const { data: appliances = [], isLoading: appliancesLoading } = useQuery<HomeAppliance[]>({
    queryKey: ['/api/appliances', { homeownerId, houseId: selectedHouseId }],
    queryFn: async () => {
      const response = await fetch(`/api/appliances?homeownerId=${homeownerId}&houseId=${selectedHouseId}`);
      if (!response.ok) throw new Error('Failed to fetch appliances');
      return response.json();
    },
    enabled: isAuthenticated && !!homeownerId && !!selectedHouseId && !isContractor
  });

  // Appliance manuals queries (only for homeowners)
  const { data: applianceManuals = [], isLoading: applianceManualsLoading } = useQuery<HomeApplianceManual[]>({
    queryKey: ['/api/appliances', selectedApplianceId, 'manuals'],
    queryFn: async () => {
      if (!selectedApplianceId) return [];
      const response = await fetch(`/api/appliances/${selectedApplianceId}/manuals`);
      if (!response.ok) throw new Error('Failed to fetch appliance manuals');
      return response.json();
    },
    enabled: isAuthenticated && !!homeownerId && !!selectedApplianceId && !isContractor
  });

  // Appliance brands (curated list for autocomplete)
  const { data: applianceBrands = [] } = useQuery<string[]>({
    queryKey: ['/api/appliances/brands'],
    staleTime: Infinity,
  });

  // Helper: look up a model number via the IFIXIT product/device API
  const handleModelLookup = async () => {
    const modelNumber = applianceForm.getValues("model") || "";
    if (!modelNumber || modelNumber.trim().length < 3) {
      toast({ title: "Enter a model number", description: "Type at least 3 characters in the Model field first.", variant: "destructive" });
      return;
    }
    setModelLookupLoading(true);
    try {
      const res = await fetch(`/api/appliances/lookup?modelNumber=${encodeURIComponent(modelNumber.trim())}`);
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();
      if (data.found) {
        if (data.make) {
          applianceForm.setValue("make", data.make);
          setBrandSearch(data.make);
        }
        if (data.name) applianceForm.setValue("name", data.name);
        if (data.description) {
          const existing = applianceForm.getValues("notes") || "";
          if (!existing) applianceForm.setValue("notes", data.description);
        }
        toast({ title: "Appliance found!", description: `${data.make} ${data.name} identified successfully.` });
      } else {
        toast({ title: "No match found", description: "Enter details manually — model not recognized.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Lookup error", description: "Could not reach lookup service. Please enter details manually.", variant: "destructive" });
    } finally {
      setModelLookupLoading(false);
    }
  };

  // Custom maintenance tasks queries (only for homeowners)
  const { data: customMaintenanceTasks = [], isLoading: customTasksLoading } = useQuery<CustomMaintenanceTask[]>({
    queryKey: ['/api/custom-maintenance-tasks', { homeownerId, houseId: selectedHouseId }],
    queryFn: async () => {
      const response = await fetch(`/api/custom-maintenance-tasks?houseId=${selectedHouseId}`);
      if (!response.ok) throw new Error('Failed to fetch custom maintenance tasks');
      return response.json();
    },
    enabled: isAuthenticated && !!homeownerId && !!selectedHouseId && !isContractor
  });

  // Referring agent query (only for homeowners)
  const { data: referringAgent, isLoading: referringAgentLoading, isError: referringAgentError } = useQuery<{
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    referralCode: string;
    profileImageUrl?: string | null;
    officeAddress?: string | null;
    website?: string | null;
  } | null>({
    queryKey: ['/api/referring-agent'],
    queryFn: async () => {
      const response = await fetch('/api/referring-agent');
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) throw new Error('Failed to fetch referring agent');
      return response.json();
    },
    enabled: isAuthenticated && !!homeownerId && !isContractor,
    retry: false
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





  // File upload state for service records
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [beforePhotoFiles, setBeforePhotoFiles] = useState<File[]>([]);
  const [afterPhotoFiles, setAfterPhotoFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Maintenance log form handling
  const maintenanceLogForm = useForm<MaintenanceLogFormData>({
    resolver: zodResolver(maintenanceLogFormSchema),
    defaultValues: {
      homeownerId,
      houseId: selectedHouseId || "",
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
    mutationFn: async (data: MaintenanceLogFormData & { receiptUrls?: string[], beforePhotoUrls?: string[], afterPhotoUrls?: string[] }) => {
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
      // Clear file selections
      setReceiptFiles([]);
      setBeforePhotoFiles([]);
      setAfterPhotoFiles([]);
      toast({ title: "Success", description: "Maintenance log added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add maintenance log", variant: "destructive" });
    },
  });

  const updateMaintenanceLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MaintenanceLogFormData> & { receiptUrls?: string[], beforePhotoUrls?: string[], afterPhotoUrls?: string[] } }) => {
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
      // Clear file selections
      setReceiptFiles([]);
      setBeforePhotoFiles([]);
      setAfterPhotoFiles([]);
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

  // Complete task with DIY or contractor method
  const completeTaskMutation = useMutation({
    mutationFn: async (data: { 
      houseId: string; 
      taskTitle: string; 
      completionMethod: 'diy' | 'contractor';
      costEstimate?: {
        proLow?: number;
        proHigh?: number;
        materialsLow?: number;
        materialsHigh?: number;
      };
      contractorCost?: number;
    }) => {
      const response = await fetch('/api/maintenance-logs/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to complete task');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/houses', variables.houseId, 'diy-savings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/houses', variables.houseId, 'health-score'] });
      queryClient.invalidateQueries({ queryKey: ['/api/achievements/user'] });
      
      // Show achievement notification if any were unlocked
      if (data.newAchievements && data.newAchievements.length > 0) {
        const achievementNames = data.newAchievements.map((a: any) => a.achievementKey).join(', ');
        toast({ 
          title: "🎉 Achievement Unlocked!", 
          description: `You've earned ${data.newAchievements.length} new achievement${data.newAchievements.length > 1 ? 's' : ''}!`,
          duration: 5000,
        });
      }
      
      toast({ title: "Success", description: "Task marked as complete!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete task", variant: "destructive" });
    },
  });

  // Task override queries and mutations
  const { data: taskOverrides = [] } = useQuery<TaskOverride[]>({
    queryKey: ['/api/houses', selectedHouseId, 'task-overrides'],
    queryFn: async () => {
      if (!selectedHouseId) return [];
      const response = await fetch(`/api/houses/${selectedHouseId}/task-overrides`);
      if (!response.ok) throw new Error('Failed to fetch task overrides');
      return response.json();
    },
    enabled: !!selectedHouseId && isAuthenticated,
  });

  const upsertTaskOverrideMutation = useMutation({
    mutationFn: async (data: { taskId: string; isEnabled?: boolean; frequencyType?: string; specificMonths?: string[]; notes?: string; customDescription?: string }) => {
      const response = await fetch(`/api/houses/${selectedHouseId}/task-overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save task override');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/houses', selectedHouseId, 'task-overrides'] });
      toast({ title: "Success", description: "Task customization saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save customization", variant: "destructive" });
    },
  });

  const deleteTaskOverrideMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/houses/${selectedHouseId}/task-overrides/${taskId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete task override');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/houses', selectedHouseId, 'task-overrides'] });
      toast({ title: "Success", description: "Task customization removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove customization", variant: "destructive" });
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

  const trackTaskCompletionMutation = useMutation({
    mutationFn: async (data: { taskId: string; houseId: string }) => {
      const response = await fetch('/api/task-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to track task completion');
      return response.json();
    },
    onSuccess: (data: { completion: any; newAchievements?: any[] }) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/task-completions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });
      
      // Show achievement notifications
      if (data.newAchievements && data.newAchievements.length > 0) {
        data.newAchievements.forEach((achievement) => {
          toast({
            title: (
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>Achievement Unlocked!</span>
              </div>
            ) as any,
            description: achievement.name || 'You earned a new achievement!',
            duration: 5000,
          });
        });
      }
    },
    onError: () => {
      console.error('Failed to track task completion');
    },
  });

  // Home systems form handling
  type HomeSystemFormData = z.infer<typeof homeSystemFormSchema>;
type ApplianceFormData = z.infer<typeof applianceFormSchema>;
type ApplianceManualFormData = z.infer<typeof applianceManualFormSchema>;

  const homeSystemForm = useForm<HomeSystemFormData>({
    resolver: zodResolver(homeSystemFormSchema),
    defaultValues: {
      homeownerId,
      houseId: selectedHouseId,
      systemType: "",
      installationYear: undefined,
      lastServiceYear: undefined,
      brand: "",
      model: "",
      serialNumber: "",
      notes: "",
    },
  });

  // Appliance forms
  const applianceForm = useForm<ApplianceFormData>({
    resolver: zodResolver(applianceFormSchema),
    defaultValues: {
      homeownerId,
      houseId: selectedHouseId,
      name: "",
      make: "",
      model: "",
      serialNumber: "",
      purchaseDate: "",
      installDate: "",
      yearInstalled: undefined,
      notes: "",
      location: "",
      warrantyExpiration: "",
      lastServiceDate: "",
    },
  });

  const applianceManualForm = useForm<ApplianceManualFormData>({
    resolver: zodResolver(applianceManualFormSchema),
    defaultValues: {
      applianceId: "",
      title: "",
      type: "owner",
      source: "upload",
      url: "",
      fileName: "",
      fileSize: undefined,
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

  // Appliance mutations
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

  // Appliance manual mutations
  const createApplianceManualMutation = useMutation({
    mutationFn: async (data: ApplianceManualFormData) => {
      const response = await fetch(`/api/appliances/${data.applianceId}/manuals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create appliance manual');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appliances'] });
      setIsApplianceManualDialogOpen(false);
      applianceManualForm.reset();
      toast({ title: "Success", description: "Manual added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add manual", variant: "destructive" });
    },
  });

  const updateApplianceManualMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ApplianceManualFormData> }) => {
      const response = await fetch(`/api/appliance-manuals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update appliance manual');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appliances'] });
      setIsApplianceManualDialogOpen(false);
      setEditingApplianceManual(null);
      applianceManualForm.reset();
      toast({ title: "Success", description: "Manual updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update manual", variant: "destructive" });
    },
  });

  const deleteApplianceManualMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/appliance-manuals/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete appliance manual');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appliances'] });
      toast({ title: "Success", description: "Manual deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete manual", variant: "destructive" });
    },
  });

  // Delete confirmation handlers
  const confirmDeleteAppliance = () => {
    if (applianceToDelete) {
      deleteApplianceMutation.mutate(applianceToDelete.id);
      setDeleteApplianceConfirmOpen(false);
      setApplianceToDelete(null);
      setIsApplianceDialogOpen(false);
    }
  };

  const confirmDeleteSystem = () => {
    if (systemToDelete) {
      deleteHomeSystemMutation.mutate(systemToDelete.id);
      setDeleteSystemConfirmOpen(false);
      setSystemToDelete(null);
      setIsHomeSystemDialogOpen(false);
    }
  };

  // Clear coach result when house changes so stale advice doesn't appear on a different property
  useEffect(() => {
    setCoachResult(null);
    setHighlightedTask(null);
  }, [selectedHouseId]);

  // Load completed tasks for the selected house from localStorage
  useEffect(() => {
    if (selectedHouseId) {
      const storedTasks = localStorage.getItem(`maintenance-completed-tasks-${selectedHouseId}`);
      if (storedTasks) {
        try {
          setCompletedTasks(JSON.parse(storedTasks));
        } catch {
          setCompletedTasks({});
        }
      } else {
        setCompletedTasks({});
      }
    }
  }, [selectedHouseId]);

  // Load home systems from localStorage on component mount
  useEffect(() => {
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
  // Save completed tasks to localStorage for the selected house
  useEffect(() => {
    if (selectedHouseId) {
      localStorage.setItem(`maintenance-completed-tasks-${selectedHouseId}`, JSON.stringify(completedTasks));
    }
  }, [completedTasks, selectedHouseId]);

  useEffect(() => {
    localStorage.setItem('home-systems', JSON.stringify(homeSystems));
  }, [homeSystems]);

  // Generate unique key for task completion tracking (includes month/year)
  const getTaskKey = (taskId: string, month: number, year: number) => {
    return `${taskId}-${month}-${year}`;
  };

  // Toggle task completion (legacy checkbox - now using completion buttons)
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
    // First check local state
    const currentYear = new Date().getFullYear();
    const taskKey = getTaskKey(taskId, selectedMonth, currentYear);
    if (completedTasks[taskKey]) return true;
    
    // Also check maintenance logs for task completions
    if (maintenanceLogs) {
      // Extract task title from taskId (remove month/year suffix)
      const task = filteredTasks.find(t => t.id === taskId);
      if (task) {
        // Check if there's a maintenance log for this task in the current month
        const hasLog = maintenanceLogs.some(log => {
          const logDate = new Date(log.serviceDate);
          const logMonth = logDate.getMonth() + 1;
          const logYear = logDate.getFullYear();
          return log.serviceType === task.title && 
                 logMonth === selectedMonth && 
                 logYear === currentYear &&
                 (log.completionMethod === 'diy' || log.completionMethod === 'contractor');
        });
        if (hasLog) return true;
      }
    }
    
    return false;
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
    if (!selectedHouseId) {
      toast({
        title: "No house selected",
        description: "Please select a house first to track its systems.",
        variant: "destructive",
      });
      return;
    }

    const newSystems = homeSystems.includes(system) 
      ? homeSystems.filter(s => s !== system)
      : [...homeSystems, system];
    
    // Update local state immediately for UI responsiveness
    setHomeSystems(newSystems);
    
    // Save to database
    updateHouseMutation.mutate({
      id: selectedHouseId,
      data: { homeSystems: newSystems }
    });
  };

  // Handle adding a new home system
  const handleAddHomeSystem = (systemType: string) => {
    setSelectedSystemType(systemType);
    setEditingHomeSystem(null);
    homeSystemForm.reset({
      homeownerId,
      houseId: selectedHouseId,
      systemType,
      installationYear: undefined,
      lastServiceYear: undefined,
      brand: "",
      model: "",
      serialNumber: "",
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
      installationYear: system.installationYear,
      lastServiceYear: system.lastServiceYear,
      brand: system.brand || "",
      model: system.model || "",
      serialNumber: (system as any).serialNumber || "",
      notes: system.notes || "",
    });
    setIsHomeSystemDialogOpen(true);
  };

  // PDF extraction state for home system dialog
  const [systemPdfLoading, setSystemPdfLoading] = useState(false);

  const handleSystemDocumentUpload = async (file: File) => {
    setSystemPdfLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/home-systems/extract-pdf", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        toast({ title: "Could not read document", description: err.message, variant: "destructive" });
        return;
      }
      const data = await res.json();
      if (data.systemType) homeSystemForm.setValue("systemType", data.systemType);
      if (data.brand) homeSystemForm.setValue("brand", data.brand);
      if (data.model) homeSystemForm.setValue("model", data.model);
      if (data.serialNumber) homeSystemForm.setValue("serialNumber", data.serialNumber);
      if (data.installationYear) homeSystemForm.setValue("installationYear", data.installationYear);
      toast({ title: "Document scanned", description: "Fields filled from your document — review and save." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to process document", variant: "destructive" });
    } finally {
      setSystemPdfLoading(false);
    }
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



  // Maintenance log helper functions
  const handleEditMaintenanceLog = (log: MaintenanceLog) => {
    setEditingMaintenanceLog(log);
    maintenanceLogForm.reset({
      homeownerId: log.homeownerId,
      houseId: log.houseId,
      serviceType: log.serviceType,
      serviceDate: log.serviceDate,
      homeArea: log.homeArea ?? "",
      serviceDescription: log.serviceDescription ?? "",
      cost: log.cost || undefined,
      contractorName: log.contractorName ?? "",
      contractorCompany: log.contractorCompany ?? "",
      contractorId: log.contractorId ?? "",
      notes: log.notes ?? "",
      warrantyPeriod: log.warrantyPeriod ?? "",
      nextServiceDue: log.nextServiceDue ?? "",
    });
    // Clear file selections when editing (they should upload new files if needed)
    setReceiptFiles([]);
    setBeforePhotoFiles([]);
    setAfterPhotoFiles([]);
    setIsMaintenanceLogDialogOpen(true);
  };





  // AI Invoice Scan helpers for maintenance page
  const fileToBase64Ai = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const openAiInvoiceDialog = () => {
    setAiStep("upload");
    setAiCompletionMethod("contractor");
    setAiInvoiceFiles([]);
    setAiReceiptFiles([]);
    setAiAnalysis(null);
    setAiDiyVerifyFiles({ before: [], after: [], receipt: [] });
    setAiDiyVerifyResult(null);
    setAiInvoiceOpen(true);
  };

  const runDiyVerify = async () => {
    if (!aiAnalysis) return;
    if (aiDiyVerifyFiles.before.length === 0 || aiDiyVerifyFiles.after.length === 0) {
      toast({ title: "Before & after photos required", description: "Please upload at least one before photo AND one after photo to verify your DIY work.", variant: "destructive" });
      return;
    }
    setAiDiyVerifying(true);
    try {
      const toPayload = async (files: File[]) =>
        Promise.all(files.map(async (f) => ({ fileData: await fileToBase64Ai(f), fileName: f.name, fileType: f.type })));
      const res = await apiRequest(`/api/invoice-analyses/${aiAnalysis.id}/diy-verify`, "POST", {
        beforePhotoFiles: await toPayload(aiDiyVerifyFiles.before),
        afterPhotoFiles: await toPayload(aiDiyVerifyFiles.after),
        receiptFiles: await toPayload(aiDiyVerifyFiles.receipt),
      });
      const data = await res.json();
      setAiDiyVerifyResult({ diyVerified: data.diyVerified, verificationNotes: data.verificationNotes });
      setAiAnalysis((prev) => prev ? { ...prev, diyVerified: data.diyVerified } : prev);
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-analyses"] });
      if (data.diyVerified) {
        toast({ title: "Verification passed", description: "Your DIY work has been verified. You can now confirm the record." });
      } else {
        toast({ title: "Verification inconclusive", description: "Please add clearer before/after photos showing the completed work.", variant: "destructive" });
      }
    } catch (err) {
      console.error("[DIY VERIFY]", err);
      toast({ title: "Verification failed", description: "Could not verify your photos. Please try again.", variant: "destructive" });
    } finally {
      setAiDiyVerifying(false);
    }
  };

  const runAiAnalysis = async () => {
    if (!selectedHouseId) {
      toast({ title: "Error", description: "Please select a house first.", variant: "destructive" });
      return;
    }
    // Contractor work requires an invoice; DIY receipt is truly optional
    if (aiCompletionMethod === "contractor" && aiInvoiceFiles.length === 0) {
      toast({ title: "Invoice required", description: "Please upload at least one invoice photo for contractor work.", variant: "destructive" });
      return;
    }
    setAiAnalyzing(true);
    try {
      const toPayloadFiles = async (files: File[]) =>
        Promise.all(files.map(async (f) => ({ fileData: await fileToBase64Ai(f), fileName: f.name, fileType: f.type })));
      const payload = {
        houseId: selectedHouseId,
        completionMethod: aiCompletionMethod,
        invoiceFiles: await toPayloadFiles(aiInvoiceFiles),
        receiptFiles: await toPayloadFiles(aiReceiptFiles),
      };
      const res = await fetch("/api/invoice-analyses/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const responseData = await res.json();
      if (!res.ok) {
        const reason = responseData?.message || "Could not analyze your invoice. Please try again.";
        toast({ title: "Upload not recognized", description: reason, variant: "destructive" });
        setAiAnalyzing(false);
        return;
      }
      const a: InvoiceAnalysis = responseData;
      setAiAnalysis(a);
      setAiEditDescription(a.serviceDescription || "");
      setAiEditDate(a.serviceDate || new Date().toISOString().split("T")[0]);
      setAiEditAmount(a.totalAmount || "");
      setAiEditContractorName(a.contractorName || "");
      setAiEditContractorCompany(a.contractorCompany || "");
      setAiEditHomeArea(a.homeArea || "");
      setAiEditServiceType(a.serviceType || "maintenance");
      // For DIY work, route to the explicit verification step before review
      setAiStep(aiCompletionMethod === "diy" && !a.diyVerified ? "diy-verify" : "review");
    } catch {
      toast({ title: "Analysis failed", description: "Could not analyze your invoice. Please try again.", variant: "destructive" });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const confirmAiAnalysis = async () => {
    if (!aiAnalysis) return;
    setAiConfirming(true);
    try {
      const res = await apiRequest(`/api/invoice-analyses/${aiAnalysis.id}/confirm`, "PATCH", {
        serviceDescription: aiEditDescription,
        serviceDate: aiEditDate,
        totalAmount: aiEditAmount ? parseFloat(aiEditAmount) : null,
        contractorName: aiEditContractorName || null,
        contractorCompany: aiEditContractorCompany || null,
        homeArea: aiEditHomeArea,
        serviceType: aiEditServiceType,
      });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-analyses"] });
      if (data.newAchievements?.length > 0) {
        toast({ title: "Achievement Unlocked!", description: data.newAchievements[0]?.title || "New achievement earned!" });
      }
      toast({ title: "Record created", description: "Service record added and health score updated." });
      setAiStep("done");
      setTimeout(() => setAiInvoiceOpen(false), 1500);
    } catch {
      toast({ title: "Error", description: "Failed to save record. Please try again.", variant: "destructive" });
    } finally {
      setAiConfirming(false);
    }
  };

  const handleAddNewMaintenanceLog = () => {
    setEditingMaintenanceLog(null);
    maintenanceLogForm.reset({
      homeownerId,
      houseId: selectedHouseId,
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
    // Clear file selections
    setReceiptFiles([]);
    setBeforePhotoFiles([]);
    setAfterPhotoFiles([]);
    setIsMaintenanceLogDialogOpen(true);
  };

  const handleContractorCompletion = (task: MaintenanceTask) => {
    setEditingMaintenanceLog(null);
    maintenanceLogForm.reset({
      homeownerId,
      houseId: selectedHouseId,
      serviceType: task.title,
      serviceDate: new Date().toISOString().split('T')[0],
      homeArea: "General Maintenance",
      serviceDescription: "Completed by contractor",
      cost: undefined,
      contractorName: "",
      contractorCompany: "",
      contractorId: "",
      notes: "",
      warrantyPeriod: "",
      nextServiceDue: "",
      completionMethod: "contractor",
    });
    setIsMaintenanceLogDialogOpen(true);
  };

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Upload files to object storage
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    const filesData = await Promise.all(
      files.map(async (file) => ({
        fileData: await fileToBase64(file),
        fileName: file.name,
        fileType: file.type,
      }))
    );

    const response = await fetch('/api/upload/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: filesData }),
    });

    if (!response.ok) throw new Error('Failed to upload files');
    const result = await response.json();
    return result.urls || [];
  };

  const onSubmitMaintenanceLog = async (data: MaintenanceLogFormData) => {
    try {
      setIsUploadingFiles(true);

      // Upload all files in parallel
      const [receiptUrls, beforePhotoUrls, afterPhotoUrls] = await Promise.all([
        uploadFiles(receiptFiles),
        uploadFiles(beforePhotoFiles),
        uploadFiles(afterPhotoFiles),
      ]);

      // Add file URLs to the maintenance log data
      const dataWithFiles = {
        ...data,
        receiptUrls,
        beforePhotoUrls,
        afterPhotoUrls,
      };

      if (editingMaintenanceLog) {
        updateMaintenanceLogMutation.mutate({ id: editingMaintenanceLog.id, data: dataWithFiles });
      } else {
        createMaintenanceLogMutation.mutate(dataWithFiles);
      }

      // Clear file selections
      setReceiptFiles([]);
      setBeforePhotoFiles([]);
      setAfterPhotoFiles([]);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({ 
        title: "Error", 
        description: "Failed to upload files. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const onSubmitHomeSystem = (data: HomeSystemFormData) => {
    if (editingHomeSystem) {
      updateHomeSystemMutation.mutate({ id: editingHomeSystem.id, data });
    } else {
      createHomeSystemMutation.mutate(data);
    }
  };




  const getServiceTypeLabel = (type: string) => {
    return SERVICE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getHomeAreaLabel = (area: string) => {
    return HOME_AREAS.find(a => a.value === area)?.label || area;
  };

  // CSV helper functions for service records download
  const generateServiceRecordsCSV = (records: MaintenanceLog[], sortType: 'date' | 'area') => {
    const headers = ['Service Date', 'Description', 'Area of Home', 'Contractor', 'Cost', 'Notes', 'Record Added'];
    const rows = records.map(log => [
      new Date(log.serviceDate).toLocaleDateString(),
      log.serviceDescription || '',
      log.homeArea ? getHomeAreaLabel(log.homeArea) : '',
      log.contractorCompany || '',
      log.cost || '',
      log.notes || '',
      log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Map climate zones to regions in US_MAINTENANCE_DATA
  const getRegionFromClimateZone = (zone: string): string => {
    const mapping: { [key: string]: string } = {
      'pacific-northwest': 'Pacific Northwest',
      'northeast': 'Northeast',
      'southeast': 'Southeast',
      'midwest': 'Midwest',
      'southwest': 'Southwest',
      'mountain-west': 'Mountain West',
      'california': 'West Coast',
      'great-plains': 'Midwest'
    };
    return mapping[zone] || 'Midwest';
  };

  // Map tasks to required home systems based on task title keywords
  const getSystemRequirementsForTask = (taskTitle: string): string[] | undefined => {
    const title = taskTitle.toLowerCase();
    const requirements: string[] = [];

    // Heating systems
    if (title.includes('furnace') || title.includes('heating system') || title.includes('heat pump') || title.includes('boiler')) {
      if (title.includes('gas') || title.includes('oil')) {
        requirements.push(title.includes('gas') ? 'gas-furnace' : 'oil-furnace');
      } else {
        requirements.push('gas-furnace', 'oil-furnace', 'electric-furnace', 'heat-pump', 'boiler');
      }
    }

    // Cooling systems
    if (title.includes('air condition') || title.includes(' ac ') || title.includes('cooling') || title.includes('a/c')) {
      requirements.push('central-ac', 'window-ac', 'mini-split');
    }

    // Water heaters
    if (title.includes('water heater')) {
      requirements.push('gas-water-heater', 'electric-water-heater', 'tankless-gas', 'tankless-electric');
    }

    // Pool
    if (title.includes('pool')) {
      requirements.push('pool');
    }

    // Spa/Hot tub
    if (title.includes('spa') || title.includes('hot tub')) {
      requirements.push('spa');
    }

    // Generator
    if (title.includes('generator')) {
      requirements.push('generator');
    }

    // Septic
    if (title.includes('septic')) {
      requirements.push('septic');
    }

    // Sump pump
    if (title.includes('sump pump')) {
      requirements.push('sump-pump');
    }

    // Sprinkler/Irrigation system
    if (title.includes('sprinkler') || title.includes('irrigation')) {
      requirements.push('sprinkler-system');
    }

    // Solar panels
    if (title.includes('solar panel')) {
      requirements.push('solar-panels');
    }

    // Fireplace/wood stove
    if (title.includes('fireplace') || title.includes('chimney') || title.includes('wood stove')) {
      requirements.push('wood-stove');
    }

    // Well water
    if (title.includes('well water') || title.includes('well pump')) {
      requirements.push('well-water');
    }

    // Water softener
    if (title.includes('water softener')) {
      requirements.push('water-softener');
    }

    // Return undefined if no specific systems required (general maintenance tasks)
    return requirements.length > 0 ? requirements : undefined;
  };

  // Generate maintenance tasks based on month and location using US_MAINTENANCE_DATA
  const getMaintenanceTasksForMonth = (month: number): MaintenanceTask[] => {
    const tasks: MaintenanceTask[] = [];
    
    // Get the region data based on selected climate zone
    const regionName = getRegionFromClimateZone(selectedZone);
    const regionData = US_MAINTENANCE_DATA[regionName];
    
    if (!regionData) {
      console.error(`No data found for region: ${regionName}`);
      return tasks;
    }
    
    const monthData = regionData.monthlyTasks[month];
    if (!monthData) {
      console.error(`No data found for month: ${month} in region: ${regionName}`);
      return tasks;
    }
    
    const allClimateZones = ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"];
    
    // Enrich seasonal tasks with cost estimates
    const enrichedSeasonalTasks = enrichTasksWithCosts(monthData.seasonal, regionName);
    
    // Convert seasonal tasks to MaintenanceTask objects
    enrichedSeasonalTasks.forEach((taskItem, index) => {
      tasks.push({
        id: `seasonal-${month}-${index}`,
        title: taskItem.title,
        description: taskItem.description,
        actionSummary: taskItem.actionSummary,
        steps: taskItem.steps,
        toolsAndSupplies: taskItem.toolsAndSupplies,
        month: month,
        climateZones: allClimateZones,
        priority: taskItem.priority || monthData.priority, // Use task priority or fall back to month priority
        estimatedTime: "30-60 minutes",
        difficulty: "easy",
        category: "General Maintenance",
        tools: null,
        cost: null,
        systemRequirements: getSystemRequirementsForTask(taskItem.title),
        costEstimate: taskItem.costEstimate,
        impact: taskItem.impact,
        impactCost: taskItem.impactCost,
      });
    });
    
    // Enrich weather-specific tasks with cost estimates
    const enrichedWeatherTasks = enrichTasksWithCosts(monthData.weatherSpecific, regionName);
    
    // Convert weather-specific tasks to MaintenanceTask objects
    enrichedWeatherTasks.forEach((taskItem, index) => {
      tasks.push({
        id: `weather-${month}-${index}`,
        title: taskItem.title,
        description: taskItem.description,
        actionSummary: taskItem.actionSummary,
        steps: taskItem.steps,
        toolsAndSupplies: taskItem.toolsAndSupplies,
        month: month,
        climateZones: allClimateZones,
        priority: taskItem.priority || monthData.priority, // Use task priority or fall back to month priority
        estimatedTime: "30-60 minutes",
        difficulty: "easy",
        category: "Weather-Specific",
        tools: null,
        cost: null,
        systemRequirements: getSystemRequirementsForTask(taskItem.title),
        costEstimate: taskItem.costEstimate,
        impact: taskItem.impact,
        impactCost: taskItem.impactCost,
      });
    });

    // Tasks are now loaded from US_MAINTENANCE_DATA above
    
    return tasks;
  };

  // Convert custom tasks to MaintenanceTask format based on their frequency
  const convertCustomTasksToMaintenanceTasks = (customTasks: CustomMaintenanceTask[], currentMonth: number): MaintenanceTask[] => {
    const convertedTasks: MaintenanceTask[] = [];
    
    customTasks.forEach(customTask => {
      // Skip inactive tasks
      if (!customTask.isActive) return;
      
      // Determine if this task should appear in the current month
      let shouldAppear = false;
      
      switch (customTask.frequencyType) {
        case 'monthly':
          // Monthly tasks appear every month
          shouldAppear = true;
          break;
        case 'quarterly':
          // Quarterly tasks appear every 3 months (1, 4, 7, 10)
          shouldAppear = currentMonth % 3 === 1;
          break;
        case 'biannually':
          // Bi-annual tasks appear twice a year (months 1 and 7)
          shouldAppear = currentMonth === 1 || currentMonth === 7;
          break;
        case 'annually':
          // Annual tasks appear in specific months if defined, otherwise in January
          if (customTask.specificMonths && customTask.specificMonths.length > 0) {
            shouldAppear = customTask.specificMonths.includes(currentMonth.toString());
          } else {
            shouldAppear = currentMonth === 1;
          }
          break;
        case 'custom':
          // Custom frequency - for now, show in all months (could be enhanced)
          shouldAppear = true;
          break;
        default:
          shouldAppear = false;
      }
      
      if (shouldAppear) {
        // Build cost estimate from custom task data if available
        let costEstimate: CostEstimate | undefined;
        if (customTask.proLow) {
          costEstimate = {
            proLow: parseFloat(customTask.proLow),
            proHigh: customTask.proHigh ? parseFloat(customTask.proHigh) : undefined,
            materialsLow: customTask.materialsLow ? parseFloat(customTask.materialsLow) : undefined,
            materialsHigh: customTask.materialsHigh ? parseFloat(customTask.materialsHigh) : undefined,
            currency: 'USD',
          };
        }
        
        convertedTasks.push({
          id: `custom-${customTask.id}`,
          title: customTask.title,
          description: customTask.description ?? 'No description provided',
          month: currentMonth,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"], // Custom tasks appear in all zones
          priority: customTask.priority,
          estimatedTime: customTask.estimatedTime ?? 'Not specified',
          difficulty: customTask.difficulty ?? 'easy',
          category: customTask.category,
          tools: customTask.tools ?? null,
          cost: customTask.cost ?? null,
          costEstimate,
        });
      }
    });
    
    return convertedTasks;
  };

  const maintenanceTasks = getMaintenanceTasksForMonth(selectedMonth);
  
  // Convert and merge custom tasks with regular maintenance tasks
  const customTasksForMonth = convertCustomTasksToMaintenanceTasks(customMaintenanceTasks, selectedMonth);
  const allTasks = [...maintenanceTasks, ...customTasksForMonth];

  const filteredTasks = allTasks.filter(task => {
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
          homeownerId: homeownerId,
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

  // AI Maintenance Coach mutation
  const coachMutation = useMutation({
    mutationFn: async (requestedHouseId: string) => {
      const payload = {
        month: selectedMonth,
        zone: selectedZone,
      };
      const res = await apiRequest(`/api/houses/${requestedHouseId}/maintenance-coach`, "POST", payload);
      const data = await res.json() as { briefing: string; topTasks: { title: string; reason: string }[] };
      return { ...data, requestedHouseId };
    },
    onSuccess: (data, requestedHouseId) => {
      if (requestedHouseId !== selectedHouseIdRef.current) return;
      setCoachResult({ briefing: data.briefing, topTasks: data.topTasks });
    },
    onError: () => {
      toast({ title: "Coach unavailable", description: "Unable to generate advice right now. Please try again.", variant: "destructive" });
    },
  });

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

  // Authentication guards
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{ borderColor: '#2c0f5b' }}></div>
          <p className="text-lg" style={{ color: '#2c0f5b' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-background)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#2c0f5b' }}>Authentication Required</h1>
          <p className="mb-6" style={{ color: '#2c0f5b' }}>Please sign in to access maintenance features.</p>
          <Button onClick={() => window.location.href = '/signin'} style={{ backgroundColor: '#2c0f5b', color: 'white' }} className="hover:opacity-90">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!userRole || (userRole !== 'homeowner' && userRole !== 'contractor')) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-background)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#2c0f5b' }}>Access Denied</h1>
          <p className="mb-6" style={{ color: '#2c0f5b' }}>This feature is only available to homeowners and contractors.</p>
          <Button onClick={() => window.location.href = '/'} style={{ backgroundColor: '#2c0f5b', color: 'white' }} className="hover:opacity-90">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Block free tier homeowners from accessing maintenance features
  if (userRole === 'homeowner' && isFreeUser && !subscriptionLoading) {
    return <FreeUserUpgradePrompt />;
  }

  return (
    <div className="min-h-screen" style={{ background: '#ffffff' }}>

      {/* ── PAGE HEADER ───────────────────────────── */}
      <div className="dash-header">
        <div className="dash-header-top">
          <img src={logoHomeowner} alt="MyHomeBase™" className="dash-logo" />
        </div>
        <span className="dash-eyebrow">Homeowner</span>
        <div className="dash-title">Your Tasks</div>
        <div className="dash-subtitle">{MONTHS[selectedMonth - 1]} maintenance schedule for your home</div>
        <div className="dash-chips">
          <div className="dash-chip">
            <div className={`dash-chip-num${totalTasks > 0 && completedCount < totalTasks ? ' alert' : ''}`}>{totalTasks}</div>
            <div className="dash-chip-label">Tasks this month</div>
          </div>
          <div className="dash-chip">
            <div className={`dash-chip-num${completedCount > 0 ? ' good' : ''}`}>{completedCount}</div>
            <div className="dash-chip-label">Completed</div>
          </div>
          <div className="dash-chip">
            <div className="dash-chip-num">{(houses as any[]).length}</div>
            <div className="dash-chip-label">Properties</div>
          </div>
        </div>
      </div>

      {/* Trial Banner for Homeowners */}
      {userRole === 'homeowner' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HomeownerTrialBanner />
        </div>
      )}
      {/* Home Wellness Score™ Cards - Wrapped in Feature Gate for Homeowners */}
      {userRole === 'homeowner' && houses.length > 0 && (
        <HomeownerFeatureGate featureName="Maintenance Scheduling">
          <section className="py-4 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className={`grid gap-4 ${houses.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : houses.length === 2 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                {houses.map((house: House) => (
                  <HomeHealthScore 
                    key={house.id} 
                    houseId={house.id} 
                    houseName={house.name}
                    compact={true}
                  />
                ))}
              </div>
            </div>
          </section>
        </HomeownerFeatureGate>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">Setup & Maintain Your Home</h2>
          <p className="text-gray-600 max-w-xl mb-4 text-center mx-auto">Add your property, document systems and features, log appliances, and record maintenance — everything that keeps your home healthy and up to date.</p>
          
          {/* Contractor No Properties Onboarding */}
          {userRole === 'contractor' && houses.length === 0 && (
            <Card className="mb-6 border-2 border-dashed" style={{ backgroundColor: '#f8fafc', borderColor: '#b6a6f4' }}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 rounded-full" style={{ backgroundColor: '#2c0f5b' }}>
                  <Building className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold" style={{ color: '#2c0f5b' }}>
                  Add Your Property to Get Started
                </CardTitle>
                <p className="text-lg" style={{ color: '#6b7280' }}>
                  Track maintenance for your personal property and stay on top of important home care tasks
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg mx-auto w-fit" style={{ backgroundColor: '#f3e8ff' }}>
                      <Calendar className="w-6 h-6" style={{ color: '#6b46c1' }} />
                    </div>
                    <h3 className="font-semibold" style={{ color: '#2c0f5b' }}>Smart Scheduling</h3>
                    <p className="text-sm text-gray-600">Get personalized maintenance schedules based on your location and home systems</p>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg mx-auto w-fit" style={{ backgroundColor: '#f3e8ff' }}>
                      <Wrench className="w-6 h-6" style={{ color: '#6b46c1' }} />
                    </div>
                    <h3 className="font-semibold" style={{ color: '#2c0f5b' }}>Track Maintenance</h3>
                    <p className="text-sm text-gray-600">Log completed maintenance, repairs, and improvements to keep detailed records</p>
                  </div>
                </div>
                <div className="text-center pt-4">
                  <Button 
                    onClick={handleAddNewHouse}
                    size="lg"
                    className="px-8 py-3 text-lg font-semibold"
                    style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                    data-testid="button-add-first-property"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add My Property
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    Contractors can track maintenance for one personal property
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Homeowner No Properties Onboarding */}
          {userRole === 'homeowner' && houses.length === 0 && (
            <Card className="mb-6 border-2 border-dashed" style={{ backgroundColor: '#f8fafc', borderColor: '#b6a6f4' }}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 rounded-full" style={{ backgroundColor: '#2c0f5b' }}>
                  <Building className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold" style={{ color: '#2c0f5b' }}>
                  Add Your First Property to Get Started
                </CardTitle>
                <p className="text-lg" style={{ color: '#6b7280' }}>
                  Start tracking maintenance for your home and get personalized recommendations based on your location and systems
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg mx-auto w-fit" style={{ backgroundColor: '#f3e8ff' }}>
                      <Calendar className="w-6 h-6" style={{ color: '#6b46c1' }} />
                    </div>
                    <h3 className="font-semibold" style={{ color: '#2c0f5b' }}>Smart Scheduling</h3>
                    <p className="text-sm text-gray-600">Get personalized maintenance schedules based on your location and home systems</p>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg mx-auto w-fit" style={{ backgroundColor: '#f3e8ff' }}>
                      <Wrench className="w-6 h-6" style={{ color: '#6b46c1' }} />
                    </div>
                    <h3 className="font-semibold" style={{ color: '#2c0f5b' }}>Track Maintenance</h3>
                    <p className="text-sm text-gray-600">Log completed maintenance, repairs, and improvements to keep detailed records</p>
                  </div>
                </div>
                <div className="text-center pt-4 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={handleAddNewHouse}
                      size="lg"
                      className="px-8 py-3 text-lg font-semibold"
                      style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                      data-testid="button-add-first-property"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add My Property
                    </Button>
                    <Button 
                      onClick={() => window.location.href = '/contractors'}
                      size="lg"
                      className="px-8 py-3 text-lg font-semibold"
                      style={{ backgroundColor: '#1560a2', color: 'white' }}
                      data-testid="button-find-contractors-general"
                      data-tour-id="find-contractors"
                    >
                      <MapPin className="w-5 h-5 mr-2" />
                      Find Contractors
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Add your property for personalized maintenance, or find contractors for immediate help
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Property Selector Card - Only show when properties exist */}
          {houses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
              <div className="flex flex-col gap-4 items-center text-center">
                <div className="w-full max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building className="inline w-4 h-4 mr-1.5 text-purple-600" />
                    Select Property
                  </label>
                  <Select value={selectedHouseId} onValueChange={setSelectedHouseId}>
                    <SelectTrigger className="w-full h-12 bg-white border-gray-300 hover:border-purple-400 focus:border-purple-500" data-testid="select-property">
                      <SelectValue placeholder="Choose a property..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {houses.map((house: House) => (
                        <SelectItem 
                          key={house.id} 
                          value={house.id} 
                          className="cursor-pointer py-3"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{house.name}</span>
                            <span className="text-sm text-gray-500 truncate max-w-[300px]">
                              {house.address}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col gap-3 w-full max-w-md">
                  {/* Contractor constraint message */}
                  {userRole === 'contractor' && houses.length >= 1 && (
                    <div className="text-sm p-3 rounded-lg bg-blue-50 border-2 border-blue-200 text-blue-700 mb-2">
                      Contractors can track maintenance for one personal property
                    </div>
                  )}
                  <div className="flex flex-col gap-3 w-full">
                    {/* Only show Add House button for homeowners or contractors with no houses */}
                    {userRole === 'homeowner' && (
                      <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={handleAddNewHouse}
                        className="whitespace-nowrap text-base w-full" style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                        data-tour-id="add-home"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add House
                      </Button>
                    )}
                    {selectedHouseId && houses.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => {
                          const selectedHouse = houses.find((h: House) => h.id === selectedHouseId);
                          if (selectedHouse) handleEditHouse(selectedHouse);
                        }}
                        className="whitespace-nowrap text-base w-full" style={{ backgroundColor: 'white', color: '#2c0f5b', borderColor: '#2c0f5b', borderWidth: '3px' }}
                      >
                        <Edit className="w-5 h-5 mr-2" style={{ color: '#2c0f5b' }} />
                        Edit
                      </Button>
                    )}
                    {selectedHouseId && houses.length > 1 && (
                      <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => {
                          const selectedHouse = houses.find((h: House) => h.id === selectedHouseId);
                          if (selectedHouse) handleDeleteHouse(selectedHouse);
                        }}
                        className="whitespace-nowrap text-base w-full" style={{ backgroundColor: '#dc2626', color: 'white', borderColor: '#dc2626' }}
                      >
                        <Trash2 className="w-5 h-5 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                  
                  {selectedHouseId && houses.length > 0 && (
                    <div className="text-base mt-2" style={{ color: '#2c0f5b' }}>
                      <div className="flex items-center justify-center gap-2">
                        <MapPin className="w-5 h-5" style={{ color: '#2c0f5b' }} />
                        <span className="font-medium" style={{ color: '#2c0f5b' }}>
                          {CLIMATE_ZONES.find(z => z.value === selectedZone)?.label || 'Loading region...'}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <Home className="w-5 h-5" style={{ color: '#2c0f5b' }} />
                        <span className="font-medium" style={{ color: '#2c0f5b' }}>5 systems configured</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
            <div className="mb-6 border rounded-lg p-4" style={{ backgroundColor: '#f2f2f2' }}>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="text-sm" style={{ color: '#2c0f5b' }}>
                  <Building className="inline w-4 h-4 mr-1" style={{ color: '#2c0f5b' }} />
                  {houses.find((house: House) => house.id === selectedHouseId)?.name || 'Loading...'} • 
                  <Calendar className="inline w-4 h-4 ml-2 mr-1" style={{ color: '#2c0f5b' }} />
                  {MONTHS[selectedMonth - 1]} • {CLIMATE_ZONES.find(z => z.value === selectedZone)?.label}
                </div>
                
                {totalTasks > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-[#2c0f5b]" style={{ color: '#2c0f5b' }}>
                      Progress: {completedCount}/{totalTasks} completed
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetMonthTasks}
                      className="text-xs" style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset Month
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-2 ml-auto flex-wrap">
                  {selectedHouseId && userRole === 'homeowner' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openAiInvoiceDialog}
                      className="text-white"
                      style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                      data-testid="button-ai-scan-invoice-maintenance"
                    >
                      <Scan className="w-4 h-4 mr-1" />
                      AI Scan Invoice
                    </Button>
                  )}
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
                  <label className="block text-sm font-medium mb-2" style={{ color: '#2c0f5b' }}>
                    <Calendar className="inline w-4 h-4 mr-1" style={{ color: '#2c0f5b' }} />
                    Month
                  </label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger style={{ backgroundColor: '#ffffff' }}>
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
                  <label className="block text-sm font-medium mb-2" style={{ color: '#2c0f5b' }}>
                    <MapPin className="inline w-4 h-4 mr-1" style={{ color: '#2c0f5b' }} />
                    Climate Zone (auto-set by property)
                  </label>
                  <Select value={selectedZone} onValueChange={setSelectedZone} disabled>
                    <SelectTrigger className="opacity-60" style={{ backgroundColor: '#ffffff' }}>
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
                  <Button variant="outline" className="w-full justify-between h-14" style={{ backgroundColor: '#ffffff', color: '#2c0f5b', borderColor: '#2c0f5b' }} data-tour-id="home-systems">
                    <div className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" style={{ color: '#2c0f5b' }} />
                      Home Systems & Features ({homeSystems.length} selected)
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSystemFilters ? 'rotate-180' : ''}`} style={{ color: '#2c0f5b' }} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="flex flex-col lg:flex-row gap-4 p-4 border-2 rounded-lg" style={{ backgroundColor: '#f2f2f2', borderColor: '#2c0f5b' }}>
                    {/* Systems checklist */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                      {Object.entries(HOME_SYSTEMS).map(([category, systems]) => (
                        <div key={category}>
                          <h4 className="font-medium text-sm mb-3 capitalize" style={{ color: '#2c0f5b' }}>
                            {category === 'features' ? 'Special Features' :
                             category === 'exterior' ? 'Roof & Exterior' :
                             category === 'electrical' ? 'Electrical' :
                             category === 'plumbing' ? 'Plumbing' :
                             category === 'structural' ? 'Foundation & Structure' :
                             category === 'insulation' ? 'Attic & Insulation' :
                             `${category.charAt(0).toUpperCase() + category.slice(1)} System`}
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
                                      className="text-sm cursor-pointer"
                                      style={{ color: '#2c0f5b' }}
                                    >
                                      {system.label}
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {systemData && (
                                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#e8e0f0', color: '#2c0f5b' }}>
                                        {systemData.installationYear || 'Unknown'}
                                      </span>
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0 text-xs"
                                      style={{ color: '#2c0f5b' }}
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

                    {/* Live house map — updates as systems are checked */}
                    {selectedHouseId && (
                      <div className="lg:w-64 xl:w-72 flex-shrink-0 bg-white rounded-lg p-2 border border-purple-100">
                        <p className="text-xs font-semibold text-center mb-1" style={{ color: '#2c0f5b' }}>Your Home Map</p>
                        <HouseMap
                          houseId={selectedHouseId}
                          homeownerId={homeownerId}
                          checkedSystems={homeSystems.map(v =>
                            Object.values(HOME_SYSTEMS).flat().find(s => s.value === v)?.label || v
                          )}
                        />
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Referring Agent Card */}
            {referringAgentLoading && (
              <div className="mb-6">
                <Card className="border-blue-200 dark:border-blue-800/30 animate-pulse" style={{ backgroundColor: '#f2f2f2' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-700"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}


            {referringAgent && !referringAgentLoading && (
              <div className="mb-6">
                <Card className="border-blue-200 dark:border-blue-800/30" style={{ backgroundColor: '#f2f2f2' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {referringAgent.profileImageUrl ? (
                          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-200 dark:border-purple-800">
                            <img 
                              src={`/public/${referringAgent.profileImageUrl}`}
                              alt={`${referringAgent.firstName} ${referringAgent.lastName}`}
                              className="w-full h-full object-cover"
                              data-testid="img-agent-profile"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center" style="background-color: #2c0f5b"><svg class="w-7 h-7" style="color: #b6a6f4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>`;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2c0f5b' }}>
                            <User className="w-7 h-7" style={{ color: '#b6a6f4' }} />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold" style={{ color: '#2c0f5b' }}>
                            Your Real Estate Agent
                          </h3>
                          <p className="text-sm" style={{ color: '#666666' }}>
                            {referringAgent.firstName} {referringAgent.lastName}
                          </p>
                          {referringAgent.referralCode && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded" style={{ color: '#2c0f5b' }}>
                                Referral Code: {referringAgent.referralCode}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {referringAgent.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid="button-email-agent"
                            style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                          >
                            <a href={`mailto:${referringAgent.email}`}>
                              <Mail className="w-4 h-4 mr-1" />
                              Email
                            </a>
                          </Button>
                        )}
                        {referringAgent.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid="button-call-agent"
                            style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                          >
                            <a href={`tel:${referringAgent.phone}`}>
                              <Phone className="w-4 h-4 mr-1" />
                              Call
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      {referringAgent.officeAddress && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: '#666666' }}>
                          <Building2 className="w-4 h-4" style={{ color: '#2c0f5b' }} />
                          <span data-testid="text-agent-office">{referringAgent.officeAddress}</span>
                        </div>
                      )}
                      {referringAgent.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="w-4 h-4" style={{ color: '#2c0f5b' }} />
                          <a 
                            href={referringAgent.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ color: '#2c0f5b' }}
                            data-testid="link-agent-website"
                          >
                            Visit Website
                          </a>
                        </div>
                      )}
                      <p className="text-sm pt-2" style={{ color: '#666666' }}>
                        Thank you for joining MyHomeBase™ through {referringAgent.firstName}'s referral! Feel free to reach out if you have any questions.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* System-Based Maintenance Recommendations */}
            {selectedHouseId && homeSystemsData && homeSystemsData.length > 0 && (() => {
              const allRecommendations = homeSystemsData
                .filter(system => system.houseId === selectedHouseId && homeSystems.includes(system.systemType))
                .flatMap(system => 
                  generateAgeBasedRecommendations(system).map(rec => ({
                    ...rec,
                    system: system,
                    systemLabel: Object.values(HOME_SYSTEMS)
                      .flat()
                      .find(s => s.value === system.systemType)?.label || system.systemType
                  }))
                );
              
              if (allRecommendations.length === 0) return null;
              
              return (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-gradient-to-br from-orange-500 to-red-600">
                      <Thermometer className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-center" style={{ color: '#2c0f5b' }}>System-Based Maintenance Recommendations</h2>
                      <p className="text-sm text-center" style={{ color: '#b6a6f4' }}>
                        Personalized suggestions based on your equipment age
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {allRecommendations.map((rec, index) => (
                      <Card 
                        key={index}
                        className={`border-2 ${
                          rec.urgency === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' :
                          rec.urgency === 'important' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' :
                          'border-gray-300 bg-gray-50 dark:bg-gray-800/50'
                        }`}
                        data-testid={`system-recommendation-${index}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  variant={rec.urgency === 'critical' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {rec.urgency === 'critical' ? '🔴 Critical' :
                                   rec.urgency === 'important' ? '🟠 Important' :
                                   '🟢 Routine'}
                                </Badge>
                                {rec.system.installationYear && (
                                  <span className="text-xs text-muted-foreground">
                                    Installed {rec.system.installationYear}
                                  </span>
                                )}
                              </div>
                              <CardTitle className="text-base" style={{ color: '#2c0f5b' }}>
                                {rec.title}
                              </CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {rec.description}
                          </p>
                          
                          {rec.estimatedCost && (
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                Est. Cost: {rec.estimatedCost}
                              </span>
                            </div>
                          )}
                          
                          {rec.system.brand && (
                            <div className="text-xs text-muted-foreground pt-2 border-t">
                              {rec.system.brand} {rec.system.model && `- ${rec.system.model}`}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* AI Maintenance Coach Card */}
            {selectedHouseId && !isContractor && (
              <div className="mb-6">
                <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background dark:border-purple-800 overflow-hidden">
                  {/* Header — always visible */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-5 py-4 text-left group"
                    onClick={() => setCoachOpen(o => !o)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">AI Maintenance Coach</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          {coachResult ? "Personalized plan ready" : "Get a personalized maintenance plan for this month"}
                        </p>
                      </div>
                    </div>
                    {coachOpen ? (
                      <ChevronDown className="w-4 h-4 text-purple-500 transition-transform" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-purple-500 transition-transform" />
                    )}
                  </button>

                  {/* Collapsible body */}
                  {coachOpen && (
                    <div className="px-5 pb-5 space-y-4 border-t border-purple-100 dark:border-purple-800 pt-4">
                      {/* Loading skeleton */}
                      {coachMutation.isPending && (
                        <div className="space-y-3 animate-pulse">
                          <div className="h-3 bg-purple-100 dark:bg-purple-900/40 rounded w-full" />
                          <div className="h-3 bg-purple-100 dark:bg-purple-900/40 rounded w-4/5" />
                          <div className="h-3 bg-purple-100 dark:bg-purple-900/40 rounded w-3/5" />
                          <div className="mt-4 space-y-2">
                            {[1,2,3].map(i => (
                              <div key={i} className="h-14 bg-purple-50 dark:bg-purple-900/20 rounded-lg" />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Initial CTA — no result yet and not loading */}
                      {!coachMutation.isPending && !coachResult && (
                        <div className="flex flex-col items-center gap-3 py-4 text-center">
                          <p className="text-sm text-muted-foreground max-w-sm">
                            Your AI coach analyzes your {MONTHS[selectedMonth - 1]} tasks, climate zone, and home wellness score to recommend what to tackle first.
                          </p>
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => { if (selectedHouseId) coachMutation.mutate(selectedHouseId); }}
                            disabled={coachMutation.isPending}
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            Get My AI Plan
                          </Button>
                        </div>
                      )}

                      {/* Error state */}
                      {coachMutation.isError && !coachResult && (
                        <div className="text-center py-3">
                          <p className="text-sm text-destructive mb-2">Could not generate advice. Please try again.</p>
                          <Button size="sm" variant="outline" onClick={() => { if (selectedHouseId) coachMutation.mutate(selectedHouseId); }}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Retry
                          </Button>
                        </div>
                      )}

                      {/* Results */}
                      {coachResult && !coachMutation.isPending && (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{coachResult.briefing}</p>

                          {coachResult.topTasks.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Focus on these first</p>
                              {coachResult.topTasks.map((t, i) => (
                                <button
                                  key={t.title}
                                  type="button"
                                  onClick={() => {
                                    const el = document.querySelector<HTMLElement>(`[data-task-title="${CSS.escape(t.title)}"]`);
                                    if (el) {
                                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                                      setHighlightedTask(t.title);
                                      setTimeout(() => setHighlightedTask(null), 2500);
                                    }
                                  }}
                                  className="w-full text-left flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 transition-colors group/task"
                                >
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center mt-0.5">
                                    {i + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover/task:text-purple-700 dark:group-hover/task:text-purple-300 transition-colors">{t.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t.reason}</p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1 opacity-0 group-hover/task:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 h-7 px-2"
                              onClick={() => { if (selectedHouseId) coachMutation.mutate(selectedHouseId); }}
                              disabled={coachMutation.isPending}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Ask Again
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-tour-id="task-list">
              {filteredTasks.map((task, taskIdx) => {
                const completed = isTaskCompleted(task.id);
                const taskOverride = getTaskOverride(task.title, taskOverrides);
                const displayDescription = taskOverride?.customDescription || task.description;
                
                return (
                  <div
                    key={task.id}
                    data-task-title={task.title}
                    {...(taskIdx === 0 ? { 'data-tour-id': 'task-complete' } : {})}
                    className={highlightedTask === task.title ? "ring-2 ring-purple-400 ring-offset-2 rounded-xl transition-all duration-300" : undefined}
                  >
                    <TaskCard
                      task={task}
                      completed={completed}
                      displayDescription={displayDescription}
                      generateTaskId={generateTaskId}
                      onOpenDialog={() => {
                        setSelectedTask(task);
                        setIsTaskDetailDialogOpen(true);
                      }}
                    />
                  </div>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#ffffff' }}>
                    No tasks for this month and location
                  </h3>
                  <p style={{ color: '#2c0f5b' }}>
                    Try selecting a different month or climate zone to see recommended maintenance tasks.
                  </p>
                </div>
              )}
            </div>


        {/* Home Appliances Section */}
        {selectedHouseId && (
          <div className="mt-12" data-tour-id="appliances">
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <h2 className="text-2xl font-semibold" style={{ color: '#2c0f5b' }}>Home Appliances</h2>
                <Button
                  onClick={() => {
                    setEditingAppliance(null);
                    setDialogApplianceType("");
                    setBrandSearch("");
                    setModelLookupLoading(false);
                    applianceForm.reset({
                      homeownerId,
                      houseId: selectedHouseId,
                      name: "",
                      make: "",
                      model: "",
                      serialNumber: "",
                      purchaseDate: "",
                      installDate: "",
                      yearInstalled: undefined,
                      notes: "",
                      location: "",
                      warrantyExpiration: "",
                      lastServiceDate: "",
                    });
                    setIsApplianceDialogOpen(true);
                  }}
                  className="text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-90 mx-auto"
                  style={{ backgroundColor: '#2c0f5b' }}
                  data-testid="button-add-appliance"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Appliance
                </Button>
              </div>
              {appliancesLoading ? (
                <div className="text-center py-8">
                  <div className="text-lg" style={{ color: '#2c0f5b' }}>Loading appliances...</div>
                </div>
              ) : appliances.length === 0 ? (
                <Card className="border-2" style={{ borderColor: '#b6a6f4', backgroundColor: '#f8f9fa' }}>
                  <CardContent className="py-8 text-center">
                    <Monitor className="h-12 w-12 mx-auto mb-4" style={{ color: '#b6a6f4' }} />
                    <h3 className="text-lg font-medium mb-2" style={{ color: '#2c0f5b' }}>No appliances added yet</h3>
                    <p className="text-gray-600">
                      Track appliances, manuals, and maintenance schedules
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {appliances.map((appliance) => {
                    const installYear = appliance.installDate
                      ? new Date(appliance.installDate).getFullYear()
                      : appliance.yearInstalled;
                    const age = installYear ? new Date().getFullYear() - installYear : null;

                    return (
                      <AccordionItem
                        key={appliance.id}
                        value={appliance.id}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                        style={{ backgroundColor: '#ffffff' }}
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-purple-50 [&>svg]:hidden">
                          <div className="flex items-center justify-between w-full gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Monitor className="w-5 h-5 shrink-0" style={{ color: '#2c0f5b' }} />
                              <div className="text-left min-w-0">
                                <p className="font-semibold text-sm leading-tight truncate" style={{ color: '#2c0f5b' }}>
                                  {appliance.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {[appliance.make, appliance.model].filter(Boolean).join(' · ')}
                                  {appliance.location ? ` · ${appliance.location}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {age !== null && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e8e0f0', color: '#2c0f5b' }}>
                                  {age} yr{age !== 1 ? 's' : ''}
                                </span>
                              )}
                              <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-0">
                          <div className="border-t border-gray-100 pt-3 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                              {appliance.make && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Manufacturer</p>
                                  <p className="font-medium" style={{ color: '#2c0f5b' }}>{appliance.make}</p>
                                </div>
                              )}
                              {appliance.model && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Model #</p>
                                  <p className="font-medium" style={{ color: '#2c0f5b' }}>{appliance.model}</p>
                                </div>
                              )}
                              {appliance.serialNumber && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Serial #</p>
                                  <p className="font-medium text-gray-600">{appliance.serialNumber}</p>
                                </div>
                              )}
                              {appliance.location && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Location</p>
                                  <p className="font-medium text-gray-600">{appliance.location}</p>
                                </div>
                              )}
                              {installYear && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Installed</p>
                                  <p className="font-medium text-gray-600">{installYear}</p>
                                </div>
                              )}
                              {appliance.warrantyExpiration && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Warranty Exp.</p>
                                  <p className="font-medium text-gray-600">{appliance.warrantyExpiration}</p>
                                </div>
                              )}
                            </div>

                            {appliance.notes && (
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                                {appliance.notes}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-2">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedApplianceId(appliance.id);
                                    setEditingApplianceManual(null);
                                    applianceManualForm.reset({
                                      applianceId: appliance.id,
                                      title: "",
                                      type: "owner",
                                      source: "upload",
                                      url: "",
                                      fileName: "",
                                      fileSize: undefined,
                                    });
                                    setIsApplianceManualDialogOpen(true);
                                  }}
                                  className="text-xs h-7"
                                  style={{ borderColor: '#2c0f5b', color: '#2c0f5b' }}
                                  data-testid={`button-add-manual-${appliance.id}`}
                                >
                                  <Book className="w-3 h-3 mr-1" />
                                  Add Manual
                                </Button>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingAppliance(appliance);
                                    setDialogApplianceType(appliance.name || "");
                                    setBrandSearch(appliance.make || "");
                                    setModelLookupLoading(false);
                                    applianceForm.reset({
                                      ...appliance,
                                      houseId: appliance.houseId || undefined,
                                      notes: appliance.notes || undefined,
                                    });
                                    setIsApplianceDialogOpen(true);
                                  }}
                                  className="h-7 w-7 p-0"
                                  style={{ color: '#2c0f5b' }}
                                  data-testid={`button-edit-appliance-${appliance.id}`}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setApplianceToDelete(appliance);
                                    setDeleteApplianceConfirmOpen(true);
                                  }}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                  data-testid={`button-delete-appliance-${appliance.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </div>
        )}

        {/* Custom Maintenance Tasks Section */}
        <div className="mt-12" data-custom-tasks-section>
          <CustomMaintenanceTasks 
            homeownerId={homeownerId} 
            houseId={selectedHouseId}
          />
        </div>

        {/* AI Invoice Scan Dialog */}
        <Dialog open={aiInvoiceOpen} onOpenChange={setAiInvoiceOpen}>
          <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                <Scan className="w-5 h-5" style={{ color: '#7c3aed' }} />
                {aiStep === "diy-verify" ? "Verify DIY Work" : "AI Scan Invoice"}
              </DialogTitle>
            </DialogHeader>

            {aiStep === "upload" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: '#2c0f5b' }}>Completion Method</label>
                  <Select value={aiCompletionMethod} onValueChange={(v) => setAiCompletionMethod(v as "contractor" | "diy")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contractor">Contractor (invoice/receipt)</SelectItem>
                      <SelectItem value="diy">DIY (before/after photos + receipt)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {aiCompletionMethod === "contractor" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: '#2c0f5b' }}>
                      Invoice / Receipt Photos *
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-purple-50" style={{ borderColor: '#b6a6f4' }}>
                      <Upload className="w-8 h-8 mb-2" style={{ color: '#7c3aed' }} />
                      <span className="text-sm" style={{ color: '#2c0f5b' }}>Upload invoice photos</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => setAiInvoiceFiles(Array.from(e.target.files || []))} />
                    </label>
                    {aiInvoiceFiles.length > 0 && <p className="text-xs text-green-600">{aiInvoiceFiles.length} file(s) selected</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: '#2c0f5b' }}>Material Receipt (optional)</label>
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-purple-50" style={{ borderColor: '#b6a6f4' }}>
                        <Upload className="w-6 h-6 mb-1" style={{ color: '#7c3aed' }} />
                        <span className="text-xs" style={{ color: '#2c0f5b' }}>Upload receipt for AI to extract service details</span>
                        <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => setAiReceiptFiles(Array.from(e.target.files || []))} />
                      </label>
                      {aiReceiptFiles.length > 0 && <p className="text-xs text-green-600">{aiReceiptFiles.length} receipt(s)</p>}
                    </div>
                    <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 border border-amber-200">Before &amp; after photos for verification will be requested in the next step.</p>
                  </div>
                )}

                <Button
                  onClick={runAiAnalysis}
                  disabled={aiAnalyzing}
                  className="w-full text-white"
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  {aiAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Scan className="w-4 h-4 mr-2" /> Analyze with AI</>}
                </Button>
              </div>
            )}

            {aiStep === "diy-verify" && aiAnalysis && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm font-medium text-amber-800 mb-1">DIY Work Verification Required</p>
                  <p className="text-xs text-amber-700">Upload before and after photos of your DIY work so AI can verify completion. This is required before saving your record.</p>
                </div>

                {aiDiyVerifyResult && (
                  <div className={`p-3 rounded-lg border ${aiDiyVerifyResult.diyVerified ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <p className={`text-sm font-medium ${aiDiyVerifyResult.diyVerified ? "text-green-800" : "text-red-800"}`}>
                      {aiDiyVerifyResult.diyVerified ? "✓ Verification passed" : "✗ Verification inconclusive"}
                    </p>
                    {aiDiyVerifyResult.verificationNotes && <p className="text-xs mt-1" style={{ color: aiDiyVerifyResult.diyVerified ? '#166534' : '#991b1b' }}>{aiDiyVerifyResult.verificationNotes}</p>}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700">Before Photos *</label>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-purple-50" style={{ borderColor: '#b6a6f4' }}>
                      <Upload className="w-5 h-5 mb-1" style={{ color: '#7c3aed' }} />
                      <span className="text-xs text-gray-600">Upload before photos</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => setAiDiyVerifyFiles((p) => ({ ...p, before: Array.from(e.target.files || []) }))} />
                    </label>
                    {aiDiyVerifyFiles.before.length > 0 && <p className="text-xs text-green-600 mt-1">{aiDiyVerifyFiles.before.length} before photo(s)</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700">After Photos *</label>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-purple-50" style={{ borderColor: '#b6a6f4' }}>
                      <Upload className="w-5 h-5 mb-1" style={{ color: '#7c3aed' }} />
                      <span className="text-xs text-gray-600">Upload after photos</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => setAiDiyVerifyFiles((p) => ({ ...p, after: Array.from(e.target.files || []) }))} />
                    </label>
                    {aiDiyVerifyFiles.after.length > 0 && <p className="text-xs text-green-600 mt-1">{aiDiyVerifyFiles.after.length} after photo(s)</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700">Receipt (optional)</label>
                    <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-purple-50" style={{ borderColor: '#b6a6f4' }}>
                      <Upload className="w-5 h-5 mb-1" style={{ color: '#7c3aed' }} />
                      <span className="text-xs text-gray-600">Upload receipt</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => setAiDiyVerifyFiles((p) => ({ ...p, receipt: Array.from(e.target.files || []) }))} />
                    </label>
                    {aiDiyVerifyFiles.receipt.length > 0 && <p className="text-xs text-green-600 mt-1">{aiDiyVerifyFiles.receipt.length} receipt(s)</p>}
                  </div>
                </div>

                <DialogFooter className="gap-2 flex-col sm:flex-row">
                  <Button variant="outline" onClick={() => setAiStep("upload")} disabled={aiDiyVerifying}>Back</Button>
                  <Button
                    onClick={runDiyVerify}
                    disabled={aiDiyVerifying}
                    className="text-white"
                    style={{ backgroundColor: '#7c3aed' }}
                    data-testid="button-run-diy-verify"
                  >
                    {aiDiyVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify with AI"}
                  </Button>
                  {aiDiyVerifyResult?.diyVerified && (
                    <Button
                      onClick={() => setAiStep("review")}
                      className="text-white"
                      style={{ backgroundColor: '#2c0f5b' }}
                      data-testid="button-diy-verify-to-review"
                    >
                      Continue to Review
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}

            {aiStep === "review" && aiAnalysis && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg border" style={{ backgroundColor: '#f3e8ff', borderColor: '#b6a6f4' }}>
                  <div className="flex items-center gap-1 mb-1">
                    {aiAnalysis.aiConfidence === "high" ? (
                      <span className="text-xs font-medium flex items-center gap-1 text-green-700"><CheckCircle2 className="w-3 h-3" /> High confidence</span>
                    ) : aiAnalysis.aiConfidence === "medium" ? (
                      <span className="text-xs font-medium flex items-center gap-1 text-amber-700"><AlertCircle className="w-3 h-3" /> Medium confidence — review carefully</span>
                    ) : (
                      <span className="text-xs font-medium flex items-center gap-1 text-red-700"><AlertCircle className="w-3 h-3" /> Low confidence — please fill in manually</span>
                    )}
                  </div>
                  {aiAnalysis.aiNotes && <p className="text-xs" style={{ color: '#2c0f5b' }}>{aiAnalysis.aiNotes}</p>}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium" style={{ color: '#2c0f5b' }}>Description</label>
                    <Input value={aiEditDescription} onChange={(e) => setAiEditDescription(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium" style={{ color: '#2c0f5b' }}>Date</label>
                      <Input type="date" value={aiEditDate} onChange={(e) => setAiEditDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium" style={{ color: '#2c0f5b' }}>Amount ($)</label>
                      <Input type="number" placeholder="0.00" value={aiEditAmount} onChange={(e) => setAiEditAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium" style={{ color: '#2c0f5b' }}>Contractor Name</label>
                      <Input value={aiEditContractorName} onChange={(e) => setAiEditContractorName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium" style={{ color: '#2c0f5b' }}>Company</label>
                      <Input value={aiEditContractorCompany} onChange={(e) => setAiEditContractorCompany(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium" style={{ color: '#2c0f5b' }}>Home Area</label>
                      <Input value={aiEditHomeArea} onChange={(e) => setAiEditHomeArea(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium" style={{ color: '#2c0f5b' }}>Service Type</label>
                      <Input value={aiEditServiceType} onChange={(e) => setAiEditServiceType(e.target.value)} />
                    </div>
                  </div>
                </div>
                {aiAnalysis.completionMethod === "diy" && !aiAnalysis.diyVerified && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">DIY work requires AI verification of before/after photos. Go to Service Records to complete the DIY verification step.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAiStep("upload")} className="flex-1">Back</Button>
                  <Button
                    onClick={confirmAiAnalysis}
                    disabled={aiConfirming || (aiAnalysis.completionMethod === "diy" && !aiAnalysis.diyVerified)}
                    className="flex-1 text-white"
                    style={{ backgroundColor: '#2c0f5b' }}
                    data-testid="button-confirm-ai-analysis-maintenance"
                  >
                    {aiConfirming ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Confirm & Add Record"}
                  </Button>
                </div>
              </div>
            )}

            {aiStep === "done" && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: '#22c55e' }} />
                <h3 className="text-lg font-semibold" style={{ color: '#2c0f5b' }}>Record Added!</h3>
                <p className="text-sm text-muted-foreground">Your service record and health score have been updated.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Maintenance Log Form Dialog */}
        <Dialog open={isMaintenanceLogDialogOpen} onOpenChange={setIsMaintenanceLogDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
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
                            <SelectTrigger style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent style={{ backgroundColor: '#ffffff' }}>
                            {SERVICE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value} style={{ color: '#000000' }}>
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
                            <SelectTrigger style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                              <SelectValue placeholder="Select home area" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent style={{ backgroundColor: '#ffffff' }}>
                            {HOME_AREAS.map((area) => (
                              <SelectItem key={area.value} value={area.value} style={{ color: '#000000' }}>
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
                        <Input placeholder="e.g., Annual HVAC tune-up, Gutter cleaning, Roof repair" {...field} style={{ backgroundColor: 'white', color: '#000000' }} />
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
                          <Input type="date" {...field} value={field.value || ""} style={{ backgroundColor: 'white', color: '#000000' }} />
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
                            type="text" 
                            placeholder="Service cost" 
                            {...field}
                            value={field.value || ""}
                            onChange={e => {
                              const value = e.target.value;
                              field.onChange(value ? parseFloat(value) : undefined);
                            }}
                            style={{ backgroundColor: 'white', color: '#000000' }}
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
                          <Input placeholder="Contractor or technician name" {...field} value={field.value || ""} style={{ backgroundColor: 'white', color: '#000000' }} />
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
                          <Input placeholder="Company or service provider" {...field} value={field.value || ""} style={{ backgroundColor: 'white', color: '#000000' }} />
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
                          <Input placeholder="e.g., 1 year, 6 months" {...field} value={field.value || ""} style={{ backgroundColor: 'white', color: '#000000' }} />
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
                          <Input type="date" {...field} value={field.value || ""} style={{ backgroundColor: 'white', color: '#000000' }} />
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
                          className="flex min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ backgroundColor: 'white', color: '#000000' }}
                          placeholder="Any additional notes about the service..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Upload Section */}
                <div className="space-y-4 pt-4 border-t" style={{ borderColor: '#b6a6f4' }}>
                  <h3 className="text-lg font-semibold">Attachments</h3>
                  
                  {/* Receipt Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Receipts/Invoices
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setReceiptFiles(prev => [...prev, ...files]);
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-white file:text-purple-700
                        hover:file:bg-gray-100"
                      data-testid="input-receipt-files"
                    />
                    {receiptFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {receiptFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm" style={{ color: '#b6a6f4' }}>
                            <span className="truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setReceiptFiles(prev => prev.filter((_, i) => i !== index))}
                              className="ml-2 text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Before Photos Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Before Photos
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setBeforePhotoFiles(prev => [...prev, ...files]);
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-white file:text-purple-700
                        hover:file:bg-gray-100"
                      data-testid="input-before-photos"
                    />
                    {beforePhotoFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {beforePhotoFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm" style={{ color: '#b6a6f4' }}>
                            <span className="truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setBeforePhotoFiles(prev => prev.filter((_, i) => i !== index))}
                              className="ml-2 text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* After Photos Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      After Photos
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setAfterPhotoFiles(prev => [...prev, ...files]);
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-white file:text-purple-700
                        hover:file:bg-gray-100"
                      data-testid="input-after-photos"
                    />
                    {afterPhotoFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {afterPhotoFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm" style={{ color: '#b6a6f4' }}>
                            <span className="truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setAfterPhotoFiles(prev => prev.filter((_, i) => i !== index))}
                              className="ml-2 text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    onClick={() => setIsMaintenanceLogDialogOpen(false)}
                    style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                    className="hover:opacity-90"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMaintenanceLogMutation.isPending || updateMaintenanceLogMutation.isPending || isUploadingFiles}
                    style={{ backgroundColor: '#b6a6f4', color: 'white' }}
                    className="hover:opacity-90"
                    data-testid="button-add-service-record"
                  >
                    {isUploadingFiles ? 'Uploading...' : (createMaintenanceLogMutation.isPending || updateMaintenanceLogMutation.isPending ? 'Saving...' : editingMaintenanceLog ? 'Update' : 'Add')} Service Record
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* House Management Dialog */}
        <Dialog open={isHouseDialogOpen} onOpenChange={setIsHouseDialogOpen}>
          <DialogContent className="max-w-md text-[#2c0f5b]">
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
                    style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                    className="hover:opacity-90"
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

            {/* Scan Document */}
            <div className="rounded-lg border-2 border-dashed p-3 text-center" style={{ borderColor: '#b6a6f4' }}>
              <p className="text-xs text-gray-500 mb-2">Upload a manual, label, or warranty card and AI will fill in the fields</p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: systemPdfLoading ? '#888' : '#2c0f5b' }}>
                {systemPdfLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Scanning…
                  </>
                ) : (
                  <>📄 Scan Document</>
                )}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="sr-only"
                  disabled={systemPdfLoading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSystemDocumentUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            
            <Form {...homeSystemForm}>
              <form onSubmit={homeSystemForm.handleSubmit(onSubmitHomeSystem)} className="space-y-4">
                <FormField
                  control={homeSystemForm.control}
                  name="installationYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Installed</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 2020" 
                          {...field}
                          value={field.value || ""}
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
                          value={field.value || ""}
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
                          <Input placeholder="e.g., Carrier" {...field} value={field.value || ""} />
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
                          <Input placeholder="e.g., 24ABC3" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={homeSystemForm.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SN-4829210A" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={homeSystemForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Additional information..." {...field} value={field.value || ""} />
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
                    style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                    className="hover:opacity-90"
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
                        setSystemToDelete(editingHomeSystem);
                        setDeleteSystemConfirmOpen(true);
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

        {/* Appliance Dialog */}
        <Dialog open={isApplianceDialogOpen} onOpenChange={(open) => { setIsApplianceDialogOpen(open); if (!open) setDialogApplianceType(""); }}>
          <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAppliance ? 'Edit Appliance' : 'Add New Appliance'}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...applianceForm}>
              <form onSubmit={applianceForm.handleSubmit((data) => {
                if (editingAppliance) {
                  updateApplianceMutation.mutate({ id: editingAppliance.id, data });
                } else {
                  createApplianceMutation.mutate(data);
                }
              })} className="space-y-4">
                {/* Step 1: Appliance Type */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Appliance Type
                  </label>
                  <Select
                    value={dialogApplianceType}
                    onValueChange={(val) => {
                      setDialogApplianceType(val);
                      applianceForm.setValue("name", val);
                      setBrandSearch("");
                      applianceForm.setValue("make", "");
                    }}
                  >
                    <SelectTrigger style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                      <SelectValue placeholder="Select appliance type…" />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: '#ffffff' }}>
                      {APPLIANCE_TYPES.map((cat) => (
                        <div key={cat.category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 sticky top-0">
                            {cat.category}
                          </div>
                          {cat.items.map((item) => (
                            <SelectItem key={item.value} value={item.value} style={{ color: '#000000' }}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={applianceForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Appliance Name
                          <span className="ml-1 text-xs font-normal opacity-70">(auto-filled from type)</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Kitchen Dishwasher, Main Water Heater" 
                            {...field} 
                            style={{ backgroundColor: '#ffffff', color: '#000000' }}
                          />
                        </FormControl>
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
                        <FormControl>
                          <Input 
                            placeholder="e.g., Kitchen, Basement, Garage" 
                            {...field} 
                            value={field.value || ""}
                            style={{ backgroundColor: '#ffffff', color: '#000000' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={applianceForm.control}
                    name="make"
                    render={({ field }) => {
                      const selectedTypeItem = APPLIANCE_TYPES.flatMap(cat => cat.items).find(item => item.value === dialogApplianceType);
                      const typeBrands = selectedTypeItem?.brands || [];
                      const brandPool = typeBrands.length > 0
                        ? [...new Set([...typeBrands, ...applianceBrands])]
                        : applianceBrands;
                      const filtered = brandPool.filter(b =>
                        b.toLowerCase().includes(brandSearch.toLowerCase())
                      );
                      return (
                        <FormItem className="relative">
                          <FormLabel>
                            Manufacturer / Brand
                            {typeBrands.length > 0 && !brandSearch && (
                              <span className="ml-1 text-xs font-normal opacity-70">(common for {dialogApplianceType})</span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Whirlpool, GE, Samsung"
                              {...field}
                              value={brandSearch || field.value || ""}
                              onChange={(e) => {
                                setBrandSearch(e.target.value);
                                field.onChange(e.target.value);
                                setBrandDropdownOpen(true);
                              }}
                              onFocus={() => setBrandDropdownOpen(true)}
                              onBlur={() => setTimeout(() => setBrandDropdownOpen(false), 150)}
                              autoComplete="off"
                              style={{ backgroundColor: '#ffffff', color: '#000000' }}
                            />
                          </FormControl>
                          {brandDropdownOpen && filtered.length > 0 && (
                            <div
                              className="absolute z-50 w-full mt-1 rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto"
                              style={{ top: '100%' }}
                            >
                              {filtered.map((brand) => (
                                <button
                                  key={brand}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-purple-50 hover:text-purple-900"
                                  onMouseDown={() => {
                                    field.onChange(brand);
                                    setBrandSearch(brand);
                                    setBrandDropdownOpen(false);
                                  }}
                                >
                                  {brand}
                                </button>
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={applianceForm.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Model
                          <span className="ml-2 text-xs font-normal opacity-75">(enter then click Look Up)</span>
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="e.g., WDF520PADM, GTW465ASNWW"
                              {...field}
                              style={{ backgroundColor: '#ffffff', color: '#000000' }}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            size="sm"
                            disabled={modelLookupLoading}
                            onClick={handleModelLookup}
                            style={{ backgroundColor: 'white', color: '#2c0f5b', whiteSpace: 'nowrap', flexShrink: 0 }}
                            title="Look up appliance details by model number"
                          >
                            {modelLookupLoading
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Search className="h-4 w-4" />}
                            <span className="ml-1 hidden sm:inline">{modelLookupLoading ? "Looking up…" : "Look Up"}</span>
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={applianceForm.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., ABC123456789" 
                            {...field} 
                            value={field.value || ""}
                            style={{ backgroundColor: '#ffffff', color: '#000000' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={applianceForm.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Date (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            {...field} 
                            value={field.value || ""}
                            style={{ backgroundColor: '#ffffff', color: '#000000' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={applianceForm.control}
                    name="installDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Install Date (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            {...field} 
                            value={field.value || ""}
                            style={{ backgroundColor: '#ffffff', color: '#000000' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={applianceForm.control}
                    name="warrantyExpiration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Expiration (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            {...field} 
                            value={field.value || ""}
                            style={{ backgroundColor: '#ffffff', color: '#000000' }}
                          />
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Additional details, condition, issues, etc." 
                          {...field} 
                          value={field.value || ""}
                          style={{ backgroundColor: '#ffffff', color: '#000000' }}
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
                    style={{ color: '#2c0f5b', borderColor: 'white', backgroundColor: 'white' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createApplianceMutation.isPending || updateApplianceMutation.isPending}
                    style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                    className="hover:opacity-90"
                  >
                    {createApplianceMutation.isPending || updateApplianceMutation.isPending ? (
                      "Saving..."
                    ) : (
                      editingAppliance ? "Update Appliance" : "Add Appliance"
                    )}
                  </Button>
                  {editingAppliance && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        setApplianceToDelete(editingAppliance);
                        setDeleteApplianceConfirmOpen(true);
                      }}
                      disabled={deleteApplianceMutation.isPending}
                    >
                      {deleteApplianceMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Appliance Manual Dialog */}
        <Dialog open={isApplianceManualDialogOpen} onOpenChange={setIsApplianceManualDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingApplianceManual ? 'Edit Manual' : 'Add Manual'}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...applianceManualForm}>
              <form onSubmit={applianceManualForm.handleSubmit((data) => {
                if (editingApplianceManual) {
                  updateApplianceManualMutation.mutate({ id: editingApplianceManual.id, data });
                } else {
                  createApplianceManualMutation.mutate(data);
                }
              })} className="space-y-4">
                <FormField
                  control={applianceManualForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manual Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Owner's Manual, Installation Guide" 
                          {...field} 
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={applianceManualForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manual Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger style={{ backgroundColor: '#ffffff' }}>
                            <SelectValue placeholder="Select manual type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="owner">Owner's Manual</SelectItem>
                          <SelectItem value="install">Installation Guide</SelectItem>
                          <SelectItem value="warranty">Warranty Information</SelectItem>
                          <SelectItem value="service">Service Manual</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={applianceManualForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger style={{ backgroundColor: '#ffffff' }}>
                            <SelectValue placeholder="Select source type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="upload">Upload File</SelectItem>
                          <SelectItem value="link">External Link</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={applianceManualForm.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {applianceManualForm.watch('source') === 'upload' ? 'File Path' : 'URL'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={
                            applianceManualForm.watch('source') === 'upload' 
                              ? "File will be uploaded..." 
                              : "https://example.com/manual.pdf"
                          }
                          {...field} 
                          style={{ backgroundColor: '#ffffff' }}
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
                    onClick={() => setIsApplianceManualDialogOpen(false)}
                    style={{ color: 'white', borderColor: 'white' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createApplianceManualMutation.isPending || updateApplianceManualMutation.isPending}
                    style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                    className="hover:opacity-90"
                  >
                    {createApplianceManualMutation.isPending || updateApplianceManualMutation.isPending ? (
                      "Saving..."
                    ) : (
                      editingApplianceManual ? "Update Manual" : "Add Manual"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialogs */}
        <ConfirmDialog
          open={deleteApplianceConfirmOpen}
          onOpenChange={setDeleteApplianceConfirmOpen}
          title="Delete Appliance?"
          description={`Are you sure you want to delete ${applianceToDelete?.name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteAppliance}
          variant="destructive"
        />

        <ConfirmDialog
          open={deleteSystemConfirmOpen}
          onOpenChange={setDeleteSystemConfirmOpen}
          title="Delete System?"
          description={`Are you sure you want to delete this system? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteSystem}
          variant="destructive"
        />

        {/* Task Detail Dialog - Full Window View */}
        {selectedTask && (
          <TaskDetailDialog
            task={selectedTask}
            open={isTaskDetailDialogOpen}
            onClose={() => {
              setIsTaskDetailDialogOpen(false);
              setSelectedTask(null);
            }}
            completed={isTaskCompleted(selectedTask.id)}
            isCustomTask={selectedTask.id.startsWith('custom-')}
            displayDescription={getTaskOverride(selectedTask.title, taskOverrides)?.customDescription || selectedTask.description}
            previousContractor={findPreviousContractor(selectedTask.category, selectedTask.title)}
            taskOverride={getTaskOverride(selectedTask.title, taskOverrides)}
            onViewContractor={(id) => window.open(`/contractor-profile/${id}`, '_blank')}
            onContractorComplete={handleContractorCompletion}
            showCustomizeTask={showCustomizeTask}
            setShowCustomizeTask={setShowCustomizeTask}
            getTaskOverride={getTaskOverride}
            isTaskEnabled={isTaskEnabled}
            generateTaskId={generateTaskId}
            upsertTaskOverrideMutation={upsertTaskOverrideMutation}
            deleteTaskOverrideMutation={deleteTaskOverrideMutation}
            completeTaskMutation={completeTaskMutation}
            toast={toast}
            taskOverrides={taskOverrides}
            selectedHouseId={selectedHouseId}
            houseName={houses.find((h: House) => h.id === selectedHouseId)?.name}
          />
        )}
      </div>
    </div>
  );
}