import logoImage from '@assets/my-homebase-logo-tm-final_1776295160061.png';

interface LoadingFallbackProps {
  variant?: 'full' | 'inline';
}

export default function LoadingFallback({ variant = 'full' }: LoadingFallbackProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a0a3e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <img src={logoImage} alt="MyHomeBase™" style={{ height: '48px', width: 'auto', margin: '0 auto', display: 'block', opacity: 0.9 }} className="animate-pulse" />
      </div>
    </div>
  );
}
