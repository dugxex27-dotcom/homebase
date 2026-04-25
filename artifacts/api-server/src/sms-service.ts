import twilio from 'twilio';
import { storage } from './storage';
import { getPreparednessInfo } from './email-service';
import { db } from './db';
import { notificationPreferences } from '@workspace/db';
import { eq, and } from 'drizzle-orm';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const rawFromNumber = process.env.TWILIO_PHONE_NUMBER;

// Format the from number to E.164 format if needed
function formatFromNumber(phone: string | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  } else if (phone.startsWith('+')) {
    return phone;
  } else if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  return phone;
}

const fromNumber = formatFromNumber(rawFromNumber);

let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken && fromNumber) {
  twilioClient = twilio(accountSid, authToken);
  console.log('[SMS] Twilio client initialized with from number:', fromNumber);
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
    if (!user || !user.phone) {
      console.log('[SMS] User has no phone number:', userId);
      return false;
    }
    
    const prefs = await db.select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, notificationType)
      ))
      .limit(1);
    
    if (prefs.length === 0) {
      console.log('[SMS] No preferences set for user, allowing SMS by default:', userId);
      return true;
    }
    
    const pref = prefs[0];
    const canSend = pref.isEnabled && pref.channels.includes('sms');
    if (!canSend) {
      console.log('[SMS] User has disabled SMS for', notificationType);
    }
    return canSend;
  } catch (error) {
    console.error('[SMS] Error checking preferences:', error);
    return true;
  }
}

export async function sendSMS(notification: SMSNotification): Promise<boolean> {
  if (!twilioClient || !fromNumber) {
    return false;
  }

  try {
    const formattedNumber = await formatPhoneNumber(notification.to);
    if (!formattedNumber) {
      console.log('[SMS] Invalid phone number format:', notification.to);
      return false;
    }

    console.log('[SMS] Attempting to send to:', formattedNumber, 'from:', fromNumber);
    const message = await twilioClient.messages.create({
      body: notification.body,
      from: fromNumber,
      to: formattedNumber,
    });

    console.log('[SMS] Message sent successfully - SID:', message.sid, 'Status:', message.status);
    return true;
  } catch (error: any) {
    console.error('[SMS] Failed to send message - Error:', error?.message || error, 'Code:', error?.code);
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

export async function sendWelcomeSMS(userId: string, userName: string): Promise<boolean> {
  if (!await canSendSMS(userId, 'marketing')) return false;
  
  const user = await storage.getUser(userId);
  if (!user?.phone) return false;

  return sendSMS({
    to: user.phone,
    body: `Welcome to HomeBase, ${userName || 'friend'}! 🏠 Your 14-day free trial starts now. Track maintenance, find contractors, and keep your home healthy. Visit gotohomebase.com to get started!`,
  });
}

export async function sendTrialExpiringSMS(userId: string, daysRemaining: number): Promise<boolean> {
  if (!await canSendSMS(userId, 'marketing')) return false;
  
  const user = await storage.getUser(userId);
  if (!user?.phone) return false;

  const urgency = daysRemaining <= 1 ? 'expires tomorrow' : `expires in ${daysRemaining} days`;

  return sendSMS({
    to: user.phone,
    body: `HomeBase: Your free trial ${urgency}! Don't lose your home history. Upgrade now at gotohomebase.com/billing - plans from $5/mo.`,
  });
}

export interface CrmDocumentSMSData {
  clientPhone: string;
  clientName: string;
  contractorName: string;
  contractorCompany?: string;
  documentNumber: string;
  documentTitle: string;
  total: string;
  viewUrl: string;
  scheduledDate?: string;
  dueDate?: string;
}

export async function sendQuoteSMS(data: CrmDocumentSMSData): Promise<boolean> {
  const sender = data.contractorCompany || data.contractorName;
  return sendSMS({
    to: data.clientPhone,
    body: `${sender}: Hi ${data.clientName}, you've received Quote #${data.documentNumber} for ${data.documentTitle}. Total: ${data.total}. View & accept: ${data.viewUrl}`,
  });
}

export async function sendJobNotificationSMS(data: CrmDocumentSMSData): Promise<boolean> {
  const sender = data.contractorCompany || data.contractorName;
  const scheduleInfo = data.scheduledDate ? ` Scheduled: ${data.scheduledDate}.` : '';
  return sendSMS({
    to: data.clientPhone,
    body: `${sender}: Hi ${data.clientName}, job update for "${data.documentTitle}".${scheduleInfo} View details: ${data.viewUrl}`,
  });
}

export async function sendInvoiceSMS(data: CrmDocumentSMSData): Promise<boolean> {
  const sender = data.contractorCompany || data.contractorName;
  const dueInfo = data.dueDate ? ` Due: ${data.dueDate}.` : '';
  return sendSMS({
    to: data.clientPhone,
    body: `${sender}: Hi ${data.clientName}, Invoice #${data.documentNumber} for ${data.total}.${dueInfo} Pay now: ${data.viewUrl}`,
  });
}

export async function sendWeatherAlertSMS(
  userId: string,
  houseName: string,
  alertEvent: string,
  alertHeadline: string,
  severity: string
): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user?.phone) return false;

  const prep = getPreparednessInfo(alertEvent);
  const headline = alertHeadline ? alertHeadline.slice(0, 80) : alertEvent;
  const body = `${prep.emoji} HomeBase Alert: ${alertEvent} (${severity}) for ${houseName}. ${headline}\n\nTip: ${prep.smsTip}`;
  return sendSMS({ to: user.phone, body });
}

export async function sendWeatherForecastReminderSMS(
  userId: string,
  houseName: string,
  triggerResult: { trigger: string; description: string; expectedDate: string },
  tasks: Array<{ title: string }>
): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user?.phone) return false;

  const triggerEmojis: Record<string, string> = {
    hard_freeze: '🧊', heavy_rain: '🌧️', high_winds: '💨', extreme_heat: '🌡️', snow_storm: '❄️',
  };
  const triggerLabels: Record<string, string> = {
    hard_freeze: 'Hard Freeze', heavy_rain: 'Heavy Rain', high_winds: 'High Winds',
    extreme_heat: 'Extreme Heat', snow_storm: 'Snow/Ice Storm',
  };
  const emoji = triggerEmojis[triggerResult.trigger] || '🌩️';
  const label = triggerLabels[triggerResult.trigger] || 'Weather Event';
  const taskList = tasks.slice(0, 3).map(t => t.title).join(', ');
  const more = tasks.length > 3 ? ` +${tasks.length - 3} more` : '';

  return sendSMS({
    to: user.phone,
    body: `${emoji} MyHomeBase™: ${label} forecast for ${houseName} (${triggerResult.expectedDate}). Complete before it hits: ${taskList}${more}. gotohomebase.com/maintenance`,
  });
}

export const smsService = {
  sendSMS,
  sendMaintenanceReminder,
  sendAppointmentConfirmation,
  sendNewMessageNotification,
  sendAppointmentReminder,
  sendWelcomeSMS,
  sendTrialExpiringSMS,
  sendQuoteSMS,
  sendJobNotificationSMS,
  sendInvoiceSMS,
  sendWeatherAlertSMS,
  sendWeatherForecastReminderSMS,
};
