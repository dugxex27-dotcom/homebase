import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Wrench, DollarSign, MapPin } from "lucide-react";

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

export default function Maintenance() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedZone, setSelectedZone] = useState<string>("pacific-northwest");

  // Mock data for maintenance tasks - in a real app this would come from an API
  const maintenanceTasks: MaintenanceTask[] = [
    {
      id: "1",
      title: "Clean Gutters and Downspouts",
      description: "Remove leaves, debris, and check for proper water flow. Inspect for damage or loose connections.",
      month: selectedMonth,
      climateZones: ["pacific-northwest", "northeast", "midwest"],
      priority: "high",
      estimatedTime: "2-3 hours",
      difficulty: "moderate",
      category: "Exterior",
      tools: ["Ladder", "Garden hose", "Gloves", "Trowel"],
      cost: "$0-50"
    },
    {
      id: "2", 
      title: "Test Smoke and Carbon Monoxide Detectors",
      description: "Press test buttons, replace batteries if needed, and vacuum dust from detectors.",
      month: selectedMonth,
      climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
      priority: "high",
      estimatedTime: "30 minutes",
      difficulty: "easy",
      category: "Safety",
      tools: ["9V batteries", "Vacuum"],
      cost: "$10-25"
    },
    {
      id: "3",
      title: "Inspect and Clean Dryer Vents",
      description: "Remove lint buildup from dryer vent and ductwork to prevent fire hazards and improve efficiency.",
      month: selectedMonth,
      climateZones: ["pacific-northwest", "northeast", "southeast", "midwest", "southwest", "mountain-west", "california", "great-plains"],
      priority: "medium",
      estimatedTime: "1-2 hours",
      difficulty: "moderate",
      category: "Appliances",
      tools: ["Dryer vent brush", "Vacuum", "Screwdriver"],
      cost: "$15-40"
    },
    {
      id: "4",
      title: "Check Weather Stripping",
      description: "Inspect doors and windows for worn weather stripping. Replace if cracked or compressed.",
      month: selectedMonth,
      climateZones: ["pacific-northwest", "northeast", "midwest", "mountain-west"],
      priority: "medium",
      estimatedTime: "1-2 hours",
      difficulty: "easy",
      category: "Energy Efficiency",
      tools: ["Weather stripping", "Utility knife", "Measuring tape"],
      cost: "$20-60"
    }
  ];

  const filteredTasks = maintenanceTasks.filter(task => 
    task.climateZones.includes(selectedZone)
  );

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
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Monthly Maintenance Schedule
          </h1>
          <p className="text-muted-foreground text-lg">
            Stay on top of home maintenance with personalized recommendations based on your location and the season.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
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

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {task.title}
                  </CardTitle>
                  <Badge className={`${getPriorityColor(task.priority)} border`}>
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
          ))}
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