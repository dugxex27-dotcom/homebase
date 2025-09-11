import Logo from "@/components/logo";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Wrench, Search, Calendar, MessageSquare } from "lucide-react";
import type { User } from "@shared/schema";

export default function HeroSection() {
  const { user } = useAuth();
  const typedUser = user as User | undefined;

  return (
    <section style={typedUser?.role === 'homeowner' ? { background: '#2c0f5b', paddingTop: '20px', paddingBottom: '2px' } : { background: '#1560a2', paddingTop: '20px', paddingBottom: '2px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-2">
          <Logo className={`h-32 w-full mx-auto block mb-8`} />
          
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight" style={typedUser?.role === 'homeowner' ? { color: '#ffffff' } : { color: 'white' }}>
            {typedUser?.role === 'homeowner' ? (
              <>Your Home{" "}
              <span style={{ color: '#ffffff' }}>Management Hub</span></>
            ) : (
              <>Your Business{" "}
              <span style={{ color: 'white' }}>Growth Platform</span></>
            )}
          </h1>
          
          <p className="text-xl mb-8 max-w-3xl mx-auto leading-relaxed" style={typedUser?.role === 'homeowner' ? { color: '#b6a6f4' } : { color: '#afd6f9' }}>
            {typedUser?.role === 'homeowner' ? (
              'Connect with skilled contractors, discover quality DIY products, and keep your home running smoothly with our intelligent maintenance scheduling system.'
            ) : (
              'Grow your contracting business by connecting with quality clients, showcasing your expertise, and managing your professional reputation in one powerful platform.'
            )}
          </p>

          {/* Quick Action Cards */}
          <div className={`grid grid-cols-1 ${typedUser?.role === 'homeowner' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mt-2 max-w-5xl mx-auto`}>
            {typedUser?.role === 'homeowner' ? (
              // Homeowner Quick Actions
              <>
                <Link href="/maintenance">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-300 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: '#2c0f5b' }}>
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Home Maintenance</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Schedule and track home maintenance with climate-based recommendations
                    </p>
                  </div>
                </Link>

                <Link href="/contractors">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-300 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: '#2c0f5b' }}>
                      <Search className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Find Contractors</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Connect with trusted local contractors for any home project
                    </p>
                  </div>
                </Link>

                <Link href="/products">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-300 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: '#2c0f5b' }}>
                      <Wrench className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">DIY Products</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Discover quality tools and materials for your home projects
                    </p>
                  </div>
                </Link>
              </>
            ) : (
              // Contractor Quick Actions
              <>



              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
