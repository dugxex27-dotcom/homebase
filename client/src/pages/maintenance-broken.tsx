import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, Wrench, DollarSign, MapPin, RotateCcw, ChevronDown, Settings } from "lucide-react";

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
  systemRequirements?: string[]; // New field for home system requirements
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [homeSystems, setHomeSystems] = useState<string[]>([]);
  const [showSystemFilters, setShowSystemFilters] = useState(false);

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

  // Generate storage key for task completion (includes month/year to reset monthly)
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

  // Comprehensive maintenance schedule based on professional recommendations
  const getMaintenanceTasksForMonth = (month: number): MaintenanceTask[] => {
    const isWinter = month === 12 || month === 1 || month === 2;
    const isSpring = month === 3 || month === 4 || month === 5;
    const isSummer = month === 6 || month === 7 || month === 8;
    const isFall = month === 9 || month === 10 || month === 11;

    // Base tasks that vary by climate zone and season
    const climateTasks: MaintenanceTask[] = [];

    // WINTER TASKS (December, January, February)
    if (isWinter) {
      climateTasks.push(
        // Cold Climate Winter Tasks
        {
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
        },
        {
          id: "winter-insulation-check",
          title: "Check Weather Stripping and Insulation",
          description: month === 12 ? "Inspect and replace worn weather stripping around doors and windows." :
                      month === 1 ? "Check attic insulation and seal any air leaks to prevent heat loss." :
                      "Monitor for ice dams and ensure proper ventilation in attic spaces.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: month === 1 ? "2 hours" : "1 hour",
          difficulty: "moderate",
          category: "Insulation",
          tools: ["Caulk gun", "Weather stripping", "Flashlight"],
          cost: "$25-60"
        }
      );
    }
    
    // FEBRUARY-SPECIFIC GROUT AND CAULKING TASK
    if (month === 2) {
      climateTasks.push({
        id: "february-grout-caulking",
        title: "Inspect Grout and Caulking",
        description: "Inspect bathroom and kitchen grout and caulking for cracks, mold, or deterioration. Re-caulk as needed to prevent moisture damage.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "medium",
        estimatedTime: "1-2 hours",
        difficulty: "moderate",
        category: "Maintenance",
        tools: ["Caulk gun", "Caulk", "Scraper tool", "Cleaning supplies"],
        cost: "$15-30"
      });
    }

    if (isWinter) {
      climateTasks.push(
        // Mild Climate Winter Tasks
        {
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
        }
      );
    }

    // SPRING TASKS (March, April, May)
    if (isSpring) {
      climateTasks.push(
        {
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
        },
        {
          id: "spring-hvac-transition",
          title: "HVAC Spring Preparation",
          description: month === 3 ? "Schedule AC maintenance and replace air filters for allergy season." :
                      month === 4 ? "Test air conditioning system and clean outdoor AC unit." :
                      "Check and clean ceiling fans, reverse direction for summer cooling.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "high",
          estimatedTime: month === 3 ? "1 hour" : "45 minutes",
          difficulty: "easy",
          category: "HVAC",
          tools: month === 4 ? ["Garden hose", "Soft brush"] : ["New air filter"],
          cost: month === 3 ? "$15-40" : "$0-20"
        },
        // Region-specific spring tasks
        {
          id: "spring-landscaping-northern",
          title: "Northern Climate Landscaping",
          description: month === 3 ? "Begin spring cleanup, remove winter protection from plants." :
                      month === 4 ? "Start garden beds, plant cool-season vegetables and flowers." :
                      "Fertilize lawn and begin regular mowing schedule.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "medium",
          estimatedTime: "2-4 hours",
          difficulty: "moderate",
          category: "Landscaping",
          tools: ["Garden tools", "Fertilizer", "Seeds/plants"],
          cost: "$30-80"
        },
        {
          id: "spring-landscaping-southern",
          title: "Southern Climate Landscaping",
          description: month === 3 ? "Plant warm-season flowers and vegetables, begin summer prep." :
                      month === 4 ? "Deep water established plants, check irrigation system." :
                      "Apply pre-emergent herbicide and summer fertilizer.",
          month: month,
          climateZones: ["southeast", "southwest", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "1-3 hours",
          difficulty: "moderate",
          category: "Landscaping",
          tools: ["Garden tools", "Irrigation supplies", "Fertilizer"],
          cost: "$25-70"
        }
      );
    }

    // SUMMER TASKS (June, July, August)
    if (isSummer) {
      climateTasks.push(
        // Hot climate summer tasks
        {
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
        },
        {
          id: "summer-water-conservation",
          title: "Water System Maintenance",
          description: month === 6 ? "Check sprinkler system efficiency and adjust watering schedules." :
                      month === 7 ? "Inspect outdoor faucets and hoses for leaks, check water pressure." :
                      "Deep clean and maintain water heater, check for sediment buildup.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: month === 8 ? "2 hours" : "1 hour",
          difficulty: month === 8 ? "moderate" : "easy",
          category: "Plumbing",
          tools: month === 8 ? ["Wrench", "Drain pan"] : ["Repair supplies"],
          cost: "$10-40"
        },
        // Moderate climate summer tasks
        {
          id: "summer-moderate-climate",
          title: "Summer Maintenance - Moderate Climate",
          description: month === 6 ? "Deep clean outdoor furniture and grilling area for summer entertaining." :
                      month === 7 ? "Check and maintain outdoor lighting and electrical outlets." :
                      "Inspect and clean chimney, prepare fireplace for potential use.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "medium",
          estimatedTime: "1-2 hours",
          difficulty: "easy",
          category: month === 8 ? "Fireplace" : "Outdoor",
          tools: ["Cleaning supplies", "Outdoor furniture care products"],
          cost: "$15-35"
        }
      );
    }

    // FALL TASKS (September, October, November)
    if (isFall) {
      climateTasks.push(
        {
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
        },
        // Mild climate fall tasks
        {
          id: "fall-mild-climate",
          title: "Fall Maintenance - Mild Climate",
          description: month === 9 ? "Continue summer maintenance, monitor cooling costs and efficiency." :
                      month === 10 ? "Plant cool-season flowers and vegetables for winter growing." :
                      "Light heating system check, prepare for occasional cool weather.",
          month: month,
          climateZones: ["southeast", "southwest", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "1-2 hours",
          difficulty: "easy",
          category: month === 10 ? "Landscaping" : "HVAC",
          tools: month === 10 ? ["Garden tools", "Plants", "Fertilizer"] : ["Basic tools"],
          cost: "$20-50"
        }
      );
    }

    // UNIVERSAL MONTHLY TASKS (appear every month)
    const universalTasks: MaintenanceTask[] = [
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
      }
    ];

    // SEASONAL SAFETY AND MAINTENANCE TASKS (March and October only)
    const seasonalTasks: MaintenanceTask[] = [];
    if (month === 3 || month === 10) {
      seasonalTasks.push(
        {
          id: "seasonal-smoke-detectors",
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
          id: "seasonal-water-check",
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
    }

    // GUTTER MAINTENANCE TASKS (April, November and December)
    const gutterTasks: MaintenanceTask[] = [];
    if (month === 4 || month === 11 || month === 12) {
      gutterTasks.push({
        id: month === 4 ? "spring-gutter-maintenance" : "winter-gutter-maintenance",
        title: "Gutter and Drainage Maintenance",
        description: month === 4 ? "Spring gutter cleaning after winter, remove debris and check for damage from ice and snow." :
                    month === 11 ? "Final gutter cleaning before winter, check for ice dam prevention." :
                    "Clean gutters and downspouts, check for proper drainage before heavy winter weather.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "mountain-west"],
        priority: "high",
        estimatedTime: "2-4 hours",
        difficulty: "moderate",
        category: "Gutters",
        tools: ["Ladder", "Gutter scoop", "Garden hose"],
        cost: "$0-50"
      });
    }

    // SYSTEM-SPECIFIC MONTHLY TASKS
    const systemTasks: MaintenanceTask[] = [
      // Gas furnace task
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
      // Heat pump task
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
      // Generator task
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
    ];

    // Pool and spa tasks (summer only)
    const poolTasks: MaintenanceTask[] = [];
    if (isSummer) {
      poolTasks.push(
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
    const solarTasks: MaintenanceTask[] = [];
    if (isSummer || month === 3 || month === 9) {
      solarTasks.push({
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

    // Combine all task arrays
    return [...climateTasks, ...universalTasks, ...seasonalTasks, ...gutterTasks, ...systemTasks, ...poolTasks, ...solarTasks];
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
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Monthly Maintenance Schedule
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Keep your home in perfect condition with personalized maintenance recommendations
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="text-sm text-muted-foreground">
              <Calendar className="inline w-4 h-4 mr-1" />
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
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Month
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
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
                Climate Zone
              </label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger>
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
              <Button variant="outline" className="w-full justify-between">
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
                      {systems.map((system) => (
                        <div key={system.value} className="flex items-center space-x-2">
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
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTasks.map((task) => {
            const completed = isTaskCompleted(task.id);
            return (
              <Card 
                key={task.id} 
                className={`hover:shadow-md transition-all ${
                  completed ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : ''
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
        title: "Clean Garbage Disposal",
        description: "Use baking soda and vinegar or grind citrus peels to eliminate odors and clean blades.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "medium",
        estimatedTime: "10 minutes",
        difficulty: "easy",
        category: "Appliances",
        tools: ["Baking soda", "Vinegar", "Citrus peels"],
        cost: "$0-5"
      },
      {
        id: "monthly-4",
        title: "Clean Dryer Vent",
        description: "Remove lint buildup from dryer vent to prevent fire hazard and improve efficiency.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "high",
        estimatedTime: "30 minutes",
        difficulty: "easy",
        category: "Safety",
        tools: ["Vacuum", "Dryer brush"],
        cost: "$0-20"
      },
      {
        id: "monthly-5",
        title: "Run Water in Unused Areas",
        description: "Flush toilets and run faucets in guest bathrooms or unused areas to prevent sewer gas buildup.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "low",
        estimatedTime: "5 minutes",
        difficulty: "easy",
        category: "Plumbing",
        tools: null,
        cost: "$0"
      },

      // SYSTEM-SPECIFIC MONTHLY TASKS
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
        id: "monthly-oil-furnace",
        title: "Monitor Oil Furnace and Check Oil Level",
        description: "Check oil level gauge and listen for unusual sounds during operation.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
        priority: "medium",
        estimatedTime: "10 minutes",
        difficulty: "easy",
        category: "HVAC",
        tools: null,
        cost: "$0",
        systemRequirements: ["oil-furnace"]
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
        id: "monthly-water-softener",
        title: "Check Water Softener Salt Level",
        description: "Replenish salt and check for salt bridges that can prevent proper operation.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "medium",
        estimatedTime: "10 minutes",
        difficulty: "easy",
        category: "Plumbing",
        tools: ["Water softener salt"],
        cost: "$20-40",
        systemRequirements: ["water-softener"]
      },
      {
        id: "monthly-well-water",
        title: "Test Well Water Quality",
        description: "Check water pressure and test for clarity, taste, or odor changes that might indicate issues.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "medium",
        estimatedTime: "15 minutes",
        difficulty: "easy",
        category: "Plumbing",
        tools: ["Water test kit"],
        cost: "$15-30",
        systemRequirements: ["well-water"]
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
      },
      {
        id: "monthly-security-system",
        title: "Test Security System",
        description: "Test all sensors, cameras, and alarms. Replace backup batteries as needed.",
        month: month,
        climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
        priority: "medium",
        estimatedTime: "20 minutes",
        difficulty: "easy",
        category: "Security",
        tools: ["Batteries"],
        cost: "$10-25",
        systemRequirements: ["security-system"]
      },

      // SEASONAL SYSTEM-SPECIFIC TASKS
      ...(month >= 6 && month <= 8 ? [
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
        } as MaintenanceTask,
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
        } as MaintenanceTask,
        {
          id: "summer-solar-panels",
          title: "Clean Solar Panels",
          description: "Remove dust, pollen, and debris from solar panels to maintain efficiency.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "2-3 hours",
          difficulty: "moderate",
          category: "Solar",
          tools: ["Garden hose", "Soft brush", "Squeegee"],
          cost: "$0-20",
          systemRequirements: ["solar-panels"]
        } as MaintenanceTask,
        {
          id: "summer-sprinkler",
          title: "Inspect and Adjust Sprinkler System",
          description: "Check all sprinkler heads, adjust spray patterns, and test automatic timers.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "1-2 hours",
          difficulty: "moderate",
          category: "Irrigation",
          tools: ["Screwdriver", "Sprinkler head tool"],
          cost: "$10-30",
          systemRequirements: ["sprinkler-system"]
        } as MaintenanceTask
      ] : []),

      ...(month >= 10 && month <= 11 ? [
        {
          id: "fall-sprinkler-winterize",
          title: "Winterize Sprinkler System",
          description: "Drain water from sprinkler lines and shut off water supply to prevent freeze damage.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "2-3 hours",
          difficulty: "moderate",
          category: "Irrigation",
          tools: ["Air compressor", "Wrench"],
          cost: "$0-100",
          systemRequirements: ["sprinkler-system"]
        } as MaintenanceTask,
        {
          id: "fall-pool-winterize",
          title: "Winterize Swimming Pool",
          description: "Balance chemicals, lower water level, and cover pool for winter season.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "3-4 hours",
          difficulty: "difficult",
          category: "Pool",
          tools: ["Pool cover", "Winter chemicals", "Pool vacuum"],
          cost: "$50-100",
          systemRequirements: ["pool"]
        } as MaintenanceTask
      ] : []),

      ...(month === 3 || month === 9 ? [
        {
          id: "seasonal-solar-inspection",
          title: "Solar Panel System Inspection",
          description: "Check mounting hardware, wiring connections, and monitor system performance data.",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "1 hour",
          difficulty: "moderate",
          category: "Solar",
          tools: ["Multimeter", "Binoculars"],
          cost: "$0",
          systemRequirements: ["solar-panels"]
        } as MaintenanceTask,
        {
          id: "seasonal-septic-check",
          title: "Septic System Inspection",
          description: "Check for proper drainage, unusual odors, and schedule pumping if needed (every 3-5 years).",
          month: month,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "30 minutes",
          difficulty: "easy",
          category: "Plumbing",
          tools: null,
          cost: "$0",
          systemRequirements: ["septic"]
        } as MaintenanceTask
      ] : []),

      // WINTER TASKS (December - February)
      ...(month === 12 ? [
        {
          id: "dec-1",
          title: "Insulate Outdoor Water Faucets",
          description: "Install faucet covers and insulate exposed pipes to prevent freezing damage.",
          month: 12,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "1 hour",
          difficulty: "easy",
          category: "Winterization",
          tools: ["Faucet covers", "Pipe insulation", "Duct tape"],
          cost: "$15-40"
        } as MaintenanceTask,
        {
          id: "dec-2",
          title: "Cover Outdoor AC Units",
          description: "Protect central air units with weatherproof covers or store window units indoors.",
          month: 12,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "medium",
          estimatedTime: "30 minutes",
          difficulty: "easy",
          category: "HVAC",
          tools: ["AC cover", "Bungee cords"],
          cost: "$20-50"
        } as MaintenanceTask,
        {
          id: "dec-3",
          title: "Sweep Chimney and Prepare Fireplace",
          description: "Have chimney professionally cleaned and inspected. Check damper operation and screen condition.",
          month: 12,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "Professional service",
          difficulty: "difficult",
          category: "Safety",
          tools: null,
          cost: "$150-300"
        } as MaintenanceTask
      ] : []),

      ...(month === 1 ? [
        {
          id: "jan-1",
          title: "Monitor for Ice Dams",
          description: "Check roof edges for ice buildup that can cause water damage. Contact contractor if found.",
          month: 1,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "15 minutes",
          difficulty: "easy",
          category: "Exterior",
          tools: ["Binoculars (optional)"],
          cost: "$0"
        } as MaintenanceTask,
        {
          id: "jan-2",
          title: "Service Heating System",
          description: "Have boiler or furnace professionally serviced before peak cold season arrives.",
          month: 1,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "Professional service",
          difficulty: "difficult",
          category: "HVAC",
          tools: null,
          cost: "$100-200"
        } as MaintenanceTask,
        {
          id: "jan-3",
          title: "Check Windows for Condensation",
          description: "Look for excessive moisture on windows and improve ventilation as needed to prevent mold.",
          month: 1,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "medium",
          estimatedTime: "20 minutes",
          difficulty: "easy",
          category: "Energy Efficiency",
          tools: ["Towels", "Fan"],
          cost: "$0-30"
        } as MaintenanceTask
      ] : []),

      ...(month === 2 ? [
        {
          id: "feb-1",
          title: "Clean Windows Inside and Out",
          description: "Wash windows and check wooden frames for rot or damage from winter weather.",
          month: 2,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "low",
          estimatedTime: "2-3 hours",
          difficulty: "moderate",
          category: "Exterior",
          tools: ["Window cleaner", "Squeegee", "Microfiber cloths"],
          cost: "$10-25"
        } as MaintenanceTask,
        {
          id: "feb-2",
          title: "Deep Clean Indoor Spaces",
          description: "Focus on areas neglected during holidays - baseboards, light fixtures, and behind furniture.",
          month: 2,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "low",
          estimatedTime: "4-6 hours",
          difficulty: "moderate",
          category: "Interior",
          tools: ["Vacuum", "Microfiber cloths", "All-purpose cleaner"],
          cost: "$15-30"
        } as MaintenanceTask
      ] : []),

      // SPRING TASKS (March - May)
      ...(month === 3 ? [
        {
          id: "mar-1",
          title: "HVAC System Spring Inspection",
          description: "Schedule professional tune-up before cooling season. Clean outdoor unit and check refrigerant levels.",
          month: 3,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "high",
          estimatedTime: "Professional service",
          difficulty: "difficult",
          category: "HVAC",
          tools: null,
          cost: "$100-200"
        } as MaintenanceTask,
        {
          id: "mar-2",
          title: "Check Gutters for Winter Damage",
          description: "Clear debris and inspect for damage from ice, snow, and winter storms.",
          month: 3,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "2-3 hours",
          difficulty: "moderate",
          category: "Exterior",
          tools: ["Ladder", "Garden hose", "Gloves", "Trowel"],
          cost: "$0-50"
        } as MaintenanceTask,
        {
          id: "mar-3",
          title: "Inspect Sidewalks and Driveway",
          description: "Look for freeze-damage cracks and plan repairs to prevent water infiltration.",
          month: 3,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "medium",
          estimatedTime: "30 minutes",
          difficulty: "easy",
          category: "Exterior",
          tools: null,
          cost: "$0"
        } as MaintenanceTask
      ] : []),

      ...(month === 4 ? [
        {
          id: "apr-1",
          title: "Remove Debris from AC Units",
          description: "Clear leaves, twigs, and debris from around outdoor AC units for optimal airflow.",
          month: 4,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "30 minutes",
          difficulty: "easy",
          category: "HVAC",
          tools: ["Garden hose", "Soft brush"],
          cost: "$0"
        } as MaintenanceTask,
        {
          id: "apr-2",
          title: "Inspect Roof and Chimney",
          description: "Look for loose or missing shingles, damaged flashing, and chimney cap issues from winter.",
          month: 4,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "high",
          estimatedTime: "45 minutes",
          difficulty: "moderate",
          category: "Exterior",
          tools: ["Binoculars", "Ladder (if needed)"],
          cost: "$0"
        } as MaintenanceTask,
        {
          id: "apr-3",
          title: "Service Lawn Equipment",
          description: "Tune-up mower, sharpen blades, change oil, and check spark plugs for the growing season.",
          month: 4,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "2 hours",
          difficulty: "moderate",
          category: "Yard",
          tools: ["Oil", "Spark plug", "Air filter", "Blade sharpener"],
          cost: "$30-60"
        } as MaintenanceTask
      ] : []),

      ...(month === 5 ? [
        {
          id: "may-1",
          title: "Deep Clean and Inspect Gutters",
          description: "Thoroughly clean gutters and downspouts. Check for proper drainage and secure mounting.",
          month: 5,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "high",
          estimatedTime: "3-4 hours",
          difficulty: "moderate",
          category: "Exterior",
          tools: ["Ladder", "Garden hose", "Gloves", "Gutter scoop"],
          cost: "$0-30"
        } as MaintenanceTask,
        {
          id: "may-2",
          title: "Power Wash Exterior Surfaces",
          description: "Clean siding, decks, patios, and outdoor furniture to remove winter grime and mildew.",
          month: 5,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "4-6 hours",
          difficulty: "moderate",
          category: "Exterior",
          tools: ["Pressure washer", "Garden hose", "Mild detergent"],
          cost: "$20-50"
        } as MaintenanceTask,
        {
          id: "may-3",
          title: "Inspect and Repair Concrete",
          description: "Fill driveway and walkway cracks to prevent water damage and further deterioration.",
          month: 5,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "2-3 hours",
          difficulty: "moderate",
          category: "Exterior",
          tools: ["Concrete crack filler", "Trowel", "Wire brush"],
          cost: "$15-40"
        } as MaintenanceTask
      ] : []),

      // SUMMER TASKS (June - August)
      ...(month === 6 ? [
        {
          id: "jun-1",
          title: "Deep Clean AC Unit",
          description: "Professional cleaning of coils, fins, and internal components before peak summer usage.",
          month: 6,
          climateZones: ["northeast", "southeast", "midwest", "southwest", "california", "great-plains"],
          priority: "high",
          estimatedTime: "Professional service",
          difficulty: "difficult",
          category: "HVAC",
          tools: null,
          cost: "$100-200"
        } as MaintenanceTask,
        {
          id: "jun-2",
          title: "Clean Refrigerator Coils",
          description: "Vacuum dust and debris from coils behind or beneath refrigerator to improve efficiency.",
          month: 6,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "30 minutes",
          difficulty: "easy",
          category: "Appliances",
          tools: ["Vacuum", "Coil brush"],
          cost: "$0"
        } as MaintenanceTask,
        {
          id: "jun-3",
          title: "Reverse Ceiling Fans",
          description: "Set ceiling fans to run counter-clockwise to push cool air down during summer months.",
          month: 6,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "low",
          estimatedTime: "15 minutes",
          difficulty: "easy",
          category: "Energy Efficiency",
          tools: null,
          cost: "$0"
        } as MaintenanceTask
      ] : []),

      ...(month === 7 ? [
        {
          id: "jul-1",
          title: "Inspect Foundation Drainage",
          description: "Check for water pooling around foundation and ensure proper grading away from house.",
          month: 7,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "high",
          estimatedTime: "45 minutes",
          difficulty: "easy",
          category: "Exterior",
          tools: null,
          cost: "$0"
        } as MaintenanceTask,
        {
          id: "jul-2",
          title: "Check Basement/Crawl Space for Moisture",
          description: "Look for signs of water infiltration, mold, or excessive humidity that could cause damage.",
          month: 7,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "medium",
          estimatedTime: "30 minutes",
          difficulty: "easy",
          category: "Interior",
          tools: ["Flashlight", "Humidity meter"],
          cost: "$0-20"
        } as MaintenanceTask,
        {
          id: "jul-3",
          title: "Inspect for Insect Activity",
          description: "Look for signs of termites, carpenter ants, or other destructive insects around foundation and wood structures.",
          month: 7,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "45 minutes",
          difficulty: "easy",
          category: "Pest Control",
          tools: ["Flashlight"],
          cost: "$0"
        } as MaintenanceTask
      ] : []),

      ...(month === 8 ? [
        {
          id: "aug-1",
          title: "Organize and Clean Garage",
          description: "Deep clean garage, organize tools and equipment, and check for pest activity or water damage.",
          month: 8,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "low",
          estimatedTime: "4-6 hours",
          difficulty: "moderate",
          category: "Organization",
          tools: ["Broom", "Storage containers", "All-purpose cleaner"],
          cost: "$20-50"
        } as MaintenanceTask,
        {
          id: "aug-2",
          title: "Clean Kitchen Cabinets and Hardware",
          description: "Deep clean cabinet surfaces, hardware, and interior shelves. Check for loose hinges or handles.",
          month: 8,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "low",
          estimatedTime: "3-4 hours",
          difficulty: "easy",
          category: "Interior",
          tools: ["Wood cleaner", "Microfiber cloths", "Screwdriver"],
          cost: "$10-20"
        } as MaintenanceTask,
        {
          id: "aug-3",
          title: "Rotate Mattresses",
          description: "Flip and rotate mattresses to ensure even wear and extend their lifespan.",
          month: 8,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "low",
          estimatedTime: "30 minutes",
          difficulty: "easy",
          category: "Interior",
          tools: null,
          cost: "$0"
        } as MaintenanceTask
      ] : []),

      // FALL TASKS (September - November)
      ...(month === 9 ? [
        {
          id: "sep-1",
          title: "Schedule Heating System Maintenance",
          description: "Have furnace or boiler professionally serviced before cold weather arrives.",
          month: 9,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "Professional service",
          difficulty: "difficult",
          category: "HVAC",
          tools: null,
          cost: "$100-200"
        } as MaintenanceTask,
        {
          id: "sep-2",
          title: "Have Chimney Serviced",
          description: "Professional chimney cleaning and inspection to prepare for heating season use.",
          month: 9,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "Professional service",
          difficulty: "difficult",
          category: "Safety",
          tools: null,
          cost: "$150-300"
        } as MaintenanceTask,
        {
          id: "sep-3",
          title: "Whole-House Deep Clean",
          description: "Comprehensive deep cleaning including baseboards, light fixtures, ceiling fans, and forgotten corners.",
          month: 9,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "8-12 hours",
          difficulty: "moderate",
          category: "Interior",
          tools: ["Vacuum", "Microfiber cloths", "All-purpose cleaner", "Ladder"],
          cost: "$30-60"
        } as MaintenanceTask
      ] : []),

      ...(month === 10 ? [
        {
          id: "oct-1",
          title: "Final Gutter Cleaning",
          description: "Remove all leaves and debris from gutters and downspouts before winter weather arrives.",
          month: 10,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "3-4 hours",
          difficulty: "moderate",
          category: "Exterior",
          tools: ["Ladder", "Garden hose", "Gloves", "Gutter scoop"],
          cost: "$0-30"
        } as MaintenanceTask,
        {
          id: "oct-2",
          title: "Trim Trees and Shrubs",
          description: "Cut back branches touching or near the house to prevent damage during winter storms.",
          month: 10,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "3-5 hours",
          difficulty: "moderate",
          category: "Yard",
          tools: ["Pruning shears", "Loppers", "Ladder", "Safety glasses"],
          cost: "$0-40"
        } as MaintenanceTask,
        {
          id: "oct-3",
          title: "Inspect and Secure Deck",
          description: "Check for loose nails, screws, or boards. Hammer down or replace as needed for winter safety.",
          month: 10,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "2-3 hours",
          difficulty: "moderate",
          category: "Exterior",
          tools: ["Hammer", "Screwdriver", "Replacement screws/nails"],
          cost: "$10-30"
        } as MaintenanceTask
      ] : []),

      ...(month === 11 ? [
        {
          id: "nov-1",
          title: "Drain Hot Water Heater Sediment",
          description: "Flush sediment from water heater tank to improve efficiency and extend unit life.",
          month: 11,
          climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
          priority: "medium",
          estimatedTime: "1 hour",
          difficulty: "moderate",
          category: "Plumbing",
          tools: ["Garden hose", "Bucket"],
          cost: "$0"
        } as MaintenanceTask,
        {
          id: "nov-2",
          title: "Shut Off Outdoor Water Supply",
          description: "Turn off water to outdoor faucets and drain/store garden hoses to prevent freeze damage.",
          month: 11,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "high",
          estimatedTime: "45 minutes",
          difficulty: "easy",
          category: "Winterization",
          tools: ["Wrench"],
          cost: "$0"
        } as MaintenanceTask,
        {
          id: "nov-3",
          title: "Install Storm Windows",
          description: "Put up storm windows if applicable, or check existing windows for air leaks and draft issues.",
          month: 11,
          climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
          priority: "medium",
          estimatedTime: "3-4 hours",
          difficulty: "moderate",
          category: "Energy Efficiency",
          tools: ["Screwdriver", "Weather stripping", "Caulk gun"],
          cost: "$20-80"
        } as MaintenanceTask
      ] : [])
    ];

    return allTasks.filter(task => task.month === month);
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

  const completedCount = filteredTasks.filter(task => isTaskCompleted(task.id)).length;
  const totalTasks = filteredTasks.length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-50 text-green-700';
      case 'moderate': return 'bg-amber-50 text-amber-700';
      case 'difficult': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Monthly Maintenance Schedule
              </h1>
              <p className="text-muted-foreground text-lg">
                Stay on top of home maintenance with personalized recommendations based on your location and the season.
              </p>
            </div>
            {totalTasks > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {completedCount}/{totalTasks}
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Tasks Completed
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetMonthTasks}
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Month
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
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
                Climate Zone
              </label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger>
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
              <Button variant="outline" className="w-full justify-between">
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
                      {systems.map((system) => (
                        <div key={system.value} className="flex items-center space-x-2">
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
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTasks.map((task) => {
            const completed = isTaskCompleted(task.id);
            return (
              <Card 
                key={task.id} 
                className={`hover:shadow-md transition-all ${
                  completed ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : ''
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
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No tasks for this month and location
            </h3>
            <p className="text-muted-foreground">
              Try selecting a different month or climate zone to see recommended maintenance tasks.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}