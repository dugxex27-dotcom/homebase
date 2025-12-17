import sgMail from '@sendgrid/mail';
import { storage } from './storage';
import { db } from './db';
import { notificationPreferences } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = 'noreply@gotohomebase.com';
const fromName = 'HomeBase';

if (apiKey) {
  sgMail.setApiKey(apiKey);
  console.log('[EMAIL] SendGrid client initialized');
} else {
  console.warn('[EMAIL] SendGrid API key not configured - email notifications disabled');
}

interface EmailData {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function canSendEmail(userId: string, notificationType?: string): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user || !user.email) return false;
    
    if (!notificationType) return true;
    
    const prefs = await db.select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, notificationType)
      ))
      .limit(1);
    
    if (prefs.length === 0) {
      return true;
    }
    
    const pref = prefs[0];
    return pref.isEnabled && pref.channels.includes('email');
  } catch (error) {
    console.error('[EMAIL] Error checking preferences:', error);
    return true;
  }
}

export async function sendEmail(data: EmailData): Promise<boolean> {
  if (!apiKey) {
    console.log('[EMAIL] SendGrid not configured, skipping email');
    return false;
  }

  try {
    await sgMail.send({
      to: data.to,
      from: { email: fromEmail, name: fromName },
      subject: data.subject,
      text: data.text,
      html: data.html,
    });
    console.log('[EMAIL] Email sent to:', data.to);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(userId: string, userName: string, userRole: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user?.email) return false;

  const roleSpecificContent = userRole === 'contractor' 
    ? `
      <p>As a contractor on HomeBase, you can:</p>
      <ul>
        <li>Connect with homeowners in your area</li>
        <li>Manage leads and grow your business</li>
        <li>Track appointments and jobs</li>
        <li>Build your reputation with verified reviews</li>
      </ul>
    `
    : `
      <p>As a homeowner on HomeBase, you can:</p>
      <ul>
        <li>Track your home's maintenance history like a Carfax</li>
        <li>Get seasonal maintenance reminders</li>
        <li>Find trusted contractors in your area</li>
        <li>Monitor your home's health score</li>
      </ul>
    `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6B46C1 0%, #805AD5 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome to HomeBase!</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <p>Hi ${userName || 'there'},</p>
        <p>Thanks for joining HomeBase - your home's new best friend!</p>
        ${roleSpecificContent}
        <p>You have a <strong>14-day free trial</strong> to explore all our premium features.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://gotohomebase.com" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Get Started</a>
        </div>
        <p>Questions? Reply to this email and we'll be happy to help!</p>
        <p>- The HomeBase Team</p>
      </div>
    </div>
  `;

  const text = `Welcome to HomeBase, ${userName || 'there'}! Thanks for joining. You have a 14-day free trial to explore all our premium features. Visit gotohomebase.com to get started.`;

  return sendEmail({
    to: user.email,
    subject: 'Welcome to HomeBase! 🏠',
    text,
    html,
  });
}

export async function sendTrialExpiringEmail(userId: string, userName: string, daysRemaining: number): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user?.email) return false;

  const urgency = daysRemaining <= 1 ? 'expires tomorrow' : `expires in ${daysRemaining} days`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #E53E3E 0%, #FC8181 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Your Free Trial ${urgency.charAt(0).toUpperCase() + urgency.slice(1)}</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <p>Hi ${userName || 'there'},</p>
        <p>Your HomeBase free trial <strong>${urgency}</strong>!</p>
        <p>Don't lose access to:</p>
        <ul>
          <li>Your complete home maintenance history</li>
          <li>Seasonal maintenance reminders</li>
          <li>Home health score tracking</li>
          <li>Contractor connections and messaging</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://gotohomebase.com/billing" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Upgrade Now</a>
        </div>
        <p>Plans start at just $5/month. Keep your home healthy!</p>
        <p>- The HomeBase Team</p>
      </div>
    </div>
  `;

  const text = `Hi ${userName || 'there'}, your HomeBase free trial ${urgency}! Don't lose access to your home maintenance history, reminders, and more. Upgrade now at gotohomebase.com/billing. Plans start at just $5/month.`;

  return sendEmail({
    to: user.email,
    subject: `⏰ Your HomeBase trial ${urgency}`,
    text,
    html,
  });
}

export const emailService = {
  sendEmail,
  sendWelcomeEmail,
  sendTrialExpiringEmail,
};
