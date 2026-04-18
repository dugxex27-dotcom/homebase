import { Link, useLocation } from "wouter";
import { Home, Wrench, FileText, User, LayoutDashboard, MessageCircle, Users, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const typedUser = user as (UserType & { isAdmin?: boolean }) | undefined;

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

  /* ── Per-role nav items (spec §7) ── */
  const navItems =
    typedUser?.role === 'homeowner'
      ? [
          { href: '/',               icon: Home,        label: 'Home',    active: isActive('/') },
          { href: '/service-records', icon: FileText,    label: 'Records', active: isActive(['/service-records', '/documents']) },
          { href: '/maintenance',     icon: Wrench,      label: 'Tasks',   active: isActive(['/maintenance', '/household-profile']) },
          { href: '/account',         icon: User,        label: 'Account', active: isActive(['/account', '/billing', '/achievements', '/homeowner-referral']) },
        ]
      : typedUser?.role === 'contractor'
      ? [
          { href: '/contractor-dashboard', icon: LayoutDashboard, label: 'Jobs',    active: isActive(['/contractor-dashboard', '/']) },
          { href: '/messages',             icon: MessageCircle,   label: 'Messages', active: isActive('/messages'), badge: unreadCount },
          { href: '/crm',                  icon: Users,           label: 'Clients', active: isActive(['/crm', '/manage-team']) },
          { href: '/contractor-profile',   icon: User,            label: 'Profile', active: isActive(['/contractor-profile', '/billing']) },
        ]
      : typedUser?.role === 'agent'
      ? [
          { href: '/agent-dashboard', icon: LayoutDashboard, label: 'Dashboard',  active: isActive(['/agent-dashboard', '/']) },
          { href: '/agent-referral',  icon: Gift,            label: 'Referrals', active: isActive('/agent-referral') },
          { href: '/agent-account',   icon: User,            label: 'Profile',   active: isActive(['/agent-account', '/billing']) },
        ]
      : [];

  if (!typedUser || navItems.length === 0) return null;

  return (
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
              {/* Icon container */}
              <div className="relative">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-[9px] transition-all duration-200"
                  style={item.active ? { backgroundColor: 'var(--theme-fill)' } : {}}
                >
                  <Icon
                    className={cn(
                      "transition-all duration-200",
                      item.active ? "w-[22px] h-[22px]" : "w-5 h-5"
                    )}
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

              {/* Label */}
              <span
                className="text-[9px] font-bold leading-none tracking-wide"
                style={{ color: item.active ? 'var(--theme-accent)' : '#c0bfc8' }}
              >
                {item.label}
              </span>

              {/* Active indicator dot */}
              {item.active && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
