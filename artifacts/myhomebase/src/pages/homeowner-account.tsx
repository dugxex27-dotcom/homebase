import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useHomeownerSubscription } from "@/hooks/useHomeownerSubscription";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  Bell, 
  Mail, 
  Phone, 
  MapPin,
  Save,
  Camera,
  LogOut,
  Share2,
  Copy,
  MessageSquare,
  Gift,
  DollarSign,
  Home,
  Send,
  Clock,
  CheckCircle,
  Plus,
  Download,
  Image as ImageIcon,
  Check,
  CreditCard,
  ChevronRight,
  ChevronUp,
  TrendingUp,
  Trophy
} from "lucide-react";
import AddressAutocomplete from "@/components/address-autocomplete";
import { Link, useLocation, useSearch } from "wouter";
import PushNotificationManager from "@/components/push-notification-manager";
import { ActivatingPlanBanner } from "@/components/activating-plan-banner";
import { fetchJsonWithTimeout } from "@/lib/fetch-json-with-timeout";
import "./home.css";
import instagramPostImg from '@assets/ChatGPT_Image_Dec_26,_2025,_12_25_05_PM_1766769919337.png';
import instagramStoryImg from '@assets/ChatGPT_Image_Dec_26,_2025,_12_15_06_PM_1766769329697.png';
import facebookTwitterImg from '@assets/homebase-homeowner-referral_(2)_1766768136456.png';

export default function HomeownerAccount() {
  const [loc, setLoc] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const rawTab = searchParams.get('tab');

  const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'billing', label: 'Billing' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'properties', label: 'Properties' },
    { id: 'account', label: 'Account' },
  ];
  const isValidTab = TABS.some(t => t.id === rawTab);
  const currentTab = isValidTab ? (rawTab as string) : 'profile';

  // Handle URL sync logic once only if needed
  const shouldSync = !rawTab || !isValidTab;
  useEffect(() => {
    if (shouldSync) {
      const newParams = new URLSearchParams(searchString);
      newParams.set('tab', 'profile');
      setLoc(`${loc}?${newParams.toString()}`, { replace: true });
    }
  }, [shouldSync, loc, searchString, setLoc]);

  const handleTabChange = (tabId: string) => {
    const newParams = new URLSearchParams(searchString);
    newParams.set('tab', tabId);
    setLoc(`${loc}?${newParams.toString()}`);
  };

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { 
    isPaidSubscriber, 
    isInTrial, 
    isFreeUser, 
    trialDaysRemaining,
    needsUpgrade,
    currentPlan,
    maxHouses: subscriptionMaxHouses,
    isLoading: subscriptionLoading,
    isError: subscriptionError,
  } = useHomeownerSubscription();

  // Form state for basic profile information
  const [profileData, setProfileData] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    email: (user as any)?.email || "",
    phone: (user as any)?.phone || "",
    address: (user as any)?.address || ""
  });

  const ALL_WEATHER_ALERT_TYPES = [
    { group: 'Wind & Tornado', types: ['Tornado Warning', 'Tornado Watch', 'Severe Thunderstorm Warning', 'High Wind Warning'] },
    { group: 'Flooding', types: ['Flash Flood Warning', 'Flash Flood Watch'] },
    { group: 'Hurricane', types: ['Hurricane Warning', 'Hurricane Watch'] },
    { group: 'Winter', types: ['Winter Storm Warning', 'Blizzard Warning', 'Ice Storm Warning', 'Freeze Warning'] },
    { group: 'Extreme Heat', types: ['Extreme Heat Warning'] },
  ];
  const FLAT_ALERT_TYPES = ALL_WEATHER_ALERT_TYPES.flatMap(g => g.types);

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    smsNotifications: false,
    maintenanceReminders: true,
    appointmentReminders: true,
    contractorMessages: true,
    weeklyDigest: false,
    weatherAlerts: true,
    weatherAlertTypes: [] as string[], // empty = all enabled
    weatherForecastReminders: true,
  });

  // Load notification preferences from server
  const { data: serverNotifPrefs } = useQuery<typeof notificationPrefs>({
    queryKey: ['/api/homeowner/notifications/preferences'],
    enabled: !!user,
  });

  const {
    data: weatherForecastPreview,
    isLoading: isWeatherForecastPreviewLoading,
    isError: isWeatherForecastPreviewError,
    refetch: refetchWeatherForecastPreview,
  } = useQuery<WeatherForecastPreview>({
    queryKey: ['/api/homeowner/weather-forecast-preview'],
    queryFn: () => fetchJsonWithTimeout<WeatherForecastPreview>(
      '/api/homeowner/weather-forecast-preview',
      { credentials: 'include' },
    ),
    enabled: !!user,
  });

  useEffect(() => {
    if (serverNotifPrefs) {
      setNotificationPrefs(prev => ({ ...prev, ...serverNotifPrefs }));
    }
  }, [serverNotifPrefs]);

  const isAlertTypeEnabled = (type: string) =>
    notificationPrefs.weatherAlertTypes.length === 0 || notificationPrefs.weatherAlertTypes.includes(type);

  // House transfer state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    houseId: "",
    toHomeownerEmail: "",
    transferNote: "",
  });

  // Sync profile data with user data when it changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: (user as any)?.firstName || "",
        lastName: (user as any)?.lastName || "",
        email: (user as any)?.email || "",
        phone: (user as any)?.phone || "",
        address: (user as any)?.address || ""
      });
    }
  }, [user]);


  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      return await apiRequest('/api/homeowner/profile', 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    }
  });

  // Update notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (prefs: typeof notificationPrefs) => {
      return await apiRequest('/api/homeowner/notifications/preferences', 'PATCH', prefs);
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update notification preferences.",
        variant: "destructive",
      });
    }
  });

  const sendTestWeatherReminderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/homeowner/test-weather-forecast-reminder', 'POST');
      return await response.json() as { success: true; taskTitle: string };
    },
    onSuccess: (result) => {
      toast({
        title: "Test Reminder Sent",
        description: result?.taskTitle
          ? `A test reminder was sent for “${result.taskTitle}”.`
          : "Your test weather reminder was sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Reminder Not Sent",
        description: error.message || "Failed to send a test weather reminder.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleNotificationChange = (key: keyof typeof notificationPrefs, value: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);
    updateNotificationsMutation.mutate(newPrefs);
  };

  const handleAlertTypeToggle = (type: string, enabled: boolean) => {
    let currentTypes = notificationPrefs.weatherAlertTypes.length === 0 ? [...FLAT_ALERT_TYPES] : [...notificationPrefs.weatherAlertTypes];
    if (enabled) {
      currentTypes = [...currentTypes, type];
    } else {
      currentTypes = currentTypes.filter(t => t !== type);
    }
    const newTypes = currentTypes.length === FLAT_ALERT_TYPES.length ? [] : currentTypes;
    const newPrefs = { ...notificationPrefs, weatherAlertTypes: newTypes };
    setNotificationPrefs(newPrefs);
    updateNotificationsMutation.mutate(newPrefs);
  };

  const handleInputChange = (field: keyof typeof profileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = async () => {
    try {
      const { clearRememberToken } = await import('@/lib/nativeSession');
      await clearRememberToken();
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        queryClient.clear();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/api/logout';
    }
  };

  // Fetch the user's most recent Home Wellness Score quiz result
  const { data: quizResult } = useQuery<{
    id: string; score: number; tier: string; completedAt: string; createdAt: string;
  } | null>({
    queryKey: ['/api/quiz-result/me'],
    enabled: !!user,
  });

  // Fetch full user data for subscription details
  const { data: userData } = useQuery<any>({
    queryKey: ['/api/user'],
    enabled: !!user,
  });

  // Referral data query
  const { data: referralData, isLoading: isLoadingReferral } = useQuery<any>({
    queryKey: ['/api/user/referral-code'],
    enabled: !!user,
  });

  const referralCode = (referralData as any)?.referralCode || '';
  const referralLink = (referralData as any)?.referralLink || '';
  const referralCount = (referralData as any)?.referralCount || 0;
  
  // Calculate subscription cost based on plan (3-tier pricing)
  const maxHouses = (userData as any)?.maxHousesAllowed ?? 2;
  const subscriptionCost = maxHouses >= 7 ? 40 : maxHouses >= 3 ? 20 : 5; // Premium Plus = $40, Premium = $20, Base = $5
  const referralsNeeded = subscriptionCost;
  const referralsRemaining = Math.max(0, referralsNeeded - referralCount);
  const progressPercentage = Math.min(100, (referralCount / referralsNeeded) * 100);
  
  const shareMessage = `Join me on MyHomeBase™! Use my referral code ${referralCode} and I get $1 off when you subscribe. You'll get the full MyHomeBase™ experience at regular price while helping me save money! Sign up here: ${referralLink}`;

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

  const downloadImageWithCode = async (imageUrl: string, fileName: string, codePosition: { x: number, y: number, fontSize?: number, color?: string }) => {
    // Guard against missing referral code
    if (!referralCode) {
      toast({
        title: "Referral Code Missing",
        description: "Please wait for your referral code to load",
        variant: "destructive",
      });
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      
      // Wait for image to load and decode
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      // Ensure image is fully decoded before accessing dimensions
      await img.decode();

      // Verify image has valid dimensions
      if (img.width === 0 || img.height === 0) {
        throw new Error('Image failed to load properly');
      }

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Add referral code text
      const fontSize = codePosition.fontSize || 48;
      ctx.font = `700 ${fontSize}px 'Inter', sans-serif`;
      ctx.fillStyle = codePosition.color || '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(referralCode, codePosition.x, codePosition.y);

      // Convert to blob and download
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      if (!blob) {
        throw new Error('Failed to create image blob');
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded!",
        description: "Your personalized graphic has been downloaded",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // House transfer queries and mutations
  const { data: houses, isLoading: housesLoading, isError: housesError } = useQuery<any>({
    queryKey: ['/api/houses'],
    queryFn: async () => {
      const res = await apiRequest('/api/houses', 'GET');
      return res.json();
    },
  });

  const { data: transfers, refetch: refetchTransfers } = useQuery<any>({
    queryKey: ['/api/house-transfers'],
    queryFn: () => apiRequest('/api/house-transfers', 'GET'),
  });

  const createTransferMutation = useMutation({
    mutationFn: async (data: typeof transferData) => {
      return await apiRequest('/api/house-transfers', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Transfer Created",
        description: "House transfer invitation sent successfully!",
      });
      setTransferModalOpen(false);
      setTransferData({ houseId: "", toHomeownerEmail: "", transferNote: "" });
      refetchTransfers();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create house transfer.",
        variant: "destructive",
      });
    }
  });

  const acceptTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      return await apiRequest(`/api/house-transfers/${transferId}/accept`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Transfer Accepted",
        description: "You've accepted the house transfer. The sender must now confirm to complete the transfer.",
      });
      refetchTransfers();
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept house transfer.",
        variant: "destructive",
      });
    }
  });

  const confirmTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      return await apiRequest(`/api/house-transfers/${transferId}/confirm`, 'POST');
    },
    onSuccess: (data: any) => {
      toast({
        title: "Transfer Completed",
        description: "House ownership has been successfully transferred!",
      });
      refetchTransfers();
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm house transfer.",
        variant: "destructive",
      });
    }
  });

  const confirmedPlanLabel = isPaidSubscriber
    ? (currentPlan === 'premium_plus' ? 'Premium+' : currentPlan === 'premium' ? 'Premium' : 'Basic')
    : isInTrial ? 'Trial' : 'Free';
  const planLabel = subscriptionLoading ? 'Loading…' : subscriptionError ? 'Unavailable' : confirmedPlanLabel;
  const housesCount = Array.isArray(houses) ? (houses as any[]).length : null;

  return (
    <div className="min-h-screen" style={{ background: '#ffffff' }}>


      <div className="dash-header">
        <span className="dash-eyebrow">Homeowner</span>
        <div className="dash-title">Account Settings</div>
        <div className="dash-subtitle">Manage your profile and preferences</div>
        <div className="dash-chips">
          <div className="dash-chip">
            <div className={`dash-chip-num ${!subscriptionLoading && !subscriptionError && isPaidSubscriber ? 'good' : !subscriptionLoading && !subscriptionError && isInTrial ? 'warn' : ''}`}>
              {planLabel}
            </div>
            <div className="dash-chip-label">Current plan</div>
          </div>
          <div className="dash-chip">
            <div className="dash-chip-num">{housesLoading ? '—' : housesError ? '!' : housesCount}</div>
            <div className="dash-chip-label">{housesLoading ? 'Loading properties' : housesError ? 'Properties unavailable' : 'Properties'}</div>
          </div>
          <div className="dash-chip">
            <div className="dash-chip-num">{isLoadingReferral ? '—' : referralCount}</div>
            <div className="dash-chip-label">Referrals</div>
          </div>
        </div>
      </div>


      <div className="dash-body">
        <div className="space-y-4 max-w-2xl mx-auto">
          <ActivatingPlanBanner />

          <div className="w-full mb-6 border-b border-gray-200">
            <div
              className="flex w-full touch-pan-x gap-6 overflow-x-auto overscroll-x-contain px-1 pb-1"
              role="tablist"
              aria-label="Account settings sections"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={currentTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  onClick={() => handleTabChange(tab.id)}
                  data-testid={`tab-${tab.id}`}
                  className={`shrink-0 pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#3C258E] focus-visible:ring-offset-2 ${
                    currentTab === tab.id
                      ? 'border-[#3C258E] text-[#3C258E]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div
            id="tabpanel-profile"
            role="tabpanel"
            aria-labelledby="tab-profile"
            className={currentTab === 'profile' ? 'space-y-4 block' : 'hidden'}
          >

          <Link
            href="/achievements"
            className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#DED8F7] bg-white p-4 shadow-sm transition hover:border-[#3C258E] hover:shadow-md"
            data-testid="account-achievements-link"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEEDFE] text-[#3C258E]">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-[#2C0F5B]">Achievements & awards</span>
              <span className="mt-0.5 block text-sm text-gray-500">See your medals, milestones, and progress</span>
            </span>
            <span className="text-sm font-extrabold text-[#3C258E]">View →</span>
          </Link>

          {quizResult && (
            <>
              <p className="dash-section-label">Home Wellness Score™</p>
              <Card style={{ backgroundColor: '#ffffff' }}>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex-shrink-0 flex flex-col items-center justify-center rounded-full w-16 h-16 border-4"
                      style={{
                        borderColor:
                          quizResult.score >= 75 ? '#2c0f5b'
                          : quizResult.score >= 50 ? '#4a9e2f'
                          : quizResult.score >= 25 ? '#e8a020'
                          : '#dc2626',
                      }}
                    >
                      <span
                        className="text-2xl font-bold leading-none"
                        style={{
                          color:
                            quizResult.score >= 75 ? '#2c0f5b'
                            : quizResult.score >= 50 ? '#4a9e2f'
                            : quizResult.score >= 25 ? '#e8a020'
                            : '#dc2626',
                        }}
                      >
                        {quizResult.score}
                      </span>
                      <span className="text-[10px] text-gray-500">/100</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <TrendingUp className="w-4 h-4" style={{ color: '#2c0f5b' }} />
                        <span className="font-semibold text-gray-900 text-sm">Home Wellness Score™</span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium">{quizResult.tier}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Taken {new Date(quizResult.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <Link href="/quiz/" className="text-xs font-medium px-3 py-1.5 rounded-lg border flex-shrink-0" style={{ color: '#2c0f5b', borderColor: '#2c0f5b', textDecoration: 'none' }}>
                      Retake quiz →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </>
          )}


          <p className="dash-section-label">Profile</p>
          <Card style={{ backgroundColor: '#ffffff' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" style={{ color: '#2c0f5b' }}>First Name</Label>
                      <Input
                        id="firstName"
                        data-testid="input-first-name"
                        value={profileData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Enter your first name"
                        style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" style={{ color: '#2c0f5b' }}>Last Name</Label>
                      <Input
                        id="lastName"
                        data-testid="input-last-name"
                        value={profileData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Enter your last name"
                        style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email" style={{ color: '#2c0f5b' }}>Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        data-testid="input-email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email address"
                        className="pl-10"
                        style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" style={{ color: '#2c0f5b' }}>Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        data-testid="input-phone"
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                        className="pl-10"
                        style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" style={{ color: '#2c0f5b' }}>Primary Address</Label>
                    <AddressAutocomplete
                      id="address"
                      data-testid="input-address"
                      value={profileData.address}
                      onChange={(v) => handleInputChange('address', v)}
                      placeholder="Start typing your address…"
                    />
                  </div>

                  <Button
                    type="submit"
                    data-testid="button-save-profile"
                    disabled={updateProfileMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div
            id="tabpanel-security"
            role="tabpanel"
            aria-labelledby="tab-security"
            className={currentTab === 'security' ? 'space-y-4 block' : 'hidden'}
          >

            <p className="dash-section-label">Security</p>

            <Card style={{ backgroundColor: '#ffffff' }}>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>
                  Manage your account security and login preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium" style={{ color: '#2c0f5b' }}>Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-setup-2fa" style={{ color: '#2c0f5b' }}>
                    Setup
                  </Button>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium" style={{ color: '#2c0f5b' }}>Change Password</h4>
                    <p className="text-sm text-gray-600">Update your account password</p>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-change-password" style={{ color: '#2c0f5b' }}>
                    Change
                  </Button>
                </div>

                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium" style={{ color: '#2c0f5b' }}>Sign Out</h4>
                    <p className="text-sm text-gray-600">Sign out of your account</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    data-testid="button-logout"
                    onClick={handleLogout}
                    style={{ color: '#b6a6f4' }}
                  >
                    <LogOut className="w-4 h-4 mr-2" style={{ color: '#b6a6f4' }} />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div
            id="tabpanel-billing"
            role="tabpanel"
            aria-labelledby="tab-billing"
            className={currentTab === 'billing' ? 'space-y-4 block' : 'hidden'}
          >

          <p className="dash-section-label">Subscription</p>

          <Card style={{ backgroundColor: '#ffffff' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription & Billing
              </CardTitle>
              <CardDescription>
                Manage your subscription plan and payment details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="p-4 rounded-lg border" style={{ backgroundColor: 'white' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium" style={{ color: '#2c0f5b' }}>Current Plan</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {subscriptionLoading ? (
                        <Badge className="bg-gray-100 text-gray-700">Loading plan…</Badge>
                      ) : subscriptionError ? (
                        <Badge className="bg-red-100 text-red-700">Plan unavailable</Badge>
                      ) : isPaidSubscriber ? (
                        <Badge className="bg-green-100 text-green-700">
                          <Check className="w-3 h-3 mr-1" />
                          Active - {currentPlan === 'premium_plus' ? 'Premium Plus' : currentPlan === 'premium' ? 'Premium' : 'Basic'}
                        </Badge>
                      ) : isInTrial ? (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Clock className="w-3 h-3 mr-1" />
                          Trial - {trialDaysRemaining} days left
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">Free Plan</Badge>
                      )}
                    </div>
                  </div>
                  {isPaidSubscriber && (
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: '#2c0f5b' }}>
                        ${currentPlan === 'premium_plus' ? '19.99' : currentPlan === 'premium' ? '9.99' : '4.99'}
                      </p>
                      <p className="text-sm text-gray-500">/month</p>
                    </div>
                  )}
                </div>


                {!subscriptionLoading && !subscriptionError && isPaidSubscriber && (
                  <div className="text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Up to {subscriptionMaxHouses === 'unlimited' ? 'unlimited' : subscriptionMaxHouses} homes
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Full maintenance tracking & scheduling
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Home Wellness Score™ & achievements
                    </p>
                  </div>
                )}


                {!subscriptionLoading && !subscriptionError && isFreeUser && (
                  <div className="mt-3 p-3 rounded-lg border" style={{ background: 'var(--purple-tint)', borderColor: 'var(--purple-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--hw-primary)' }}>
                      Upgrade to unlock maintenance tracking, Home Wellness Score™, DIY savings tracker, and more!
                    </p>
                  </div>
                )}


                {isInTrial && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-800">
                      Your trial includes full access to all MyHomeBase™ features. Subscribe before it ends to keep your data.
                    </p>
                  </div>
                )}
              </div>


              {(isFreeUser || isInTrial) && (
                <Link href="/homeowner-pricing">
                  <Button 
                    className="w-full"
                    style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }}
                    size="lg"
                    data-testid="button-subscribe-account"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isInTrial ? 'Subscribe Now' : 'Upgrade to Premium'}
                  </Button>
                </Link>
              )}


              {isPaidSubscriber && (
                <div className="space-y-3">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium" style={{ color: '#2c0f5b' }}>Manage Subscription</h4>
                      <p className="text-sm text-gray-600">Update payment method or change plan</p>
                    </div>
                    <Link href="/homeowner-pricing">
                      <Button variant="outline" size="sm" data-testid="button-manage-subscription">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          <div
            id="tabpanel-notifications"
            role="tabpanel"
            aria-labelledby="tab-notifications"
            className={currentTab === 'notifications' ? 'space-y-4 block' : 'hidden'}
          >

          <p className="dash-section-label">Notifications</p>

          <Card style={{ backgroundColor: '#ffffff' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: '#2c0f5b' }}>Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                    <Switch
                      data-testid="switch-email-notifications"
                      checked={notificationPrefs.emailNotifications}
                      onCheckedChange={(value) => handleNotificationChange('emailNotifications', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: '#2c0f5b' }}>SMS Notifications</p>
                      <p className="text-sm text-gray-600">Receive urgent alerts via text</p>
                    </div>
                    <Switch
                      data-testid="switch-sms-notifications"
                      checked={notificationPrefs.smsNotifications}
                      onCheckedChange={(value) => handleNotificationChange('smsNotifications', value)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: '#2c0f5b' }}>Maintenance Reminders</p>
                      <p className="text-sm text-gray-600">Get notified about upcoming tasks</p>
                    </div>
                    <Switch
                      data-testid="switch-maintenance-reminders"
                      checked={notificationPrefs.maintenanceReminders}
                      onCheckedChange={(value) => handleNotificationChange('maintenanceReminders', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: '#2c0f5b' }}>Appointment Reminders</p>
                      <p className="text-sm text-gray-600">Contractor appointment alerts</p>
                    </div>
                    <Switch
                      data-testid="switch-appointment-reminders"
                      checked={notificationPrefs.appointmentReminders}
                      onCheckedChange={(value) => handleNotificationChange('appointmentReminders', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: '#2c0f5b' }}>Contractor Messages</p>
                      <p className="text-sm text-gray-600">New message notifications</p>
                    </div>
                    <Switch
                      data-testid="switch-contractor-messages"
                      checked={notificationPrefs.contractorMessages}
                      onCheckedChange={(value) => handleNotificationChange('contractorMessages', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: '#2c0f5b' }}>Weekly Digest</p>
                      <p className="text-sm text-gray-600">Summary of weekly activity</p>
                    </div>
                    <Switch
                      data-testid="switch-weekly-digest"
                      checked={notificationPrefs.weeklyDigest}
                      onCheckedChange={(value) => handleNotificationChange('weeklyDigest', value)}
                    />
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium" style={{ color: '#2c0f5b' }}>Severe Weather Alerts</p>
                        <p className="text-sm text-gray-600">Get notified of severe weather warnings for your properties</p>
                      </div>
                      <Switch
                        data-testid="switch-weather-alerts"
                        checked={notificationPrefs.weatherAlerts}
                        onCheckedChange={(value) => handleNotificationChange('weatherAlerts', value)}
                      />
                    </div>

                    {notificationPrefs.weatherAlerts && (
                      <div className="mt-4 ml-2 border-l-2 pl-4 space-y-4" style={{ borderColor: 'var(--purple-tint)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Alert Types</p>
                        {ALL_WEATHER_ALERT_TYPES.map(group => (
                          <div key={group.group}>
                            <p className="text-xs font-medium text-gray-400 mb-2">{group.group}</p>
                            <div className="space-y-2">
                              {group.types.map(type => (
                                <div key={type} className="flex items-center justify-between py-1">
                                  <span className="text-sm text-gray-700">{type}</span>
                                  <Switch
                                    checked={isAlertTypeEnabled(type)}
                                    onCheckedChange={(val) => handleAlertTypeToggle(type, val)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium" style={{ color: '#2c0f5b' }}>Weather Forecast Task Reminders</p>
                      <p className="text-sm text-gray-600">Get reminded to complete overdue maintenance tasks before approaching weather events (freezes, heavy rain, high winds, etc.)</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid="button-test-weather-forecast-reminder"
                        disabled={sendTestWeatherReminderMutation.isPending}
                        onClick={() => sendTestWeatherReminderMutation.mutate()}
                      >
                        {sendTestWeatherReminderMutation.isPending ? "Sending..." : "Send Test"}
                      </Button>
                      <Switch
                        data-testid="switch-weather-forecast-reminders"
                        checked={notificationPrefs.weatherForecastReminders}
                        onCheckedChange={(value) => handleNotificationChange('weatherForecastReminders', value)}
                      />
                    </div>
                  </div>

                  {notificationPrefs.weatherForecastReminders && (
                    <div
                      className="rounded-lg border bg-slate-50 p-4 space-y-4"
                      data-testid="weather-forecast-task-preview"
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#2c0f5b' }}>
                          Tasks linked to weather reminders
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          We only send a reminder when one of these tasks is overdue and matching weather is forecast.
                        </p>
                      </div>

                      {isWeatherForecastPreviewLoading ? (
                        <p className="text-sm text-gray-500" data-testid="status-weather-preview-loading">
                          Checking your maintenance tasks…
                        </p>
                      ) : isWeatherForecastPreviewError ? (
                        <p className="text-sm text-red-700" data-testid="status-weather-preview-error">
                          We couldn’t check your maintenance tasks.{' '}
                          <button type="button" className="font-semibold underline" onClick={() => refetchWeatherForecastPreview()}>
                            Try again
                          </button>
                        </p>
                      ) : weatherForecastPreview?.houses.some(house =>
                        house.triggers.some(trigger => trigger.tasks.length > 0)
                      ) ? (
                        weatherForecastPreview.houses.map(house => {
                          const relevantTriggers = house.triggers.filter(trigger => trigger.tasks.length > 0);
                          if (relevantTriggers.length === 0) return null;

                          return (
                            <div key={house.houseId} className="space-y-3">
                              {weatherForecastPreview.houses.length > 1 && (
                                <p
                                  className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                                  data-testid={`text-weather-preview-house-${house.houseId}`}
                                >
                                  {house.houseName}
                                </p>
                              )}
                              {relevantTriggers.map(trigger => (
                                <div
                                  key={trigger.trigger}
                                  data-testid={`weather-preview-trigger-${house.houseId}-${trigger.trigger}`}
                                >
                                  <p className="text-sm text-gray-700">
                                    If a <span className="font-medium">{trigger.label.toLowerCase()}</span> is forecast, we'd remind you about:
                                  </p>
                                  <ul className="mt-1 ml-5 list-disc text-sm text-gray-600">
                                    {trigger.tasks.map(task => (
                                      <li key={`${task.taskType}-${task.id}`}>{task.title}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500" data-testid="status-weather-preview-empty">
                          No overdue tasks currently match a weather reminder.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


            {user && (
              <div>
                <PushNotificationManager userId={(user as any).id} />
              </div>
            )}
          </div>

          <div
            id="tabpanel-referrals"
            role="tabpanel"
            aria-labelledby="tab-referrals"
            className={currentTab === 'referrals' ? 'space-y-4 block' : 'hidden'}
          >

            <p className="dash-section-label">Referral Rewards</p>

            <Card style={{ backgroundColor: '#ffffff' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Referral Rewards
                </CardTitle>
                <CardDescription>
                  Share MyHomeBase™ with friends and I get $1 off my subscription for each signup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold" style={{ color: '#2c0f5b' }}>
                      {isLoadingReferral ? '...' : referralCount}
                    </div>
                    <div className="text-sm text-gray-600">Friends Referred</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${isLoadingReferral ? '...' : (referralCount * 1).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Earned</div>
                  </div>
                </div>


                <div className="p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: '#2c0f5b' }}>
                      Progress to Free Subscription
                    </span>
                    <span className="text-sm font-bold" style={{ color: '#2c0f5b' }}>
                      {referralCount}/{referralsNeeded}
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-3 mb-2" />
                  <p className="text-center text-[20px]" style={{ color: referralsRemaining === 0 ? '#10b981' : '#dc2626' }}>
                    {referralsRemaining === 0 ? (
                      <span className="font-bold">🎉 You've earned a free subscription!</span>
                    ) : (
                      <>
                        <span className="font-bold">{referralsRemaining} more referral{referralsRemaining !== 1 ? 's' : ''}</span> until your subscription is free!
                      </>
                    )}
                  </p>
                </div>


                <div>
                  <Label style={{ color: '#2c0f5b' }}>Your Referral Code</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={referralCode}
                      readOnly
                      data-testid="input-referral-code"
                      className="font-mono text-lg font-bold text-center"
                      style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                    />
                    <Button
                      onClick={() => copyToClipboard(referralCode)}
                      variant="outline"
                      size="icon"
                      data-testid="button-copy-code"
                      title="Copy referral code"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>


                <div>
                  <Label style={{ color: '#2c0f5b' }}>Share with Friends</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      onClick={shareViaText}
                      variant="outline"
                      size="sm"
                      data-testid="button-share-text"
                      className="flex items-center gap-2"
                      style={{ color: '#6B7280' }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Text Message
                    </Button>
                    <Button
                      onClick={shareViaWhatsApp}
                      variant="outline"
                      size="sm"
                      data-testid="button-share-whatsapp"
                      className="flex items-center gap-2"
                      style={{ color: '#25D366' }}
                    >
                      <Share2 className="w-4 h-4" />
                      WhatsApp
                    </Button>
                    <Button
                      onClick={shareViaFacebook}
                      variant="outline"
                      size="sm"
                      data-testid="button-share-facebook"
                      className="flex items-center gap-2"
                      style={{ color: '#1877F2' }}
                    >
                      <Share2 className="w-4 h-4" />
                      Facebook
                    </Button>
                    <Button
                      onClick={shareViaTwitter}
                      variant="outline"
                      size="sm"
                      data-testid="button-share-twitter"
                      className="flex items-center gap-2"
                      style={{ color: '#1DA1F2' }}
                    >
                      <Share2 className="w-4 h-4" />
                      Twitter
                    </Button>
                  </div>
                </div>


                <div>
                  <Label style={{ color: '#2c0f5b' }}>Referral Link</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={referralLink}
                      readOnly
                      data-testid="input-referral-link"
                      className="text-sm"
                      style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                    />
                    <Button
                      onClick={() => copyToClipboard(referralLink)}
                      variant="outline"
                      size="icon"
                      data-testid="button-copy-link"
                      title="Copy referral link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Share this link and I get $1 off when someone subscribes using my code. New users pay regular price but help me save money!
                  </p>
                </div>
              </CardContent>
            </Card>


            <p className="dash-section-label">Shareable Graphics</p>
            <Card style={{ backgroundColor: '#ffffff' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Shareable Graphics
                </CardTitle>
                <CardDescription>
                  Download personalized graphics with your referral code to share on social media
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Click download on any graphic below to get a personalized version with your referral code <span className="font-mono font-bold" style={{ color: '#2c0f5b' }}>{referralCode}</span> already included!
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="aspect-square rounded overflow-hidden border-2 border-gray-200">
                      <img src={instagramPostImg} alt="Instagram Post Template" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm" style={{ color: '#2c0f5b' }}>Instagram Post</h4>
                      <p className="text-xs text-gray-600">Square format - 1080x1080px</p>
                      <Button
                        onClick={() => downloadImageWithCode(instagramPostImg, `homebase-referral-instagram-${referralCode}.png`, { x: 312, y: 734, fontSize: 39, color: '#2c0f5b' })}
                        size="sm"
                        className="w-full"
                        style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }}
                        data-testid="button-download-instagram-post"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>


                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="aspect-[9/16] rounded overflow-hidden border-2 border-gray-200 max-h-64">
                      <img src={instagramStoryImg} alt="Instagram Story Template" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm" style={{ color: '#2c0f5b' }}>Instagram Story</h4>
                      <p className="text-xs text-gray-600">Vertical format - 1080x1920px</p>
                      <Button
                        onClick={() => downloadImageWithCode(instagramStoryImg, `homebase-referral-story-${referralCode}.png`, { x: 372, y: 878, color: '#2c0f5b' })}
                        size="sm"
                        className="w-full"
                        style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }}
                        data-testid="button-download-instagram-story"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>


                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="aspect-[16/9] rounded overflow-hidden border-2 border-gray-200">
                      <img src={facebookTwitterImg} alt="Facebook/Twitter Template" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm" style={{ color: '#2c0f5b' }}>Facebook/Twitter</h4>
                      <p className="text-xs text-gray-600">Horizontal - 1200x630px</p>
                      <Button
                        onClick={() => downloadImageWithCode(facebookTwitterImg, `homebase-referral-facebook-${referralCode}.png`, { x: 1200, y: 964, fontSize: 43 })}
                        size="sm"
                        className="w-full"
                        style={{ background: 'linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-accent) 100%)' }}
                        data-testid="button-download-facebook-twitter"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Download these graphics and share them on your social media. When friends sign up using your code, you'll earn $1 off your subscription for each referral!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div
            id="tabpanel-properties"
            role="tabpanel"
            aria-labelledby="tab-properties"
            className={currentTab === 'properties' ? 'space-y-4 block' : 'hidden'}
          >

            <p className="dash-section-label">Properties</p>

            <Card>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEEDFE] text-[#3C258E]">
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#2C0F5B]">Manage Properties</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Switch homes, add a property, or update property details.
                    </p>
                  </div>
                </div>
                <Link
                  href="/my-home"
                  className="inline-flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-xl bg-[#3C258E] px-5 text-sm font-bold text-white transition-colors hover:bg-[#2C0F5B]"
                  data-testid="link-manage-properties"
                >
                  Manage Properties
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            <p className="dash-section-label">House Transfers</p>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  House Transfers
                </CardTitle>
                <CardDescription>Transfer house ownership to another homeowner. Transfer all maintenance records and tasks to new homeowner. New homeowner must have a Homebase account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" data-testid="button-create-transfer">
                      <Plus className="h-4 w-4 mr-2" />
                      Transfer a House
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="[&>button]:text-white [&>button:hover]:text-white">
                    <DialogHeader>
                      <DialogTitle style={{ color: '#ffffff' }}>Transfer House Ownership</DialogTitle>
                      <DialogDescription style={{ color: '#ffffff' }}>
                        Send an invitation to transfer ownership of one of your houses to another homeowner.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="house-select" style={{ color: '#ffffff' }}>Select House</Label>
                        <Select 
                          value={transferData.houseId} 
                          onValueChange={(value) => setTransferData(prev => ({ ...prev, houseId: value }))}
                        >
                          <SelectTrigger data-testid="select-house">
                            <SelectValue placeholder="Choose a house to transfer" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(houses) && houses.map((house: any) => (
                              <SelectItem key={house.id} value={house.id}>
                                {house.address || house.nickname || `House ${house.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="recipient-email" style={{ color: '#ffffff' }}>Recipient Email</Label>
                        <Input
                          id="recipient-email"
                          type="email"
                          placeholder="Enter recipient's email address"
                          value={transferData.toHomeownerEmail}
                          onChange={(e) => setTransferData(prev => ({ ...prev, toHomeownerEmail: e.target.value }))}
                          data-testid="input-recipient-email"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="transfer-note" style={{ color: '#ffffff' }}>Transfer Note (Optional)</Label>
                        <Textarea
                          id="transfer-note"
                          placeholder="Add a note for the recipient..."
                          value={transferData.transferNote}
                          onChange={(e) => setTransferData(prev => ({ ...prev, transferNote: e.target.value }))}
                          data-testid="textarea-transfer-note"
                        />
                      </div>
                      
                      <Button 
                        onClick={() => createTransferMutation.mutate(transferData)}
                        disabled={!transferData.houseId || !transferData.toHomeownerEmail || createTransferMutation.isPending}
                        className="w-full"
                        data-testid="button-send-transfer"
                      >
                        {createTransferMutation.isPending ? (
                          "Sending..."
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Transfer Invitation
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>


                {Array.isArray(transfers) && (transfers as any).filter((t: any) => t.status === 'pending' && t.toHomeownerEmail === (user as any)?.email).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--theme-accent)' }}>Incoming House Transfers</h4>
                    <div className="space-y-2">
                      {Array.isArray(transfers) && (transfers as any).filter((t: any) => t.status === 'pending' && t.toHomeownerEmail === (user as any)?.email).map((transfer: any) => (
                        <div key={transfer.id} className="flex flex-col gap-3 p-4 border rounded-lg" style={{ background: 'var(--purple-tint)' }}>
                          <div className="flex-1">
                            <p className="font-medium text-sm" data-testid={`transfer-from-${transfer.id}`}>
                              From: {transfer.fromHomeownerId}
                            </p>
                            {transfer.transferNote && (
                              <p className="text-sm text-gray-600 mt-1 italic">
                                "{transfer.transferNote}"
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Received on {new Date(transfer.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Reject transfer logic would go here
                                toast({
                                  title: "Not Implemented",
                                  description: "Reject functionality coming soon.",
                                  variant: "destructive",
                                });
                              }}
                              data-testid={`button-reject-${transfer.id}`}
                            >
                              Decline
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => acceptTransferMutation.mutate(transfer.id)}
                              disabled={acceptTransferMutation.isPending}
                              data-testid={`button-accept-${transfer.id}`}
                            >
                              {acceptTransferMutation.isPending ? "Accepting..." : "Accept Transfer"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {Array.isArray(transfers) && (transfers as any).filter((t: any) => t.status === 'accepted').length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--theme-accent)' }}>Transfers Awaiting Your Confirmation</h4>
                    <div className="space-y-2">
                      {Array.isArray(transfers) && (transfers as any).filter((t: any) => t.status === 'accepted').map((transfer: any) => (
                        <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg" style={{ background: 'var(--purple-tint)' }}>
                          <div className="flex-1">
                            <p className="font-medium text-sm" data-testid={`transfer-email-${transfer.id}`}>
                              To: {transfer.toHomeownerEmail}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Accepted on {new Date(transfer.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" data-testid={`transfer-status-${transfer.id}`}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Accepted
                            </Badge>
                            <Button 
                              size="sm"
                              onClick={() => confirmTransferMutation.mutate(transfer.id)}
                              disabled={confirmTransferMutation.isPending}
                              data-testid={`button-confirm-${transfer.id}`}
                            >
                              {confirmTransferMutation.isPending ? "Confirming..." : "Confirm Transfer"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {Array.isArray(transfers) && transfers.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Recent Transfers</h4>
                    <div className="space-y-2">
                      {Array.isArray(transfers) && transfers.slice(0, 3).map((transfer: any) => (
                        <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm" data-testid={`transfer-email-${transfer.id}`}>
                              To: {transfer.toHomeownerEmail}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transfer.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              transfer.status === 'completed' ? "default" : 
                              transfer.status === 'accepted' ? "secondary" : 
                              transfer.status === 'pending' ? "outline" : 
                              "destructive"
                            }
                            data-testid={`transfer-status-${transfer.id}`}
                          >
                            {transfer.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {transfer.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {transfer.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(transfers) && transfers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No house transfers yet. Click "Transfer a House" to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div
            id="tabpanel-account"
            role="tabpanel"
            aria-labelledby="tab-account"
            className={currentTab === 'account' ? 'space-y-4 block' : 'hidden'}
          >

            <Card>
              <CardHeader>
                <CardTitle>Account Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <span className="text-gray-600">Account Type:</span>
                  <span className="ml-2 font-medium">Homeowner</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="ml-2 font-medium">
                    {(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Properties:</span>
                  <span className="ml-2 font-medium">
                    {housesLoading ? 'Loading…' : housesError ? 'Unable to load' : `${housesCount} Active`}
                  </span>
                </div>
              </CardContent>
            </Card>


            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Cancel Account</CardTitle>
                <CardDescription>
                  Permanently cancel your MyHomeBase™ account. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" data-testid="button-cancel-account">
                      Cancel My Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[calc(100%-2rem)] max-w-lg overflow-x-hidden">
                    <DialogHeader>
                      <DialogTitle>Are you absolutely sure?</DialogTitle>
                      <DialogDescription asChild>
                        <div className="break-words">
                          This will permanently cancel your MyHomeBase™ account. Your subscription will be cancelled and you will lose access to:
                          <ul className="mt-2 list-outside list-disc space-y-1 pl-5">
                            <li>All your properties and maintenance schedules</li>
                            <li>Service records and contractor conversations</li>
                            <li>Custom maintenance tasks and reminders</li>
                            <li>Your referral rewards and achievements</li>
                          </ul>
                          <p className="mt-3 font-semibold text-red-600">
                            This action cannot be undone.
                          </p>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto" variant="outline" data-testid="button-cancel-account-dialog-no">
                          No, Keep My Account
                        </Button>
                      </DialogTrigger>
                      <Button 
                        className="w-full sm:w-auto"
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
      </div>

    </div>
  );
}

type WeatherForecastPreview = {
  houses: Array<{
    houseId: string;
    houseName: string;
    triggers: Array<{
      trigger: string;
      label: string;
      tasks: Array<{
        id: string;
        title: string;
        category: string;
        priority: string;
        taskType: 'maintenance' | 'custom';
      }>;
    }>;
  }>;
};
