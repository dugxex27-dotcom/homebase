import twilio from 'twilio';
import { storage } from './storage';
import { db } from './db';
import { notificationPreferences } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken && fromNumber) {
  twilioClient = twilio(accountSid, authToken);
  console.log('[SMS] Twilio client initialized');
} else {
  console.warn('[SMS] Twilio credentials not configured - SMS notifications disabled');
}

export interface SMSNotification {
  to: string;
  body: string;
}

async function formatPhoneNumber(phone: string): Promise<string | null> {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  } else if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  return null;
}

async function canSendSMS(userId: string, notificationType: 'maintenance' | 'appointment' | 'messages'): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user || !user.phone) return false;
    
    const prefs = await db.select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, notificationType)
      ))
      .limit(1);
    
    if (prefs.length === 0) {
      return false;
    }
    
    const pref = prefs[0];
    return pref.isEnabled && pref.channels.includes('sms');
  } catch (error) {
    console.error('[SMS] Error checking preferences:', error);
    return false;
  }
}

export async function sendSMS(notification: SMSNotification): Promise<boolean> {
  if (!twilioClient || !fromNumber) {
    console.log('[SMS] Twilio not configured, skipping SMS');
    return false;
  }

  try {
    const formattedNumber = await formatPhoneNumber(notification.to);
    if (!formattedNumber) {
      console.log('[SMS] Invalid phone number:', notification.to);
      return false;
    }

    const message = await twilioClient.messages.create({
      body: notification.body,
      from: fromNumber,
      to: formattedNumber,
    });

    console.log('[SMS] Message sent:', message.sid);
    return true;
  } catch (error) {
    console.error('[SMS] Failed to send message:', error);
    return false;
  }
}

export async function sendMaintenanceReminder(userId: string, taskName: string, dueDate: string): Promise<boolean> {
  if (!await canSendSMS(userId, 'maintenance')) return false;
  
  const user = await storage.getUser(userId);
  if (!user?.phone) return false;

  return sendSMS({
    to: user.phone,
    body: `HomeBase Reminder: "${taskName}" is due on ${dueDate}. Log in to mark it complete and keep your home healthy!`,
  });
}

export async function sendAppointmentConfirmation(
  userId: string,
  contractorName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<boolean> {
  if (!await canSendSMS(userId, 'appointment')) return false;
  
  const user = await storage.getUser(userId);
  if (!user?.phone) return false;

  return sendSMS({
    to: user.phone,
    body: `HomeBase: Your appointment with ${contractorName} is confirmed for ${appointmentDate} at ${appointmentTime}.`,
  });
}

export async function sendNewMessageNotification(
  recipientId: string,
  senderName: string,
  messagePreview: string
): Promise<boolean> {
  if (!await canSendSMS(recipientId, 'messages')) return false;
  
  const user = await storage.getUser(recipientId);
  if (!user?.phone) return false;

  const truncatedPreview = messagePreview.length > 50 
    ? messagePreview.substring(0, 50) + '...' 
    : messagePreview;

  return sendSMS({
    to: user.phone,
    body: `HomeBase: New message from ${senderName}: "${truncatedPreview}" - Log in to reply.`,
  });
}

export async function sendAppointmentReminder(
  userId: string,
  contractorName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<boolean> {
  if (!await canSendSMS(userId, 'appointment')) return false;
  
  const user = await storage.getUser(userId);
  if (!user?.phone) return false;

  return sendSMS({
    to: user.phone,
    body: `HomeBase Reminder: You have an appointment with ${contractorName} tomorrow at ${appointmentTime}. Reply CONFIRM to confirm or call to reschedule.`,
  });
}

export const smsService = {
  sendSMS,
  sendMaintenanceReminder,
  sendAppointmentConfirmation,
  sendNewMessageNotification,
  sendAppointmentReminder,
};
