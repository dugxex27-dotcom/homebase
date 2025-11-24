import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    
    // Don't show if dismissed within last 7 days
    if (dismissed && Date.now() - dismissedTime < sevenDaysInMs) {
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show our custom install prompt after a short delay (better UX)
      timeoutId = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    } else {
      console.log('Install dismissed');
    }

    // Hide our custom prompt
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    // Remember that user dismissed it
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    
    // Dispatch custom event to notify Header component
    window.dispatchEvent(new Event('pwa-dismissed'));
    
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div 
      className="fixed left-0 right-0 z-50 p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-2xl animate-in slide-in-from-bottom duration-300"
      style={{ 
        bottom: window.innerWidth < 768 
          ? 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' 
          : '0'
      }}
      data-testid="pwa-install-prompt"
    >
      <div className="max-w-2xl mx-auto flex items-center gap-4">
        {/* App Icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg p-1 shadow-md">
          <img 
            src="/icon-192x192.png" 
            alt="Home Base" 
            className="w-full h-full rounded-md"
          />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base mb-0.5">
            Install Home Base
          </h3>
          <p className="text-sm text-purple-100 line-clamp-1">
            Get quick access to your home maintenance from your home screen
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="bg-white text-purple-700 hover:bg-purple-50 font-medium"
            data-testid="button-install-pwa"
          >
            <Download className="w-4 h-4 mr-1" />
            Install
          </Button>
          
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-purple-600/50"
            data-testid="button-dismiss-pwa"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
