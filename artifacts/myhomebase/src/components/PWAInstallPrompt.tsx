import { useState, useEffect, useRef } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

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

    let interactionCount = 0;

    const handleInteraction = () => {
      interactionCount++;
      if (interactionCount === 3 && deferredPromptRef.current) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('scroll', handleInteraction);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
      
      // Wait for a few interactions before showing
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      deferredPromptRef.current = null;
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
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
    deferredPromptRef.current = null;
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
      className="fixed bottom-24 left-4 right-4 z-[999] md:bottom-8 md:left-auto md:right-8 md:w-96 text-white shadow-2xl animate-in slide-in-from-bottom duration-300 rounded-xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)' }}
      data-testid="pwa-install-prompt"
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg p-1 shadow-md">
            <img
              src="/icon-192x192.png"
              alt="MyHomeBase™"
              className="w-full h-full rounded-md"
            />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-semibold text-base mb-0.5">
              Install MyHomeBase™
            </h3>
            <p className="text-sm text-white/80 line-clamp-2">
              Get quick access to your home maintenance from your home screen.
            </p>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white transition-colors"
            data-testid="button-dismiss-pwa"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <Button
          onClick={handleInstallClick}
          className="w-full bg-white hover:bg-white/90 font-bold"
          style={{ color: 'var(--theme-primary)' }}
          data-testid="button-install-pwa"
        >
          <Download className="w-4 h-4 mr-2" />
          Install App
        </Button>
      </div>
    </div>
  );
}
