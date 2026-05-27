import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Calendar, Crown, LogOut, Wrench, Building2, MessageCircle,
  Trophy, Gift, User as UserIcon, FileText, LayoutDashboard,
  Users, Download, Shield, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notifications } from "@/components/notifications";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, Notification } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import logoWhite from '@assets/my-homebase-logo-tm-final-white_1777417516350.png';
import logoColor from '@assets/my-homebase-logo-tm-final_1776295160061.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/* ─── Tablet horizontal nav items per role ─── */
function TabletNav({ role, location }: { role: string; location: string }) {
  const isActive = (paths: string | string[]) => {
    const arr = Array.isArray(paths) ? paths : [paths];
    return arr.some(p => location === p || location.startsWith(p + '/'));
  };

  const itemClass = (paths: string | string[]) =>
    `tablet-nav-item ${isActive(paths) ? 'tablet-nav-item-active' : ''}`;

  // Query-param-aware active check for contractor dashboard tabs
  const dashTab = new URLSearchParams(window.location.search).get('tab');
  const isJobsTabActive = location === '/contractor-dashboard' && dashTab !== 'team' && dashTab !== 'invoices';
  const isTeamTabActive = location === '/contractor-dashboard' && dashTab === 'team';

  if (role === 'homeowner') return (
    <nav className="tablet-nav-bar items-center px-4 overflow-x-auto" aria-label="Tablet navigation">
      <Link href="/" className={itemClass('/')}>
        <Home className="w-4 h-4" />Home
      </Link>
      <Link href="/maintenance" className={itemClass('/maintenance')}>
        <Wrench className="w-4 h-4" />Tasks
      </Link>
      <Link href="/service-records" className={itemClass(['/service-records', '/documents'])}>
        <FileText className="w-4 h-4" />Records
      </Link>
      <Link href="/contractors" className={itemClass(['/contractors', '/find-contractors'])}>
        <Building2 className="w-4 h-4" />Contractors
      </Link>
      <Link href="/messages" className={itemClass('/messages')}>
        <MessageCircle className="w-4 h-4" />Messages
      </Link>
      <Link href="/achievements" className={itemClass('/achievements')}>
        <Trophy className="w-4 h-4" />Achievements
      </Link>
      <Link href="/account" className={itemClass(['/account', '/billing'])}>
        <UserIcon className="w-4 h-4" />Account
      </Link>
    </nav>
  );

  if (role === 'contractor') return (
    <nav className="tablet-nav-bar items-center px-4 overflow-x-auto" aria-label="Tablet navigation">
      <Link href="/contractor-dashboard" className={`tablet-nav-item ${isJobsTabActive ? 'tablet-nav-item-active' : ''}`}>
        <LayoutDashboard className="w-4 h-4" />Jobs
      </Link>
      <Link href="/messages" className={itemClass('/messages')}>
        <MessageCircle className="w-4 h-4" />Messages
      </Link>
      <Link href="/crm" className={itemClass('/crm')}>
        <Users className="w-4 h-4" />Clients
      </Link>
      <Link href="/contractor-dashboard?tab=team" className={`tablet-nav-item ${isTeamTabActive ? 'tablet-nav-item-active' : ''}`}>
        <Users className="w-4 h-4" />Team
      </Link>
      <Link href="/contractor-profile" className={itemClass('/contractor-profile')}>
        <UserIcon className="w-4 h-4" />Profile
      </Link>
    </nav>
  );

  if (role === 'agent') return (
    <nav className="tablet-nav-bar items-center px-4 overflow-x-auto" aria-label="Tablet navigation">
      <Link href="/agent-dashboard" className={itemClass(['/agent-dashboard', '/'])}>
        <LayoutDashboard className="w-4 h-4" />Dashboard
      </Link>
      <Link href="/agent-referral" className={itemClass('/agent-referral')}>
        <Gift className="w-4 h-4" />Referrals
      </Link>
      <Link href="/agent-account" className={itemClass(['/agent-account', '/billing'])}>
        <UserIcon className="w-4 h-4" />Profile
      </Link>
    </nav>
  );

  return null;
}

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User | undefined;
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

  const trialEndsAt = userData?.trialEndsAt ? new Date(userData.trialEndsAt) : null;
  const now = new Date();
  const isTrialActive = trialEndsAt && trialEndsAt > now && userData?.subscriptionStatus === 'trialing';
  const daysRemaining = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) { setIsInstallable(false); return; }
    const checkDismissal = () => {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
        setIsInstallable(false); setDeferredPrompt(null); return true;
      }
      return false;
    };
    if (checkDismissal()) return;
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!checkDismissal()) setIsInstallable(true);
    };
    const handleAppInstalled = () => { setDeferredPrompt(null); setIsInstallable(false); };
    const handleStorageChange = (e: StorageEvent) => { if (e.key === 'pwa-install-dismissed') checkDismissal(); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pwa-dismissed', () => checkDismissal());
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      if (response.ok) { queryClient.clear(); window.location.href = '/'; }
    } catch { window.location.href = '/'; }
  };

  const role = typedUser?.role ?? '';
  const initials = typedUser
    ? (typedUser.firstName?.[0]?.toUpperCase() || typedUser.email?.[0]?.toUpperCase() || 'U')
    : 'U';

  return (
    <header
      className={`sticky top-0 z-50 ${isAuthenticated ? 'mhb-authed-header' : ''}`}
      style={!isAuthenticated ? { backgroundColor: '#ffffff', borderBottom: '1px solid var(--theme-border)' } : undefined}
    >

      {/* ── Mobile/Tablet top bar (colored gradient) — hidden on lg desktop ── */}
      {isAuthenticated ? (
        <>
          {/* Mobile row: logo + notifications + sign-out — hidden on lg */}
          <div className="lg:hidden w-full px-3 sm:px-4">
            <div className="flex justify-between items-center h-14">
              <Link href={role === 'contractor' ? '/contractor-dashboard' : role === 'agent' ? '/agent-dashboard' : '/'}>
                <button className="p-1.5 rounded-xl" aria-label="Home" data-testid="link-home-logo">
                  <img src={logoWhite} alt="MyHomeBase™" className="h-5 sm:h-6 w-auto" />
                </button>
              </Link>
              <div className="flex items-center gap-2">
                {(role === 'homeowner' || role === 'contractor') && <Notifications />}
                {isInstallable && (
                  <button
                    onClick={async () => {
                      if (!deferredPrompt) return;
                      deferredPrompt.prompt();
                      await deferredPrompt.userChoice;
                      setDeferredPrompt(null); setIsInstallable(false);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
                    data-testid="button-install-app-header"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 h-8 rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' }}
                  data-testid="button-logout-header"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tablet horizontal nav (md–lg only) */}
          <TabletNav role={role} location={location} />

          {/* Desktop topnav row — white 52px bar, bell + avatar, hidden below lg */}
          <div
            className="hidden lg:flex justify-end items-center flex-shrink-0"
            style={{ height: 52, padding: '0 24px', gap: 16 }}
          >
            {isAdmin && (
              <Link href="/admin">
                <button
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-lg"
                  style={{ background: 'var(--theme-fill)', color: 'var(--theme-accent)' }}
                  data-testid="nav-admin-header"
                >
                  <Shield className="w-3.5 h-3.5" />Admin
                </button>
              </Link>
            )}
            {isInstallable && (
              <button
                onClick={async () => {
                  if (!deferredPrompt) return;
                  deferredPrompt.prompt();
                  await deferredPrompt.userChoice;
                  setDeferredPrompt(null); setIsInstallable(false);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-lg"
                style={{ background: 'var(--theme-fill)', color: 'var(--theme-accent)' }}
                data-testid="button-install-app-header"
              >
                <Download className="w-3.5 h-3.5" />Install App
              </button>
            )}
            {(role === 'homeowner' || role === 'contractor') && <Notifications />}
            {typedUser && (
              <div
                className="flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  background: 'var(--purple-tint, #EEEDFE)',
                  border: '2px solid var(--purple-border, #CECBF6)',
                  color: 'var(--purple, #3C258E)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {initials}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Logged-out header */
        <div className="w-full px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14">
            <Link href="/">
              <button className="p-1.5 rounded-xl" aria-label="Home" data-testid="link-home-logo">
                <img src={logoColor} alt="MyHomeBase™" className="h-5 sm:h-6 w-auto" />
              </button>
            </Link>
            <Button onClick={() => window.location.href = '/signin'} aria-label="Sign in" className="text-sm h-9 px-3 sm:px-4 theme-btn-primary">
              Sign In
            </Button>
          </div>
        </div>
      )}

      {/* ── Trial banner ── */}
      {isTrialActive && (
        <div style={{ background: 'rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="w-full px-3 sm:px-4 lg:px-6 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--theme-eyebrow)' }} />
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--theme-primary)' }}>
                  <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> left in trial
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/billing'}
                className="text-xs h-7 px-2 sm:px-3 flex-shrink-0 font-bold"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--theme-accent)', border: '1px solid var(--theme-border-hover)' }}
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
