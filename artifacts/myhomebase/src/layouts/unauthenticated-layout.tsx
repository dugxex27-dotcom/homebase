import { ReactNode, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import PublicHeader from '@/components/public-header';
import Footer from '@/components/footer';
import LoadingFallback from '@/components/loading-fallback';
import ErrorBoundary from '@/components/error-boundary';
import BackToTop from '@/components/back-to-top';
import { isNativePlatform } from '@/lib/nativeBrowser';

interface UnauthenticatedLayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
}

// Paths that render their own full-page branded header — showing the
// marketing PublicHeader above them would stack two navbars and expose
// the mobile hamburger Sheet ("flyout") on these auth screens.
const SELF_HEADED_PATHS = ['/signin', '/referral-entry', '/complete-profile'];

// On native (Capacitor) builds, the marketing header/footer chrome is never
// appropriate — the user already knows what app they installed and should
// land directly in the sign-in flow with no nav links to marketing pages
// like Pricing/FAQ/How It Works. Web/PWA keeps the marketing chrome as-is.
export default function UnauthenticatedLayout({ children, hideHeader = false }: UnauthenticatedLayoutProps) {
  const [location] = useLocation();
  const isSelfHeaded = SELF_HEADED_PATHS.some(p => location === p || location.startsWith(p + '/'));
  const suppressChrome = hideHeader || isNativePlatform || isSelfHeaded;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeInOut' }}
        className="mhb-page-shell min-h-screen flex flex-col"
        style={{ minHeight: '100dvh' }}
      >
        {!suppressChrome && <PublicHeader />}
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback variant="full" />}>
            <div className="flex-1">
              {children}
            </div>
          </Suspense>
        </ErrorBoundary>
        {!isNativePlatform && !isSelfHeaded && <Footer />}
        <BackToTop bottom={24} />
      </motion.div>
    </AnimatePresence>
  );
}
