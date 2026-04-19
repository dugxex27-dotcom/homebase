import { Link, useLocation } from "wouter";
import {
  Wrench, Building2, FileText, Package, MessageCircle, Trophy, Gift,
  User as UserIcon, HelpCircle, LogOut, Download, Shield, LayoutDashboard,
  Users, Info, FolderOpen, Home, ClipboardList
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import type { User, Notification } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import logoColor from '@assets/my-homebase-logo-tm-final_1776295160061.png';

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

  const isAdmin = (typedUser as any)?.isAdmin === true;

  const { data: unreadNotifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications/unread'],
    enabled: isAuthenticated && (typedUser?.role === 'homeowner' || typedUser?.role === 'contractor'),
    refetchInterval: 30000,
  });

  const hasNotif = (tab: string) => {
    if (!unreadNotifications.length) return false;
    if (tab === 'messages') return unreadNotifications.some(n => n.type === 'message');
    if (tab === 'maintenance') return unreadNotifications.some(n => n.category === 'maintenance');
    if (tab === 'dashboard') return unreadNotifications.some(n => n.category === 'appointment');
    return false;
  };

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) { setIsInstallable(false); return; }
    const check = () => {
      const d = localStorage.getItem('pwa-install-dismissed');
      if (d && Date.now() - parseInt(d) < 7 * 24 * 60 * 60 * 1000) { setIsInstallable(false); setDeferredPrompt(null); return true; }
      return false;
    };
    if (check()) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); if (!check()) setIsInstallable(true); };
    const onInstalled = () => { setDeferredPrompt(null); setIsInstallable(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null); setIsInstallable(false);
  };

  const handleLogout = async () => {
    try {
      const r = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      if (r.ok) { queryClient.clear(); window.location.href = '/'; }
    } catch { window.location.href = '/'; }
  };

  if (!isAuthenticated || !typedUser) return null;

  const nav = (path: string | string[]) => {
    const arr = Array.isArray(path) ? path : [path];
    const active = arr.some(p => location === p || location.startsWith(p + '/'));
    return `w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-sm transition-colors font-medium ${
      active
        ? 'font-semibold'
        : 'hover:bg-gray-50'
    }`;
  };
  const navStyle = (path: string | string[]) => {
    const arr = Array.isArray(path) ? path : [path];
    const active = arr.some(p => location === p || location.startsWith(p + '/'));
    return active
      ? { backgroundColor: 'var(--theme-fill)', color: 'var(--theme-accent)' }
      : { color: 'rgba(0,0,0,0.5)' };
  };

  const isHomeowner  = typedUser.role === 'homeowner';
  const isContractor = typedUser.role === 'contractor';
  const isAgent      = typedUser.role === 'agent';

  return (
    /* Desktop sidebar — hidden on mobile + tablet, visible on lg+ */
    <aside
      className="hidden lg:flex lg:flex-col w-52 fixed left-0 top-14 bottom-0 z-40 overflow-y-auto"
      style={{ background: '#ffffff', borderRight: '1px solid var(--theme-border)' }}
    >
      <nav className="flex-1 p-3 space-y-0.5" aria-label="Main navigation">
        {isAdmin && (
          <Link href="/admin">
            <button className={nav('/admin')} style={navStyle('/admin')} data-testid="nav-admin">
              <Shield className="w-4 h-4 flex-shrink-0" />Admin
            </button>
          </Link>
        )}

        {isHomeowner && (
          <>
            <Link href="/"><button className={nav('/')} style={navStyle('/')} data-testid="nav-home"><Home className="w-4 h-4 flex-shrink-0" />Home</button></Link>
            <Link href="/maintenance"><button className={nav('/maintenance')} style={navStyle('/maintenance')} data-testid="nav-maintenance"><Wrench className="w-4 h-4 flex-shrink-0" />Tasks{hasNotif('maintenance') && <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />}</button></Link>
            <Link href="/service-records"><button className={nav('/service-records')} style={navStyle('/service-records')} data-testid="nav-service-records"><FileText className="w-4 h-4 flex-shrink-0" />Service Records</button></Link>
            <Link href="/documents"><button className={nav('/documents')} style={navStyle('/documents')} data-testid="nav-documents"><FolderOpen className="w-4 h-4 flex-shrink-0" />Documents</button></Link>
            <Link href="/disclosures"><button className={nav('/disclosures')} style={navStyle('/disclosures')} data-testid="nav-disclosures"><ClipboardList className="w-4 h-4 flex-shrink-0" />Disclosures</button></Link>
            <Link href="/contractors"><button className={nav(['/contractors', '/find-contractors'])} style={navStyle(['/contractors', '/find-contractors'])} data-testid="nav-contractors"><Building2 className="w-4 h-4 flex-shrink-0" />Contractors</button></Link>
            <Link href="/products"><button className={nav('/products')} style={navStyle('/products')} data-testid="nav-products"><Package className="w-4 h-4 flex-shrink-0" />Products</button></Link>
            <Link href="/messages"><button className={nav('/messages')} style={navStyle('/messages')} data-testid="nav-messages"><MessageCircle className="w-4 h-4 flex-shrink-0" />Messages{hasNotif('messages') && <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />}</button></Link>
            <Link href="/achievements"><button className={nav('/achievements')} style={navStyle('/achievements')} data-testid="nav-achievements"><Trophy className="w-4 h-4 flex-shrink-0" />Achievements</button></Link>
            <Link href="/homeowner-referral"><button className={nav('/homeowner-referral')} style={navStyle('/homeowner-referral')} data-testid="nav-referral"><Gift className="w-4 h-4 flex-shrink-0" />Referral</button></Link>
            <Link href="/account"><button className={nav('/account')} style={navStyle('/account')} data-testid="nav-account"><UserIcon className="w-4 h-4 flex-shrink-0" />Account</button></Link>
            <Link href="/support"><button className={nav('/support')} style={navStyle('/support')} data-testid="nav-support"><HelpCircle className="w-4 h-4 flex-shrink-0" />Support</button></Link>
            <a href="https://gotohomebase.com/info" target="_blank" rel="noopener noreferrer" data-testid="nav-myhomebase-info">
              <button className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-sm font-medium transition-colors hover:bg-gray-50" style={{ color: 'var(--theme-accent)' }}>
                <Info className="w-4 h-4 flex-shrink-0" />MHB Info
              </button>
            </a>
            {isInstallable && (
              <button onClick={handleInstall} className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-sm font-medium transition-colors hover:bg-gray-50" style={{ color: 'var(--theme-accent)' }} data-testid="button-install-app-sidebar">
                <Download className="w-4 h-4 flex-shrink-0" />Install App
              </button>
            )}
          </>
        )}

        {isContractor && (
          <>
            <Link href="/contractor-dashboard"><button className={nav('/contractor-dashboard')} style={navStyle('/contractor-dashboard')} data-testid="nav-dashboard"><LayoutDashboard className="w-4 h-4 flex-shrink-0" />Dashboard{hasNotif('dashboard') && <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />}</button></Link>
            <Link href="/manage-team"><button className={nav('/manage-team')} style={navStyle('/manage-team')} data-testid="nav-manage-team"><Users className="w-4 h-4 flex-shrink-0" />Manage Team</button></Link>
            <Link href="/messages"><button className={nav('/messages')} style={navStyle('/messages')} data-testid="nav-messages"><MessageCircle className="w-4 h-4 flex-shrink-0" />Messages{hasNotif('messages') && <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />}</button></Link>
            <Link href="/crm"><button className={nav('/crm')} style={navStyle('/crm')} data-testid="nav-crm"><Wrench className="w-4 h-4 flex-shrink-0" />CRM</button></Link>
            <Link href="/contractor-referral"><button className={nav('/contractor-referral')} style={navStyle('/contractor-referral')} data-testid="nav-referral"><Gift className="w-4 h-4 flex-shrink-0" />Referral</button></Link>
            <Link href="/contractor-profile"><button className={nav('/contractor-profile')} style={navStyle('/contractor-profile')} data-testid="nav-account"><UserIcon className="w-4 h-4 flex-shrink-0" />Account</button></Link>
            <Link href="/support"><button className={nav('/support')} style={navStyle('/support')} data-testid="nav-support"><HelpCircle className="w-4 h-4 flex-shrink-0" />Support</button></Link>
            {isInstallable && <button onClick={handleInstall} className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-sm font-medium hover:bg-gray-50" style={{ color: 'var(--theme-accent)' }} data-testid="button-install-app-sidebar"><Download className="w-4 h-4 flex-shrink-0" />Install App</button>}
          </>
        )}

        {isAgent && (
          <>
            <Link href="/agent-dashboard"><button className={nav('/agent-dashboard')} style={navStyle('/agent-dashboard')} data-testid="nav-dashboard"><LayoutDashboard className="w-4 h-4 flex-shrink-0" />Dashboard</button></Link>
            <Link href="/agent-referral"><button className={nav('/agent-referral')} style={navStyle('/agent-referral')} data-testid="nav-referral"><Gift className="w-4 h-4 flex-shrink-0" />Referral</button></Link>
            <Link href="/agent-account"><button className={nav('/agent-account')} style={navStyle('/agent-account')} data-testid="nav-account"><UserIcon className="w-4 h-4 flex-shrink-0" />Account</button></Link>
            <Link href="/support"><button className={nav('/support')} style={navStyle('/support')} data-testid="nav-support"><HelpCircle className="w-4 h-4 flex-shrink-0" />Support</button></Link>
            {isInstallable && <button onClick={handleInstall} className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-sm font-medium hover:bg-gray-50" style={{ color: 'var(--theme-accent)' }} data-testid="button-install-app-sidebar"><Download className="w-4 h-4 flex-shrink-0" />Install App</button>}
          </>
        )}
      </nav>

      <div className="p-3" style={{ borderTop: '1px solid var(--theme-border)' }}>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          data-testid="button-logout-sidebar"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />Sign Out
        </button>
      </div>
    </aside>
  );
}
