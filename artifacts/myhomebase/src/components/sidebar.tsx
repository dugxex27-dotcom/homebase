import { Link, useLocation } from "wouter";
import {
  Wrench, Building2, FileText, Package, MessageCircle, Trophy, Gift,
  User as UserIcon, HelpCircle, LogOut, Download, Shield, LayoutDashboard,
  Users, Info, FolderOpen, Home
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import type { User, Notification } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import logoColor from '@assets/my-homebase-logo-tm-final-purple_1777948438665.png';

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

  const isActive = (path: string | string[]) => {
    const arr = Array.isArray(path) ? path : [path];
    return arr.some(p => location === p || location.startsWith(p + '/'));
  };

  const navItemStyle = (path: string | string[]): React.CSSProperties => {
    const active = isActive(path);
    return active
      ? {
          backgroundColor: 'var(--theme-fill)',
          color: 'var(--theme-accent)',
          borderLeft: '3px solid var(--theme-accent)',
          paddingLeft: 9,
          borderRadius: 8,
        }
      : {
          color: 'var(--gray-600, #4B5563)',
          borderLeft: '3px solid transparent',
          paddingLeft: 9,
        };
  };

  const navItemClass = (path: string | string[]) =>
    `w-full text-left py-[9px] pr-3 rounded-lg flex items-center gap-[9px] text-[13px] font-medium transition-colors ${
      isActive(path) ? 'font-semibold' : 'hover:bg-gray-50'
    }`;

  const isHomeowner  = typedUser.role === 'homeowner';
  const isContractor = typedUser.role === 'contractor';
  const isAgent      = typedUser.role === 'agent';

  const NavItem = ({
    href,
    paths,
    icon: Icon,
    label,
    badge,
    testId,
    external,
  }: {
    href: string;
    paths?: string | string[];
    icon: React.ElementType;
    label: string;
    badge?: boolean;
    testId?: string;
    external?: boolean;
  }) => {
    const matchPaths = paths ?? href;
    const active = isActive(matchPaths);
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testId}>
          <button
            className={navItemClass(matchPaths)}
            style={{ ...navItemStyle(matchPaths), color: 'var(--theme-accent)' }}
          >
            <Icon className="w-[15px] h-[15px] flex-shrink-0" />
            {label}
          </button>
        </a>
      );
    }
    return (
      <Link href={href}>
        <button
          className={navItemClass(matchPaths)}
          style={navItemStyle(matchPaths)}
          data-testid={testId}
        >
          <Icon className="w-[15px] h-[15px] flex-shrink-0" />
          {label}
          {badge && <span className="ml-auto h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />}
        </button>
      </Link>
    );
  };

  return (
    <aside
      className="hidden lg:flex lg:flex-col flex-shrink-0 overflow-y-auto"
      style={{
        width: 200,
        background: '#ffffff',
        borderRight: '1px solid var(--gray-200, #E5E7EB)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '14px 16px 13px',
          borderBottom: '1px solid var(--gray-200, #E5E7EB)',
          flexShrink: 0,
        }}
      >
        <Link href={isContractor ? '/contractor-dashboard' : isAgent ? '/agent-dashboard' : '/'}>
          <img
            src={logoColor}
            alt="MyHomeBase™"
            style={{ height: 22, width: 'auto', display: 'block', cursor: 'pointer' }}
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5" aria-label="Main navigation">
        {isAdmin && (
          <NavItem href="/admin" icon={Shield} label="Admin" testId="nav-admin" />
        )}

        {isHomeowner && (
          <>
            <NavItem href="/" icon={Home} label="Home" testId="nav-home" />
            <NavItem href="/maintenance" icon={Wrench} label="Tasks" badge={hasNotif('maintenance')} testId="nav-maintenance" />
            <NavItem href="/service-records" icon={FileText} label="Service Records" testId="nav-service-records" />
            <NavItem href="/contractors" paths={['/contractors', '/find-contractors']} icon={Building2} label="Contractors" testId="nav-contractors" />
            <NavItem href="/messages" icon={MessageCircle} label="Messages" badge={hasNotif('messages')} testId="nav-messages" />
            <NavItem href="/achievements" icon={Trophy} label="Achievements" testId="nav-achievements" />
            <NavItem href="/homeowner-referral" icon={Gift} label="Referral" testId="nav-referral" />
            <NavItem href="/documents" paths={['/documents', '/disclosures']} icon={FolderOpen} label="Documents / Disclosures" testId="nav-documents" />
            <NavItem href="/account" icon={UserIcon} label="Account" testId="nav-account" />
            <NavItem href="/support" icon={HelpCircle} label="Support" testId="nav-support" />
            <NavItem href="https://gotohomebase.com/info" icon={Info} label="MHB Info" testId="nav-myhomebase-info" external />
            {isInstallable && (
              <button
                onClick={handleInstall}
                className={navItemClass('/install')}
                style={{ ...navItemStyle('/install'), color: 'var(--theme-accent)' }}
                data-testid="button-install-app-sidebar"
              >
                <Download className="w-[15px] h-[15px] flex-shrink-0" />Install App
              </button>
            )}
          </>
        )}

        {isContractor && (
          <>
            <NavItem href="/contractor-dashboard" icon={LayoutDashboard} label="Dashboard" badge={hasNotif('dashboard')} testId="nav-dashboard" />
            <NavItem href="/manage-team" icon={Users} label="Manage Team" testId="nav-manage-team" />
            <NavItem href="/messages" icon={MessageCircle} label="Messages" badge={hasNotif('messages')} testId="nav-messages" />
            <NavItem href="/crm" icon={Wrench} label="CRM" testId="nav-crm" />
            <NavItem href="/contractor-referral" icon={Gift} label="Referral" testId="nav-referral" />
            <NavItem href="/contractor-profile" icon={UserIcon} label="Account" testId="nav-account" />
            <NavItem href="/support" icon={HelpCircle} label="Support" testId="nav-support" />
            {isInstallable && (
              <button onClick={handleInstall} className={navItemClass('/install')} style={{ ...navItemStyle('/install'), color: 'var(--theme-accent)' }} data-testid="button-install-app-sidebar">
                <Download className="w-[15px] h-[15px] flex-shrink-0" />Install App
              </button>
            )}
          </>
        )}

        {isAgent && (
          <>
            <NavItem href="/agent-dashboard" icon={LayoutDashboard} label="Dashboard" testId="nav-dashboard" />
            <NavItem href="/agent-referral" icon={Gift} label="Referral" testId="nav-referral" />
            <NavItem href="/agent-account" icon={UserIcon} label="Account" testId="nav-account" />
            <NavItem href="/support" icon={HelpCircle} label="Support" testId="nav-support" />
            {isInstallable && (
              <button onClick={handleInstall} className={navItemClass('/install')} style={{ ...navItemStyle('/install'), color: 'var(--theme-accent)' }} data-testid="button-install-app-sidebar">
                <Download className="w-[15px] h-[15px] flex-shrink-0" />Install App
              </button>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--gray-200, #E5E7EB)' }}>
        <button
          onClick={handleLogout}
          className="w-full text-left py-[9px] px-3 rounded-lg flex items-center gap-[9px] text-[13px] font-medium transition-colors hover:bg-red-50"
          style={{ color: '#DC2626' }}
          data-testid="button-logout-sidebar"
        >
          <LogOut className="w-[15px] h-[15px] flex-shrink-0" />Sign Out
        </button>
      </div>
    </aside>
  );
}
