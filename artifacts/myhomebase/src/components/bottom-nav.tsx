import { Link, useLocation } from "wouter";
import { Home, Wrench, FileText, User, LayoutDashboard, MessageCircle, Users, Gift, Grid2x2, Trophy, ShoppingBag, HardHat, Sparkles, X, ClipboardList, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";

const homeownerToolsItems = [
  { href: "/maintenance",         icon: Wrench,         label: "Your Tasks",           description: "View your maintenance schedule" },
  { href: "/contractors",         icon: HardHat,        label: "Find Contractor",      description: "Search local professionals" },
  { href: "/achievements",        icon: Trophy,         label: "Explore Achievements", description: "Earn badges & rewards" },
  { href: "/products",            icon: ShoppingBag,    label: "Shop Products",        description: "Browse home products" },
  { href: "/ai-help",             icon: Sparkles,       label: "Ask AI",               description: "Get instant home advice" },
  { href: "/documents",           icon: ClipboardList,  label: "Documents",            description: "Documents & disclosure wizard" },
  { href: "/messages",            icon: MessageCircle,  label: "Messages",             description: "Chat with your contractors" },
  { href: "/homeowner-referral",  icon: Gift,           label: "Refer & Earn",         description: "Earn free months by referring friends" },
  { href: "/support",             icon: HelpCircle,     label: "Support",              description: "Get help from our team" },
];

const contractorToolsItems = [
  { href: "/contractor-dashboard", icon: LayoutDashboard, label: "Jobs",           description: "View and manage your active jobs" },
  { href: "/crm",                  icon: Users,           label: "Clients",         description: "Manage leads and clients" },
  { href: "/messages",             icon: MessageCircle,   label: "Messages",        description: "Chat with homeowners" },
  { href: "/support",              icon: HelpCircle,      label: "Support Center",  description: "Get help from our team" },
];

export default function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const typedUser = user as (UserType & { isAdmin?: boolean }) | undefined;
  const [toolsOpen, setToolsOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ['/api/messages/conversations'],
    enabled: !!user && (typedUser?.role === 'homeowner' || typedUser?.role === 'contractor'),
  });

  const unreadCount = Array.isArray(conversations)
    ? conversations.filter((c: any) => c.unreadCount > 0).length
    : 0;

  const isActive = (paths: string | string[]) => {
    const arr = Array.isArray(paths) ? paths : [paths];
    return arr.some(p => location === p || location.startsWith(p + '/'));
  };

  const isHomeownerToolsActive = homeownerToolsItems.some(t => isActive(t.href));
  const isContractorToolsActive = contractorToolsItems.some(t => isActive(t.href));
  const isToolsActive = typedUser?.role === 'contractor' ? isContractorToolsActive : isHomeownerToolsActive;

  const hasFlyout = typedUser?.role === 'homeowner' || typedUser?.role === 'contractor';

  useEffect(() => {
    if (!toolsOpen) return;
    const handler = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [toolsOpen]);

  useEffect(() => {
    setToolsOpen(false);
  }, [location]);

  const navItems =
    typedUser?.role === 'homeowner'
      ? [
          { href: '/',                icon: Home,     label: 'Home',    active: isActive('/') },
          { href: '/service-records', icon: FileText, label: 'Records', active: isActive(['/service-records', '/documents']) },
          { href: '/account',         icon: User,     label: 'Account', active: isActive(['/account', '/billing', '/homeowner-referral']) },
        ]
      : typedUser?.role === 'contractor'
      ? [
          { href: '/contractor-profile', icon: User, label: 'Profile', active: isActive(['/contractor-profile', '/billing', '/contractor-pricing']) },
        ]
      : typedUser?.role === 'agent'
      ? [
          { href: '/agent-dashboard', icon: LayoutDashboard, label: 'Dashboard', active: isActive(['/agent-dashboard', '/']) },
          { href: '/agent-referral',  icon: Gift,            label: 'Referrals', active: isActive('/agent-referral') },
          { href: '/agent-account',   icon: User,            label: 'Profile',   active: isActive(['/agent-account', '/billing']) },
          { href: '/support?role=agent', icon: HelpCircle,  label: 'Support',   active: isActive('/support') },
        ]
      : [];

  if (!typedUser || (navItems.length === 0 && !hasFlyout)) return null;

  const activeFlyoutItems = typedUser?.role === 'contractor' ? contractorToolsItems : homeownerToolsItems;

  return (
    <>
      {/* Tools flyout backdrop */}
      {toolsOpen && hasFlyout && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setToolsOpen(false)}
        />
      )}

      {/* Tools flyout panel */}
      {hasFlyout && (
        <div
          ref={flyoutRef}
          className={cn(
            "fixed left-0 right-0 z-50 md:hidden transition-all duration-300 ease-out",
            toolsOpen
              ? "bottom-16 opacity-100 translate-y-0 pointer-events-auto"
              : "bottom-16 opacity-0 translate-y-4 pointer-events-none"
          )}
          style={{ paddingBottom: '0px' }}
        >
          <div
            className="mx-3 mb-2 rounded-2xl overflow-hidden"
            style={{
              background: 'white',
              boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.07)',
            }}
          >
            {/* Flyout header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold tracking-widest uppercase text-slate-400">Quick Access</span>
              <button
                onClick={() => setToolsOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Flyout items */}
            <div className="py-1">
              {activeFlyoutItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const badge = (item as any).badge ?? (item.href === '/messages' && typedUser?.role === 'contractor' ? unreadCount : 0);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors duration-150",
                      active ? "bg-slate-50" : "hover:bg-slate-50"
                    )}
                    onClick={() => setToolsOpen(false)}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                      style={{
                        backgroundColor: active ? 'var(--theme-fill)' : '#f1f5f9',
                      }}
                    >
                      <Icon
                        className="w-[18px] h-[18px]"
                        style={{ color: active ? 'var(--theme-accent)' : '#64748b' }}
                      />
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className="text-sm font-semibold leading-tight"
                        style={{ color: active ? 'var(--theme-accent)' : '#1e293b' }}
                      >
                        {item.label}
                      </span>
                      <span className="text-xs text-slate-400 leading-tight mt-0.5">{item.description}</span>
                    </div>
                    {active && (
                      <div
                        className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: 'var(--theme-accent)' }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white md:hidden"
        style={{
          borderTop: '1px solid var(--theme-border)',
          boxShadow: '0 -2px 16px rgba(0,0,0,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Bottom navigation"
        data-testid="bottom-nav"
      >
        <div className="flex items-stretch justify-around h-16 px-1">
          {/* Regular nav items */}
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-2 flex-1 transition-all duration-200 relative",
                  "focus:outline-none"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
                aria-current={item.active ? 'page' : undefined}
              >
                <div className="relative">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-[9px] transition-all duration-200"
                    style={item.active ? { backgroundColor: 'var(--theme-fill)' } : {}}
                  >
                    <Icon
                      className={cn("transition-all duration-200", item.active ? "w-[22px] h-[22px]" : "w-5 h-5")}
                      style={{ color: item.active ? 'var(--theme-accent)' : '#c0bfc8' }}
                    />
                  </div>
                  {(item as any).badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center p-0 text-[9px] font-bold"
                      data-testid={`badge-${item.label.toLowerCase()}`}
                    >
                      {(item as any).badge > 9 ? '9+' : (item as any).badge}
                    </Badge>
                  )}
                </div>
                <span
                  className="text-[9px] font-bold leading-none tracking-wide"
                  style={{ color: item.active ? 'var(--theme-accent)' : '#c0bfc8' }}
                >
                  {item.label}
                </span>
                {item.active && (
                  <span
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: 'var(--theme-accent)' }}
                  />
                )}
              </Link>
            );
          })}

          {/* Tools tab — homeowner & contractor */}
          {hasFlyout && (
            <button
              onClick={() => setToolsOpen(prev => !prev)}
              className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 flex-1 transition-all duration-200 relative focus:outline-none"
              data-testid="nav-tools"
              aria-expanded={toolsOpen}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[9px] transition-all duration-200"
                style={(toolsOpen || isToolsActive) ? { backgroundColor: 'var(--theme-fill)' } : {}}
              >
                <Grid2x2
                  className={cn("transition-all duration-200", (toolsOpen || isToolsActive) ? "w-[22px] h-[22px]" : "w-5 h-5")}
                  style={{ color: (toolsOpen || isToolsActive) ? 'var(--theme-accent)' : '#c0bfc8' }}
                />
              </div>
              <span
                className="text-[9px] font-bold leading-none tracking-wide"
                style={{ color: (toolsOpen || isToolsActive) ? 'var(--theme-accent)' : '#c0bfc8' }}
              >
                Tools
              </span>
              {(toolsOpen || isToolsActive) && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                />
              )}
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
