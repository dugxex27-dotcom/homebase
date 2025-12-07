import { Link, useLocation } from "wouter";
import { 
  Wrench, 
  Building2, 
  FileText, 
  Package, 
  MessageCircle, 
  Trophy, 
  Gift, 
  User as UserIcon, 
  HelpCircle, 
  LogOut, 
  Download,
  ChevronLeft,
  Shield,
  LayoutDashboard,
  Users,
  CreditCard
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import type { User, Notification } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User | undefined;
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean);
  const isAdmin = typedUser?.email && adminEmails.includes(typedUser.email);

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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA installed from sidebar');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
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

  if (!isAuthenticated || !typedUser) return null;

  const isHomeowner = typedUser.role === 'homeowner';
  const isContractor = typedUser.role === 'contractor';
  const isAgent = typedUser.role === 'agent';

  const navItemClass = (path: string | string[]) => {
    const paths = Array.isArray(path) ? path : [path];
    const isActive = paths.some(p => location === p || location.startsWith(p + '/'));
    return `w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
      isActive 
        ? 'bg-purple-50 text-purple-700' 
        : 'text-gray-700 hover:bg-gray-50'
    }`;
  };

  const contractorNavItemClass = (path: string | string[]) => {
    const paths = Array.isArray(path) ? path : [path];
    const isActive = paths.some(p => location === p || location.startsWith(p + '/'));
    return `w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
      isActive 
        ? 'bg-blue-50 text-blue-700' 
        : 'text-gray-700 hover:bg-gray-50'
    }`;
  };

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200 fixed left-0 top-14 sm:top-16 bottom-0 z-40 overflow-y-auto shadow-sm">
      <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
        {isAdmin && (
          <Link href="/admin">
            <button className={navItemClass('/admin')} data-testid="nav-admin">
              <Shield className="w-5 h-5" />
              Admin
            </button>
          </Link>
        )}
        
        {isHomeowner && (
          <>
            <Link href="/maintenance">
              <button className={navItemClass('/maintenance')} data-testid="nav-maintenance">
                <Wrench className="w-5 h-5" />
                Maintenance
                {hasNotificationsForTab('maintenance') && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            </Link>
            <Link href="/contractors">
              <button className={navItemClass(['/contractors', '/find-contractors'])} data-testid="nav-contractors">
                <Building2 className="w-5 h-5" />
                Contractors
              </button>
            </Link>
            <Link href="/service-records">
              <button className={navItemClass('/service-records')} data-testid="nav-service-records">
                <FileText className="w-5 h-5" />
                Service Records
              </button>
            </Link>
            <Link href="/products">
              <button className={navItemClass('/products')} data-testid="nav-products">
                <Package className="w-5 h-5" />
                Products
              </button>
            </Link>
            <Link href="/messages">
              <button className={navItemClass('/messages')} data-testid="nav-messages">
                <MessageCircle className="w-5 h-5" />
                Messages
                {hasNotificationsForTab('messages') && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            </Link>
            <Link href="/achievements">
              <button className={navItemClass('/achievements')} data-testid="nav-achievements">
                <Trophy className="w-5 h-5" />
                Achievements
              </button>
            </Link>
            <Link href="/homeowner-referral">
              <button className={navItemClass('/homeowner-referral')} data-testid="nav-referral">
                <Gift className="w-5 h-5" />
                Referral
              </button>
            </Link>
            <Link href="/account">
              <button className={navItemClass('/account')} data-testid="nav-account">
                <UserIcon className="w-5 h-5" />
                Account
              </button>
            </Link>
            <Link href="/support">
              <button className={navItemClass('/support')} data-testid="nav-support">
                <HelpCircle className="w-5 h-5" />
                Support
              </button>
            </Link>
            {isInstallable && (
              <button
                onClick={handleInstallClick}
                className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium text-purple-600 hover:bg-purple-50"
                data-testid="button-install-app-sidebar"
              >
                <Download className="w-5 h-5" />
                Install App
              </button>
            )}
          </>
        )}

        {isContractor && (
          <>
            <Link href="/contractor-dashboard">
              <button className={contractorNavItemClass('/contractor-dashboard')} data-testid="nav-dashboard">
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
                {hasNotificationsForTab('dashboard') && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            </Link>
            <Link href="/manage-team">
              <button className={contractorNavItemClass('/manage-team')} data-testid="nav-manage-team">
                <Users className="w-5 h-5" />
                Manage Team
              </button>
            </Link>
            <Link href="/messages">
              <button className={contractorNavItemClass('/messages')} data-testid="nav-messages">
                <MessageCircle className="w-5 h-5" />
                Messages
                {hasNotificationsForTab('messages') && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            </Link>
            <Link href="/crm">
              <button className={contractorNavItemClass('/crm')} data-testid="nav-crm">
                <Wrench className="w-5 h-5" />
                CRM
              </button>
            </Link>
            <Link href="/contractor-referral">
              <button className={contractorNavItemClass('/contractor-referral')} data-testid="nav-referral">
                <Gift className="w-5 h-5" />
                Referral
              </button>
            </Link>
            <Link href="/contractor-profile">
              <button className={contractorNavItemClass('/contractor-profile')} data-testid="nav-account">
                <UserIcon className="w-5 h-5" />
                Account
              </button>
            </Link>
            <Link href="/support">
              <button className={contractorNavItemClass('/support')} data-testid="nav-support">
                <HelpCircle className="w-5 h-5" />
                Support
              </button>
            </Link>
            {isInstallable && (
              <button
                onClick={handleInstallClick}
                className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
                data-testid="button-install-app-sidebar"
              >
                <Download className="w-5 h-5" />
                Install App
              </button>
            )}
          </>
        )}

        {isAgent && (
          <>
            <Link href="/agent-dashboard">
              <button className={navItemClass('/agent-dashboard')} data-testid="nav-dashboard">
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </button>
            </Link>
            <Link href="/agent-referral">
              <button className={navItemClass('/agent-referral')} data-testid="nav-referral">
                <Gift className="w-5 h-5" />
                Referral
              </button>
            </Link>
            <Link href="/agent-account">
              <button className={navItemClass('/agent-account')} data-testid="nav-account">
                <UserIcon className="w-5 h-5" />
                Account
              </button>
            </Link>
            <Link href="/support">
              <button className={navItemClass('/support')} data-testid="nav-support">
                <HelpCircle className="w-5 h-5" />
                Support
              </button>
            </Link>
            {isInstallable && (
              <button
                onClick={handleInstallClick}
                className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium text-purple-600 hover:bg-purple-50"
                data-testid="button-install-app-sidebar"
              >
                <Download className="w-5 h-5" />
                Install App
              </button>
            )}
          </>
        )}
      </nav>
      
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium text-red-600 hover:bg-red-50"
          data-testid="button-logout-sidebar"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
