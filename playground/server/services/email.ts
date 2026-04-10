import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Mouva <noreply@mouva.ai>';

/**
 * Send verification code email
 */
export async function sendVerificationCode(
  toEmail: string, 
  code: string
): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Your Mouva Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; padding: 40px; }
            .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .logo { font-size: 24px; font-weight: 700; color: #9333ea; margin-bottom: 24px; }
            .code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1e293b; background: linear-gradient(135deg, #faf5ff, #ede9fe); padding: 20px 32px; border-radius: 12px; text-align: center; margin: 24px 0; }
            .text { color: #64748b; font-size: 15px; line-height: 1.6; }
            .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">📄 Mouva</div>
            <p class="text">Hello,</p>
            <p class="text">Use the following verification code to complete your sign-in:</p>
            <div class="code">${code}</div>
            <p class="text">This code will expire in <strong>10 minutes</strong>.</p>
            <p class="text">If you didn't request this code, you can safely ignore this email.</p>
            <div class="footer">
              <p>This is an automated email from Mouva. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your Mouva verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
    });

    if (error) {
      console.error('[Email] Failed to send verification code:', error);
      return false;
    }

    console.log(`[Email] Verification code sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send verification code:', error);
    return false;
  }
}

/**
 * Send magic link email
 */
export async function sendMagicLink(
  toEmail: string, 
  link: string
): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Login to Mouva',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; padding: 40px; }
            .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .logo { font-size: 24px; font-weight: 700; color: #9333ea; margin-bottom: 24px; }
            .btn { display: inline-block; background: #9333ea; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; }
            .text { color: #64748b; font-size: 15px; line-height: 1.6; }
            .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">📄 Mouva</div>
            <p class="text">Hello,</p>
            <p class="text">Click the button below to sign in to your account:</p>
            <a href="${link}" class="btn">Sign In to Mouva</a>
            <p class="text">This link will expire in 15 minutes.</p>
            <p class="text">If you didn't request this link, you can safely ignore this email.</p>
            <div class="footer">
              <p>This is an automated email from Mouva. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Click here to sign in to Mouva: ${link}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this link, you can safely ignore this email.`,
    });

    if (error) {
      console.error('[Email] Failed to send magic link:', error);
      return false;
    }

    console.log(`[Email] Magic link sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send magic link:', error);
    return false;
  }
}

/**
 * Generate a random token for magic link
 */
export function generateMagicLinkToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Generate verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
