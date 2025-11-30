import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Users, User as UserIcon, LogOut, MessageCircle, Trophy, Shield, Calendar, Crown, HelpCircle, Menu, Wrench, Building2, Package, LayoutDashboard, FileText, Gift, CreditCard, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Notifications } from "@/components/notifications";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, Notification } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import logoImage from '@assets/homebase-app-logo_1764510844221.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User | undefined;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Check if user is admin
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean);
  const isAdmin = typedUser?.email && adminEmails.includes(typedUser.email);

  // Fetch user details for trial info (both homeowners and contractors)
  const { data: userData } = useQuery<User>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const res = await apiRequest('/api/user', 'GET');
      return res.json();
    },
    enabled: !!user && (typedUser?.role === 'homeowner' || typedUser?.role === 'contractor'),
  });

  // Fetch unread notifications for tab indicators
  const { data: unreadNotifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications/unread'],
    enabled: isAuthenticated && (typedUser?.role === 'homeowner' || typedUser?.role === 'contractor'),
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Helper to check if a tab has unread notifications
  const hasNotificationsForTab = (tabName: string) => {
    if (!unreadNotifications.length) return false;
    
    switch (tabName) {
      case 'messages':
        return unreadNotifications.some(n => n.type === 'message');
      case 'maintenance':
        return unreadNotifications.some(n => n.category === 'maintenance');
      case 'dashboard':
        // Show for appointment notifications
        return unreadNotifications.some(n => n.category === 'appointment');
      default:
        return false;
    }
  };

  // Calculate trial status (both homeowners and contractors)
  const trialEndsAt = userData?.trialEndsAt ? new Date(userData.trialEndsAt) : null;
  const now = new Date();
  const isTrialActive = trialEndsAt && trialEndsAt > now && userData?.subscriptionStatus === 'trialing';
  const daysRemaining = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // PWA Install handling
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
      return;
    }

    // Function to check dismissal status
    const checkDismissal = () => {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (dismissed && Date.now() - dismissedTime < sevenDaysInMs) {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true; // Is dismissed
      }
      return false; // Not dismissed
    };

    // Initial check
    if (checkDismissal()) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Double-check dismissal before making installable
      if (!checkDismissal()) {
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      localStorage.removeItem('pwa-install-dismissed');
    };

    // Listen for storage changes (when banner dismisses)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pwa-install-dismissed') {
        checkDismissal();
      }
    };

    // Listen for custom event when banner dismisses (for same-tab updates)
    const handleDismissEvent = () => {
      checkDismissal();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pwa-dismissed', handleDismissEvent);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pwa-dismissed', handleDismissEvent);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed from menu');
    }

    // Hide the install option
    setDeferredPrompt(null);
    setIsInstallable(false);
    setMobileMenuOpen(false);
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
        // Redirect to landing page
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: redirect to landing page
      window.location.href = '/';
    }
  };

  return (
    <header 
      className={typedUser?.role === 'contractor' 
        ? 'bg-[#1560a2] text-white border-b border-white/20 shadow-sm sticky top-0 z-50' 
        : 'bg-background border-b border-border shadow-sm sticky top-0 z-50'
      }
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-2">
            {/* Hamburger Menu Button - Always Visible */}
            {isAuthenticated && typedUser && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`p-2 relative ${typedUser?.role === 'contractor' ? 'hover:bg-white/20 text-white' : ''}`}
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                    {unreadNotifications.length > 0 && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" aria-label={`${unreadNotifications.length} unread notifications`} />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader className={`p-4 border-b ${typedUser.role === 'contractor' ? 'bg-[#1560a2] text-white' : 'bg-primary/5'}`}>
                    <SheetTitle className={typedUser.role === 'contractor' ? 'text-white' : 'text-primary'}>
                      Menu
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col p-2" aria-label="Mobile navigation">
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                        <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/admin' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                          <Shield className="w-4 h-4" />
                          Admin
                        </button>
                      </Link>
                    )}
                    {typedUser.role === 'homeowner' && (
                      <>
                        <Link href="/maintenance" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/maintenance' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <Wrench className="w-4 h-4" />
                            Maintenance
                            {hasNotificationsForTab('maintenance') && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                            )}
                          </button>
                        </Link>
                        <Link href="/contractors" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/contractors' || location === '/find-contractors' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <Building2 className="w-4 h-4" />
                            Contractors
                          </button>
                        </Link>
                        <Link href="/service-records" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/service-records' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <FileText className="w-4 h-4" />
                            Service Records
                          </button>
                        </Link>
                        <Link href="/products" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/products' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <Package className="w-4 h-4" />
                            Products
                          </button>
                        </Link>
                        <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/messages' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <MessageCircle className="w-4 h-4" />
                            Messages
                            {hasNotificationsForTab('messages') && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                            )}
                          </button>
                        </Link>
                        <Link href="/achievements" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/achievements' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <Trophy className="w-4 h-4" />
                            Achievements
                          </button>
                        </Link>
                        <Link href="/homeowner-referral" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/homeowner-referral' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <Gift className="w-4 h-4" />
                            Referral
                          </button>
                        </Link>
                        <Link href="/account" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/account' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <UserIcon className="w-4 h-4" />
                            Account
                          </button>
                        </Link>
                        <Link href="/support" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location.startsWith('/support') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <HelpCircle className="w-4 h-4" />
                            Support
                          </button>
                        </Link>
                        
                        {/* PWA Install option for homeowners */}
                        {isInstallable && (
                          <button
                            onClick={handleInstallClick}
                            className="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm hover:bg-muted text-purple-600 font-medium"
                            data-testid="button-install-app-menu"
                          >
                            <Download className="w-4 h-4" />
                            Install App
                          </button>
                        )}
                      </>
                    )}
                    {typedUser.role === 'contractor' && (
                      <>
                        <Link href="/contractor-dashboard" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/contractor-dashboard' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-muted'}`}>
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                            {hasNotificationsForTab('dashboard') && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                            )}
                          </button>
                        </Link>
                        <Link href="/manage-team" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/manage-team' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-muted'}`}>
                            <Users className="w-4 h-4" />
                            Manage Team
                          </button>
                        </Link>
                        <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/messages' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-muted'}`}>
                            <MessageCircle className="w-4 h-4" />
                            Messages
                            {hasNotificationsForTab('messages') && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                            )}
                          </button>
                        </Link>
                        <Link href="/crm" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/crm' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-muted'}`}>
                            <Wrench className="w-4 h-4" />
                            CRM
                          </button>
                        </Link>
                        <Link href="/contractor-referral" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/contractor-referral' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-muted'}`}>
                            <Gift className="w-4 h-4" />
                            Referral
                          </button>
                        </Link>
                        <Link href="/contractor-profile" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/contractor-profile' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-muted'}`}>
                            <UserIcon className="w-4 h-4" />
                            Account
                          </button>
                        </Link>
                        <Link href="/support" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location.startsWith('/support') ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-muted'}`}>
                            <HelpCircle className="w-4 h-4" />
                            Support
                          </button>
                        </Link>
                        
                        {/* PWA Install option for contractors */}
                        {isInstallable && (
                          <button
                            onClick={handleInstallClick}
                            className="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm hover:bg-muted text-blue-600 font-medium"
                            data-testid="button-install-app-menu"
                          >
                            <Download className="w-4 h-4" />
                            Install App
                          </button>
                        )}
                      </>
                    )}
                    {typedUser.role === 'agent' && (
                      <>
                        <Link href="/agent-dashboard" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/agent-dashboard' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                          </button>
                        </Link>
                        <Link href="/agent-referral" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/agent-referral' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <Gift className="w-4 h-4" />
                            Referral
                          </button>
                        </Link>
                        <Link href="/agent-account" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location === '/agent-account' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <UserIcon className="w-4 h-4" />
                            Account
                          </button>
                        </Link>
                        <Link href="/support" onClick={() => setMobileMenuOpen(false)}>
                          <button className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${location.startsWith('/support') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                            <HelpCircle className="w-4 h-4" />
                            Support
                          </button>
                        </Link>
                        
                        {/* PWA Install option for agents */}
                        {isInstallable && (
                          <button
                            onClick={handleInstallClick}
                            className="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm hover:bg-muted text-purple-600 font-medium"
                            data-testid="button-install-app-menu"
                          >
                            <Download className="w-4 h-4" />
                            Install App
                          </button>
                        )}
                      </>
                    )}
                    
                    {/* Divider */}
                    <div className="my-2 border-t border-border" />
                    
                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm hover:bg-muted text-red-600"
                      data-testid="button-logout-menu"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            
            <Link href="/" aria-label="Home" data-testid="link-home-logo">
              <button
                className={`
                  p-1.5 sm:p-2 rounded-xl transition-all duration-200 
                  ${typedUser?.role === 'contractor' 
                    ? 'hover:bg-white/20 active:bg-white/30' 
                    : 'hover:bg-primary/10 active:bg-primary/20'
                  }
                `}
                aria-label="Return to homepage"
              >
                <img 
                  src={logoImage} 
                  alt="Home Base" 
                  className="h-8 sm:h-10 w-auto"
                />
              </button>
            </Link>
          </div>
          
          {/* Right Side - Notifications and Sign In */}
          <div className="flex items-center gap-2">
            {/* Notifications Bell - For homeowners and contractors */}
            {isAuthenticated && (typedUser?.role === 'homeowner' || typedUser?.role === 'contractor') && (
              <div className={typedUser?.role === 'contractor' ? 'text-white' : ''}>
                <Notifications />
              </div>
            )}
            
              {/* Sign In Button for Unauthenticated Users */}
            {!isAuthenticated && (
              <Button 
                onClick={() => window.location.href = '/signin'}
                aria-label="Sign in"
                className="text-sm h-9 px-3 sm:px-4"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Trial Countdown Banner - For homeowners and contractors on trial */}
      {isTrialActive && (
        <div className={typedUser?.role === 'homeowner' ? "bg-purple-50 border-b border-purple-200" : "bg-blue-100 border-b border-blue-200"}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                <Calendar className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 ${typedUser?.role === 'homeowner' ? 'text-purple-600' : 'text-blue-700'}`} />
                <span className={`text-xs sm:text-sm font-medium truncate ${typedUser?.role === 'homeowner' ? 'text-purple-900' : 'text-blue-900'}`}>
                  <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> trial
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/billing'}
                className={`text-xs h-7 px-2 sm:px-3 flex-shrink-0 ${typedUser?.role === 'homeowner' ? "border-purple-600 text-purple-600 hover:bg-purple-100" : "border-blue-700 text-blue-700 hover:bg-blue-200"}`}
                data-testid="button-trial-upgrade"
              >
                <Crown className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">{typedUser?.role === 'homeowner' ? 'Choose Plan' : 'Subscribe'}</span>
                <span className="sm:hidden">Upgrade</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
