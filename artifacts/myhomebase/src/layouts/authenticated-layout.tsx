import { ReactNode, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import BottomNav from '@/components/bottom-nav';
import LoadingFallback from '@/components/loading-fallback';
import ErrorBoundary from '@/components/error-boundary';
import BackToTop from '@/components/back-to-top';
import { UnreadNotificationsProvider } from '@/components/unread-notifications-provider';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [location] = useLocation();
  const scrollContainerRef = useRef<HTMLElement>(null);

  return (
    <UnreadNotificationsProvider>
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
            ref={scrollContainerRef}
            key={location}
            data-scroll-container="authenticated"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            style={{ flex: 1, width: '100%', minWidth: 0, overflowY: 'auto', overflowX: 'hidden' }}
            className="pb-[calc(4rem+1px+var(--native-safe-bottom))] md:pb-0"
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
      <BackToTop bottom={88} scrollContainerRef={scrollContainerRef} />
    </div>
    </UnreadNotificationsProvider>
  );
}
