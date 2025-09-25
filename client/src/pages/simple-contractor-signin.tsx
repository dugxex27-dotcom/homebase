import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Building, Mail, User, MapPin } from "lucide-react";
import Logo from "@/components/logo";

export default function SimpleContractorSignIn() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    company: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Address autocomplete state for company name
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [isLoadingCompanySuggestions, setIsLoadingCompanySuggestions] = useState(false);
  const [companyDebounceTimer, setCompanyDebounceTimer] = useState<NodeJS.Timeout>();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Handle company name with address suggestions
    if (name === 'company') {
      handleCompanyChange(value);
    }
  };

  // Company/business address geolocation functions
  const getCompanyAddressSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setCompanySuggestions([]);
      setShowCompanySuggestions(false);
      return;
    }

    setIsLoadingCompanySuggestions(true);
    try {
      // Use LocationIQ API for company address suggestions with focus on UK, Canada, Australia, US
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
          setCompanySuggestions(data);
          setShowCompanySuggestions(true);
        }
      } else {
        const data = await response.json();
        setCompanySuggestions(data);
        setShowCompanySuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching company address suggestions:', error);
      setCompanySuggestions([]);
    } finally {
      setIsLoadingCompanySuggestions(false);
    }
  };

  const handleCompanyChange = (company: string) => {
    // Clear existing timer
    if (companyDebounceTimer) {
      clearTimeout(companyDebounceTimer);
    }
    
    // Set new timer for suggestions
    const suggestionTimer = setTimeout(() => {
      getCompanyAddressSuggestions(company);
    }, 300);
    setCompanyDebounceTimer(suggestionTimer);
  };

  const handleCompanySuggestionSelect = (suggestion: any) => {
    const companyName = suggestion.display_name;
    setFormData(prev => ({ ...prev, company: companyName }));
    setShowCompanySuggestions(false);
    setCompanySuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // For now, create a simple contractor session without OAuth
      const response = await fetch('/api/auth/contractor-demo-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          role: 'contractor'
        }),
      });

      if (response.ok) {
        // Force page reload to update authentication state
        window.location.reload();
      } else {
        throw new Error('Failed to sign in');
      }
    } catch (error) {
      console.error('Error during sign-in:', error);
      alert('Sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="h-12 w-auto text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contractor Portal</h1>
          <p className="text-gray-600 text-lg">
            Quick access for contractors (Demo Mode)
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-gray-900 flex items-center justify-center gap-2">
              <Wrench className="w-6 h-6 text-amber-600" />
              Contractor Demo Sign In
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Enter your details to access the contractor dashboard
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="contractor@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="John Smith"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company Name (address autocomplete supported)</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="Smith Construction LLC or business address"
                    required
                  />
                  {isLoadingCompanySuggestions && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  {/* Company address suggestions dropdown */}
                  {showCompanySuggestions && companySuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
                      {companySuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-amber-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleCompanySuggestionSelect(suggestion)}
                          data-testid={`company-suggestion-${index}`}
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
                <div className="text-xs text-gray-500">
                  🌍 Type company name or business address for international suggestions
                </div>
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-lg font-medium mt-6"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <>
                    <Wrench className="w-5 h-5 mr-2" />
                    Sign In to Dashboard
                  </>
                )}
              </Button>
            </form>

            <div className="text-center mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">
                Demo Mode: This creates a temporary contractor session for testing
              </p>
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900 text-sm"
                onClick={() => window.location.href = '/signin'}
              >
                Back to main sign-in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}