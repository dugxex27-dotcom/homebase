import { Link, useLocation } from "wouter";
import { Home, Calendar, MessageCircle, User, LayoutDashboard, FileText, Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const typedUser = user as (UserType & { isAdmin?: boolean }) | undefined;

  const isAdmin = typedUser?.isAdmin === true;

  const { data: conversations } = useQuery({
    queryKey: ['/api/messages/conversations'],
    enabled: !!user && (typedUser?.role === 'homeowner' || typedUser?.role === 'contractor'),
  });

  const unreadCount = Array.isArray(conversations)
    ? conversations.filter((c: any) => c.unreadCount > 0).length
    : 0;

  const adminItem = isAdmin ? [{
    href: '/admin',
    icon: Shield,
    label: 'Admin',
    isActive: location === '/admin' || location.startsWith('/admin/'),
    badge: undefined as number | undefined,
  }] : [];

  const navItems = typedUser?.role === 'homeowner'
    ? [
        ...adminItem,
        { href: '/',            icon: Home,          label: 'Home',        isActive: location === '/' },
        { href: '/maintenance', icon: Calendar,       label: 'Maintenance', isActive: location === '/maintenance' || location.startsWith('/household-profile') },
        { href: '/messages',    icon: MessageCircle,  label: 'Messages',    badge: unreadCount, isActive: location === '/messages' },
        { href: '/account',     icon: User,           label: 'Profile',     isActive: location === '/account' || location === '/billing' },
      ]
    : typedUser?.role === 'contractor'
    ? [
        ...adminItem,
        { href: '/contractor-dashboard', icon: LayoutDashboard, label: 'Home',     isActive: location === '/contractor-dashboard' || location === '/' },
        { href: '/messages',             icon: MessageCircle,   label: 'Messages', badge: unreadCount, isActive: location === '/messages' },
        { href: '/contractor-profile',   icon: User,            label: 'Profile',  isActive: location === '/contractor-profile' },
      ]
    : typedUser?.role === 'agent'
    ? [
        ...adminItem,
        { href: '/agent-dashboard', icon: LayoutDashboard, label: 'Home',    isActive: location === '/agent-dashboard' || location === '/' },
        { href: '/agent-account',   icon: User,            label: 'Profile', isActive: location === '/agent-account' || location === '/billing' },
      ]
    : [];

  if (!typedUser || navItems.length === 0) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg md:hidden"
      style={{ borderColor: 'var(--theme-border)' }}
      aria-label="Bottom navigation"
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 relative flex-1 max-w-[80px]",
                isActive ? "theme-bottom-nav-active" : "text-black/20 hover:text-black/40"
              )}
              data-testid={`nav-${item.label.toLowerCase()}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <div className={cn(isActive && "theme-bottom-nav-icon-bg")}>
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-transform duration-200",
                      isActive && "scale-110"
                    )}
                  />
                </div>
                {item.badge && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    data-testid={`badge-${item.label.toLowerCase()}`}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className={cn("text-xs font-semibold whitespace-nowrap")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
