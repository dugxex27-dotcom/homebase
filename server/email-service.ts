import sgMail from '@sendgrid/mail';
import { storage } from './storage';
import { db } from './db';
import { notificationPreferences } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = 'noreply@gotohomebase.com';
const fromName = 'HomeBase';
const testEmailOverride = '';

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
    const recipientEmail = testEmailOverride || data.to;
    const subjectPrefix = testEmailOverride ? `[TEST - Original: ${data.to}] ` : '';
    
    await sgMail.send({
      to: recipientEmail,
      from: { email: fromEmail, name: fromName },
      subject: subjectPrefix + data.subject,
      text: data.text,
      html: data.html,
      trackingSettings: {
        clickTracking: { enable: false, enableText: false },
      },
    });
    console.log('[EMAIL] Email sent to:', recipientEmail, testEmailOverride ? `(redirected from ${data.to})` : '');
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
        <li>Track your home maintenance history (think CARFAX for your home)</li>
        <li>Get seasonal maintenance reminders</li>
        <li>Find trusted contractors in your area</li>
        <li>Monitor your home's health score</li>
      </ul>
    `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6B46C1 0%, #805AD5 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff !important; margin: 0;">Welcome to HomeBase!</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <p>Hi ${userName || 'there'},</p>
        <p>Thanks for joining HomeBase - your home's new best friend!</p>
        ${roleSpecificContent}
        <p>You have a <strong>14-day free trial</strong> to explore all our premium features.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://gotohomebase.com" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Get Started</a>
        </div>
        <p>Questions? Email us at <a href="mailto:gotohomebase@gmail.com">gotohomebase@gmail.com</a> and we'll be happy to help!</p>
        <p>- The HomeBase Team</p>
      </div>
    </div>
  `;

  const text = `Welcome to HomeBase, ${userName || 'there'}! Thanks for joining - think of us as CARFAX for your home. You have a 14-day free trial to explore all our premium features. Visit gotohomebase.com to get started. Questions? Email us at gotohomebase@gmail.com.`;

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

export async function sendPasswordResetEmail(
  email: string,
  resetCode: string,
  userName?: string
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6B46C1 0%, #805AD5 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff !important; margin: 0;">Password Reset Code</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <p>Hi ${userName || 'there'},</p>
        <p>We received a request to reset your HomeBase password. Use the code below to reset it:</p>
        <div style="background: #6B46C1; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 30px 0; letter-spacing: 8px;">
          ${resetCode}
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in <strong>15 minutes</strong>.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password won't be changed.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">For security, this code can only be used once. If you need a new code, please request another reset.</p>
        <p>- The HomeBase Team</p>
      </div>
    </div>
  `;

  const text = `Hi ${userName || 'there'}, we received a request to reset your HomeBase password. Your reset code is: ${resetCode}. This code expires in 15 minutes. If you didn't request this, you can ignore this email.`;

  return sendEmail({
    to: email,
    subject: '🔐 Your HomeBase Password Reset Code',
    text,
    html,
  });
}

export async function sendAgentSignupNotification(
  agentEmail: string, 
  agentName: string,
  agentId: string
): Promise<boolean> {
  const adminEmail = 'gotohomebase2025@gmail.com';
  const signupDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff !important; margin: 0;">New Agent Signup!</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <p>A new real estate agent has signed up and needs verification:</p>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Name:</strong> ${agentName}</p>
          <p><strong>Email:</strong> ${agentEmail}</p>
          <p><strong>User ID:</strong> ${agentId}</p>
          <p><strong>Signup Date:</strong> ${signupDate}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://gotohomebase.com/admin" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Admin Dashboard</a>
        </div>
        <p style="color: #666; font-size: 14px;">Please verify this agent before they can earn affiliate commissions.</p>
      </div>
    </div>
  `;

  const text = `New Agent Signup! Name: ${agentName}, Email: ${agentEmail}, User ID: ${agentId}, Signup Date: ${signupDate}. Please verify at https://gotohomebase.com/admin`;

  return sendEmail({
    to: adminEmail,
    subject: '🏠 New Real Estate Agent Signup - Verification Needed',
    text,
    html,
  });
}

export const emailService = {
  sendEmail,
  sendWelcomeEmail,
  sendTrialExpiringEmail,
  sendAgentSignupNotification,
  sendPasswordResetEmail,
};
