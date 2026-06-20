import { ReactNode, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import BottomNav from '@/components/bottom-nav';
import LoadingFallback from '@/components/loading-fallback';
import ErrorBoundary from '@/components/error-boundary';
import BackToTop from '@/components/back-to-top';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [location] = useLocation();

  return (
    <div
      className="mhb-app-shell"
      style={{
        display: 'flex',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--gray-50, #F9FAFB)',
      }}
    >
      {/* Sidebar — 200px on desktop (lg+), hidden on mobile/tablet */}
      <Sidebar />

      {/* Main column — fills remaining width */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header:
            - mobile/tablet: colored gradient bar (logo + sign-out)
            - desktop (lg+): slim 52px white topnav (bell + avatar only) */}
        <Header />

        {/* Scrollable page content */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            style={{ flex: 1, overflowY: 'auto' }}
            className="pb-16 lg:pb-0"
          >
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback variant="inline" />}>
                {children}
              </Suspense>
            </ErrorBoundary>
          </motion.main>
        </AnimatePresence>

        {/* Mobile bottom nav (hidden on lg+) */}
        <BottomNav />
      </div>

      {/* Back-to-top scrolls within the motion.main above */}
      <BackToTop bottom={88} />
    </div>
  );
}
