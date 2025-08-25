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
  const [hasEmergencyServices, setHasEmergencyServices] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | undefined>();

  const services = [
    "Assembly Services",
    "Basement Finishing",
    "Bathroom Remodeling",
    "Carpentry",
    "Concrete Work",
    "Deck Building",
    "Drywall",
    "Electrical",
    "Fence Installation",
    "Flooring",
    "General Contracting",
    "Gutter Cleaning",
    "Gutters",
    "Handyman Services",
    "HVAC",
    "Kitchen Remodeling",
    "Landscaping",
    "Painting",
    "Plumbing",
    "Pressure Washing",
    "Roofing",
    "Siding",
    "Tile Work",
    "Windows & Doors"
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
      hasEmergencyServices: hasEmergencyServices || undefined,
      maxDistance,
    });
  };

  return (
    <aside className="lg:w-80">
      <div className="bg-card rounded-xl shadow-sm border p-6 sticky top-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Find Your Perfect Contractor</h3>
        
        <div className="space-y-6">
          {/* Distance Filter */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">Distance from you</Label>
            <Select onValueChange={(value) => setMaxDistance(parseFloat(value))}>
              <SelectTrigger className="border-muted">
                <SelectValue placeholder="Any distance" />
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

          {/* Emergency Services Filter */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Services</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emergency-services"
                  checked={hasEmergencyServices}
                  onCheckedChange={(checked) => setHasEmergencyServices(checked === true)}
                />
                <Label htmlFor="emergency-services" className="text-sm text-gray-700">
                  Emergency services available
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
