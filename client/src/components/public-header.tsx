import { useState } from "react";
import { Menu, Home, Wrench, Building2, HelpCircle, Mail } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logoColor from '@assets/my-homebase-logo-tm_1776283770766.png';

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="px-4 sm:px-6 py-4 bg-white">
      <div className="flex items-center max-w-7xl mx-auto">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
              data-testid="button-public-menu"
            >
              <Menu className="h-6 w-6 text-gray-700" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px]">
            <SheetHeader>
              <SheetTitle className="text-left">Sign In</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-2">
              <a
                href="/signin/homeowner"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-menu-homeowner"
              >
                <div className="p-2 rounded-full bg-purple-100">
                  <Home className="h-5 w-5 text-purple-600" />
                </div>
                <span className="font-medium" style={{ color: '#2c0f5b' }}>Homeowner</span>
              </a>
              <a
                href="/signin/contractor"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-menu-contractor"
              >
                <div className="p-2 rounded-full bg-blue-100">
                  <Wrench className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium" style={{ color: '#1560a2' }}>Contractor</span>
              </a>
              <a
                href="/signin/agent"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-emerald-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-menu-agent"
              >
                <div className="p-2 rounded-full bg-emerald-100">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="font-medium" style={{ color: '#059669' }}>Real Estate Agent</span>
              </a>
              
              <div className="my-4 border-t border-gray-200" />
              
              <a
                href="/faq"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-menu-faq"
              >
                <div className="p-2 rounded-full bg-gray-100">
                  <HelpCircle className="h-5 w-5 text-gray-600" />
                </div>
                <span className="font-medium text-gray-700">FAQ</span>
              </a>
              <a
                href="/contact"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-menu-contact"
              >
                <div className="p-2 rounded-full bg-gray-100">
                  <Mail className="h-5 w-5 text-gray-600" />
                </div>
                <span className="font-medium text-gray-700">Contact Us</span>
              </a>
            </nav>
          </SheetContent>
        </Sheet>
        
        <a href="/" className="flex items-center ml-3 sm:ml-6">
          <img 
            src={logoColor} 
            alt="MyHomeBase™" 
            className="h-8 sm:h-10 w-auto"
            data-testid="img-public-logo"
          />
        </a>
      </div>
    </header>
  );
}
