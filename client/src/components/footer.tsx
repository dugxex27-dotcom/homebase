import { Link } from 'wouter';
import whiteLogoIcon from '@assets/homebase-app-logo-white_1764516680500.png';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@shared/schema';

export default function Footer() {
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User | undefined;
  const showSidebarOffset = isAuthenticated && typedUser;

  return (
    <footer className={`text-white py-6 sm:py-8 ${showSidebarOffset ? 'md:ml-44' : ''}`} style={{ backgroundColor: '#1a0a3e' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
          <div className="text-center sm:text-left md:col-span-2">
            <div className="mb-4 sm:mb-6">
              <div className="w-1/2 sm:w-1/3 h-auto mx-auto sm:mx-0">
                <Link href="/" data-testid="footer-logo-home-link">
                  <img 
                    src={whiteLogoIcon} 
                    alt="HomeBase" 
                    className="w-full h-auto object-contain cursor-pointer"
                  />
                </Link>
              </div>
            </div>
            <p className="text-gray-300 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
              Your trusted partner for connecting with skilled contractors, discovering quality DIY products, and maintaining your home with confidence.
            </p>
          </div>

          {typedUser?.role === 'homeowner' && (
            <div className="text-center sm:text-left">
              <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-white">For Homeowners</h4>
              <ul className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base">
                <li><Link href="/contractors" className="hover:text-white transition-colors" data-testid="link-find-contractors">Find Contractors</Link></li>
                <li><Link href="/products" className="hover:text-white transition-colors" data-testid="link-diy-products">DIY Products</Link></li>
                <li><Link href="/maintenance" className="hover:text-white transition-colors" data-testid="link-maintenance">Maintenance Schedule</Link></li>
                <li><Link href="/service-records" className="hover:text-white transition-colors" data-testid="link-service-history">Service History</Link></li>
                <li><Link href="/homeowner-pricing" className="hover:text-white transition-colors" data-testid="link-pricing-footer">Pricing Plans</Link></li>
              </ul>
            </div>
          )}

          <div className="text-center sm:text-left">
            <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-white">Support</h4>
            <ul className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base">
              <li><Link href="/support" className="transition-colors hover:text-white" data-testid="link-help-center">Help Center</Link></li>
              <li><Link href="/support" className="transition-colors hover:text-white" data-testid="link-contact-us">Contact Us</Link></li>
            </ul>
          </div>

          <div className="text-center sm:text-left">
            <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-white">Legal</h4>
            <ul className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base">
              <li><Link href="/terms-of-service" className="transition-colors hover:text-white" data-testid="link-terms">Terms of Service</Link></li>
              <li><Link href="/privacy-policy" className="transition-colors hover:text-white" data-testid="link-privacy">Privacy Policy</Link></li>
              <li><Link href="/legal-disclaimer" className="transition-colors hover:text-white" data-testid="link-disclaimer">Legal Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-700 text-center text-gray-400 text-sm sm:text-base">
          <p>© 2025 HomeBase. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
