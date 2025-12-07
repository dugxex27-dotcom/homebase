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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f5f5' }}>
      <Header />
      {showSidebar && <Sidebar />}
      <main className={`flex-1 pb-20 md:pb-0 ${showSidebar ? 'md:ml-64' : ''}`}>
        <div className="min-h-full">
          {children}
        </div>
      </main>
      {showFooter && <Footer />}
      <BottomNav />
    </div>
  );
}
