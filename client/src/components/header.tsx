import { Link, useLocation } from "wouter";
import { Users, Package, User as UserIcon, LogOut, MessageCircle, Trophy, Shield, Calendar, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import { Notifications } from "@/components/notifications";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User | undefined;

  // Helper function for consistent nav link styling
  const getNavLinkClass = (isActive: boolean) => {
    const isContractor = typedUser?.role === 'contractor';
    
    if (isContractor) {
      return cn(
        "relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        isActive
          ? "text-white bg-white/20 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white"
          : "text-white/80 hover:text-white hover:bg-white/10"
      );
    }
    
    return cn(
      "relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
      isActive
        ? "text-primary bg-primary/10 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
        : "text-foreground/70 hover:text-primary hover:bg-primary/5"
    );
  };

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

  // Calculate trial status (both homeowners and contractors)
  const trialEndsAt = userData?.trialEndsAt ? new Date(userData.trialEndsAt) : null;
  const now = new Date();
  const isTrialActive = trialEndsAt && trialEndsAt > now && userData?.subscriptionStatus === 'trialing';
  const daysRemaining = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" aria-label="Home">
              <Logo className={typedUser?.role === 'contractor' ? 'h-10 w-auto text-white cursor-pointer hover:opacity-80 transition-opacity' : 'h-10 w-auto text-primary cursor-pointer hover:opacity-80 transition-opacity'} />
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-2" aria-label="Main navigation">
            {isAdmin && (
              <Link 
                href="/admin" 
                className={getNavLinkClass(location === '/admin')} 
                data-testid="link-admin"
                aria-current={location === '/admin' ? 'page' : undefined}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
            {typedUser?.role === 'homeowner' && (
              <>
                <Link 
                  href="/maintenance" 
                  className={getNavLinkClass(location === '/maintenance')}
                  aria-current={location === '/maintenance' ? 'page' : undefined}
                >
                  Maintenance
                </Link>
                <Link 
                  href="/contractors" 
                  className={getNavLinkClass(location === '/contractors' || location === '/find-contractors')}
                  aria-current={location === '/contractors' || location === '/find-contractors' ? 'page' : undefined}
                >
                  Contractors
                </Link>
                <Link 
                  href="/products" 
                  className={getNavLinkClass(location === '/products')}
                  aria-current={location === '/products' ? 'page' : undefined}
                >
                  Products
                </Link>
                <Link 
                  href="/messages" 
                  className={getNavLinkClass(location === '/messages')}
                  aria-current={location === '/messages' ? 'page' : undefined}
                >
                  <MessageCircle className="w-4 h-4" />
                  Messages
                </Link>
                <Link 
                  href="/achievements" 
                  className={getNavLinkClass(location === '/achievements')} 
                  data-testid="link-achievements"
                  aria-current={location === '/achievements' ? 'page' : undefined}
                >
                  <Trophy className="w-4 h-4" />
                  Achievements
                </Link>
                <Link 
                  href="/account" 
                  className={getNavLinkClass(location === '/account')}
                  aria-current={location === '/account' ? 'page' : undefined}
                >
                  <UserIcon className="w-4 h-4" />
                  Account
                </Link>
              </>
            )}
            {typedUser?.role === 'contractor' && (
              <>
                <Link 
                  href="/contractor-dashboard" 
                  className={getNavLinkClass(location === '/contractor-dashboard')}
                  aria-current={location === '/contractor-dashboard' ? 'page' : undefined}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/manage-team" 
                  className={getNavLinkClass(location === '/manage-team')} 
                  data-testid="link-manage-team"
                  aria-current={location === '/manage-team' ? 'page' : undefined}
                >
                  <Users className="w-4 h-4" />
                  Manage Team
                </Link>
                <Link 
                  href="/messages" 
                  className={getNavLinkClass(location === '/messages')}
                  aria-current={location === '/messages' ? 'page' : undefined}
                >
                  <MessageCircle className="w-4 h-4" />
                  Messages
                </Link>
                <Link 
                  href="/contractor-profile" 
                  className={getNavLinkClass(location === '/contractor-profile')}
                  aria-current={location === '/contractor-profile' ? 'page' : undefined}
                >
                  <UserIcon className="w-4 h-4" />
                  Profile
                </Link>
              </>
            )}
            {typedUser?.role === 'agent' && (
              <>
                <Link 
                  href="/agent-dashboard" 
                  className={getNavLinkClass(location === '/agent-dashboard')}
                  aria-current={location === '/agent-dashboard' ? 'page' : undefined}
                  data-testid="link-agent-dashboard"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/agent-account" 
                  className={getNavLinkClass(location === '/agent-account')}
                  aria-current={location === '/agent-account' ? 'page' : undefined}
                  data-testid="link-agent-account"
                >
                  <UserIcon className="w-4 h-4" />
                  Account
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated && (typedUser?.role === 'homeowner' || typedUser?.role === 'contractor') && <Notifications />}
            
            {isAuthenticated && typedUser && (
              <div className="flex items-center gap-3">
                <Badge 
                  variant={typedUser.role === 'homeowner' ? 'default' : 'outline'} 
                  size="default"
                  className={typedUser.role === 'contractor' ? 'border-white bg-white text-[#1560a2]' : ''}
                >
                  {typedUser.role === 'homeowner' ? 'Homeowner' : typedUser.role === 'contractor' ? 'Contractor' : 'Agent'}
                </Badge>
                <span className={`text-sm font-medium hidden lg:inline ${typedUser.role === 'contractor' ? 'text-white' : 'text-foreground'}`}>
                  {typedUser.firstName || typedUser.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  data-testid="button-logout"
                  aria-label="Sign out"
                  className={typedUser.role === 'contractor' ? 'border-white bg-white text-[#1560a2] hover:bg-white/90' : ''}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            )}
            
            {!isAuthenticated && (
              <Button 
                onClick={() => window.location.href = '/signin'}
                aria-label="Sign in"
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className={`h-4 w-4 ${typedUser?.role === 'homeowner' ? 'text-purple-600' : 'text-blue-700'}`} />
                <span className={`text-sm font-medium ${typedUser?.role === 'homeowner' ? 'text-purple-900' : 'text-blue-900'}`}>
                  <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> remaining in your free trial
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/billing'}
                className={typedUser?.role === 'homeowner' ? "border-purple-600 text-purple-600 hover:bg-purple-100" : "border-blue-700 text-blue-700 hover:bg-blue-200"}
                data-testid="button-trial-upgrade"
              >
                <Crown className="h-3 w-3 mr-1" />
                {typedUser?.role === 'homeowner' ? 'Choose Plan' : 'Subscribe Now'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
