import { ReactNode, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import PublicHeader from '@/components/public-header';
import Footer from '@/components/footer';
import LoadingFallback from '@/components/loading-fallback';
import ErrorBoundary from '@/components/error-boundary';
import BackToTop from '@/components/back-to-top';

interface UnauthenticatedLayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
}

export default function UnauthenticatedLayout({ children, hideHeader = false }: UnauthenticatedLayoutProps) {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeInOut' }}
        className="min-h-screen flex flex-col"
      >
        {!hideHeader && <PublicHeader />}
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback variant="full" />}>
            <div className="flex-1">
              {children}
            </div>
          </Suspense>
        </ErrorBoundary>
        <Footer />
        <BackToTop bottom={24} />
      </motion.div>
    </AnimatePresence>
  );
}
