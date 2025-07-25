import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [, navigate] = useLocation();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (location) params.set('location', location);
    navigate(`/contractors?${params.toString()}`);
  };

  return (
    <section className="bg-gradient-to-br from-accent to-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Your <span className="text-primary">Home Base</span> for Every Project
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Connect with skilled contractors specializing in gutters, drywall, custom work, 
            and more. Plus find quality DIY products and seasonal maintenance guidance.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What do you need help with?
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Gutter cleaning, drywall repair, custom cabinetry..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="City, State or ZIP code"
                    className="pl-10"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleSearch}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center self-end"
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
