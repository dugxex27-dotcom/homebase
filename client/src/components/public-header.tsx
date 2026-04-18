import { useState } from "react";
import { Menu, Home, Wrench, Building2, HelpCircle, Mail, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logoColor from '@assets/my-homebase-logo-tm-final_1776295160061.png';

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14 max-w-7xl mx-auto">

        {/* Left: hamburger (mobile/tablet) + logo */}
        <div className="flex items-center gap-2">
          {/* Hamburger — hidden on desktop */}
          <div className="lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Open menu"
                  data-testid="button-public-menu"
                >
                  {mobileMenuOpen
                    ? <X className="h-5 w-5 text-gray-700" />
                    : <Menu className="h-5 w-5 text-gray-700" />}
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
                    <span className="font-semibold text-sm" style={{ color: '#2c0f5b' }}>Homeowner</span>
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
                    <span className="font-semibold text-sm" style={{ color: '#1560a2' }}>Contractor</span>
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
                    <span className="font-semibold text-sm" style={{ color: '#059669' }}>Real Estate Agent</span>
                  </a>

                  <div className="my-4 border-t border-gray-100" />

                  <a
                    href="/faq"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-menu-faq"
                  >
                    <div className="p-2 rounded-full bg-gray-100">
                      <HelpCircle className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="font-semibold text-sm text-gray-700">FAQ</span>
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
                    <span className="font-semibold text-sm text-gray-700">Contact Us</span>
                  </a>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo */}
          <a href="/" className="flex items-center" data-testid="img-public-logo">
            <img
              src={logoColor}
              alt="MyHomeBase™"
              className="h-8 w-auto"
            />
          </a>
        </div>

        {/* Center: desktop nav links */}
        <nav className="hidden lg:flex items-center gap-1">
          <a
            href="/faq"
            className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            FAQ
          </a>
          <a
            href="/contact"
            className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            Contact
          </a>
        </nav>

        {/* Right: Sign in buttons (desktop) / Sign in link (mobile/tablet) */}
        <div className="flex items-center gap-2">
          {/* Mobile/tablet: simple sign in link */}
          <a
            href="/signin"
            className="lg:hidden text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5"
          >
            Sign in
          </a>

          {/* Desktop: role-specific sign in buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <a
              href="/signin/homeowner"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-purple-50"
              style={{ color: '#534AB7' }}
            >
              <Home className="h-4 w-4" />
              Homeowner
            </a>
            <a
              href="/signin/contractor"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-blue-50"
              style={{ color: '#185FA5' }}
            >
              <Wrench className="h-4 w-4" />
              Contractor
            </a>
            <a
              href="/signin/agent"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-emerald-50"
              style={{ color: '#3B6D11' }}
            >
              <Building2 className="h-4 w-4" />
              Agent
            </a>
            <a
              href="/signin"
              className="ml-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: '#534AB7' }}
            >
              Sign in
            </a>
          </div>
        </div>

      </div>
    </header>
  );
}
