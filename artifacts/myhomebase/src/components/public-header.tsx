import { useState } from "react";
import { Menu, LogIn, HelpCircle, Mail, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logoWhite from '@assets/my-homebase-logo-tm-final-white_1777417516350.png';

const NAV_BG = '#1a0a3e';
const NAV_BORDER = 'rgba(255,255,255,0.08)';

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="mhb-public-header sticky top-0 z-50"
      style={{ background: NAV_BG, borderBottom: `0.5px solid ${NAV_BORDER}` }}
    >
      <div className="flex items-center justify-between px-6 h-14 max-w-[1200px] mx-auto w-full">

        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none' }}
                  aria-label="Open menu"
                  data-testid="button-public-menu"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-1">
                  <a
                    href="/signin"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#EEEDFE] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-menu-signin"
                  >
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--purple-tint)', color: '#3C258E' }}>
                      <LogIn className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold" style={{ color: '#2C0F5B' }}>Sign in</span>
                      <span className="text-[11px] font-medium text-gray-400">Access your account</span>
                    </div>
                  </a>
                  <div className="my-3 border-t border-gray-100" />
                  <a
                    href="/faq"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-menu-faq"
                  >
                    <div className="w-9 h-9 rounded-[10px] bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <HelpCircle className="h-[18px] w-[18px] text-gray-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">FAQ</span>
                  </a>
                  <a
                    href="/contact"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-menu-contact"
                  >
                    <div className="w-9 h-9 rounded-[10px] bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-[18px] w-[18px] text-gray-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Contact Us</span>
                  </a>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <a href="/" className="flex items-center" data-testid="img-public-logo">
            <img src={logoWhite} alt="MyHomeBase™" className="h-7 w-auto" />
          </a>
        </div>

        {/* Center: desktop nav links */}
        <nav className="hidden lg:flex items-center gap-6">
          <a href="/faq" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
            FAQ
          </a>
          <a href="/contact" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
            Contact
          </a>
        </nav>

        {/* Right: sign-in link + Get Started */}
        <div className="flex items-center gap-3">
          <a
            href="/signin"
            className="text-sm font-medium transition-colors cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}
            onMouseOver={e => (e.currentTarget.style.color = '#fff')}
            onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          >
            Sign in
          </a>

          {/* Get Started — desktop only */}
          <a
            href="/signin/homeowner"
            className="hidden lg:inline-block text-sm font-semibold rounded-lg px-4 py-2 whitespace-nowrap transition-opacity hover:opacity-90"
            style={{ background: '#fff', color: NAV_BG, textDecoration: 'none' }}
          >
            Get Started
          </a>
        </div>

      </div>
    </header>
  );
}
