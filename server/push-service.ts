import webpush from 'web-push';
import { storage } from './storage';
import type { PushSubscription } from '@shared/schema';
import { smsService } from './sms-service';

// Generate VAPID keys for push notifications
import crypto from 'crypto';

// Helper to generate VAPID keys if not provided in environment
const generateVapidKeys = () => {
  // Use web-push to generate keys if needed
  return webpush.generateVAPIDKeys();
};

let vapidKeys: { publicKey: string; privateKey: string };

try {
  // Try to use environment variables first
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };
  } else {
    // Generate new VAPID keys for development
    vapidKeys = generateVapidKeys();
    console.log('Generated VAPID Keys for development:');
    console.log('Public Key:', vapidKeys.publicKey);
    console.log('\nTo use these keys in production, set the following environment variables:');
    console.log('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY');
  }
} catch (error) {
  console.error('Failed to initialize VAPID keys:', error);
  throw new Error(
    'VAPID keys must be configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables. ' +
    'Generate keys using: npx web-push generate-vapid-keys'
  );
}

webpush.setVapidDetails(
  'mailto:support@homebase.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

export class PushNotificationService {
  // Send push notification to a specific user
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    try {
      const subscriptions = await storage.getPushSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return;
      }

      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/badge-72x72.png',
        data: payload.data || {},
        actions: payload.actions || [],
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false,
        timestamp: Date.now(),
      });

      // Send to all user's subscriptions
      const promises = subscriptions.map(async (subscription: PushSubscription) => {
        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey,
            }
          }, notificationPayload);
          
          console.log(`Push notification sent to subscription ${subscription.id}`);
        } catch (error: any) {
          console.error(`Failed to send push notification to subscription ${subscription.id}:`, error);
          
          // Handle expired or invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Removing invalid subscription ${subscription.id}`);
            await storage.deletePushSubscription(subscription.id);
          }
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Send notification for appointment reminders
  async sendAppointmentReminder(userId: string, appointment: any): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Appointment Reminder',
      body: `You have an appointment with ${appointment.contractorName} in ${appointment.timeUntil}`,
      icon: '/appointment-icon.png',
      tag: `appointment-${appointment.id}`,
      data: {
        type: 'appointment',
        appointmentId: appointment.id,
        actionUrl: '/appointments'
      },
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'reschedule',
          title: 'Reschedule'
        }
      ],
      requireInteraction: true
    });
  }

  // Send notification for maintenance tasks
  async sendMaintenanceReminder(userId: string, task: any): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Maintenance Due',
      body: `Time for: ${task.title}`,
      icon: '/maintenance-icon.png',
      tag: `maintenance-${task.id}`,
      data: {
        type: 'maintenance',
        taskId: task.id,
        actionUrl: '/maintenance'
      },
      actions: [
        {
          action: 'view',
          title: 'View Task'
        },
        {
          action: 'schedule',
          title: 'Schedule Service'
        }
      ]
    });
    
    // Also send SMS if user has SMS enabled
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'soon';
    smsService.sendMaintenanceReminder(userId, task.title, dueDate)
      .catch(err => console.error('[SMS] Error sending maintenance reminder:', err));
  }

  // Send notification for new messages
  async sendMessageNotification(userId: string, message: any): Promise<void> {
    await this.sendToUser(userId, {
      title: 'New Message',
      body: `${message.senderName}: ${message.preview}`,
      icon: '/message-icon.png',
      tag: `message-${message.conversationId}`,
      data: {
        type: 'message',
        conversationId: message.conversationId,
        actionUrl: `/messages/${message.conversationId}`
      },
      actions: [
        {
          action: 'reply',
          title: 'Reply'
        },
        {
          action: 'view',
          title: 'View Conversation'
        }
      ]
    });
  }

  // Send notification for contractor proposal updates
  async sendProposalNotification(userId: string, proposal: any): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Proposal Update',
      body: `New proposal from ${proposal.contractorName}: ${proposal.title}`,
      icon: '/proposal-icon.png',
      tag: `proposal-${proposal.id}`,
      data: {
        type: 'proposal',
        proposalId: proposal.id,
        actionUrl: '/proposals'
      },
      actions: [
        {
          action: 'view',
          title: 'View Proposal'
        },
        {
          action: 'respond',
          title: 'Respond'
        }
      ]
    });
  }

  // Get VAPID public key for client-side subscription
  getVapidPublicKey(): string {
    return vapidKeys.publicKey;
  }
}

export const pushService = new PushNotificationService();