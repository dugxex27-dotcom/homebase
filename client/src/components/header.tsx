import { Link, useLocation } from "wouter";
import { Users, Package, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import { Notifications } from "@/components/notifications";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/">
              <Logo className="h-10 w-auto text-primary cursor-pointer" />
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            {user?.role === 'homeowner' && (
              <>
                <Link href="/products" className={`text-gray-700 hover:text-primary transition-colors ${
                  location === '/products' ? 'text-primary font-medium' : ''
                }`}>
                  Products
                </Link>
                <Link href="/maintenance" className={`text-gray-700 hover:text-primary transition-colors ${
                  location === '/maintenance' ? 'text-primary font-medium' : ''
                }`}>
                  Maintenance Schedule
                </Link>
                <Link href="/contractors" className={`text-gray-700 hover:text-primary transition-colors ${
                  location === '/contractors' ? 'text-primary font-medium' : ''
                }`}>
                  Find Contractors
                </Link>
              </>
            )}
            {user?.role === 'contractor' && (
              <>
                <Link href="/dashboard" className={`text-gray-700 hover:text-primary transition-colors ${
                  location === '/dashboard' ? 'text-primary font-medium' : ''
                }`}>
                  Dashboard
                </Link>
                <Link href="/appointments" className={`text-gray-700 hover:text-primary transition-colors ${
                  location === '/appointments' ? 'text-primary font-medium' : ''
                }`}>
                  My Appointments
                </Link>
                <Link href="/profile" className={`text-gray-700 hover:text-primary transition-colors ${
                  location === '/profile' ? 'text-primary font-medium' : ''
                }`}>
                  My Profile
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated && user?.role === 'homeowner' && <Notifications />}
            
            {isAuthenticated && user && (
              <>
                <div className="flex items-center space-x-2">
                  <Badge variant={user.role === 'homeowner' ? 'default' : 'secondary'}>
                    {user.role === 'homeowner' ? 'Homeowner' : 'Contractor'}
                  </Badge>
                  <span className="text-sm text-gray-700">
                    {user.firstName || user.email}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            )}
            
            {!isAuthenticated && (
              <Button 
                className="bg-primary text-white hover:bg-blue-700"
                onClick={() => window.location.href = '/signin'}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
