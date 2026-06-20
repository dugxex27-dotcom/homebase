import { useState, useRef, useEffect } from "react";
import { Menu, Home, Wrench, Building2, HelpCircle, Mail, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import logoWhite from '@assets/my-homebase-logo-tm-final-white_1777417516350.png';

const NAV_BG = '#1a0a3e';
const NAV_BORDER = 'rgba(255,255,255,0.08)';

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyoutOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: NAV_BG,
        borderBottom: `0.5px solid ${NAV_BORDER}`,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
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
                  <SheetTitle className="text-left">Sign in as…</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-1">
                  <a
                    href="/signin/homeowner"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#EEEDFE] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-menu-homeowner"
                  >
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--purple-tint)', color: '#3C258E' }}>
                      <Home className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold" style={{ color: '#2C0F5B' }}>Homeowner</span>
                      <span className="text-[11px] font-medium text-gray-400">Track, protect &amp; document</span>
                    </div>
                  </a>
                  <a
                    href="/signin/contractor"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#E6F1FB] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-menu-contractor"
                  >
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--blue-tint)', color: 'var(--blue)' }}>
                      <Wrench className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold" style={{ color: 'var(--blue)' }}>Contractor</span>
                      <span className="text-[11px] font-medium text-gray-400">Grow your business</span>
                    </div>
                  </a>
                  <a
                    href="/signin/agent"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F0FAF4] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-menu-agent"
                  >
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--green-tint)', color: 'var(--green-deep)' }}>
                      <Building2 className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold" style={{ color: 'var(--green-deep)' }}>Real Estate Agent</span>
                      <span className="text-[11px] font-medium text-gray-400">Refer and earn</span>
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

        {/* Right: sign-in flyout + Get Started */}
        <div className="flex items-center gap-3">
          {/* Sign in flyout trigger */}
          <div className="relative" ref={flyoutRef}>
            <button
              onClick={() => setFlyoutOpen(o => !o)}
              className="text-sm font-medium transition-colors cursor-pointer"
              style={{
                color: flyoutOpen ? '#fff' : 'rgba(255,255,255,0.7)',
                background: 'none', border: 'none', fontFamily: 'inherit',
              }}
              aria-expanded={flyoutOpen}
              aria-haspopup="true"
            >
              Sign in
            </button>

            {flyoutOpen && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  width: 280, background: '#fff', borderRadius: 18,
                  boxShadow: '0 16px 60px rgba(0,0,0,0.28), 0 2px 8px rgba(44,15,91,0.12)',
                  zIndex: 9100, overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9090b0', borderBottom: '1px solid #f0edf8' }}>
                  <span>Sign in as…</span>
                  <button
                    onClick={() => setFlyoutOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.07)', color: '#666', cursor: 'pointer' }}
                    aria-label="Close"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Homeowner */}
                <a
                  href="/signin/homeowner"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', textDecoration: 'none', borderBottom: '1px solid #f7f5fd', transition: 'background 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f5f1ff')}
                  onMouseOut={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--purple-tint)', color: '#3C258E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Home size={18} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#2C0F5B' }}>Homeowner</span>
                    <span style={{ fontSize: 11.5, color: '#9090b0', fontWeight: 500 }}>Track, protect &amp; document</span>
                  </div>
                  <span style={{ fontSize: 15, color: 'var(--purple-light)' }}>→</span>
                </a>

                {/* Contractor */}
                <a
                  href="/signin/contractor"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', textDecoration: 'none', borderBottom: '1px solid #f7f5fd', transition: 'background 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--blue-tint)')}
                  onMouseOut={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-tint)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Wrench size={18} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>Contractor</span>
                    <span style={{ fontSize: 11.5, color: '#9090b0', fontWeight: 500 }}>Grow your business</span>
                  </div>
                  <span style={{ fontSize: 15, color: 'var(--purple-light)' }}>→</span>
                </a>

                {/* Agent */}
                <a
                  href="/signin/agent"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--green-tint)')}
                  onMouseOut={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green-tint)', color: 'var(--green-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={18} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-deep)' }}>Real Estate Agent</span>
                    <span style={{ fontSize: 11.5, color: '#9090b0', fontWeight: 500 }}>Refer and earn</span>
                  </div>
                  <span style={{ fontSize: 15, color: 'var(--purple-light)' }}>→</span>
                </a>
              </div>
            )}
          </div>

          {/* Get Started — desktop only */}
          <a
            href="/onboarding"
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
