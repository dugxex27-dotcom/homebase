import Logo from "@/components/logo";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

export default function HeroSection() {
  const { user } = useAuth();
  const typedUser = user as User | undefined;

  return (
    <section style={{ background: typedUser?.role === 'homeowner' ? '#2c0f5b' : '#1560a2', paddingTop: '20px', paddingBottom: '2px' }}>
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
          
          <p className="text-xl mb-8 max-w-3xl mx-auto leading-relaxed" style={{ color: typedUser?.role === 'homeowner' ? '#b6a6f4' : '#9ed0ef' }}>
            {typedUser?.role === 'homeowner' ? (
              'Connect with skilled local contractors for all your home improvement and maintenance projects. Find trusted professionals in your area ready to help.'
            ) : (
              'Grow your contracting business by connecting with quality clients, showcasing your expertise, and managing your professional reputation in one powerful platform.'
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
