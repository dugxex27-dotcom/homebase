import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { User } from "@shared/schema";

export default function HeroSection() {
  const { user } = useAuth();
  const typedUser = user as User | undefined;

  if (typedUser?.role === 'homeowner') {
    return (
      <section 
        className="relative overflow-hidden text-white text-center"
        style={{ 
          background: 'linear-gradient(180deg, #6B28FF 0%, #A78BFA 100%)',
          padding: '60px 24px 70px 24px'
        }}
      >
        <div 
          className="absolute inset-0 opacity-[0.04] bg-no-repeat bg-center"
          style={{ 
            backgroundImage: 'url("https://i.imgur.com/Cq0Vx4M.png")',
            backgroundSize: '80%'
          }}
        />
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <h1 
            className="text-3xl sm:text-4xl font-extrabold mb-4"
            style={{ lineHeight: 1.2 }}
          >
            Your Home's Smart Management Hub
          </h1>
          
          <p className="text-lg font-medium opacity-90 mb-4">
            The Carfax-style home history your house has always needed.
          </p>
          
          <p className="text-base opacity-90 mb-7 max-w-xl mx-auto">
            Track repairs, upgrades, and maintenance in one simple, organized place
            — so you always know the true story of your home.
          </p>
          
          <Link href="/maintenance">
            <Button 
              className="w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              style={{ 
                backgroundColor: 'white',
                color: '#5B2EFF'
              }}
              data-testid="button-start-home-report"
            >
              Start Your Home Report
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section style={{ 
      background: '#1560a2', 
      paddingTop: '20px', 
      paddingBottom: '40px' 
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-2">
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white">
            Your Business{" "}
            <span style={{ color: 'white' }}>Growth Platform</span>
          </h1>
          
          <p className="text-xl mb-4 max-w-3xl mx-auto leading-relaxed font-semibold" style={{ color: '#9ed0ef' }}>
            Grow your contracting business by connecting with quality clients, showcasing your expertise, and managing your professional reputation in one powerful platform.
          </p>
        </div>
      </div>
    </section>
  );
}
