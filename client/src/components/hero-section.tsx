import Logo from "@/components/logo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { User } from "@shared/schema";

export default function HeroSection() {
  const { user } = useAuth();
  const typedUser = user as User | undefined;

  return (
    <section style={{ 
      background: typedUser?.role === 'homeowner' 
        ? '#c1b2f9' 
        : '#1560a2', 
      paddingTop: '20px', 
      paddingBottom: '40px' 
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-2">
          {typedUser?.role !== 'homeowner' && (
            <Logo className={`h-32 w-full mx-auto block mb-8`} />
          )}
          
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight" style={{ color: typedUser?.role === 'homeowner' ? '#2c0f5b' : 'white' }}>
            {typedUser?.role === 'homeowner' ? (
              "Welcome to Your Home's Smart Management Hub"
            ) : (
              <>Your Business{" "}
              <span style={{ color: 'white' }}>Growth Platform</span></>
            )}
          </h1>
          
          <p className="text-xl mb-4 max-w-3xl mx-auto leading-relaxed font-semibold" style={{ color: typedUser?.role === 'homeowner' ? '#2c0f5b' : '#9ed0ef' }}>
            {typedUser?.role === 'homeowner' ? (
              'The Carfax-style home history your house has always needed.'
            ) : (
              'Grow your contracting business by connecting with quality clients, showcasing your expertise, and managing your professional reputation in one powerful platform.'
            )}
          </p>
          
          {typedUser?.role === 'homeowner' && (
            <>
              <p className="text-lg mb-8 max-w-3xl mx-auto leading-relaxed" style={{ color: '#2c0f5b' }}>
                Track repairs, upgrades, and maintenance in one simple, organized place — so you always know the true story of your home.
              </p>
              <Link href="/maintenance">
                <Button 
                  size="lg"
                  className="font-bold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{ backgroundColor: '#2c0f5b', color: '#ffffff' }}
                  data-testid="button-start-home-report"
                >
                  Start Your Home Report
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
