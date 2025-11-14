import Logo from "@/components/logo";

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
        <Logo className="h-12 w-auto text-primary mx-auto animate-pulse" />
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    </div>
  );
}
