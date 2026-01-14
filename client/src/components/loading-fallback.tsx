import logoImage from '@assets/my-homebase-logo-color_1768359493195.png';

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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <img src={logoImage} alt="MyHomeBase" className="h-12 w-auto mx-auto animate-pulse" />
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    </div>
  );
}
