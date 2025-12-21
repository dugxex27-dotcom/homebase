import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
  CreditCard
} from "lucide-react";
import { Link } from "wouter";
import PushNotificationManager from "@/components/push-notification-manager";
import { HomeownerConnectionCodes } from "@/components/ConnectionCodes";
import instagramPostImg from '@assets/Smart_Maintenance_1766279678897.png';
import instagramStoryImg from '@assets/ChatGPT_Image_Dec_20,_2025,_06_39_10_PM_1766274706070.png';
import facebookTwitterImg from '@assets/generated_images/Facebook_Twitter_share_image_8823d9cc.png';

export default function HomeownerAccount() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for basic profile information
  const [profileData, setProfileData] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    email: (user as any)?.email || "",
    phone: (user as any)?.phone || "",
    address: (user as any)?.address || ""
  });

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    smsNotifications: false,
    maintenanceReminders: true,
    appointmentReminders: true,
    contractorMessages: true,
    weeklyDigest: false
  });

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

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleNotificationChange = (key: keyof typeof notificationPrefs, value: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);
    updateNotificationsMutation.mutate(newPrefs);
  };

  const handleInputChange = (field: keyof typeof profileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Clear all cached queries
        queryClient.clear();
        // Reload the page to reset the app state
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: try the GET endpoint
      window.location.href = '/api/logout';
    }
  };

  // Fetch full user data for subscription details
  const { data: userData } = useQuery({
    queryKey: ['/api/user'],
    enabled: !!user,
  });

  // Referral data query
  const { data: referralData, isLoading: isLoadingReferral } = useQuery({
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
  
  const shareMessage = `Join me on HomeBase! Use my referral code ${referralCode} and I get $1 off when you subscribe. You'll get the full HomeBase experience at regular price while helping me save money! Sign up here: ${referralLink}`;

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

  const downloadImageWithCode = async (imageUrl: string, fileName: string, codePosition: { x: number, y: number, fontSize?: number }) => {
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
      ctx.font = `700 ${fontSize}px Quicksand, sans-serif`;
      ctx.fillStyle = '#ffffff';
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
  const { data: houses } = useQuery({
    queryKey: ['/api/houses'],
    queryFn: () => apiRequest('/api/houses', 'GET'),
  });

  const { data: transfers, refetch: refetchTransfers } = useQuery({
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Account Settings</h1>
          <p className="text-gray-600">Manage your profile information and preferences</p>
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Basic Profile */}
          <Card style={{ backgroundColor: '#f2f2f2' }}>
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
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="address"
                        data-testid="input-address"
                        value={profileData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Enter your primary address"
                        className="pl-10"
                        style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                      />
                    </div>
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

            {/* Account Security */}
            <Card style={{ backgroundColor: '#f2f2f2' }}>
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

          {/* Notification Preferences */}
          <Card style={{ backgroundColor: '#f2f2f2' }}>
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
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications */}
            {user && (
              <div>
                <PushNotificationManager userId={(user as any).id} />
              </div>
            )}

            {/* Referral Sharing */}
            <Card style={{ backgroundColor: '#f2f2f2' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Referral Rewards
                </CardTitle>
                <CardDescription>
                  Share HomeBase with friends and I get $1 off my subscription for each signup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Referral Stats */}
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

                {/* Progress to Free Subscription */}
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

                {/* Referral Code */}
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

                {/* Share Options */}
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

                {/* Copy Link */}
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

            {/* Shareable Graphics */}
            <Card style={{ backgroundColor: '#f2f2f2' }}>
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
                  {/* Instagram Post */}
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="aspect-square rounded overflow-hidden border-2 border-gray-200">
                      <img src={instagramPostImg} alt="Instagram Post Template" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm" style={{ color: '#2c0f5b' }}>Instagram Post</h4>
                      <p className="text-xs text-gray-600">Square format - 1080x1080px</p>
                      <Button
                        onClick={() => downloadImageWithCode(instagramPostImg, `homebase-referral-instagram-${referralCode}.png`, { x: 696, y: 974, fontSize: 39 })}
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        data-testid="button-download-instagram-post"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* Instagram Story */}
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="aspect-[9/16] rounded overflow-hidden border-2 border-gray-200 max-h-64">
                      <img src={instagramStoryImg} alt="Instagram Story Template" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm" style={{ color: '#2c0f5b' }}>Instagram Story</h4>
                      <p className="text-xs text-gray-600">Vertical format - 1080x1920px</p>
                      <Button
                        onClick={() => downloadImageWithCode(instagramStoryImg, `homebase-referral-story-${referralCode}.png`, { x: 660, y: 1358 })}
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        data-testid="button-download-instagram-story"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* Facebook/Twitter */}
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="aspect-[16/9] rounded overflow-hidden border-2 border-gray-200">
                      <img src={facebookTwitterImg} alt="Facebook/Twitter Template" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm" style={{ color: '#2c0f5b' }}>Facebook/Twitter</h4>
                      <p className="text-xs text-gray-600">Horizontal - 1200x630px</p>
                      <Button
                        onClick={() => downloadImageWithCode(facebookTwitterImg, `homebase-referral-facebook-${referralCode}.png`, { x: 600, y: 580 })}
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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

            {/* House Transfers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  House Transfers
                </CardTitle>
                <CardDescription>Transfer house ownership to another homeowner. Transfer all maintenance records and tasks to new homeowner. New homeowner must have a Homebase account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create Transfer Button */}
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

                {/* Incoming Transfers (pending acceptance) */}
                {Array.isArray(transfers) && (transfers as any).filter((t: any) => t.status === 'pending' && t.toHomeownerEmail === (user as any)?.email).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-purple-600">Incoming House Transfers</h4>
                    <div className="space-y-2">
                      {Array.isArray(transfers) && (transfers as any).filter((t: any) => t.status === 'pending' && t.toHomeownerEmail === (user as any)?.email).map((transfer: any) => (
                        <div key={transfer.id} className="flex flex-col gap-3 p-4 border rounded-lg bg-purple-50">
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

                {/* Transfers Awaiting Confirmation */}
                {Array.isArray(transfers) && (transfers as any).filter((t: any) => t.status === 'accepted').length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-purple-600">Transfers Awaiting Your Confirmation</h4>
                    <div className="space-y-2">
                      {Array.isArray(transfers) && (transfers as any).filter((t: any) => t.status === 'accepted').map((transfer: any) => (
                        <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg bg-purple-50">
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

                {/* Existing Transfers List */}
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

            {/* Contractor Connection Codes */}
            <HomeownerConnectionCodes />

            {/* Account Overview */}
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
                  <span className="ml-2 font-medium">2 Active</span>
                </div>
              </CardContent>
            </Card>

            {/* Cancel Account */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Cancel Account</CardTitle>
                <CardDescription>
                  Permanently cancel your HomeBase account. This action cannot be undone.
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
                        This will permanently cancel your HomeBase account. Your subscription will be cancelled and you will lose access to:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>All your properties and maintenance schedules</li>
                          <li>Service records and contractor conversations</li>
                          <li>Custom maintenance tasks and reminders</li>
                          <li>Your referral rewards and achievements</li>
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
    </div>
  );
}