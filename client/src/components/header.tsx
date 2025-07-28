import { Link, useLocation } from "wouter";
import { Users, Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";

export default function Header() {
  const [location] = useLocation();

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
          </nav>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex bg-gray-100 rounded-lg p-1">
              <button className="px-3 py-1 bg-white rounded-md shadow-sm text-sm font-medium text-gray-900">
                Homeowner
              </button>
              <button className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900">
                Contractor
              </button>
            </div>
            <Button className="bg-primary text-white hover:bg-blue-700">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
