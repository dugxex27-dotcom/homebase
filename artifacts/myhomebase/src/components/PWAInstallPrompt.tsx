import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
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
      className="fixed bottom-6 left-6 z-40 hidden max-w-xs items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-gray-900 shadow-lg animate-in slide-in-from-bottom duration-300 md:flex"
      data-testid="pwa-install-prompt"
    >
      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-md p-0.5 shadow-sm border border-gray-100">
        <img src="/icon-192x192.png" alt="App Icon" className="w-full h-full rounded-md" />
      </div>
      <div className="flex-1 min-w-[120px] pr-2 text-sm font-bold text-[#2C0F5B]">
        Add to Home Screen
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleInstallClick} size="sm" className="min-h-8 rounded-md bg-[#3C258E] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#2C0F5B]" data-testid="button-install-pwa">
          Install
        </Button>
        <button onClick={handleDismiss} className="flex min-h-8 min-w-8 items-center justify-center rounded-md bg-gray-50 text-gray-400 hover:text-gray-600" data-testid="button-dismiss-pwa" aria-label="Dismiss install prompt">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
