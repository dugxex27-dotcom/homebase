import { ReactNode } from 'react';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import BottomNav from '@/components/bottom-nav';
import Footer from '@/components/footer';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@shared/schema';

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export default function Layout({ children, showFooter = true }: LayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User | undefined;

  const showSidebar = isAuthenticated && typedUser;

  return (
    <div
      className="flex flex-col min-h-screen lg:flex-row lg:h-screen lg:overflow-hidden"
      style={{ backgroundColor: 'var(--gray-50, #F9FAFB)' }}
    >
      {showSidebar && <Sidebar />}
      <div className="flex-1 flex flex-col min-h-0">
        <Header />
        <main
          className="flex-1 pb-20 lg:pb-0 lg:overflow-y-auto"
          style={{ backgroundColor: 'var(--gray-50, #F9FAFB)' }}
        >
          <div className="min-h-full">
            {children}
          </div>
        </main>
        {showFooter && <Footer />}
      </div>
      <BottomNav />
    </div>
  );
}
