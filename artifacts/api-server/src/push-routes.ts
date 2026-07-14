import express from 'express';
import { pushService } from './push-service';
import { storage } from './storage';

const router = express.Router();

/**
 * Resolve the authenticated user's id from the request.
 * Supports both session auth (email/password) and OAuth (Replit OIDC/passport).
 * Returns null if no authenticated user is present (caller should reject with 401).
 */
function resolveUserId(req: any): string | null {
  // Session path (email/password login)
  const sessionId = req.session?.user?.id;
  if (sessionId) return sessionId;

  // OAuth path (Replit OIDC / passport)
  const oauthId = req.user?.claims?.sub;
  if (oauthId && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
    return oauthId;
  }

  return null;
}

// Get VAPID public key for client subscription
router.get('/vapid-public-key', (_req, res) => {
  try {
    const publicKey = pushService.getVapidPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({ error: 'Failed to get VAPID public key' });
  }
});

// Subscribe to push notifications
router.post('/subscribe', async (req: any, res: any) => {
  try {
    const { endpoint, keys, userAgent } = req.body;
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Check if subscription already exists for this endpoint
    const existingSubscriptions = await storage.getPushSubscriptions(userId);
    const existingSubscription = existingSubscriptions.find(sub => sub.endpoint === endpoint);

    if (existingSubscription) {
      // Update existing subscription
      await storage.updatePushSubscription(existingSubscription.id, {
        isActive: true,
        userAgent: userAgent || null,
      });
      res.json({ success: true, message: 'Subscription updated' });
    } else {
      // Create new subscription
      await storage.createPushSubscription({
        userId,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        userAgent: userAgent || null,
        isActive: true,
      });
      res.json({ success: true, message: 'Subscription created' });
    }
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', async (req: any, res: any) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    await storage.deletePushSubscriptionByEndpoint(endpoint);
    res.json({ success: true, message: 'Successfully unsubscribed' });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
});

// Verify subscription exists on server
router.post('/verify', async (req: any, res: any) => {
  try {
    const { endpoint } = req.body;
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    const subscriptions = await storage.getPushSubscriptions(userId);
    const subscription = subscriptions.find(sub => sub.endpoint === endpoint);

    if (subscription && subscription.isActive) {
      res.json({ exists: true });
    } else {
      res.status(404).json({ exists: false });
    }
  } catch (error) {
    console.error('Error verifying subscription:', error);
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
});

// Send test push notification
router.post('/test', async (req: any, res: any) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await pushService.sendToUser(userId, {
      title: 'Test Notification',
      body: 'This is a test push notification from Home Base!',
      icon: '/icon-192x192.png',
      tag: 'test-notification',
      data: {
        type: 'test',
        timestamp: Date.now(),
      },
      actions: [
        {
          action: 'view',
          title: 'View App',
        }
      ]
    });

    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Get user's push subscriptions (for debugging/admin)
router.get('/subscriptions', async (req: any, res: any) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const subscriptions = await storage.getPushSubscriptions(userId);
    
    // Don't send sensitive keys to client
    const safeSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      endpoint: sub.endpoint,
      userAgent: sub.userAgent,
      isActive: sub.isActive,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    }));
    
    res.json(safeSubscriptions);
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
});

// Sync notifications for background sync
router.post('/sync', async (req: any, res: any) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    // Get unread notifications for the user
    const notifications = await storage.getUnreadNotifications(userId);
    
    // Send push notifications for any unread items
    for (const notification of notifications) {
      await pushService.sendToUser(userId, {
        title: notification.title,
        body: notification.message,
        data: {
          type: notification.type,
          notificationId: notification.id,
          actionUrl: notification.actionUrl,
        }
      });
    }
    
    res.json({ 
      success: true, 
      synced: notifications.length,
      message: `Synced ${notifications.length} notifications`
    });
  } catch (error) {
    console.error('Error syncing notifications:', error);
    res.status(500).json({ error: 'Failed to sync notifications' });
  }
});

export default router;
