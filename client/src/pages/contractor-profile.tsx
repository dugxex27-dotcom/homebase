import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";

import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { getServiceRadiusOptions, getDistanceUnit, extractCountryFromAddress, convertDistanceForDisplay, convertDistanceForStorage } from '@shared/distance-utils';
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Shield, 
  Wrench, 
  Globe, 
  Camera,
  Save,
  Plus,
  X,
  Share2,
  Copy,
  MessageSquare,
  Gift,
  DollarSign
} from "lucide-react";

const AVAILABLE_SERVICES = [
  "Appliance Installation",
  "Appliance Repair & Maintenance",
  "Basement Remodeling",
  "Bathroom Remodeling",
  "Cabinet Installation",
  "Carpet Installation",
  "Closet Organization",
  "Concrete & Masonry",
  "Custom Carpentry",
  "Custom Home Building",
  "Deck Construction",
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
  "Windows & Door Installation"
];

export default function ContractorProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    location: '',
    serviceRadius: 25,
    services: [] as string[],
    hasEmergencyServices: false,
    website: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    googleBusinessUrl: '',
    bio: '',
    yearsExperience: '',
    profileImage: '',
    businessLogo: '',
    projectPhotos: [] as string[],
    licenseNumber: '',
    licenseMunicipality: '',
    isLicensed: true,
    rating: '0',
    reviewCount: 0,
    experience: 0
  });

  const [customService, setCustomService] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  
  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [addressDebounceTimer, setAddressDebounceTimer] = useState<NodeJS.Timeout>();
  
  // Country selection and detection for distance units
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const [detectedCountry, setDetectedCountry] = useState<string>('US');
  const [licenses, setLicenses] = useState([{
    id: '',
    licenseNumber: '',
    municipality: '',
    state: '',
    expiryDate: '',
    licenseType: 'General Contractor'
  }]);

  // Load existing profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/contractor/profile'],
  });

  // Load existing licenses
  const { data: existingLicenses } = useQuery({
    queryKey: ['/api/contractor/licenses'],
  });

  // Update form data when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData(prev => ({ ...prev, ...profile }));
      if ((profile as any).businessLogo) {
        setLogoPreview((profile as any).businessLogo);
      }
      if ((profile as any).projectPhotos && (profile as any).projectPhotos.length > 0) {
        setPhotosPreviews((profile as any).projectPhotos);
      }
    }
  }, [profile]);

  // Update licenses when existing licenses load
  React.useEffect(() => {
    if (existingLicenses && Array.isArray(existingLicenses) && existingLicenses.length > 0) {
      setLicenses(existingLicenses);
    }
  }, [existingLicenses]);

  // Map selected country to country code
  const getCountryCode = (country: string) => {
    const codes: Record<string, string> = {
      'US': 'us',
      'GB': 'gb',
      'CA': 'ca',
      'AU': 'au'
    };
    return codes[country] || 'us';
  };

  // Business address geolocation functions
  const getBusinessAddressSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      // Use OpenStreetMap Nominatim for business address suggestions with selected country
      const countryCode = getCountryCode(selectedCountry);
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=${countryCode}`,
        {
          headers: {
            'User-Agent': 'HomeBase/1.0'
          }
        }
      );
      
      if (nominatimResponse.ok) {
        const data = await nominatimResponse.json();
        setAddressSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch (error) {
      console.error('Error fetching business address suggestions:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const geocodeBusinessAddress = async (address: string) => {
    try {
      // Use OpenStreetMap Nominatim for business address geocoding
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'HomeBase/1.0'
          }
        }
      );
      
      if (nominatimResponse.ok) {
        const data = await nominatimResponse.json();
        const result = data[0];

        if (result) {
          const addressDetails = result.address;
          
          // Auto-populate city, state, and postal code from geocoded address
          if (addressDetails) {
            const city = addressDetails.city || addressDetails.town || addressDetails.village || '';
            const state = addressDetails.state || addressDetails.province || '';
            const postalCode = addressDetails.postcode || '';
            
            // Detect country for distance units
            const countryCode = addressDetails.country_code?.toUpperCase() || extractCountryFromAddress(result.display_name);
            if (countryCode) {
              setDetectedCountry(countryCode);
            }
            
            setFormData(prev => ({
              ...prev,
              city: city,
              state: state,
              postalCode: postalCode,
              location: `${city}, ${state}`
            }));
            
            const distanceUnit = getDistanceUnit(countryCode);
            toast({
              title: "Address details populated",
              description: `Auto-filled city, state, and zip code from ${addressDetails.country}. Distance units: ${distanceUnit}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error geocoding business address:', error);
    }
  };

  const handleBusinessAddressChange = (address: string) => {
    setFormData(prev => ({ ...prev, address }));
    
    // Clear existing timer
    if (addressDebounceTimer) {
      clearTimeout(addressDebounceTimer);
    }
    
    // Set new timer for suggestions
    const suggestionTimer = setTimeout(() => {
      getBusinessAddressSuggestions(address);
    }, 300);
    setAddressDebounceTimer(suggestionTimer);
    
    // Set separate timer for geocoding to auto-fill other fields
    const geocodeTimer = setTimeout(() => {
      if (address.length > 10) {
        geocodeBusinessAddress(address);
      }
    }, 1000);
  };

  const handleBusinessAddressSuggestionSelect = (suggestion: any) => {
    // Extract clean street address from components instead of using verbose display_name
    const addr = suggestion.address;
    
    // Build a clean street address (house number + street name)
    const streetParts = [];
    if (addr?.house_number) streetParts.push(addr.house_number);
    if (addr?.road) streetParts.push(addr.road);
    else if (addr?.street) streetParts.push(addr.street);
    
    const streetAddress = streetParts.join(' ') || suggestion.display_name.split(',')[0];
    
    // Build full address with all location details
    const addressParts = [streetAddress];
    
    // Add locality (hamlet, village, town, or city)
    const hamlet = addr?.hamlet || '';
    const village = addr?.village || '';
    const town = addr?.town || '';
    const city = addr?.city || '';
    
    if (hamlet) addressParts.push(hamlet);
    else if (village) addressParts.push(village);
    else if (town) addressParts.push(town);
    else if (city) addressParts.push(city);
    
    // Add county
    const county = addr?.county || '';
    if (county) addressParts.push(county);
    
    // Add state/province
    const state = addr?.state || addr?.province || '';
    if (state) addressParts.push(state);
    
    // Add zipcode
    const zipcode = addr?.postcode || '';
    if (zipcode) addressParts.push(zipcode);
    
    const fullAddress = addressParts.join(', ');
    const postalCode = zipcode || '';
    const countryCode = addr.country_code?.toUpperCase() || 'US';
    const cityValue = city || town || village || hamlet || '';
    
    setDetectedCountry(countryCode);
    setFormData(prev => ({
      ...prev,
      address: fullAddress,
      city: cityValue,
      state: state,
      postalCode: postalCode,
      location: `${cityValue}, ${state}`
    }));
    
    setShowSuggestions(false);
    setAddressSuggestions([]);
    
    const distanceUnit = getDistanceUnit(countryCode);
    toast({
      title: "Address selected",
      description: `Auto-filled city, state, and zip code. Distance units: ${distanceUnit}`,
    });
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Update profile
      const profileResponse = await fetch('/api/contractor/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!profileResponse.ok) {
        throw new Error('Failed to update profile');
      }
      
      // Save licenses - first get existing licenses to determine creates vs updates
      const existingResponse = await fetch('/api/contractor/licenses');
      const existingLicenses = existingResponse.ok ? await existingResponse.json() : [];
      const existingLicenseIds = new Set(existingLicenses.map((l: any) => l.id));
      
      // Save each license
      for (const license of licenses) {
        if (license.licenseNumber && license.municipality && license.state) { // Only save complete licenses
          if (license.id && existingLicenseIds.has(license.id)) {
            // Update existing license
            await fetch(`/api/contractor/licenses/${license.id}`, {
              method: 'PUT',
              body: JSON.stringify(license),
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            // Create new license
            await fetch('/api/contractor/licenses', {
              method: 'POST',
              body: JSON.stringify(license),
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      }
      
      return profileResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your contractor profile and licenses have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/licenses'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleServiceToggle = (service: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      services: checked 
        ? [...prev.services, service]
        : prev.services.filter(s => s !== service)
    }));
  };

  const addCustomService = () => {
    if (customService.trim() && !formData.services.includes(customService.trim())) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, customService.trim()]
      }));
      setCustomService('');
    }
  };

  const removeService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter(s => s !== service)
    }));
  };

  // License management functions
  const addLicense = () => {
    setLicenses(prev => [...prev, {
      id: '',
      licenseNumber: '',
      municipality: '',
      state: '',
      expiryDate: '',
      licenseType: 'General Contractor'
    }]);
  };

  const removeLicense = (index: number) => {
    setLicenses(prev => prev.filter((_, i) => i !== index));
  };

  const updateLicense = (index: number, field: string, value: string) => {
    setLicenses(prev => prev.map((license, i) => 
      i === index ? { ...license, [field]: value } : license
    ));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Logo file must be smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        setFormData(prev => ({ ...prev, businessLogo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProjectPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      if (formData.projectPhotos.length + files.length > 20) {
        toast({
          title: "Too Many Photos",
          description: "You can upload a maximum of 20 project photos.",
          variant: "destructive",
        });
        return;
      }

      Array.from(files).forEach(file => {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit per photo
          toast({
            title: "File Too Large",
            description: `${file.name} is too large. Photos must be smaller than 10MB.`,
            variant: "destructive",
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setPhotosPreviews(prev => [...prev, result]);
          setFormData(prev => ({
            ...prev,
            projectPhotos: [...prev.projectPhotos, result]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeProjectPhoto = (index: number) => {
    setPhotosPreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      projectPhotos: prev.projectPhotos.filter((_, i) => i !== index)
    }));
  };

  const removeLogo = () => {
    setLogoPreview('');
    setFormData(prev => ({ ...prev, businessLogo: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  // Referral data query
  const { data: referralData, isLoading: isLoadingReferral } = useQuery({
    queryKey: ['/api/user/referral-code'],
    enabled: !!typedUser,
  });

  const referralCode = (referralData as any)?.referralCode || '';
  const referralLink = (referralData as any)?.referralLink || '';
  const referralCount = (referralData as any)?.referralCount || 0;
  const shareMessage = `Join me on Home Base! Use my referral code ${referralCode} and I get $1 off when you subscribe. You'll get the full Home Base experience at regular price while helping me save money! Perfect for contractors! Sign up here: ${referralLink}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  const shareViaText = () => {
    const smsLink = `sms:?body=${encodeURIComponent(shareMessage)}`;
    window.open(smsLink);
  };

  const shareViaFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareMessage)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const shareViaTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareViaWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1560a2' }}>
      <Header />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8" style={{ backgroundColor: '#f2f2f2', borderRadius: '8px', padding: '24px' }}>
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#1560a2' }}>My Profile</h1>
        <p style={{ color: 'black' }}>
          Manage your business information and professional credentials
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Business Information */}
        <Card style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
              <Building className="w-5 h-5" style={{ color: '#1560a2' }} />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Business Name *</Label>
                <Input
                  id="company"
                  data-testid="input-company"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="ABC Construction LLC"
                  required
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <Label htmlFor="name">Contact Name *</Label>
                <Input
                  id="name"
                  data-testid="input-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="John Smith"
                  required
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4" style={{ color: '#1560a2' }} />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                    placeholder="contact@abcconstruction.com"
                    required
                    style={{ backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4" style={{ color: '#1560a2' }} />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="pl-10"
                    placeholder="(555) 123-4567"
                    required
                    style={{ backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="country">Country *</Label>
                <Select value={selectedCountry} onValueChange={(value) => {
                  setSelectedCountry(value);
                  setDetectedCountry(value);
                }}>
                  <SelectTrigger style={{ backgroundColor: '#ffffff', color: 'black' }} className="hover:bg-[#afd6f9] hover:text-black transition-colors">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Street Address *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4" style={{ color: '#1560a2' }} />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleBusinessAddressChange(e.target.value)}
                  className="pl-10"
                  placeholder="Start typing street address (e.g., 123 Business St)"
                  required
                  style={{ backgroundColor: '#ffffff' }}
                />
                {isLoadingSuggestions && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {/* Business address suggestions dropdown */}
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg">
                    {addressSuggestions.map((suggestion, index) => {
                      const addr = suggestion.address;
                      const parts = [];
                      if (addr?.house_number) parts.push(addr.house_number);
                      if (addr?.road) parts.push(addr.road);
                      else if (addr?.street) parts.push(addr.street);
                      const streetAddress = parts.join(' ') || suggestion.display_name.split(',')[0];
                      
                      // Collect all location components
                      const locationParts = [];
                      const hamlet = addr?.hamlet || '';
                      const village = addr?.village || '';
                      const town = addr?.town || '';
                      const city = addr?.city || '';
                      const county = addr?.county || '';
                      const state = addr?.state || addr?.province || '';
                      const zipcode = addr?.postcode || '';
                      
                      // Add locality (hamlet, village, town, or city) - in order of specificity
                      if (hamlet) locationParts.push(hamlet);
                      if (village && !hamlet) locationParts.push(village);
                      if (town && !village && !hamlet) locationParts.push(town);
                      if (city && !town && !village && !hamlet) locationParts.push(city);
                      
                      // Add county if different from locality
                      if (county && county !== hamlet && county !== village && county !== town && county !== city) {
                        locationParts.push(county);
                      }
                      
                      // Add state/province
                      if (state) locationParts.push(state);
                      
                      // Add zipcode
                      if (zipcode) locationParts.push(zipcode);
                      
                      return (
                        <div
                          key={index}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleBusinessAddressSuggestionSelect(suggestion)}
                          data-testid={`business-address-suggestion-${index}`}
                        >
                          <div className="font-medium text-sm text-gray-900 break-words whitespace-normal">
                            {streetAddress}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 break-words whitespace-normal">
                            {locationParts.join(' • ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="serviceRadius">Service Radius ({getDistanceUnit(detectedCountry)}) *</Label>
              <Select onValueChange={(value) => {
                // Convert display value to storage value if needed
                const storageValue = convertDistanceForStorage(parseInt(value), detectedCountry);
                handleInputChange('serviceRadius', storageValue.toString());
              }}>
                <SelectTrigger style={{ backgroundColor: '#ffffff', color: 'black' }} className="hover:bg-[#afd6f9] hover:text-black transition-colors">
                  <SelectValue placeholder={`${convertDistanceForDisplay(formData.serviceRadius, detectedCountry)} ${getDistanceUnit(detectedCountry)}`} />
                </SelectTrigger>
                <SelectContent>
                  {getServiceRadiusOptions(detectedCountry).map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                How far are you willing to travel for projects?
              </p>
              <div className="text-xs text-gray-500 mt-1">
                🌍 {detectedCountry === 'US' ? 'US addresses use miles' : 'International addresses use kilometers'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* License Information */}
        <Card style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
              <FileText className="w-5 h-5" style={{ color: '#1560a2' }} />
              License Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {licenses.map((license, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">License #{index + 1}</h4>
                  {licenses.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeLicense(index)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <Label>License Type</Label>
                    <Select
                      value={license.licenseType}
                      onValueChange={(value) => updateLicense(index, 'licenseType', value)}
                    >
                      <SelectTrigger style={{ backgroundColor: '#ffffff' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General Contractor">General Contractor</SelectItem>
                        <SelectItem value="Electrical">Electrical</SelectItem>
                        <SelectItem value="Plumbing">Plumbing</SelectItem>
                        <SelectItem value="HVAC">HVAC</SelectItem>
                        <SelectItem value="Roofing">Roofing</SelectItem>
                        <SelectItem value="Masonry">Masonry</SelectItem>
                        <SelectItem value="Landscaping">Landscaping</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>License Number</Label>
                    <Input
                      value={license.licenseNumber}
                      onChange={(e) => updateLicense(index, 'licenseNumber', e.target.value)}
                      placeholder="GC123456"
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>
                  <div>
                    <Label>Municipality</Label>
                    <Input
                      value={license.municipality}
                      onChange={(e) => updateLicense(index, 'municipality', e.target.value)}
                      placeholder="Chicago"
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={license.state}
                      onChange={(e) => updateLicense(index, 'state', e.target.value)}
                      placeholder="Illinois"
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={license.expiryDate}
                      onChange={(e) => updateLicense(index, 'expiryDate', e.target.value)}
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addLicense}
              className="w-full border-dashed border-2"
              style={{ borderColor: '#1560a2', color: '#1560a2', backgroundColor: 'white' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another License
            </Button>
          </CardContent>
        </Card>

        {/* Business Logo */}
        <Card style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
              <Camera className="w-5 h-5" style={{ color: '#1560a2' }} />
              Business Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              Upload your business logo to display next to your business name. Maximum file size: 5MB.
            </div>
            
            {logoPreview || formData.businessLogo ? (
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img 
                    src={logoPreview || formData.businessLogo} 
                    alt="Business Logo" 
                    className="w-24 h-24 object-contain border border-gray-300 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {formData.company || "Your Business Name"}
                  </p>
                  <p className="text-xs text-gray-600">Logo preview with business name</p>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">Upload Your Logo</p>
                  <p className="text-xs text-gray-600">PNG, JPG up to 5MB</p>
                </div>
              </div>
            )}
            
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload">
                <Button type="button" variant="outline" className="cursor-pointer hover:opacity-90" style={{ backgroundColor: '#1560a2', color: 'white' }} asChild>
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {logoPreview || formData.businessLogo ? 'Change Logo' : 'Upload Logo'}
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Project Photos */}
        <Card style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
              <Camera className="w-5 h-5" style={{ color: '#1560a2' }} />
              Project Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              Showcase your work with up to 20 photos of completed projects. Maximum file size per photo: 10MB.
            </div>
            
            {(photosPreviews.length > 0 || formData.projectPhotos.length > 0) && (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-3">
                  Portfolio ({Math.max(photosPreviews.length, formData.projectPhotos.length)}/20)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(photosPreviews.length > 0 ? photosPreviews : formData.projectPhotos).map((photo, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={photo} 
                        alt={`Project ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeProjectPhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {Math.max(photosPreviews.length, formData.projectPhotos.length) < 20 && (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleProjectPhotoUpload}
                  className="hidden"
                  id="photos-upload"
                />
                <label htmlFor="photos-upload">
                  <Button type="button" variant="outline" className="cursor-pointer hover:opacity-90" style={{ backgroundColor: '#1560a2', color: 'white' }} asChild>
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Project Photos
                      <span className="text-xs text-white">
                        ({Math.max(photosPreviews.length, formData.projectPhotos.length)}/20)
                      </span>
                    </span>
                  </Button>
                </label>
              </div>
            )}
            
            {Math.max(photosPreviews.length, formData.projectPhotos.length) === 0 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">Showcase Your Work</p>
                  <p className="text-xs text-gray-600">Upload photos of your completed projects to attract more clients</p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 10MB each • Maximum 20 photos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services Offered */}
        <Card style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
              <Wrench className="w-5 h-5" style={{ color: '#1560a2' }} />
              Services Offered
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
              {AVAILABLE_SERVICES.map((service) => (
                <div key={service} className="flex items-center space-x-2 p-1">
                  <Checkbox
                    id={service}
                    data-testid={`checkbox-service-${service}`}
                    checked={formData.services.includes(service)}
                    onCheckedChange={(checked) => handleServiceToggle(service, checked as boolean)}
                  />
                  <Label htmlFor={service} className="text-sm leading-tight">{service}</Label>
                </div>
              ))}
            </div>

            {/* Custom Services */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium">Custom Services</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  placeholder="Add custom service..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomService())}
                  style={{ backgroundColor: '#ffffff' }}
                  data-testid="input-custom-service"
                />
                <Button type="button" onClick={addCustomService} size="sm" style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:opacity-90" data-testid="button-add-custom-service">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.services.filter(s => !AVAILABLE_SERVICES.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.services
                    .filter(s => !AVAILABLE_SERVICES.includes(s))
                    .map((service) => (
                      <div key={service} className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-sm flex items-center gap-1">
                        {service}
                        <button
                          type="button"
                          onClick={() => removeService(service)}
                          className="text-amber-600 hover:text-amber-800"
                          data-testid={`button-remove-service-${service}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Emergency Services */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emergency-services"
                  checked={formData.hasEmergencyServices}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasEmergencyServices: checked === true }))}
                />
                <Label htmlFor="emergency-services" className="text-sm font-medium">
                  Emergency services available (24/7 response)
                </Label>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Check this if you offer emergency services outside of normal business hours
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Online Presence */}
        <Card style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
              <Globe className="w-5 h-5" style={{ color: '#1560a2' }} />
              Online Presence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.abcconstruction.com"
                style={{ backgroundColor: '#ffffff' }}
              />
            </div>
            
            <div>
              <Label htmlFor="googleBusinessUrl">Google Business Page</Label>
              <Input
                id="googleBusinessUrl"
                value={formData.googleBusinessUrl}
                onChange={(e) => handleInputChange('googleBusinessUrl', e.target.value)}
                placeholder="https://business.google.com/your-business"
                style={{ backgroundColor: '#ffffff' }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="facebook">Facebook Page</Label>
                <Input
                  id="facebook"
                  value={formData.facebook}
                  onChange={(e) => handleInputChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/abcconstruction"
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram Profile</Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/abcconstruction"
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <Label htmlFor="linkedin">LinkedIn Profile</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={(e) => handleInputChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/company/abcconstruction"
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About & Experience */}
        <Card style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
              <User className="w-5 h-5" style={{ color: '#1560a2' }} />
              About & Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="yearsExperience">Years of Experience</Label>
              <Select value={formData.yearsExperience} onValueChange={(value) => handleInputChange('yearsExperience', value)}>
                <SelectTrigger style={{ backgroundColor: '#ffffff', color: 'black' }} className="hover:bg-[#afd6f9] hover:text-black transition-colors">
                  <SelectValue placeholder="Select years of experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2">1-2 years</SelectItem>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="6-10">6-10 years</SelectItem>
                  <SelectItem value="11-15">11-15 years</SelectItem>
                  <SelectItem value="16-20">16-20 years</SelectItem>
                  <SelectItem value="20+">20+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bio">Business Description</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell potential clients about your business, specialties, and what sets you apart..."
                rows={4}
                maxLength={1000}
                style={{ backgroundColor: '#ffffff' }}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.bio.length}/1000 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Referral Sharing */}
        <Card style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
              <Gift className="w-5 h-5" style={{ color: '#1560a2' }} />
              Referral Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              Share Home Base with other contractors and homeowners. I earn $1 off my subscription for each signup!
            </div>
            
            {/* Referral Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold" style={{ color: '#1560a2' }}>
                  {isLoadingReferral ? '...' : referralCount}
                </div>
                <div className="text-sm text-gray-600">People Referred</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${isLoadingReferral ? '...' : (referralCount * 1).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Earned</div>
              </div>
            </div>

            {/* Referral Code */}
            <div>
              <Label style={{ color: '#1560a2' }}>Your Referral Code</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={referralCode}
                  readOnly
                  data-testid="input-contractor-referral-code"
                  className="font-mono text-lg font-bold text-center"
                  style={{ backgroundColor: 'white', color: '#1560a2' }}
                />
                <Button
                  onClick={() => copyToClipboard(referralCode)}
                  variant="outline"
                  size="icon"
                  data-testid="button-copy-contractor-code"
                  title="Copy referral code"
                  type="button"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Share Options */}
            <div>
              <Label style={{ color: '#1560a2' }}>Share with Your Network</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  onClick={shareViaText}
                  variant="outline"
                  size="sm"
                  data-testid="button-contractor-share-text"
                  className="flex items-center gap-2"
                  type="button"
                >
                  <MessageSquare className="w-4 h-4" />
                  Text Message
                </Button>
                <Button
                  onClick={shareViaWhatsApp}
                  variant="outline"
                  size="sm"
                  data-testid="button-contractor-share-whatsapp"
                  className="flex items-center gap-2"
                  style={{ color: '#25D366' }}
                  type="button"
                >
                  <Share2 className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button
                  onClick={shareViaFacebook}
                  variant="outline"
                  size="sm"
                  data-testid="button-contractor-share-facebook"
                  className="flex items-center gap-2"
                  style={{ color: '#1877F2' }}
                  type="button"
                >
                  <Share2 className="w-4 h-4" />
                  Facebook
                </Button>
                <Button
                  onClick={shareViaTwitter}
                  variant="outline"
                  size="sm"
                  data-testid="button-contractor-share-twitter"
                  className="flex items-center gap-2"
                  style={{ color: '#1DA1F2' }}
                  type="button"
                >
                  <Share2 className="w-4 h-4" />
                  Twitter
                </Button>
              </div>
            </div>

            {/* Copy Link */}
            <div>
              <Label style={{ color: '#1560a2' }}>Referral Link</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={referralLink}
                  readOnly
                  data-testid="input-contractor-referral-link"
                  className="text-sm"
                  style={{ backgroundColor: 'white', color: '#1560a2' }}
                />
                <Button
                  onClick={() => copyToClipboard(referralLink)}
                  variant="outline"
                  size="icon"
                  data-testid="button-copy-contractor-link"
                  title="Copy referral link"
                  type="button"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Share with fellow contractors and potential clients. They get the full Home Base experience while helping you save $1!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={updateProfileMutation.isPending}
            className="px-8 py-2 hover:opacity-90"
            style={{ backgroundColor: '#afd6f9', color: 'black' }}
          >
            {updateProfileMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}