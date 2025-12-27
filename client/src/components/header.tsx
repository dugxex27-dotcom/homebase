import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Calendar, Crown, LogOut, Wrench, Building2, Package, MessageCircle, Trophy, Gift, User as UserIcon, HelpCircle, FileText, LayoutDashboard, Users, Download, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Notifications } from "@/components/notifications";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, Notification } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import logoImage from '@assets/homebase-app-logo-color_1765290883467.png';

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

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = typedUser?.email && adminEmails.includes(typedUser.email.toLowerCase());

  const { data: userData } = useQuery<User>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const res = await apiRequest('/api/user', 'GET');
      return res.json();
    },
    enabled: !!user && (typedUser?.role === 'homeowner' || typedUser?.role === 'contractor'),
  });

  const { data: unreadNotifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications/unread'],
    enabled: isAuthenticated && (typedUser?.role === 'homeowner' || typedUser?.role === 'contractor'),
    refetchInterval: 30000,
  });

  const hasNotificationsForTab = (tabName: string) => {
    if (!unreadNotifications.length) return false;
    switch (tabName) {
      case 'messages':
        return unreadNotifications.some(n => n.type === 'message');
      case 'maintenance':
        return unreadNotifications.some(n => n.category === 'maintenance');
      case 'dashboard':
        return unreadNotifications.some(n => n.category === 'appointment');
      default:
        return false;
    }
  };

  const trialEndsAt = userData?.trialEndsAt ? new Date(userData.trialEndsAt) : null;
  const now = new Date();
  const isTrialActive = trialEndsAt && trialEndsAt > now && userData?.subscriptionStatus === 'trialing';
  const daysRemaining = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
      return;
    }

    const checkDismissal = () => {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (dismissed && Date.now() - dismissedTime < sevenDaysInMs) {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    };

    if (checkDismissal()) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      if (!checkDismissal()) setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      localStorage.removeItem('pwa-install-dismissed');
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pwa-install-dismissed') checkDismissal();
    };

    const handleDismissEvent = () => checkDismissal();

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
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') console.log('PWA installed from menu');
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
        queryClient.clear();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  const mobileNavItemClass = (path: string | string[]) => {
    const paths = Array.isArray(path) ? path : [path];
    const isActive = paths.some(p => location === p || location.startsWith(p + '/'));
    const isContractor = typedUser?.role === 'contractor';
    return `w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 text-sm ${
      isActive 
        ? isContractor ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-purple-50 text-purple-700 font-medium'
        : 'hover:bg-muted'
    }`;
  };

  return (
    <header className="bg-white border-b border-[#fafafa] sticky top-0 z-50">
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-2">
            {isAuthenticated && typedUser && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden p-2 relative"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                    {unreadNotifications.length > 0 && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader className="p-4 border-b bg-purple-50">
                    <SheetTitle className="text-purple-700">Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col p-2" aria-label="Mobile navigation">
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                        <button className={mobileNavItemClass('/admin')} data-testid="mobile-nav-admin">
                          <Shield className="w-4 h-4" />
                          Admin
                        </button>
                      </Link>
                    )}
                    {typedUser.role === 'homeowner' && (
                      <>
                        <Link href="/maintenance" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/maintenance')}>
                            <Wrench className="w-4 h-4" />
                            Maintenance
                            {hasNotificationsForTab('maintenance') && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                            )}
                          </button>
                        </Link>
                        <Link href="/contractors" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass(['/contractors', '/find-contractors'])}>
                            <Building2 className="w-4 h-4" />
                            Contractors
                          </button>
                        </Link>
                        <Link href="/service-records" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/service-records')}>
                            <FileText className="w-4 h-4" />
                            Service Records
                          </button>
                        </Link>
                        <Link href="/products" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/products')}>
                            <Package className="w-4 h-4" />
                            Products
                          </button>
                        </Link>
                        <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/messages')}>
                            <MessageCircle className="w-4 h-4" />
                            Messages
                            {hasNotificationsForTab('messages') && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                            )}
                          </button>
                        </Link>
                        <Link href="/achievements" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/achievements')}>
                            <Trophy className="w-4 h-4" />
                            Achievements
                          </button>
                        </Link>
                        <Link href="/homeowner-referral" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/homeowner-referral')}>
                            <Gift className="w-4 h-4" />
                            Referral
                          </button>
                        </Link>
                        <Link href="/account" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/account')}>
                            <UserIcon className="w-4 h-4" />
                            Account
                          </button>
                        </Link>
                        <Link href="/support" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/support')}>
                            <HelpCircle className="w-4 h-4" />
                            Support
                          </button>
                        </Link>
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
                          <button className={mobileNavItemClass('/contractor-dashboard')}>
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                            {hasNotificationsForTab('dashboard') && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                            )}
                          </button>
                        </Link>
                        <Link href="/manage-team" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/manage-team')}>
                            <Users className="w-4 h-4" />
                            Manage Team
                          </button>
                        </Link>
                        <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/messages')}>
                            <MessageCircle className="w-4 h-4" />
                            Messages
                            {hasNotificationsForTab('messages') && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                            )}
                          </button>
                        </Link>
                        <Link href="/crm" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/crm')}>
                            <Wrench className="w-4 h-4" />
                            CRM
                          </button>
                        </Link>
                        <Link href="/contractor-referral" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/contractor-referral')}>
                            <Gift className="w-4 h-4" />
                            Referral
                          </button>
                        </Link>
                        <Link href="/contractor-profile" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/contractor-profile')}>
                            <UserIcon className="w-4 h-4" />
                            Account
                          </button>
                        </Link>
                        <Link href="/support" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/support')}>
                            <HelpCircle className="w-4 h-4" />
                            Support
                          </button>
                        </Link>
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
                          <button className={mobileNavItemClass('/agent-dashboard')}>
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                          </button>
                        </Link>
                        <Link href="/agent-referral" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/agent-referral')}>
                            <Gift className="w-4 h-4" />
                            Referral
                          </button>
                        </Link>
                        <Link href="/agent-account" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/agent-account')}>
                            <UserIcon className="w-4 h-4" />
                            Account
                          </button>
                        </Link>
                        <Link href="/support" onClick={() => setMobileMenuOpen(false)}>
                          <button className={mobileNavItemClass('/support')}>
                            <HelpCircle className="w-4 h-4" />
                            Support
                          </button>
                        </Link>
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
                    
                    <div className="my-2 border-t border-border" />
                    
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
                className="p-1.5 sm:p-2 rounded-xl transition-all duration-200 hover:bg-gray-100 active:bg-gray-200"
                aria-label="Return to homepage"
              >
                <img 
                  src={logoImage} 
                  alt="HomeBase" 
                  className="h-6 sm:h-7 w-auto"
                />
              </button>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            {isAuthenticated && (typedUser?.role === 'homeowner' || typedUser?.role === 'contractor') && (
              <Notifications />
            )}
            
            {!isAuthenticated && (
              <Button 
                onClick={() => window.location.href = '/signin'}
                aria-label="Sign in"
                className="text-sm h-9 px-3 sm:px-4 bg-purple-600 hover:bg-purple-700"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {isTrialActive && (
        <div className="bg-purple-50 border-b border-purple-200">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-purple-600" />
                <span className="text-xs sm:text-sm font-medium truncate text-purple-900">
                  <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> trial
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/billing'}
                className="text-xs h-7 px-2 sm:px-3 flex-shrink-0 border-purple-600 text-purple-600 hover:bg-purple-100"
                data-testid="button-trial-upgrade"
              >
                <Crown className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Choose Plan</span>
                <span className="sm:hidden">Upgrade</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
