import { getFirebaseMessaging } from './firebase-admin';
import { storage } from './storage';
import type { PushToken } from '@shared/schema';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

class PushNotificationService {
  private isConfigured(): boolean {
    return !!process.env.FIREBASE_SERVICE_ACCOUNT;
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('[PUSH] Firebase not configured - skipping push notification');
      return false;
    }

    try {
      const tokens = await storage.getPushTokensForUser(userId);
      
      if (!tokens || tokens.length === 0) {
        console.log(`[PUSH] No active push tokens for user ${userId}`);
        return false;
      }

      const messaging = getFirebaseMessaging();
      if (!messaging) {
        console.log('[PUSH] Firebase messaging not available');
        return false;
      }

      const activeTokens = tokens.filter((t: PushToken) => t.isActive).map((t: PushToken) => t.token);
      
      if (activeTokens.length === 0) {
        console.log(`[PUSH] No active tokens for user ${userId}`);
        return false;
      }

      const message: any = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        tokens: activeTokens,
      };

      if (payload.imageUrl) {
        message.notification.imageUrl = payload.imageUrl;
      }

      const response = await messaging.sendEachForMulticast(message);
      
      console.log(`[PUSH] Sent to user ${userId}: ${response.successCount} success, ${response.failureCount} failures`);

      // Deactivate failed tokens
      if (response.failureCount > 0) {
        response.responses.forEach(async (resp, idx) => {
          if (!resp.success) {
            const failedToken = activeTokens[idx];
            const tokenRecord = tokens.find((t: PushToken) => t.token === failedToken);
            if (tokenRecord) {
              console.log(`[PUSH] Deactivating invalid token: ${failedToken.substring(0, 20)}...`);
              await storage.deactivatePushToken(tokenRecord.id);
            }
          }
        });
      }

      return response.successCount > 0;
    } catch (error) {
      console.error(`[PUSH] Error sending to user ${userId}:`, error);
      return false;
    }
  }

  async sendWelcomePush(userId: string, userName: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Welcome to HomeBase!',
      body: `Hi ${userName}, your home management journey starts now.`,
      data: {
        type: 'welcome',
        screen: 'home'
      }
    });
  }

  async sendMaintenanceReminderPush(userId: string, taskName: string, dueDate: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Maintenance Reminder',
      body: `${taskName} is due on ${dueDate}`,
      data: {
        type: 'maintenance_reminder',
        screen: 'maintenance'
      }
    });
  }

  async sendTrialExpiringPush(userId: string, daysRemaining: number): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Trial Ending Soon',
      body: `Your free trial ends in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Subscribe to keep your home organized!`,
      data: {
        type: 'trial_expiring',
        screen: 'subscription'
      }
    });
  }

  async sendNewMessagePush(userId: string, senderName: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'New Message',
      body: `You have a new message from ${senderName}`,
      data: {
        type: 'new_message',
        screen: 'messages'
      }
    });
  }

  async sendProposalReceivedPush(userId: string, contractorName: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'New Proposal',
      body: `${contractorName} sent you a proposal`,
      data: {
        type: 'proposal_received',
        screen: 'proposals'
      }
    });
  }

  async sendAppointmentReminderPush(userId: string, serviceName: string, appointmentDate: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Appointment Reminder',
      body: `Your ${serviceName} appointment is scheduled for ${appointmentDate}`,
      data: {
        type: 'appointment_reminder',
        screen: 'appointments'
      }
    });
  }
}

export const pushNotificationService = new PushNotificationService();
