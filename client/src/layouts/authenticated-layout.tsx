import { ReactNode, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import BottomNav from '@/components/bottom-nav';
import LoadingFallback from '@/components/loading-fallback';
import ErrorBoundary from '@/components/error-boundary';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--page-background)' }}>
      {/* Sticky top header (all viewports) */}
      <Header />

      {/* Desktop sidebar (lg+) */}
      <Sidebar />

      {/* Main content area
          - mobile:  no left margin, bottom padding for bottom nav
          - tablet:  no left margin (horizontal top nav in header)
          - desktop: left margin for sidebar
      */}
      <AnimatePresence mode="wait">
        <motion.main
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          className="flex-1 lg:ml-52 pb-20 md:pb-6"
        >
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback variant="inline" />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </motion.main>
      </AnimatePresence>

      {/* Mobile bottom nav (< md) */}
      <BottomNav />
    </div>
  );
}
