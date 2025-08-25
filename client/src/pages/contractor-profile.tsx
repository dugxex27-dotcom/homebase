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
  X
} from "lucide-react";

const AVAILABLE_SERVICES = [
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

export default function ContractorProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    licenseNumber: '',
    licenseState: '',
    licenseExpiry: '',
    licenseMunicipality: '',
    servicesOffered: [] as string[],
    website: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    bio: '',
    yearsExperience: '',
    profileImage: ''
  });

  const [customService, setCustomService] = useState('');

  // Load existing profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/contractor/profile'],
  });

  // Update form data when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData(prev => ({ ...prev, ...profile }));
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/contractor/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your contractor profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor/profile'] });
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
      servicesOffered: checked 
        ? [...prev.servicesOffered, service]
        : prev.servicesOffered.filter(s => s !== service)
    }));
  };

  const addCustomService = () => {
    if (customService.trim() && !formData.servicesOffered.includes(customService.trim())) {
      setFormData(prev => ({
        ...prev,
        servicesOffered: [...prev.servicesOffered, customService.trim()]
      }));
      setCustomService('');
    }
  };

  const removeService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      servicesOffered: prev.servicesOffered.filter(s => s !== service)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
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
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">
          Manage your business information and professional credentials
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="ABC Construction LLC"
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                    placeholder="contact@abcconstruction.com"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="pl-10"
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Business Address *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="pl-10"
                  placeholder="123 Main Street"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Springfield"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="IL"
                  required
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  placeholder="62704"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* License Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              License Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  placeholder="GC123456"
                />
              </div>
              <div>
                <Label htmlFor="licenseMunicipality">Municipality Issued</Label>
                <Input
                  id="licenseMunicipality"
                  value={formData.licenseMunicipality}
                  onChange={(e) => handleInputChange('licenseMunicipality', e.target.value)}
                  placeholder="Chicago"
                />
              </div>
              <div>
                <Label htmlFor="licenseState">License State</Label>
                <Input
                  id="licenseState"
                  value={formData.licenseState}
                  onChange={(e) => handleInputChange('licenseState', e.target.value)}
                  placeholder="Illinois"
                />
              </div>
              <div>
                <Label htmlFor="licenseExpiry">License Expiry</Label>
                <Input
                  id="licenseExpiry"
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={(e) => handleInputChange('licenseExpiry', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Offered */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Services Offered
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {AVAILABLE_SERVICES.map((service) => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox
                    id={service}
                    checked={formData.servicesOffered.includes(service)}
                    onCheckedChange={(checked) => handleServiceToggle(service, checked as boolean)}
                  />
                  <Label htmlFor={service} className="text-sm">{service}</Label>
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
                />
                <Button type="button" onClick={addCustomService} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.servicesOffered.filter(s => !AVAILABLE_SERVICES.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.servicesOffered
                    .filter(s => !AVAILABLE_SERVICES.includes(s))
                    .map((service) => (
                      <div key={service} className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-sm flex items-center gap-1">
                        {service}
                        <button
                          type="button"
                          onClick={() => removeService(service)}
                          className="text-amber-600 hover:text-amber-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Online Presence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Online Presence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.abcconstruction.com"
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
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram Profile</Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/abcconstruction"
                />
              </div>
              <div>
                <Label htmlFor="linkedin">LinkedIn Profile</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={(e) => handleInputChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/company/abcconstruction"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About & Experience */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              About & Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="yearsExperience">Years of Experience</Label>
              <Select value={formData.yearsExperience} onValueChange={(value) => handleInputChange('yearsExperience', value)}>
                <SelectTrigger>
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
                maxLength={500}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.bio.length}/500 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={updateProfileMutation.isPending}
            className="px-8 py-2"
          >
            {updateProfileMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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