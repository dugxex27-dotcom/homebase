import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import HomeHealthScore from "@/components/home-health-score";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertMaintenanceLogSchema, insertCustomMaintenanceTaskSchema, insertHomeSystemSchema, insertTaskOverrideSchema, insertHomeApplianceSchema, insertHomeApplianceManualSchema } from "@shared/schema";
import type { MaintenanceLog, House, CustomMaintenanceTask, HomeSystem, TaskOverride, HomeAppliance, HomeApplianceManual } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock, Wrench, DollarSign, MapPin, RotateCcw, ChevronDown, Settings, Plus, Edit, Trash2, Home, FileText, Building2, User, Building, Phone, MessageSquare, AlertTriangle, Thermometer, Cloud, Monitor, Book, ExternalLink, Upload, Trophy, Mail, Handshake, Globe, TrendingDown, PiggyBank, Truck, CheckCircle2, Circle } from "lucide-react";
import { AppointmentScheduler } from "@/components/appointment-scheduler";
import { CustomMaintenanceTasks } from "@/components/custom-maintenance-tasks";
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
  systemRequirements?: string[];
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

// DIY Savings Tracker Component
function DIYSavingsTracker({ houseId }: { houseId: string }) {
  if (!houseId) return null;
  
  const { data, isLoading, isError } = useQuery<{ totalSavings: number; taskCount: number }>({
    queryKey: ['/api/houses', houseId, 'diy-savings'],
    enabled: !!houseId,
  });

  const formattedSavings = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(data?.totalSavings || 0);

  return (
    <section className="py-8" style={{ backgroundColor: '#2c0f5b' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Card style={{ backgroundColor: '#f2f2f2' }} data-testid="diy-savings-tracker">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                  <PiggyBank className="w-6 h-6 text-white" />
                </div>
                <CardTitle style={{ color: '#2c0f5b' }} className="flex-1">DIY Savings Tracker</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#6d28d9' }}></div>
                    <p className="mt-4 text-sm text-gray-600">Loading savings data...</p>
                  </div>
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                    <p className="text-sm font-medium text-gray-700">Unable to load savings data</p>
                    <p className="text-xs text-gray-500 mt-2">Please try refreshing the page</p>
                  </div>
                </div>
              ) : (data?.totalSavings === 0 && data?.taskCount === 0) ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <PiggyBank className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm font-medium text-gray-700">No DIY savings yet</p>
                    <p className="text-xs text-gray-500 mt-2">Complete maintenance tasks yourself to start saving money!</p>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total DIY Savings</p>
                    <div className="flex items-baseline gap-2 justify-center md:justify-start">
                      <span 
                        className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                        data-testid="total-savings-amount"
                      >
                        {formattedSavings}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Money saved by doing it yourself</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-sm font-medium text-gray-600 mb-2">DIY Tasks Completed</p>
                    <div className="flex items-baseline gap-2 justify-center md:justify-start">
                      <span 
                        className="text-4xl font-bold"
                        style={{ color: '#2c0f5b' }}
                        data-testid="diy-task-count"
                      >
                        {data?.taskCount || 0}
                      </span>
                      <span className="text-lg text-gray-500">tasks</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Avg savings: {data && data.taskCount > 0 ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(data.totalSavings / data.taskCount) : '$0'} per task
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

// Task Card Component - New Layout based on mockup
interface TaskCardProps {
  task: MaintenanceTask;
  completed: boolean;
  isCustomTask: boolean;
  displayDescription: string;
  previousContractor: any;
  taskOverride: TaskOverride | undefined;
  onToggleComplete: () => void;
  onCustomize: () => void;
  onViewContractor: (id: string) => void;
  showCustomizeTask: string | null;
  getTaskOverride: (taskTitle: string, overrides: TaskOverride[] | undefined) => TaskOverride | undefined;
  isTaskEnabled: (taskTitle: string, overrides: TaskOverride[] | undefined) => boolean;
  generateTaskId: (title: string) => string;
  upsertTaskOverrideMutation: any;
  deleteTaskOverrideMutation: any;
  toast: any;
  taskOverrides: TaskOverride[] | undefined;
}

function TaskCard({
  task,
  completed,
  isCustomTask,
  displayDescription,
  previousContractor,
  taskOverride,
  onToggleComplete,
  onCustomize,
  onViewContractor,
  showCustomizeTask,
  getTaskOverride,
  isTaskEnabled,
  generateTaskId,
  upsertTaskOverrideMutation,
  deleteTaskOverrideMutation,
  toast,
  taskOverrides,
}: TaskCardProps) {
  const [showReadDetails, setShowReadDetails] = useState(false);
  
  // Calculate progress - for now use completed state as 0/1, structured for future step tracking
  const currentProgress = completed ? 1 : 0;
  const totalSteps = 1; // Future: this could come from task.steps?.length or similar

  return (
    <Card 
      className={`hover:shadow-md transition-all ${
        completed ? 'border-green-200 dark:border-green-800' : 'border-gray-300 dark:border-gray-700'
      }`}
      style={{ backgroundColor: completed ? '#dcfce7' : '#f2f2f2' }}
      data-testid={`card-task-${task.id}`}
    >
      <CardHeader className="pb-3">
        {/* Custom Task Badge */}
        {isCustomTask && (
          <Badge className="mb-3 w-fit" style={{ backgroundColor: '#b6a6f4', color: '#2c0f5b' }} data-testid="badge-custom-task">
            Custom Task
          </Badge>
        )}
        
        {/* Header: Completion Checkbox + Title + Priority Badge + Edit Button */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={completed}
              onCheckedChange={onToggleComplete}
              className="mt-1"
              data-testid={`checkbox-complete-${task.id}`}
            />
            <CardTitle className="tracking-tight text-xl font-bold flex-1" style={{ color: '#2c0f5b' }} data-testid={`title-task-${generateTaskId(task.title)}`}>
              {task.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {task.priority === 'high' && (
              <Badge className="bg-red-500 text-white hover:bg-red-600 font-semibold px-3 py-1" data-testid={`badge-priority-${task.priority}`}>
                HIGH PRIORITY
              </Badge>
            )}
            {task.priority === 'medium' && (
              <Badge className="bg-yellow-500 text-white hover:bg-yellow-600 font-semibold px-3 py-1" data-testid={`badge-priority-${task.priority}`}>
                MEDIUM PRIORITY
              </Badge>
            )}
            {task.priority === 'low' && (
              <Badge className="bg-green-500 text-white hover:bg-green-600 font-semibold px-3 py-1" data-testid={`badge-priority-${task.priority}`}>
                LOW PRIORITY
              </Badge>
            )}
            {/* Edit button for custom tasks */}
            {isCustomTask && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  document.querySelector('[data-custom-tasks-section]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  toast({
                    title: "Edit Custom Task",
                    description: "Use the Edit button in the Custom Maintenance Tasks section below to modify this task."
                  });
                }}
                className="p-1 h-7 w-7"
                data-testid={`button-edit-custom-${task.id}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress Indicator with Visual Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Progress</span>
            <span className="text-gray-600">{currentProgress}/{totalSteps} Steps</span>
          </div>
          <Progress value={(currentProgress / totalSteps) * 100} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action Summary - Single sentence */}
        {task.actionSummary && (
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100" style={{ color: '#2c0f5b' }}>
            {task.actionSummary}
          </p>
        )}
        
        {/* Steps - Bullet points */}
        {task.steps && task.steps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold" style={{ color: '#2c0f5b' }}>Steps:</h4>
            <ul className="space-y-1.5 ml-1">
              {task.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tools and Supplies Checklist */}
        {task.toolsAndSupplies && task.toolsAndSupplies.length > 0 && (
          <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
              <Wrench className="w-4 h-4" />
              Tools & Supplies Needed:
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {task.toolsAndSupplies.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="w-4 h-4 border-2 border-purple-400 dark:border-purple-600 rounded flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Original Description - Only show if no action summary/steps */}
        {!task.actionSummary && !task.steps && (
          <p className="leading-relaxed text-gray-700" style={{ color: '#2c0f5b' }}>
            {displayDescription}
          </p>
        )}

        {/* Impact & Consequences Section - What happens if not done */}
        {(task.impact || task.impactCost) && (
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 border-2 border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-red-900 dark:text-red-100 mb-2">
                  If Not Completed
                </h4>
                {task.impact && (
                  <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                    {task.impact}
                  </p>
                )}
                {task.impactCost && (
                  <div className="flex items-center gap-2 mt-2">
                    <DollarSign className="w-4 h-4 text-red-700 dark:text-red-300" />
                    <span className="text-sm font-semibold text-red-900 dark:text-red-100">
                      Potential Cost: {task.impactCost}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Read Details Link */}
        <button
          onClick={() => setShowReadDetails(!showReadDetails)}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 transition-colors"
          data-testid={`button-read-details-${task.id}`}
        >
          Read Details
          <ChevronDown className={`w-4 h-4 transition-transform ${showReadDetails ? 'rotate-180' : ''}`} />
        </button>

        {/* Cost & Effort Section - Always Visible */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-bold mb-3" style={{ color: '#2c0f5b' }}>Cost & Effort</h4>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* DIY Cost */}
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-700">DIY Cost:</span>
              <span className="font-semibold text-gray-900">
                {task.costEstimate ? formatDIYSavings(task.costEstimate) : '–'}
              </span>
              {task.costEstimate && <span className="text-gray-500 text-xs">(Supplies)</span>}
            </div>

            {/* Pro Cost */}
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-700">Pro Cost:</span>
              <span className="font-semibold text-gray-900">
                {task.costEstimate ? formatCostEstimate(task.costEstimate) : '–'}
              </span>
            </div>

            {/* Find Contractor Link */}
            <a
              href={`/contractors?category=${encodeURIComponent(task.category)}&service=${encodeURIComponent(task.title)}`}
              className="text-blue-600 hover:text-blue-700 font-medium underline ml-auto"
              data-testid={`link-find-contractor-${task.id}`}
            >
              Find Contractor
            </a>

            {/* Difficulty */}
            {task.difficulty && (
              <div className="flex items-center gap-2 ml-4">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-gray-700">{task.difficulty}</span>
              </div>
            )}
          </div>
        </div>

        {/* Primary CTA Button */}
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-base"
          onClick={() => setShowReadDetails(!showReadDetails)}
          data-testid={`button-view-checklist-${task.id}`}
        >
          {showReadDetails ? (
            <>
              <ChevronDown className="w-5 h-5 mr-2 rotate-180" />
              Hide Full Checklist & Instructions
            </>
          ) : (
            <>
              <ChevronDown className="w-5 h-5 mr-2" />
              View Full Checklist & Instructions
            </>
          )}
        </Button>

        {/* Read Details Collapsible Content */}
        <Collapsible open={showReadDetails}>
          <CollapsibleContent>
            <div className="border-t pt-4 space-y-4">
              {/* Additional Task Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" style={{ color: '#fbbf24' }} />
                  <span style={{ color: '#2c0f5b' }}>{task.estimatedTime}</span>
                </div>
                {task.cost && (
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" style={{ color: '#10b981' }} />
                    <span style={{ color: '#2c0f5b' }}>{task.cost}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Badge variant="outline" className="text-xs">
                    {task.category}
                  </Badge>
                </div>
              </div>

              {/* Tools Needed */}
              {task.tools && task.tools.length > 0 && (
                <div>
                  <div className="flex items-center mb-2">
                    <Wrench className="w-4 h-4 mr-2" style={{ color: '#ef4444' }} />
                    <span className="text-sm font-medium" style={{ color: '#2c0f5b' }}>Tools needed:</span>
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

              {/* Customization Panel */}
              {!isCustomTask && (
                <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center" style={{ color: '#2c0f5b' }}>
                      <Settings className="w-4 h-4 mr-2" />
                      Customize This Task
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCustomize}
                      className="text-xs"
                    >
                      {showCustomizeTask === task.id ? 'Hide' : 'Show'} Options
                    </Button>
                  </div>

                  <Collapsible open={showCustomizeTask === task.id}>
                    <CollapsibleContent>
                      {(() => {
                        const currentOverride = getTaskOverride(task.title, taskOverrides);
                        const taskId = generateTaskId(task.title);
                        
                        return (
                          <div className="space-y-4">
                            {/* Enable/Disable Task */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`enable-${taskId}`}
                                  checked={isTaskEnabled(task.title, taskOverrides)}
                                  onCheckedChange={(checked) => {
                                    upsertTaskOverrideMutation.mutate({
                                      taskId,
                                      isEnabled: checked as boolean,
                                      frequencyType: currentOverride?.frequencyType || undefined,
                                      specificMonths: currentOverride?.specificMonths || undefined,
                                    });
                                  }}
                                  data-testid={`checkbox-enable-${taskId}`}
                                />
                                <label htmlFor={`enable-${taskId}`} className="text-sm font-medium" style={{ color: '#2c0f5b' }}>
                                  Enable this task
                                </label>
                              </div>
                              {currentOverride && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteTaskOverrideMutation.mutate(taskId)}
                                  className="text-xs"
                                  data-testid={`button-reset-${taskId}`}
                                >
                                  Reset to Default
                                </Button>
                              )}
                            </div>

                            {/* Frequency Selector */}
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
                                      isEnabled: isTaskEnabled(task.title, taskOverrides),
                                      frequencyType: value,
                                      specificMonths: currentOverride?.specificMonths || undefined,
                                    });
                                  }
                                }}
                                data-testid={`select-frequency-${taskId}`}
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

                            {/* Custom Description */}
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
                                      isEnabled: isTaskEnabled(task.title, taskOverrides),
                                      frequencyType: currentOverride?.frequencyType || undefined,
                                      specificMonths: currentOverride?.specificMonths || undefined,
                                      customDescription: newDescription || undefined,
                                    });
                                  }
                                }}
                                data-testid={`textarea-description-${taskId}`}
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

              {/* Previous Contractor Section */}
              {previousContractor && (
                <div className="rounded-lg p-3" style={{ backgroundColor: '#2c0f5b' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <User className="w-4 h-4 mr-2 text-white" />
                        <span className="text-sm font-medium text-white">
                          Previous contractor used for {previousContractor.serviceType}
                        </span>
                      </div>
                      <div className="text-sm text-white">
                        <div className="font-medium">
                          {previousContractor.contractorName}
                          {previousContractor.contractorCompany && (
                            <span className="font-normal"> - {previousContractor.contractorCompany}</span>
                          )}
                        </div>
                        <div className="text-xs mt-1">
                          Last service: {new Date(previousContractor.lastServiceDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {previousContractor.contractorId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          style={{ backgroundColor: '#b6a6f4', color: '#ffffff', borderColor: '#b6a6f4' }}
                          onClick={() => onViewContractor(previousContractor.contractorId)}
                          data-testid={`button-view-contractor-${task.id}`}
                        >
                          <User className="w-3 h-3 mr-1" />
                          View Profile
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          style={{ backgroundColor: '#b6a6f4', color: '#ffffff', borderColor: '#b6a6f4' }}
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
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
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
  
  // Task override states
  const [showCustomizeTask, setShowCustomizeTask] = useState<string | null>(null);

  // Appliance management states
  const [isApplianceDialogOpen, setIsApplianceDialogOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<HomeAppliance | null>(null);
  const [isApplianceManualDialogOpen, setIsApplianceManualDialogOpen] = useState(false);
  const [editingApplianceManual, setEditingApplianceManual] = useState<HomeApplianceManual | null>(null);
  const [selectedApplianceId, setSelectedApplianceId] = useState<string>("");
  
  // Service logs filter state
  const [homeAreaFilter, setHomeAreaFilter] = useState<string>("all");

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
    queryKey: ['/api/maintenance-logs', { homeownerId, houseId: selectedHouseId }],
    queryFn: async () => {
      const response = await fetch(`/api/maintenance-logs?houseId=${selectedHouseId}`);
      if (!response.ok) throw new Error('Failed to fetch maintenance logs');
      return response.json();
    },
    enabled: isAuthenticated && !!homeownerId && !isContractor && !!selectedHouseId
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
    const wasCompleted = completedTasks[taskKey] || false;
    
    setCompletedTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
    
    if (!wasCompleted && selectedHouseId && (user as any)?.id) {
      trackTaskCompletionMutation.mutate({
        taskId,
        houseId: selectedHouseId
      });
    }
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
    setIsMaintenanceLogDialogOpen(true);
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




  const getServiceTypeLabel = (type: string) => {
    return SERVICE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getHomeAreaLabel = (area: string) => {
    return HOME_AREAS.find(a => a.value === area)?.label || area;
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2c0f5b' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2c0f5b' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-300 mb-6">Please sign in to access maintenance features.</p>
          <Button onClick={() => window.location.href = '/signin'} className="bg-white text-purple-900 hover:bg-gray-100">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!userRole || (userRole !== 'homeowner' && userRole !== 'contractor')) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2c0f5b' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">This feature is only available to homeowners and contractors.</p>
          <Button onClick={() => window.location.href = '/'} className="bg-white text-purple-900 hover:bg-gray-100">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2c0f5b' }}>
      <Header />
      {/* Hero Section */}
      <section className="py-6" style={{ background: '#2c0f5b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6" style={{ color: '#ffffff' }}>
              Smart Maintenance Schedule
            </h1>
            <p className="text-xl max-w-3xl mx-auto mb-8" style={{ color: '#b6a6f4' }}>
              Keep your home in perfect condition with personalized maintenance schedules based on your location and home systems
            </p>
          </div>
        </div>
      </section>

      {/* Home Health Score Section */}
      {userRole === 'homeowner' && selectedHouseId && (
        <section className="py-8" style={{ backgroundColor: '#2c0f5b' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <HomeHealthScore houseId={selectedHouseId} />
            </div>
          </div>
        </section>
      )}

      {/* DIY Savings Tracker Section */}
      {userRole === 'homeowner' && selectedHouseId && <DIYSavingsTracker houseId={selectedHouseId} />}

      <div className="container mx-auto px-4 py-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-center text-[#ffffff]" style={{ color: '#ffffff' }}>
            Home Maintenance
          </h1>
          <p className="text-lg mb-4 text-center text-[#ffffff]" style={{ color: '#b6a6f4' }}>Keep your home in perfect condition with personalized maintenance recommendations</p>
          
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
            <div className="border rounded-lg p-4 mb-6" style={{ backgroundColor: '#f2f2f2' }}>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#2c0f5b' }}>
                    <Building className="inline w-4 h-4 mr-1" style={{ color: '#2c0f5b' }} />
                    Select Property
                  </label>
                  <Select value={selectedHouseId} onValueChange={setSelectedHouseId}>
                    <SelectTrigger className="w-full" style={{ backgroundColor: '#ffffff' }}>
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
                  {/* Contractor constraint message */}
                  {userRole === 'contractor' && houses.length >= 1 && (
                    <div className="text-xs p-2 rounded bg-blue-50 border border-blue-200 text-blue-700 mb-2">
                      Contractors can track maintenance for one personal property
                    </div>
                  )}
                  <div className="flex gap-2">
                    {/* Only show Add House button for homeowners or contractors with no houses */}
                    {userRole === 'homeowner' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleAddNewHouse}
                        className="whitespace-nowrap" style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add House
                      </Button>
                    )}
                    {selectedHouseId && houses.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const selectedHouse = houses.find((h: House) => h.id === selectedHouseId);
                          if (selectedHouse) handleEditHouse(selectedHouse);
                        }}
                        className="whitespace-nowrap" style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
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
                        className="whitespace-nowrap" style={{ backgroundColor: '#dc2626', color: 'white', borderColor: '#dc2626' }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                  
                  {selectedHouseId && houses.length > 0 && (
                    <div className="text-sm" style={{ color: '#b6a6f4' }}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" style={{ color: '#2c0f5b' }} />
                        <span style={{ color: '#2c0f5b' }}>
                          {CLIMATE_ZONES.find(z => z.value === selectedZone)?.label || 'Loading region...'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Home className="w-4 h-4" style={{ color: '#2c0f5b' }} />
                        <span style={{ color: '#2c0f5b' }}>5 systems configured</span>
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
                
                <div className="flex gap-2 ml-auto">
                  {/* Find Contractors Button */}
                  {selectedHouseId && houses.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const selectedHouse = houses.find((h: House) => h.id === selectedHouseId);
                        if (selectedHouse) {
                          // Navigate to contractors page with house address as location
                          const encodedAddress = encodeURIComponent(selectedHouse.address);
                          window.location.href = `/contractors?location=${encodedAddress}`;
                        }
                      }}
                      className="whitespace-nowrap px-8 py-3 text-lg font-semibold" 
                      style={{ backgroundColor: '#1560a2', color: 'white' }}
                      data-testid="button-find-contractors"
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      Find Contractors
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
                  <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                    <Calendar className="inline w-4 h-4 mr-1" style={{ color: '#b6a6f4' }} />
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
                  <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                    <MapPin className="inline w-4 h-4 mr-1" style={{ color: '#b6a6f4' }} />
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
                  <Button variant="outline" className="w-full justify-between" style={{ backgroundColor: '#ffffff', color: '#2c0f5b', borderColor: '#2c0f5b' }}>
                    <div className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" style={{ color: '#2c0f5b' }} />
                      Home Systems & Features ({homeSystems.length} selected)
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSystemFilters ? 'rotate-180' : ''}`} style={{ color: '#2c0f5b' }} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 border rounded-lg bg-muted/50">
                    {Object.entries(HOME_SYSTEMS).map(([category, systems]) => (
                      <div key={category}>
                        <h4 className="font-medium text-sm mb-3 capitalize" style={{ color: '#ffffff' }}>
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
                                    className="text-sm cursor-pointer"
                                    style={{ color: '#b6a6f4' }}
                                  >
                                    {system.label}
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {systemData && (
                                    <span className="text-xs bg-muted/50 px-2 py-1 rounded" style={{ color: '#b6a6f4' }}>
                                      {systemData.installationYear || 'Unknown'}
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

            {referringAgentError && !referringAgentLoading && (
              <div className="mb-6">
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm text-red-800 dark:text-red-300">
                    Unable to load referring agent information. Please try again later.
                  </AlertDescription>
                </Alert>
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
                        Thank you for joining Home Base through {referringAgent.firstName}'s referral! Feel free to reach out if you have any questions.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Service Records Quick Access */}
            {maintenanceLogs && maintenanceLogs.length > 0 && (
              <div className="mb-6">
                <Card className="border-blue-200 dark:border-blue-800/30" style={{ backgroundColor: '#f2f2f2' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: '#2c0f5b' }}>
                          <FileText className="w-5 h-5" style={{ color: '#b6a6f4' }} />
                        </div>
                        <div>
                          <h3 className="font-semibold" style={{ color: '#2c0f5b' }}>Recent Service History</h3>
                          <p className="text-sm" style={{ color: '#666666' }}>
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
                        style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                      >
                        View All Records
                      </Button>
                    </div>
                    {maintenanceLogs.slice(0, 2).map((log) => (
                      <div key={log.id} className="mt-3 p-3 rounded-lg border-gray-300 dark:border-gray-700" style={{ backgroundColor: '#f2f2f2' }}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm" style={{ color: '#2c0f5b' }}>{log.serviceDescription}</h4>
                            <div className="flex items-center gap-3 text-xs mt-1" style={{ color: '#2c0f5b' }}>
                              <span>{new Date(log.serviceDate).toLocaleDateString()}</span>
                              {log.homeArea && (
                                <>
                                  <span>•</span>
                                  <span>{getHomeAreaLabel(log.homeArea)}</span>
                                </>
                              )}
                              {log.contractorCompany && (
                                <>
                                  <span>•</span>
                                  <span>{log.contractorCompany}</span>
                                </>
                              )}
                            </div>
                            {log.createdAt && (
                              <div className="text-xs text-gray-500 mt-1">
                                Record added {new Date(log.createdAt).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                            )}
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
                const isCustomTask = task.id.startsWith('custom-');
                const taskOverride = getTaskOverride(task.title, taskOverrides);
                const displayDescription = taskOverride?.customDescription || task.description;
                
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    completed={completed}
                    isCustomTask={isCustomTask}
                    displayDescription={displayDescription}
                    previousContractor={previousContractor}
                    taskOverride={taskOverride}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onCustomize={() => setShowCustomizeTask(showCustomizeTask === task.id ? null : task.id)}
                    onViewContractor={(id) => window.open(`/contractor-profile/${id}`, '_blank')}
                    showCustomizeTask={showCustomizeTask}
                    getTaskOverride={getTaskOverride}
                    isTaskEnabled={isTaskEnabled}
                    generateTaskId={generateTaskId}
                    upsertTaskOverrideMutation={upsertTaskOverrideMutation}
                    deleteTaskOverrideMutation={deleteTaskOverrideMutation}
                    toast={toast}
                    taskOverrides={taskOverrides}
                  />
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2" style={{ color: '#ffffff' }}>
                    No tasks for this month and location
                  </h3>
                  <p style={{ color: '#b6a6f4' }}>
                    Try selecting a different month or climate zone to see recommended maintenance tasks.
                  </p>
                </div>
              )}
            </div>


        {/* Custom Maintenance Tasks Section */}
        <div className="mt-12" data-custom-tasks-section>
          <CustomMaintenanceTasks 
            homeownerId={homeownerId} 
            houseId={selectedHouseId}
          />
        </div>

        {/* Appliances Section */}
        {selectedHouseId && (
          <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Home Appliances</h2>
                <p className="text-lg" style={{ color: '#b6a6f4' }}>
                  Track appliances, manuals, and maintenance schedules
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingAppliance(null);
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
                style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                className="hover:opacity-90"
                data-testid="button-add-appliance"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Appliance
              </Button>
            </div>

            {appliancesLoading ? (
              <div className="text-center py-8">
                <div className="text-lg text-white">Loading appliances...</div>
              </div>
            ) : appliances.length === 0 ? (
              <Card className="border-gray-300 shadow-lg" style={{ backgroundColor: '#f2f2f2' }}>
                <CardContent className="text-center py-12">
                  <Monitor className="mx-auto h-12 w-12 mb-4" style={{ color: '#2c0f5b' }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#2c0f5b' }}>
                    No appliances added yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Start tracking your home appliances, their manuals, and maintenance schedules.
                  </p>
                  <Button
                    onClick={() => {
                      setEditingAppliance(null);
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
                    style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                    data-testid="button-add-first-appliance"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Appliance
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appliances.map((appliance) => {
                  const calculateAge = () => {
                    const installYear = appliance.installDate ? 
                      new Date(appliance.installDate).getFullYear() : 
                      appliance.yearInstalled;
                    if (!installYear) return null;
                    return new Date().getFullYear() - installYear;
                  };

                  const age = calculateAge();
                  
                  return (
                    <Card 
                      key={appliance.id} 
                      className="hover:shadow-md transition-all border-gray-300"
                      style={{ backgroundColor: '#f2f2f2' }}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-3 flex-1">
                            <Monitor className="w-5 h-5 mt-1" style={{ color: '#2c0f5b' }} />
                            <div className="flex-1">
                              <CardTitle className="text-lg font-semibold" style={{ color: '#2c0f5b' }}>
                                {appliance.name}
                              </CardTitle>
                              <p className="text-sm text-gray-600">
                                {appliance.make} {appliance.model}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingAppliance(appliance);
                                applianceForm.reset({
                                  ...appliance,
                                  houseId: appliance.houseId || undefined,
                                  notes: appliance.notes || undefined,
                                });
                                setIsApplianceDialogOpen(true);
                              }}
                              className="p-1 h-7 w-7"
                              data-testid={`button-edit-appliance-${appliance.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${appliance.name}?`)) {
                                  deleteApplianceMutation.mutate(appliance.id);
                                }
                              }}
                              className="p-1 h-7 w-7 text-red-600 hover:text-red-700"
                              data-testid={`button-delete-appliance-${appliance.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {age && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                              <span className="text-gray-600">{age} years old</span>
                            </div>
                          )}
                          {appliance.location && (
                            <div className="flex items-center">
                              <Home className="w-4 h-4 mr-2 text-gray-500" />
                              <span className="text-gray-600">{appliance.location}</span>
                            </div>
                          )}
                          {appliance.serialNumber && (
                            <div className="flex items-center text-xs text-gray-500 col-span-2">
                              Serial: {appliance.serialNumber}
                            </div>
                          )}
                        </div>

                        {appliance.notes && (
                          <p className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
                            {appliance.notes}
                          </p>
                        )}
                        
                        {appliance.createdAt && (
                          <div className="text-xs text-gray-500 border-t pt-2">
                            Added on {new Date(appliance.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t">
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
                            className="text-xs"
                            data-testid={`button-add-manual-${appliance.id}`}
                          >
                            <Book className="w-3 h-3 mr-1" />
                            Add Manual
                          </Button>
                          <span className="text-xs text-gray-500">
                            {/* Show manual count here when we implement manual fetching */}
                            0 manuals
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}



        {/* Maintenance Log Section */}
        <div id="service-records" className="mb-8" style={{ paddingTop: '30px' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <FileText className="w-6 h-6" style={{ color: '#b6a6f4' }} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold" style={{ color: '#ffffff' }}>Service Records</h2>
                <p style={{ color: '#b6a6f4' }}>Complete history of maintenance and repairs performed on your home</p>
              </div>
            </div>
            <Button onClick={handleAddNewMaintenanceLog} style={{ backgroundColor: '#b6a6f4', color: 'white' }} className="hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Service Record
            </Button>
          </div>

          {/* Home Area Filter */}
          <div className="mb-4">
            <Select value={homeAreaFilter} onValueChange={setHomeAreaFilter}>
              <SelectTrigger className="w-full md:w-64" style={{ backgroundColor: '#f2f2f2' }} data-testid="select-home-area-filter-logs">
                <SelectValue placeholder="Filter by home area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Home Areas</SelectItem>
                {HOME_AREAS.map((area) => (
                  <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              (() => {
                const filteredLogs = maintenanceLogs.filter(log => homeAreaFilter === "all" || log.homeArea === homeAreaFilter);
                return filteredLogs.length > 0 ? (
                  <div className="space-y-4">
                    {filteredLogs.map((log) => (
                      <Card key={log.id} className="hover:shadow-md transition-shadow" style={{ backgroundColor: '#f2f2f2' }}>
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
                                <div className="flex items-center gap-4 text-sm" style={{ color: '#2c0f5b' }}>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(log.serviceDate).toLocaleDateString()}
                                  </span>
                                  {log.homeArea && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-4 h-4" />
                                      {getHomeAreaLabel(log.homeArea)}
                                    </span>
                                  )}
                                  <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: '#2c0f5b20', color: '#2c0f5b' }}>
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
                                style={{ color: '#2c0f5b' }}
                                className="hover:opacity-90"
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
                          
                          {log.createdAt && (
                            <div className="mt-3 text-xs text-gray-500 border-t pt-2">
                              Record added on {new Date(log.createdAt).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2" style={{ color: '#ffffff' }}>No service records for this home area</h3>
                    <p className="mb-4" style={{ color: '#b6a6f4' }}>
                      Try selecting a different home area or clear the filter to see all records.
                    </p>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 rounded-lg" style={{ backgroundColor: '#ffffff' }}>
                <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#b6a6f4' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: '#2c0f5b' }}>No service records yet</h3>
                <p className="mb-4" style={{ color: '#000000' }}>
                  Start tracking maintenance and repairs to build a complete home service history.
                </p>
                <Button onClick={handleAddNewMaintenanceLog} style={{ backgroundColor: '#2c0f5b', color: 'white' }} className="hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Service Record
                </Button>
              </div>
            )}
        </div>



        {/* Maintenance Log Form Dialog */}
        <Dialog open={isMaintenanceLogDialogOpen} onOpenChange={setIsMaintenanceLogDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-white" style={{ backgroundColor: '#2c0f5b' }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'white' }}>
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
                        <FormLabel style={{ color: 'white' }}>Service Type</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Home Area</FormLabel>
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
                      <FormLabel style={{ color: 'white' }}>Service Description</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Service Date</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Cost</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Contractor Name</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Company</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Warranty Period</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Next Service Due</FormLabel>
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
                      <FormLabel style={{ color: 'white' }}>Notes</FormLabel>
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
                    disabled={createMaintenanceLogMutation.isPending || updateMaintenanceLogMutation.isPending}
                    style={{ backgroundColor: '#b6a6f4', color: 'white' }}
                    className="hover:opacity-90"
                    data-testid="button-add-service-record"
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
          <DialogContent className="max-w-md text-[#ffffff]">
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
                        if (window.confirm('Are you sure you want to delete this system?')) {
                          deleteHomeSystemMutation.mutate(editingHomeSystem.id);
                          setIsHomeSystemDialogOpen(false);
                        }
                      }}
                      disabled={deleteHomeSystemMutation.isPending}
                      style={{ color: 'white' }}
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
        <Dialog open={isApplianceDialogOpen} onOpenChange={setIsApplianceDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-white" style={{ backgroundColor: '#2c0f5b' }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'white' }}>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={applianceForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: 'white' }}>Appliance Name</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Location</FormLabel>
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: 'white' }}>Make/Brand</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Whirlpool, GE, Samsung" 
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
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: 'white' }}>Model</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., WDF520PADM, GTW465ASNWW" 
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
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: 'white' }}>Serial Number (Optional)</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Purchase Date (Optional)</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Install Date (Optional)</FormLabel>
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
                        <FormLabel style={{ color: 'white' }}>Warranty Expiration (Optional)</FormLabel>
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
                      <FormLabel style={{ color: 'white' }}>Notes (Optional)</FormLabel>
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
                    style={{ color: 'white', borderColor: 'white' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createApplianceMutation.isPending || updateApplianceMutation.isPending}
                    style={{ backgroundColor: 'white', color: '#2c0f5b' }}
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
                        if (window.confirm('Are you sure you want to delete this appliance?')) {
                          deleteApplianceMutation.mutate(editingAppliance.id);
                          setIsApplianceDialogOpen(false);
                        }
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
          <DialogContent className="max-w-md text-white" style={{ backgroundColor: '#2c0f5b' }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'white' }}>
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
                      <FormLabel style={{ color: 'white' }}>Manual Title</FormLabel>
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
                      <FormLabel style={{ color: 'white' }}>Manual Type</FormLabel>
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
                      <FormLabel style={{ color: 'white' }}>Source Type</FormLabel>
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
                      <FormLabel style={{ color: 'white' }}>
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
      </div>
    </div>
  );
}