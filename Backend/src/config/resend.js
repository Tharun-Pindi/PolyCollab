import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.NOTIFY_EMAIL || 'pinditarun6@gmail.com';
// Resend free tier sends from onboarding@resend.dev
const FROM_EMAIL = 'PolyCollab Support <onboarding@resend.dev>';

/**
 * Send admin notification email when a user submits a support ticket
 */
export const sendTicketAdminNotification = async (ticket) => {
  try {
    // Build attachment image section if Cloudinary URL exists
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

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `[New Support Ticket ${ticket.id}] ${ticket.subject}`,
      html: `
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
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">User Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${ticket.user_email || ticket.userEmail || ADMIN_EMAIL}</td>
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
      `
    });

    if (error) {
      console.warn('Resend Admin Email notice:', error);
      return { success: false, error };
    }
    console.log('✅ Admin ticket notification email sent via Resend:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error sending Resend admin email:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send automatic confirmation reply email to the user who raised the ticket
 */
export const sendTicketUserAutoReply = async (ticket, targetEmail, userName) => {
  // Always route emails to NOTIFY_EMAIL (pinditarun6@gmail.com) in testing mode to satisfy Resend API constraints
  const recipient = ADMIN_EMAIL;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `[PolyCollab Support] Ticket #${ticket.id}: ${ticket.subject}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #4648d4; color: #ffffff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 20px;">Support Request Received</h2>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; font-weight: bold;">
              Hi ${userName || 'Builder'}, we have received your ticket (#${ticket.id}: ${ticket.subject}). Our support team is reviewing your details and we will resolve your problem within 12–24 hours.
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
      `
    });

    if (error) {
      console.warn('Resend User Auto-reply notice:', error);
      return { success: false, error };
    }
    console.log('✅ User auto-reply email sent via Resend:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error sending Resend auto-reply:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send resolution notification email when admin marks a ticket as Resolved
 */
export const sendTicketResolvedEmail = async (ticket) => {
  const recipient = ADMIN_EMAIL;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `[PolyCollab] Ticket #${ticket.id} Resolved: ${ticket.subject}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #059669; color: #ffffff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 20px;">Your Support Ticket Has Been Resolved</h2>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; font-weight: bold;">
              Hi ${ticket.user_name || 'Builder'}, great news! Your support ticket has been resolved by our team.
            </p>
            <div style="background-color: #f0fdf4; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Resolved Ticket:</h4>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Ticket ID:</strong> #${ticket.id}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Subject:</strong> ${ticket.subject}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Category:</strong> ${ticket.category || 'General'}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Resolved</span></p>
            </div>
            <p style="font-size: 14px; color: #4b5563;">If your issue persists, please submit a new support ticket and our team will assist you.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #6b7280; text-align: center;">
              This is an automated response from PolyCollab Support.
            </p>
          </div>
        </div>
      `
    });

    if (error) {
      console.warn('Resend Resolved Email notice:', error);
      return { success: false, error };
    }
    console.log('✅ Ticket resolved email sent via Resend:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error sending ticket resolved email:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send application accepted notification email to the applicant
 */
export const sendApplicationAcceptedEmail = async ({ applicantName, projectTitle, roleApplied, ownerName }) => {
  const recipient = ADMIN_EMAIL;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: `[PolyCollab] Your application for "${projectTitle}" was accepted!`,
      html: `
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
      `
    });

    if (error) {
      console.warn('Resend Application Accepted email notice:', error);
      return { success: false, error };
    }
    console.log('✅ Application accepted email sent:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error sending application accepted email:', err.message);
    return { success: false, error: err.message };
  }
};

import nodemailer from 'nodemailer';

/**
 * Send real 6-digit OTP verification email to user via Nodemailer SMTP or Resend API
 */
export const sendOtpEmail = async (targetEmail, otpCode) => {
  const cleanTarget = targetEmail.toLowerCase().trim();

  const htmlContent = `
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

  // 1. Try Nodemailer SMTP if SMTP_PASS is configured in .env
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.NOTIFY_EMAIL || 'pinditarun6@gmail.com';
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  let nodemailerErr = null;
  if (smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const info = await transporter.sendMail({
        from: `"PolyCollab Auth" <${smtpUser}>`,
        to: cleanTarget,
        subject: `[PolyCollab] Your 6-Digit Verification Code is ${otpCode}`,
        html: htmlContent
      });

      console.log(`✅ OTP Email (${otpCode}) successfully sent via Gmail Nodemailer to ${cleanTarget}:`, info.messageId);
      return { success: true, method: 'nodemailer', messageId: info.messageId };
    } catch (nmErr) {
      nodemailerErr = nmErr.message;
      console.warn('⚠️ Nodemailer Gmail SMTP notice:', nmErr.message);
    }
  }

  // 2. Try Resend API directly to cleanTarget
  try {
    const { data, error } = await resend.emails.send({
      from: 'PolyCollab Auth <onboarding@resend.dev>',
      to: [cleanTarget],
      subject: `[PolyCollab] Your 6-Digit Verification Code is ${otpCode}`,
      html: htmlContent
    });

    if (error) {
      const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      console.warn('⚠️ Resend API notice for target recipient:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        nodemailerError: nodemailerErr
      };
    }

    console.log(`✅ OTP Email (${otpCode}) sent via Resend to ${cleanTarget}`);
    return { success: true, data };
  } catch (err) {
    console.error('⚠️ Error sending OTP email via Resend:', err.message);
    return {
      success: false,
      error: err.message,
      nodemailerError: nodemailerErr
    };
  }
};
