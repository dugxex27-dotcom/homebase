import Logo from "@/components/logo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { User } from "@shared/schema";
import heroImage from "@assets/homebase-hp-hero-desktop-nocopy_1765926450284.png";
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
          {/* Desktop Hero with Text Overlay */}
          <div className="w-full hidden md:block relative" style={{ aspectRatio: '2.5 / 1' }}>
            <img 
              src={heroImage} 
              alt="HomeBase - Your digital home fingerprint" 
              className="w-full h-full object-cover"
              data-testid="img-hero-banner"
            />
            {/* Text Overlay */}
            <div 
              className="absolute inset-0 flex flex-col justify-center"
              style={{ paddingLeft: '5%', paddingRight: '50%' }}
            >
              {/* Eyebrow */}
              <p 
                className="mb-2"
                style={{ 
                  fontFamily: "'Quicksand', sans-serif",
                  fontWeight: 700,
                  fontSize: '14px',
                  color: '#ffffff',
                  letterSpacing: '0.5px'
                }}
                data-testid="text-hero-eyebrow"
              >
                Welcome to HomeBase
              </p>
              
              {/* Headline */}
              <h1 
                className="mb-4"
                style={{ 
                  fontFamily: "'Quicksand', sans-serif",
                  fontWeight: 700,
                  fontSize: '32px',
                  lineHeight: 1.2,
                  color: '#ffffff'
                }}
                data-testid="text-hero-headline"
              >
                Your Home's <span style={{ color: '#00D4FF' }}>Digital</span><br />
                Fingerprint Starts Here
              </h1>
              
              {/* Subcopy */}
              <p 
                className="mb-3"
                style={{ 
                  fontFamily: "'Quicksand', sans-serif",
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: '#ffffff',
                  maxWidth: '420px'
                }}
                data-testid="text-hero-subcopy-1"
              >
                A single, living record that keeps a home's systems, maintenance, upgrades, and history organized in one place.
              </p>
              
              <p 
                style={{ 
                  fontFamily: "'Quicksand', sans-serif",
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: '#ffffff',
                  maxWidth: '420px'
                }}
                data-testid="text-hero-subcopy-2"
              >
                Built for homeowners first — and shared seamlessly with contractors and real estate agents when it matters.
              </p>
            </div>
          </div>
          
          {/* Mobile Hero */}
          <div className="w-full md:hidden">
            <img 
              src={heroImageMobile} 
              alt="HomeBase - Your digital home fingerprint" 
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
          
          {typedUser?.role !== 'homeowner' && (
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 leading-tight" style={{ color: 'white' }}>
              Your Business{" "}
              <span style={{ color: 'white' }}>Growth Platform</span>
            </h1>
          )}
          
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
