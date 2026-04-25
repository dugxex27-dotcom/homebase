import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";
import { getDistanceOptions, getDistanceUnit, extractCountryFromAddress, convertDistanceForStorage } from '@shared/distance-utils';

interface FilterSidebarProps {
  onFiltersChange: (filters: any) => void;
  userCountry?: string; // Optional prop to pass user's country for distance units
}

export default function FilterSidebar({ onFiltersChange, userCountry = 'US' }: FilterSidebarProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | undefined>();
  const [hasEmergencyServices, setHasEmergencyServices] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | undefined>();
  const [serviceRadius, setServiceRadius] = useState<number | undefined>();

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

  const handleServiceChange = (service: string, checked: boolean) => {
    if (checked) {
      setSelectedServices([...selectedServices, service]);
    } else {
      setSelectedServices(selectedServices.filter(s => s !== service));
    }
  };

  const applyFilters = () => {
    // Convert display distance to storage format if needed
    const storageDistance = maxDistance ? convertDistanceForStorage(maxDistance, userCountry) : undefined;
    
    onFiltersChange({
      services: selectedServices.length > 0 ? selectedServices : undefined,
      minRating,
      hasEmergencyServices: hasEmergencyServices || undefined,
      maxDistance: storageDistance,
    });
  };

  return (
    <aside className="lg:w-80">
      <div className="bg-card rounded-xl shadow-sm border p-6 sticky top-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Find Your Perfect Contractor</h3>
        
        <div className="space-y-6">
          {/* Distance Filter */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">Distance from you ({getDistanceUnit(userCountry)})</Label>
            <Select onValueChange={(value) => setMaxDistance(parseFloat(value))}>
              <SelectTrigger className="border-muted" style={{ color: '#ffffff' }}>
                <SelectValue placeholder="Any distance" />
              </SelectTrigger>
              <SelectContent>
                {getDistanceOptions(userCountry).map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    Within {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-gray-500 mt-1">
              🌍 {userCountry === 'US' ? 'Using miles for US locations' : 'Using kilometers for international locations'}
            </div>
          </div>



          {/* Services Filter */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Services</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
              {services.map((service) => (
                <div key={service} className="flex items-center space-x-2 p-1">
                  <Checkbox
                    id={service}
                    checked={selectedServices.includes(service)}
                    onCheckedChange={(checked) => handleServiceChange(service, checked as boolean)}
                  />
                  <Label htmlFor={service} className="text-sm text-gray-700 leading-tight">
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
          className="w-full mt-6 text-white hover:opacity-90"
          style={{ backgroundColor: '#3c258e' }}
        >
          Apply Filters
        </Button>
      </div>
    </aside>
  );
}
