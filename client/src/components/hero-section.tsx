import Logo from "@/components/logo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { User } from "@shared/schema";
import heroImage from "@assets/homebase-homeowner-hero-desktop_1765324886400.png";
import heroImageMobile from "@assets/homebase-homeowner-hero-mobile_1765324886400.png";

export default function HeroSection() {
  const { user } = useAuth();
  const typedUser = user as User | undefined;

  return (
    <section style={{ 
      background: typedUser?.role === 'homeowner' 
        ? '#ffffff' 
        : '#1560a2', 
      paddingTop: '0', 
      paddingBottom: '40px' 
    }}>
      {typedUser?.role === 'homeowner' && (
        <>
          <div className="w-full hidden md:block" style={{ aspectRatio: '2.5 / 1' }}>
            <img 
              src={heroImage} 
              alt="HomeBase - Your digital home binder" 
              className="w-full h-full object-cover"
              data-testid="img-hero-banner"
            />
          </div>
          <div className="w-full md:hidden">
            <img 
              src={heroImageMobile} 
              alt="HomeBase - Your digital home binder" 
              className="w-full h-auto"
              data-testid="img-hero-banner-mobile"
            />
          </div>
        </>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: typedUser?.role === 'homeowner' ? '40px' : '40px' }}>
        <div className="text-center mb-2">
          {typedUser?.role !== 'homeowner' && (
            <Logo className={`h-[40px] sm:h-[48px] w-auto mx-auto block mb-8`} />
          )}
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 leading-tight" style={{ color: typedUser?.role === 'homeowner' ? '#2c0f5b' : 'white' }}>
            {typedUser?.role === 'homeowner' ? (
              <>
                <span className="hidden md:inline">Welcome! Your Home's<br />Digital Record Starts Here</span>
                <span className="md:hidden">Welcome! Your Home's<br />Digital Record Starts Here</span>
              </>
            ) : (
              <>Your Business{" "}
              <span style={{ color: 'white' }}>Growth Platform</span></>
            )}
          </h1>
          
          {typedUser?.role === 'contractor' && (
            <p className="text-xl mb-4 max-w-3xl mx-auto leading-relaxed font-semibold" style={{ color: '#9ed0ef' }}>
              Grow your contracting business by connecting with quality clients, showcasing your expertise, and managing your professional reputation in one powerful platform.
            </p>
          )}
          
          {typedUser?.role === 'homeowner' && (
            <>
              <p className="text-lg mb-8 max-w-3xl mx-auto leading-relaxed" style={{ color: '#2c0f5b' }}>Create a clear, living record of your home — from systems and appliances to maintenance, upgrades, and health.</p>
              <Link href="/maintenance">
                <Button 
                  size="lg"
                  className="font-bold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{ backgroundColor: '#2c0f5b', color: '#ffffff' }}
                  data-testid="button-start-home-report"
                >
                  Launch Your Home Record
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
