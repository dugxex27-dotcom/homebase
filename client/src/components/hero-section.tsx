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
        ? '#ffffff' 
        : '#1560a2', 
      paddingTop: '0', 
      paddingBottom: '40px' 
    }}>
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
          
        </div>
      </div>
    </section>
  );
}
