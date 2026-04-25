import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiRequest } from '@/lib/queryClient';

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    setIsSupported(platform === 'ios' || platform === 'android');
  }, []);

  const registerPushNotifications = useCallback(async () => {
    if (!isSupported) {
      console.log('[PUSH] Not supported on this platform');
      return null;
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      setPermissionStatus(permStatus.receive as 'granted' | 'denied' | 'prompt');

      if (permStatus.receive !== 'granted') {
        console.log('[PUSH] Permission not granted');
        return null;
      }

      await PushNotifications.register();
      return token;
    } catch (error) {
      console.error('[PUSH] Registration error:', error);
      return null;
    }
  }, [isSupported, token]);

  useEffect(() => {
    if (!isSupported) return;

    const setupListeners = async () => {
      await PushNotifications.addListener('registration', async (tokenData) => {
        console.log('[PUSH] Token received:', tokenData.value);
        setToken(tokenData.value);
        
        try {
          await apiRequest('POST', '/api/push-token', {
            token: tokenData.value,
            platform: Capacitor.getPlatform()
          });
          console.log('[PUSH] Token saved to server');
        } catch (error) {
          console.error('[PUSH] Failed to save token:', error);
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[PUSH] Registration error:', error.error);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[PUSH] Notification received:', notification);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[PUSH] Action performed:', action.actionId);
      });
    };

    setupListeners();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isSupported]);

  return {
    token,
    permissionStatus,
    isSupported,
    registerPushNotifications
  };
}
