import logoWhite from '@assets/my-homebase-logo-tm-final-white_1777417516350.png';

const NAV_BG = '#1a0a3e';
const NAV_BORDER = 'rgba(255,255,255,0.08)';

export default function PublicHeader() {
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
