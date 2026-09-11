import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import logoWhite from '@assets/my-homebase-logo-tm-final-white_1777417516350.png';

const NAV_BG = '#1a0a3e';
const NAV_BORDER = 'rgba(255,255,255,0.08)';

interface PublicHeaderProps {
  // Logo-only header for focused single-step flows (e.g. onboarding plan
  // selection) — no nav links, no sign-in/Get Started buttons, nothing to
  // navigate away with.
  minimal?: boolean;
}

export default function PublicHeader({ minimal = false }: PublicHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const header = openButtonRef.current?.closest('header');
    const headerMain = header?.firstElementChild as HTMLElement | null;
    Array.from(document.body.children).forEach(child => {
      if (child instanceof HTMLElement && child !== header && child.tagName !== 'SCRIPT') {
        child.inert = true;
        child.setAttribute('aria-hidden', 'true');
      }
    });
    if (headerMain) {
      headerMain.inert = true;
      headerMain.setAttribute('aria-hidden', 'true');
    }
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = document.getElementById('public-header-mobile-menu');
      const items = Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      Array.from(document.body.children).forEach(child => {
        if (child instanceof HTMLElement) {
          child.inert = false;
          child.removeAttribute('aria-hidden');
        }
      });
      if (headerMain) {
        headerMain.inert = false;
        headerMain.removeAttribute('aria-hidden');
      }
      openButtonRef.current?.focus();
    };
  }, [mobileOpen]);

  if (minimal) {
    return (
      <header
        className="mhb-public-header sticky top-0 z-50"
        style={{ background: NAV_BG, borderBottom: `0.5px solid ${NAV_BORDER}` }}
      >
        <div className="flex items-center justify-center px-6 h-14 max-w-[1200px] mx-auto w-full">
          <span className="flex items-center" data-testid="img-public-logo">
            <img src={logoWhite} alt="MyHomeBase™" className="h-7 w-auto" />
          </span>
        </div>
      </header>
    );
  }

  return (
    <header
      className="mhb-public-header sticky top-0 z-50"
      style={{ background: NAV_BG, borderBottom: `0.5px solid ${NAV_BORDER}` }}
    >
      <div className="flex items-center justify-between px-6 h-14 max-w-[1200px] mx-auto w-full">

        {/* Left: logo */}
        <a href="/" className="flex items-center" data-testid="img-public-logo">
          <img src={logoWhite} alt="MyHomeBase™" className="h-7 w-auto" />
        </a>

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
            href="/signin/homeowner"
            className="text-sm font-medium transition-colors cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}
            onMouseOver={e => (e.currentTarget.style.color = '#fff')}
            onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          >
            Sign in
          </a>

          {/* Get Started — desktop only */}
          <a
            href="/signin/homeowner?tab=register"
            className="hidden lg:inline-block text-sm font-semibold rounded-lg px-4 py-2 whitespace-nowrap transition-opacity hover:opacity-90"
            style={{ background: '#fff', color: NAV_BG, textDecoration: 'none' }}
          >
            Get Started
          </a>
          <button
            ref={openButtonRef}
            type="button"
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="public-header-mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

      </div>
      {mobileOpen && (
        <div id="public-header-mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile navigation" className="lg:hidden border-t border-white/10 bg-[#1a0a3e] px-6 pb-6">
          <button ref={closeButtonRef} type="button" className="ml-auto flex h-11 w-11 items-center justify-center text-white" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
          <nav className="flex flex-col gap-1">
            <a href="/homeowner#how-it-works" className="min-h-11 px-3 py-3 text-sm font-medium text-white/80">How It Works</a>
            <a href="/homeowner#pricing" className="min-h-11 px-3 py-3 text-sm font-medium text-white/80">Pricing</a>
            <a href="/faq" className="min-h-11 px-3 py-3 text-sm font-medium text-white/80">FAQ</a>
            <a href="/signin/homeowner?tab=register" className="mt-2 min-h-11 rounded-lg bg-white px-3 py-3 text-center text-sm font-semibold text-[#1a0a3e]">Get Started</a>
            <a href="/signin/homeowner" className="min-h-11 px-3 py-3 text-center text-sm font-medium text-white/70">Sign in</a>
          </nav>
        </div>
      )}
    </header>
  );
}
