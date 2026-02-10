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

// Logo URL for email templates
const emailLogoUrl = 'https://gotohomebase.com/email-logo.png';

// Reusable email header with logo
function getEmailHeader(title?: string): string {
  const titleHtml = title ? `<h1 style="color: #333333 !important; margin: 0; font-size: 24px;">${title}</h1>` : '';
  return `
    <div style="background: #ffffff; padding: 30px; text-align: center;">
      <img src="${emailLogoUrl}" alt="MyHomeBase" style="height: 50px; width: auto;${title ? ' margin-bottom: 15px;' : ''}" />
      ${titleHtml}
    </div>
  `;
}

// Reusable email wrapper with footer
function wrapEmailContent(headerHtml: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${headerHtml}
      <div style="padding: 30px; background: #f9f9f9;">
        ${bodyHtml}
      </div>
      <div style="padding: 30px 20px; background: #1a1a2e; text-align: center;">
        <p style="color: #ffffff; margin: 0 0 15px 0; font-size: 20px; font-weight: 500;">Your home is one of your biggest assets.</p>
        <p style="margin: 0; font-size: 18px;">👉 <a href="https://gotohomebase.com" style="color: #a78bfa; text-decoration: none; font-weight: bold; font-size: 18px;">Protect it with MyHomeBase today</a> 👈</p>
      </div>
    </div>
  `;
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

  const html = wrapEmailContent(
    getEmailHeader(),
    `
      <p>Hi ${userName || 'there'},</p>
      <p>Thanks for joining HomeBase - your home's new best friend!</p>
      ${roleSpecificContent}
      <p>You have a <strong>14-day free trial</strong> to explore all our premium features.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://gotohomebase.com" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Get Started</a>
      </div>
      <p>Questions? Email us at <a href="mailto:gotohomebase@gmail.com">gotohomebase@gmail.com</a> and we'll be happy to help!</p>
      <p>- The HomeBase Team</p>
    `
  );

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
  
  const html = wrapEmailContent(
    getEmailHeader(),
    `
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
    `
  );

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
  const html = wrapEmailContent(
    getEmailHeader(),
    `
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
    `
  );

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

  const html = wrapEmailContent(
    getEmailHeader(),
    `
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
    `
  );

  const text = `New Agent Signup! Name: ${agentName}, Email: ${agentEmail}, User ID: ${agentId}, Signup Date: ${signupDate}. Please verify at https://gotohomebase.com/admin`;

  return sendEmail({
    to: adminEmail,
    subject: '🏠 New Real Estate Agent Signup - Verification Needed',
    text,
    html,
  });
}

export interface CrmDocumentEmailData {
  clientName: string;
  clientEmail: string;
  contractorName: string;
  contractorCompany?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  documentNumber: string;
  documentTitle: string;
  total: string;
  validUntil?: string;
  dueDate?: string;
  viewUrl: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: string; total: string }>;
}

export async function sendQuoteEmail(data: CrmDocumentEmailData): Promise<boolean> {
  const lineItemsHtml = data.lineItems?.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.unitPrice}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.total}</td>
    </tr>
  `).join('') || '';

  const html = wrapEmailContent(
    getEmailHeader(),
    `
      <p>Hi ${data.clientName},</p>
      <p>You've received a quote for services. Here are the details:</p>
      
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p><strong>Quote #:</strong> ${data.documentNumber}</p>
        <p><strong>Service:</strong> ${data.documentTitle}</p>
        ${data.validUntil ? `<p><strong>Valid Until:</strong> ${data.validUntil}</p>` : ''}
        
        ${data.lineItems && data.lineItems.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; text-align: left;">Description</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Unit Price</th>
              <th style="padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
        ` : ''}
        
        <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #1e3a5f;">
          <p style="font-size: 20px; font-weight: bold; color: #1e3a5f;">Total: ${data.total}</p>
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.viewUrl}" style="background: #1e3a5f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Quote</a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #666; font-size: 14px;">
        <strong>${data.contractorCompany || data.contractorName}</strong><br>
        ${data.contractorEmail ? `Email: ${data.contractorEmail}<br>` : ''}
        ${data.contractorPhone ? `Phone: ${data.contractorPhone}` : ''}
      </p>
    `
  );

  const text = `Hi ${data.clientName}, you've received a quote (#${data.documentNumber}) from ${data.contractorCompany || data.contractorName} for ${data.documentTitle}. Total: ${data.total}. View it at: ${data.viewUrl}`;

  return sendEmail({
    to: data.clientEmail,
    subject: `Quote #${data.documentNumber} from ${data.contractorCompany || data.contractorName}`,
    text,
    html,
  });
}

export async function sendJobNotificationEmail(data: CrmDocumentEmailData & { scheduledDate?: string; status?: string }): Promise<boolean> {
  const html = wrapEmailContent(
    getEmailHeader(),
    `
      <p>Hi ${data.clientName},</p>
      <p>Here's an update on your scheduled service:</p>
      
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p><strong>Job:</strong> ${data.documentTitle}</p>
        ${data.scheduledDate ? `<p><strong>Scheduled:</strong> ${data.scheduledDate}</p>` : ''}
        ${data.status ? `<p><strong>Status:</strong> ${data.status}</p>` : ''}
        ${data.total !== '$0.00' ? `<p><strong>Estimated Cost:</strong> ${data.total}</p>` : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.viewUrl}" style="background: #1e3a5f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Details</a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #666; font-size: 14px;">
        <strong>${data.contractorCompany || data.contractorName}</strong><br>
        ${data.contractorEmail ? `Email: ${data.contractorEmail}<br>` : ''}
        ${data.contractorPhone ? `Phone: ${data.contractorPhone}` : ''}
      </p>
    `
  );

  const text = `Hi ${data.clientName}, job update from ${data.contractorCompany || data.contractorName}: ${data.documentTitle}. ${data.scheduledDate ? `Scheduled: ${data.scheduledDate}. ` : ''}${data.status ? `Status: ${data.status}. ` : ''}View details at: ${data.viewUrl}`;

  return sendEmail({
    to: data.clientEmail,
    subject: `Job Update: ${data.documentTitle} - ${data.contractorCompany || data.contractorName}`,
    text,
    html,
  });
}

export async function sendInvoiceEmail(data: CrmDocumentEmailData): Promise<boolean> {
  const lineItemsHtml = data.lineItems?.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.unitPrice}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.total}</td>
    </tr>
  `).join('') || '';

  const html = wrapEmailContent(
    getEmailHeader(),
    `
      <p>Hi ${data.clientName},</p>
      <p>Please find your invoice below:</p>
      
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p><strong>Invoice #:</strong> ${data.documentNumber}</p>
        <p><strong>Service:</strong> ${data.documentTitle}</p>
        ${data.dueDate ? `<p><strong>Due Date:</strong> <span style="color: #dc2626; font-weight: bold;">${data.dueDate}</span></p>` : ''}
        
        ${data.lineItems && data.lineItems.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; text-align: left;">Description</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Unit Price</th>
              <th style="padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
        ` : ''}
        
        <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #1e3a5f;">
          <p style="font-size: 20px; font-weight: bold; color: #1e3a5f;">Amount Due: ${data.total}</p>
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.viewUrl}" style="background: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Pay Now</a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #666; font-size: 14px;">
        <strong>${data.contractorCompany || data.contractorName}</strong><br>
        ${data.contractorEmail ? `Email: ${data.contractorEmail}<br>` : ''}
        ${data.contractorPhone ? `Phone: ${data.contractorPhone}` : ''}
      </p>
    `
  );

  const text = `Hi ${data.clientName}, you've received invoice #${data.documentNumber} from ${data.contractorCompany || data.contractorName}. Amount Due: ${data.total}. ${data.dueDate ? `Due: ${data.dueDate}. ` : ''}Pay now at: ${data.viewUrl}`;

  return sendEmail({
    to: data.clientEmail,
    subject: `Invoice #${data.documentNumber} from ${data.contractorCompany || data.contractorName} - ${data.total} Due`,
    text,
    html,
  });
}

export async function sendBulkWelcomeFeedbackEmail(
  users: Array<{ email: string; firstName?: string | null; id?: string }>,
  replyToEmail: string = 'gotohomebase2025@gmail.com'
): Promise<{ sent: number; failed: number; skipped: number }> {
  if (!apiKey) {
    console.log('[EMAIL] SendGrid not configured, skipping bulk email');
    return { sent: 0, failed: 0, skipped: 0 };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (!user.email) {
      skipped++;
      continue;
    }

    const userName = user.firstName || 'there';
    
    const html = wrapEmailContent(
      getEmailHeader(),
      `
        <p>Hi ${userName},</p>
        <p>We hope you're enjoying your HomeBase experience so far! We're constantly working to make the platform better for you.</p>
        <p>We'd love to hear from you:</p>
        <ul>
          <li>How has your experience been so far?</li>
          <li>Are there any features you'd like to see?</li>
          <li>Do you have any questions or concerns?</li>
        </ul>
        <p>Your feedback helps us build a better HomeBase for everyone. Please don't hesitate to reach out!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:${replyToEmail}" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Send Us Feedback</a>
        </div>
        <p>You can also email us directly at <a href="mailto:${replyToEmail}">${replyToEmail}</a></p>
        <p>Thank you for being part of the HomeBase community!</p>
        <p>- The HomeBase Team</p>
      `
    );

    const text = `Hi ${userName}, we hope you're enjoying HomeBase! We'd love to hear your feedback. How has your experience been? Any features you'd like to see? Questions or concerns? Email us at ${replyToEmail} - The HomeBase Team`;

    try {
      const recipientEmail = testEmailOverride || user.email;
      const subjectPrefix = testEmailOverride ? `[TEST - Original: ${user.email}] ` : '';
      
      await sgMail.send({
        to: recipientEmail,
        from: { email: fromEmail, name: fromName },
        replyTo: replyToEmail,
        subject: subjectPrefix + 'How are you enjoying HomeBase?',
        text,
        html,
        trackingSettings: {
          clickTracking: { enable: false, enableText: false },
        },
      });
      console.log('[EMAIL] Bulk email sent to:', recipientEmail);
      sent++;
      
      // Rate limiting: add 100ms delay between emails to avoid hitting SendGrid limits
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('[EMAIL] Failed to send bulk email to:', user.email, error);
      failed++;
    }
  }

  console.log(`[EMAIL] Bulk send complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);
  return { sent, failed, skipped };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendBulkCustomEmail(
  users: Array<{ email: string; firstName?: string | null; id?: string }>,
  subject: string,
  body: string,
  replyToEmail: string = 'gotohomebase2025@gmail.com',
  imageUrl?: string
): Promise<{ sent: number; failed: number; skipped: number }> {
  if (!apiKey) {
    console.log('[EMAIL] SendGrid not configured, skipping bulk email');
    return { sent: 0, failed: 0, skipped: 0 };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Escape and format body for HTML (convert newlines to <br>)
  const escapedBody = escapeHtml(body).replace(/\n/g, '<br>');

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (!user.email) {
      skipped++;
      continue;
    }

    const userName = user.firstName || 'there';
    
    // Replace {{name}} placeholder if present
    const personalizedBody = escapedBody.replace(/\{\{name\}\}/gi, escapeHtml(userName));
    const personalizedTextBody = body.replace(/\{\{name\}\}/gi, userName);
    
    const imageHtml = imageUrl ? `<div style="text-align: center; margin: 20px 0;"><img src="${escapeHtml(imageUrl)}" alt="" style="max-width: 100%; height: auto; border-radius: 8px;" /></div>` : '';

    const html = wrapEmailContent(
      getEmailHeader(),
      `
        ${imageHtml}
        <p>${personalizedBody}</p>
        <div style="padding-top: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>This email was sent from HomeBase. Reply to <a href="mailto:${escapeHtml(replyToEmail)}">${escapeHtml(replyToEmail)}</a></p>
        </div>
      `
    );

    const text = personalizedTextBody;

    try {
      const recipientEmail = testEmailOverride || user.email;
      const subjectPrefix = testEmailOverride ? `[TEST - Original: ${user.email}] ` : '';
      
      await sgMail.send({
        to: recipientEmail,
        from: { email: fromEmail, name: fromName },
        replyTo: replyToEmail,
        subject: subjectPrefix + subject,
        text,
        html,
        trackingSettings: {
          clickTracking: { enable: false, enableText: false },
        },
      });
      console.log('[EMAIL] Custom bulk email sent to:', recipientEmail);
      sent++;
      
      // Rate limiting: add 100ms delay between emails to avoid hitting SendGrid limits
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('[EMAIL] Failed to send custom bulk email to:', user.email, error);
      failed++;
    }
  }

  console.log(`[EMAIL] Custom bulk send complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);
  return { sent, failed, skipped };
}

export async function sendNewMessageEmail(
  userId: string,
  senderName: string,
  messagePreview: string
): Promise<boolean> {
  if (!apiKey) {
    console.log('[EMAIL] SendGrid not configured, skipping new message email');
    return false;
  }

  const canSend = await canSendEmail(userId, 'messages');
  if (!canSend) {
    console.log('[EMAIL] User has disabled email notifications for messages');
    return false;
  }

  const user = await storage.getUser(userId);
  if (!user?.email) {
    console.log('[EMAIL] No email found for user:', userId);
    return false;
  }

  const truncatedPreview = messagePreview.length > 100 
    ? messagePreview.substring(0, 100) + '...' 
    : messagePreview;

  const html = wrapEmailContent(
    getEmailHeader(),
    `
      <p>Hi ${user.firstName || 'there'},</p>
      <p><strong>${senderName}</strong> sent you a message on HomeBase:</p>
      <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #6B46C1; margin: 20px 0;">
        <p style="margin: 0; color: #333;">${truncatedPreview}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://gotohomebase.com/messages" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Message</a>
      </div>
      <p style="font-size: 12px; color: #666;">You can manage your notification preferences in your account settings.</p>
    `
  );

  const text = `Hi ${user.firstName || 'there'}, ${senderName} sent you a message on HomeBase: "${truncatedPreview}" - View it at https://gotohomebase.com/messages`;

  return sendEmail({
    to: user.email,
    subject: `New message from ${senderName}`,
    html,
    text,
  });
}

export interface ContractorViewReportData {
  contractorName: string;
  contractorEmail: string;
  monthName: string;
  year: number;
  totalViews: number;
  uniqueVisitors: number;
  websiteClicks: number;
  phoneClicks: number;
  emailClicks: number;
  socialMediaClicks: number;
  previousMonthViews?: number;
}

export async function sendContractorMonthlyViewReportEmail(data: ContractorViewReportData): Promise<boolean> {
  if (!apiKey) {
    console.log('[EMAIL] SendGrid not configured, skipping monthly view report email');
    return false;
  }

  const viewChange = data.previousMonthViews !== undefined 
    ? data.totalViews - data.previousMonthViews 
    : null;
  
  const viewChangeText = viewChange !== null
    ? viewChange > 0 
      ? `<span style="color: #22c55e;">+${viewChange} from last month</span>`
      : viewChange < 0
        ? `<span style="color: #ef4444;">${viewChange} from last month</span>`
        : `<span style="color: #666;">Same as last month</span>`
    : '';

  const html = wrapEmailContent(
    getEmailHeader(),
    `
      <p>Hi ${data.contractorName},</p>
      <p>Here's how your HomeBase profile performed last month:</p>
      
      <div style="background: white; border-radius: 12px; padding: 25px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #6B46C1; font-size: 48px;">${data.totalViews}</h2>
          <p style="margin: 5px 0; color: #666;">Profile Views ${viewChangeText}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">${data.uniqueVisitors}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Unique Visitors</p>
          </div>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">${data.websiteClicks}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Website Clicks</p>
          </div>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">${data.phoneClicks}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Phone Clicks</p>
          </div>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">${data.socialMediaClicks}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Social Media Clicks</p>
          </div>
        </div>
      </div>
      
      <div style="background: #e9d8fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #6B46C1;">Tips to boost your profile:</p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #553c9a;">
          <li>Add photos of your recent work</li>
          <li>Respond quickly to homeowner messages</li>
          <li>Ask satisfied customers for reviews</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://gotohomebase.com/contractor/dashboard" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Your Dashboard</a>
      </div>
      
      <p style="font-size: 12px; color: #666;">You're receiving this because you have a contractor profile on HomeBase. Manage your email preferences in your account settings.</p>
    `
  );

  const text = `Hi ${data.contractorName}, here's your HomeBase profile report for ${data.monthName} ${data.year}: ${data.totalViews} profile views, ${data.uniqueVisitors} unique visitors, ${data.websiteClicks} website clicks. Visit gotohomebase.com/contractor/dashboard to see more details.`;

  return sendEmail({
    to: data.contractorEmail,
    subject: `Your HomeBase Profile Report - ${data.monthName} ${data.year}`,
    html,
    text,
  });
}

interface WeeklyTaskReminderData {
  homeownerName: string;
  homeownerEmail: string;
  monthName: string;
  year: number;
  houseTasks: { houseName: string; tasks: { title: string; description: string; priority: 'high' | 'medium' | 'low'; category: string }[] }[];
  totalRemainingTasks: number;
}

export async function sendWeeklyTaskReminderEmail(data: WeeklyTaskReminderData): Promise<boolean> {
  const priorityColors: Record<string, string> = {
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#16a34a'
  };

  const priorityLabels: Record<string, string> = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority'
  };

  let houseTasksHtml = '';
  for (const house of data.houseTasks) {
    const highPriorityTasks = house.tasks.filter(t => t.priority === 'high');
    const otherTasks = house.tasks.filter(t => t.priority !== 'high');
    
    houseTasksHtml += `
      <div style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: #f3f4f6; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <h3 style="margin: 0; color: #333; font-size: 16px;">${house.houseName}</h3>
          <p style="margin: 4px 0 0 0; color: #666; font-size: 13px;">${house.tasks.length} task${house.tasks.length === 1 ? '' : 's'} remaining</p>
        </div>
        <div style="padding: 16px;">
    `;
    
    if (highPriorityTasks.length > 0) {
      houseTasksHtml += `<p style="margin: 0 0 10px 0; color: #dc2626; font-weight: bold; font-size: 13px;">High Priority Tasks:</p>`;
      for (const task of highPriorityTasks.slice(0, 3)) {
        houseTasksHtml += `
          <div style="margin-bottom: 10px; padding-left: 10px; border-left: 3px solid ${priorityColors[task.priority]};">
            <p style="margin: 0; font-weight: 500; color: #333;">${task.title}</p>
          </div>
        `;
      }
      if (highPriorityTasks.length > 3) {
        houseTasksHtml += `<p style="margin: 0 0 10px 10px; color: #666; font-size: 12px;">...and ${highPriorityTasks.length - 3} more high priority tasks</p>`;
      }
    }
    
    if (otherTasks.length > 0 && highPriorityTasks.length > 0) {
      houseTasksHtml += `<p style="margin: 15px 0 10px 0; color: #666; font-size: 13px;">Other Tasks: ${otherTasks.length}</p>`;
    } else if (otherTasks.length > 0) {
      for (const task of otherTasks.slice(0, 3)) {
        houseTasksHtml += `
          <div style="margin-bottom: 10px; padding-left: 10px; border-left: 3px solid ${priorityColors[task.priority]};">
            <p style="margin: 0; font-weight: 500; color: #333;">${task.title}</p>
          </div>
        `;
      }
      if (otherTasks.length > 3) {
        houseTasksHtml += `<p style="margin: 0 0 10px 10px; color: #666; font-size: 12px;">...and ${otherTasks.length - 3} more tasks</p>`;
      }
    }
    
    houseTasksHtml += '</div></div>';
  }

  const html = wrapEmailContent(
    getEmailHeader(),
    `
      <p>Hi ${data.homeownerName},</p>
      <p>Here's a friendly reminder about your remaining home maintenance tasks for this month. You have <strong>${data.totalRemainingTasks} task${data.totalRemainingTasks === 1 ? '' : 's'}</strong> left to complete!</p>
      
      ${houseTasksHtml}
      
      <div style="background: #e9d8fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #6B46C1;">Why staying on top of maintenance matters:</p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #553c9a;">
          <li>Prevent costly emergency repairs</li>
          <li>Extend the life of your home systems</li>
          <li>Maintain your home's value</li>
          <li>Boost your Home Health Score!</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://gotohomebase.com/maintenance" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View My Maintenance Tasks</a>
      </div>
      
      <p style="font-size: 12px; color: #666;">You're receiving this because you have maintenance reminders enabled on HomeBase. Manage your email preferences in your account settings.</p>
    `
  );

  const text = `Hi ${data.homeownerName}, this is your weekly HomeBase maintenance reminder. You have ${data.totalRemainingTasks} tasks remaining for ${data.monthName} ${data.year}. Visit gotohomebase.com/maintenance to view and complete your tasks.`;

  return sendEmail({
    to: data.homeownerEmail,
    subject: `Weekly Reminder: ${data.totalRemainingTasks} Home Tasks for ${data.monthName}`,
    html,
    text,
  });
}

export async function sendExpiredTrialReengagementEmail(
  userId: string, 
  userName: string, 
  userRole: 'homeowner' | 'contractor'
): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user?.email) return false;

  const roleSpecificBenefits = userRole === 'homeowner' 
    ? `
      <ul>
        <li>Track all your home maintenance history in one place</li>
        <li>Get personalized seasonal maintenance reminders</li>
        <li>Monitor your Home Health Score</li>
        <li>Connect with vetted local contractors</li>
        <li>Build a complete "CARFAX for your home"</li>
      </ul>
    `
    : `
      <ul>
        <li>Get matched with homeowners in your area</li>
        <li>Manage leads and clients with our CRM</li>
        <li>Build your online reputation with reviews</li>
        <li>Send quotes and invoices directly</li>
        <li>Track your business analytics</li>
      </ul>
    `;

  const pricing = userRole === 'homeowner' 
    ? 'Plans start at just $5/month'
    : 'Plans start at just $20/month';

  const html = wrapEmailContent(
    getEmailHeader(),
    `
      <p>Hi ${userName || 'there'},</p>
      <p>It's been a while since your free trial ended, and we wanted to reach out!</p>
      <p>Here's what you're missing out on:</p>
      ${roleSpecificBenefits}
      <div style="background: #e9d8fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #6B46C1;">Ready to regain full access?</p>
        <p style="margin: 10px 0 0 0; color: #553c9a;">${pricing} - cancel anytime!</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://gotohomebase.com/billing" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Subscribe Now</a>
      </div>
      <p style="color: #666; font-size: 14px;">Questions? Reply to this email or reach us at <a href="mailto:gotohomebase@gmail.com">gotohomebase@gmail.com</a>.</p>
      <p>- The HomeBase Team</p>
    `
  );

  const text = `Hi ${userName || 'there'}, we miss you at HomeBase! Your free trial has ended, but you can regain full access by subscribing. ${pricing}. Visit gotohomebase.com/billing to get started.`;

  return sendEmail({
    to: user.email,
    subject: '🏠 We Miss You! Regain Full Access to HomeBase',
    text,
    html,
  });
}

export async function sendReferralReminderEmail(
  userId: string, 
  userName: string,
  currentReferrals: number,
  referralCap: number,
  referralCode: string
): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user?.email) return false;

  const remainingReferrals = referralCap - currentReferrals;
  const progressPercent = Math.round((currentReferrals / referralCap) * 100);

  const html = wrapEmailContent(
    getEmailHeader(),
    `
      <p>Hi ${userName || 'there'},</p>
      <p>Did you know you can earn <strong>free subscription credits</strong> by referring friends to HomeBase?</p>
      
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Your Referral Progress:</p>
        <div style="background: #e5e7eb; border-radius: 4px; height: 20px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #22C55E, #16A34A); height: 100%; width: ${progressPercent}%;"></div>
        </div>
        <p style="margin: 10px 0 0 0; color: #666;">${currentReferrals} of ${referralCap} referrals used (${remainingReferrals} remaining)</p>
      </div>

      <div style="background: #d1fae5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #166534;">Your Referral Code:</p>
        <p style="font-size: 24px; font-weight: bold; color: #22C55E; margin: 0; letter-spacing: 2px;">${referralCode}</p>
      </div>

      <p><strong>How it works:</strong></p>
      <ol>
        <li>Share your referral code with friends</li>
        <li>When they sign up and subscribe, you earn $1 credit</li>
        <li>Credits are applied to your next bill automatically!</li>
      </ol>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://gotohomebase.com/settings" style="background: #22C55E; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Share Your Code</a>
      </div>

      <p style="color: #666; font-size: 14px;">You're receiving this because you have referral capacity remaining. Unsubscribe from these reminders in your notification settings.</p>
    `
  );

  const text = `Hi ${userName || 'there'}, you can earn free subscription credits by referring friends to HomeBase! You've used ${currentReferrals} of ${referralCap} referrals. Your code: ${referralCode}. Share it with friends and earn $1 credit for each referral!`;

  return sendEmail({
    to: user.email,
    subject: `💰 You Have ${remainingReferrals} Referral Credits Left!`,
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
  sendQuoteEmail,
  sendJobNotificationEmail,
  sendInvoiceEmail,
  sendBulkWelcomeFeedbackEmail,
  sendBulkCustomEmail,
  sendNewMessageEmail,
  sendContractorMonthlyViewReportEmail,
  sendWeeklyTaskReminderEmail,
  sendExpiredTrialReengagementEmail,
  sendReferralReminderEmail,
  getEmailHeader,
  wrapEmailContent,
};
