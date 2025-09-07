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
  "Alarm / Camera installation",
  "Assembly Services",
  "Basement Remodeling",
  "Bathroom Remodeling",
  "Carpentry",
  "Christmas Light Hanging",
  "Concrete Work",
  "Deck Building",
  "Drywall / Spackling",
  "Dumpster Rental",
  "Electrical",
  "Fence Installation",
  "Flooring- Hardwood",
  "Flooring- Laminate/ Vinyl flooring",
  "Flooring-Epoxy",
  "General Contracting",
  "Gutter Cleaning",
  "Gutter Installation",
  "Handyman Services",
  "Home Inspectors",
  "House Cleaning",
  "HVAC",
  "Junk Removal",
  "Kitchen Remodeling",
  "Landscaping",
  "Masonry/Paver",
  "Painting- Exterior",
  "Painting- Interior",
  "Pest Control",
  "Plumbing",
  "Pool Cleaning and Maintenance",
  "Pool Installation",
  "Pressure Washing",
  "Roofing",
  "Siding",
  "Snow Removal",
  "Sprinklers/Irrigation",
  "Tile Work",
  "Windows & Doors"
];

export default function ContractorProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  
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
    serviceRadius: 25,
    servicesOffered: [] as string[],
    website: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    bio: '',
    yearsExperience: '',
    profileImage: '',
    businessLogo: '',
    projectPhotos: [] as string[]
  });

  const [customService, setCustomService] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);

  // Load existing profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/contractor/profile'],
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
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#ffffff' }}>My Profile</h1>
        <p style={{ color: '#afd6f9' }}>
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
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="ABC Construction LLC"
                  required
                  style={{ backgroundColor: '#ffffff' }}
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

            <div>
              <Label htmlFor="address">Business Address *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4" style={{ color: '#1560a2' }} />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="pl-10"
                  placeholder="123 Main Street"
                  required
                  style={{ backgroundColor: '#ffffff' }}
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
                  style={{ backgroundColor: '#ffffff' }}
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
                  style={{ backgroundColor: '#ffffff' }}
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
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="serviceRadius">Service Radius (miles) *</Label>
              <Select onValueChange={(value) => handleInputChange('serviceRadius', value)}>
                <SelectTrigger style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:bg-[#afd6f9] hover:text-black transition-colors">
                  <SelectValue placeholder={`${formData.serviceRadius} miles`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 miles</SelectItem>
                  <SelectItem value="10">10 miles</SelectItem>
                  <SelectItem value="15">15 miles</SelectItem>
                  <SelectItem value="20">20 miles</SelectItem>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="30">30 miles</SelectItem>
                  <SelectItem value="35">35 miles</SelectItem>
                  <SelectItem value="40">40 miles</SelectItem>
                  <SelectItem value="45">45 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                  <SelectItem value="75">75 miles</SelectItem>
                  <SelectItem value="100">100 miles</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                How far are you willing to travel for projects?
              </p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  placeholder="GC123456"
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <Label htmlFor="licenseMunicipality">Municipality Issued</Label>
                <Input
                  id="licenseMunicipality"
                  value={formData.licenseMunicipality}
                  onChange={(e) => handleInputChange('licenseMunicipality', e.target.value)}
                  placeholder="Chicago"
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <Label htmlFor="licenseState">License State</Label>
                <Input
                  id="licenseState"
                  value={formData.licenseState}
                  onChange={(e) => handleInputChange('licenseState', e.target.value)}
                  placeholder="Illinois"
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <Label htmlFor="licenseExpiry">License Expiry</Label>
                <Input
                  id="licenseExpiry"
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={(e) => handleInputChange('licenseExpiry', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
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
                    {formData.businessName || "Your Business Name"}
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
                    checked={formData.servicesOffered.includes(service)}
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
                />
                <Button type="button" onClick={addCustomService} size="sm" style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:opacity-90">
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
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.abcconstruction.com"
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
                <SelectTrigger style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:bg-[#afd6f9] hover:text-black transition-colors">
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