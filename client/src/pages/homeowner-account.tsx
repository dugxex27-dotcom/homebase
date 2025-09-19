import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
  DollarSign
} from "lucide-react";
import PushNotificationManager from "@/components/push-notification-manager";

export default function HomeownerAccount() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for basic profile information
  const [profileData, setProfileData] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    email: (user as any)?.email || "",
    phone: "",
    address: ""
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

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      return await apiRequest('PATCH', '/api/homeowner/profile', data);
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
      return await apiRequest('PATCH', '/api/homeowner/notifications/preferences', prefs);
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

  // Generate referral code if user doesn't have one
  const generateReferralCode = () => {
    const userId = (user as any)?.id || 'user';
    return userId.slice(0, 8).toUpperCase();
  };

  const referralCode = (user as any)?.referralCode || generateReferralCode();
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;
  const shareMessage = `Join me on Home Base! Use my referral code ${referralCode} and we both get $1 off our subscription. Sign up here: ${referralLink}`;

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2c0f5b' }}>
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'white' }}>Account Settings</h1>
          <p style={{ color: '#b6a6f4' }}>Manage your profile information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
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
                  <Button variant="outline" size="sm" data-testid="button-setup-2fa" style={{ color: 'white' }}>
                    Setup
                  </Button>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium" style={{ color: '#2c0f5b' }}>Change Password</h4>
                    <p className="text-sm text-gray-600">Update your account password</p>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-change-password" style={{ color: 'white' }}>
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

          {/* Notification Preferences */}
          <div className="space-y-6">
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
              <PushNotificationManager userId={(user as any).id} />
            )}

            {/* Referral Sharing */}
            <Card style={{ backgroundColor: '#f2f2f2' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Referral Rewards
                </CardTitle>
                <CardDescription>
                  Share Home Base with friends and earn $1 off your subscription for each signup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Referral Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold" style={{ color: '#2c0f5b' }}>
                      {(user as any)?.referralCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">Friends Referred</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${((user as any)?.referralCount || 0) * 1}.00
                    </div>
                    <div className="text-sm text-gray-600">Total Earned</div>
                  </div>
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
                    Share this link and both you and your friend get $1 off when they subscribe!
                  </p>
                </div>
              </CardContent>
            </Card>

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
          </div>
        </div>
      </div>
    </div>
  );
}