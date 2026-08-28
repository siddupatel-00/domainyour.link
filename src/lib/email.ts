import nodemailer from "nodemailer";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || "domainyourlink-super-secret-key-32chars!";

// In-memory OTP storage with 10-minute TTL (for local fallback)
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

// 1. Create a tamper-proof signed challenge token (Serverless Safe)
export function createOtpChallenge(email: string, code: string, username?: string): string {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const payload = JSON.stringify({
    email: email.trim().toLowerCase(),
    code: code.trim(),
    username: username ? username.trim().toLowerCase() : undefined,
    expiresAt,
  });

  const b64 = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(b64)
    .digest("base64url");

  return `${b64}.${signature}`;
}

// 2. Verify challenge token across serverless instances
export function verifyOtpChallenge(
  email: string,
  code: string,
  challengeToken?: string
): { valid: boolean; username?: string; message?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  // If signed challenge token is provided
  if (challengeToken && challengeToken.includes(".")) {
    try {
      const [b64, signature] = challengeToken.split(".");
      const expectedSig = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(b64)
        .digest("base64url");

      if (signature !== expectedSig) {
        return { valid: false, message: "Invalid verification session. Please request a new code." };
      }

      const data = JSON.parse(Buffer.from(b64, "base64url").toString("utf-8"));

      if (data.email.toLowerCase() !== normalizedEmail) {
        return { valid: false, message: "Email mismatch. Please request a new code." };
      }

      if (Date.now() > data.expiresAt) {
        return { valid: false, message: "Verification code has expired. Please request a new code." };
      }

      if (data.code !== trimmedCode) {
        return { valid: false, message: "Invalid verification code. Please try again." };
      }

      return { valid: true, username: data.username };
    } catch {
      // Fall through to memory store check
    }
  }

  // Fallback memory store check
  const entry = otpStore.get(normalizedEmail);
  if (!entry) {
    return { valid: false, message: "No verification code found. Please request a new code." };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalizedEmail);
    return { valid: false, message: "Verification code has expired. Please request a new code." };
  }

  if (entry.code !== trimmedCode) {
    return { valid: false, message: "Invalid verification code. Please try again." };
  }

  const username = entry.username;
  otpStore.delete(normalizedEmail);
  return { valid: true, username };
}

export function storeOtp(email: string, code: string, username?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  otpStore.set(normalizedEmail, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    username,
  });
}

export function verifyOtp(email: string, code: string, challengeToken?: string): { valid: boolean; username?: string; message?: string } {
  return verifyOtpChallenge(email, code, challengeToken);
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
        devCode: process.env.NODE_ENV !== "production" ? code : undefined,
        error: err instanceof Error ? err.message : "SMTP send failed",
      };
    }
  }

  // Development mode fallback (never in production)
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n======================================================`);
    console.log(`🔑 [DEV VERIFICATION CODE] for ${toEmail}: ${code}`);
    console.log(`======================================================\n`);
  }

  return {
    success: true,
    devCode: process.env.NODE_ENV !== "production" ? code : undefined,
  };
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
        from: `"domainyourlink Team" <${gmailUser}>`,
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
            <p style="font-size: 11px; color: #a3a3a3; word-break: break-all; margin: 0;">
              ${inviteLink}
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Employee invite email sent to ${toEmail}`);
      return { success: true, inviteLink };
    } catch (err: unknown) {
      console.error("❌ Gmail SMTP invite send failed:", err);
      return {
        success: true,
        inviteLink,
        error: err instanceof Error ? err.message : "SMTP send failed",
      };
    }
  }

  // Development mode fallback
  console.log(`\n======================================================`);
  console.log(`✉️ [DEV EMPLOYEE INVITE LINK] for ${toEmail} (${role}):`);
  console.log(`${inviteLink}`);
  console.log(`======================================================\n`);

  return { success: true, inviteLink };
}

// Send Weekly / Monthly Analytics Digest Email
export async function sendAnalyticsRecapEmail(data: {
  toEmail: string;
  username: string;
  frequency: "weekly" | "monthly";
  totalClicks: number;
  activeLinksCount: number;
  topLinks: Array<{ path: string; destinationUrl: string; clicks: number }>;
}): Promise<{ success: boolean; error?: string }> {
  const { toEmail, username, frequency, totalClicks, activeLinksCount, topLinks } = data;
  const timeframeLabel = frequency === "monthly" ? "Monthly" : "Weekly";
  const periodLabel = frequency === "monthly" ? "Past 30 Days" : "Past 7 Days";

  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_GMAIL_USER || "";
  const gmailAppPassword = (
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_GMAIL_APP_PASSWORD ||
    process.env.GMAIL_16_DIGIT_CODE ||
    ""
  ).replace(/\s+/g, "");

  const topLinksHtml = topLinks.length > 0
    ? topLinks
        .map(
          (l, i) => `
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 12px 8px; font-family: monospace; font-size: 13px; font-weight: 600; color: #111827;">
              #${i + 1} ${l.path}
            </td>
            <td style="padding: 12px 8px; text-align: right; font-family: monospace; font-size: 13px; font-weight: 700; color: #111827;">
              ${l.clicks} clicks
            </td>
          </tr>
        `
        )
        .join("")
    : `<tr><td colspan="2" style="padding: 12px 8px; text-align: center; color: #6b7280; font-size: 13px;">No clicks recorded in this period.</td></tr>`;

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
        subject: `📊 Your ${timeframeLabel} Link Analytics Summary — @${username}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 36px 28px; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 20px;">
            <div style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 18px; font-weight: 700; color: #000000; letter-spacing: -0.5px;">🔗 domainyourlink</span>
              <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; background: #f3f4f6; color: #374151; padding: 4px 10px; border-radius: 9999px;">${timeframeLabel} Recap</span>
            </div>

            <h2 style="font-size: 22px; font-weight: 700; color: #000000; margin: 0 0 8px 0;">
              Here is your ${timeframeLabel.toLowerCase()} link activity, @${username}
            </h2>
            <p style="font-size: 13px; color: #6b7280; margin: 0 0 24px 0;">
              Summary of visitor traffic over the ${periodLabel.toLowerCase()}.
            </p>

            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
              <div style="flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; text-align: center;">
                <div style="font-size: 26px; font-weight: 800; color: #111827; font-family: monospace;">${totalClicks}</div>
                <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-top: 4px;">Total Clicks</div>
              </div>
              <div style="flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; text-align: center;">
                <div style="font-size: 26px; font-weight: 800; color: #111827; font-family: monospace;">${activeLinksCount}</div>
                <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-top: 4px;">Active Links</div>
              </div>
            </div>

            <div style="margin-bottom: 28px;">
              <h3 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">
                🔥 Top Performing Links (${periodLabel})
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${topLinksHtml}
                </tbody>
              </table>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="https://domainyourlink.vercel.app/admin" style="display: inline-block; background: #000000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 13px;">
                Open domainyourlink Dashboard →
              </a>
            </div>

            <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
              You received this email because email recaps are enabled on your account. You can turn this off anytime in your dashboard settings.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Analytics recap email sent to ${toEmail}`);
      return { success: true };
    } catch (err: unknown) {
      console.error("❌ Gmail SMTP recap send failed:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "SMTP send failed",
      };
    }
  }

  console.log(`\n📊 [DEV ANALYTICS RECAP] for ${toEmail} (@${username}): Total Clicks: ${totalClicks}, Active Links: ${activeLinksCount}\n`);
  return {
    success: false,
    error: "Gmail SMTP credentials (GMAIL_USER & GMAIL_APP_PASSWORD) are missing in .env.local. Please provide your Gmail address and 16-digit Google App Password.",
  };
}

