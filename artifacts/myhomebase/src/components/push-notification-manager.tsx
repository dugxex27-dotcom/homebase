import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, Smartphone, Settings } from 'lucide-react';

interface PushNotificationManagerProps {
  userId?: string;
}

export default function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkPushSupport();
    // Temporarily disabled to clear cache - Nov 2 2025
    // registerServiceWorker();
  }, []);

  const checkPushSupport = () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkExistingSubscription();
    } else {
      console.log('Push messaging is not supported');
      setIsSupported(false);
    }
  };

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      // Force unregister all old service workers first
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('Unregistering old service worker');
        await registration.unregister();
      }

      // Clear all caches to remove old cached files
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        console.log('Deleting old cache:', cacheName);
        await caches.delete(cacheName);
      }

      // Register new service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none' // Don't cache the service worker file itself
      });
      
      // Force immediate activation
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('New service worker activated');
              // Reload page once to use new service worker
              if (!sessionStorage.getItem('sw-refreshed')) {
                sessionStorage.setItem('sw-refreshed', 'true');
                window.location.reload();
              }
            }
          });
        }
      });

      console.log('Service Worker registered:', registration);
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'notification-click') {
          // Handle navigation from notification clicks
          const { targetUrl, action, data } = event.data;
          if (targetUrl) {
            window.location.href = targetUrl;
          }
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const checkExistingSubscription = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setIsSubscribed(true);
        setSubscription(existingSubscription);
        
        // Verify subscription is still valid on server
        verifySubscriptionOnServer(existingSubscription);
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  };

  const verifySubscriptionOnServer = async (sub: PushSubscription) => {
    try {
      const response = await fetch('/api/push/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
            auth: arrayBufferToBase64(sub.getKey('auth')!)
          }
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        // Subscription not valid on server, re-subscribe
        await subscribeUser();
      }
    } catch (error) {
      console.error('Error verifying subscription:', error);
    }
  };

  const subscribeUser = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Request permission first
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        toast({
          title: "Permission Denied",
          description: "Push notifications require permission to work.",
          variant: "destructive"
        });
        return;
      }

      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await vapidResponse.json();

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!)
          },
          userAgent: navigator.userAgent
        }),
        credentials: 'include'
      });

      if (response.ok) {
        setIsSubscribed(true);
        setSubscription(subscription);
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive push notifications for important updates."
        });
      } else {
        throw new Error('Failed to save subscription on server');
      }
    } catch (error: any) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to enable push notifications.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    if (!subscription) return;

    setIsLoading(true);

    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Remove subscription from server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        }),
        credentials: 'include'
      });

      setIsSubscribed(false);
      setSubscription(null);
      toast({
        title: "Notifications Disabled",
        description: "You'll no longer receive push notifications."
      });
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      toast({
        title: "Unsubscribe Failed",
        description: error.message || "Failed to disable push notifications.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Test Sent",
          description: "Check your notifications!"
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test notification.",
        variant: "destructive"
      });
    }
  };

  // Helper functions
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Push Notifications Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Push notifications are not supported in this browser. Try using Chrome, Firefox, or Safari.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Push Notifications
          {isSubscribed && <Badge variant="secondary">Enabled</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Receive notifications on this device
            </p>
            <p className="text-sm text-muted-foreground">
              Get alerts for appointments, maintenance reminders, and messages
            </p>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={isSubscribed ? unsubscribeUser : subscribeUser}
            disabled={isLoading}
          />
        </div>

        {permission === 'denied' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {isSubscribed && (
            <Button
              variant="outline"
              size="sm"
              onClick={sendTestNotification}
              className="flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Send Test
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('/settings/notifications', '_blank')}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Notification Settings
          </Button>
        </div>

        {isSubscribed && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Notifications will appear even when the app is closed. You can disable them anytime.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}