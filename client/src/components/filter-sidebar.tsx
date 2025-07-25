import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";

interface FilterSidebarProps {
  onFiltersChange: (filters: any) => void;
}

export default function FilterSidebar({ onFiltersChange }: FilterSidebarProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | undefined>();
  const [availableThisWeek, setAvailableThisWeek] = useState(false);
  const [hasEmergencyServices, setHasEmergencyServices] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | undefined>();

  const services = [
    "Kitchen Remodeling",
    "Bathroom Renovation", 
    "Plumbing",
    "Electrical",
    "Roofing",
    "HVAC",
    "Flooring",
    "Painting"
  ];

  const handleServiceChange = (service: string, checked: boolean) => {
    if (checked) {
      setSelectedServices([...selectedServices, service]);
    } else {
      setSelectedServices(selectedServices.filter(s => s !== service));
    }
  };

  const applyFilters = () => {
    onFiltersChange({
      services: selectedServices.length > 0 ? selectedServices : undefined,
      minRating,
      availableThisWeek: availableThisWeek || undefined,
      hasEmergencyServices: hasEmergencyServices || undefined,
      maxDistance,
    });
  };

  return (
    <aside className="lg:w-80">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Filters</h3>
        
        <div className="space-y-6">
          {/* Distance Filter */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Distance</Label>
            <Select onValueChange={(value) => setMaxDistance(parseFloat(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select distance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Within 5 miles</SelectItem>
                <SelectItem value="10">Within 10 miles</SelectItem>
                <SelectItem value="25">Within 25 miles</SelectItem>
                <SelectItem value="50">Within 50 miles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Services Filter */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Services</Label>
            <div className="space-y-2">
              {services.map((service) => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox
                    id={service}
                    checked={selectedServices.includes(service)}
                    onCheckedChange={(checked) => handleServiceChange(service, checked as boolean)}
                  />
                  <Label htmlFor={service} className="text-sm text-gray-700">
                    {service}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Minimum Rating</Label>
            <RadioGroup onValueChange={(value) => setMinRating(parseFloat(value))}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="5" id="rating-5" />
                <Label htmlFor="rating-5" className="flex items-center">
                  <div className="flex text-yellow-400 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm text-gray-700">5 stars</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4" id="rating-4" />
                <Label htmlFor="rating-4" className="flex items-center">
                  <div className="flex text-yellow-400 mr-2">
                    {[...Array(4)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                    <Star className="h-4 w-4 text-gray-300" />
                  </div>
                  <span className="text-sm text-gray-700">4+ stars</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Availability Filter */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Availability</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="available-week"
                  checked={availableThisWeek}
                  onCheckedChange={(checked) => setAvailableThisWeek(checked === true)}
                />
                <Label htmlFor="available-week" className="text-sm text-gray-700">
                  Available this week
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emergency-services"
                  checked={hasEmergencyServices}
                  onCheckedChange={(checked) => setHasEmergencyServices(checked === true)}
                />
                <Label htmlFor="emergency-services" className="text-sm text-gray-700">
                  Emergency services
                </Label>
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={applyFilters}
          className="w-full mt-6 bg-primary text-white hover:bg-blue-700"
        >
          Apply Filters
        </Button>
      </div>
    </aside>
  );
}
