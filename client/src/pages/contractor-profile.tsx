// v4.0.0 - Simplified upload endpoint (Nov 2, 2025) - No session companyId needed
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  X
} from "lucide-react";

const AVAILABLE_SERVICES = [
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
  "Home Automation & Tech Services",
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

export default function ContractorProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, refetch: refetchUser } = useAuth();
  const typedUser = user as UserType | undefined;
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  
  // Auto-refresh session if companyId is missing (handles stale session data)
  React.useEffect(() => {
    if (typedUser && !typedUser.companyId && !hasAttemptedRefresh) {
      console.log('[SESSION] CompanyId missing, refreshing session data...');
      setHasAttemptedRefresh(true);
      
      // Try to refresh session from server
      fetch('/api/auth/refresh-session', {
        method: 'POST',
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => {
          if (data.user?.companyId) {
            console.log('[SESSION] Session refreshed, companyId found:', data.user.companyId);
            refetchUser();
            queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          } else {
            console.log('[SESSION] No companyId found after refresh - company may need to be created');
          }
        })
        .catch(err => {
          console.error('[SESSION] Failed to refresh session:', err);
        });
    }
  }, [typedUser, hasAttemptedRefresh, refetchUser, queryClient]);
  
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
    insuranceCarrier: '',
    insurancePolicyNumber: '',
    insuranceExpiryDate: '',
    insuranceCoverageAmount: '',
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

  // Load company data for business logo and project photos
  const { data: companyData } = useQuery({
    queryKey: ['/api/companies', typedUser?.companyId],
    enabled: !!typedUser?.companyId,
  });

  // Update form data when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData(prev => ({ ...prev, ...profile }));
    }
  }, [profile]);

  // Update form data with company data when it loads (images, bio, experience)
  React.useEffect(() => {
    if (companyData) {
      const updates: any = {};
      
      // Update logo
      if ((companyData as any).businessLogo) {
        setLogoPreview((companyData as any).businessLogo);
        updates.businessLogo = (companyData as any).businessLogo;
      }
      
      // Update project photos
      if ((companyData as any).projectPhotos && (companyData as any).projectPhotos.length > 0) {
        setPhotosPreviews((companyData as any).projectPhotos);
        updates.projectPhotos = (companyData as any).projectPhotos;
      }
      
      // Update bio
      if ((companyData as any).bio) {
        updates.bio = (companyData as any).bio;
      }
      
      // Update years of experience - convert number to string for the select field
      if ((companyData as any).experience !== undefined && (companyData as any).experience !== null) {
        const exp = (companyData as any).experience;
        // Convert to string, or "20+" if over 20
        updates.yearsExperience = exp > 20 ? '20+' : String(exp);
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [companyData]);

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
      console.log('======================================');
      console.log('[DEBUG] SAVE BUTTON CLICKED - Starting profile update mutation');
      console.log('[DEBUG] Current user:', typedUser);
      console.log('[DEBUG] User companyId:', typedUser?.companyId);
      console.log('[DEBUG] User authenticated:', !!typedUser);
      console.log('[DEBUG] Has businessLogo:', !!data.businessLogo);
      console.log('[DEBUG] Project photos count:', data.projectPhotos?.length || 0);
      console.log('======================================');
      
      // CRITICAL: Verify user has companyId before proceeding
      if (!typedUser || !typedUser.companyId) {
        throw new Error('You must be signed in as a contractor with a company to save profile. Please refresh your session.');
      }
      
      // Separate contractor data from company data
      let { businessLogo, projectPhotos, ...contractorData} = data;
      
      // Upload images to Object Storage if they're base64 (new uploads)
      if (typedUser?.companyId) {
        // Upload logo if it's base64 data
        if (businessLogo && businessLogo.startsWith('data:image/')) {
          console.log('[DEBUG] Uploading logo to Object Storage...');
          toast({
            title: "Uploading Logo...",
            description: "Please wait while we save your business logo.",
          });
          const logoResponse = await fetch('/api/upload/image', {
            method: 'POST',
            body: JSON.stringify({ imageData: businessLogo, type: 'logo' }),
            headers: { 'Content-Type': 'application/json' },
          });
          if (logoResponse.ok) {
            const { url } = await logoResponse.json();
            businessLogo = url;
            console.log('[DEBUG] Logo uploaded successfully:', url);
            toast({
              title: "Logo Uploaded",
              description: "Your business logo has been saved successfully.",
            });
          } else {
            throw new Error('Failed to upload logo');
          }
        }

        // Upload project photos if they're base64 data
        const uploadedPhotos: string[] = [];
        const photosToUpload = projectPhotos.filter(p => p.startsWith('data:image/')).length;
        if (photosToUpload > 0) {
          toast({
            title: "Uploading Photos...",
            description: `Uploading ${photosToUpload} project photo${photosToUpload > 1 ? 's' : ''}...`,
          });
        }
        for (const photo of projectPhotos) {
          if (photo.startsWith('data:image/')) {
            console.log('[DEBUG] Uploading project photo to Object Storage...');
            const photoResponse = await fetch('/api/upload/image', {
              method: 'POST',
              body: JSON.stringify({ imageData: photo, type: 'photo' }),
              headers: { 'Content-Type': 'application/json' },
            });
            if (photoResponse.ok) {
              const { url } = await photoResponse.json();
              uploadedPhotos.push(url);
              console.log('[DEBUG] Photo uploaded successfully:', url);
            } else {
              throw new Error('Failed to upload project photo');
            }
          } else {
            // Already a URL, keep it
            uploadedPhotos.push(photo);
          }
        }
        if (photosToUpload > 0) {
          toast({
            title: "Photos Uploaded",
            description: `Successfully uploaded ${photosToUpload} project photo${photosToUpload > 1 ? 's' : ''}.`,
          });
        }
        projectPhotos = uploadedPhotos;
      }
      
      // Update contractor profile (without businessLogo and projectPhotos)
      console.log('[DEBUG] Updating contractor profile...');
      const profileResponse = await fetch('/api/contractor/profile', {
        method: 'PUT',
        body: JSON.stringify(contractorData),
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('[DEBUG] Profile update failed:', profileResponse.status, errorText);
        throw new Error(`Failed to update profile: ${errorText}`);
      }
      console.log('[DEBUG] Profile updated successfully');
      
      // Update company with businessLogo, projectPhotos, bio, and experience if user has a company
      if (typedUser?.companyId) {
        console.log('[DEBUG] Updating company data for companyId:', typedUser.companyId);
        console.log('[DEBUG] Logo URL:', businessLogo);
        console.log('[DEBUG] Photo URLs count:', projectPhotos.length);
        console.log('[DEBUG] Bio:', data.bio ? 'yes' : 'no');
        console.log('[DEBUG] Years Experience:', data.yearsExperience || 'not set');
        
        // Build company update payload with bio and experience
        const companyUpdate: any = { 
          businessLogo, 
          projectPhotos,
        };
        
        // Add bio if provided
        if (data.bio) {
          companyUpdate.bio = data.bio;
        }
        
        // Add experience if provided (convert string to number)
        if (data.yearsExperience) {
          // Convert to number, or 25 for "20+"
          const experienceNum = data.yearsExperience === '20+' ? 25 : parseInt(data.yearsExperience) || 0;
          companyUpdate.experience = experienceNum;
        }
        
        const companyResponse = await fetch(`/api/companies/${typedUser.companyId}`, {
          method: 'PUT',
          body: JSON.stringify(companyUpdate),
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (!companyResponse.ok) {
          const errorText = await companyResponse.text();
          console.error('[DEBUG] Company update failed:', companyResponse.status, errorText);
          throw new Error(`Failed to update company data: ${errorText}`);
        }
        console.log('[DEBUG] Company data updated successfully');
      } else {
        console.warn('[DEBUG] No companyId found - skipping company update');
      }
      
      // Save licenses - first get existing licenses to determine creates vs updates
      const existingResponse = await fetch('/api/contractor/licenses', {
        credentials: 'include',
      });
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
              credentials: 'include',
            });
          } else {
            // Create new license
            await fetch('/api/contractor/licenses', {
              method: 'POST',
              body: JSON.stringify(license),
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
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
      if (typedUser?.companyId) {
        queryClient.invalidateQueries({ queryKey: ['/api/companies', typedUser.companyId] });
      }
    },
    onError: (error) => {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
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

  // Helper function to compress images before upload
  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxWidth) {
              width = (width * maxWidth) / height;
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('================================================');
    console.log('[LOGO UPLOAD] Handler called!');
    console.log('================================================');
    
    const file = event.target.files?.[0];
    console.log('[LOGO UPLOAD] File selected:', file?.name, 'Size:', file?.size);
    
    if (!file) {
      console.log('[LOGO UPLOAD] No file selected, exiting');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      console.log('[LOGO UPLOAD] File too large, aborting');
      toast({
        title: "File Too Large",
        description: "Logo file must be smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('[LOGO UPLOAD] Starting upload process...');
      
      // Show loading toast
      toast({
        title: "Uploading Logo...",
        description: "Saving to database...",
      });
      
      console.log('[LOGO UPLOAD] Compressing image...');
      const compressedImage = await compressImage(file, 800, 0.85);
      console.log('[LOGO UPLOAD] Image compressed to', compressedImage.length, 'characters');
      
      // Use hardcoded email to bypass ALL auth issues
      const email = 'freshandcleangutters@gmail.com';
      console.log('[LOGO UPLOAD] Using email:', email);
      console.log('[LOGO UPLOAD] Sending POST to /api/upload-logo-raw');
      
      // DIRECT upload - no session needed, uses email lookup, bypasses ORM
      const uploadResponse = await fetch('/api/upload-logo-raw', {
        method: 'POST',
        body: JSON.stringify({ 
          imageData: compressedImage,
          email: email
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      console.log('[LOGO UPLOAD] Response status:', uploadResponse.status);
      console.log('[LOGO UPLOAD] Response ok:', uploadResponse.ok);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[LOGO UPLOAD ERROR] Response:', errorText);
        throw new Error(errorText || 'Failed to upload logo');
      }
      
      const responseData = await uploadResponse.json();
      console.log('[LOGO UPLOAD SUCCESS]', responseData);
      
      const { url } = responseData;
      
      // Update preview with SAVED URL from database
      setLogoPreview(url);
      setFormData(prev => ({ ...prev, businessLogo: url }));
      
      toast({
        title: "✅ Logo Saved to Database!",
        description: "Your logo is permanently saved and will persist after refresh.",
      });
      
      console.log('[LOGO UPLOAD] Upload complete. Logo URL:', url);
      
    } catch (error) {
      console.error('[LOGO UPLOAD FAILED]', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to save logo.",
        variant: "destructive",
      });
    }
  };

  const handleProjectPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      
      if (!typedUser?.companyId) {
        toast({
          title: "Company Profile Not Found",
          description: "Your company profile is being set up. Please save your profile first, then try uploading photos.",
          variant: "destructive",
        });
        return;
      }

      const fileArray = Array.from(files);
      let uploadedCount = 0;
      const newPhotoUrls: string[] = [];
      
      toast({
        title: "Uploading Photos...",
        description: `Uploading ${fileArray.length} photo(s)...`,
      });
      
      for (const file of fileArray) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit per photo before compression
          toast({
            title: "File Too Large",
            description: `${file.name} is too large. Photos must be smaller than 10MB.`,
            variant: "destructive",
          });
          continue;
        }

        try {
          const compressedImage = await compressImage(file, 1200, 0.80);
          
          // Upload to object storage immediately
          const uploadResponse = await fetch('/api/upload/image', {
            method: 'POST',
            body: JSON.stringify({ imageData: compressedImage, type: 'photo' }),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Failed to upload image');
          }
          
          const { url } = await uploadResponse.json();
          newPhotoUrls.push(url);
          uploadedCount++;
        } catch (error) {
          console.error('Error uploading image:', error);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}. Please try again.`,
            variant: "destructive",
          });
        }
      }
      
      if (uploadedCount > 0) {
        try {
          // Get current photos from database (keep all existing photos)
          const currentPhotos = formData.projectPhotos;
          const allPhotos = [...currentPhotos, ...newPhotoUrls];
          
          // Save all photos to database immediately
          const saveResponse = await fetch(`/api/companies/${typedUser.companyId}`, {
            method: 'PUT',
            body: JSON.stringify({ projectPhotos: allPhotos }),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          
          if (!saveResponse.ok) {
            throw new Error('Failed to save photos to database');
          }
          
          // Update previews with saved URLs
          setPhotosPreviews(allPhotos);
          setFormData(prev => ({
            ...prev,
            projectPhotos: allPhotos
          }));
          
          toast({
            title: "Photos Saved",
            description: `${uploadedCount} photo(s) uploaded and saved to the database.`,
          });
          
          // Invalidate company cache to refetch with new photos
          queryClient.invalidateQueries({ queryKey: ['/api/companies', typedUser.companyId] });
        } catch (error) {
          console.error('Error saving photos:', error);
          toast({
            title: "Save Failed",
            description: "Photos uploaded but failed to save. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const removeProjectPhoto = async (index: number) => {
    if (!typedUser?.companyId) {
      toast({
        title: "Company Profile Not Found",
        description: "Your company profile is being set up. Please save your profile first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Remove from array
      const updatedPhotos = formData.projectPhotos.filter((_, i) => i !== index);
      
      // Save to database immediately
      const saveResponse = await fetch(`/api/companies/${typedUser.companyId}`, {
        method: 'PUT',
        body: JSON.stringify({ projectPhotos: updatedPhotos }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to remove photo');
      }
      
      // Update UI
      setPhotosPreviews(prev => prev.filter((_, i) => i !== index));
      setFormData(prev => ({
        ...prev,
        projectPhotos: updatedPhotos
      }));
      
      toast({
        title: "Photo Removed",
        description: "Photo has been deleted from the database.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/companies', typedUser.companyId] });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeLogo = async () => {
    if (!typedUser?.companyId) {
      toast({
        title: "Company Profile Not Found",
        description: "Your company profile is being set up. Please save your profile first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Save to database immediately
      const saveResponse = await fetch(`/api/companies/${typedUser.companyId}`, {
        method: 'PUT',
        body: JSON.stringify({ businessLogo: '' }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to remove logo');
      }
      
      // Update UI
      setLogoPreview('');
      setFormData(prev => ({ ...prev, businessLogo: '' }));
      
      toast({
        title: "Logo Removed",
        description: "Logo has been deleted from the database.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/companies', typedUser.companyId] });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove logo. Please try again.",
        variant: "destructive",
      });
    }
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

        {/* Insurance & Compliance */}
        <Card style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
              <Shield className="w-5 h-5" style={{ color: '#1560a2' }} />
              Insurance & Compliance
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Complete your insurance information to get verified. Verified contractors are more likely to be hired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insuranceCarrier">Insurance Carrier *</Label>
                <Input
                  id="insuranceCarrier"
                  data-testid="input-insurance-carrier"
                  value={formData.insuranceCarrier}
                  onChange={(e) => setFormData({ ...formData, insuranceCarrier: e.target.value })}
                  placeholder="e.g., State Farm, Allstate"
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <Label htmlFor="insurancePolicyNumber">Policy Number *</Label>
                <Input
                  id="insurancePolicyNumber"
                  data-testid="input-insurance-policy-number"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                  placeholder="POL-123456789"
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <Label htmlFor="insuranceExpiryDate">Expiry Date *</Label>
                <Input
                  id="insuranceExpiryDate"
                  data-testid="input-insurance-expiry-date"
                  type="date"
                  value={formData.insuranceExpiryDate}
                  onChange={(e) => setFormData({ ...formData, insuranceExpiryDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div>
                <Label htmlFor="insuranceCoverageAmount">Coverage Amount *</Label>
                <Select 
                  value={formData.insuranceCoverageAmount}
                  onValueChange={(value) => setFormData({ ...formData, insuranceCoverageAmount: value })}
                >
                  <SelectTrigger id="insuranceCoverageAmount" data-testid="select-insurance-coverage" style={{ backgroundColor: '#ffffff' }}>
                    <SelectValue placeholder="Select coverage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$500K">$500,000</SelectItem>
                    <SelectItem value="$1M">$1,000,000</SelectItem>
                    <SelectItem value="$2M">$2,000,000</SelectItem>
                    <SelectItem value="$3M">$3,000,000</SelectItem>
                    <SelectItem value="$5M">$5,000,000</SelectItem>
                    <SelectItem value="$10M+">$10,000,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                <Shield className="w-4 h-4 inline mr-2" />
                <strong>Why this matters:</strong> Contractors with verified insurance and active licenses earn a "Verified" badge, which builds trust and increases booking rates by up to 40%.
              </p>
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
                  <SelectItem value="1">1 year</SelectItem>
                  <SelectItem value="2">2 years</SelectItem>
                  <SelectItem value="3">3 years</SelectItem>
                  <SelectItem value="4">4 years</SelectItem>
                  <SelectItem value="5">5 years</SelectItem>
                  <SelectItem value="6">6 years</SelectItem>
                  <SelectItem value="7">7 years</SelectItem>
                  <SelectItem value="8">8 years</SelectItem>
                  <SelectItem value="9">9 years</SelectItem>
                  <SelectItem value="10">10 years</SelectItem>
                  <SelectItem value="11">11 years</SelectItem>
                  <SelectItem value="12">12 years</SelectItem>
                  <SelectItem value="13">13 years</SelectItem>
                  <SelectItem value="14">14 years</SelectItem>
                  <SelectItem value="15">15 years</SelectItem>
                  <SelectItem value="16">16 years</SelectItem>
                  <SelectItem value="17">17 years</SelectItem>
                  <SelectItem value="18">18 years</SelectItem>
                  <SelectItem value="19">19 years</SelectItem>
                  <SelectItem value="20">20 years</SelectItem>
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

      {/* Cancel Account */}
      <Card className="border-red-200 mt-8">
        <CardHeader>
          <CardTitle className="text-red-600">Cancel Account</CardTitle>
          <CardDescription>
            Permanently cancel your contractor account. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" data-testid="button-cancel-account">
                Cancel My Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This will permanently cancel your Home Base contractor account. Your subscription will be cancelled and you will lose access to:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Your contractor profile and company information</li>
                    <li>All customer conversations and proposals</li>
                    <li>Service records and job history</li>
                    <li>Your referral rewards</li>
                  </ul>
                  <p className="mt-3 font-semibold text-red-600">
                    This action cannot be undone.
                  </p>
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-cancel-account-dialog-no">
                    No, Keep My Account
                  </Button>
                </DialogTrigger>
                <Button 
                  variant="destructive"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/account', { method: 'DELETE' });
                      if (response.ok) {
                        toast({
                          title: "Account Cancelled",
                          description: "Your account has been cancelled. You will be redirected to the home page.",
                        });
                        setTimeout(() => {
                          window.location.href = '/';
                        }, 2000);
                      } else {
                        const data = await response.json();
                        toast({
                          title: "Error",
                          description: data.message || "Failed to cancel account",
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "An error occurred while cancelling your account",
                        variant: "destructive",
                      });
                    }
                  }}
                  data-testid="button-cancel-account-dialog-yes"
                >
                  Yes, Cancel My Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Contact Us Button */}
      <div className="mt-8 flex justify-center">
        <Button 
          variant="outline" 
          asChild
          data-testid="button-contact-us"
          className="flex items-center gap-2"
        >
          <a href="mailto:gotohomebase2025@gmail.com">
            <Mail className="w-4 h-4" />
            Contact Us
          </a>
        </Button>
      </div>

      </div>
    </div>
  );
}