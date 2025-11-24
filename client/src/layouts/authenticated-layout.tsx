import { ReactNode, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import LoadingFallback from '@/components/loading-fallback';
import ErrorBoundary from '@/components/error-boundary';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AnimatePresence mode="wait">
        <motion.main
          key={location}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback variant="inline" />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
