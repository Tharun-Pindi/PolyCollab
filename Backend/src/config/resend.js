import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.NOTIFY_EMAIL || 'pinditarun6@gmail.com';
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || ADMIN_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS;

// Resend free tier can only send to verified addresses — so we use SMTP for user-facing emails
const FROM_RESEND = 'PolyCollab Support <onboarding@resend.dev>';

/**
 * Shared Nodemailer transporter factory
 */
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

/**
 * Core SMTP send helper — sends email to any recipient via Gmail SMTP
 * Falls back gracefully and returns { success, error }
 */
const sendViaSMTP = async ({ to, subject, html }) => {
  if (!SMTP_PASS) {
    return { success: false, error: 'SMTP_PASS not configured in .env' };
  }
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"PolyCollab Support" <${SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`✅ Email sent via Gmail SMTP to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`⚠️ Gmail SMTP error sending to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// ============================================================
// 1. Admin notification — new ticket submitted
// ============================================================
export const sendTicketAdminNotification = async (ticket) => {
  try {
    const attachmentImageUrl = ticket.attachment_url || ticket.attachmentUrl || null;
    const attachmentFileName = ticket.attachment_name || ticket.attachmentName || null;

    let attachmentSection = '';
    if (attachmentImageUrl) {
      attachmentSection = `
            <div style="margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 10px 16px; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 13px; font-weight: bold; color: #374151;">
                  Attached Screenshot / Log${attachmentFileName ? ` — ${attachmentFileName}` : ''}
                </p>
              </div>
              <div style="padding: 16px; text-align: center; background: #fff;">
                <img
                  src="${attachmentImageUrl}"
                  alt="Ticket Attachment"
                  style="max-width: 100%; max-height: 500px; border-radius: 6px; border: 1px solid #e5e7eb; object-fit: contain;"
                />
                <p style="margin: 10px 0 0 0; font-size: 12px;">
                  <a href="${attachmentImageUrl}" target="_blank" style="color: #4648d4; text-decoration: none;">
                    Open full image in browser
                  </a>
                </p>
              </div>
            </div>`;
    }

    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #4648d4; color: #ffffff; padding: 16px 24px;">
          <h2 style="margin: 0; font-size: 20px;">New Support Ticket Submitted</h2>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Ticket #${ticket.id}</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; width: 120px;">Subject:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${ticket.subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Category:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${ticket.category || 'General'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Priority:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: ${ticket.priority === 'High' ? '#dc2626' : '#2563eb'}; font-weight: bold;">${ticket.priority || 'Medium'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">From User:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${ticket.user_name || 'Builder'} (${ticket.user_email || 'N/A'})</td>
            </tr>
            ${attachmentFileName ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Attachment:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${attachmentFileName}${attachmentImageUrl ? ` (<a href="${attachmentImageUrl}" target="_blank" style="color: #4648d4;">View</a>)` : ''}</td>
            </tr>
            ` : ''}
          </table>
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; border-left: 4px solid #4648d4;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">Description:</h4>
            <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">${ticket.description}</p>
          </div>
          ${attachmentSection}
          <p style="font-size: 12px; color: #6b7280; margin-top: 24px; text-align: center;">
            PolyCollab Ticket Management System • Automatic Admin Alert
          </p>
        </div>
      </div>
    `;

    // Admin notification always goes to admin email — SMTP is fine here
    const result = await sendViaSMTP({
      to: ADMIN_EMAIL,
      subject: `[New Support Ticket ${ticket.id}] ${ticket.subject}`,
      html
    });

    if (!result.success) {
      // Fallback to Resend for admin email (admin email is the verified Resend sender domain owner)
      const { data, error } = await resend.emails.send({
        from: FROM_RESEND,
        to: [ADMIN_EMAIL],
        subject: `[New Support Ticket ${ticket.id}] ${ticket.subject}`,
        html
      });
      if (error) {
        console.warn('Resend Admin Email fallback notice:', error);
        return { success: false, error };
      }
      console.log('✅ Admin ticket notification sent via Resend (SMTP fallback):', data);
      return { success: true, data };
    }
    return result;
  } catch (err) {
    console.error('Error sending admin ticket notification:', err.message);
    return { success: false, error: err.message };
  }
};

// ============================================================
// 2. Ticket resolved email — sent to the ACTUAL USER who raised it
// ============================================================
export const sendTicketResolvedEmail = async (ticket) => {
  // Use the real user email from the ticket record
  const userEmail = ticket.user_email || ticket.userEmail;
  const userName = ticket.user_name || ticket.userName || 'Builder';

  if (!userEmail) {
    console.warn('sendTicketResolvedEmail: no user_email on ticket, skipping.');
    return { success: false, error: 'No user email on ticket.' };
  }

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #059669; color: #ffffff; padding: 20px 24px;">
        <h2 style="margin: 0; font-size: 20px;">Your Support Ticket Has Been Resolved ✅</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 15px; font-weight: bold;">
          Hi ${userName}, great news! Your support ticket has been resolved by our team.
        </p>
        <div style="background-color: #f0fdf4; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Resolved Ticket:</h4>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Ticket ID:</strong> #${ticket.id}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Subject:</strong> ${ticket.subject}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Category:</strong> ${ticket.category || 'General'}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Resolved</span></p>
        </div>
        <p style="font-size: 14px; color: #4b5563;">If your issue persists, please submit a new support ticket and our team will assist you.</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://polycollab.vercel.app/help" style="background-color: #059669; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Submit Another Ticket</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          This is an automated response from PolyCollab Support.
        </p>
      </div>
    </div>
  `;

  // Send directly to the user who raised the ticket via SMTP
  const result = await sendViaSMTP({
    to: userEmail,
    subject: `[PolyCollab] Ticket #${ticket.id} Resolved: ${ticket.subject}`,
    html
  });

  if (!result.success) {
    console.warn(`SMTP failed for resolved email to ${userEmail}. Error: ${result.error}`);
  }
  return result;
};

// ============================================================
// 3. Auto-reply confirmation when ticket is first submitted
// ============================================================
export const sendTicketUserAutoReply = async (ticket, targetEmail, userName) => {
  const userEmail = targetEmail || ticket.user_email || ticket.userEmail;
  const name = userName || ticket.user_name || ticket.userName || 'Builder';

  if (!userEmail) {
    console.warn('sendTicketUserAutoReply: no target email, skipping.');
    return { success: false, error: 'No user email provided.' };
  }

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #4648d4; color: #ffffff; padding: 20px 24px;">
        <h2 style="margin: 0; font-size: 20px;">Support Request Received</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 15px; font-weight: bold;">
          Hi ${name}, we have received your ticket (#${ticket.id}: ${ticket.subject}). Our support team is reviewing your details and we will resolve your problem within 12–24 hours.
        </p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Ticket Summary:</h4>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Ticket ID:</strong> #${ticket.id}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Subject:</strong> ${ticket.subject}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Category:</strong> ${ticket.category || 'General'}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Priority:</strong> ${ticket.priority || 'Medium'}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> Open / Under Review</p>
        </div>
        <p style="font-size: 14px; color: #4b5563;">Thank you for your patience while our engineering support team resolves your issue.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          This is an automated response from PolyCollab Support.
        </p>
      </div>
    </div>
  `;

  const result = await sendViaSMTP({
    to: userEmail,
    subject: `[PolyCollab Support] Ticket #${ticket.id}: ${ticket.subject}`,
    html
  });

  if (!result.success) {
    console.warn(`SMTP failed for auto-reply to ${userEmail}. Error: ${result.error}`);
  }
  return result;
};

// ============================================================
// 4. Application accepted — sent to the ACTUAL applicant email
// ============================================================
export const sendApplicationAcceptedEmail = async ({ applicantName, applicantEmail, projectTitle, roleApplied, ownerName }) => {
  if (!applicantEmail) {
    console.warn('sendApplicationAcceptedEmail: no applicantEmail provided, skipping.');
    return { success: false, error: 'No applicant email provided.' };
  }

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #4648d4; color: #ffffff; padding: 20px 24px;">
        <h2 style="margin: 0; font-size: 20px;">Application Accepted!</h2>
      </div>
      <div style="padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h3 style="margin: 0; font-size: 22px; color: #059669;">Congratulations, ${applicantName || 'Builder'}!</h3>
        </div>
        <p style="font-size: 15px; color: #374151;">
          Your application has been <strong style="color: #059669;">accepted</strong> by the project lead.
        </p>
        <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #059669; margin: 20px 0;">
          <p style="margin: 4px 0; font-size: 14px;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Role:</strong> ${roleApplied}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Accepted by:</strong> ${ownerName || 'Project Lead'}</p>
        </div>
        <p style="font-size: 14px; color: #4b5563;">Log in to PolyCollab to connect with your new team and start collaborating.</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://polycollab.vercel.app/dashboard" style="background-color: #4648d4; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Go to Dashboard</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">PolyCollab — Build Together</p>
      </div>
    </div>
  `;

  // Send directly to the actual applicant via SMTP
  const result = await sendViaSMTP({
    to: applicantEmail,
    subject: `[PolyCollab] Your application for "${projectTitle}" was accepted!`,
    html
  });

  if (!result.success) {
    console.warn(`SMTP failed for application accepted email to ${applicantEmail}. Error: ${result.error}`);
  }
  return result;
};

// ============================================================
// 5. OTP email — SMTP primary, Resend fallback
// ============================================================
export const sendOtpEmail = async (targetEmail, otpCode) => {
  const cleanTarget = targetEmail.toLowerCase().trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 24px; font-weight: 700;">PolyCollab</h1>
        <p style="color: #64748b; margin-top: 4px; font-size: 14px;">Verification Code for Account Registration</p>
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; font-weight: 600;">Your 6-Digit OTP Code:</p>
        <div style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; margin: 8px 0;">
          ${otpCode}
        </div>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">This code will expire in 15 minutes.</p>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
        Please enter this code on the PolyCollab sign-up screen to complete your account registration for <strong>${cleanTarget}</strong>. If you did not request this code, please ignore this email.
      </p>
    </div>
  `;

  // 1. Try Nodemailer SMTP first
  const smtpResult = await sendViaSMTP({
    to: cleanTarget,
    subject: `[PolyCollab] Your 6-Digit Verification Code is ${otpCode}`,
    html
  });

  if (smtpResult.success) return smtpResult;

  // 2. Fallback to Resend API
  try {
    const { data, error } = await resend.emails.send({
      from: 'PolyCollab Auth <onboarding@resend.dev>',
      to: [cleanTarget],
      subject: `[PolyCollab] Your 6-Digit Verification Code is ${otpCode}`,
      html
    });

    if (error) {
      const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      console.warn('⚠️ Resend API fallback notice:', errorMsg);
      return { success: false, error: errorMsg, smtpError: smtpResult.error };
    }

    console.log(`✅ OTP Email (${otpCode}) sent via Resend fallback to ${cleanTarget}`);
    return { success: true, data };
  } catch (err) {
    console.error('⚠️ Error sending OTP email via Resend fallback:', err.message);
    return { success: false, error: err.message, smtpError: smtpResult.error };
  }
};
