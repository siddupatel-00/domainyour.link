import nodemailer from "nodemailer";

// In-memory OTP storage with 10-minute TTL
interface OtpEntry {
  code: string;
  expiresAt: number;
  username?: string;
}

const otpStore = new Map<string, OtpEntry>();

// Generate 6-digit numeric OTP
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOtp(email: string, code: string, username?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  otpStore.set(normalizedEmail, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    username,
  });
}

export function verifyOtp(email: string, code: string): { valid: boolean; username?: string; message?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const entry = otpStore.get(normalizedEmail);

  if (!entry) {
    return { valid: false, message: "No verification code found. Please request a new code." };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalizedEmail);
    return { valid: false, message: "Verification code has expired. Please request a new code." };
  }

  if (entry.code !== code.trim()) {
    return { valid: false, message: "Invalid verification code. Please try again." };
  }

  // Code is valid - remove from store so it cannot be reused
  const username = entry.username;
  otpStore.delete(normalizedEmail);
  return { valid: true, username };
}

// Send OTP email using Gmail SMTP
export async function sendOtpEmail(toEmail: string, code: string): Promise<{ success: boolean; devCode?: string; error?: string }> {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_GMAIL_USER || "";
  const gmailAppPassword = (
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_GMAIL_APP_PASSWORD ||
    process.env.GMAIL_16_DIGIT_CODE ||
    ""
  ).replace(/\s+/g, "");

  if (gmailUser && gmailAppPassword) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

      const mailOptions = {
        from: `"domainyourlink" <${gmailUser}>`,
        to: toEmail,
        subject: `Your domainyourlink verification code: ${code}`,
        text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this code, you can safely ignore this email.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 16px;">
            <div style="margin-bottom: 24px;">
              <span style="font-size: 18px; font-weight: 700; color: #000000; letter-spacing: -0.5px;">🔗 domainyourlink</span>
            </div>
            <h2 style="font-size: 20px; font-weight: 700; color: #000000; margin: 0 0 12px 0;">Your Verification Code</h2>
            <p style="font-size: 14px; color: #525252; line-height: 1.5; margin: 0 0 24px 0;">Use the code below to complete your sign-in to domainyourlink. This code will expire in 10 minutes.</p>
            <div style="background: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #000000;">${code}</span>
            </div>
            <p style="font-size: 12px; color: #a3a3a3; margin: 0;">If you did not request this code, you can safely ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${toEmail}`);
      return { success: true };
    } catch (err: unknown) {
      console.error("❌ Gmail SMTP send failed:", err);
      return {
        success: true,
        devCode: code,
        error: err instanceof Error ? err.message : "SMTP send failed",
      };
    }
  }

  // Development mode fallback
  console.log(`\n======================================================`);
  console.log(`🔑 [DEV VERIFICATION CODE] for ${toEmail}: ${code}`);
  console.log(`======================================================\n`);

  return { success: true, devCode: code };
}

// Send Employee Invitation Email
export async function sendEmployeeInviteEmail(
  toEmail: string,
  role: string,
  inviteLink: string
): Promise<{ success: boolean; inviteLink: string; error?: string }> {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_GMAIL_USER || "";
  const gmailAppPassword = (
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_GMAIL_APP_PASSWORD ||
    process.env.GMAIL_16_DIGIT_CODE ||
    ""
  ).replace(/\s+/g, "");

  if (gmailUser && gmailAppPassword) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

      const mailOptions = {
        from: `"domainyourlink CEO" <${gmailUser}>`,
        to: toEmail,
        subject: `🎉 Congratulations on successfully joining domainyourlink as ${role}!`,
        text: `Congratulations on successfully joining domainyourlink as ${role}!\n\nPlease click the link below to set up your full name, username, and password:\n${inviteLink}\n\nWelcome to the team!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 36px 28px; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 20px;">
            <div style="margin-bottom: 24px;">
              <span style="font-size: 18px; font-weight: 700; color: #000000; letter-spacing: -0.5px;">🔗 domainyourlink</span>
            </div>
            <h2 style="font-size: 22px; font-weight: 700; color: #000000; margin: 0 0 12px 0;">
              🎉 Welcome to the Team!
            </h2>
            <p style="font-size: 14px; color: #404040; line-height: 1.6; margin: 0 0 20px 0;">
              Congratulations! You have been successfully invited by your CEO to join domainyourlink as <strong>${role}</strong>.
            </p>
            <p style="font-size: 14px; color: #525252; line-height: 1.5; margin: 0 0 28px 0;">
              Click the button below to set up your profile name, username, and password to access your Staff Workspace:
            </p>
            <div style="text-align: center; margin-bottom: 28px;">
              <a href="${inviteLink}" style="display: inline-block; background: #000000; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 14px;">
                Complete Setup & Join Workspace →
              </a>
            </div>
            <p style="font-size: 12px; color: #737373; line-height: 1.5; margin: 0 0 8px 0;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size: 11px; font-family: monospace; color: #a3a3a3; word-break: break-all; margin: 0;">
              ${inviteLink}
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Employee invite email sent to ${toEmail}`);
      return { success: true, inviteLink };
    } catch (err: unknown) {
      console.error("❌ Gmail SMTP invite email send failed:", err);
      return {
        success: true,
        inviteLink,
        error: err instanceof Error ? err.message : "SMTP send failed",
      };
    }
  }

  // Development mode fallback output
  console.log(`\n======================================================`);
  console.log(`🎉 [EMPLOYEE INVITATION EMAIL] for ${toEmail}`);
  console.log(`Role: ${role}`);
  console.log(`👉 Invite Link: ${inviteLink}`);
  console.log(`======================================================\n`);

  return { success: true, inviteLink };
}
