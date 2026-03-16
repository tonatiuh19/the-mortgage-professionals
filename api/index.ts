import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express, { type RequestHandler } from "express";
import cors from "cors";
import mysql, {
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import twilio from "twilio";
import crypto from "crypto";

// Validate critical environment variables
if (
  !process.env.DB_HOST ||
  !process.env.DB_USER ||
  !process.env.DB_PASSWORD ||
  !process.env.DB_NAME
) {
  throw new Error(
    "Database environment variables are required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME",
  );
}

// JWT Secret with fallback (warn in production)
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    console.warn(
      "⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET in .env for production!",
    );
    return "default-jwt-secret-CHANGE-THIS-IN-PRODUCTION";
  })();

// Tenant Configuration
const MORTGAGE_TENANT_ID = 2;

// Initialize Twilio client (if credentials are provided)
let twilioClient: any = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    console.log("✅ Twilio client initialized successfully");
  } catch (error) {
    console.warn("⚠️  Warning: Failed to initialize Twilio client:", error);
  }
} else {
  console.warn(
    "⚠️  Warning: Twilio credentials not found. SMS/WhatsApp functionality will be disabled.",
  );
}

// Base URL helper — prefers explicit BASE_URL, falls back to Vercel's auto-injected
// VERCEL_URL (no https:// prefix), then localhost for local dev
const getBaseUrl = (): string => {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 8080}`;
};

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// =====================================================
// DATA INTEGRITY HELPERS
// =====================================================

/**
 * Check if a parent entity can be safely deleted without breaking referential integrity
 * @param parentTable - The table containing the parent record
 * @param parentId - The ID of the parent record to check
 * @param childChecks - Array of child table checks
 * @returns Object with canDelete flag and violation details
 */
async function checkDeletionSafety(
  parentTable: string,
  parentId: number,
  childChecks: Array<{
    table: string;
    foreignKey: string;
    tenantFilter?: boolean;
    friendlyName: string;
  }>,
): Promise<{
  canDelete: boolean;
  violations: Array<{
    table: string;
    count: number;
    friendlyName: string;
    sample?: string[];
  }>;
}> {
  const violations = [];

  for (const check of childChecks) {
    const tenantCondition = check.tenantFilter ? ` AND tenant_id = ?` : "";
    const params = check.tenantFilter
      ? [parentId, MORTGAGE_TENANT_ID]
      : [parentId];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.foreignKey} = ?${tenantCondition}`,
      params,
    );

    const count = rows[0]?.count || 0;
    if (count > 0) {
      violations.push({
        table: check.table,
        count,
        friendlyName: check.friendlyName,
      });
    }
  }

  return {
    canDelete: violations.length === 0,
    violations,
  };
}

// =====================================================
// COMMUNICATION HELPERS
// =====================================================

/**
 * Send SMS message via Twilio
 */
async function sendSMSMessage(
  to: string,
  body: string,
  metadata?: any,
): Promise<{
  success: boolean;
  external_id?: string;
  error?: string;
  cost?: number;
  provider_response?: any;
}> {
  if (!twilioClient) {
    return {
      success: false,
      error: "Twilio not configured - SMS sending disabled",
    };
  }

  try {
    // Normalize phone number
    const normalizedPhone = to.startsWith("+")
      ? to
      : `+1${to.replace(/\D/g, "")}`;

    const message = await twilioClient.messages.create({
      body,
      to: normalizedPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      ...metadata,
    });

    return {
      success: true,
      external_id: message.sid,
      cost: parseFloat(message.price || "0"),
      provider_response: {
        sid: message.sid,
        status: message.status,
        direction: message.direction,
        uri: message.uri,
      },
    };
  } catch (error: any) {
    console.error("❌ SMS sending failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send SMS",
      provider_response: error,
    };
  }
}

/**
 * Send WhatsApp message via Twilio
 */
async function sendWhatsAppMessage(
  to: string,
  body: string,
  metadata?: any,
): Promise<{
  success: boolean;
  external_id?: string;
  error?: string;
  cost?: number;
  provider_response?: any;
}> {
  if (!twilioClient) {
    return {
      success: false,
      error: "Twilio not configured - WhatsApp sending disabled",
    };
  }

  try {
    // Normalize phone number for WhatsApp
    const normalizedPhone = to.startsWith("+")
      ? to
      : `+1${to.replace(/\D/g, "")}`;
    const whatsappNumber = `whatsapp:${normalizedPhone}`;
    const whatsappFrom = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER}`;

    const message = await twilioClient.messages.create({
      body,
      to: whatsappNumber,
      from: whatsappFrom,
      ...metadata,
    });

    return {
      success: true,
      external_id: message.sid,
      cost: parseFloat(message.price || "0"),
      provider_response: {
        sid: message.sid,
        status: message.status,
        direction: message.direction,
        uri: message.uri,
      },
    };
  } catch (error: any) {
    console.error("❌ WhatsApp sending failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send WhatsApp message",
      provider_response: error,
    };
  }
}

/**
 * Send Email message via SMTP
 */
async function sendEmailMessage(
  to: string,
  subject: string,
  body: string,
  isHTML: boolean = false,
  conversationId?: string,
): Promise<{
  success: boolean;
  external_id?: string;
  error?: string;
  provider_response?: any;
}> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return {
        success: false,
        error: "SMTP credentials not configured",
      };
    }

    // Derive the domain from SMTP_FROM for threading headers.
    // This makes client replies carry In-Reply-To / References back to us.
    const smtpFromEmail =
      process.env.SMTP_FROM?.match(/<([^>]+)>/)?.[1] ||
      process.env.SMTP_FROM ||
      "noreply@example.com";
    const emailDomain = smtpFromEmail.split("@")[1] || "example.com";

    // Encode conversationId into the Message-ID so every email client
    // will echo it back in In-Reply-To / References when the client hits Reply.
    // Format: <enc-{conversationId}-{timestamp}@{domain}>
    const messageId = conversationId
      ? `<enc-${conversationId}-${Date.now()}@${emailDomain}>`
      : undefined;

    // Reply-To: use a dedicated IMAP mailbox (IMAP_USER) when configured,
    // otherwise fall back to the subaddress scheme (INBOUND_EMAIL_DOMAIN),
    // otherwise fall back to SMTP_FROM.
    const inboundMailbox = process.env.IMAP_USER;
    const inboundDomain = process.env.INBOUND_EMAIL_DOMAIN;
    const replyTo = inboundMailbox
      ? inboundMailbox
      : conversationId && inboundDomain
        ? `reply+${conversationId}@${inboundDomain}`
        : process.env.SMTP_FROM;

    const headers: Record<string, string> = {};
    if (conversationId) headers["X-Conversation-Id"] = conversationId;
    if (messageId) headers["Message-ID"] = messageId;

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM,
      to,
      subject,
      replyTo,
      headers: Object.keys(headers).length ? headers : undefined,
      [isHTML ? "html" : "text"]: body,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      external_id: info.messageId,
      provider_response: {
        messageId: info.messageId,
        response: info.response,
        envelope: info.envelope,
      },
    };
  } catch (error: any) {
    console.error("❌ Email sending failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
      provider_response: error,
    };
  }
}

/**
 * Process template variables in message body
 */
function processTemplateVariables(
  template: string,
  variables: Record<string, any>,
): string {
  let processed = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    processed = processed.replace(new RegExp(placeholder, "g"), value || "");
  }

  return processed;
}

// =====================================================
// EMAIL HELPER
// =====================================================

/**
 * Send broker verification email with code
 */
async function sendBrokerVerificationEmail(
  email: string,
  code: number,
  firstName: string,
): Promise<void> {
  try {
    console.log("📧 Sending broker verification email");
    console.log("   Email:", email);
    console.log("   Name:", firstName);
    console.log("   SMTP Host:", process.env.SMTP_HOST);
    console.log("   SMTP From:", process.env.SMTP_FROM);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error("❌ SMTP credentials not configured!");
      throw new Error("SMTP credentials not configured");
    }

    console.log("🔍 Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    const emailBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verification Code</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:40px 16px;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
              <!-- LOGO HEADER -->
              <tr>
                <td style="background-color:#ffffff;padding:24px 32px;border-radius:16px 16px 0 0;border-bottom:3px solid #0A2F52;text-align:center;">
                  <img src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png" alt="The Mortgage Professionals" style="height:52px;width:auto;display:inline-block;" />
                </td>
              </tr>
              <!-- BODY -->
              <tr>
                <td style="background-color:#ffffff;padding:40px 32px 32px;">
                  <h2 style="margin:0 0 8px 0;color:#0f172a;font-size:22px;font-weight:700;">Hi ${firstName},</h2>
                  <p style="margin:0 0 24px 0;color:#475569;font-size:15px;line-height:1.6;">Your verification code for the admin panel is:</p>
                  <!-- CODE BOX -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color:#f0f5fa;border:2px dashed #0A2F52;border-radius:12px;padding:24px;text-align:center;">
                        <span style="font-size:42px;font-weight:800;letter-spacing:14px;color:#0A2F52;display:inline-block;">${code}</span>
                      </td>
                    </tr>
                  </table>
                  <!-- VALIDITY -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                    <tr>
                      <td style="background-color:#f8fafc;border-left:4px solid #0A2F52;border-radius:0 8px 8px 0;padding:14px 18px;">
                        <p style="margin:0 0 6px 0;color:#0f172a;font-size:14px;"><strong>⏱️ Expires in:</strong> This code will expire in <strong>15 minutes</strong>.</p>
                        <p style="margin:0;color:#64748b;font-size:13px;">If you did not request this code, you can safely ignore this email.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- FOOTER -->
              <tr>
                <td style="background-color:#0f172a;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
                  <p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-weight:600;">The Mortgage Professionals</p>
                  <p style="margin:0;color:#94a3b8;font-size:12px;">Admin Panel</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    console.log("📨 Sending email to:", email);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: `${code} is your verification code - Admin`,
      html: emailBody,
    });

    console.log("✅ Broker verification email sent successfully!");
    console.log("📧 Message ID:", info.messageId);
    console.log("📬 Response:", info.response);
  } catch (error) {
    console.error("❌ Error sending broker email:", error);
    throw error;
  }
}

/**
 * Send client verification email with code
 */
async function sendClientVerificationEmail(
  email: string,
  code: number,
  firstName: string,
): Promise<void> {
  try {
    console.log("📧 Sending client verification email");
    console.log("   Email:", email);
    console.log("   Name:", firstName);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error("❌ SMTP credentials not configured!");
      return;
    }

    await transporter.verify();

    const emailBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verification Code</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:40px 16px;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
              <!-- LOGO HEADER -->
              <tr>
                <td style="background-color:#ffffff;padding:24px 32px;border-radius:16px 16px 0 0;border-bottom:3px solid #0A2F52;text-align:center;">
                  <img src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png" alt="The Mortgage Professionals" style="height:52px;width:auto;display:inline-block;" />
                </td>
              </tr>
              <!-- BODY -->
              <tr>
                <td style="background-color:#ffffff;padding:40px 32px 32px;">
                  <h2 style="margin:0 0 4px 0;color:#0f172a;font-size:22px;font-weight:700;">Hello ${firstName},</h2>
                  <p style="margin:0 0 8px 0;color:#475569;font-size:15px;line-height:1.6;">Welcome! We're excited to help you with your mortgage process.</p>
                  <p style="margin:0 0 24px 0;color:#475569;font-size:15px;line-height:1.6;">Use the following code to access your client portal:</p>
                  <!-- CODE BOX -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color:#f0f5fa;border:2px dashed #0A2F52;border-radius:12px;padding:24px;text-align:center;">
                        <span style="font-size:42px;font-weight:800;letter-spacing:14px;color:#0A2F52;display:inline-block;">${code}</span>
                      </td>
                    </tr>
                  </table>
                  <!-- INFO -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                    <tr>
                      <td style="background-color:#f8fafc;border-left:4px solid #0A2F52;border-radius:0 8px 8px 0;padding:14px 18px;">
                        <p style="margin:0 0 6px 0;color:#0f172a;font-size:14px;"><strong>⏱️ Validity:</strong> This code expires in <strong>15 minutes</strong>.</p>
                        <p style="margin:0;color:#64748b;font-size:13px;"><strong>🔒 Security:</strong> Never share this code with anyone.</p>
                      </td>
                    </tr>
                  </table>
                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
                    <tr>
                      <td align="center">
                        <a href="${process.env.CLIENT_URL || "https://real-state-one-omega.vercel.app"}/client-login" style="display:inline-block;background-color:#0A2F52;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">Go to Client Login</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:20px 0 0 0;color:#94a3b8;font-size:12px;text-align:center;">If you didn't request this code, you can safely ignore this email.</p>
                </td>
              </tr>
              <!-- FOOTER -->
              <tr>
                <td style="background-color:#0f172a;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
                  <p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-weight:600;">The Mortgage Professionals</p>
                  <p style="margin:0;color:#94a3b8;font-size:12px;">Your partner on the path to your new home</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: `${code} is your access code - The Mortgage Professionals`,
      html: emailBody,
    });

    console.log("✅ Client verification email sent successfully!");
  } catch (error) {
    console.error("❌ Error sending client email:", error);
    throw error;
  }
}

/**
 * Send client welcome email with loan application details and tasks
 */
async function sendClientLoanWelcomeEmail(
  email: string,
  firstName: string,
  applicationNumber: string,
  loanAmount: string,
  tasks: Array<{
    title: string;
    description: string;
    priority: string;
    due_date: string;
  }>,
): Promise<void> {
  try {
    console.log("📧 Sending client loan welcome email");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const taskListHTML = tasks
      .map(
        (task) => `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0;">
          <tr>
            <td style="background-color:#f0f5fa;border-left:4px solid #0A2F52;border-radius:0 8px 8px 0;padding:14px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom:6px;">
                    <strong style="color:#0f172a;font-size:14px;">${task.title}</strong>
                    &nbsp;&nbsp;<span style="background-color:${
                      task.priority === "urgent"
                        ? "#dc2626"
                        : task.priority === "high"
                          ? "#f59e0b"
                          : task.priority === "medium"
                            ? "#0A2F52"
                            : "#10b981"
                    };color:#ffffff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;">${task.priority}</span>
                  </td>
                </tr>
                <tr><td style="color:#475569;font-size:13px;line-height:1.5;padding-bottom:6px;">${task.description}</td></tr>
                <tr><td style="color:#94a3b8;font-size:12px;">📅 Due: ${new Date(task.due_date).toLocaleDateString()}</td></tr>
              </table>
            </td>
          </tr>
        </table>
      `,
      )
      .join("");

    const mailOptions = {
      from: `"The Mortgage Professionals" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your Loan Application ${applicationNumber} - Next Steps`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Your Loan Application</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
                <!-- LOGO HEADER -->
                <tr>
                  <td style="background-color:#ffffff;padding:24px 32px;border-radius:16px 16px 0 0;border-bottom:3px solid #0A2F52;text-align:center;">
                    <img src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png" alt="The Mortgage Professionals" style="height:52px;width:auto;display:inline-block;" />
                  </td>
                </tr>
                <!-- BODY -->
                <tr>
                  <td style="background-color:#ffffff;padding:40px 32px 32px;">
                    <h2 style="margin:0 0 6px 0;color:#0f172a;font-size:22px;font-weight:700;">Welcome, ${firstName}! 🏡</h2>
                    <p style="margin:0 0 6px 0;color:#475569;font-size:15px;line-height:1.6;">Your loan application has been successfully created.</p>
                    <p style="margin:0 0 28px 0;color:#475569;font-size:15px;">Loan amount: <strong style="color:#0f172a;">$${loanAmount}</strong></p>
                    <!-- APP NUMBER -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background-color:#f0f5fa;border:1px solid #b3d4f0;border-radius:12px;padding:18px;text-align:center;">
                          <p style="margin:0 0 6px 0;color:#0A2F52;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Application Number</p>
                          <p style="margin:0;color:#0f172a;font-size:28px;font-weight:800;letter-spacing:1px;">${applicationNumber}</p>
                        </td>
                      </tr>
                    </table>
                    <!-- TASKS -->
                    <p style="margin:0 0 12px 0;color:#0f172a;font-size:15px;font-weight:700;">📋 Your Next Steps</p>
                    ${taskListHTML}
                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
                      <tr>
                        <td align="center">
                          <a href="${process.env.CLIENT_URL || "https://real-state-one-omega.vercel.app"}/client-login" style="display:inline-block;background-color:#0A2F52;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">Log In to Your Portal</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0 0;color:#94a3b8;font-size:12px;text-align:center;">You will need your email to verify your identity on first login.</p>
                  </td>
                </tr>
                <!-- FOOTER -->
                <tr>
                  <td style="background-color:#0f172a;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
                    <p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-weight:600;">The Mortgage Professionals</p>
                    <p style="margin:0;color:#94a3b8;font-size:12px;">Your partner on the path to your new home</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Client welcome email sent!");
  } catch (error) {
    console.error("❌ Error sending client welcome email:", error);
    throw error;
  }
}

/**
 * Send confirmation email to a user who just submitted via the public wizard.
 * No broker or tasks yet — just confirms receipt and sets expectations.
 */
async function sendPublicApplicationWelcomeEmail(
  email: string,
  firstName: string,
  lastName: string,
  applicationNumber: string,
  loanType: string,
  propertyValue: string,
  estimatedLoan: string,
  propertyAddress: string,
): Promise<void> {
  try {
    console.log("📧 Sending public wizard welcome email");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const loanTypeLabel: Record<string, string> = {
      purchase: "Home Purchase",
      refinance: "Refinance",
    };

    const portalUrl =
      process.env.CLIENT_URL || "https://real-state-one-omega.vercel.app";

    const mailOptions = {
      from: `"The Mortgage Professionals" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `We received your application! — ${applicationNumber}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Application Received</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

                <!-- LOGO HEADER -->
                <tr>
                  <td style="background-color:#ffffff;padding:24px 32px;border-radius:16px 16px 0 0;border-bottom:3px solid #0A2F52;text-align:center;">
                    <img src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png" alt="The Mortgage Professionals" style="height:52px;width:auto;display:inline-block;" />
                  </td>
                </tr>

                <!-- HERO BAND -->
                <tr>
                  <td style="background:linear-gradient(135deg,#0A2F52 0%,#083048 100%);padding:32px;text-align:center;">
                    <p style="margin:0 0 6px 0;color:#b3d4f0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Application Received</p>
                    <h1 style="margin:0 0 4px 0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:0.5px;">You're on your way home!</h1>
                    <p style="margin:0;color:#b3d4f0;font-size:15px;">Hi <strong style="color:#ffffff;">${firstName} ${lastName}</strong>, we've got everything we need.</p>
                  </td>
                </tr>

                <!-- BODY -->
                <tr>
                  <td style="background-color:#ffffff;padding:40px 32px 32px;">

                    <p style="margin:0 0 28px 0;color:#475569;font-size:15px;line-height:1.7;">
                      Thank you for submitting your loan application to <strong style="color:#0f172a;">The Mortgage Professionals</strong>.
                      One of our licensed loan officers will personally review your information and
                      reach out within <strong style="color:#0f172a;">1–2 business days</strong> to discuss your options.
                    </p>

                    <!-- APPLICATION NUMBER BOX -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background-color:#f0f5fa;border:1px solid #b3d4f0;border-radius:12px;padding:20px;text-align:center;">
                          <p style="margin:0 0 6px 0;color:#0A2F52;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Your Application Number</p>
                          <p style="margin:0 0 6px 0;color:#0f172a;font-size:30px;font-weight:800;letter-spacing:1.5px;">${applicationNumber}</p>
                          <p style="margin:0;color:#94a3b8;font-size:12px;">Keep this for your records</p>
                        </td>
                      </tr>
                    </table>

                    <!-- SUMMARY TABLE -->
                    <p style="margin:0 0 12px 0;color:#0f172a;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Application Summary</p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                      <tr style="background-color:#f8fafc;">
                        <td style="padding:12px 16px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;width:45%;">Loan Type</td>
                        <td style="padding:12px 16px;color:#0f172a;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;">${loanTypeLabel[loanType] || loanType}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;">Property Value</td>
                        <td style="padding:12px 16px;color:#0f172a;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;">${propertyValue}</td>
                      </tr>
                      <tr style="background-color:#f8fafc;">
                        <td style="padding:12px 16px;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;">Estimated Loan Amount</td>
                        <td style="padding:12px 16px;color:#0A2F52;font-size:13px;font-weight:800;border-bottom:1px solid #e2e8f0;">${estimatedLoan}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px;color:#64748b;font-size:13px;font-weight:600;">Property Address</td>
                        <td style="padding:12px 16px;color:#0f172a;font-size:13px;font-weight:700;">${propertyAddress || "Not provided"}</td>
                      </tr>
                    </table>

                    <!-- WHAT HAPPENS NEXT -->
                    <p style="margin:0 0 12px 0;color:#0f172a;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">What Happens Next</p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      ${[
                        [
                          "1",
                          "Application Review",
                          "Our team carefully reviews your information and financial profile.",
                        ],
                        [
                          "2",
                          "Loan Officer Contact",
                          "A dedicated loan officer will call or email you within 1–2 business days.",
                        ],
                        [
                          "3",
                          "Document Collection",
                          "You may be asked to upload supporting documents through your secure portal.",
                        ],
                        [
                          "4",
                          "Approval &amp; Closing",
                          "Once everything checks out, we'll guide you through to closing day.",
                        ],
                      ]
                        .map(
                          ([num, title, desc]) => `
                        <tr>
                          <td style="padding:10px 0;vertical-align:top;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="width:36px;vertical-align:top;padding-top:2px;">
                                  <div style="width:28px;height:28px;background-color:#0A2F52;border-radius:50%;text-align:center;line-height:28px;color:#ffffff;font-size:13px;font-weight:800;">${num}</div>
                                </td>
                                <td style="padding-left:12px;">
                                  <p style="margin:0 0 3px 0;color:#0f172a;font-size:14px;font-weight:700;">${title}</p>
                                  <p style="margin:0;color:#475569;font-size:13px;line-height:1.5;">${desc}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      `,
                        )
                        .join("")}
                    </table>

                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td align="center" style="background-color:#f8fafc;border-radius:12px;padding:24px;">
                          <p style="margin:0 0 16px 0;color:#475569;font-size:14px;">Track your application status and upload documents in your secure portal.</p>
                          <a href="${portalUrl}/client-login" style="display:inline-block;background-color:#0A2F52;color:#ffffff;text-decoration:none;padding:14px 48px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">Access My Portal</a>
                          <p style="margin:12px 0 0 0;color:#94a3b8;font-size:12px;">Use your email address to verify your identity on first login.</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
                      Questions? Call us at <a href="tel:(562)337-0000" style="color:#0A2F52;text-decoration:none;font-weight:600;">(562) 337-0000</a>
                    </p>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="background-color:#0f172a;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
                    <p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-weight:600;">The Mortgage Professionals · NMLS #123456</p>
                    <p style="margin:0 0 8px 0;color:#94a3b8;font-size:12px;">Your partner on the path to your new home</p>
                    <p style="margin:0;color:#475569;font-size:11px;">
                      This email was sent because you submitted a loan application on our website.
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Public application welcome email sent!");
  } catch (error) {
    console.error("❌ Error sending public application welcome email:", error);
    throw error;
  }
}

/**
 * Send email when task is reopened for rework
 */
async function sendTaskReopenedEmail(
  email: string,
  firstName: string,
  taskTitle: string,
  reason: string,
): Promise<void> {
  try {
    console.log("📧 Sending task reopened email");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"The Mortgage Professionals" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Task Needs Revision: ${taskTitle}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Task Needs Revision</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
                <!-- LOGO HEADER -->
                <tr>
                  <td style="background-color:#ffffff;padding:24px 32px;border-radius:16px 16px 0 0;border-bottom:3px solid #0A2F52;text-align:center;">
                    <img src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png" alt="The Mortgage Professionals" style="height:52px;width:auto;display:inline-block;" />
                  </td>
                </tr>
                <!-- BODY -->
                <tr>
                  <td style="background-color:#ffffff;padding:40px 32px 32px;">
                    <h2 style="margin:0 0 6px 0;color:#0f172a;font-size:22px;font-weight:700;">📝 Task Needs Revision</h2>
                    <p style="margin:0 0 4px 0;color:#475569;font-size:15px;line-height:1.6;">Hi <strong style="color:#0f172a;">${firstName}</strong>,</p>
                    <p style="margin:0 0 24px 0;color:#475569;font-size:15px;line-height:1.6;">Your task <strong style="color:#0f172a;">&ldquo;${taskTitle}&rdquo;</strong> has been reviewed and needs some revisions before it can be approved.</p>
                    <!-- FEEDBACK BOX -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="background-color:#f0f5fa;border-left:4px solid #0A2F52;border-radius:0 8px 8px 0;padding:16px 18px;">
                          <p style="margin:0 0 8px 0;color:#0A2F52;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">📋 Feedback from Your Loan Officer</p>
                          <p style="margin:0;color:#0f172a;font-size:14px;line-height:1.7;">${reason}</p>
                        </td>
                      </tr>
                    </table>
                    <!-- NEXT STEPS -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="background-color:#f8fafc;border-left:4px solid #0A2F52;border-radius:0 8px 8px 0;padding:16px 18px;">
                          <p style="margin:0 0 10px 0;color:#0f172a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">✅ What to Do Next</p>
                          <ol style="margin:0;padding-left:18px;color:#475569;">
                            <li style="margin:6px 0;font-size:14px;">Log in to your client portal</li>
                            <li style="margin:6px 0;font-size:14px;">Review the feedback above</li>
                            <li style="margin:6px 0;font-size:14px;">Make the necessary updates or corrections</li>
                            <li style="margin:6px 0;font-size:14px;">Resubmit the task for review</li>
                          </ol>
                        </td>
                      </tr>
                    </table>
                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <a href="${process.env.CLIENT_URL || "https://real-state-one-omega.vercel.app"}/client-login" style="display:inline-block;background-color:#0A2F52;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">Review Task Now</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0 0;color:#94a3b8;font-size:12px;text-align:center;">If you have any questions, please contact your loan officer.</p>
                  </td>
                </tr>
                <!-- FOOTER -->
                <tr>
                  <td style="background-color:#0f172a;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
                    <p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-weight:600;">The Mortgage Professionals</p>
                    <p style="margin:0;color:#94a3b8;font-size:12px;">Your partner on the path to your new home</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Task reopened email sent!");
  } catch (error) {
    console.error("❌ Error sending task reopened email:", error);
    throw error;
  }
}

async function sendTaskApprovedEmail(
  email: string,
  firstName: string,
  taskTitle: string,
): Promise<void> {
  try {
    console.log("📧 Sending task approved email");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"The Mortgage Professionals" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Task Approved: ${taskTitle}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Task Approved</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
                <!-- LOGO HEADER -->
                <tr>
                  <td style="background-color:#ffffff;padding:24px 32px;border-radius:16px 16px 0 0;border-bottom:3px solid #16a34a;text-align:center;">
                    <img src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png" alt="The Mortgage Professionals" style="height:52px;width:auto;display:inline-block;" />
                  </td>
                </tr>
                <!-- BODY -->
                <tr>
                  <td style="background-color:#ffffff;padding:40px 32px 32px;">
                    <!-- APPROVAL BADGE -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td align="center">
                          <div style="display:inline-block;background-color:#dcfce7;border-radius:50%;padding:20px;">
                            <span style="font-size:40px;line-height:1;">✅</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <h2 style="margin:0 0 6px 0;color:#0f172a;font-size:22px;font-weight:700;text-align:center;">Task Approved!</h2>
                    <p style="margin:0 0 24px 0;color:#475569;font-size:15px;line-height:1.6;text-align:center;">Great work, <strong style="color:#0f172a;">${firstName}</strong>!</p>
                    <!-- TASK BOX -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="background-color:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:16px 18px;">
                          <p style="margin:0 0 4px 0;color:#16a34a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">✔ Approved Task</p>
                          <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${taskTitle}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 24px 0;color:#475569;font-size:15px;line-height:1.6;">Your loan officer has reviewed and approved this task. Your application is moving forward — keep up the great work!</p>
                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <a href="${process.env.CLIENT_URL || "https://real-state-one-omega.vercel.app"}/client-login" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">View My Portal</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0 0;color:#94a3b8;font-size:12px;text-align:center;">If you have any questions, please contact your loan officer.</p>
                  </td>
                </tr>
                <!-- FOOTER -->
                <tr>
                  <td style="background-color:#0f172a;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
                    <p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-weight:600;">The Mortgage Professionals</p>
                    <p style="margin:0;color:#94a3b8;font-size:12px;">Your partner on the path to your new home</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Task approved email sent!");
  } catch (error) {
    console.error("❌ Error sending task approved email:", error);
    throw error;
  }
}

// =====================================================
// MIDDLEWARE
// =====================================================

async function sendNewTaskAssignedEmail(
  email: string,
  firstName: string,
  taskTitle: string,
  taskDescription: string | null,
  applicationNumber: string,
): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"The Mortgage Professionals" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `New Task Assigned: ${taskTitle}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>New Task Assigned</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
                <!-- LOGO HEADER -->
                <tr>
                  <td style="background-color:#ffffff;padding:24px 32px;border-radius:16px 16px 0 0;border-bottom:3px solid #0A2F52;text-align:center;">
                    <img src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png" alt="The Mortgage Professionals" style="height:52px;width:auto;display:inline-block;" />
                  </td>
                </tr>
                <!-- BODY -->
                <tr>
                  <td style="background-color:#ffffff;padding:40px 32px 32px;">
                    <h2 style="margin:0 0 6px 0;color:#0f172a;font-size:22px;font-weight:700;text-align:center;">New Task Assigned</h2>
                    <p style="margin:0 0 24px 0;color:#475569;font-size:15px;line-height:1.6;text-align:center;">Hi <strong style="color:#0f172a;">${firstName}</strong>, a new task has been added to your loan application.</p>
                    <!-- APP NUMBER -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                      <tr>
                        <td style="background-color:#f1f5f9;border-radius:8px;padding:12px 16px;text-align:center;">
                          <p style="margin:0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Application</p>
                          <p style="margin:4px 0 0;color:#0f172a;font-size:16px;font-weight:700;letter-spacing:0.5px;">#${applicationNumber}</p>
                        </td>
                      </tr>
                    </table>
                    <!-- TASK BOX -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="background-color:#eff6ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:16px 18px;">
                          <p style="margin:0 0 4px 0;color:#2563eb;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Task Required</p>
                          <p style="margin:0 0 6px;color:#0f172a;font-size:15px;font-weight:600;">${taskTitle}</p>
                          ${taskDescription ? `<p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">${taskDescription}</p>` : ""}
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 24px 0;color:#475569;font-size:15px;line-height:1.6;">Please log in to your portal to review and complete this task. Completing tasks promptly helps keep your application on track.</p>
                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <a href="${process.env.CLIENT_URL || "https://real-state-one-omega.vercel.app"}/portal" style="display:inline-block;background-color:#0A2F52;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">Go to My Portal</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0 0;color:#94a3b8;font-size:12px;text-align:center;">Questions? Contact your loan officer at The Mortgage Professionals.</p>
                  </td>
                </tr>
                <!-- FOOTER -->
                <tr>
                  <td style="background-color:#0f172a;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
                    <p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-weight:600;">The Mortgage Professionals &mdash; NMLS #123456</p>
                    <p style="margin:0;color:#94a3b8;font-size:12px;">Your partner on the path to your new home</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ New task assigned email sent!");
  } catch (error) {
    console.error("❌ Error sending new task assigned email:", error);
    throw error;
  }
}

/**
 * Middleware to verify client session
 */
const verifyClientSession = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No session token provided",
      });
    }

    const sessionToken = authHeader.substring(7);

    try {
      const decoded = jwt.verify(sessionToken, JWT_SECRET) as any;

      if (decoded.userType !== "client") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Get client details
      const [clients] = await pool.query<any[]>(
        "SELECT * FROM clients WHERE id = ? AND status = 'active' AND tenant_id = ?",
        [decoded.clientId, MORTGAGE_TENANT_ID],
      );

      if (clients.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Client not found or inactive",
        });
      }

      // Attach client info to request
      (req as any).client = clients[0];
      (req as any).clientId = decoded.clientId;

      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }
  } catch (error) {
    console.error("Error verifying client session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify session",
    });
  }
};

/**
 * Middleware to verify broker session
 */
const verifyBrokerSession = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No session token provided",
      });
    }

    const sessionToken = authHeader.substring(7);

    try {
      const decoded = jwt.verify(sessionToken, JWT_SECRET) as any;

      if (decoded.userType !== "broker") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Get broker details
      const [brokers] = await pool.query<any[]>(
        "SELECT * FROM brokers WHERE id = ? AND status = 'active' AND tenant_id = ?",
        [decoded.brokerId, MORTGAGE_TENANT_ID],
      );

      if (brokers.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Broker not found or inactive",
        });
      }

      // Attach broker info to request
      (req as any).broker = brokers[0];
      (req as any).brokerId = decoded.brokerId;
      (req as any).brokerRole = brokers[0].role;

      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }
  } catch (error) {
    console.error("Error verifying broker session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify session",
    });
  }
};

// =====================================================
// AUDIT LOG HELPER
// =====================================================

/**
 * Create an audit log entry
 */
async function createAuditLog({
  actorType,
  actorId,
  action,
  entityType,
  entityId,
  changes,
  status = "success",
  errorMessage,
  requestId,
  durationMs,
  ipAddress,
  userAgent,
}: {
  actorType: "user" | "broker";
  actorId: number;
  action: string;
  entityType?: string;
  entityId?: number;
  changes?: any;
  status?: "success" | "failure" | "warning";
  errorMessage?: string;
  requestId?: string;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const userId = actorType === "user" ? actorId : null;
    const brokerId = actorType === "broker" ? actorId : null;

    await pool.query(
      `INSERT INTO audit_logs (
        tenant_id, user_id, broker_id, actor_type, action, entity_type, entity_id, 
        changes, status, error_message, request_id, duration_ms, 
        ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        MORTGAGE_TENANT_ID,
        userId,
        brokerId,
        actorType,
        action,
        entityType || null,
        entityId || null,
        changes ? JSON.stringify(changes) : null,
        status,
        errorMessage || null,
        requestId || null,
        durationMs || null,
        ipAddress || null,
        userAgent || null,
      ],
    );
  } catch (error) {
    console.error("Error creating audit log:", error);
    // Don't throw - audit logging should not break the main flow
  }
}

// =====================================================
// ROUTE HANDLERS
// =====================================================

/**
 * GET /api/health
 * Health check endpoint
 */
const handleHealth: RequestHandler = async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      success: true,
      message: "The Mortgage Professionals API is running",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/ping
 * Simple ping endpoint
 */
const handlePing: RequestHandler = (_req, res) => {
  res.json({ message: "pong" });
};

/**
 * POST /api/admin/auth/send-code
 * Send verification code to broker email
 */
const handleAdminSendCode: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if broker exists and is active
    const [brokers] = await pool.query<any[]>(
      "SELECT * FROM brokers WHERE email = ? AND status = 'active' AND tenant_id = ?",
      [normalizedEmail, MORTGAGE_TENANT_ID],
    );

    if (brokers.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Broker not found. Please contact an administrator to get access.",
      });
    }

    const broker = brokers[0];

    // Delete old sessions for this broker
    await pool.query("DELETE FROM broker_sessions WHERE broker_id = ?", [
      broker.id,
    ]);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000);

    // Create new session with 15-minute expiry (using MySQL time to avoid timezone issues)
    await pool.query(
      `INSERT INTO broker_sessions (broker_id, session_code, is_active, expires_at) 
       VALUES (?, ?, TRUE, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [broker.id, code],
    );

    console.log("✅ Session created with code:", code);

    // Send email with code
    try {
      await sendBrokerVerificationEmail(
        normalizedEmail,
        code,
        broker.first_name,
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Continue anyway - the code is still valid
    }

    res.json({
      success: true,
      message: "Verification code sent to your email",
      debug_code: process.env.NODE_ENV === "development" ? code : undefined,
    });
  } catch (error) {
    console.error("Error sending broker verification code:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send verification code",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/admin/auth/verify-code
 * Verify code and create broker session
 */
const handleAdminVerifyCode: RequestHandler = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and code are required",
      });
    }

    // Normalize email to match send-code endpoint
    const normalizedEmail = email.trim().toLowerCase();

    console.log("🔍 Verifying broker code:", { email: normalizedEmail, code });

    // Check if broker exists
    const [brokers] = await pool.query<any[]>(
      `SELECT b.*, bp.avatar_url
       FROM brokers b
       LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
       WHERE b.email = ? AND b.status = 'active' AND b.tenant_id = ?`,
      [normalizedEmail, MORTGAGE_TENANT_ID],
    );

    if (brokers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    const broker = brokers[0];

    // Check if code is valid
    const [sessions] = await pool.query<any[]>(
      `SELECT *, expires_at, NOW() as server_time FROM broker_sessions 
       WHERE broker_id = ? AND session_code = ? AND is_active = TRUE 
       AND expires_at > NOW()`,
      [broker.id, parseInt(code)],
    );

    console.log("📊 Sessions found:", sessions.length);
    if (sessions.length > 0) {
      console.log("⏰ Session expires at:", sessions[0].expires_at);
      console.log("🕐 Server time:", sessions[0].server_time);
      console.log("✅ Code is valid!");
    } else {
      // Check if session exists without time constraint
      const [allSessions] = await pool.query<any[]>(
        `SELECT *, expires_at, NOW() as server_time, 
         TIMESTAMPDIFF(SECOND, NOW(), expires_at) as seconds_until_expiry 
         FROM broker_sessions 
         WHERE broker_id = ? AND session_code = ?`,
        [broker.id, parseInt(code)],
      );
      console.log("❌ No valid sessions. Debug info:");
      console.log("   Total sessions found:", allSessions.length);
      if (allSessions.length > 0) {
        console.log("   Session details:", {
          expires_at: allSessions[0].expires_at,
          server_time: allSessions[0].server_time,
          is_active: allSessions[0].is_active,
          seconds_until_expiry: allSessions[0].seconds_until_expiry,
        });
      }
    }

    if (sessions.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    // Generate session token (JWT)
    const sessionToken = jwt.sign(
      {
        brokerId: broker.id,
        email: broker.email,
        role: broker.role,
        userType: "broker",
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Update last login
    await pool.query(
      "UPDATE brokers SET last_login = NOW() WHERE id = ? AND tenant_id = ?",
      [broker.id, MORTGAGE_TENANT_ID],
    );

    res.json({
      success: true,
      sessionToken,
      admin: {
        id: broker.id,
        email: broker.email,
        first_name: broker.first_name,
        last_name: broker.last_name,
        phone: broker.phone,
        role: broker.role,
        is_active: broker.status === "active",
        avatar_url: broker.avatar_url ?? null,
      },
    });
  } catch (error) {
    console.error("Error verifying broker code:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify code",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/admin/auth/validate
 * Validate broker session token
 */
const handleAdminValidateSession: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No session token provided",
      });
    }

    const sessionToken = authHeader.substring(7);

    try {
      const decoded = jwt.verify(sessionToken, JWT_SECRET) as any;

      if (decoded.userType !== "broker") {
        return res.status(401).json({
          success: false,
          message: "Invalid session type",
        });
      }

      // Get broker details
      const [brokers] = await pool.query<any[]>(
        "SELECT * FROM brokers WHERE id = ? AND status = 'active' AND tenant_id = ?",
        [decoded.brokerId, MORTGAGE_TENANT_ID],
      );

      if (brokers.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Broker not found or inactive",
        });
      }

      const broker = brokers[0];

      res.json({
        success: true,
        admin: {
          id: broker.id,
          email: broker.email,
          first_name: broker.first_name,
          last_name: broker.last_name,
          phone: broker.phone,
          role: broker.role,
          is_active: broker.status === "active",
          avatar_url: broker.avatar_url ?? null,
        },
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }
  } catch (error) {
    console.error("Error validating broker session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate session",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/client/auth/send-code
 * Send verification code to client email
 */
const handleClientSendCode: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if client exists
    const [clients] = await pool.query<any[]>(
      "SELECT * FROM clients WHERE email = ? AND status = 'active' AND tenant_id = ?",
      [normalizedEmail, MORTGAGE_TENANT_ID],
    );

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "client_not_found",
        redirect: "/wizard",
      });
    }

    const client = clients[0];

    // Delete old sessions for this client
    await pool.query("DELETE FROM user_sessions WHERE user_id = ?", [
      client.id,
    ]);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000);

    // Create new session with 15-minute expiry (using MySQL time to avoid timezone issues)
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_code, is_active, expires_at) 
       VALUES (?, ?, TRUE, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [client.id, code],
    );

    // Send email with code
    await sendClientVerificationEmail(normalizedEmail, code, client.first_name);

    res.json({
      success: true,
      message: "Verification code sent to your email",
      debug_code: process.env.NODE_ENV === "development" ? code : undefined,
    });
  } catch (error) {
    console.error("Error sending client verification code:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send verification code",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/client/auth/verify-code
 * Verify code and create client session
 */
const handleClientVerifyCode: RequestHandler = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and code are required",
      });
    }

    // Normalize email to match send-code endpoint
    const normalizedEmail = email.trim().toLowerCase();

    console.log("🔍 Verifying client code:", { email: normalizedEmail, code });

    // Check if client exists
    const [clients] = await pool.query<any[]>(
      "SELECT * FROM clients WHERE email = ? AND status = 'active' AND tenant_id = ?",
      [normalizedEmail, MORTGAGE_TENANT_ID],
    );

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const client = clients[0];

    // Check if code is valid
    const [sessions] = await pool.query<any[]>(
      `SELECT *, expires_at, NOW() as server_time FROM user_sessions 
       WHERE user_id = ? AND session_code = ? AND is_active = TRUE 
       AND expires_at > NOW()`,
      [client.id, parseInt(code)],
    );

    console.log("📊 Sessions found:", sessions.length);
    if (sessions.length > 0) {
      console.log("⏰ Session expires at:", sessions[0].expires_at);
      console.log("🕐 Server time:", sessions[0].server_time);
      console.log("✅ Code is valid!");
    } else {
      // Check if session exists without time constraint
      const [allSessions] = await pool.query<any[]>(
        `SELECT *, expires_at, NOW() as server_time, 
         TIMESTAMPDIFF(SECOND, NOW(), expires_at) as seconds_until_expiry 
         FROM user_sessions 
         WHERE user_id = ? AND session_code = ?`,
        [client.id, parseInt(code)],
      );
      console.log("❌ No valid sessions. Debug info:");
      console.log("   Total sessions found:", allSessions.length);
      if (allSessions.length > 0) {
        console.log("   Session details:", {
          expires_at: allSessions[0].expires_at,
          server_time: allSessions[0].server_time,
          is_active: allSessions[0].is_active,
          seconds_until_expiry: allSessions[0].seconds_until_expiry,
        });
      }
    }

    if (sessions.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    // Generate session token (JWT)
    const sessionToken = jwt.sign(
      {
        clientId: client.id,
        email: client.email,
        userType: "client",
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    // Update last login
    await pool.query(
      "UPDATE clients SET last_login = NOW() WHERE id = ? AND tenant_id = ?",
      [client.id, MORTGAGE_TENANT_ID],
    );

    res.json({
      success: true,
      sessionToken,
      client: {
        id: client.id,
        email: client.email,
        first_name: client.first_name,
        last_name: client.last_name,
        phone: client.phone,
        is_active: client.status === "active",
      },
    });
  } catch (error) {
    console.error("Error verifying client code:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify code",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/client/auth/validate
 * Validate client session token
 */
const handleClientValidateSession: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No session token provided",
      });
    }

    const sessionToken = authHeader.substring(7);

    try {
      const decoded = jwt.verify(sessionToken, JWT_SECRET) as any;

      if (decoded.userType !== "client") {
        return res.status(401).json({
          success: false,
          message: "Invalid session type",
        });
      }

      // Get client details
      const [clients] = await pool.query<any[]>(
        "SELECT * FROM clients WHERE id = ? AND status = 'active' AND tenant_id = ?",
        [decoded.clientId, MORTGAGE_TENANT_ID],
      );

      if (clients.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Client not found or inactive",
        });
      }

      const client = clients[0];

      res.json({
        success: true,
        client: {
          id: client.id,
          email: client.email,
          first_name: client.first_name,
          last_name: client.last_name,
          phone: client.phone,
          is_active: client.status === "active",
        },
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }
  } catch (error) {
    console.error("Error validating client session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate session",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/client/auth/logout
 * Logout client and invalidate sessions
 */
const handleClientLogout: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(200).json({ success: true });
    }

    const sessionToken = authHeader.substring(7);

    try {
      const decoded = jwt.verify(sessionToken, JWT_SECRET) as any;

      if (decoded.clientId) {
        // Delete all sessions for this client
        await pool.query("DELETE FROM user_sessions WHERE user_id = ?", [
          decoded.clientId,
        ]);
      }
    } catch (error) {
      // Token already invalid, no problem
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error logging out client:", error);
    res.status(500).json({
      success: false,
      message: "Failed to logout",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/admin/auth/logout
 * Logout broker and invalidate sessions
 */
const handleAdminLogout: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(200).json({ success: true });
    }

    const sessionToken = authHeader.substring(7);

    try {
      const decoded = jwt.verify(sessionToken, JWT_SECRET) as any;

      if (decoded.brokerId) {
        // Delete all sessions for this broker
        await pool.query("DELETE FROM broker_sessions WHERE broker_id = ?", [
          decoded.brokerId,
        ]);
      }
    } catch (error) {
      // Token already invalid, no problem
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error logging out broker:", error);
    res.status(500).json({
      success: false,
      message: "Failed to logout",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /api/admin/profile
 * Get the authenticated broker's own profile (brokers + broker_profiles join)
 */
const handleGetBrokerProfile: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;

    const [rows] = await pool.query<any[]>(
      `SELECT
        b.id, b.email, b.first_name, b.last_name, b.phone, b.role,
        b.license_number, b.specializations,
        bp.bio, bp.avatar_url, bp.office_address, bp.office_city,
        bp.office_state, bp.office_zip, bp.years_experience, COALESCE(bp.total_loans_closed, 0) AS total_loans_closed,
        bp.facebook_url, bp.instagram_url, bp.linkedin_url, bp.twitter_url,
        bp.youtube_url, bp.website_url
      FROM brokers b
      LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
      WHERE b.id = ? AND b.tenant_id = ?`,
      [brokerId, MORTGAGE_TENANT_ID],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Broker not found" });
    }

    const profile = rows[0];
    if (typeof profile.specializations === "string") {
      try {
        profile.specializations = JSON.parse(profile.specializations);
      } catch {
        profile.specializations = [];
      }
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching broker profile:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch profile",
    });
  }
};

/**
 * PUT /api/admin/profile
 * Update the authenticated broker's own profile
 */
const handleUpdateBrokerProfile: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const {
      first_name,
      last_name,
      phone,
      license_number,
      specializations,
      bio,
      office_address,
      office_city,
      office_state,
      office_zip,
      years_experience,
      facebook_url,
      instagram_url,
      linkedin_url,
      twitter_url,
      youtube_url,
      website_url,
    } = req.body;

    // Update brokers table
    const brokerUpdates: string[] = [];
    const brokerValues: any[] = [];

    if (first_name !== undefined) {
      brokerUpdates.push("first_name = ?");
      brokerValues.push(first_name);
    }
    if (last_name !== undefined) {
      brokerUpdates.push("last_name = ?");
      brokerValues.push(last_name);
    }
    if (phone !== undefined) {
      brokerUpdates.push("phone = ?");
      brokerValues.push(phone || null);
    }
    if (license_number !== undefined) {
      brokerUpdates.push("license_number = ?");
      brokerValues.push(license_number || null);
    }
    if (specializations !== undefined) {
      brokerUpdates.push("specializations = ?");
      brokerValues.push(JSON.stringify(specializations));
    }

    if (brokerUpdates.length > 0) {
      brokerValues.push(brokerId, MORTGAGE_TENANT_ID);
      await pool.query(
        `UPDATE brokers SET ${brokerUpdates.join(", ")}, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
        brokerValues,
      );
    }

    // Upsert broker_profiles
    const profileUpdateCols: string[] = [];
    const profileValues: any[] = [];

    if (bio !== undefined) {
      profileUpdateCols.push("bio");
      profileValues.push(bio || null);
    }
    if (office_address !== undefined) {
      profileUpdateCols.push("office_address");
      profileValues.push(office_address || null);
    }
    if (office_city !== undefined) {
      profileUpdateCols.push("office_city");
      profileValues.push(office_city || null);
    }
    if (office_state !== undefined) {
      profileUpdateCols.push("office_state");
      profileValues.push(office_state || null);
    }
    if (office_zip !== undefined) {
      profileUpdateCols.push("office_zip");
      profileValues.push(office_zip || null);
    }
    if (years_experience !== undefined) {
      profileUpdateCols.push("years_experience");
      profileValues.push(
        years_experience !== null && years_experience !== ""
          ? Number(years_experience)
          : null,
      );
    }
    if (facebook_url !== undefined) {
      profileUpdateCols.push("facebook_url");
      profileValues.push(facebook_url || null);
    }
    if (instagram_url !== undefined) {
      profileUpdateCols.push("instagram_url");
      profileValues.push(instagram_url || null);
    }
    if (linkedin_url !== undefined) {
      profileUpdateCols.push("linkedin_url");
      profileValues.push(linkedin_url || null);
    }
    if (twitter_url !== undefined) {
      profileUpdateCols.push("twitter_url");
      profileValues.push(twitter_url || null);
    }
    if (youtube_url !== undefined) {
      profileUpdateCols.push("youtube_url");
      profileValues.push(youtube_url || null);
    }
    if (website_url !== undefined) {
      profileUpdateCols.push("website_url");
      profileValues.push(website_url || null);
    }

    if (profileUpdateCols.length > 0) {
      const [existing] = await pool.query<any[]>(
        "SELECT id FROM broker_profiles WHERE broker_id = ?",
        [brokerId],
      );
      if (existing.length > 0) {
        const setClauses = profileUpdateCols
          .map((col) => `${col} = ?`)
          .join(", ");
        await pool.query(
          `UPDATE broker_profiles SET ${setClauses}, updated_at = NOW() WHERE broker_id = ?`,
          [...profileValues, brokerId],
        );
      } else {
        const cols = ["broker_id", ...profileUpdateCols].join(", ");
        const placeholders = profileUpdateCols.map(() => "?").join(", ");
        await pool.query(
          `INSERT INTO broker_profiles (${cols}) VALUES (?, ${placeholders})`,
          [brokerId, ...profileValues],
        );
      }
    }

    // Return updated profile
    const [rows] = await pool.query<any[]>(
      `SELECT
        b.id, b.email, b.first_name, b.last_name, b.phone, b.role,
        b.license_number, b.specializations,
        bp.bio, bp.avatar_url, bp.office_address, bp.office_city,
        bp.office_state, bp.office_zip, bp.years_experience, COALESCE(bp.total_loans_closed, 0) AS total_loans_closed,
        bp.facebook_url, bp.instagram_url, bp.linkedin_url, bp.twitter_url,
        bp.youtube_url, bp.website_url
      FROM brokers b
      LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
      WHERE b.id = ? AND b.tenant_id = ?`,
      [brokerId, MORTGAGE_TENANT_ID],
    );

    const profile = rows[0];
    if (typeof profile.specializations === "string") {
      try {
        profile.specializations = JSON.parse(profile.specializations);
      } catch {
        profile.specializations = [];
      }
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error updating broker profile:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update profile",
    });
  }
};

/**
 * PUT /api/admin/profile/avatar
 * Save the avatar URL (after the client uploaded the image to the external CDN)
 */
const handleUpdateBrokerAvatar: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { avatar_url } = req.body;

    if (!avatar_url) {
      return res
        .status(400)
        .json({ success: false, error: "avatar_url is required" });
    }

    const [existing] = await pool.query<any[]>(
      "SELECT id FROM broker_profiles WHERE broker_id = ?",
      [brokerId],
    );

    if (existing.length > 0) {
      await pool.query(
        "UPDATE broker_profiles SET avatar_url = ?, updated_at = NOW() WHERE broker_id = ?",
        [avatar_url, brokerId],
      );
    } else {
      await pool.query(
        "INSERT INTO broker_profiles (broker_id, avatar_url) VALUES (?, ?)",
        [brokerId, avatar_url],
      );
    }

    res.json({ success: true, avatar_url });
  } catch (error) {
    console.error("Error updating broker avatar:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update avatar",
    });
  }
};

/**
 * Create a new loan application with tasks
 */
const handleCreateLoan: RequestHandler = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      client_email,
      client_first_name,
      client_last_name,
      client_phone,
      loan_type,
      loan_amount,
      property_value,
      down_payment,
      loan_purpose,
      property_address,
      property_city,
      property_state,
      property_zip,
      property_type,
      estimated_close_date,
      notes,
      tasks,
    } = req.body;

    // Get broker ID from authenticated session
    const brokerId = (req as any).brokerId;

    // Check if client exists
    let [existingClients] = await connection.query<any[]>(
      "SELECT id FROM clients WHERE email = ? AND tenant_id = ?",
      [client_email, MORTGAGE_TENANT_ID],
    );

    let clientId: number;

    if (existingClients.length > 0) {
      clientId = existingClients[0].id;
      // Update client info
      await connection.query(
        "UPDATE clients SET first_name = ?, last_name = ?, phone = ?, assigned_broker_id = ? WHERE id = ? AND tenant_id = ?",
        [
          client_first_name,
          client_last_name,
          client_phone,
          brokerId,
          clientId,
          MORTGAGE_TENANT_ID,
        ],
      );
    } else {
      // Create new client
      const [clientResult] = await connection.query<any>(
        `INSERT INTO clients (tenant_id, email, first_name, last_name, phone, status, email_verified, assigned_broker_id, source) 
         VALUES (?, ?, ?, ?, ?, 'active', 0, ?, 'broker_created')`,
        [
          MORTGAGE_TENANT_ID,
          client_email,
          client_first_name,
          client_last_name,
          client_phone,
          brokerId,
        ],
      );
      clientId = clientResult.insertId;
    }

    // Generate unique application number
    const applicationNumber = `LA${Date.now().toString().slice(-8)}`;

    // Create loan application
    const [loanResult] = await connection.query<any>(
      `INSERT INTO loan_applications (
        tenant_id, application_number, client_user_id, broker_user_id, loan_type, loan_amount,
        property_value, property_address, property_city, property_state, property_zip,
        property_type, down_payment, loan_purpose, status, current_step, total_steps,
        estimated_close_date, notes, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'app_sent', 1, 8, ?, ?, NOW())`,

      [
        MORTGAGE_TENANT_ID,
        applicationNumber,
        clientId,
        brokerId,
        loan_type,
        loan_amount,
        property_value,
        property_address,
        property_city,
        property_state,
        property_zip,
        property_type,
        down_payment,
        loan_purpose || null,
        estimated_close_date || null,
        notes || null,
      ],
    );

    const applicationId = loanResult.insertId;

    // Create tasks
    const tasksWithDates = [];
    for (const task of tasks || []) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (task.due_days || 3));

      console.log(`📝 Creating task:`, {
        title: task.title,
        template_id: task.template_id,
        task_type: task.task_type,
      });

      await connection.query(
        `INSERT INTO tasks (
          tenant_id, application_id, title, description, task_type, status, priority,
          assigned_to_user_id, created_by_broker_id, due_date, template_id
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        [
          MORTGAGE_TENANT_ID,
          applicationId,
          task.title,
          task.description,
          task.task_type,
          task.priority,
          clientId,
          brokerId,
          dueDate,
          task.template_id || null,
        ],
      );

      tasksWithDates.push({
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: dueDate.toISOString(),
      });
    }

    // Create notification for client
    await connection.query(
      `INSERT INTO notifications (tenant_id, user_id, title, message, notification_type, action_url)
       VALUES (?, ?, ?, ?, 'info', '/portal')`,
      [
        MORTGAGE_TENANT_ID,
        clientId,
        "New Loan Application Created",
        `Your loan application ${applicationNumber} has been created. Please complete the assigned tasks.`,
      ],
    );

    await connection.commit();

    // Send welcome email to client
    try {
      await sendClientLoanWelcomeEmail(
        client_email,
        client_first_name,
        applicationNumber,
        new Intl.NumberFormat("en-US").format(parseFloat(loan_amount)),
        tasksWithDates,
      );
    } catch (emailError) {
      console.error("Email sending failed (non-fatal):", emailError);
    }

    res.json({
      success: true,
      application_id: applicationId,
      application_number: applicationNumber,
      client_id: clientId,
      tasks_created: tasks?.length || 0,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating loan:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create loan",
    });
  } finally {
    connection.release();
  }
};

/**
 * PUBLIC: Submit a loan application from the public-facing wizard.
 * No broker auth required. Creates client + loan (status=submitted, broker_user_id=NULL).
 */
const handlePublicApply: RequestHandler = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      // Identity (Step 1)
      first_name,
      last_name,
      email,
      phone,
      address_street,
      address_city,
      address_state,
      address_zip,
      date_of_birth,
      // Property (Step 2)
      loan_type,
      property_value,
      down_payment,
      property_type,
      property_address,
      property_city,
      property_state,
      property_zip,
      loan_purpose,
      // Finances (Step 3)
      annual_income,
      credit_score_range,
      income_type,
      // Employment (Step 4)
      employment_status,
      employer_name,
      years_employed,
      // Citizenship / immigration (Step 1)
      citizenship_status,
      // Optional broker association
      broker_token,
    } = req.body;

    if (!email || !first_name || !last_name) {
      res
        .status(400)
        .json({ success: false, error: "Name and email are required" });
      return;
    }

    // Derive numeric loan amount from property_value minus down_payment (best estimate)
    const propVal = parseFloat(property_value) || 0;
    const dp = parseFloat(down_payment) || 0;
    const loan_amount = propVal > dp ? propVal - dp : propVal || 100000;

    // Upsert client (keyed by email + tenant)
    const [existingClients] = await connection.query<any[]>(
      "SELECT id FROM clients WHERE email = ? AND tenant_id = ?",
      [email.toLowerCase().trim(), MORTGAGE_TENANT_ID],
    );

    let clientId: number;
    const resolvedIncomeType =
      income_type &&
      ["W-2", "1099", "Self-Employed", "Investor", "Mixed"].includes(
        income_type,
      )
        ? income_type
        : "W-2";

    const resolvedCitizenshipStatus =
      citizenship_status &&
      ["us_citizen", "permanent_resident", "non_resident", "other"].includes(
        citizenship_status,
      )
        ? citizenship_status
        : null;

    if (existingClients.length > 0) {
      clientId = existingClients[0].id;
      await connection.query(
        `UPDATE clients SET first_name=?, last_name=?, phone=?,
          address_street=?, address_city=?, address_state=?, address_zip=?,
          employment_status=?, income_type=?, annual_income=?, credit_score=?,
          citizenship_status=?,
          assigned_broker_id = COALESCE(assigned_broker_id, ?),
          updated_at=NOW()
         WHERE id=? AND tenant_id=?`,
        [
          first_name,
          last_name,
          phone || null,
          address_street || null,
          address_city || null,
          address_state || null,
          address_zip || null,
          employment_status || null,
          resolvedIncomeType,
          annual_income || null,
          credit_score_range ? parseInt(credit_score_range) : null,
          resolvedCitizenshipStatus,
          null, // placeholder; will be replaced after broker resolves
          clientId,
          MORTGAGE_TENANT_ID,
        ],
      );
    } else {
      const [clientResult] = await connection.query<any>(
        `INSERT INTO clients
          (tenant_id, email, first_name, last_name, phone,
           address_street, address_city, address_state, address_zip,
           employment_status, income_type, annual_income, credit_score,
           citizenship_status, assigned_broker_id, status, email_verified, source)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active',0,'public_wizard')`,
        [
          MORTGAGE_TENANT_ID,
          email.toLowerCase().trim(),
          first_name,
          last_name,
          phone || null,
          address_street || null,
          address_city || null,
          address_state || null,
          address_zip || null,
          employment_status || null,
          resolvedIncomeType,
          annual_income || null,
          credit_score_range ? parseInt(credit_score_range) : null,
          resolvedCitizenshipStatus,
          null, // placeholder; will be filled after broker resolves
        ],
      );
      clientId = clientResult.insertId;
    }

    const applicationNumber = `LA${Date.now().toString().slice(-8)}`;

    const resolvedLoanType =
      loan_type && ["purchase", "refinance"].includes(loan_type)
        ? loan_type
        : "purchase";

    const resolvedPropertyType =
      property_type &&
      [
        "single_family",
        "condo",
        "multi_family",
        "commercial",
        "land",
        "other",
      ].includes(property_type)
        ? property_type
        : null;

    // Resolve broker from share link token (if provided).
    // Admin brokers (Mortgage Bankers) are assigned as broker_user_id.
    // Partner brokers (role='broker') are assigned as partner_broker_id.
    let resolvedBrokerUserId: number | null = null;
    let resolvedPartnerBrokerId: number | null = null;
    if (broker_token) {
      const [brokerRows] = await connection.query<any[]>(
        "SELECT id, role, created_by_broker_id FROM brokers WHERE public_token = ? AND status = 'active'",
        [broker_token],
      );
      if (brokerRows.length > 0) {
        const { id: bkId, role: bkRole, created_by_broker_id } = brokerRows[0];
        if (bkRole === "admin") {
          resolvedBrokerUserId = bkId;
        } else {
          // Partner broker — assign them as partner and their parent MB as the mortgage banker
          resolvedPartnerBrokerId = bkId;
          if (created_by_broker_id) {
            resolvedBrokerUserId = created_by_broker_id;
          }
        }
      }
    }

    // Assign broker/partner to this client
    const clientBrokerId = resolvedBrokerUserId ?? resolvedPartnerBrokerId;
    if (clientBrokerId) {
      await connection.query(
        `UPDATE clients SET assigned_broker_id = COALESCE(assigned_broker_id, ?) WHERE id = ? AND tenant_id = ?`,
        [clientBrokerId, clientId, MORTGAGE_TENANT_ID],
      );
    }

    const [loanResult] = await connection.query<any>(
      `INSERT INTO loan_applications
        (tenant_id, application_number, client_user_id, broker_user_id,
         partner_broker_id,
         loan_type, loan_amount, property_value, property_address,
         property_city, property_state, property_zip, property_type,
         down_payment, loan_purpose, status, current_step, total_steps,
         priority, notes, broker_token, citizenship_status, submitted_at)
       VALUES (?,?,?,?,?, ?,?,?,?,?,?,?,?,?,?,'application_received',1,8,'medium',?,?,?,NOW())`,
      [
        MORTGAGE_TENANT_ID,
        applicationNumber,
        clientId,
        resolvedBrokerUserId,
        resolvedPartnerBrokerId,
        resolvedLoanType,
        loan_amount,
        propVal || null,
        property_address || null,
        property_city || null,
        property_state || null,
        property_zip || null,
        resolvedPropertyType,
        dp || null,
        loan_purpose || null,
        `Public wizard submission. Employment: ${employment_status || "N/A"}, Employer: ${employer_name || "N/A"}, Years employed: ${years_employed || "N/A"}`,
        broker_token || null,
        resolvedCitizenshipStatus,
      ],
    );

    const applicationId = loanResult.insertId;

    // ── Auto-assign tasks from templates based on client profile ──────────────
    //
    // Always:
    //   Government-Issued ID, Social Security Card (SSN), 2 Months Bank Statements
    //
    // Citizenship:
    //   permanent_resident → Green Card (Permanent Resident Card)
    //   non_resident       → Visa / Work Authorization Document, ITIN Assignment Letter
    //
    // Income type:
    //   W-2           → W-2 Form + Most Recent Pay-Stubs (1 Month)
    //                   + Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)
    //   1099          → 1099 Forms (Last 2 Years)
    //                   + Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)
    //   Self-Employed → 1099 Forms (Last 2 Years) + Profit & Loss Statement (Current Year)
    //                   + Federal Tax Returns Last 2 Years Including Business Tax Returns
    //                   + Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)
    //   Mixed         → Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)
    //   Investor      → (no auto-assign)
    //
    // Employment status:
    //   retired              → Social Security Award Letter
    //   retired_with_pension → Pension / Retirement Award Letter
    //
    // Loan type:
    //   refinance / home_equity → Insurance Policy + Current Mortgage Statement / Payoff Letter
    //   purchase                → (no tasks — amount inquiry only)
    //   construction            → (no tasks — obtained from title company at closing)
    //
    // Property type (if client owns other property):
    //   condo         → HOA Statement & Master Insurance Policy + Mortgage Statement + Insurance Policy
    //   single_family → Existing Lease Agreements + Mortgage Statement + Insurance Policy
    //   multi_family  → Existing Lease Agreements + Mortgage Statement + Insurance Policy
    //   commercial    → (no auto-assign)

    const templateTitlesSet = new Set<string>();
    const addTask = (...titles: string[]) =>
      titles.forEach((t) => templateTitlesSet.add(t));

    // Always assigned
    addTask(
      "Government-Issued ID",
      "Social Security Card (SSN)",
      "2 Months Bank Statements",
    );

    // Citizenship
    if (resolvedCitizenshipStatus === "permanent_resident") {
      addTask("Green Card (Permanent Resident Card)");
    }
    if (resolvedCitizenshipStatus === "non_resident") {
      addTask("Visa / Work Authorization Document", "ITIN Assignment Letter");
    }

    // Income type
    if (resolvedIncomeType === "W-2") {
      addTask(
        "W-2 Form",
        "Most Recent Pay-Stubs (1 Month)",
        "Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)",
      );
    } else if (resolvedIncomeType === "1099") {
      addTask(
        "1099 Forms (Last 2 Years)",
        "Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)",
      );
    } else if (resolvedIncomeType === "Self-Employed") {
      addTask(
        "1099 Forms (Last 2 Years)",
        "Profit & Loss Statement (Current Year)",
        "Federal Tax Returns Last 2 Years Including Business Tax Returns",
        "Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)",
      );
    } else if (resolvedIncomeType === "Mixed") {
      addTask(
        "Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)",
      );
    }
    // Investor: no auto-assign per flowchart

    // Employment status
    if (employment_status === "retired") {
      addTask("Social Security Award Letter");
    } else if (employment_status === "retired_with_pension") {
      addTask("Pension / Retirement Award Letter");
    }

    // Loan type
    if (resolvedLoanType === "refinance") {
      addTask("Insurance Policy", "Current Mortgage Statement / Payoff Letter");
    }
    // purchase  → no documents needed (amount inquiry only)
    // construction → obtained from title company at closing

    // Property type
    if (resolvedPropertyType === "condo") {
      addTask(
        "HOA Statement & Master Insurance Policy",
        "Mortgage Statement",
        "Insurance Policy",
      );
    } else if (
      resolvedPropertyType === "single_family" ||
      resolvedPropertyType === "multi_family"
    ) {
      addTask(
        "Existing Lease Agreements",
        "Mortgage Statement",
        "Insurance Policy",
      );
    }
    // commercial → not in flowchart, no auto-assign

    const templateTitlesToAssign = Array.from(templateTitlesSet);

    const [templateRows] = await connection.query<any[]>(
      `SELECT id, title, description, task_type, priority, default_due_days,
              requires_documents, document_instructions, has_custom_form, has_signing
       FROM task_templates
       WHERE title IN (${templateTitlesToAssign.map(() => "?").join(",")})
         AND tenant_id = ?
         AND is_active = 1`,
      [...templateTitlesToAssign, MORTGAGE_TENANT_ID],
    );

    for (const tmpl of templateRows) {
      const dueDate = tmpl.default_due_days
        ? new Date(Date.now() + tmpl.default_due_days * 86_400_000)
        : new Date(Date.now() + 7 * 86_400_000); // default 7 days

      await connection.query(
        `INSERT INTO tasks
           (tenant_id, application_id, template_id, title, description, task_type,
            status, priority, assigned_to_user_id, due_date)
         VALUES (?,?,?,?,?,?,'pending',?,?,?)`,
        [
          MORTGAGE_TENANT_ID,
          applicationId,
          tmpl.id,
          tmpl.title,
          tmpl.description || null,
          tmpl.task_type,
          tmpl.priority,
          clientId,
          dueDate,
        ],
      );
    }

    // Notify the client
    await connection.query(
      `INSERT INTO notifications (tenant_id, user_id, title, message, notification_type, action_url)
       VALUES (?,?,?,?,'info','/portal')`,
      [
        MORTGAGE_TENANT_ID,
        clientId,
        "Application Received",
        `Your loan application ${applicationNumber} has been received. A loan officer will be in touch shortly.`,
      ],
    );

    await connection.commit();

    // Send confirmation email (non-fatal)
    try {
      const fmt = (v: number | null) =>
        v != null
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(v)
          : "N/A";

      const estimatedLoanAmt = propVal > dp ? propVal - dp : propVal;
      const addressStr = [
        property_address,
        property_city,
        property_state,
        property_zip,
      ]
        .filter(Boolean)
        .join(", ");

      await sendPublicApplicationWelcomeEmail(
        email,
        first_name,
        last_name,
        applicationNumber,
        resolvedLoanType,
        fmt(propVal),
        fmt(estimatedLoanAmt),
        addressStr,
      );
    } catch (emailError) {
      console.error("Welcome email failed (non-fatal):", emailError);
    }

    res.json({
      success: true,
      application_id: applicationId,
      application_number: applicationNumber,
      client_id: clientId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error submitting public application:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit application",
    });
  } finally {
    connection.release();
  }
};

// ─── Broker Public Share Link Handlers ───────────────────────────────────────

/**
 * GET /api/public/broker/:token
 * Returns public broker info for the share link landing page (no auth required)
 */
const handleGetBrokerPublicInfo: RequestHandler = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({ success: false, error: "Token is required" });
      return;
    }

    const [rows] = await pool.query<any[]>(
      `SELECT
        b.id, b.first_name, b.last_name, b.email, b.phone, b.role,
        b.license_number, b.specializations, b.public_token, b.created_by_broker_id,
        bp.bio, bp.avatar_url, bp.office_address, bp.office_city,
        bp.office_state, bp.office_zip, bp.years_experience, bp.total_loans_closed,
        bp.facebook_url, bp.instagram_url, bp.linkedin_url, bp.twitter_url,
        bp.youtube_url, bp.website_url
       FROM brokers b
       LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
       WHERE b.public_token = ? AND b.status = 'active'`,
      [token],
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: "Broker not found" });
      return;
    }

    const row = rows[0];

    // If this is a partner (role=broker) with a created_by_broker_id, fetch the Mortgage Banker's info
    let mortgageBanker: any = null;
    if (row.role === "broker" && row.created_by_broker_id) {
      const [mbRows] = await pool.query<any[]>(
        `SELECT
          b.id, b.first_name, b.last_name, b.email, b.phone, b.license_number,
          bp.bio, bp.avatar_url, bp.office_address, bp.office_city, bp.office_state,
          bp.office_zip, bp.years_experience, bp.total_loans_closed,
          bp.facebook_url, bp.instagram_url, bp.linkedin_url, bp.twitter_url,
          bp.youtube_url, bp.website_url
         FROM brokers b
         LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
         WHERE b.id = ? AND b.status = 'active'`,
        [row.created_by_broker_id],
      );
      if (mbRows.length > 0) {
        const mb = mbRows[0];
        mortgageBanker = {
          id: mb.id,
          first_name: mb.first_name,
          last_name: mb.last_name,
          email: mb.email,
          phone: mb.phone,
          license_number: mb.license_number,
          bio: mb.bio,
          avatar_url: mb.avatar_url,
          office_address: mb.office_address,
          office_city: mb.office_city,
          office_state: mb.office_state,
          office_zip: mb.office_zip,
          years_experience: mb.years_experience,
          total_loans_closed: mb.total_loans_closed || 0,
          facebook_url: mb.facebook_url,
          instagram_url: mb.instagram_url,
          linkedin_url: mb.linkedin_url,
          twitter_url: mb.twitter_url,
          youtube_url: mb.youtube_url,
          website_url: mb.website_url,
        };
      }
    }

    res.json({
      success: true,
      broker: {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        license_number: row.license_number,
        specializations: row.specializations
          ? typeof row.specializations === "string"
            ? JSON.parse(row.specializations)
            : row.specializations
          : null,
        public_token: row.public_token,
        bio: row.bio,
        avatar_url: row.avatar_url,
        office_address: row.office_address,
        office_city: row.office_city,
        office_state: row.office_state,
        office_zip: row.office_zip,
        years_experience: row.years_experience,
        total_loans_closed: row.total_loans_closed || 0,
        facebook_url: row.facebook_url,
        instagram_url: row.instagram_url,
        linkedin_url: row.linkedin_url,
        twitter_url: row.twitter_url,
        youtube_url: row.youtube_url,
        website_url: row.website_url,
        mortgage_banker: mortgageBanker,
      },
    });
  } catch (error) {
    console.error("Error fetching broker public info:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch broker info" });
  }
};

/**
 * GET /api/brokers/my-share-link
 * Returns the authenticated broker's share link token & URL (requires auth)
 */
const handleGetMyShareLink: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const [rows] = await pool.query<any[]>(
      "SELECT public_token FROM brokers WHERE id = ?",
      [brokerId],
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: "Broker not found" });
      return;
    }

    let token = rows[0].public_token;

    // Auto-generate token if missing
    if (!token) {
      await pool.query(
        "UPDATE brokers SET public_token = UUID() WHERE id = ?",
        [brokerId],
      );
      const [refreshed] = await pool.query<any[]>(
        "SELECT public_token FROM brokers WHERE id = ?",
        [brokerId],
      );
      token = refreshed[0].public_token;
    }

    const baseUrl = getBaseUrl();

    res.json({
      success: true,
      public_token: token,
      share_url: `${baseUrl}/apply/${token}`,
    });
  } catch (error) {
    console.error("Error fetching share link:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch share link" });
  }
};

/**
 * POST /api/brokers/my-share-link/regenerate
 * Regenerates the broker's share link with a new UUID (requires auth)
 */
const handleRegenerateShareLink: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const [result] = await pool.query<any>(
      "UPDATE brokers SET public_token = UUID() WHERE id = ?",
      [brokerId],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, error: "Broker not found" });
      return;
    }

    const [rows] = await pool.query<any[]>(
      "SELECT public_token FROM brokers WHERE id = ?",
      [brokerId],
    );

    const newToken = rows[0].public_token;
    const baseUrl = getBaseUrl();

    res.json({
      success: true,
      public_token: newToken,
      share_url: `${baseUrl}/apply/${newToken}`,
      message: "Share link regenerated successfully",
    });
  } catch (error) {
    console.error("Error regenerating share link:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to regenerate share link" });
  }
};

/**
 * POST /api/brokers/my-share-link/email
 * Sends the broker's share link to a client email (requires auth)
 */
const handleSendShareLinkEmail: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { client_email, client_name, message } = req.body;

    if (!client_email) {
      res
        .status(400)
        .json({ success: false, error: "client_email is required" });
      return;
    }

    const [rows] = await pool.query<any[]>(
      "SELECT first_name, last_name, email, public_token FROM brokers WHERE id = ?",
      [brokerId],
    );

    if (rows.length === 0 || !rows[0].public_token) {
      res.status(404).json({ success: false, error: "Broker not found" });
      return;
    }

    const broker = rows[0];
    const baseUrl = getBaseUrl();
    const shareUrl = `${baseUrl}/apply/${broker.public_token}`;
    const clientFirstName = client_name ? client_name.split(" ")[0] : "there";
    const brokerFullName = `${broker.first_name} ${broker.last_name}`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mortgage Application Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <!-- LOGO HEADER -->
        <tr>
          <td style="background-color:#ffffff;padding:24px 32px;border-radius:16px 16px 0 0;border-bottom:3px solid #0A2F52;text-align:center;">
            <img src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png" alt="The Mortgage Professionals" style="height:52px;width:auto;display:inline-block;" />
          </td>
        </tr>
        <!-- BODY -->
        <tr>
          <td style="background-color:#ffffff;padding:40px 32px 32px;">
            <h2 style="margin:0 0 8px 0;color:#0f172a;font-size:22px;font-weight:700;">Hello ${clientFirstName},</h2>
            <p style="margin:0 0 6px 0;color:#475569;font-size:15px;line-height:1.6;">
              <strong>${brokerFullName}</strong> has invited you to submit your mortgage application.
            </p>
            ${
              message
                ? `
            <!-- PERSONAL NOTE -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;margin-bottom:20px;">
              <tr>
                <td style="background-color:#f8fafc;border-left:4px solid #0A2F52;border-radius:0 8px 8px 0;padding:14px 18px;">
                  <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;font-style:italic;">"${message}"</p>
                </td>
              </tr>
            </table>`
                : `<br/>`
            }
            <p style="margin:0 0 28px 0;color:#475569;font-size:15px;line-height:1.6;">
              Click the button below to get started — the application only takes a few minutes to complete.
            </p>
            <!-- CTA BUTTON -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${shareUrl}" style="display:inline-block;background-color:#0A2F52;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">Start My Application →</a>
                </td>
              </tr>
            </table>
            <!-- LINK FALLBACK -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
              <tr>
                <td style="background-color:#f8fafc;border-radius:8px;padding:12px 16px;text-align:center;">
                  <p style="margin:0 0 4px 0;color:#64748b;font-size:12px;">Or copy this link into your browser:</p>
                  <p style="margin:0;font-size:12px;word-break:break-all;">
                    <a href="${shareUrl}" style="color:#0A2F52;text-decoration:none;">${shareUrl}</a>
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              If you have any questions, reach out to ${brokerFullName} directly.<br/>
              If you did not expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>
        <!-- FOOTER -->
        <tr>
          <td style="background-color:#0f172a;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
            <p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-weight:600;">The Mortgage Professionals</p>
            <p style="margin:0;color:#94a3b8;font-size:12px;">Your partner on the path to your new home</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const shareLinkSendResult = await sendEmailMessage(
      client_email,
      `${brokerFullName} has shared a mortgage application link with you`,
      emailHtml,
      true,
    );

    // Track this outbound email as a conversation if the recipient is an existing client
    if (shareLinkSendResult.success) {
      const [existingClientRows] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM clients WHERE email = ? AND tenant_id = ?",
        [client_email, MORTGAGE_TENANT_ID],
      );
      if (existingClientRows.length > 0) {
        const foundClientId = existingClientRows[0].id;
        const convId = `conv_client_${foundClientId}_general`;
        await pool.query(
          `INSERT INTO communications
             (tenant_id, from_broker_id, to_user_id,
              communication_type, direction, subject, body, status,
              conversation_id, delivery_status, sent_at)
           VALUES (?, ?, ?, 'email', 'outbound', ?, ?, 'sent', ?, 'sent', NOW())`,
          [
            MORTGAGE_TENANT_ID,
            brokerId,
            foundClientId,
            `${brokerFullName} has shared a mortgage application link with you`,
            emailHtml,
            convId,
          ],
        );
      }
    }

    res.json({
      success: true,
      message: `Share link email sent to ${client_email}`,
    });
  } catch (error) {
    console.error("Error sending share link email:", error);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
};

/**
 * Get all loan applications (pipeline)
 */
const handleGetLoans: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const brokerRole = (req as any).brokerRole;

    // Extract query parameters for filtering
    const {
      status,
      priority,
      loanType,
      dateRange,
      search,
      sortBy = "created_at",
      sortOrder = "DESC",
      page = "1",
      limit = "100",
    } = req.query;

    // Build base WHERE clause for authorization
    // Partners may appear as broker_user_id OR as partner_broker_id (share-link submissions)
    let whereClause =
      brokerRole === "admin"
        ? "WHERE la.tenant_id = ?"
        : "WHERE (la.broker_user_id = ? OR la.partner_broker_id = ?) AND la.tenant_id = ?";

    const baseParams =
      brokerRole === "admin"
        ? [MORTGAGE_TENANT_ID]
        : [brokerId, brokerId, MORTGAGE_TENANT_ID];

    const subqueryParams = [
      MORTGAGE_TENANT_ID, // For first subquery (next_task)
      MORTGAGE_TENANT_ID, // For second subquery (completed_tasks)
      MORTGAGE_TENANT_ID, // For third subquery (total_tasks)
    ];

    const queryParams = [...baseParams];

    // Add status filter
    if (status && status !== "all") {
      whereClause += ` AND la.status = ?`;
      queryParams.push(status as string);
    }

    // Add priority filter
    if (priority && priority !== "all") {
      whereClause += ` AND la.priority = ?`;
      queryParams.push(priority as string);
    }

    // Add loan type filter
    if (loanType && loanType !== "all") {
      whereClause += ` AND la.loan_type = ?`;
      queryParams.push(loanType as string);
    }

    // Add date range filter
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        default:
          startDate = new Date(0);
      }

      if (dateRange !== "all") {
        whereClause += ` AND la.created_at >= ?`;
        queryParams.push(
          startDate.toISOString().slice(0, 19).replace("T", " "),
        );
      }
    }

    // Add search filter
    if (search) {
      whereClause += ` AND (
        c.first_name LIKE ? OR 
        c.last_name LIKE ? OR 
        la.application_number LIKE ? OR
        CONCAT(c.first_name, ' ', c.last_name) LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Build ORDER BY clause
    const validSortColumns = [
      "created_at",
      "loan_amount",
      "status",
      "priority",
      "estimated_close_date",
    ];
    const sortColumn = validSortColumns.includes(sortBy as string)
      ? sortBy
      : "created_at";
    const order =
      (sortOrder as string).toUpperCase() === "ASC" ? "ASC" : "DESC";
    const orderClause = `ORDER BY la.${sortColumn} ${order}`;

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(Math.max(1, parseInt(limit as string)), 100);
    const offset = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const countQueryParams =
      brokerRole === "admin"
        ? [MORTGAGE_TENANT_ID]
        : [brokerId, brokerId, MORTGAGE_TENANT_ID];

    // Add filter parameters to count query
    if (status && status !== "all") {
      countQueryParams.push(status as string);
    }
    if (priority && priority !== "all") {
      countQueryParams.push(priority as string);
    }
    if (loanType && loanType !== "all") {
      countQueryParams.push(loanType as string);
    }
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        default:
          startDate = new Date(0);
      }

      if (dateRange !== "all") {
        countQueryParams.push(
          startDate.toISOString().slice(0, 19).replace("T", " "),
        );
      }
    }
    if (search) {
      const searchTerm = `%${search}%`;
      countQueryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await pool.query<any[]>(
      `SELECT COUNT(*) as total
       FROM loan_applications la
       INNER JOIN clients c ON la.client_user_id = c.id
       LEFT JOIN brokers b ON la.broker_user_id = b.id
       ${whereClause}`,
      countQueryParams,
    );

    const totalLoans = countResult[0].total;
    const totalPages = Math.ceil(totalLoans / limitNum);

    // Get loans with all enhancements
    const [loans] = await pool.query<any[]>(
      `SELECT 
        la.id,
        la.application_number,
        la.loan_type,
        la.loan_amount,
        la.status,
        la.priority,
        la.estimated_close_date,
        la.property_address,
        la.created_at,
        la.updated_at,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        c.phone as client_phone,
        b.first_name as broker_first_name,
        b.last_name as broker_last_name,
        b.email as broker_email,
        pb.first_name as partner_first_name,
        pb.last_name as partner_last_name,
        COALESCE(b.first_name, mb.first_name) as effective_broker_first_name,
        COALESCE(b.last_name, mb.last_name) as effective_broker_last_name,
        COALESCE(b.id, mb.id) as effective_broker_id,
        (SELECT title 
         FROM tasks 
         WHERE application_id = la.id 
           AND status IN ('pending', 'in_progress')
           AND tenant_id = ?
         ORDER BY order_index ASC, due_date ASC 
         LIMIT 1) as next_task,
        (SELECT COUNT(*) 
         FROM tasks 
         WHERE application_id = la.id 
           AND status = 'completed'
           AND tenant_id = ?) as completed_tasks,
        (SELECT COUNT(*) 
         FROM tasks 
         WHERE application_id = la.id
           AND tenant_id = ?) as total_tasks,
        (SELECT COUNT(*) 
         FROM documents d
         WHERE d.application_id = la.id) as document_count
      FROM loan_applications la
      INNER JOIN clients c ON la.client_user_id = c.id
      LEFT JOIN brokers b ON la.broker_user_id = b.id
      LEFT JOIN brokers pb ON la.partner_broker_id = pb.id
      LEFT JOIN brokers mb ON pb.created_by_broker_id = mb.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?`,
      [...subqueryParams, ...queryParams, limitNum, offset],
    );

    res.json({
      success: true,
      loans,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalLoans,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
      filters: {
        status,
        priority,
        loanType,
        dateRange,
        search,
      },
    });
  } catch (error) {
    console.error("Error fetching loans:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch loans",
    });
  }
};

/**
 * GET /api/loans/:loanId
 * Get detailed loan information including all tasks
 */
const handleGetLoanDetails: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const brokerRole = (req as any).brokerRole;
    const loanId = req.params.loanId;

    // Admins can view any loan, regular brokers only their own (via broker_user_id or partner_broker_id)
    const whereClause =
      brokerRole === "admin"
        ? "WHERE la.id = ? AND la.tenant_id = ?"
        : "WHERE la.id = ? AND (la.broker_user_id = ? OR la.partner_broker_id = ?) AND la.tenant_id = ?";
    const queryParams =
      brokerRole === "admin"
        ? [loanId, MORTGAGE_TENANT_ID]
        : [loanId, brokerId, brokerId, MORTGAGE_TENANT_ID];

    // Get loan details with client, broker, and partner broker info
    const [loans] = (await pool.query(
      `SELECT 
        la.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        c.phone as client_phone,
        b.first_name as broker_first_name,
        b.last_name as broker_last_name,
        pb.first_name as partner_first_name,
        pb.last_name as partner_last_name,
        COALESCE(b.first_name, mb.first_name) as effective_broker_first_name,
        COALESCE(b.last_name, mb.last_name) as effective_broker_last_name,
        COALESCE(b.id, mb.id) as effective_broker_id
      FROM loan_applications la
      INNER JOIN clients c ON la.client_user_id = c.id
      LEFT JOIN brokers b ON la.broker_user_id = b.id
      LEFT JOIN brokers pb ON la.partner_broker_id = pb.id
      LEFT JOIN brokers mb ON pb.created_by_broker_id = mb.id
      ${whereClause}`,
      queryParams,
    )) as [RowDataPacket[], any];

    if (loans.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    // Get all tasks for this loan
    const [tasks] = (await pool.query(
      `SELECT 
        id,
        title,
        description,
        task_type,
        status,
        priority,
        due_date,
        completed_at,
        created_at
      FROM tasks
      WHERE application_id = ?
      ORDER BY 
        CASE status
          WHEN 'overdue' THEN 1
          WHEN 'in_progress' THEN 2
          WHEN 'pending' THEN 3
          WHEN 'completed' THEN 4
          WHEN 'cancelled' THEN 5
        END,
        due_date ASC`,
      [loanId],
    )) as [RowDataPacket[], any];

    const loan = {
      ...loans[0],
      tasks,
    };

    res.json({
      success: true,
      loan,
    });
  } catch (error) {
    console.error("Error fetching loan details:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch loan details",
    });
  }
};

/**
 * PATCH /api/loans/:loanId/assign-broker
 * Assign (or unassign) a broker to a loan application.
 * Admin-only.
 */
const handleAssignBroker: RequestHandler = async (req, res) => {
  try {
    const brokerRole = (req as any).brokerRole;
    if (brokerRole !== "admin") {
      return res.status(403).json({ success: false, error: "Admins only" });
    }

    const loanId = parseInt(req.params.loanId as string);
    const { broker_id } = req.body; // null = unassign

    if (broker_id !== null && broker_id !== undefined) {
      // Verify the broker exists and belongs to this tenant
      const [rows] = (await pool.query(
        "SELECT id FROM brokers WHERE id = ? AND tenant_id = ?",
        [broker_id, MORTGAGE_TENANT_ID],
      )) as [RowDataPacket[], any];
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Broker not found" });
      }
    }

    await pool.query(
      "UPDATE loan_applications SET broker_user_id = ? WHERE id = ? AND tenant_id = ?",
      [broker_id ?? null, loanId, MORTGAGE_TENANT_ID],
    );

    res.json({ success: true, message: "Broker assignment updated" });
  } catch (error) {
    console.error("Error assigning broker:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign broker",
    });
  }
};

/**
 * PATCH /api/loans/:loanId/assign-partner
 * Assign (or unassign) a partner broker to a loan application.
 * Admin-only.
 */
const handleAssignPartner: RequestHandler = async (req, res) => {
  try {
    const brokerRole = (req as any).brokerRole;
    if (brokerRole !== "admin") {
      return res.status(403).json({ success: false, error: "Admins only" });
    }

    const loanId = parseInt(req.params.loanId as string);
    const { partner_id } = req.body; // null = unassign

    if (partner_id !== null && partner_id !== undefined) {
      // Verify the partner broker exists and belongs to this tenant
      const [rows] = (await pool.query(
        "SELECT id FROM brokers WHERE id = ? AND tenant_id = ?",
        [partner_id, MORTGAGE_TENANT_ID],
      )) as [RowDataPacket[], any];
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Partner broker not found" });
      }
    }

    await pool.query(
      "UPDATE loan_applications SET partner_broker_id = ? WHERE id = ? AND tenant_id = ?",
      [partner_id ?? null, loanId, MORTGAGE_TENANT_ID],
    );

    res.json({ success: true, message: "Partner assignment updated" });
  } catch (error) {
    console.error("Error assigning partner:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to assign partner",
    });
  }
};

/**
 * PATCH /api/loans/:loanId/status
 * Update loan pipeline status and automatically trigger communication templates
 * configured for that step via Pipeline Automation.
 */
const handleUpdateLoanStatus: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const brokerRole = (req as any).brokerRole;
    const loanId = parseInt(req.params.loanId as string);
    const { status: newStatus, notes } = req.body;

    const VALID_STATUSES = [
      "app_sent",
      "application_received",
      "prequalified",
      "preapproved",
      "under_contract_loan_setup",
      "submitted_to_underwriting",
      "approved_with_conditions",
      "clear_to_close",
      "docs_out",
      "loan_funded",
    ];

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // Only mortgage bankers (admin role) can manually move status
    if (brokerRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only mortgage bankers can update loan pipeline status.",
      });
    }

    const whereClause = "WHERE id = ? AND tenant_id = ?";
    const queryParams = [loanId, MORTGAGE_TENANT_ID];

    const [loanRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, status FROM loan_applications ${whereClause}`,
      queryParams,
    );

    if (loanRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Loan not found",
      });
    }

    const fromStatus = loanRows[0].status;

    if (fromStatus === newStatus) {
      return res.status(400).json({
        success: false,
        error: "Loan is already in that status",
      });
    }

    // Update the loan status
    await pool.query(
      "UPDATE loan_applications SET status = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?",
      [newStatus, loanId, MORTGAGE_TENANT_ID],
    );

    // Record status change history
    await pool.query(
      `INSERT INTO application_status_history
         (tenant_id, application_id, from_status, to_status, changed_by_broker_id, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        MORTGAGE_TENANT_ID,
        loanId,
        fromStatus,
        newStatus,
        brokerId,
        notes || null,
      ],
    );

    // Fire pipeline automation asynchronously (non-blocking)
    triggerPipelineAutomation(loanId, newStatus, brokerId).catch((err) =>
      console.error("Pipeline automation error:", err),
    );

    // Start reminder flows for this pipeline status change (non-blocking)
    triggerReminderFlows(loanId, newStatus, MORTGAGE_TENANT_ID).catch((err) =>
      console.error("Reminder flow trigger error:", err),
    );

    res.json({
      success: true,
      loan_id: loanId,
      from_status: fromStatus,
      to_status: newStatus,
      message: "Loan status updated.",
    });
  } catch (error) {
    console.error("Error updating loan status:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update loan status",
    });
  }
};

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics for the broker
 */
const handleGetDashboardStats: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;

    // Get total pipeline value and active applications
    const [pipelineStats] = (await pool.query(
      `SELECT 
        COALESCE(SUM(loan_amount), 0) as totalPipelineValue,
        COUNT(*) as activeApplications
      FROM loan_applications
      WHERE (broker_user_id = ? OR partner_broker_id = ?) AND tenant_id = ?
        AND status NOT IN ('denied', 'cancelled', 'closed')`,
      [brokerId, brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    // Get average closing days (from submitted to closed)
    const [closingStats] = (await pool.query(
      `SELECT 
        COALESCE(AVG(DATEDIFF(actual_close_date, submitted_at)), 0) as avgClosingDays
      FROM loan_applications
      WHERE (broker_user_id = ? OR partner_broker_id = ?) AND tenant_id = ?
        AND status = 'closed'
        AND actual_close_date IS NOT NULL
        AND submitted_at IS NOT NULL
        AND submitted_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`,
      [brokerId, brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    // Get closure rate (approved/closed vs denied/cancelled)
    const [closureRateStats] = (await pool.query(
      `SELECT 
        COUNT(CASE WHEN status IN ('approved', 'closed') THEN 1 END) as successful,
        COUNT(CASE WHEN status IN ('denied', 'cancelled') THEN 1 END) as unsuccessful
      FROM loan_applications
      WHERE (broker_user_id = ? OR partner_broker_id = ?) AND tenant_id = ?
        AND status IN ('approved', 'closed', 'denied', 'cancelled')`,
      [brokerId, brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    const successful = closureRateStats[0]?.successful || 0;
    const unsuccessful = closureRateStats[0]?.unsuccessful || 0;
    const total = successful + unsuccessful;
    const closureRate = total > 0 ? (successful / total) * 100 : 0;

    // Get weekly activity (last 7 days)
    const [weeklyActivity] = (await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as applications,
        COUNT(CASE WHEN status IN ('approved', 'closed') THEN 1 END) as closed
      FROM loan_applications
      WHERE (broker_user_id = ? OR partner_broker_id = ?) AND tenant_id = ?
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC`,
      [brokerId, brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    // Get status breakdown
    const [statusBreakdown] = (await pool.query(
      `SELECT 
        status,
        COUNT(*) as count
      FROM loan_applications
      WHERE (broker_user_id = ? OR partner_broker_id = ?) AND tenant_id = ?
        AND status NOT IN ('denied', 'cancelled')
      GROUP BY status
      ORDER BY count DESC`,
      [brokerId, brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    const stats = {
      totalPipelineValue: parseFloat(pipelineStats[0]?.totalPipelineValue || 0),
      activeApplications: parseInt(pipelineStats[0]?.activeApplications || 0),
      avgClosingDays: Math.round(
        parseFloat(closingStats[0]?.avgClosingDays || 0),
      ),
      closureRate: Math.round(closureRate * 10) / 10,
      weeklyActivity: weeklyActivity.map((row: any) => ({
        date: row.date,
        applications: parseInt(row.applications),
        closed: parseInt(row.closed),
      })),
      statusBreakdown: statusBreakdown.map((row: any) => ({
        status: row.status,
        count: parseInt(row.count),
      })),
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch dashboard stats",
    });
  }
};

/**
 * GET /api/dashboard/broker-metrics/annual
 * Returns all 12 monthly snapshots for the given year, quarterly roll-ups, and annual totals.
 */
const handleGetAnnualMetrics: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId as number;
    const brokerRole = (req as any).brokerRole as string;
    const isAdmin = brokerRole === "admin" || brokerRole === "superadmin";

    const now = new Date();
    const year = parseInt(
      (req.query.year as string) || String(now.getFullYear()),
      10,
    );

    const filterBrokerIdsRaw = req.query.filter_broker_ids as
      | string
      | undefined;
    const filterBrokerIds: number[] =
      isAdmin && filterBrokerIdsRaw
        ? filterBrokerIdsRaw
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n) && n > 0)
        : [];

    const scopedIds = isAdmin ? filterBrokerIds : [brokerId];
    const useGlobal = isAdmin && scopedIds.length === 0;

    // Fetch goals rows for the year (broker_id IS NULL)
    const [goalRows] = (await pool.query(
      `SELECT month, leads_goal, credit_pulls_goal, closings_goal,
              credit_pulls_actual, prev_year_leads, prev_year_closings
       FROM broker_monthly_metrics
       WHERE tenant_id = ? AND broker_id IS NULL AND year = ?`,
      [MORTGAGE_TENANT_ID, year],
    )) as [RowDataPacket[], any];
    const goalsMap = new Map<number, Record<string, any>>();
    for (const row of goalRows) goalsMap.set(row.month, row);

    // Fetch manual actuals (credit_pulls) from broker-scoped rows summed per month
    type ManualRow = { month: number; credit_pulls_actual: number };
    let manualActuals: ManualRow[] = [];
    if (!useGlobal) {
      const [manualRows] = (await pool.query(
        `SELECT month, SUM(COALESCE(credit_pulls_actual,0)) as credit_pulls_actual
         FROM broker_monthly_metrics
         WHERE tenant_id = ? AND broker_id IN (?) AND year = ?
         GROUP BY month`,
        [MORTGAGE_TENANT_ID, scopedIds, year],
      )) as [RowDataPacket[], any];
      manualActuals = (manualRows as any[]).map((r) => ({
        month: r.month,
        credit_pulls_actual: parseInt(r.credit_pulls_actual ?? 0),
      }));
    }
    const manualMap = new Map(manualActuals.map((r) => [r.month, r]));

    // Leads per month
    const [leadsRows] = (await pool.query(
      useGlobal
        ? `SELECT MONTH(created_at) as month, COUNT(*) as cnt
           FROM leads WHERE tenant_id = ? AND YEAR(created_at) = ?
           GROUP BY month`
        : `SELECT MONTH(created_at) as month, COUNT(*) as cnt
           FROM leads WHERE tenant_id = ? AND assigned_broker_id IN (?) AND YEAR(created_at) = ?
           GROUP BY month`,
      useGlobal
        ? [MORTGAGE_TENANT_ID, year]
        : [MORTGAGE_TENANT_ID, scopedIds, year],
    )) as [RowDataPacket[], any];
    const leadsMap = new Map(
      (leadsRows as any[]).map((r) => [r.month, parseInt(r.cnt)]),
    );

    // Pre-approvals per month
    const [preAppRows] = (await pool.query(
      useGlobal
        ? `SELECT MONTH(pal.created_at) as month, COUNT(DISTINCT pal.application_id) as cnt
           FROM pre_approval_letters pal
           WHERE pal.tenant_id = ? AND YEAR(pal.created_at) = ? AND pal.is_active = 1
           GROUP BY month`
        : `SELECT MONTH(pal.created_at) as month, COUNT(DISTINCT pal.application_id) as cnt
           FROM pre_approval_letters pal
           JOIN loan_applications la ON la.id = pal.application_id
           WHERE pal.tenant_id = ? AND (la.broker_user_id IN (?) OR la.partner_broker_id IN (?))
             AND YEAR(pal.created_at) = ? AND pal.is_active = 1
           GROUP BY month`,
      useGlobal
        ? [MORTGAGE_TENANT_ID, year]
        : [MORTGAGE_TENANT_ID, scopedIds, scopedIds, year],
    )) as [RowDataPacket[], any];
    const preAppMap = new Map(
      (preAppRows as any[]).map((r) => [r.month, parseInt(r.cnt)]),
    );

    // Closings per month
    const [closingsRows] = (await pool.query(
      useGlobal
        ? `SELECT MONTH(COALESCE(actual_close_date, updated_at)) as month, COUNT(*) as cnt
           FROM loan_applications
           WHERE tenant_id = ? AND status = 'closed' AND YEAR(COALESCE(actual_close_date, updated_at)) = ?
           GROUP BY month`
        : `SELECT MONTH(COALESCE(actual_close_date, updated_at)) as month, COUNT(*) as cnt
           FROM loan_applications
           WHERE tenant_id = ? AND (broker_user_id IN (?) OR partner_broker_id IN (?))
             AND status = 'closed' AND YEAR(COALESCE(actual_close_date, updated_at)) = ?
           GROUP BY month`,
      useGlobal
        ? [MORTGAGE_TENANT_ID, year]
        : [MORTGAGE_TENANT_ID, scopedIds, scopedIds, year],
    )) as [RowDataPacket[], any];
    const closingsMap = new Map(
      (closingsRows as any[]).map((r) => [r.month, parseInt(r.cnt)]),
    );

    // Lead sources for full year
    const [sourceRows] = (await pool.query(
      useGlobal
        ? `SELECT COALESCE(source_category,'other') as category, COUNT(*) as count
           FROM leads WHERE tenant_id = ? AND YEAR(created_at) = ?
           GROUP BY category ORDER BY count DESC`
        : `SELECT COALESCE(source_category,'other') as category, COUNT(*) as count
           FROM leads WHERE tenant_id = ? AND assigned_broker_id IN (?) AND YEAR(created_at) = ?
           GROUP BY category ORDER BY count DESC`,
      useGlobal
        ? [MORTGAGE_TENANT_ID, year]
        : [MORTGAGE_TENANT_ID, scopedIds, year],
    )) as [RowDataPacket[], any];

    // Build monthly snapshots
    const months: import("@shared/api").MonthlySnapshot[] = [];
    for (let m = 1; m <= 12; m++) {
      const g = goalsMap.get(m) || {};
      const leads = leadsMap.get(m) ?? 0;
      const creditPulls = useGlobal
        ? parseInt(g.credit_pulls_actual ?? 0)
        : (manualMap.get(m)?.credit_pulls_actual ?? 0);
      const preApprovals = preAppMap.get(m) ?? 0;
      const closings = closingsMap.get(m) ?? 0;
      months.push({
        month: m,
        leads,
        credit_pulls: creditPulls,
        pre_approvals: preApprovals,
        closings,
        lead_to_credit_pct:
          leads > 0 ? Math.round((creditPulls / leads) * 100) : 0,
        credit_to_preapp_pct:
          creditPulls > 0 ? Math.round((preApprovals / creditPulls) * 100) : 0,
        lead_to_closing_pct:
          leads > 0 ? Math.round((closings / leads) * 100) : 0,
        leads_goal: parseInt(g.leads_goal ?? 0),
        closings_goal: parseInt(g.closings_goal ?? 0),
      });
    }

    // Calculate quarterly summaries
    const quarters: import("@shared/api").QuarterSummary[] = [1, 2, 3, 4].map(
      (q) => {
        const qMonths = months.slice((q - 1) * 3, q * 3);
        const leads = qMonths.reduce((s, x) => s + x.leads, 0);
        const cp = qMonths.reduce((s, x) => s + x.credit_pulls, 0);
        const pa = qMonths.reduce((s, x) => s + x.pre_approvals, 0);
        const cl = qMonths.reduce((s, x) => s + x.closings, 0);
        const activeMonths = qMonths.filter((x) => x.leads > 0).length || 1;
        return {
          quarter: q,
          leads,
          credit_pulls: cp,
          pre_approvals: pa,
          closings: cl,
          avg_lead_to_credit_pct:
            leads > 0 ? Math.round((cp / leads) * 100) : 0,
          avg_credit_to_preapp_pct: cp > 0 ? Math.round((pa / cp) * 100) : 0,
          avg_lead_to_closing_pct:
            leads > 0 ? Math.round((cl / leads) * 100) : 0,
        };
      },
    );

    // Annual totals
    const annual_leads = months.reduce((s, x) => s + x.leads, 0);
    const annual_cp = months.reduce((s, x) => s + x.credit_pulls, 0);
    const annual_pa = months.reduce((s, x) => s + x.pre_approvals, 0);
    const annual_closings = months.reduce((s, x) => s + x.closings, 0);

    const annual: import("@shared/api").AnnualMetrics = {
      year,
      months,
      quarters,
      annual_leads,
      annual_credit_pulls: annual_cp,
      annual_pre_approvals: annual_pa,
      annual_closings,
      avg_lead_to_credit_pct:
        annual_leads > 0 ? Math.round((annual_cp / annual_leads) * 100) : 0,
      avg_credit_to_preapp_pct:
        annual_cp > 0 ? Math.round((annual_pa / annual_cp) * 100) : 0,
      avg_lead_to_closing_pct:
        annual_leads > 0
          ? Math.round((annual_closings / annual_leads) * 100)
          : 0,
      lead_sources_annual: (sourceRows as any[]).map((r) => ({
        category: r.category,
        count: parseInt(r.count),
      })),
    };

    res.json({ success: true, annual });
  } catch (error) {
    console.error("Error fetching annual metrics:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch annual metrics",
    });
  }
};

/**
 * GET /api/dashboard/broker-metrics
 * Get broker monthly performance metrics (computed actuals + stored goals).
 * Admins (mortgage bankers) see tenant-wide data.
 * Partners (role='broker') see only their own actuals.
 */
const handleGetBrokerMetrics: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId as number;
    const brokerRole = (req as any).brokerRole as string;
    const isAdmin = brokerRole === "admin" || brokerRole === "superadmin";

    const now = new Date();
    const year = parseInt(
      (req.query.year as string) || String(now.getFullYear()),
      10,
    );
    const month = parseInt(
      (req.query.month as string) || String(now.getMonth() + 1),
      10,
    );

    // Admins can filter by multiple broker IDs (comma-separated)
    const filterBrokerIdsRaw = req.query.filter_broker_ids as
      | string
      | undefined;
    const filterBrokerIds: number[] =
      isAdmin && filterBrokerIdsRaw
        ? filterBrokerIdsRaw
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n) && n > 0)
        : [];

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid year or month" });
    }

    // Partners always scoped to themselves; admins use their filter selection
    const scopedIds = isAdmin ? filterBrokerIds : [brokerId];
    const useGlobal = isAdmin && scopedIds.length === 0;

    // Goals always from global (broker_id IS NULL) row
    const [goalRows] = (await pool.query(
      `SELECT * FROM broker_monthly_metrics
       WHERE tenant_id = ? AND broker_id IS NULL AND year = ? AND month = ? LIMIT 1`,
      [MORTGAGE_TENANT_ID, year, month],
    )) as [RowDataPacket[], any];
    const goals: Record<string, any> = goalRows[0] || {};

    // Manual actuals: credit_pulls_actual, prev_year_* — sum across scoped brokers
    let creditPullsActual = 0;
    let prevYearLeads: number | null = null;
    let prevYearClosings: number | null = null;

    if (useGlobal) {
      creditPullsActual = parseInt(goals.credit_pulls_actual ?? 0);
      prevYearLeads =
        goals.prev_year_leads != null ? parseInt(goals.prev_year_leads) : null;
      prevYearClosings =
        goals.prev_year_closings != null
          ? parseInt(goals.prev_year_closings)
          : null;
    } else {
      const [manualRows] = (await pool.query(
        `SELECT credit_pulls_actual, prev_year_leads, prev_year_closings
         FROM broker_monthly_metrics
         WHERE tenant_id = ? AND broker_id IN (?) AND year = ? AND month = ?`,
        [MORTGAGE_TENANT_ID, scopedIds, year, month],
      )) as [RowDataPacket[], any];
      creditPullsActual = (manualRows as any[]).reduce(
        (s, r) => s + parseInt(r.credit_pulls_actual ?? 0),
        0,
      );
      // prev-year only meaningful for a single broker selection
      if (scopedIds.length === 1 && (manualRows as any[]).length > 0) {
        const r = (manualRows as any[])[0];
        prevYearLeads =
          r.prev_year_leads != null ? parseInt(r.prev_year_leads) : null;
        prevYearClosings =
          r.prev_year_closings != null ? parseInt(r.prev_year_closings) : null;
      }
    }

    // Compute leads actual
    const [leadsRows] = (await pool.query(
      useGlobal
        ? `SELECT COUNT(*) as cnt FROM leads
           WHERE tenant_id = ? AND YEAR(created_at) = ? AND MONTH(created_at) = ?`
        : `SELECT COUNT(*) as cnt FROM leads
           WHERE tenant_id = ? AND assigned_broker_id IN (?) AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
      useGlobal
        ? [MORTGAGE_TENANT_ID, year, month]
        : [MORTGAGE_TENANT_ID, scopedIds, year, month],
    )) as [RowDataPacket[], any];

    // Compute pre-approvals actual
    const [preAppRows] = (await pool.query(
      useGlobal
        ? `SELECT COUNT(DISTINCT pal.application_id) as cnt
           FROM pre_approval_letters pal
           WHERE pal.tenant_id = ? AND YEAR(pal.created_at) = ? AND MONTH(pal.created_at) = ? AND pal.is_active = 1`
        : `SELECT COUNT(DISTINCT pal.application_id) as cnt
           FROM pre_approval_letters pal
           JOIN loan_applications la ON la.id = pal.application_id
           WHERE pal.tenant_id = ? AND (la.broker_user_id IN (?) OR la.partner_broker_id IN (?))
             AND YEAR(pal.created_at) = ? AND MONTH(pal.created_at) = ? AND pal.is_active = 1`,
      useGlobal
        ? [MORTGAGE_TENANT_ID, year, month]
        : [MORTGAGE_TENANT_ID, scopedIds, scopedIds, year, month],
    )) as [RowDataPacket[], any];

    // Compute closings actual
    const [closingsRows] = (await pool.query(
      useGlobal
        ? `SELECT COUNT(*) as cnt FROM loan_applications
           WHERE tenant_id = ? AND status = 'closed'
             AND YEAR(COALESCE(actual_close_date, updated_at)) = ?
             AND MONTH(COALESCE(actual_close_date, updated_at)) = ?`
        : `SELECT COUNT(*) as cnt FROM loan_applications
           WHERE tenant_id = ? AND (broker_user_id IN (?) OR partner_broker_id IN (?))
             AND status = 'closed'
             AND YEAR(COALESCE(actual_close_date, updated_at)) = ?
             AND MONTH(COALESCE(actual_close_date, updated_at)) = ?`,
      useGlobal
        ? [MORTGAGE_TENANT_ID, year, month]
        : [MORTGAGE_TENANT_ID, scopedIds, scopedIds, year, month],
    )) as [RowDataPacket[], any];

    // Compute lead source breakdown
    const [sourceRows] = (await pool.query(
      useGlobal
        ? `SELECT COALESCE(source_category, 'other') as category, COUNT(*) as count
           FROM leads WHERE tenant_id = ? AND YEAR(created_at) = ? AND MONTH(created_at) = ?
           GROUP BY category ORDER BY count DESC`
        : `SELECT COALESCE(source_category, 'other') as category, COUNT(*) as count
           FROM leads WHERE tenant_id = ? AND assigned_broker_id IN (?)
             AND YEAR(created_at) = ? AND MONTH(created_at) = ?
           GROUP BY category ORDER BY count DESC`,
      useGlobal
        ? [MORTGAGE_TENANT_ID, year, month]
        : [MORTGAGE_TENANT_ID, scopedIds, year, month],
    )) as [RowDataPacket[], any];

    const metrics = {
      year,
      month,
      lead_to_credit_goal: parseFloat(goals.lead_to_credit_goal ?? 70),
      credit_to_preapp_goal: parseFloat(goals.credit_to_preapp_goal ?? 50),
      lead_to_closing_goal: parseFloat(goals.lead_to_closing_goal ?? 25),
      leads_goal: parseInt(goals.leads_goal ?? 40),
      credit_pulls_goal: parseInt(goals.credit_pulls_goal ?? 28),
      closings_goal: parseInt(goals.closings_goal ?? 10),
      leads_actual: parseInt(leadsRows[0]?.cnt ?? 0),
      credit_pulls_actual: creditPullsActual,
      pre_approvals_actual: parseInt(preAppRows[0]?.cnt ?? 0),
      closings_actual: parseInt(closingsRows[0]?.cnt ?? 0),
      prev_year_leads: prevYearLeads,
      prev_year_closings: prevYearClosings,
      lead_sources: (sourceRows as any[]).map((r) => ({
        category: r.category,
        count: parseInt(r.count),
      })),
    };

    res.json({ success: true, metrics });
  } catch (error) {
    console.error("Error fetching broker metrics:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch broker metrics",
    });
  }
};

/**
 * PUT /api/dashboard/broker-metrics
 * Admins (mortgage bankers): upsert tenant-wide goals + admin-level actuals (broker_id IS NULL row).
 * Partners (role='broker'): can only upsert their own manual actuals (credit_pulls_actual, prev_year_*)
 *   on their scoped row — goal fields are ignored and cannot be changed.
 */
const handleUpdateBrokerMetrics: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId as number;
    const brokerRole = (req as any).brokerRole as string;
    const isAdmin = brokerRole === "admin" || brokerRole === "superadmin";

    const {
      year,
      month,
      lead_to_credit_goal,
      credit_to_preapp_goal,
      lead_to_closing_goal,
      leads_goal,
      credit_pulls_goal,
      closings_goal,
      credit_pulls_actual,
      prev_year_leads,
      prev_year_closings,
    } = req.body;

    if (!year || !month || month < 1 || month > 12) {
      return res
        .status(400)
        .json({ success: false, error: "year and month are required" });
    }

    if (isAdmin) {
      // Upsert the tenant-wide goals row (broker_id IS NULL)
      await pool.query(
        `INSERT INTO broker_monthly_metrics
          (tenant_id, broker_id, year, month, lead_to_credit_goal, credit_to_preapp_goal, lead_to_closing_goal,
           leads_goal, credit_pulls_goal, closings_goal, credit_pulls_actual, prev_year_leads, prev_year_closings)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           lead_to_credit_goal   = COALESCE(VALUES(lead_to_credit_goal),   lead_to_credit_goal),
           credit_to_preapp_goal = COALESCE(VALUES(credit_to_preapp_goal), credit_to_preapp_goal),
           lead_to_closing_goal  = COALESCE(VALUES(lead_to_closing_goal),  lead_to_closing_goal),
           leads_goal            = COALESCE(VALUES(leads_goal),            leads_goal),
           credit_pulls_goal     = COALESCE(VALUES(credit_pulls_goal),     credit_pulls_goal),
           closings_goal         = COALESCE(VALUES(closings_goal),         closings_goal),
           credit_pulls_actual   = COALESCE(VALUES(credit_pulls_actual),   credit_pulls_actual),
           prev_year_leads       = VALUES(prev_year_leads),
           prev_year_closings    = VALUES(prev_year_closings),
           updated_at            = CURRENT_TIMESTAMP`,
        [
          MORTGAGE_TENANT_ID,
          year,
          month,
          lead_to_credit_goal ?? null,
          credit_to_preapp_goal ?? null,
          lead_to_closing_goal ?? null,
          leads_goal ?? null,
          credit_pulls_goal ?? null,
          closings_goal ?? null,
          credit_pulls_actual ?? null,
          prev_year_leads ?? null,
          prev_year_closings ?? null,
        ],
      );
    } else {
      // Partners: only allowed to update their own manual actuals — no goal fields
      await pool.query(
        `INSERT INTO broker_monthly_metrics
          (tenant_id, broker_id, year, month, credit_pulls_actual, prev_year_leads, prev_year_closings)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           credit_pulls_actual = COALESCE(VALUES(credit_pulls_actual), credit_pulls_actual),
           prev_year_leads     = VALUES(prev_year_leads),
           prev_year_closings  = VALUES(prev_year_closings),
           updated_at          = CURRENT_TIMESTAMP`,
        [
          MORTGAGE_TENANT_ID,
          brokerId,
          year,
          month,
          credit_pulls_actual ?? null,
          prev_year_leads ?? null,
          prev_year_closings ?? null,
        ],
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating broker metrics:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update broker metrics",
    });
  }
};

/**
 * Get all clients
 */
const handleGetClients: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const brokerRole = (req as any).brokerRole;
    const isAdmin = brokerRole === "admin" || brokerRole === "superadmin";

    const [clients] = await pool.query<any[]>(
      `SELECT 
        c.id,
        c.email,
        c.first_name,
        c.last_name,
        c.phone,
        c.status,
        c.created_at,
        COUNT(DISTINCT la.id) as total_applications,
        SUM(CASE WHEN la.status IN ('submitted', 'under_review', 'documents_pending', 'underwriting', 'conditional_approval') THEN 1 ELSE 0 END) as active_applications,
        COUNT(DISTINCT ct.id) as total_conversations
      FROM clients c
      LEFT JOIN loan_applications la ON c.id = la.client_user_id
      LEFT JOIN conversation_threads ct ON ct.client_id = c.id AND ct.tenant_id = c.tenant_id
      WHERE c.tenant_id = ?
        ${isAdmin ? "" : "AND (c.assigned_broker_id = ? OR la.broker_user_id = ? OR la.partner_broker_id = ?)"}
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
      isAdmin
        ? [MORTGAGE_TENANT_ID]
        : [MORTGAGE_TENANT_ID, brokerId, brokerId, brokerId],
    );

    res.json({
      success: true,
      clients,
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch clients",
    });
  }
};

/**
 * Delete client with comprehensive safety guards
 */
const handleDeleteClient: RequestHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const brokerId = (req as any).brokerId;
    const brokerRole = (req as any).brokerRole;
    const isAdmin = brokerRole === "admin" || brokerRole === "superadmin";

    // Check if client exists and belongs to this broker
    const [clientRows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, COUNT(DISTINCT la.id) as total_applications
       FROM clients c 
       LEFT JOIN loan_applications la ON c.id = la.client_user_id
       WHERE c.id = ? AND c.tenant_id = ?
         ${isAdmin ? "" : "AND (c.assigned_broker_id = ? OR la.broker_user_id = ? OR la.partner_broker_id = ?)"}
       GROUP BY c.id`,
      isAdmin
        ? [clientId, MORTGAGE_TENANT_ID]
        : [clientId, MORTGAGE_TENANT_ID, brokerId, brokerId, brokerId],
    );

    if (!Array.isArray(clientRows) || clientRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Client not found or not accessible",
      });
    }

    const client = clientRows[0];

    // Block deletion only if client has ACTIVE loan applications
    const ACTIVE_STATUSES = [
      "submitted",
      "under_review",
      "documents_pending",
      "underwriting",
      "conditional_approval",
    ];
    const placeholders = ACTIVE_STATUSES.map(() => "?").join(",");
    const [activeRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM loan_applications
       WHERE client_user_id = ? AND tenant_id = ? AND status IN (${placeholders})`,
      [clientId, MORTGAGE_TENANT_ID, ...ACTIVE_STATUSES],
    );
    const activeCount = activeRows[0]?.count || 0;
    if (activeCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete client: ${activeCount} active loan application(s) must be closed or reassigned first`,
        details: {
          client_name: `${client.first_name} ${client.last_name}`,
          active_applications: activeCount,
        },
      });
    }

    console.log(
      `🗑️ Deleting client ${clientId} "${client.first_name} ${client.last_name}"`,
    );

    // Cascade: remove tasks linked to this client's loan applications
    await pool.query(
      `DELETE t FROM tasks t
       INNER JOIN loan_applications la ON t.loan_id = la.id
       WHERE la.client_user_id = ? AND la.tenant_id = ?`,
      [clientId, MORTGAGE_TENANT_ID],
    );

    // Cascade: remove loan applications
    await pool.query(
      "DELETE FROM loan_applications WHERE client_user_id = ? AND tenant_id = ?",
      [clientId, MORTGAGE_TENANT_ID],
    );

    // Cascade: remove all conversation threads and communications for this client
    const [commResult] = await pool.query<ResultSetHeader>(
      "DELETE FROM communications WHERE (to_user_id = ? OR from_user_id = ?) AND tenant_id = ?",
      [clientId, clientId, MORTGAGE_TENANT_ID],
    );
    await pool.query(
      "DELETE FROM conversation_threads WHERE client_id = ? AND tenant_id = ?",
      [clientId, MORTGAGE_TENANT_ID],
    );
    console.log(
      `🗑️ Deleted ${commResult.affectedRows} communications and conversation threads for client ${clientId}`,
    );

    // Safe to delete
    await pool.query("DELETE FROM clients WHERE id = ? AND tenant_id = ?", [
      clientId,
      MORTGAGE_TENANT_ID,
    ]);

    console.log(`✅ Successfully deleted client ${clientId}`);

    res.json({
      success: true,
      message: `Client "${client.first_name} ${client.last_name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete client",
    });
  }
};

/**
 * Get all tasks
 */
/**
 * Get brokers (admin/superadmin only)
 */
const handleGetBrokers: RequestHandler = async (req, res) => {
  let connection;
  try {
    const brokerId = (req as any).brokerId;
    if (!brokerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    connection = await pool.getConnection();

    // Check if requesting broker is admin or superadmin
    const [brokerRows] = (await connection.execute(
      "SELECT role FROM brokers WHERE id = ? AND tenant_id = ?",
      [brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (brokerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    const brokerRole = brokerRows[0].role;
    if (brokerRole !== "admin" && brokerRole !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can view all brokers",
      });
    }

    // Fetch all active brokers
    const [brokers] = (await connection.execute(
      `SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        phone, 
        role, 
        status, 
        email_verified, 
        last_login
      FROM brokers 
      WHERE status = 'active' AND tenant_id = ?
      ORDER BY first_name, last_name`,
      [MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      brokers,
    });
  } catch (error) {
    console.error("Error fetching brokers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch brokers",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Create a new broker (admin only)
 */
const handleCreateBroker: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const {
      email,
      first_name,
      last_name,
      phone,
      role,
      license_number,
      specializations,
    } = req.body;

    // Check if requesting broker is admin
    const [adminCheck] = (await pool.query(
      "SELECT role FROM brokers WHERE id = ? AND tenant_id = ?",
      [brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only admins can create brokers",
      });
    }

    // Validate required fields
    if (!email || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: "Email, first name, and last name are required",
      });
    }

    // Check if email already exists
    const [existing] = (await pool.query(
      "SELECT id FROM brokers WHERE email = ? AND tenant_id = ?",
      [email, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "A broker with this email already exists",
      });
    }

    // Insert new broker — track which admin created this partner
    const createdByBrokerId = role === "broker" ? brokerId : null;
    const [result] = (await pool.query(
      `INSERT INTO brokers 
        (tenant_id, email, first_name, last_name, phone, role, license_number, specializations, status, email_verified, created_by_broker_id, public_token) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, UUID())`,
      [
        MORTGAGE_TENANT_ID,
        email,
        first_name,
        last_name,
        phone || null,
        role || "broker",
        license_number || null,
        specializations ? JSON.stringify(specializations) : null,
        createdByBrokerId,
      ],
    )) as [ResultSetHeader, any];

    const [newBroker] = (await pool.query(
      "SELECT id, email, first_name, last_name, phone, role, status, license_number, specializations, email_verified, created_at FROM brokers WHERE id = ? AND tenant_id = ?",
      [result.insertId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      broker: newBroker[0],
      message: "Broker created successfully",
    });
  } catch (error) {
    console.error("Error creating broker:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create broker",
    });
  }
};

/**
 * Update a broker (admin only)
 */
const handleUpdateBroker: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { brokerId: targetBrokerId } = req.params;
    const {
      first_name,
      last_name,
      phone,
      role,
      status,
      license_number,
      specializations,
    } = req.body;

    // Check if requesting broker is admin
    const [adminCheck] = (await pool.query(
      "SELECT role FROM brokers WHERE id = ? AND tenant_id = ?",
      [brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only admins can update brokers",
      });
    }

    // Check if target broker exists
    const [existing] = (await pool.query(
      "SELECT id FROM brokers WHERE id = ? AND tenant_id = ?",
      [targetBrokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Broker not found",
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (first_name !== undefined) {
      updates.push("first_name = ?");
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push("last_name = ?");
      values.push(last_name);
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      values.push(phone || null);
    }
    if (role !== undefined) {
      updates.push("role = ?");
      values.push(role);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
    }
    if (license_number !== undefined) {
      updates.push("license_number = ?");
      values.push(license_number || null);
    }
    if (specializations !== undefined) {
      updates.push("specializations = ?");
      values.push(specializations ? JSON.stringify(specializations) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    values.push(targetBrokerId);
    values.push(MORTGAGE_TENANT_ID);

    await pool.query(
      `UPDATE brokers SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const [updatedBroker] = (await pool.query(
      "SELECT id, email, first_name, last_name, phone, role, status, license_number, specializations, email_verified, last_login, created_at FROM brokers WHERE id = ? AND tenant_id = ?",
      [targetBrokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      broker: updatedBroker[0],
      message: "Broker updated successfully",
    });
  } catch (error) {
    console.error("Error updating broker:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update broker",
    });
  }
};

/**
 * Delete a broker (admin only)
 */
const handleDeleteBroker: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { brokerId: targetBrokerId } = req.params;

    // Check if requesting broker is admin
    const [adminCheck] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM brokers WHERE id = ? AND tenant_id = ?",
      [brokerId, MORTGAGE_TENANT_ID],
    );

    if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only admins can delete brokers",
      });
    }

    // Prevent self-deletion
    if (parseInt(targetBrokerId.toString()) === brokerId) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete your own account",
      });
    }

    // Check if target broker exists and get details
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id, first_name, last_name, email, status FROM brokers WHERE id = ? AND tenant_id = ?",
      [targetBrokerId, MORTGAGE_TENANT_ID],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Broker not found",
      });
    }

    const targetBroker = existing[0];

    // Check for dependencies (informational - we still allow soft delete)
    const safetyCheck = await checkDeletionSafety(
      "brokers",
      parseInt(targetBrokerId.toString()),
      [
        {
          table: "clients",
          foreignKey: "assigned_broker_id",
          tenantFilter: true,
          friendlyName: "assigned clients",
        },
        {
          table: "loan_applications",
          foreignKey: "broker_user_id",
          tenantFilter: true,
          friendlyName: "loan applications",
        },
        {
          table: "task_templates",
          foreignKey: "created_by_broker_id",
          tenantFilter: true,
          friendlyName: "created task templates",
        },
      ],
    );

    console.log(
      `🔒 Deactivating broker ${targetBrokerId} "${targetBroker.first_name} ${targetBroker.last_name}"`,
    );
    if (safetyCheck.violations.length > 0) {
      console.log(
        `⚠️ Broker has dependencies that will be preserved:`,
        safetyCheck.violations,
      );
    }

    // Soft delete - set status to inactive (preserve data integrity)
    await pool.query(
      "UPDATE brokers SET status = 'inactive', updated_at = NOW() WHERE id = ? AND tenant_id = ?",
      [targetBrokerId, MORTGAGE_TENANT_ID],
    );

    console.log(`✅ Successfully deactivated broker ${targetBrokerId}`);

    res.json({
      success: true,
      message: `Broker "${targetBroker.first_name} ${targetBroker.last_name}" has been deactivated successfully`,
      details: {
        action: "deactivated", // Not fully deleted, just deactivated
        broker_name: `${targetBroker.first_name} ${targetBroker.last_name}`,
        broker_id: targetBroker.id,
        status: "inactive",
        dependencies:
          safetyCheck.violations.length > 0
            ? safetyCheck.violations
            : undefined,
        note:
          safetyCheck.violations.length > 0
            ? "Broker was deactivated but associated data remains intact"
            : "Broker was deactivated with no dependencies",
      },
    });
  } catch (error) {
    console.error("Error deleting broker:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete broker",
    });
  }
};

/**
 * GET /api/brokers/:brokerId/share-link
 * Admin gets any broker's share link
 */
const handleGetBrokerShareLinkByAdmin: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).brokerId;
    const { brokerId: targetId } = req.params;

    const [adminCheck] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM brokers WHERE id = ? AND tenant_id = ?",
      [adminId, MORTGAGE_TENANT_ID],
    );
    if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
      return res.status(403).json({ success: false, error: "Admins only" });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT public_token FROM brokers WHERE id = ? AND tenant_id = ?",
      [targetId, MORTGAGE_TENANT_ID],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Broker not found" });
    }

    const token = rows[0].public_token;
    if (!token) {
      // Auto-create token
      await pool.query(
        "UPDATE brokers SET public_token = UUID() WHERE id = ?",
        [targetId],
      );
      const [refreshed] = await pool.query<RowDataPacket[]>(
        "SELECT public_token FROM brokers WHERE id = ?",
        [targetId],
      );
      const newToken = refreshed[0].public_token;
      const baseUrl = getBaseUrl();
      return res.json({
        success: true,
        public_token: newToken,
        share_url: `${baseUrl}/apply/${newToken}`,
      });
    }

    const baseUrl = getBaseUrl();
    res.json({
      success: true,
      public_token: token,
      share_url: `${baseUrl}/apply/${token}`,
    });
  } catch (error) {
    console.error("Error fetching broker share link:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch share link" });
  }
};

/**
 * GET /api/brokers/:brokerId/profile
 * Admin gets full profile (brokers + broker_profiles) for any broker
 */
const handleGetBrokerProfileByAdmin: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).brokerId;
    const { brokerId: targetId } = req.params;

    const [adminCheck] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM brokers WHERE id = ? AND tenant_id = ?",
      [adminId, MORTGAGE_TENANT_ID],
    );
    if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
      return res.status(403).json({ success: false, error: "Admins only" });
    }

    const [rows] = await pool.query<any[]>(
      `SELECT b.id, b.email, b.first_name, b.last_name, b.phone, b.role,
              b.license_number, b.specializations,
              bp.bio, bp.avatar_url, bp.office_address, bp.office_city,
              bp.office_state, bp.office_zip, bp.years_experience,
              COALESCE(bp.total_loans_closed, 0) AS total_loans_closed,
              bp.facebook_url, bp.instagram_url, bp.linkedin_url, bp.twitter_url,
              bp.youtube_url, bp.website_url
       FROM brokers b
       LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
       WHERE b.id = ? AND b.tenant_id = ?`,
      [targetId, MORTGAGE_TENANT_ID],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Broker not found" });
    }

    const profile = rows[0];
    if (typeof profile.specializations === "string") {
      try {
        profile.specializations = JSON.parse(profile.specializations);
      } catch {
        profile.specializations = [];
      }
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching broker profile (admin):", error);
    res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
};

/**
 * PUT /api/brokers/:brokerId/profile
 * Admin updates profile fields (bio, office, years_experience) for any broker
 */
const handleUpdateBrokerProfileByAdmin: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).brokerId;
    const { brokerId: targetId } = req.params;
    const {
      bio,
      office_address,
      office_city,
      office_state,
      office_zip,
      years_experience,
      facebook_url,
      instagram_url,
      linkedin_url,
      twitter_url,
      youtube_url,
      website_url,
    } = req.body;

    const [adminCheck] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM brokers WHERE id = ? AND tenant_id = ?",
      [adminId, MORTGAGE_TENANT_ID],
    );
    if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
      return res.status(403).json({ success: false, error: "Admins only" });
    }

    const profileCols: string[] = [];
    const profileVals: any[] = [];

    if (bio !== undefined) {
      profileCols.push("bio");
      profileVals.push(bio || null);
    }
    if (office_address !== undefined) {
      profileCols.push("office_address");
      profileVals.push(office_address || null);
    }
    if (office_city !== undefined) {
      profileCols.push("office_city");
      profileVals.push(office_city || null);
    }
    if (office_state !== undefined) {
      profileCols.push("office_state");
      profileVals.push(office_state || null);
    }
    if (office_zip !== undefined) {
      profileCols.push("office_zip");
      profileVals.push(office_zip || null);
    }
    if (years_experience !== undefined) {
      profileCols.push("years_experience");
      profileVals.push(
        years_experience !== null && years_experience !== ""
          ? Number(years_experience)
          : null,
      );
    }
    if (facebook_url !== undefined) {
      profileCols.push("facebook_url");
      profileVals.push(facebook_url || null);
    }
    if (instagram_url !== undefined) {
      profileCols.push("instagram_url");
      profileVals.push(instagram_url || null);
    }
    if (linkedin_url !== undefined) {
      profileCols.push("linkedin_url");
      profileVals.push(linkedin_url || null);
    }
    if (twitter_url !== undefined) {
      profileCols.push("twitter_url");
      profileVals.push(twitter_url || null);
    }
    if (youtube_url !== undefined) {
      profileCols.push("youtube_url");
      profileVals.push(youtube_url || null);
    }
    if (website_url !== undefined) {
      profileCols.push("website_url");
      profileVals.push(website_url || null);
    }

    if (profileCols.length > 0) {
      const [existing] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM broker_profiles WHERE broker_id = ?",
        [targetId],
      );
      if (existing.length > 0) {
        const setClauses = profileCols.map((c) => `${c} = ?`).join(", ");
        await pool.query(
          `UPDATE broker_profiles SET ${setClauses}, updated_at = NOW() WHERE broker_id = ?`,
          [...profileVals, targetId],
        );
      } else {
        const cols = ["broker_id", ...profileCols].join(", ");
        const placeholders = profileCols.map(() => "?").join(", ");
        await pool.query(
          `INSERT INTO broker_profiles (${cols}) VALUES (?, ${placeholders})`,
          [targetId, ...profileVals],
        );
      }
    }

    const [rows] = await pool.query<any[]>(
      `SELECT b.id, b.email, b.first_name, b.last_name, b.phone, b.role,
              b.license_number, b.specializations,
              bp.bio, bp.avatar_url, bp.office_address, bp.office_city,
              bp.office_state, bp.office_zip, bp.years_experience,
              COALESCE(bp.total_loans_closed, 0) AS total_loans_closed,
              bp.facebook_url, bp.instagram_url, bp.linkedin_url, bp.twitter_url,
              bp.youtube_url, bp.website_url
       FROM brokers b
       LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
       WHERE b.id = ? AND b.tenant_id = ?`,
      [targetId, MORTGAGE_TENANT_ID],
    );

    const profile = rows[0];
    if (typeof profile.specializations === "string") {
      try {
        profile.specializations = JSON.parse(profile.specializations);
      } catch {
        profile.specializations = [];
      }
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error updating broker profile (admin):", error);
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
};

/**
 * PUT /api/brokers/:brokerId/avatar
 * Admin uploads base64 avatar for any broker
 */
const handleUpdateBrokerAvatarByAdmin: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).brokerId;
    const { brokerId: targetId } = req.params;
    const { avatar_url } = req.body;

    const [adminCheck] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM brokers WHERE id = ? AND tenant_id = ?",
      [adminId, MORTGAGE_TENANT_ID],
    );
    if (adminCheck.length === 0 || adminCheck[0].role !== "admin") {
      return res.status(403).json({ success: false, error: "Admins only" });
    }

    if (!avatar_url) {
      return res
        .status(400)
        .json({ success: false, error: "avatar_url is required" });
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM broker_profiles WHERE broker_id = ?",
      [targetId],
    );
    if (existing.length > 0) {
      await pool.query(
        "UPDATE broker_profiles SET avatar_url = ?, updated_at = NOW() WHERE broker_id = ?",
        [avatar_url, targetId],
      );
    } else {
      await pool.query(
        "INSERT INTO broker_profiles (broker_id, avatar_url) VALUES (?, ?)",
        [targetId, avatar_url],
      );
    }

    res.json({ success: true, avatar_url });
  } catch (error) {
    console.error("Error updating broker avatar (admin):", error);
    res.status(500).json({ success: false, error: "Failed to update avatar" });
  }
};

/**
 * Get task templates (for Tasks management page)
 */
const handleGetTaskTemplates: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;

    const [templates] = await pool.query<any[]>(
      `SELECT 
        id,
        title,
        description,
        task_type,
        priority,
        default_due_days,
        order_index,
        is_active,
        requires_documents,
        document_instructions,
        has_custom_form,
        has_signing,
        created_at,
        updated_at
      FROM task_templates
      WHERE created_by_broker_id = ? AND tenant_id = ?
      ORDER BY order_index ASC, created_at DESC`,
      [brokerId, MORTGAGE_TENANT_ID],
    );

    res.json({
      success: true,
      tasks: templates, // Keep same property name for compatibility
    });
  } catch (error) {
    console.error("Error fetching task templates:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch task templates",
    });
  }
};

/**
 * Create a new task template
 */
const handleCreateTaskTemplate: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const {
      title,
      description,
      task_type,
      priority,
      default_due_days,
      is_active,
      requires_documents,
      document_instructions,
      has_custom_form,
      application_id,
    } = req.body;

    // Validate required fields
    if (!title || !task_type || !priority) {
      res.status(400).json({
        success: false,
        error: "Title, task type, and priority are required",
      });
      return;
    }

    // ── Task INSTANCE path (adding a task to an existing loan) ──
    if (application_id) {
      // Fetch loan + client info for notification/email
      const [loanRows] = (await pool.query<RowDataPacket[]>(
        `SELECT la.id, la.application_number, la.client_user_id,
                c.email, c.first_name, c.last_name
         FROM loan_applications la
         INNER JOIN clients c ON la.client_user_id = c.id
         WHERE la.id = ? AND la.tenant_id = ?`,
        [application_id, MORTGAGE_TENANT_ID],
      )) as [RowDataPacket[], any];

      if (loanRows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Loan not found" });
      }

      const loan = loanRows[0];
      const dueDate = default_due_days
        ? new Date(Date.now() + default_due_days * 86_400_000)
        : null;

      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO tasks (
          tenant_id, application_id, title, description, task_type, status, priority,
          assigned_to_user_id, created_by_broker_id, due_date
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        [
          MORTGAGE_TENANT_ID,
          application_id,
          title,
          description || null,
          task_type,
          priority,
          loan.client_user_id,
          brokerId,
          dueDate,
        ],
      );

      const taskId = result.insertId;

      // In-app notification
      await pool.query(
        `INSERT INTO notifications (tenant_id, user_id, title, message, notification_type, action_url)
         VALUES (?, ?, ?, ?, 'info', '/portal')`,
        [
          MORTGAGE_TENANT_ID,
          loan.client_user_id,
          "New Task Assigned",
          `A new task "${title}" has been added to your loan application #${loan.application_number}.`,
        ],
      );

      // Email notification (non-fatal)
      try {
        await sendNewTaskAssignedEmail(
          loan.email,
          loan.first_name,
          title,
          description || null,
          loan.application_number,
        );
      } catch (emailErr) {
        console.error("Task assigned email failed (non-fatal):", emailErr);
      }

      const [taskRows] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM tasks WHERE id = ?",
        [taskId],
      );

      return res.json({
        success: true,
        task: taskRows[0],
        message: "Task added to loan successfully",
      });
    }

    // ── Task TEMPLATE path (no application_id) ──
    const [maxOrder] = await pool.query<any[]>(
      "SELECT COALESCE(MAX(order_index), 0) as max_order FROM task_templates WHERE created_by_broker_id = ? AND tenant_id = ?",
      [brokerId, MORTGAGE_TENANT_ID],
    );
    const orderIndex = (maxOrder[0]?.max_order || 0) + 1;

    // Note: requires_documents and has_custom_form are separate flags
    // requires_documents = true will auto-create document upload fields
    // has_custom_form = true indicates user-defined custom fields exist

    // Insert task template
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO task_templates (
        tenant_id,
        title,
        description,
        task_type,
        priority,
        default_due_days,
        order_index,
        is_active,
        requires_documents,
        document_instructions,
        has_custom_form,
        created_by_broker_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        MORTGAGE_TENANT_ID,
        title,
        description || null,
        task_type,
        priority,
        default_due_days ?? null,
        orderIndex,
        is_active !== undefined ? is_active : true,
        requires_documents || false,
        document_instructions || null,
        has_custom_form || false,
        brokerId,
      ],
    );

    const templateId = result.insertId;

    // If requires_documents is true, automatically create basic document upload fields
    if (requires_documents) {
      console.log(
        `📄 Creating default document upload fields for template ${templateId}`,
      );

      // Create front and back document upload fields
      await pool.query(
        `INSERT INTO task_form_fields (
          task_template_id,
          field_name,
          field_label,
          field_type,
          is_required,
          order_index,
          help_text
        ) VALUES 
        (?, 'document_front', 'Document - Front', 'file_pdf', 1, 0, 'Upload the front side of the required document'),
        (?, 'document_back', 'Document - Back', 'file_pdf', 1, 1, 'Upload the back side of the required document')`,
        [templateId, templateId],
      );

      console.log(
        `✅ Created default document upload fields for template ${templateId}`,
      );
    }

    // Fetch the created template
    const [templates] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM task_templates WHERE id = ? AND tenant_id = ?",
      [templateId, MORTGAGE_TENANT_ID],
    );

    res.json({
      success: true,
      task: templates[0], // Keep same property name for compatibility
      message: "Task template created successfully",
    });
  } catch (error) {
    console.error("Error creating task template:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    });
  }
};

/**
 * Update task status (PATCH - partial update)
 */
const handleUpdateTask: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, comment } = req.body;
    const brokerId = (req as any).brokerId;
    const tenantId = (req as any).tenantId || MORTGAGE_TENANT_ID;

    // Validate required fields for status changes
    if (status && !comment) {
      return res.status(400).json({
        success: false,
        error: "Comment is required when manually changing task status",
      });
    }

    // Get current task info for audit
    const [currentTaskRows] = (await pool.query(
      "SELECT status, title, application_id FROM tasks WHERE id = ? AND tenant_id = ?",
      [taskId, tenantId],
    )) as [any[], any];

    if (!currentTaskRows || currentTaskRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    const currentTask = currentTaskRows[0];
    const completedAt = status === "completed" ? new Date() : null;
    const statusChangedAt =
      status && status !== currentTask.status ? new Date() : null;

    // Update task with new fields
    await pool.query(
      `UPDATE tasks SET 
        status = ?, 
        completed_at = ?, 
        status_change_reason = ?, 
        status_changed_by_broker_id = ?, 
        status_changed_at = ?, 
        updated_at = NOW() 
      WHERE id = ? AND tenant_id = ?`,
      [
        status || currentTask.status,
        completedAt,
        comment || null,
        statusChangedAt ? brokerId : null,
        statusChangedAt,
        taskId,
        tenantId,
      ],
    );

    // Log the status change for audit purposes
    if (status && status !== currentTask.status) {
      await pool.query(
        `INSERT INTO audit_logs (
          tenant_id, broker_id, actor_type, action, entity_type, entity_id, 
          changes, status, created_at
        ) VALUES (?, ?, 'broker', 'update_task_status', 'task', ?, ?, 'success', NOW())`,
        [
          tenantId,
          brokerId,
          taskId,
          JSON.stringify({
            from_status: currentTask.status,
            to_status: status,
            comment: comment,
            task_title: currentTask.title,
            application_id: currentTask.application_id,
            changed_at: statusChangedAt,
          }),
        ],
      );
    }

    res.json({
      success: true,
      message: "Task updated successfully",
      audit: {
        status_changed: status && status !== currentTask.status,
        comment_added: !!comment,
      },
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    });
  }
};

/**
 * Update full task template (PUT - full update)
 */
const handleUpdateTaskTemplateFull: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const brokerId = (req as any).brokerId;
    console.log(
      `🔄 API: Updating task template ${taskId} by broker ${brokerId}`,
    );
    console.log(`🔄 API: Request body:`, req.body);

    const {
      title,
      description,
      task_type,
      priority,
      default_due_days,
      is_active,
      requires_documents,
      document_instructions,
      has_custom_form,
      application_id, // Ignore for templates
    } = req.body;

    // Validate required fields
    if (!title || !task_type || !priority) {
      return res.status(400).json({
        success: false,
        error: "Title, task_type, and priority are required",
      });
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: "Priority must be low, medium, high, or urgent",
      });
    }

    // Note: requires_documents and has_custom_form are separate flags
    // requires_documents = true will auto-create document upload fields
    // has_custom_form = true indicates user-defined custom fields exist

    // Check if we need to create default document fields
    const wasRequiringDocuments = await pool.query<RowDataPacket[]>(
      "SELECT requires_documents FROM task_templates WHERE id = ? AND tenant_id = ?",
      [taskId, MORTGAGE_TENANT_ID],
    );

    const previouslyRequiredDocuments =
      wasRequiringDocuments[0]?.[0]?.requires_documents;
    const nowRequiresDocuments = requires_documents;

    // Update task template in database
    console.log(`🔄 API: Executing UPDATE query for task ${taskId}`);
    const updateResult = await pool.query(
      `UPDATE task_templates SET 
        title = ?, 
        description = ?, 
        task_type = ?, 
        priority = ?, 
        default_due_days = ?,
        is_active = ?,
        requires_documents = ?,
        document_instructions = ?,
        has_custom_form = ?,
        updated_at = NOW() 
      WHERE id = ? AND tenant_id = ?`,
      [
        title,
        description || null,
        task_type,
        priority,
        default_due_days ?? null,
        is_active !== undefined ? is_active : true,
        requires_documents || false,
        document_instructions || null,
        has_custom_form || false,
        taskId,
        MORTGAGE_TENANT_ID,
      ],
    );
    console.log(
      `✅ API: Task template updated, affected rows:`,
      (updateResult as any)[0].affectedRows,
    );

    // If requires_documents was just enabled and there are no existing form fields, create default ones
    if (nowRequiresDocuments && !previouslyRequiredDocuments) {
      const [existingFields] = await pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM task_form_fields WHERE task_template_id = ?",
        [taskId],
      );

      if (existingFields[0].count === 0) {
        console.log(
          `📄 Creating default document upload fields for template ${taskId}`,
        );

        // Create front and back document upload fields
        await pool.query(
          `INSERT INTO task_form_fields (
            task_template_id,
            field_name,
            field_label,
            field_type,
            is_required,
            order_index,
            help_text
          ) VALUES 
          (?, 'document_front', 'Document - Front', 'file_pdf', 1, 0, 'Upload the front side of the required document'),
          (?, 'document_back', 'Document - Back', 'file_pdf', 1, 1, 'Upload the back side of the required document')`,
          [taskId, taskId],
        );

        console.log(
          `✅ Created default document upload fields for template ${taskId}`,
        );
      }
    }

    // Fetch updated template
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM task_templates WHERE id = ? AND tenant_id = ?",
      [taskId, MORTGAGE_TENANT_ID],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`❌ API: Task template ${taskId} not found after update`);
      return res.status(404).json({
        success: false,
        error: "Task template not found after update",
      });
    }

    console.log(`✅ API: Sending updated task template:`, rows[0]);
    res.json({
      success: true,
      message: "Task template updated successfully",
      task: rows[0],
    });
  } catch (error) {
    console.error("Error updating task template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update task template",
    });
  }
};

/**
 * Delete task template
 */
const handleDeleteTaskTemplate: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check if template exists
    const [existingRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, title FROM task_templates WHERE id = ? AND tenant_id = ?",
      [taskId, MORTGAGE_TENANT_ID],
    );

    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task template not found",
      });
    }

    const template = existingRows[0];

    // GUARD 1: Check if template is being used by any active tasks
    const [activeTasksRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count, 
              COUNT(CASE WHEN status IN ('pending', 'in_progress', 'completed', 'pending_approval') THEN 1 END) as active_count
       FROM tasks 
       WHERE template_id = ? AND tenant_id = ?`,
      [taskId, MORTGAGE_TENANT_ID],
    );

    const totalTasks = activeTasksRows[0]?.count || 0;
    const activeTasks = activeTasksRows[0]?.active_count || 0;

    if (totalTasks > 0) {
      // Get sample applications using this template
      const [sampleRows] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT la.application_number, la.id as loan_id
         FROM tasks t
         INNER JOIN loan_applications la ON t.application_id = la.id
         WHERE t.template_id = ? AND t.tenant_id = ?
         LIMIT 3`,
        [taskId, MORTGAGE_TENANT_ID],
      );

      const sampleApps = sampleRows
        .map((row) => row.application_number)
        .join(", ");

      return res.status(400).json({
        success: false,
        error:
          "Cannot delete task template: It is currently being used by existing loan applications",
        details: {
          template_name: template.title,
          total_tasks: totalTasks,
          active_tasks: activeTasks,
          sample_applications: sampleApps,
          message:
            activeTasks > 0
              ? `This template has ${activeTasks} active tasks. Please complete or reassign these tasks before deletion.`
              : `This template has been used in ${totalTasks} completed tasks. To maintain data integrity, templates with task history cannot be deleted.`,
        },
      });
    }

    // GUARD 2: Double-check no orphaned relationships will be created
    const [formFieldsRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM task_form_fields WHERE task_template_id = ?",
      [taskId],
    );

    const formFieldsCount = formFieldsRows[0]?.count || 0;
    console.log(
      `🗑️ Deleting task template ${taskId} "${template.title}" with ${formFieldsCount} form fields`,
    );

    // Safe to delete - no active tasks using this template
    await pool.query(
      "DELETE FROM task_templates WHERE id = ? AND tenant_id = ?",
      [taskId, MORTGAGE_TENANT_ID],
    );

    console.log(
      `✅ Successfully deleted task template ${taskId} and its ${formFieldsCount} form fields`,
    );

    res.json({
      success: true,
      message: `Task template "${template.title}" deleted successfully`,
      details: {
        deleted_form_fields: formFieldsCount,
      },
    });
  } catch (error) {
    console.error("Error deleting task template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete task template",
    });
  }
};

/**
 * Delete individual task instance from a loan application
 */
const handleDeleteTaskInstance: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const brokerId = (req as any).brokerId;

    // Check if task exists and get its details
    const [taskRows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, la.application_number, la.client_user_id 
       FROM tasks t 
       INNER JOIN loan_applications la ON t.application_id = la.id
       WHERE t.id = ? AND t.tenant_id = ?`,
      [taskId, MORTGAGE_TENANT_ID],
    );

    if (!Array.isArray(taskRows) || taskRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    const task = taskRows[0];

    // GUARD 1: Check if task is in progress or completed - these might need special handling
    if (task.status === "in_progress") {
      return res.status(400).json({
        success: false,
        error: "Cannot delete task in progress",
        details: {
          task_title: task.title,
          current_status: task.status,
          message:
            "Tasks that are in progress should be completed or canceled before deletion.",
        },
      });
    }

    // GUARD 2: Check if task has completed work that should be preserved
    const [documentsRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM task_documents WHERE task_id = ?",
      [taskId],
    );

    const [responsesRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM task_form_responses WHERE task_id = ?",
      [taskId],
    );

    const documentsCount = documentsRows[0]?.count || 0;
    const responsesCount = responsesRows[0]?.count || 0;

    if (
      (task.status === "completed" || task.status === "approved") &&
      (documentsCount > 0 || responsesCount > 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete completed task with submitted work",
        details: {
          task_title: task.title,
          application_number: task.application_number,
          documents_count: documentsCount,
          responses_count: responsesCount,
          message:
            "This task has submitted documents or form responses. To maintain data integrity, completed tasks with work cannot be deleted.",
        },
      });
    }

    console.log(
      `🗑️ Deleting task instance ${taskId} "${task.title}" from application ${task.application_number}`,
    );
    console.log(
      `📊 Task has ${documentsCount} documents and ${responsesCount} form responses`,
    );

    // Begin transaction for safe deletion
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete related documents first (CASCADE should handle this, but being explicit)
      if (documentsCount > 0) {
        await connection.query("DELETE FROM task_documents WHERE task_id = ?", [
          taskId,
        ]);
        console.log(`🗑️ Deleted ${documentsCount} task documents`);
      }

      // Delete form responses
      if (responsesCount > 0) {
        await connection.query(
          "DELETE FROM task_form_responses WHERE task_id = ?",
          [taskId],
        );
        console.log(`🗑️ Deleted ${responsesCount} form responses`);
      }

      // Finally delete the task itself
      await connection.query(
        "DELETE FROM tasks WHERE id = ? AND tenant_id = ?",
        [taskId, MORTGAGE_TENANT_ID],
      );

      await connection.commit();
      console.log(
        `✅ Successfully deleted task ${taskId} and all related data`,
      );
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json({
      success: true,
      message: `Task "${task.title}" deleted successfully`,
      details: {
        application_number: task.application_number,
        deleted_documents: documentsCount,
        deleted_responses: responsesCount,
      },
    });
  } catch (error) {
    console.error("Error deleting task instance:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete task instance",
    });
  }
};

/**
 * Create task form fields for a template
 */
const handleCreateTaskFormFields: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    console.log("📥 API: handleCreateTaskFormFields called");
    const { taskId } = req.params;
    const { form_fields } = req.body;

    console.log("📥 API: Task ID:", taskId);
    console.log("📥 API: Form fields received:", form_fields);

    if (!form_fields || !Array.isArray(form_fields)) {
      console.error("❌ API: Invalid form_fields - not an array");
      return res.status(400).json({
        success: false,
        error: "form_fields array is required",
      });
    }

    console.log(`📥 API: Processing ${form_fields.length} form fields...`);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      console.log("🔄 API: Transaction started");

      // Update task template to indicate it has custom form ONLY if there are non-document fields
      const hasActualCustomFields = form_fields.some(
        (field) =>
          field.field_type !== "file_pdf" && field.field_type !== "file_image",
      );

      if (hasActualCustomFields) {
        await connection.query(
          `UPDATE task_templates SET has_custom_form = 1 WHERE id = ? AND created_by_broker_id = ? AND tenant_id = ?`,
          [taskId, brokerId, MORTGAGE_TENANT_ID],
        );
        console.log(
          "✅ API: Updated task_templates.has_custom_form = 1 for task",
          taskId,
          "because it has actual custom fields",
        );
      } else {
        console.log(
          "ℹ️ API: NOT updating has_custom_form because all fields are document uploads for task",
          taskId,
        );
      }

      // CRITICAL: DO NOT delete form fields that may have existing responses!
      // Instead, update existing fields and only insert truly new ones

      // Get existing form fields for this task template
      const [existingFields] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM task_form_fields WHERE task_template_id = ? ORDER BY order_index ASC`,
        [taskId],
      );

      console.log(
        `🔍 API: Found ${existingFields.length} existing form fields for task ${taskId}`,
      );

      // Process form fields: UPDATE existing, INSERT new ones
      const insertedFields = [];

      for (let i = 0; i < form_fields.length; i++) {
        const field = form_fields[i];
        const existingField = existingFields[i]; // Match by index/order

        if (existingField) {
          // UPDATE existing field to preserve foreign key relationships
          console.log(
            `🔄 API: Updating existing field ID ${existingField.id}: ${field.field_label} (${field.field_type})`,
          );

          await connection.query(
            `UPDATE task_form_fields SET 
              field_name = ?, field_label = ?, field_type = ?, field_options = ?, 
              is_required = ?, placeholder = ?, validation_rules = ?, order_index = ?, help_text = ?
             WHERE id = ?`,
            [
              field.field_name,
              field.field_label,
              field.field_type,
              field.field_options ? JSON.stringify(field.field_options) : null,
              field.is_required ?? true,
              field.placeholder || null,
              field.validation_rules
                ? JSON.stringify(field.validation_rules)
                : null,
              field.order_index || i,
              field.help_text || null,
              existingField.id,
            ],
          );

          console.log(`✅ API: Updated existing field ID ${existingField.id}`);
          insertedFields.push({ id: existingField.id, ...field });

          // Audit log for field update
          await createAuditLog({
            actorType: "broker",
            actorId: brokerId,
            action: "update_task_form_field",
            entityType: "task_form_field",
            entityId: existingField.id,
            changes: {
              field_name: {
                from: existingField.field_name,
                to: field.field_name,
              },
              field_label: {
                from: existingField.field_label,
                to: field.field_label,
              },
              field_type: {
                from: existingField.field_type,
                to: field.field_type,
              },
              task_template_id: taskId,
            },
          });
        } else {
          // INSERT new field
          console.log(
            `➕ API: Inserting new field: ${field.field_label} (${field.field_type})`,
          );

          const [result] = await connection.query(
            `INSERT INTO task_form_fields 
            (task_template_id, field_name, field_label, field_type, field_options, 
             is_required, placeholder, validation_rules, order_index, help_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              taskId,
              field.field_name,
              field.field_label,
              field.field_type,
              field.field_options ? JSON.stringify(field.field_options) : null,
              field.is_required ?? true,
              field.placeholder || null,
              field.validation_rules
                ? JSON.stringify(field.validation_rules)
                : null,
              field.order_index || i,
              field.help_text || null,
            ],
          );

          const insertedId = (result as any).insertId;
          console.log(`✅ API: New field inserted with ID: ${insertedId}`);
          insertedFields.push({ id: insertedId, ...field });

          // Audit log for new field creation
          await createAuditLog({
            actorType: "broker",
            actorId: brokerId,
            action: "create_task_form_field",
            entityType: "task_form_field",
            entityId: insertedId,
            changes: {
              field_name: field.field_name,
              field_label: field.field_label,
              field_type: field.field_type,
              task_template_id: taskId,
            },
          });
        }
      }

      await connection.commit();
      console.log("✅ API: Transaction committed successfully");
      console.log(
        `✅ API: ${insertedFields.length} form fields created successfully`,
      );

      res.json({
        success: true,
        fields: insertedFields,
        message: "Form fields created successfully",
      });
    } catch (error) {
      await connection.rollback();
      console.error("❌ API: Transaction rolled back due to error");
      throw error;
    } finally {
      connection.release();
      console.log("🔄 API: Database connection released");
    }
  } catch (error) {
    console.error("❌ API: Error creating task form fields:", error);
    console.error(
      "❌ API: Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    res.status(500).json({
      success: false,
      error: "Failed to create task form fields",
    });
  }
};

/**
 * Get task form fields for a template
 */
const handleGetTaskFormFields: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;

    const [fields] = await pool.query(
      `SELECT tff.* FROM task_form_fields tff
       INNER JOIN task_templates tt ON tff.task_template_id = tt.id
       WHERE tff.task_template_id = ? AND tt.tenant_id = ?
       ORDER BY tff.order_index ASC`,
      [taskId, MORTGAGE_TENANT_ID],
    );

    res.json({
      success: true,
      fields: fields,
    });
  } catch (error) {
    console.error("❌ Error getting task form fields:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get task form fields",
    });
  }
};

/**
 * Submit task form response
 */
const handleSubmitTaskForm: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { responses } = req.body;
    const userId = (req as any).userId;
    const brokerId = (req as any).brokerId;

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({
        success: false,
        error: "responses array is required",
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert or update form responses
      for (const response of responses) {
        await connection.query(
          `INSERT INTO task_form_responses 
          (task_id, field_id, field_value, submitted_by_user_id, submitted_by_broker_id)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          field_value = VALUES(field_value),
          updated_at = CURRENT_TIMESTAMP`,
          [
            taskId,
            response.field_id,
            response.response_value ?? response.field_value ?? null,
            userId || null,
            brokerId || null,
          ],
        );
      }

      // Mark task form as completed
      await connection.query(
        `UPDATE tasks 
         SET form_completed = 1, form_completed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [taskId],
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Form submitted successfully",
        task_id: parseInt(taskId as string),
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("❌ Error submitting task form:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit task form",
    });
  }
};

/**
 * Upload task document (integrates with external PHP API)
 */
const handleUploadTaskDocument: RequestHandler = async (req, res) => {
  try {
    const {
      task_id,
      field_id,
      document_type,
      filename,
      original_filename,
      file_path,
      file_size,
      notes,
    } = req.body;
    // Support both broker auth (userId/brokerId) and client auth (clientId)
    const userId = (req as any).userId || (req as any).clientId || null;
    const brokerId = (req as any).brokerId || null;

    if (!task_id || !document_type || !filename || !file_path) {
      return res.status(400).json({
        success: false,
        error: "task_id, document_type, filename, and file_path are required",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO task_documents 
      (task_id, field_id, document_type, filename, original_filename, file_path, file_size,
       uploaded_by_user_id, uploaded_by_broker_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task_id,
        field_id || null,
        document_type,
        filename,
        original_filename || filename,
        file_path,
        file_size || null,
        userId || null,
        brokerId || null,
        notes || null,
      ],
    );

    // Mark task documents as uploaded
    await pool.query(`UPDATE tasks SET documents_uploaded = 1 WHERE id = ?`, [
      task_id,
    ]);

    const [documents] = await pool.query(
      `SELECT td.* FROM task_documents td 
       INNER JOIN tasks t ON td.task_id = t.id 
       WHERE td.id = ? AND t.tenant_id = ?`,
      [(result as any).insertId, MORTGAGE_TENANT_ID],
    );

    res.json({
      success: true,
      document: (documents as any[])[0],
      message: "Document uploaded successfully",
    });
  } catch (error) {
    console.error("❌ Error uploading task document:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload task document",
    });
  }
};

/**
 * Get task form responses (broker view) — returns fields + submitted values
 */
const handleGetTaskFormResponses: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT tff.id AS field_id, tff.field_label, tff.field_type, tff.is_required,
              tfr.field_value, tfr.submitted_at
       FROM task_form_fields tff
       LEFT JOIN task_form_responses tfr ON tfr.field_id = tff.id AND tfr.task_id = ?
       WHERE tff.task_template_id = (
         SELECT template_id FROM tasks WHERE id = ? AND tenant_id = ?
       )
       AND tff.field_type NOT IN ('file_pdf', 'file_image')
       ORDER BY tff.order_index ASC`,
      [taskId, taskId, MORTGAGE_TENANT_ID],
    );

    res.json({ success: true, responses: rows });
  } catch (error) {
    console.error("❌ Error getting task form responses:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get form responses" });
  }
};

/**
 * Get task documents
 */
const handleGetTaskDocuments: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;

    const [documents] = await pool.query(
      `SELECT td.* FROM task_documents td 
       INNER JOIN tasks t ON td.task_id = t.id 
       WHERE td.task_id = ? AND t.tenant_id = ? 
       ORDER BY td.uploaded_at DESC`,
      [taskId, MORTGAGE_TENANT_ID],
    );

    res.json({
      success: true,
      documents: documents,
    });
  } catch (error) {
    console.error("❌ Error getting task documents:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get task documents",
    });
  }
};

/**
 * Delete task document
 */
const handleDeleteTaskDocument: RequestHandler = async (req, res) => {
  try {
    const { documentId } = req.params;

    await pool.query(`DELETE FROM task_documents WHERE id = ?`, [documentId]);

    res.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting task document:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete task document",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF PROXY — serves external PDFs through the backend to avoid CORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/proxy/pdf?url=<encoded>
 * Fetches a PDF from disruptinglabs.com server-side and streams it to the
 * browser, bypassing the cross-origin restriction on the external domain.
 */
const handleProxyPdf: RequestHandler = async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url query parameter is required" });
    return;
  }
  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }
  if (targetUrl.hostname !== "disruptinglabs.com") {
    res
      .status(403)
      .json({ error: "Proxy only allowed for disruptinglabs.com" });
    return;
  }
  console.log("📄 PDF proxy: fetching", url);
  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";
    console.log(
      "📄 PDF proxy: upstream status",
      response.status,
      "content-type",
      contentType,
    );
    if (!response.ok) {
      console.error("📄 PDF proxy: upstream error", response.status);
      res
        .status(response.status)
        .json({ error: `Upstream returned ${response.status}` });
      return;
    }
    if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      // Upstream returned HTML or something else — the file likely doesn't exist
      const text = await response.text();
      console.error(
        "📄 PDF proxy: upstream returned non-PDF content",
        contentType,
        text.slice(0, 300),
      );
      res
        .status(404)
        .json({ error: "File not found on remote server", contentType });
      return;
    }
    const buffer = await response.arrayBuffer();
    console.log("📄 PDF proxy: streaming", buffer.byteLength, "bytes");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("📄 PDF proxy: fetch threw", err);
    res.status(500).json({ error: "Failed to proxy PDF" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT SIGNING HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/tasks/:templateId/sign-document
 * Broker saves/updates a sign document (PDF + zones) for a task template.
 * The PDF must already be uploaded to the external server via uploadPDFs.php.
 */
const handleSaveSignDocument: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { templateId } = req.params;
    const { file_path, original_filename, file_size, signature_zones } =
      req.body;

    if (!file_path || !original_filename) {
      return res.status(400).json({
        success: false,
        error: "file_path and original_filename are required",
      });
    }

    if (!Array.isArray(signature_zones) || signature_zones.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one signature zone is required",
      });
    }

    // Verify template belongs to this broker's tenant
    const [templates] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM task_templates WHERE id = ? AND tenant_id = ?",
      [templateId, MORTGAGE_TENANT_ID],
    );
    if ((templates as any[]).length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Task template not found" });
    }

    const zonesJson = JSON.stringify(signature_zones);

    // Upsert: delete existing then insert fresh
    await pool.query(
      "DELETE FROM task_sign_documents WHERE task_template_id = ? AND tenant_id = ?",
      [templateId, MORTGAGE_TENANT_ID],
    );

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO task_sign_documents
        (tenant_id, task_template_id, file_path, original_filename, file_size, signature_zones, uploaded_by_broker_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        MORTGAGE_TENANT_ID,
        templateId,
        file_path,
        original_filename,
        file_size || null,
        zonesJson,
        brokerId,
      ],
    );

    // Ensure has_signing = 1 on the template
    await pool.query(
      "UPDATE task_templates SET has_signing = 1 WHERE id = ? AND tenant_id = ?",
      [templateId, MORTGAGE_TENANT_ID],
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM task_sign_documents WHERE id = ?",
      [result.insertId],
    );
    const doc = (rows as any[])[0];
    doc.signature_zones =
      typeof doc.signature_zones === "string"
        ? JSON.parse(doc.signature_zones)
        : doc.signature_zones || [];

    res.json({
      success: true,
      sign_document: doc,
      message: "Sign document saved successfully",
    });
  } catch (error) {
    console.error("❌ Error saving sign document:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to save sign document" });
  }
};

/**
 * GET /api/tasks/:templateId/sign-document
 * Broker fetches the sign document for a task template.
 */
const handleGetSignDocument: RequestHandler = async (req, res) => {
  try {
    const { templateId } = req.params;

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM task_sign_documents WHERE task_template_id = ? AND tenant_id = ? LIMIT 1",
      [templateId, MORTGAGE_TENANT_ID],
    );

    const doc = (rows as any[])[0] || null;
    if (doc) {
      doc.signature_zones =
        typeof doc.signature_zones === "string"
          ? JSON.parse(doc.signature_zones)
          : doc.signature_zones || [];
    }

    res.json({ success: true, sign_document: doc });
  } catch (error) {
    console.error("❌ Error fetching sign document:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch sign document" });
  }
};

/**
 * GET /api/client/tasks/:taskId/sign-document
 * Client fetches the sign document for a task instance.
 */
const handleGetClientSignDocument: RequestHandler = async (req, res) => {
  try {
    const clientId = (req as any).clientId;
    const { taskId } = req.params;

    // Verify task belongs to client
    const [taskRows] = await pool.query<RowDataPacket[]>(
      `SELECT t.template_id FROM tasks t
       INNER JOIN loan_applications la ON t.application_id = la.id
       WHERE t.id = ? AND la.client_user_id = ?`,
      [taskId, clientId],
    );

    if ((taskRows as any[]).length === 0) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    const templateId = (taskRows as any[])[0].template_id;
    if (!templateId) {
      return res.json({ success: true, sign_document: null });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM task_sign_documents WHERE task_template_id = ? AND tenant_id = ? LIMIT 1",
      [templateId, MORTGAGE_TENANT_ID],
    );

    const doc = (rows as any[])[0] || null;
    if (doc) {
      doc.signature_zones =
        typeof doc.signature_zones === "string"
          ? JSON.parse(doc.signature_zones)
          : doc.signature_zones || [];
    }

    res.json({ success: true, sign_document: doc });
  } catch (error) {
    console.error("❌ Error fetching client sign document:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch sign document" });
  }
};

/**
 * POST /api/client/tasks/:taskId/signatures
 * Client submits their signatures for a signing task.
 * Body: { signatures: [{ zone_id, signature_data }] }
 */
const handleSubmitTaskSignatures: RequestHandler = async (req, res) => {
  try {
    const clientId = (req as any).clientId;
    const { taskId } = req.params;
    const { signatures } = req.body;

    if (!Array.isArray(signatures) || signatures.length === 0) {
      return res.status(400).json({
        success: false,
        error: "signatures array is required",
      });
    }

    // Verify task belongs to client and get sign_document_id
    const [taskRows] = await pool.query<RowDataPacket[]>(
      `SELECT t.template_id FROM tasks t
       INNER JOIN loan_applications la ON t.application_id = la.id
       WHERE t.id = ? AND la.client_user_id = ?`,
      [taskId, clientId],
    );

    if ((taskRows as any[]).length === 0) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    const templateId = (taskRows as any[])[0].template_id;
    const [signDocRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM task_sign_documents WHERE task_template_id = ? AND tenant_id = ? LIMIT 1",
      [templateId, MORTGAGE_TENANT_ID],
    );

    if ((signDocRows as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: "Sign document not found for this task",
      });
    }

    const signDocumentId = (signDocRows as any[])[0].id;

    // Insert or update each signature (upsert by unique_task_zone)
    for (const sig of signatures) {
      const { zone_id, signature_data } = sig;
      if (!zone_id || !signature_data) continue;

      await pool.query(
        `INSERT INTO task_signatures
          (tenant_id, task_id, sign_document_id, zone_id, signature_data, signed_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           signature_data = VALUES(signature_data),
           signed_by_user_id = VALUES(signed_by_user_id),
           signed_at = NOW()`,
        [
          MORTGAGE_TENANT_ID,
          taskId,
          signDocumentId,
          zone_id,
          signature_data,
          clientId,
        ],
      );
    }

    // Mark task as pending_approval
    await pool.query(
      `UPDATE tasks SET status = 'pending_approval', completed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [taskId],
    );

    res.json({
      success: true,
      message: "Signatures submitted successfully",
      signatures_count: signatures.length,
    });
  } catch (error) {
    console.error("❌ Error submitting task signatures:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to submit signatures" });
  }
};

/**
 * GET /api/tasks/:taskId/signatures
 * Broker reviews signatures for a signing task instance.
 */
const handleGetTaskSignatures: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;

    const [signatures] = await pool.query<RowDataPacket[]>(
      `SELECT ts.*, c.first_name, c.last_name, c.email
       FROM task_signatures ts
       LEFT JOIN clients c ON ts.signed_by_user_id = c.id
       WHERE ts.task_id = ? AND ts.tenant_id = ?
       ORDER BY ts.signed_at ASC`,
      [taskId, MORTGAGE_TENANT_ID],
    );

    // Get sign document info
    const [taskRows] = await pool.query<RowDataPacket[]>(
      "SELECT template_id FROM tasks WHERE id = ? AND tenant_id = ?",
      [taskId, MORTGAGE_TENANT_ID],
    );

    let signDoc = null;
    if ((taskRows as any[])[0]?.template_id) {
      const [docRows] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM task_sign_documents WHERE task_template_id = ? AND tenant_id = ? LIMIT 1",
        [(taskRows as any[])[0].template_id, MORTGAGE_TENANT_ID],
      );
      if ((docRows as any[]).length > 0) {
        signDoc = (docRows as any[])[0];
        signDoc.signature_zones =
          typeof signDoc.signature_zones === "string"
            ? JSON.parse(signDoc.signature_zones)
            : signDoc.signature_zones || [];
      }
    }

    res.json({
      success: true,
      signatures: signatures,
      sign_document: signDoc,
    });
  } catch (error) {
    console.error("❌ Error fetching task signatures:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch signatures" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// END DOCUMENT SIGNING HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approve a completed task
 */
const handleApproveTask: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const brokerId = (req as any).brokerId;

    // Get task details
    const [taskRows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, a.client_user_id, c.email as client_email, c.first_name, c.last_name
       FROM tasks t
       INNER JOIN loan_applications a ON t.application_id = a.id
       INNER JOIN clients c ON a.client_user_id = c.id
       WHERE t.id = ?`,
      [taskId],
    );

    if (!Array.isArray(taskRows) || taskRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    const task = taskRows[0];

    // Verify task is pending approval (client submitted it)
    if (!["completed", "pending_approval"].includes(task.status)) {
      return res.status(400).json({
        success: false,
        error: "Task must be submitted by the client before approval",
      });
    }

    // Update task to approved
    await pool.query(
      `UPDATE tasks SET 
        status = 'approved',
        approval_status = 'approved',
        approved_by_broker_id = ?,
        approved_at = NOW(),
        updated_at = NOW()
       WHERE id = ?`,
      [brokerId, taskId],
    );

    // Create notification for client
    await pool.query(
      `INSERT INTO notifications (tenant_id, user_id, title, message, notification_type, action_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        MORTGAGE_TENANT_ID,
        task.client_user_id,
        "Task Approved",
        `Your task "${task.title}" has been approved. Great job!`,
        "success",
        "/portal",
      ],
    );

    // Create audit log
    await pool.query(
      `INSERT INTO audit_logs (tenant_id, broker_id, actor_type, action, entity_type, entity_id, changes, status)
       VALUES (?, ?, 'broker', 'approve_task', 'task', ?, ?, 'success')`,
      [
        MORTGAGE_TENANT_ID,
        brokerId,
        taskId,
        JSON.stringify({ status: "approved", approved_at: new Date() }),
      ],
    );

    // Send approval email to client
    // try {
    //   await sendTaskApprovedEmail(
    //     task.client_email,
    //     task.first_name,
    //     task.title,
    //   );
    // } catch (emailError) {
    //   console.error("Failed to send approval email:", emailError);
    //   // Don't fail the request if email fails
    // }

    res.json({
      success: true,
      message: "Task approved successfully",
    });
  } catch (error) {
    console.error("❌ Error approving task:", error);
    res.status(500).json({
      success: false,
      error: "Failed to approve task",
    });
  }
};

/**
 * Reopen a task for rework
 */
const handleReopenTask: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { reason } = req.body;
    const brokerId = (req as any).brokerId;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Reason for reopening is required",
      });
    }

    // Get task and client details
    const [taskRows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, a.client_user_id, c.email as client_email, c.first_name, c.last_name
       FROM tasks t
       INNER JOIN loan_applications a ON t.application_id = a.id
       INNER JOIN clients c ON a.client_user_id = c.id
       WHERE t.id = ?`,
      [taskId],
    );

    if (!Array.isArray(taskRows) || taskRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    const task = taskRows[0];

    // Update task to reopened
    await pool.query(
      `UPDATE tasks SET 
        status = 'reopened',
        approval_status = 'rejected',
        reopened_by_broker_id = ?,
        reopened_at = NOW(),
        reopen_reason = ?,
        completed_at = NULL,
        form_completed = 0,
        documents_uploaded = 0,
        updated_at = NOW()
       WHERE id = ?`,
      [brokerId, reason, taskId],
    );

    // Create notification for client
    await pool.query(
      `INSERT INTO notifications (tenant_id, user_id, title, message, notification_type, action_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        MORTGAGE_TENANT_ID,
        task.client_user_id,
        "Task Needs Revision",
        `Your task "${task.title}" needs to be revised. Please check the feedback.`,
        "warning",
        "/portal",
      ],
    );

    // Send email to client
    try {
      await sendTaskReopenedEmail(
        task.client_email,
        task.first_name,
        task.title,
        reason,
      );
    } catch (emailError) {
      console.error("Failed to send reopened email:", emailError);
      // Don't fail the request if email fails
    }

    // Create audit log
    await pool.query(
      `INSERT INTO audit_logs (tenant_id, broker_id, actor_type, action, entity_type, entity_id, changes, status)
       VALUES (?, ?, 'broker', 'reopen_task', 'task', ?, ?, 'success')`,
      [
        MORTGAGE_TENANT_ID,
        brokerId,
        taskId,
        JSON.stringify({
          status: "reopened",
          reopened_at: new Date(),
          reason: reason,
        }),
      ],
    );

    res.json({
      success: true,
      message: "Task reopened successfully",
    });
  } catch (error) {
    console.error("❌ Error reopening task:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reopen task",
    });
  }
};

/**
 * Generate MISMO 3.4 XML file for loan application
 */
const handleGenerateMISMO: RequestHandler = async (req, res) => {
  try {
    const { loanId } = req.params;
    const brokerId = (req as any).brokerId;

    // Get complete loan application data
    const [loanRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        a.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        c.phone as client_phone,
        c.date_of_birth,
        c.ssn_encrypted,
        c.address_street,
        c.address_city,
        c.address_state,
        c.address_zip,
        c.employment_status,
        c.income_type,
        c.annual_income,
        c.credit_score,
        b.first_name as broker_first_name,
        b.last_name as broker_last_name,
        b.email as broker_email,
        b.phone as broker_phone,
        b.license_number
       FROM loan_applications a
       INNER JOIN clients c ON a.client_user_id = c.id
       LEFT JOIN brokers b ON a.broker_user_id = b.id
       WHERE a.id = ?`,
      [loanId],
    );

    if (!Array.isArray(loanRows) || loanRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Loan application not found",
      });
    }

    const loan = loanRows[0];

    // Check if all tasks are approved
    const [taskStats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_tasks
       FROM tasks 
       WHERE application_id = ?`,
      [loanId],
    );

    const stats = taskStats[0];
    if (stats.total_tasks > 0 && stats.approved_tasks < stats.total_tasks) {
      return res.status(400).json({
        success: false,
        error: `Not all tasks are approved. ${stats.approved_tasks}/${stats.total_tasks} tasks approved.`,
      });
    }

    // Generate MISMO 3.4 XML
    const xml = generateMISMO34XML(loan);

    // Set headers for XML download
    const filename = `MISMO_${loan.application_number}_${new Date().toISOString().split("T")[0]}.xml`;
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Create audit log
    await pool.query(
      `INSERT INTO audit_logs (tenant_id, broker_id, actor_type, action, entity_type, entity_id, changes, status)
       VALUES (?, ?, 'broker', 'generate_mismo', 'loan_application', ?, ?, 'success')`,
      [
        MORTGAGE_TENANT_ID,
        brokerId,
        loanId,
        JSON.stringify({ filename, generated_at: new Date() }),
      ],
    );

    res.send(xml);
  } catch (error) {
    console.error("❌ Error generating MISMO file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate MISMO file",
    });
  }
};

/**
 * Helper function to generate MISMO 3.4 XML
 */
function generateMISMO34XML(loan: any): string {
  const now = new Date().toISOString();
  const loanAmount = parseFloat(loan.loan_amount || 0);
  const propertyValue = parseFloat(loan.property_value || 0);
  const downPayment = parseFloat(loan.down_payment || 0);
  const loanToValue =
    propertyValue > 0 ? ((loanAmount / propertyValue) * 100).toFixed(2) : "0";

  // Format loan type for MISMO
  const loanPurposeType =
    loan.loan_type === "purchase"
      ? "Purchase"
      : loan.loan_type === "refinance"
        ? "Refinance"
        : "Other";

  return `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.mismo.org/residential/2009/schemas">
  
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <CreatedDatetime>${now}</CreatedDatetime>
      <DataVersionIdentifier>MISMO 3.4</DataVersionIdentifier>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>

  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN>
              <LOAN_IDENTIFIERS>
                <LOAN_IDENTIFIER>
                  <LoanIdentifier>${loan.application_number}</LoanIdentifier>
                  <LoanIdentifierType>LenderLoan</LoanIdentifierType>
                </LOAN_IDENTIFIER>
              </LOAN_IDENTIFIERS>

              <LOAN_DETAIL>
                <LoanAmountRequested>${loanAmount.toFixed(2)}</LoanAmountRequested>
                <LoanPurposeType>${loanPurposeType}</LoanPurposeType>
                <LoanStatusType>${loan.status === "approved" ? "Approved" : "Submitted"}</LoanStatusType>
                <ApplicationReceivedDate>${loan.submitted_at || loan.created_at}</ApplicationReceivedDate>
              </LOAN_DETAIL>

              <TERMS_OF_LOAN>
                <LoanAmortizationType>AdjustableRate</LoanAmortizationType>
                <LoanAmortizationPeriodCount>${loan.loan_term_months || 360}</LoanAmortizationPeriodCount>
                <LoanAmortizationPeriodType>Month</LoanAmortizationPeriodType>
                ${loan.interest_rate ? `<NoteRatePercent>${loan.interest_rate}</NoteRatePercent>` : ""}
              </TERMS_OF_LOAN>

              <QUALIFICATION>
                <ApplicationTakenMethodType>Internet</ApplicationTakenMethodType>
              </QUALIFICATION>

              <LOAN_PROGRAMS>
                <LOAN_PROGRAM>
                  <LoanProgramName>Conventional</LoanProgramName>
                </LOAN_PROGRAM>
              </LOAN_PROGRAMS>

              <PARTIES>
                <PARTY>
                  <INDIVIDUAL>
                    <NAME>
                      <FirstName>${loan.client_first_name || ""}</FirstName>
                      <LastName>${loan.client_last_name || ""}</LastName>
                    </NAME>
                    ${loan.date_of_birth ? `<BirthDate>${loan.date_of_birth}</BirthDate>` : ""}
                    ${loan.ssn_encrypted ? `<TaxIdentificationIdentifier>${loan.ssn_encrypted}</TaxIdentificationIdentifier>` : ""}
                  </INDIVIDUAL>

                  <ROLES>
                    <ROLE>
                      <ROLE_DETAIL>
                        <PartyRoleType>Borrower</PartyRoleType>
                      </ROLE_DETAIL>

                      <BORROWER>
                        ${
                          loan.credit_score
                            ? `<CREDIT_SCORES>
                          <CREDIT_SCORE>
                            <CreditScoreValue>${loan.credit_score}</CreditScoreValue>
                            <CreditScoreModelType>FICO</CreditScoreModelType>
                          </CREDIT_SCORE>
                        </CREDIT_SCORES>`
                            : ""
                        }

                        <EMPLOYERS>
                          <EMPLOYER>
                            <EMPLOYMENT>
                              <EmploymentStatusType>${loan.employment_status || "Current"}</EmploymentStatusType>
                              <EmploymentMonthlyIncomeAmount>${loan.annual_income ? (loan.annual_income / 12).toFixed(2) : "0"}</EmploymentMonthlyIncomeAmount>
                            </EMPLOYMENT>
                          </EMPLOYER>
                        </EMPLOYERS>

                        <RESIDENCES>
                          <RESIDENCE>
                            <ADDRESS>
                              <AddressLineText>${loan.address_street || ""}</AddressLineText>
                              <CityName>${loan.address_city || ""}</CityName>
                              <StateCode>${loan.address_state || ""}</StateCode>
                              <PostalCode>${loan.address_zip || ""}</PostalCode>
                            </ADDRESS>
                          </RESIDENCE>
                        </RESIDENCES>
                      </BORROWER>
                    </ROLE>
                  </ROLES>

                  <TAXPAYER_IDENTIFIERS>
                    <TAXPAYER_IDENTIFIER>
                      ${loan.ssn_encrypted ? `<TaxpayerIdentifierValue>${loan.ssn_encrypted}</TaxpayerIdentifierValue>` : ""}
                      <TaxpayerIdentifierType>SocialSecurityNumber</TaxpayerIdentifierType>
                    </TAXPAYER_IDENTIFIER>
                  </TAXPAYER_IDENTIFIERS>

                  <CONTACTS>
                    <CONTACT>
                      <CONTACT_POINTS>
                        ${
                          loan.client_email
                            ? `<CONTACT_POINT>
                          <ContactPointValue>${loan.client_email}</ContactPointValue>
                          <ContactPointType>Email</ContactPointType>
                        </CONTACT_POINT>`
                            : ""
                        }
                        ${
                          loan.client_phone
                            ? `<CONTACT_POINT>
                          <ContactPointValue>${loan.client_phone}</ContactPointValue>
                          <ContactPointType>Phone</ContactPointType>
                        </CONTACT_POINT>`
                            : ""
                        }
                      </CONTACT_POINTS>
                    </CONTACT>
                  </CONTACTS>
                </PARTY>

                ${
                  loan.broker_first_name
                    ? `<PARTY>
                  <INDIVIDUAL>
                    <NAME>
                      <FirstName>${loan.broker_first_name}</FirstName>
                      <LastName>${loan.broker_last_name}</LastName>
                    </NAME>
                  </INDIVIDUAL>

                  <ROLES>
                    <ROLE>
                      <ROLE_DETAIL>
                        <PartyRoleType>LoanOriginationCompany</PartyRoleType>
                      </ROLE_DETAIL>
                      <LOAN_ORIGINATOR>
                        ${loan.license_number ? `<LicenseIdentifier>${loan.license_number}</LicenseIdentifier>` : ""}
                      </LOAN_ORIGINATOR>
                    </ROLE>
                  </ROLES>

                  <CONTACTS>
                    <CONTACT>
                      <CONTACT_POINTS>
                        ${
                          loan.broker_email
                            ? `<CONTACT_POINT>
                          <ContactPointValue>${loan.broker_email}</ContactPointValue>
                          <ContactPointType>Email</ContactPointType>
                        </CONTACT_POINT>`
                            : ""
                        }
                        ${
                          loan.broker_phone
                            ? `<CONTACT_POINT>
                          <ContactPointValue>${loan.broker_phone}</ContactPointValue>
                          <ContactPointType>Phone</ContactPointType>
                        </CONTACT_POINT>`
                            : ""
                        }
                      </CONTACT_POINTS>
                    </CONTACT>
                  </CONTACTS>
                </PARTY>`
                    : ""
                }
              </PARTIES>

              <COLLATERALS>
                <COLLATERAL>
                  <SUBJECT_PROPERTY>
                    <ADDRESS>
                      <AddressLineText>${loan.property_address || ""}</AddressLineText>
                      <CityName>${loan.property_city || ""}</CityName>
                      <StateCode>${loan.property_state || ""}</StateCode>
                      <PostalCode>${loan.property_zip || ""}</PostalCode>
                    </ADDRESS>

                    <PROPERTY_DETAIL>
                      <PropertyCurrentUsageType>PrimaryResidence</PropertyCurrentUsageType>
                      <PropertyEstimatedValueAmount>${propertyValue.toFixed(2)}</PropertyEstimatedValueAmount>
                    </PROPERTY_DETAIL>

                    <PROPERTY_VALUATIONS>
                      <PROPERTY_VALUATION>
                        <PropertyValuationAmount>${propertyValue.toFixed(2)}</PropertyValuationAmount>
                        <PropertyValuationMethodType>Purchase</PropertyValuationMethodType>
                      </PROPERTY_VALUATION>
                    </PROPERTY_VALUATIONS>
                  </SUBJECT_PROPERTY>
                </COLLATERAL>
              </COLLATERALS>

              <GOVERNMENT_LOAN>
                <GOVERNMENT_LOAN_DETAIL>
                  <LoanToValuePercent>${loanToValue}</LoanToValuePercent>
                </GOVERNMENT_LOAN_DETAIL>
              </GOVERNMENT_LOAN>

              <DOWN_PAYMENTS>
                <DOWN_PAYMENT>
                  <DownPaymentAmount>${downPayment.toFixed(2)}</DownPaymentAmount>
                  <DownPaymentType>Cash</DownPaymentType>
                </DOWN_PAYMENT>
              </DOWN_PAYMENTS>
            </LOAN>
          </LOANS>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;
}

/**
 * Get all task documents for broker (admin documents page)
 * Admin role: sees all documents from all brokers
 * Regular broker: sees only their own documents
 */
const handleGetAllTaskDocuments: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const brokerRole = (req as any).brokerRole;

    let query = `
      SELECT 
        td.*,
        t.title as task_title,
        t.task_type,
        t.status as task_status,
        a.application_number,
        a.broker_user_id as broker_id,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        b.first_name as broker_first_name,
        b.last_name as broker_last_name
      FROM task_documents td
      INNER JOIN tasks t ON td.task_id = t.id
      INNER JOIN loan_applications a ON t.application_id = a.id
      INNER JOIN clients c ON a.client_user_id = c.id
      LEFT JOIN brokers b ON a.broker_user_id = b.id`;

    let params: any[] = [];

    // If broker is not admin, filter by broker_user_id
    if (brokerRole !== "admin") {
      query += ` WHERE a.broker_user_id = ?`;
      params.push(brokerId);
    }

    query += ` ORDER BY td.uploaded_at DESC`;

    const [documents] = await pool.query(query, params);

    res.json({
      success: true,
      documents: documents,
    });
  } catch (error) {
    console.error("❌ Error getting all task documents:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get task documents",
    });
  }
};

/**
 * Get all email templates
 */
const handleGetEmailTemplates: RequestHandler = async (req, res) => {
  try {
    const [templates] = (await pool.query(
      `SELECT 
        id,
        name,
        subject,
        body AS body_html,
        NULL AS body_text,
        template_type,
        category,
        is_active,
        created_at,
        updated_at
      FROM templates
      WHERE tenant_id = ? AND template_type = 'email'
      ORDER BY created_at DESC`,
      [MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Error fetching email templates:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch email templates",
    });
  }
};

/**
 * Create email template
 */
const handleCreateEmailTemplate: RequestHandler = async (req, res) => {
  try {
    const {
      name,
      subject,
      body_html,
      body_text,
      template_type,
      is_active,
      category,
    } = req.body;
    const brokerId = (req as any).brokerId || 1;

    if (!name || !subject || !body_html) {
      return res.status(400).json({
        success: false,
        error: "Name, subject, and body_html are required",
      });
    }

    const [result] = (await pool.query(
      `INSERT INTO templates 
        (tenant_id, name, subject, body, template_type, category, is_active, created_by_broker_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        MORTGAGE_TENANT_ID,
        name,
        subject,
        body_html,
        template_type || "email",
        category || "system",
        is_active !== false ? 1 : 0,
        brokerId,
      ],
    )) as [ResultSetHeader, any];

    const [templates] = (await pool.query(
      `SELECT id, name, subject, body AS body_html, NULL AS body_text, template_type, category, is_active, created_at, updated_at
       FROM templates WHERE id = ? AND tenant_id = ?`,
      [result.insertId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      template: templates[0],
      message: "Email template created successfully",
    });
  } catch (error) {
    console.error("Error creating email template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create email template",
    });
  }
};

/**
 * Update email template
 */
const handleUpdateEmailTemplate: RequestHandler = async (req, res) => {
  try {
    const { templateId } = req.params;
    const {
      name,
      subject,
      body_html,
      body_text,
      template_type,
      is_active,
      category,
    } = req.body;

    // Check if template exists
    const [existingRows] = (await pool.query(
      "SELECT id FROM templates WHERE id = ? AND tenant_id = ? AND template_type = 'email'",
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Email template not found",
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (subject !== undefined) {
      updates.push("subject = ?");
      values.push(subject);
    }
    if (body_html !== undefined) {
      updates.push("body = ?");
      values.push(body_html);
    }
    if (category !== undefined) {
      updates.push("category = ?");
      values.push(category);
    }
    if (template_type !== undefined) {
      updates.push("template_type = ?");
      values.push(template_type);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    values.push(templateId);
    values.push(MORTGAGE_TENANT_ID);

    await pool.query(
      `UPDATE templates SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const [templates] = (await pool.query(
      `SELECT id, name, subject, body AS body_html, NULL AS body_text, template_type, category, is_active, created_at, updated_at
       FROM templates WHERE id = ? AND tenant_id = ?`,
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      template: templates[0],
      message: "Email template updated successfully",
    });
  } catch (error) {
    console.error("Error updating email template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update email template",
    });
  }
};

/**
 * Delete email template
 */
const handleDeleteEmailTemplate: RequestHandler = async (req, res) => {
  try {
    const { templateId } = req.params;

    // Check if template exists
    const [existingRows] = (await pool.query(
      "SELECT id, name FROM templates WHERE id = ? AND tenant_id = ? AND template_type = 'email'",
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Email template not found",
      });
    }

    await pool.query("DELETE FROM templates WHERE id = ? AND tenant_id = ?", [
      templateId,
      MORTGAGE_TENANT_ID,
    ]);

    res.json({
      success: true,
      message: `Email template "${existingRows[0].name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting email template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete email template",
    });
  }
};

/**
 * GET /api/client/applications
 * Get all loan applications for authenticated client
 */
const handleGetClientApplications: RequestHandler = async (req, res) => {
  try {
    const clientId = (req as any).clientId;

    const [applications] = await pool.query<any[]>(
      `SELECT 
        la.id,
        la.application_number,
        la.loan_type,
        la.loan_amount,
        la.property_address,
        la.property_city,
        la.property_state,
        la.status,
        la.current_step,
        la.total_steps,
        la.estimated_close_date,
        la.created_at,
        la.submitted_at,
        COALESCE(b.first_name, mb.first_name) as broker_first_name,
        COALESCE(b.last_name,  mb.last_name)  as broker_last_name,
        COALESCE(b.phone,      mb.phone)      as broker_phone,
        COALESCE(b.email,      mb.email)      as broker_email,
        COALESCE(bp.avatar_url, mbp.avatar_url) as broker_avatar_url,
        pb.first_name  as partner_first_name,
        pb.last_name   as partner_last_name,
        pb.phone       as partner_phone,
        pb.email       as partner_email,
        pbp.avatar_url as partner_avatar_url,
        (SELECT COUNT(*) FROM tasks WHERE application_id = la.id AND status = 'completed' AND tenant_id = ?) as completed_tasks,
        (SELECT COUNT(*) FROM tasks WHERE application_id = la.id AND tenant_id = ?) as total_tasks
      FROM loan_applications la
      LEFT JOIN brokers b   ON la.broker_user_id = b.id
      LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
      LEFT JOIN brokers pb  ON la.partner_broker_id = pb.id
      LEFT JOIN broker_profiles pbp ON pbp.broker_id = pb.id
      LEFT JOIN brokers mb  ON pb.created_by_broker_id = mb.id
      LEFT JOIN broker_profiles mbp ON mbp.broker_id = mb.id
      WHERE la.client_user_id = ? AND la.tenant_id = ?
      ORDER BY la.created_at DESC`,
      [MORTGAGE_TENANT_ID, MORTGAGE_TENANT_ID, clientId, MORTGAGE_TENANT_ID],
    );

    res.json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error("Error fetching client applications:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch applications",
    });
  }
};

/**
 * GET /api/client/tasks
 * Get all tasks for authenticated client across all their applications
 */
const handleGetClientTasks: RequestHandler = async (req, res) => {
  try {
    const clientId = (req as any).clientId;

    const [tasks] = await pool.query<any[]>(
      `SELECT 
        t.id,
        t.application_id,
        t.title,
        t.description,
        t.task_type,
        t.status,
        t.priority,
        t.due_date,
        t.completed_at,
        t.created_at,
        la.application_number,
        la.loan_type,
        la.property_address
      FROM tasks t
      INNER JOIN loan_applications la ON t.application_id = la.id
      WHERE t.assigned_to_user_id = ?
      ORDER BY 
        CASE t.status
          WHEN 'pending' THEN 1
          WHEN 'in_progress' THEN 2
          WHEN 'completed' THEN 3
          WHEN 'cancelled' THEN 4
        END,
        t.due_date ASC`,
      [clientId],
    );

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Error fetching client tasks:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tasks",
    });
  }
};

/**
 * PATCH /api/client/tasks/:taskId
 * Update task status (client can mark as in_progress or completed)
 */
const handleUpdateClientTask: RequestHandler = async (req, res) => {
  try {
    const clientId = (req as any).clientId;
    const { taskId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["in_progress", "completed", "pending_approval"].includes(status)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid status. Clients can only set 'in_progress' or 'completed'",
      });
    }

    // Verify task belongs to client
    const [tasks] = await pool.query<any[]>(
      "SELECT t.* FROM tasks t INNER JOIN loan_applications la ON t.application_id = la.id WHERE t.id = ? AND la.client_user_id = ? AND t.tenant_id = ?",
      [taskId, clientId, MORTGAGE_TENANT_ID],
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    // Map 'completed' from client to 'pending_approval' so broker must approve
    const actualStatus = status === "completed" ? "pending_approval" : status;
    const completedAt = actualStatus === "pending_approval" ? new Date() : null;

    await pool.query(
      "UPDATE tasks SET status = ?, completed_at = ?, updated_at = NOW() WHERE id = ?",
      [actualStatus, completedAt, taskId],
    );

    res.json({
      success: true,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Error updating client task:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    });
  }
};

/**
 * GET /api/client/tasks/:taskId/details
 * Get task details including form fields and required documents
 */
const handleGetTaskDetails: RequestHandler = async (req, res) => {
  try {
    const clientId = (req as any).clientId;
    const { taskId } = req.params;

    // Verify task belongs to client
    const [tasks] = await pool.query<any[]>(
      `SELECT t.*, 
              la.application_number,
              la.loan_type,
              la.property_address,
              la.property_city,
              la.property_state,
              la.property_zip,
              la.loan_amount
       FROM tasks t 
       INNER JOIN loan_applications la ON t.application_id = la.id 
       WHERE t.id = ? AND la.client_user_id = ?`,
      [taskId, clientId],
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    const task = tasks[0];

    console.log(`📋 Fetching task details for task ${taskId}:`, {
      taskId: task.id,
      title: task.title,
      template_id: task.template_id,
      task_type: task.task_type,
    });

    // Get form fields if template has custom form
    // NOTE: task_form_fields has no tenant_id column — filter only by task_template_id
    let formFields = [];
    if (task.template_id) {
      const [fields] = await pool.query<any[]>(
        `SELECT * FROM task_form_fields 
         WHERE task_template_id = ?
         ORDER BY order_index`,
        [task.template_id],
      );
      formFields = fields;
      console.log(
        `✅ Found ${fields.length} form fields for template ${task.template_id}`,
      );
    } else {
      console.warn(
        `⚠️ Task ${taskId} has no template_id, cannot fetch form fields`,
      );
    }

    // Get required documents (file upload fields) and check if uploaded
    const [documents] = await pool.query<any[]>(
      `SELECT 
        tff.id,
        tff.field_name as document_type,
        tff.field_label as description,
        tff.field_type,
        tff.is_required,
        CASE WHEN td.id IS NOT NULL THEN 1 ELSE 0 END as is_uploaded
       FROM task_form_fields tff
       LEFT JOIN task_documents td ON td.task_id = ? AND td.field_id = tff.id
       WHERE tff.task_template_id = ?
       AND (tff.field_type = 'file_pdf' OR tff.field_type = 'file_image')
       ORDER BY tff.order_index`,
      [taskId, task.template_id || 0],
    );

    console.log(
      `📄 Found ${documents.length} document fields for template ${task.template_id || 0}`,
    );

    // Fetch sign document if task is document_signing type
    let signDocument = null;
    if (task.task_type === "document_signing" && task.template_id) {
      const [signDocRows] = await pool.query<any[]>(
        "SELECT * FROM task_sign_documents WHERE task_template_id = ? AND tenant_id = ? LIMIT 1",
        [task.template_id, MORTGAGE_TENANT_ID],
      );
      if (signDocRows.length > 0) {
        signDocument = signDocRows[0];
        signDocument.signature_zones =
          typeof signDocument.signature_zones === "string"
            ? JSON.parse(signDocument.signature_zones)
            : signDocument.signature_zones || [];
      }
    }

    // Fetch existing signatures for this task instance
    let existingSignatures: any[] = [];
    if (task.task_type === "document_signing") {
      const [sigRows] = await pool.query<any[]>(
        "SELECT zone_id, signature_data, signed_at FROM task_signatures WHERE task_id = ?",
        [taskId],
      );
      existingSignatures = sigRows;
    }

    res.json({
      success: true,
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date,
      task_type: task.task_type,
      application_id: task.application_id,
      application_number: task.application_number,
      loan_type: task.loan_type,
      property_address: task.property_address,
      property_city: task.property_city,
      property_state: task.property_state,
      property_zip: task.property_zip,
      loan_amount: task.loan_amount,
      formFields,
      requiredDocuments: documents,
      sign_document: signDocument,
      existing_signatures: existingSignatures,
    });
  } catch (error) {
    console.error("Error fetching task details:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch task details",
    });
  }
};

/**
 * GET /api/client/profile
 * Get authenticated client's profile information
 */
const handleGetClientProfile: RequestHandler = async (req, res) => {
  try {
    const clientId = (req as any).clientId;

    const [clients] = await pool.query<any[]>(
      `SELECT 
        id,
        email,
        first_name,
        last_name,
        phone,
        alternate_phone,
        date_of_birth,
        address_street,
        address_city,
        address_state,
        address_zip,
        employment_status,
        income_type,
        annual_income,
        status,
        email_verified,
        phone_verified,
        created_at
      FROM clients
      WHERE id = ?`,
      [clientId],
    );

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Client not found",
      });
    }

    res.json({
      success: true,
      profile: clients[0],
    });
  } catch (error) {
    console.error("Error fetching client profile:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch profile",
    });
  }
};

/**
 * PUT /api/client/profile
 * Update authenticated client's profile information
 */
const handleUpdateClientProfile: RequestHandler = async (req, res) => {
  try {
    const clientId = (req as any).clientId;
    const {
      first_name,
      last_name,
      phone,
      alternate_phone,
      address_street,
      address_city,
      address_state,
      address_zip,
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (first_name !== undefined) {
      updates.push("first_name = ?");
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push("last_name = ?");
      values.push(last_name);
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      values.push(phone);
    }
    if (alternate_phone !== undefined) {
      updates.push("alternate_phone = ?");
      values.push(alternate_phone || null);
    }
    if (address_street !== undefined) {
      updates.push("address_street = ?");
      values.push(address_street);
    }
    if (address_city !== undefined) {
      updates.push("address_city = ?");
      values.push(address_city);
    }
    if (address_state !== undefined) {
      updates.push("address_state = ?");
      values.push(address_state);
    }
    if (address_zip !== undefined) {
      updates.push("address_zip = ?");
      values.push(address_zip);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    values.push(clientId);
    values.push(MORTGAGE_TENANT_ID);

    await pool.query(
      `UPDATE clients SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
      values,
    );

    // Fetch updated profile
    const [clients] = await pool.query<any[]>(
      `SELECT 
        id, email, first_name, last_name, phone, alternate_phone,
        address_street, address_city, address_state, address_zip,
        employment_status, income_type, annual_income,
        status, email_verified, phone_verified, created_at
      FROM clients WHERE id = ? AND tenant_id = ?`,
      [clientId, MORTGAGE_TENANT_ID],
    );

    res.json({
      success: true,
      profile: clients[0],
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating client profile:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update profile",
    });
  }
};

/**
 * GET /api/client/documents
 * Get all uploaded documents for the authenticated client, grouped by task.
 */
const handleGetClientDocuments: RequestHandler = async (req, res) => {
  try {
    const clientId = (req as any).clientId;

    const [documents] = await pool.query<any[]>(
      `SELECT
        td.id,
        td.task_id,
        td.field_id,
        td.document_type,
        td.filename,
        td.original_filename,
        td.file_path,
        td.file_size,
        td.uploaded_at,
        td.notes,
        t.title        AS task_title,
        t.task_type,
        t.status       AS task_status,
        la.application_number,
        la.loan_type,
        la.property_address,
        la.property_city,
        la.property_state
      FROM task_documents td
      INNER JOIN tasks t     ON td.task_id = t.id
      INNER JOIN loan_applications la ON t.application_id = la.id
      WHERE la.client_user_id = ? AND la.tenant_id = ?
      ORDER BY td.uploaded_at DESC`,
      [clientId, MORTGAGE_TENANT_ID],
    );

    res.json({ success: true, documents });
  } catch (error) {
    console.error("❌ Error getting client documents:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get client documents" });
  }
};

/**
 * Get all SMS templates
 */
const handleGetSmsTemplates: RequestHandler = async (req, res) => {
  try {
    const [templates] = (await pool.query(
      `SELECT id, name, body, template_type, category, is_active, created_at, updated_at
       FROM templates
       WHERE tenant_id = ? AND template_type = 'sms'
       ORDER BY created_at DESC`,
      [MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      templates: templates.map((template: any) => ({
        ...template,
        is_active: Boolean(template.is_active),
      })),
    });
  } catch (error) {
    console.error("Error fetching SMS templates:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch SMS templates",
    });
  }
};

/**
 * Create SMS template
 */
const handleCreateSmsTemplate: RequestHandler = async (req, res) => {
  try {
    const { name, body, template_type, is_active, category } = req.body;
    const brokerId = (req as any).brokerId || 1;

    // Validate required fields
    if (!name || !body) {
      return res.status(400).json({
        success: false,
        error: "Name and body are required",
      });
    }

    // Check character limit
    if (body.length > 1600) {
      return res.status(400).json({
        success: false,
        error: "SMS body cannot exceed 1600 characters",
      });
    }

    const [result] = (await pool.query(
      `INSERT INTO templates 
        (tenant_id, name, body, template_type, category, is_active, created_by_broker_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        MORTGAGE_TENANT_ID,
        name,
        body,
        template_type || "sms",
        category || "system",
        is_active !== false ? 1 : 0,
        brokerId,
      ],
    )) as [ResultSetHeader, any];

    const [templates] = (await pool.query(
      `SELECT id, name, body, template_type, category, is_active, created_at, updated_at
       FROM templates WHERE id = ? AND tenant_id = ?`,
      [result.insertId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      template: {
        ...templates[0],
        is_active: Boolean(templates[0].is_active),
      },
      message: "SMS template created successfully",
    });
  } catch (error) {
    console.error("Error creating SMS template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create SMS template",
    });
  }
};

/**
 * Update SMS template
 */
const handleUpdateSmsTemplate: RequestHandler = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, body, template_type, is_active } = req.body;

    // Check if template exists
    const [existingRows] = (await pool.query(
      "SELECT id FROM templates WHERE id = ? AND tenant_id = ? AND template_type = 'sms'",
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "SMS template not found",
      });
    }

    // Check character limit if body is being updated
    if (body && body.length > 1600) {
      return res.status(400).json({
        success: false,
        error: "SMS body cannot exceed 1600 characters",
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (body !== undefined) {
      updates.push("body = ?");
      values.push(body);
    }
    if (template_type !== undefined) {
      updates.push("template_type = ?");
      values.push(template_type);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    values.push(templateId);
    values.push(MORTGAGE_TENANT_ID);

    await pool.query(
      `UPDATE templates SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const [templates] = (await pool.query(
      `SELECT id, name, body, template_type, category, is_active, created_at, updated_at
       FROM templates WHERE id = ? AND tenant_id = ?`,
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      template: {
        ...templates[0],
        is_active: Boolean(templates[0].is_active),
      },
      message: "SMS template updated successfully",
    });
  } catch (error) {
    console.error("Error updating SMS template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update SMS template",
    });
  }
};

/**
 * Delete SMS template
 */
const handleDeleteSmsTemplate: RequestHandler = async (req, res) => {
  try {
    const { templateId } = req.params;

    // Check if template exists
    const [existingRows] = (await pool.query(
      "SELECT id, name FROM templates WHERE id = ? AND tenant_id = ? AND template_type = 'sms'",
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "SMS template not found",
      });
    }

    await pool.query("DELETE FROM templates WHERE id = ? AND tenant_id = ?", [
      templateId,
      MORTGAGE_TENANT_ID,
    ]);

    res.json({
      success: true,
      message: `SMS template "${existingRows[0].name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting SMS template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete SMS template",
    });
  }
};

// =====================================================
// WHATSAPP TEMPLATE HANDLERS
// =====================================================

/**
 * GET /api/whatsapp-templates
 */
const handleGetWhatsappTemplates: RequestHandler = async (req, res) => {
  try {
    const [templates] = (await pool.query(
      `SELECT id, name, body, template_type, category, is_active, created_at, updated_at
       FROM templates
       WHERE tenant_id = ? AND template_type = 'whatsapp'
       ORDER BY created_at DESC`,
      [MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      templates: templates.map((t: any) => ({
        ...t,
        is_active: Boolean(t.is_active),
      })),
    });
  } catch (error) {
    console.error("Error fetching WhatsApp templates:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch WhatsApp templates",
    });
  }
};

/**
 * POST /api/whatsapp-templates
 */
const handleCreateWhatsappTemplate: RequestHandler = async (req, res) => {
  try {
    const { name, body, template_type, is_active, category } = req.body;
    const brokerId = (req as any).brokerId || 1;

    if (!name || !body) {
      return res
        .status(400)
        .json({ success: false, error: "Name and body are required" });
    }

    const [result] = (await pool.query(
      `INSERT INTO templates (tenant_id, name, body, template_type, category, is_active, created_by_broker_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        MORTGAGE_TENANT_ID,
        name,
        body,
        template_type || "whatsapp",
        category || "system",
        is_active !== false ? 1 : 0,
        brokerId,
      ],
    )) as [ResultSetHeader, any];

    const [rows] = (await pool.query(
      `SELECT id, name, body, template_type, category, is_active, created_at, updated_at
       FROM templates WHERE id = ? AND tenant_id = ?`,
      [result.insertId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      template: { ...rows[0], is_active: Boolean(rows[0].is_active) },
      message: "WhatsApp template created successfully",
    });
  } catch (error) {
    console.error("Error creating WhatsApp template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create WhatsApp template",
    });
  }
};

/**
 * PUT /api/whatsapp-templates/:templateId
 */
const handleUpdateWhatsappTemplate: RequestHandler = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, body, template_type, is_active } = req.body;

    const [existingRows] = (await pool.query(
      "SELECT id FROM templates WHERE id = ? AND tenant_id = ? AND template_type = 'whatsapp'",
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (existingRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "WhatsApp template not found" });
    }

    const updates: string[] = [];
    const values: any[] = [];
    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (body !== undefined) {
      updates.push("body = ?");
      values.push(body);
    }
    if (template_type !== undefined) {
      updates.push("template_type = ?");
      values.push(template_type);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No fields to update" });
    }

    values.push(templateId, MORTGAGE_TENANT_ID);
    await pool.query(
      `UPDATE templates SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const [rows] = (await pool.query(
      `SELECT id, name, body, template_type, category, is_active, created_at, updated_at
       FROM templates WHERE id = ? AND tenant_id = ?`,
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      template: { ...rows[0], is_active: Boolean(rows[0].is_active) },
      message: "WhatsApp template updated successfully",
    });
  } catch (error) {
    console.error("Error updating WhatsApp template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update WhatsApp template",
    });
  }
};

/**
 * DELETE /api/whatsapp-templates/:templateId
 */
const handleDeleteWhatsappTemplate: RequestHandler = async (req, res) => {
  try {
    const { templateId } = req.params;

    const [existingRows] = (await pool.query(
      "SELECT id, name FROM templates WHERE id = ? AND tenant_id = ? AND template_type = 'whatsapp'",
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (existingRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "WhatsApp template not found" });
    }

    await pool.query("DELETE FROM templates WHERE id = ? AND tenant_id = ?", [
      templateId,
      MORTGAGE_TENANT_ID,
    ]);

    res.json({
      success: true,
      message: `WhatsApp template "${existingRows[0].name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting WhatsApp template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete WhatsApp template",
    });
  }
};

// =====================================================
// PIPELINE STEP TEMPLATES HANDLERS
// =====================================================

/**
 * GET /api/pipeline-step-templates
 * Returns all pipeline step→template assignments for the tenant,
 * with template name/body/subject joined for convenience.
 */
const handleGetPipelineStepTemplates: RequestHandler = async (req, res) => {
  try {
    const [rows] = (await pool.query(
      `SELECT
         pst.id, pst.tenant_id, pst.pipeline_step, pst.communication_type,
         pst.template_id, pst.is_active, pst.created_by_broker_id,
         pst.created_at, pst.updated_at,
         t.name  AS template_name,
         t.body  AS template_body,
         t.subject AS template_subject
       FROM pipeline_step_templates pst
       JOIN templates t ON t.id = pst.template_id
       WHERE pst.tenant_id = ?
       ORDER BY pst.pipeline_step, pst.communication_type`,
      [MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      assignments: rows.map((r: any) => ({
        ...r,
        is_active: Boolean(r.is_active),
      })),
    });
  } catch (error) {
    console.error("Error fetching pipeline step templates:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch pipeline step templates",
    });
  }
};

/**
 * PUT /api/pipeline-step-templates
 * Upserts (insert or replace) a single step→channel→template assignment.
 * Body: { pipeline_step, communication_type, template_id, is_active? }
 */
const handleUpsertPipelineStepTemplate: RequestHandler = async (req, res) => {
  try {
    const {
      pipeline_step,
      communication_type,
      template_id,
      is_active = true,
    } = req.body;
    const brokerId = (req as any).brokerId || 1;

    if (!pipeline_step || !communication_type || !template_id) {
      return res.status(400).json({
        success: false,
        error:
          "pipeline_step, communication_type, and template_id are required",
      });
    }

    const validSteps = [
      "app_sent",
      "application_received",
      "prequalified",
      "preapproved",
      "under_contract_loan_setup",
      "submitted_to_underwriting",
      "approved_with_conditions",
      "clear_to_close",
      "docs_out",
      "loan_funded",
    ];
    const validChannels = ["email", "sms", "whatsapp"];

    if (!validSteps.includes(pipeline_step)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid pipeline_step" });
    }
    if (!validChannels.includes(communication_type)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid communication_type" });
    }

    // Validate template exists and matches channel type
    const [tmplRows] = (await pool.query(
      "SELECT id FROM templates WHERE id = ? AND tenant_id = ? AND template_type = ?",
      [template_id, MORTGAGE_TENANT_ID, communication_type],
    )) as [RowDataPacket[], any];

    if (tmplRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No ${communication_type} template found with id ${template_id}`,
      });
    }

    // Upsert via INSERT ... ON DUPLICATE KEY UPDATE
    await pool.query(
      `INSERT INTO pipeline_step_templates
         (tenant_id, pipeline_step, communication_type, template_id, is_active, created_by_broker_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         template_id = VALUES(template_id),
         is_active   = VALUES(is_active),
         updated_at  = CURRENT_TIMESTAMP`,
      [
        MORTGAGE_TENANT_ID,
        pipeline_step,
        communication_type,
        template_id,
        is_active ? 1 : 0,
        brokerId,
      ],
    );

    const [rows] = (await pool.query(
      `SELECT
         pst.id, pst.tenant_id, pst.pipeline_step, pst.communication_type,
         pst.template_id, pst.is_active, pst.created_by_broker_id,
         pst.created_at, pst.updated_at,
         t.name  AS template_name,
         t.body  AS template_body,
         t.subject AS template_subject
       FROM pipeline_step_templates pst
       JOIN templates t ON t.id = pst.template_id
       WHERE pst.tenant_id = ? AND pst.pipeline_step = ? AND pst.communication_type = ?`,
      [MORTGAGE_TENANT_ID, pipeline_step, communication_type],
    )) as [RowDataPacket[], any];

    res.json({
      success: true,
      assignment: { ...rows[0], is_active: Boolean(rows[0].is_active) },
      message: "Pipeline step template saved successfully",
    });
  } catch (error) {
    console.error("Error upserting pipeline step template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save pipeline step template",
    });
  }
};

/**
 * DELETE /api/pipeline-step-templates/:step/:channel
 * Removes the assignment for a given step + channel.
 */
const handleDeletePipelineStepTemplate: RequestHandler = async (req, res) => {
  try {
    const { step, channel } = req.params;

    const [result] = (await pool.query(
      "DELETE FROM pipeline_step_templates WHERE tenant_id = ? AND pipeline_step = ? AND communication_type = ?",
      [MORTGAGE_TENANT_ID, step, channel],
    )) as [ResultSetHeader, any];

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Assignment not found",
      });
    }

    res.json({ success: true, message: "Assignment removed successfully" });
  } catch (error) {
    console.error("Error deleting pipeline step template:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete pipeline step template",
    });
  }
};

/**
 * Trigger pipeline automation when a loan status changes.
 * Queries pipeline_step_templates for the new status and dispatches
 * each configured channel (email / SMS / WhatsApp) using the assigned template.
 * This function is intentionally non-throwing — failures are logged only.
 */
async function triggerPipelineAutomation(
  loanId: number,
  newStatus: string,
  brokerId: number,
): Promise<void> {
  try {
    const [loanRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         la.id, la.application_number, la.loan_amount,
         c.id AS client_id, c.first_name, c.last_name, c.email, c.phone,
         b.first_name AS broker_first_name, b.last_name AS broker_last_name
       FROM loan_applications la
       INNER JOIN clients c ON la.client_user_id = c.id
       LEFT JOIN brokers b ON la.broker_user_id = b.id
       WHERE la.id = ? AND la.tenant_id = ?`,
      [loanId, MORTGAGE_TENANT_ID],
    );

    if (loanRows.length === 0) return;
    const loan = loanRows[0];

    const [assignments] = await pool.query<RowDataPacket[]>(
      `SELECT pst.communication_type, pst.template_id,
              t.name AS template_name, t.subject, t.body
       FROM pipeline_step_templates pst
       INNER JOIN templates t ON pst.template_id = t.id AND t.is_active = 1
       WHERE pst.tenant_id = ? AND pst.pipeline_step = ? AND pst.is_active = 1`,
      [MORTGAGE_TENANT_ID, newStatus],
    );

    if (assignments.length === 0) return;

    const statusLabel = newStatus
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const variables: Record<string, string> = {
      client_name: `${loan.first_name} ${loan.last_name}`,
      first_name: loan.first_name,
      last_name: loan.last_name,
      application_number: loan.application_number,
      application_id: String(loan.id),
      loan_amount: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(parseFloat(loan.loan_amount)),
      status: statusLabel,
      broker_name: loan.broker_first_name
        ? `${loan.broker_first_name} ${loan.broker_last_name}`
        : "Your Loan Officer",
    };

    // Stable conversation_id per client+loan so all automated messages land in the same thread
    const pipelineConversationId = `conv_client_${loan.client_id}_loan_${loanId}`;

    for (const assignment of assignments) {
      const body = processTemplateVariables(assignment.body, variables);
      const subject = processTemplateVariables(
        assignment.subject || assignment.template_name,
        variables,
      );

      let sendResult: {
        success: boolean;
        external_id?: string;
        error?: string;
        cost?: number;
      } = { success: false, error: "No phone/email on file" };

      if (assignment.communication_type === "email") {
        if (!loan.email) continue;
        sendResult = await sendEmailMessage(
          loan.email,
          subject,
          body,
          true,
          pipelineConversationId,
        );
      } else if (assignment.communication_type === "sms") {
        if (!loan.phone) continue;
        sendResult = await sendSMSMessage(loan.phone, body);
      } else if (assignment.communication_type === "whatsapp") {
        if (!loan.phone) continue;
        sendResult = await sendWhatsAppMessage(loan.phone, body);
      }

      console.log(
        `📤 Pipeline automation [${newStatus}] ${assignment.communication_type}: ${
          sendResult.success ? "✅ sent" : `❌ failed — ${sendResult.error}`
        }`,
      );

      // Log to communications table — include conversation_id so it shows up in Conversations section
      await pool.query(
        `INSERT INTO communications
           (tenant_id, application_id, from_broker_id, to_user_id,
            communication_type, direction, subject, body, status,
            external_id, conversation_id, template_id, delivery_status, cost, sent_at)
         VALUES (?, ?, ?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          MORTGAGE_TENANT_ID,
          loanId,
          brokerId,
          loan.client_id,
          assignment.communication_type,
          assignment.communication_type === "email" ? subject : null,
          body,
          sendResult.success ? "sent" : "failed",
          sendResult.external_id || null,
          pipelineConversationId,
          assignment.template_id,
          sendResult.success ? "sent" : "failed",
          sendResult.cost || null,
        ],
      );

      // Increment template usage count
      await pool.query(
        "UPDATE templates SET usage_count = usage_count + 1 WHERE id = ?",
        [assignment.template_id],
      );
    }
  } catch (err) {
    console.error("❌ Pipeline automation trigger failed:", err);
  }
}

// =====================================================
// REMINDER FLOW TRIGGER — auto-start flows on status change
// =====================================================

/**
 * Find all active reminder flows whose trigger_event matches newStatus and
 * whose loan_type_filter allows the loan's loan_type, then create
 * reminder_flow_executions for each matching flow.
 * Non-throwing — failures are logged only.
 */
async function triggerReminderFlows(
  loanId: number,
  newStatus: string,
  tenantId: number,
): Promise<void> {
  try {
    // Load loan context needed for execution context_data
    const [loanRows] = await pool.query<RowDataPacket[]>(
      `SELECT la.id, la.application_number, la.loan_type, la.status,
              la.actual_close_date, la.estimated_close_date,
              c.id AS client_id, c.first_name, c.last_name, c.email, c.phone
       FROM loan_applications la
       INNER JOIN clients c ON la.client_user_id = c.id
       WHERE la.id = ? AND la.tenant_id = ?`,
      [loanId, tenantId],
    );

    if (!loanRows.length) return;
    const loan = loanRows[0];
    const loanType: string = loan.loan_type || "purchase";

    // Find active flows matching this trigger_event and loan_type_filter
    const [flows] = await pool.query<RowDataPacket[]>(
      `SELECT rf.id, rf.trigger_delay_days, rf.loan_type_filter
       FROM reminder_flows rf
       WHERE rf.tenant_id = ?
         AND rf.trigger_event = ?
         AND rf.is_active = 1
         AND (rf.loan_type_filter = 'all' OR rf.loan_type_filter = ?)`,
      [tenantId, newStatus, loanType],
    );

    if (!flows.length) return;

    const contextData = JSON.stringify({
      loan_type: loanType,
      loan_status: loan.status,
      application_number: loan.application_number,
      client_id: loan.client_id,
      client_name: `${loan.first_name} ${loan.last_name}`,
      client_email: loan.email,
      client_phone: loan.phone,
      loan_id: loanId,
      actual_close_date: loan.actual_close_date ?? null,
      estimated_close_date: loan.estimated_close_date ?? null,
    });

    for (const flow of flows) {
      // Find the trigger node for this flow to set current_step_key
      const [triggerSteps] = await pool.query<RowDataPacket[]>(
        `SELECT step_key FROM reminder_flow_steps
         WHERE flow_id = ? AND step_type = 'trigger' LIMIT 1`,
        [flow.id],
      );
      const triggerKey = triggerSteps[0]?.step_key ?? null;

      // Calculate when to first run: NOW + trigger_delay_days
      const nextExecAt = new Date();
      nextExecAt.setDate(nextExecAt.getDate() + (flow.trigger_delay_days || 0));

      await pool.query(
        `INSERT INTO reminder_flow_executions
           (tenant_id, flow_id, loan_application_id, client_id,
            current_step_key, status, next_execution_at, completed_steps,
            context_data, last_step_started_at, started_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, '[]', ?, NOW(), NOW())`,
        [
          tenantId,
          flow.id,
          loanId,
          loan.client_id,
          triggerKey,
          nextExecAt,
          contextData,
        ],
      );

      console.log(
        `🔔 Reminder flow #${flow.id} triggered for loan #${loanId} (${newStatus} / ${loanType})`,
      );
    }
  } catch (err) {
    console.error("❌ Reminder flow trigger failed:", err);
  }
}

// =====================================================
// FLOW EXECUTION ENGINE — helpers used by the cron
// =====================================================

type FlowStep = {
  id: number;
  step_key: string;
  step_type: string;
  config: Record<string, any> | null;
};
type FlowConnection = {
  source_step_key: string;
  target_step_key: string;
  edge_type: string;
};

/** Parse a step config safely from DB (may be parsed object or JSON string). */
function parseStepConfig(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw as Record<string, any>;
}

/** Pick the outgoing connection from a step, given a priority-ordered list of edge types. */
function pickEdge(
  connections: FlowConnection[],
  fromKey: string,
  ...edgeTypes: string[]
): FlowConnection | undefined {
  for (const type of edgeTypes) {
    const edge = connections.find(
      (c) => c.source_step_key === fromKey && c.edge_type === type,
    );
    if (edge) return edge;
  }
  return undefined;
}

/**
 * Send a message for a send_email / send_sms / send_notification step.
 * Returns the send result without throwing.
 */
async function executeFlowSendStep(
  step: FlowStep,
  contextData: Record<string, any>,
  execution: RowDataPacket,
): Promise<void> {
  const config = step.config ?? {};
  if (!config.message && !config.template_id) return; // nothing to send

  const variables: Record<string, string> = {
    client_name: String(contextData.client_name ?? ""),
    first_name: String((contextData.client_name ?? "").split(" ")[0] ?? ""),
    application_number: String(contextData.application_number ?? ""),
    loan_type: String(contextData.loan_type ?? ""),
    status: String(contextData.loan_status ?? ""),
  };

  let body = config.message ?? "";
  let subject = config.subject ?? "Loan Update";

  if (config.template_id) {
    const [tRows] = await pool.query<RowDataPacket[]>(
      "SELECT subject, body FROM templates WHERE id = ? AND is_active = 1",
      [config.template_id],
    );
    if (tRows.length) {
      body = processTemplateVariables(tRows[0].body, variables);
      subject = processTemplateVariables(
        tRows[0].subject ?? subject,
        variables,
      );
    }
  } else {
    body = processTemplateVariables(body, variables);
    subject = processTemplateVariables(subject, variables);
  }

  const clientEmail: string = contextData.client_email as string;
  const clientPhone: string = contextData.client_phone as string;
  const loanId: number = contextData.loan_id as number;
  const clientId: number = contextData.client_id as number;
  const convId = `conv_client_${clientId}_loan_${loanId}_flow_${execution.flow_id}`;

  let sendResult: {
    success: boolean;
    external_id?: string;
    error?: string;
    cost?: number;
  } = { success: false, error: "Not configured" };

  if (step.step_type === "send_email") {
    if (!clientEmail) return;
    sendResult = await sendEmailMessage(
      clientEmail,
      subject,
      body,
      true,
      convId,
    );
  } else if (step.step_type === "send_sms") {
    if (!clientPhone) return;
    sendResult = await sendSMSMessage(clientPhone, body);
  } else if (step.step_type === "send_whatsapp") {
    if (!clientPhone) return;
    sendResult = await sendWhatsAppMessage(clientPhone, body);
  } else if (step.step_type === "send_notification") {
    // Insert in-app notification for client
    await pool.query(
      `INSERT INTO notifications (tenant_id, user_id, title, message, notification_type, is_read, created_at)
       VALUES (?, ?, ?, ?, 'info', 0, NOW())`,
      [MORTGAGE_TENANT_ID, clientId, subject, body],
    );
    sendResult = { success: true };
  }

  if (step.step_type !== "send_notification") {
    const commType =
      step.step_type === "send_email"
        ? "email"
        : step.step_type === "send_sms"
          ? "sms"
          : step.step_type === "send_whatsapp"
            ? "whatsapp"
            : "email";
    await pool.query(
      `INSERT INTO communications
         (tenant_id, application_id, from_broker_id, to_user_id,
          communication_type, direction, subject, body, status,
          external_id, conversation_id, template_id, delivery_status, cost, sent_at)
       VALUES (?, ?, NULL, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        MORTGAGE_TENANT_ID,
        loanId,
        clientId,
        commType,
        commType === "email" ? subject : null,
        body,
        sendResult.success ? "sent" : "failed",
        sendResult.external_id ?? null,
        convId,
        config.template_id ?? null,
        sendResult.success ? "sent" : "failed",
        sendResult.cost ?? null,
      ],
    );
  }

  console.log(
    `📤 Flow #${execution.flow_id} exec #${execution.id} step [${step.step_type}]: ${
      sendResult.success ? "✅ sent" : `❌ failed — ${sendResult.error}`
    }`,
  );
}

/**
 * Process a single active execution one "tick" at a time.
 * Advances through immediate steps (trigger, send_*, condition, branch)
 * until reaching a wait / wait_for_response / end step, then saves progress.
 */
async function processFlowExecution(execution: RowDataPacket): Promise<void> {
  const [stepRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM reminder_flow_steps WHERE flow_id = ? ORDER BY id ASC",
    [execution.flow_id],
  );
  const [connRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM reminder_flow_connections WHERE flow_id = ? ORDER BY id ASC",
    [execution.flow_id],
  );

  const stepMap = new Map<string, FlowStep>(
    stepRows.map((s) => [
      s.step_key,
      { ...s, config: parseStepConfig(s.config) } as FlowStep,
    ]),
  );
  const connections: FlowConnection[] = connRows as FlowConnection[];

  let completedSteps: string[] = [];
  try {
    completedSteps = JSON.parse(execution.completed_steps ?? "[]");
  } catch {
    completedSteps = [];
  }

  const contextData: Record<string, any> = execution.context_data
    ? typeof execution.context_data === "string"
      ? JSON.parse(execution.context_data)
      : execution.context_data
    : {};

  let currentKey: string = execution.current_step_key ?? "";
  const MAX_STEPS = 30; // guard against infinite loops in mis-configured flows
  let iterations = 0;

  while (iterations < MAX_STEPS) {
    iterations++;
    const step = stepMap.get(currentKey);
    if (!step) {
      // Invalid step key — fail this execution
      await pool.query(
        `UPDATE reminder_flow_executions
         SET status = 'failed', updated_at = NOW(),
             completed_steps = ?, current_step_key = ?
         WHERE id = ?`,
        [JSON.stringify(completedSteps), currentKey, execution.id],
      );
      return;
    }

    completedSteps.push(currentKey);

    // ── end ──────────────────────────────────────────
    if (step.step_type === "end") {
      await pool.query(
        `UPDATE reminder_flow_executions
         SET status = 'completed', completed_at = NOW(), updated_at = NOW(),
             completed_steps = ?, current_step_key = ?
         WHERE id = ?`,
        [JSON.stringify(completedSteps), currentKey, execution.id],
      );
      return;
    }

    // ── trigger ──────────────────────────────────────
    if (step.step_type === "trigger") {
      const edge = pickEdge(connections, currentKey, "default");
      if (!edge) {
        await pool.query(
          `UPDATE reminder_flow_executions SET status = 'completed', completed_at = NOW(), updated_at = NOW(), completed_steps = ? WHERE id = ?`,
          [JSON.stringify(completedSteps), execution.id],
        );
        return;
      }
      currentKey = edge.target_step_key;
      continue;
    }

    // ── wait ─────────────────────────────────────────
    // Time has already elapsed (cron only picks up executions where next_execution_at <= NOW())
    if (step.step_type === "wait" || step.step_type === "wait_until_date") {
      const edge = pickEdge(connections, currentKey, "default");
      if (!edge) {
        await pool.query(
          `UPDATE reminder_flow_executions SET status = 'completed', completed_at = NOW(), updated_at = NOW(), completed_steps = ? WHERE id = ?`,
          [JSON.stringify(completedSteps), execution.id],
        );
        return;
      }
      currentKey = edge.target_step_key;
      continue;
    }

    // ── wait_for_response ────────────────────────────
    if (step.step_type === "wait_for_response") {
      let nextEdge: FlowConnection | undefined;
      if (execution.responded_at) {
        nextEdge = pickEdge(connections, currentKey, "responded", "default");
      } else {
        // Timeout elapsed without response
        nextEdge = pickEdge(connections, currentKey, "no_response", "default");
      }
      if (!nextEdge) {
        await pool.query(
          `UPDATE reminder_flow_executions SET status = 'completed', completed_at = NOW(), updated_at = NOW(), completed_steps = ? WHERE id = ?`,
          [JSON.stringify(completedSteps), execution.id],
        );
        return;
      }
      currentKey = nextEdge.target_step_key;
      continue;
    }

    // ── send_email / send_sms / send_whatsapp / send_notification ────
    if (
      step.step_type === "send_email" ||
      step.step_type === "send_sms" ||
      step.step_type === "send_whatsapp" ||
      step.step_type === "send_notification"
    ) {
      await executeFlowSendStep(step, contextData, execution);
      const edge = pickEdge(connections, currentKey, "default");
      if (!edge) {
        await pool.query(
          `UPDATE reminder_flow_executions SET status = 'completed', completed_at = NOW(), updated_at = NOW(), completed_steps = ? WHERE id = ?`,
          [JSON.stringify(completedSteps), execution.id],
        );
        return;
      }
      currentKey = edge.target_step_key;

      // If next step requires waiting, save state and stop for this cron tick
      const nextStep = stepMap.get(currentKey);
      if (
        nextStep &&
        (nextStep.step_type === "wait" ||
          nextStep.step_type === "wait_until_date" ||
          nextStep.step_type === "wait_for_response")
      ) {
        const cfg = nextStep.config ?? {};
        let nextExecAt: Date;
        if (nextStep.step_type === "wait") {
          nextExecAt = new Date();
          nextExecAt.setDate(nextExecAt.getDate() + (cfg.delay_days ?? 0));
          nextExecAt.setHours(nextExecAt.getHours() + (cfg.delay_hours ?? 0));
          nextExecAt.setMinutes(
            nextExecAt.getMinutes() + (cfg.delay_minutes ?? 0),
          );
        } else if (nextStep.step_type === "wait_until_date") {
          // Wait until the date stored in the specified contextData field.
          // If the date is missing or already in the past, proceed immediately (1-minute buffer).
          const dateFieldName = cfg.date_field as string | undefined;
          const rawDate = dateFieldName ? contextData[dateFieldName] : null;
          const targetDate = rawDate ? new Date(rawDate) : null;
          if (targetDate && targetDate > new Date()) {
            nextExecAt = targetDate;
          } else {
            nextExecAt = new Date(Date.now() + 60_000); // 1-minute buffer
          }
        } else {
          nextExecAt = new Date();
          nextExecAt.setHours(
            nextExecAt.getHours() + (cfg.response_timeout_hours ?? 72),
          );
          nextExecAt.setMinutes(
            nextExecAt.getMinutes() + (cfg.response_timeout_minutes ?? 0),
          );
        }
        await pool.query(
          `UPDATE reminder_flow_executions
           SET current_step_key = ?, next_execution_at = ?,
               completed_steps = ?, last_step_started_at = NOW(), updated_at = NOW()
           WHERE id = ?`,
          [
            currentKey,
            nextExecAt,
            JSON.stringify(completedSteps),
            execution.id,
          ],
        );
        return;
      }
      continue;
    }

    // ── condition / branch ───────────────────────────
    if (step.step_type === "condition" || step.step_type === "branch") {
      const cfg = step.config ?? {};
      const condType = cfg.condition_type as string | undefined;
      let edgeType = "condition_yes";

      if (condType === "loan_type") {
        const lt = contextData.loan_type as string;
        edgeType =
          lt === "purchase"
            ? "loan_type_purchase"
            : lt === "refinance"
              ? "loan_type_refinance"
              : "condition_yes";
      } else if (condType === "loan_status") {
        edgeType =
          contextData.loan_status === cfg.condition_value
            ? "condition_yes"
            : "condition_no";
      } else if (condType === "loan_status_ne") {
        // condition_yes = loan_status does NOT equal condition_value (not adverse)
        edgeType =
          contextData.loan_status !== cfg.condition_value
            ? "condition_yes"
            : "condition_no";
      } else if (condType === "inactivity_days") {
        // Default yes branch when we cannot evaluate dynamically at this time
        edgeType = "condition_yes";
      } else if (condType === "task_completed") {
        edgeType = "condition_yes";
      } else if (condType === "field_not_empty") {
        const fieldName = cfg.field_name as string | undefined;
        const fieldVal = fieldName ? contextData[fieldName] : undefined;
        edgeType =
          fieldVal != null && fieldVal !== "" && fieldVal !== "null"
            ? "condition_yes"
            : "condition_no";
      } else if (condType === "field_empty") {
        const fieldName = cfg.field_name as string | undefined;
        const fieldVal = fieldName ? contextData[fieldName] : undefined;
        edgeType =
          !fieldVal || fieldVal === "" || fieldVal === "null"
            ? "condition_yes"
            : "condition_no";
      }

      const edge =
        pickEdge(connections, currentKey, edgeType) ??
        pickEdge(connections, currentKey, "default");

      if (!edge) {
        await pool.query(
          `UPDATE reminder_flow_executions SET status = 'completed', completed_at = NOW(), updated_at = NOW(), completed_steps = ? WHERE id = ?`,
          [JSON.stringify(completedSteps), execution.id],
        );
        return;
      }
      currentKey = edge.target_step_key;
      continue;
    }

    // Unknown step type — skip and follow default edge
    const fallback = pickEdge(connections, currentKey, "default");
    if (!fallback) {
      await pool.query(
        `UPDATE reminder_flow_executions SET status = 'completed', completed_at = NOW(), updated_at = NOW(), completed_steps = ? WHERE id = ?`,
        [JSON.stringify(completedSteps), execution.id],
      );
      return;
    }
    currentKey = fallback.target_step_key;
  }

  // Max iterations guard — save whatever progress was made
  await pool.query(
    `UPDATE reminder_flow_executions SET current_step_key = ?, completed_steps = ?, updated_at = NOW() WHERE id = ?`,
    [currentKey, JSON.stringify(completedSteps), execution.id],
  );
}

// =====================================================
// CRON: PROCESS REMINDER FLOWS
// =====================================================

/**
 * GET /api/cron/process-reminder-flows
 *
 * Processes all active reminder_flow_executions whose next_execution_at has
 * passed.  Should be scheduled via HostGator cPanel cron (or any cron) to
 * run every 5–15 minutes:
 *
 *   curl -s "https://yourdomain.com/api/cron/process-reminder-flows?secret=CRON_SECRET"
 *
 * Protected by CRON_SECRET (same env var used by the IMAP polling cron).
 */
const handleProcessReminderFlows: RequestHandler = async (req, res) => {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const authHeader = req.headers.authorization;
      const provided =
        (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null) ??
        (req.query.secret as string | undefined);
      if (provided !== secret) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
    }

    // Load all due active executions (next_execution_at <= NOW())
    const [executions] = await pool.query<RowDataPacket[]>(
      `SELECT rfe.*, rf.name AS flow_name
       FROM reminder_flow_executions rfe
       JOIN reminder_flows rf ON rf.id = rfe.flow_id AND rf.is_active = 1
       WHERE rfe.status = 'active'
         AND rfe.next_execution_at IS NOT NULL
         AND rfe.next_execution_at <= NOW()
       ORDER BY rfe.next_execution_at ASC
       LIMIT 100`,
    );

    if (!executions.length) {
      return res.json({ success: true, processed: 0, succeeded: 0, failed: 0 });
    }

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const execution of executions) {
      try {
        await processFlowExecution(execution);
        succeeded++;
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`exec#${execution.id}: ${msg}`);
        console.error(`❌ Flow execution #${execution.id} failed:`, err);
        // Mark as failed so it won't be retried indefinitely
        await pool
          .query(
            `UPDATE reminder_flow_executions SET status = 'failed', updated_at = NOW() WHERE id = ?`,
            [execution.id],
          )
          .catch(() => {});
      }
    }

    console.log(
      `✅ Reminder flows cron: ${succeeded} succeeded, ${failed} failed (${executions.length} total)`,
    );

    return res.json({
      success: true,
      processed: executions.length,
      succeeded,
      failed,
      ...(errors.length ? { errors } : {}),
    });
  } catch (error) {
    console.error("Error processing reminder flows:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to process reminder flows" });
  }
};

/**
 * POST /api/reminder-flow-executions/:executionId/respond
 *
 * Mark an execution as having received a client response.
 * Called by the inbound-email handler or any other response tracking code.
 * Sets responded_at and optionally re-schedules next_execution_at so the
 * cron will process the `responded` branch on the next run.
 */
const handleMarkFlowExecutionResponded: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { executionId } = req.params;

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    const tenantId = tenantRows[0]?.tenant_id;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT rfe.id, rfe.status, rfe.responded_at
       FROM reminder_flow_executions rfe
       JOIN reminder_flows rf ON rf.id = rfe.flow_id
       WHERE rfe.id = ? AND rfe.tenant_id = ?`,
      [executionId, tenantId],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Execution not found" });
    }
    if (rows[0].status !== "active") {
      return res
        .status(409)
        .json({ success: false, error: "Execution is not active" });
    }
    if (rows[0].responded_at) {
      return res.json({
        success: true,
        message: "Already marked as responded",
      });
    }

    // Set responded_at and schedule immediate processing on next cron tick
    await pool.query(
      `UPDATE reminder_flow_executions
       SET responded_at = NOW(), next_execution_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [executionId],
    );

    return res.json({
      success: true,
      message: "Execution marked as responded",
    });
  } catch (error) {
    console.error("Error marking flow execution as responded:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to mark execution as responded" });
  }
};

/**
 * GET /api/cron/poll-inbound-email
 *
 * Called on a schedule (Vercel Cron or HostGator cPanel cron via curl).
 * Connects to the IMAP mailbox defined by IMAP_* env vars, reads unseen
 * messages, extracts the conversation_id from the In-Reply-To / References
 * or X-Conversation-Id header, and inserts an inbound `communications` row.
 *
 * Protected by CRON_SECRET — pass it as:
 *   Authorization: Bearer {CRON_SECRET}
 * or ?secret={CRON_SECRET} query param (for curl-based cron).
 *
 * Required env vars:
 *   IMAP_HOST     e.g. mail.yourdomain.com
 *   IMAP_PORT     993 (TLS) or 143 (STARTTLS)
 *   IMAP_USER     reply@yourdomain.com
 *   IMAP_PASSWORD your-email-password
 *   IMAP_TLS      true | false (default true)
 *   CRON_SECRET   random secret to protect this endpoint
 */
const handlePollInboundEmail: RequestHandler = async (req, res) => {
  try {
    // --- Auth ---
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const authHeader = req.headers.authorization;
      const provided =
        (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null) ||
        (req.query.secret as string);
      if (provided !== secret) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
    }

    // --- Config ---
    const host = process.env.IMAP_HOST;
    const user = process.env.IMAP_USER;
    const pass = process.env.IMAP_PASSWORD;

    if (!host || !user || !pass) {
      return res.json({
        success: true,
        skipped: true,
        reason: "IMAP not configured",
      });
    }

    const port = parseInt(process.env.IMAP_PORT || "993");
    const tls = process.env.IMAP_TLS !== "false";

    // IMAP functionality temporarily disabled
    return res.json({
      success: false,
      error: "IMAP email polling is currently disabled",
    });

    // Legacy code commented out:
    // const client = new ImapFlow({
    //   host,
    //   port,
    //   secure: tls,
    //   auth: { user, pass },
    //   logger: false,
    // });
    //
    // await client.connect();
    // let processed = 0;

    // The rest of the IMAP functionality has been commented out
    // since IMAP polling is currently disabled
  } catch (error) {
    console.error("❌ IMAP poll error:", error);
    res.status(500).json({ success: false, error: "IMAP poll failed" });
  }
};

// =====================================================
// INBOUND EMAIL WEBHOOK
// =====================================================

/**
 * POST /api/webhooks/inbound-email
 *
 * Receives inbound email payloads from Postmark, Mailgun, or SendGrid.
 * The provider must be configured to POST to:
 *   https://yourdomain.com/api/webhooks/inbound-email
 * with a shared secret in the header "X-Webhook-Secret" (= INBOUND_WEBHOOK_SECRET env var)
 * and set to catch emails sent to  reply+*@{INBOUND_EMAIL_DOMAIN}.
 *
 * Normalises the three provider formats into one shape, extracts the
 * conversation_id from the recipient address, and inserts an inbound
 * `communications` row so the thread appears in the Conversations section.
 *
 * Provider body shapes expected:
 *   Postmark : { From, To, Subject, TextBody, HtmlBody, Headers[], MessageID, ... }
 *   Mailgun  : { sender, recipient, subject, "body-plain", "body-html", "Message-Id", ... }
 *   SendGrid : JSON array [{ from, to, subject, text, html, headers, ... }]
 */
const handleInboundEmail: RequestHandler = async (req, res) => {
  try {
    // Verify shared secret to reject unauthenticated POSTs
    const secret = process.env.INBOUND_WEBHOOK_SECRET;
    if (secret) {
      const provided =
        req.headers["x-webhook-secret"] ||
        req.headers["x-postmark-secret"] ||
        req.query.secret;
      if (provided !== secret) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
    }

    // ---- Normalise payload across Postmark / Mailgun / SendGrid ----
    let rawPayload = req.body;
    // SendGrid wraps events in an array
    if (Array.isArray(rawPayload)) rawPayload = rawPayload[0];

    const fromAddress: string =
      rawPayload.From || rawPayload.from || rawPayload.sender || "";

    const toAddress: string =
      rawPayload.To || rawPayload.to || rawPayload.recipient || "";

    const subjectRaw: string =
      rawPayload.Subject || rawPayload.subject || "(no subject)";

    const textBody: string =
      rawPayload.TextBody || rawPayload["body-plain"] || rawPayload.text || "";

    const htmlBody: string =
      rawPayload.HtmlBody || rawPayload["body-html"] || rawPayload.html || "";

    const messageId: string =
      rawPayload.MessageID ||
      rawPayload["Message-Id"] ||
      rawPayload.headers?.["Message-Id"] ||
      "";

    const body = textBody || htmlBody || "(empty message)";

    // ---- Extract conversation_id ----
    // Look for reply+{conversation_id}@domain in the To address first,
    // then fall back to custom X-Conversation-Id header embedded on send.
    let conversationId: string | null = null;

    const subAddressMatch = toAddress.match(/reply\+([^@]+)@/);
    if (subAddressMatch) {
      conversationId = subAddressMatch[1];
    }

    // Check custom header (Postmark passes them in Headers[])
    if (!conversationId) {
      const headers: any[] = rawPayload.Headers || [];
      const convHeader = headers.find(
        (h: any) => h.Name?.toLowerCase() === "x-conversation-id",
      );
      if (convHeader) conversationId = convHeader.Value;
    }

    // Mailgun / SendGrid store headers as an object
    if (!conversationId && rawPayload.headers) {
      conversationId =
        rawPayload.headers["x-conversation-id"] ||
        rawPayload.headers["X-Conversation-Id"] ||
        null;
    }

    if (!conversationId) {
      console.warn("⚠️  Inbound email received but no conversation_id found", {
        toAddress,
        fromAddress,
      });
      // Acknowledge the webhook so the provider doesn't retry
      return res.json({
        success: true,
        message: "Acknowledged — no conversation matched",
      });
    }

    // ---- Look up the conversation thread to get broker + client context ----
    const [threadRows] = await pool.query<RowDataPacket[]>(
      `SELECT ct.broker_id, ct.client_id, ct.application_id, ct.lead_id
       FROM conversation_threads ct
       WHERE ct.conversation_id = ? AND ct.tenant_id = ?
       LIMIT 1`,
      [conversationId, MORTGAGE_TENANT_ID],
    );

    let brokerId: number | null = null;
    let clientId: number | null = null;
    let applicationId: number | null = null;
    let leadId: number | null = null;

    if (threadRows.length > 0) {
      brokerId = threadRows[0].broker_id;
      clientId = threadRows[0].client_id;
      applicationId = threadRows[0].application_id;
      leadId = threadRows[0].lead_id;
    } else {
      // Thread doesn't exist yet — try matching by sender email to find the client
      const senderEmail = fromAddress.match(/<([^>]+)>/)?.[1] || fromAddress;
      const [clientRows] = await pool.query<RowDataPacket[]>(
        `SELECT c.id, c.assigned_broker_id
         FROM clients c
         WHERE c.email = ? AND c.tenant_id = ?
         LIMIT 1`,
        [senderEmail, MORTGAGE_TENANT_ID],
      );
      if (clientRows.length > 0) {
        clientId = clientRows[0].id;
        brokerId = clientRows[0].assigned_broker_id;
      }
    }

    // ---- Insert the inbound communications record ----
    await pool.query(
      `INSERT INTO communications (
        tenant_id, application_id, lead_id,
        from_user_id, to_broker_id,
        communication_type, direction,
        subject, body, status,
        conversation_id, message_type,
        delivery_status, external_id,
        sent_at, created_at
      ) VALUES (?, ?, ?, ?, ?, 'email', 'inbound', ?, ?, 'delivered', ?, 'text', 'delivered', ?, NOW(), NOW())`,
      [
        MORTGAGE_TENANT_ID,
        applicationId || null,
        leadId || null,
        clientId || null,
        brokerId || null,
        subjectRaw,
        body,
        conversationId,
        messageId || null,
      ],
    );

    console.log(
      `📥 Inbound email stored: conv=${conversationId} from=${fromAddress}`,
    );
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Inbound email webhook error:", error);
    // Always return 200 so the provider doesn't flood with retries
    res.status(200).json({ success: false, error: "Internal error" });
  }
};

// =====================================================
// CONVERSATION HANDLERS
// =====================================================

/**
 * GET /api/conversations/threads
 * Get conversation threads with filters and pagination
 */
const handleGetConversationThreads: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const {
      page = 1,
      limit = 20,
      status = "all",
      priority,
      search,
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions = ["ct.tenant_id = ?", "ct.broker_id = ?"];
    let queryParams: any[] = [MORTGAGE_TENANT_ID, brokerId];

    if (status !== "all") {
      whereConditions.push("ct.status = ?");
      queryParams.push(status);
    }

    if (priority) {
      whereConditions.push("ct.priority = ?");
      queryParams.push(priority);
    }

    if (search) {
      whereConditions.push(
        "(ct.client_name LIKE ? OR ct.client_email LIKE ? OR ct.client_phone LIKE ?)",
      );
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get threads with client information
    const threadsQuery = `
      SELECT 
        ct.*,
        la.application_number,
        CONCAT(c.first_name, ' ', c.last_name) as client_full_name,
        c.email as client_email_current,
        c.phone as client_phone_current
      FROM conversation_threads ct
      LEFT JOIN loan_applications la ON ct.application_id = la.id
      LEFT JOIN clients c ON ct.client_id = c.id
      WHERE ${whereClause}
      ORDER BY ct.last_message_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit as string), offset);

    const [threads] = await pool.query<RowDataPacket[]>(
      threadsQuery,
      queryParams,
    );

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM conversation_threads ct 
      WHERE ${whereClause}
    `;
    const [countResult] = await pool.query<RowDataPacket[]>(
      countQuery,
      queryParams.slice(0, -2), // Remove limit and offset from params
    );

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.json({
      success: true,
      threads: threads.map((thread) => ({
        ...thread,
        tags: thread.tags ? JSON.parse(thread.tags) : [],
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching conversation threads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversation threads",
    });
  }
};

/**
 * GET /api/conversations/:conversationId/messages
 * Get messages for a specific conversation
 */
const handleGetConversationMessages: RequestHandler = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const brokerId = (req as any).brokerId;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Verify broker has access to this conversation
    const [threadCheck] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM conversation_threads 
       WHERE conversation_id = ? AND broker_id = ? AND tenant_id = ?`,
      [conversationId, brokerId, MORTGAGE_TENANT_ID],
    );

    if (threadCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or access denied",
      });
    }

    // Get messages
    const [messages] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.*,
        t.name as template_name,
        COALESCE(CONCAT(b.first_name, ' ', b.last_name), 'System') as sender_name,
        COALESCE(CONCAT(cl.first_name, ' ', cl.last_name), 'Client') as recipient_name
      FROM communications c
      LEFT JOIN templates t ON c.template_id = t.id
      LEFT JOIN brokers b ON c.from_broker_id = b.id
      LEFT JOIN clients cl ON c.to_user_id = cl.id
      WHERE c.conversation_id = ? AND c.tenant_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?`,
      [conversationId, MORTGAGE_TENANT_ID, parseInt(limit as string), offset],
    );

    // Get thread info
    const [threadInfo] = await pool.query<RowDataPacket[]>(
      `SELECT ct.*, 
              la.application_number,
              CONCAT(cl.first_name, ' ', cl.last_name) as client_full_name
       FROM conversation_threads ct
       LEFT JOIN loan_applications la ON ct.application_id = la.id
       LEFT JOIN clients cl ON ct.client_id = cl.id
       WHERE ct.conversation_id = ?`,
      [conversationId],
    );

    // Get total message count
    const [countResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM communications WHERE conversation_id = ?",
      [conversationId],
    );

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.json({
      success: true,
      messages: messages.map((msg) => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
        provider_response: msg.provider_response
          ? JSON.parse(msg.provider_response)
          : null,
      })),
      thread: {
        ...threadInfo[0],
        tags: threadInfo[0]?.tags ? JSON.parse(threadInfo[0].tags) : [],
      },
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversation messages",
    });
  }
};

/**
 * POST /api/conversations/send
 * Send a new message (SMS, WhatsApp, or Email)
 */
const handleSendMessage: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const {
      conversation_id,
      application_id,
      lead_id,
      client_id,
      communication_type,
      recipient_phone,
      recipient_email,
      subject,
      body,
      template_id,
      message_type = "text",
      scheduled_at,
    } = req.body;

    // Validation
    if (!communication_type || !body) {
      return res.status(400).json({
        success: false,
        message: "communication_type and body are required",
      });
    }

    if (!["email", "sms", "whatsapp"].includes(communication_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid communication_type. Must be email, sms, or whatsapp",
      });
    }

    // Validate recipient info
    if (
      communication_type === "email" &&
      !recipient_email &&
      !client_id &&
      !application_id
    ) {
      return res.status(400).json({
        success: false,
        message: "recipient_email is required for email communications",
      });
    }

    if (
      ["sms", "whatsapp"].includes(communication_type) &&
      !recipient_phone &&
      !client_id &&
      !application_id
    ) {
      return res.status(400).json({
        success: false,
        message: "recipient_phone is required for SMS/WhatsApp communications",
      });
    }

    // Get recipient info if not provided but client_id or application_id is provided
    let finalRecipientEmail = recipient_email;
    let finalRecipientPhone = recipient_phone;

    if (!finalRecipientEmail || !finalRecipientPhone) {
      let clientQuery = "";
      let clientParams: any[] = [];

      if (client_id) {
        clientQuery =
          "SELECT email, phone FROM clients WHERE id = ? AND tenant_id = ?";
        clientParams = [client_id, MORTGAGE_TENANT_ID];
      } else if (application_id) {
        clientQuery = `
          SELECT c.email, c.phone 
          FROM clients c 
          JOIN loan_applications la ON c.id = la.client_user_id 
          WHERE la.id = ? AND la.tenant_id = ?
        `;
        clientParams = [application_id, MORTGAGE_TENANT_ID];
      }

      if (clientQuery) {
        const [clientInfo] = await pool.query<RowDataPacket[]>(
          clientQuery,
          clientParams,
        );

        if (clientInfo.length > 0) {
          finalRecipientEmail = finalRecipientEmail || clientInfo[0].email;
          finalRecipientPhone = finalRecipientPhone || clientInfo[0].phone;
        }
      }
    }

    // Generate conversation_id if not provided
    let finalConversationId = conversation_id;
    if (!finalConversationId) {
      finalConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Process template if provided
    let processedBody = body;
    let processedSubject = subject;

    if (template_id && message_type === "template") {
      const [templates] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM templates WHERE id = ? AND tenant_id = ?`,
        [template_id, MORTGAGE_TENANT_ID],
      );

      if (templates.length > 0) {
        const template = templates[0];

        // Get template variables (you can extend this based on your needs)
        const templateVariables = {
          client_name: finalRecipientEmail?.split("@")[0] || "Client",
          broker_name: "Broker", // You can get this from the broker's info
          application_id: application_id || "",
          current_date: new Date().toLocaleDateString(),
        };

        processedBody = processTemplateVariables(
          template.body,
          templateVariables,
        );
        if (template.subject && communication_type === "email") {
          processedSubject = processTemplateVariables(
            template.subject,
            templateVariables,
          );
        }
      }
    }

    // Insert communication record
    const [result] = (await pool.query(
      `INSERT INTO communications (
        tenant_id, application_id, lead_id, from_broker_id, to_user_id,
        communication_type, direction, subject, body, status,
        conversation_id, message_type, template_id, scheduled_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        MORTGAGE_TENANT_ID,
        application_id || null,
        lead_id || null,
        brokerId,
        client_id || null,
        communication_type,
        "outbound",
        processedSubject || null,
        processedBody,
        scheduled_at ? "pending" : "pending",
        finalConversationId,
        message_type,
        template_id || null,
        scheduled_at || null,
      ],
    )) as [ResultSetHeader, any];

    const communicationId = result.insertId;

    // Send the actual message
    let sendResult: any = { success: false, error: "Unknown error" };

    if (scheduled_at) {
      // For scheduled messages, just mark as pending
      sendResult = { success: true };
    } else {
      // Send immediately
      switch (communication_type) {
        case "sms":
          if (finalRecipientPhone) {
            sendResult = await sendSMSMessage(
              finalRecipientPhone,
              processedBody,
            );
          } else {
            sendResult = { success: false, error: "No phone number available" };
          }
          break;

        case "whatsapp":
          if (finalRecipientPhone) {
            sendResult = await sendWhatsAppMessage(
              finalRecipientPhone,
              processedBody,
            );
          } else {
            sendResult = { success: false, error: "No phone number available" };
          }
          break;

        case "email":
          if (finalRecipientEmail) {
            // Auto-detect HTML content so template-based emails render correctly
            const isHtmlEmail = /<[a-z][\s\S]*>/i.test(processedBody);
            sendResult = await sendEmailMessage(
              finalRecipientEmail,
              processedSubject || "Message from Mortgage Professional",
              processedBody,
              isHtmlEmail,
              finalConversationId,
            );
          } else {
            sendResult = {
              success: false,
              error: "No email address available",
            };
          }
          break;

        default:
          sendResult = { success: false, error: "Invalid communication type" };
      }
    }

    // Update communication record with sending results
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (sendResult.success) {
      updateFields.push("status = ?", "delivery_status = ?", "sent_at = NOW()");
      updateValues.push("sent", "sent");

      if (sendResult.external_id) {
        updateFields.push("external_id = ?");
        updateValues.push(sendResult.external_id);
      }

      if (sendResult.cost) {
        updateFields.push("cost = ?");
        updateValues.push(sendResult.cost);
      }

      if (sendResult.provider_response) {
        updateFields.push("provider_response = ?");
        updateValues.push(JSON.stringify(sendResult.provider_response));
      }
    } else {
      updateFields.push(
        "status = ?",
        "delivery_status = ?",
        "error_message = ?",
      );
      updateValues.push("failed", "failed", sendResult.error);

      if (sendResult.provider_response) {
        updateFields.push("provider_response = ?");
        updateValues.push(JSON.stringify(sendResult.provider_response));
      }
    }

    updateValues.push(communicationId);

    await pool.query(
      `UPDATE communications SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues,
    );

    // Create audit log entry
    await pool.query(
      `INSERT INTO audit_logs (
        tenant_id, broker_id, actor_type, action, entity_type, entity_id, 
        changes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        MORTGAGE_TENANT_ID,
        brokerId,
        "broker",
        `send_${communication_type}`,
        "communication",
        communicationId,
        JSON.stringify({
          recipient:
            communication_type === "email"
              ? finalRecipientEmail
              : finalRecipientPhone,
          template_used: template_id ? true : false,
          scheduled: scheduled_at ? true : false,
        }),
        sendResult.success ? "success" : "failure",
      ],
    );

    if (!sendResult.success) {
      return res.status(400).json({
        success: false,
        message: `Failed to send ${communication_type}: ${sendResult.error}`,
        communication_id: communicationId,
        conversation_id: finalConversationId,
      });
    }

    res.json({
      success: true,
      message: "Message sent successfully",
      communication_id: communicationId,
      conversation_id: finalConversationId,
      external_id: sendResult.external_id,
      cost: sendResult.cost,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

/**
 * PUT /api/conversations/:conversationId
 * Update conversation thread (status, priority, tags)
 */
const handleUpdateConversation: RequestHandler = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { status, priority, tags } = req.body;
    const brokerId = (req as any).brokerId;

    // Verify broker has access to this conversation
    const [threadCheck] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM conversation_threads 
       WHERE conversation_id = ? AND broker_id = ? AND tenant_id = ?`,
      [conversationId, brokerId, MORTGAGE_TENANT_ID],
    );

    if (threadCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or access denied",
      });
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (status && ["active", "archived", "closed"].includes(status)) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }

    if (priority && ["low", "normal", "high", "urgent"].includes(priority)) {
      updateFields.push("priority = ?");
      updateValues.push(priority);
    }

    if (tags !== undefined) {
      updateFields.push("tags = ?");
      updateValues.push(JSON.stringify(tags));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(conversationId);

    await pool.query(
      `UPDATE conversation_threads SET ${updateFields.join(", ")} 
       WHERE conversation_id = ?`,
      updateValues,
    );

    // Get updated thread
    const [updatedThread] = await pool.query<RowDataPacket[]>(
      `SELECT ct.*, 
              la.application_number,
              CONCAT(cl.first_name, ' ', cl.last_name) as client_full_name
       FROM conversation_threads ct
       LEFT JOIN loan_applications la ON ct.application_id = la.id
       LEFT JOIN clients cl ON ct.client_id = cl.id
       WHERE ct.conversation_id = ?`,
      [conversationId],
    );

    res.json({
      success: true,
      thread: {
        ...updatedThread[0],
        tags: updatedThread[0]?.tags ? JSON.parse(updatedThread[0].tags) : [],
      },
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update conversation",
    });
  }
};

/**
 * GET /api/conversations/templates
 * Get communication templates for sending messages
 */
const handleGetConversationTemplates: RequestHandler = async (req, res) => {
  try {
    const { type } = req.query;

    let whereCondition = "WHERE tenant_id = ? AND is_active = 1";
    const queryParams: any[] = [MORTGAGE_TENANT_ID];

    if (type && ["email", "sms", "whatsapp"].includes(type as string)) {
      whereCondition += " AND template_type = ?";
      queryParams.push(type);
    }

    const [templates] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id,
        name,
        description,
        template_type,
        category,
        subject,
        body,
        variables,
        created_at,
        updated_at
      FROM templates
      ${whereCondition}
      ORDER BY category, name`,
      queryParams,
    );

    res.json({
      success: true,
      templates: templates.map((template) => {
        let variables = [];
        if (template.variables) {
          try {
            const parsed = JSON.parse(template.variables);
            variables = Array.isArray(parsed) ? parsed : [];
          } catch {
            // Handle legacy comma-separated strings
            variables = String(template.variables)
              .split(",")
              .map((v: string) => v.trim())
              .filter(Boolean);
          }
        }
        return {
          ...template,
          variables,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching conversation templates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversation templates",
    });
  }
};

/**
 * GET /api/conversations/stats
 * Get conversation statistics for dashboard
 */
const handleGetConversationStats: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;

    // Total conversations
    const [totalResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM conversation_threads 
       WHERE broker_id = ? AND tenant_id = ?`,
      [brokerId, MORTGAGE_TENANT_ID],
    );

    // Active conversations
    const [activeResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as active FROM conversation_threads 
       WHERE broker_id = ? AND tenant_id = ? AND status = 'active'`,
      [brokerId, MORTGAGE_TENANT_ID],
    );

    // Unread messages
    const [unreadResult] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(unread_count), 0) as unread 
       FROM conversation_threads 
       WHERE broker_id = ? AND tenant_id = ?`,
      [brokerId, MORTGAGE_TENANT_ID],
    );

    // Today's messages
    const [todayResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as today_messages 
       FROM communications 
       WHERE from_broker_id = ? AND tenant_id = ? 
         AND DATE(created_at) = CURDATE()`,
      [brokerId, MORTGAGE_TENANT_ID],
    );

    // Channel breakdown
    const [channelResult] = await pool.query<RowDataPacket[]>(
      `SELECT 
        communication_type,
        COUNT(*) as count
      FROM communications c
      JOIN conversation_threads ct ON c.conversation_id = ct.conversation_id
      WHERE ct.broker_id = ? AND c.tenant_id = ?
        AND c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY communication_type`,
      [brokerId, MORTGAGE_TENANT_ID],
    );

    // Priority breakdown
    const [priorityResult] = await pool.query<RowDataPacket[]>(
      `SELECT 
        priority,
        COUNT(*) as count
      FROM conversation_threads 
      WHERE broker_id = ? AND tenant_id = ?
      GROUP BY priority`,
      [brokerId, MORTGAGE_TENANT_ID],
    );

    // Calculate average response time (mock for now)
    const avgResponseTime = 45; // 45 minutes average

    const stats = {
      total_conversations: totalResult[0]?.total || 0,
      active_conversations: activeResult[0]?.active || 0,
      unread_messages: unreadResult[0]?.unread || 0,
      today_messages: todayResult[0]?.today_messages || 0,
      response_time_avg: avgResponseTime,
      channels: {
        email: 0,
        sms: 0,
        whatsapp: 0,
      },
      by_priority: {
        low: 0,
        normal: 0,
        high: 0,
        urgent: 0,
      },
    };

    // Fill channel data
    channelResult.forEach((row) => {
      if (row.communication_type in stats.channels) {
        (stats.channels as any)[row.communication_type] = row.count;
      }
    });

    // Fill priority data
    priorityResult.forEach((row) => {
      if (row.priority in stats.by_priority) {
        (stats.by_priority as any)[row.priority] = row.count;
      }
    });

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching conversation stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversation statistics",
    });
  }
};

/**
 * GET /api/audit-logs
 * Get all audit logs with optional filters
 */
const handleGetAuditLogs: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const {
      actor_type,
      action,
      entity_type,
      status,
      from_date,
      to_date,
      limit = 100,
      offset = 0,
    } = req.query;

    // Build dynamic query
    let query = `
      SELECT 
        al.*,
        COALESCE(b.email, c.email) as actor_email,
        COALESCE(CONCAT(b.first_name, ' ', b.last_name), CONCAT(c.first_name, ' ', c.last_name)) as actor_name
      FROM audit_logs al
      LEFT JOIN brokers b ON al.broker_id = b.id
      LEFT JOIN clients c ON al.user_id = c.id
      WHERE al.tenant_id = ?
    `;

    const queryParams: any[] = [MORTGAGE_TENANT_ID];

    if (actor_type) {
      query += ` AND al.actor_type = ?`;
      queryParams.push(actor_type);
    }

    if (action) {
      query += ` AND al.action LIKE ?`;
      queryParams.push(`%${action}%`);
    }

    if (entity_type) {
      query += ` AND al.entity_type = ?`;
      queryParams.push(entity_type);
    }

    if (status) {
      query += ` AND al.status = ?`;
      queryParams.push(status);
    }

    if (from_date) {
      query += ` AND al.created_at >= ?`;
      queryParams.push(from_date);
    }

    if (to_date) {
      query += ` AND al.created_at <= ?`;
      queryParams.push(to_date);
    }

    query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit as string), parseInt(offset as string));

    const [logs] = await pool.query<RowDataPacket[]>(query, queryParams);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE tenant_id = ?`;
    const countParams: any[] = [MORTGAGE_TENANT_ID];

    if (actor_type) {
      countQuery += ` AND actor_type = ?`;
      countParams.push(actor_type);
    }

    if (action) {
      countQuery += ` AND action LIKE ?`;
      countParams.push(`%${action}%`);
    }

    if (entity_type) {
      countQuery += ` AND entity_type = ?`;
      countParams.push(entity_type);
    }

    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }

    if (from_date) {
      countQuery += ` AND created_at >= ?`;
      countParams.push(from_date);
    }

    if (to_date) {
      countQuery += ` AND created_at <= ?`;
      countParams.push(to_date);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      countQuery,
      countParams,
    );

    // Create audit log for viewing audit logs
    await createAuditLog({
      actorType: "broker",
      actorId: brokerId,
      action: "view_audit_logs",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      success: true,
      logs,
      total: countResult[0].total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch audit logs",
    });
  }
};

/**
 * GET /api/audit-logs/stats
 * Get audit log statistics
 */
const handleGetAuditLogStats: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;

    // Get various statistics
    const [totalLogs] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM audit_logs WHERE tenant_id = ?",
      [MORTGAGE_TENANT_ID],
    );

    const [logsByStatus] = await pool.query<RowDataPacket[]>(
      "SELECT status, COUNT(*) as count FROM audit_logs WHERE tenant_id = ? GROUP BY status",
      [MORTGAGE_TENANT_ID],
    );

    const [logsByActorType] = await pool.query<RowDataPacket[]>(
      "SELECT actor_type, COUNT(*) as count FROM audit_logs WHERE tenant_id = ? GROUP BY actor_type",
      [MORTGAGE_TENANT_ID],
    );

    const [logsByAction] = await pool.query<RowDataPacket[]>(
      `SELECT action, COUNT(*) as count 
       FROM audit_logs
       WHERE tenant_id = ? 
       GROUP BY action 
       ORDER BY count DESC 
       LIMIT 10`,
      [MORTGAGE_TENANT_ID],
    );

    const [recentActivity] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE(created_at) as date, 
        COUNT(*) as count 
       FROM audit_logs 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
    );

    res.json({
      success: true,
      stats: {
        total: totalLogs[0].count,
        byStatus: logsByStatus,
        byActorType: logsByActorType,
        topActions: logsByAction,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Error fetching audit log stats:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch audit log stats",
    });
  }
};

/**
 * GET /api/reports/overview
 * Get comprehensive report overview with all statistics
 */
const handleGetReportsOverview: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { from_date, to_date } = req.query;

    // Build date filter
    let dateFilter = "";
    const dateParams: any[] = [];
    if (from_date && to_date) {
      dateFilter = " AND created_at BETWEEN ? AND ?";
      dateParams.push(from_date, to_date);
    }

    // Loan statistics
    const [loanStats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_loans,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_loans,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending_loans,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as rejected_loans,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as in_review_loans,
        AVG(CAST(loan_amount AS DECIMAL(15,2))) as avg_loan_amount,
        SUM(CAST(loan_amount AS DECIMAL(15,2))) as total_loan_volume
      FROM loan_applications 
      WHERE broker_user_id = ? AND tenant_id = ?${dateFilter}`,
      [brokerId, MORTGAGE_TENANT_ID, ...dateParams],
    );

    // Loans by type
    const [loansByType] = await pool.query<RowDataPacket[]>(
      `SELECT loan_type, COUNT(*) as count 
       FROM loan_applications 
       WHERE broker_user_id = ? AND tenant_id = ?${dateFilter}
       GROUP BY loan_type`,
      [brokerId, MORTGAGE_TENANT_ID, ...dateParams],
    );

    // Loans by status over time
    const [loansTrend] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE(created_at) as date,
        status,
        COUNT(*) as count
       FROM loan_applications 
       WHERE broker_user_id = ? AND tenant_id = ?${dateFilter}
       GROUP BY DATE(created_at), status
       ORDER BY date DESC
       LIMIT 30`,
      [brokerId, MORTGAGE_TENANT_ID, ...dateParams],
    );

    // Client statistics
    const [clientStats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_clients,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_clients,
        AVG(credit_score) as avg_credit_score
      FROM clients 
      WHERE assigned_broker_id = ?${dateFilter}`,
      [brokerId, ...dateParams],
    );

    // Task statistics
    const [taskStats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks
      FROM tasks t
      JOIN loan_applications la ON t.application_id = la.id
      WHERE la.broker_user_id = ?${dateFilter.replace("created_at", "t.created_at")}`,
      [brokerId, ...dateParams],
    );

    // Communication statistics
    const [commStats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        communication_type,
        COUNT(*) as count
      FROM communications c
      JOIN loan_applications la ON c.application_id = la.id
      WHERE la.broker_user_id = ?${dateFilter.replace("created_at", "c.created_at")}
      GROUP BY communication_type`,
      [brokerId, ...dateParams],
    );

    // Document statistics
    const [docStats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_documents,
        SUM(CASE WHEN d.status = 'approved' THEN 1 ELSE 0 END) as verified_documents,
        document_type,
        COUNT(*) as count
      FROM documents d
      JOIN loan_applications la ON d.application_id = la.id
      WHERE la.broker_user_id = ?${dateFilter.replace("created_at", "d.created_at")}
      GROUP BY document_type`,
      [brokerId, ...dateParams],
    );

    res.json({
      success: true,
      data: {
        loans: loanStats[0],
        loansByType,
        loansTrend,
        clients: clientStats[0],
        tasks: taskStats[0],
        communications: commStats,
        documents: docStats,
      },
    });
  } catch (error) {
    console.error("Error fetching reports overview:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch reports overview",
    });
  }
};

/**
 * GET /api/reports/revenue
 * Get revenue and financial analytics
 */
const handleGetRevenueReport: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { from_date, to_date, group_by = "month" } = req.query;

    let dateFilter = "";
    const dateParams: any[] = [];
    if (from_date && to_date) {
      dateFilter = " AND created_at BETWEEN ? AND ?";
      dateParams.push(from_date, to_date);
    }

    // Group by month or week
    const dateFormat = group_by === "week" ? "%Y-%u" : "%Y-%m";

    const [revenue] = await pool.query<RowDataPacket[]>(
      `SELECT 
        DATE_FORMAT(created_at, ?) as period,
        COUNT(*) as loan_count,
        SUM(CAST(loan_amount AS DECIMAL(15,2))) as total_amount,
        AVG(CAST(loan_amount AS DECIMAL(15,2))) as avg_amount,
        loan_type
      FROM loan_applications 
      WHERE broker_user_id = ? AND tenant_id = ?${dateFilter}
      GROUP BY period, loan_type
      ORDER BY period DESC`,
      [dateFormat, brokerId, MORTGAGE_TENANT_ID, ...dateParams],
    );

    res.json({
      success: true,
      data: revenue,
    });
  } catch (error) {
    console.error("Error fetching revenue report:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch revenue report",
    });
  }
};

/**
 * GET /api/reports/performance
 * Get broker/team performance metrics
 */
const handleGetPerformanceReport: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { from_date, to_date } = req.query;

    let dateFilter = "";
    const dateParams: any[] = [];
    if (from_date && to_date) {
      dateFilter = " AND created_at BETWEEN ? AND ?";
      dateParams.push(from_date, to_date);
    }

    // Conversion rates
    const [conversionRate] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        ROUND((SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as approval_rate
      FROM loan_applications 
      WHERE broker_user_id = ? AND tenant_id = ?${dateFilter}`,
      [brokerId, MORTGAGE_TENANT_ID, ...dateParams],
    );

    // Average processing time
    const [processingTime] = await pool.query<RowDataPacket[]>(
      `SELECT 
        AVG(DATEDIFF(updated_at, created_at)) as avg_days,
        status
      FROM loan_applications 
      WHERE broker_user_id = ? AND tenant_id = ?${dateFilter}
      GROUP BY status`,
      [brokerId, MORTGAGE_TENANT_ID, ...dateParams],
    );

    // Task completion rate
    const [taskCompletion] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
        ROUND((SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as completion_rate,
        AVG(CASE WHEN t.status = 'completed' THEN DATEDIFF(t.updated_at, t.created_at) ELSE NULL END) as avg_completion_days
      FROM tasks t
      JOIN loan_applications la ON t.application_id = la.id
      WHERE la.broker_user_id = ?${dateFilter.replace("created_at", "t.created_at")}`,
      [brokerId, ...dateParams],
    );

    res.json({
      success: true,
      data: {
        conversionRate: conversionRate[0],
        processingTime,
        taskCompletion: taskCompletion[0],
      },
    });
  } catch (error) {
    console.error("Error fetching performance report:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch performance report",
    });
  }
};

/**
 * POST /api/reports/export
 * Export report data in various formats
 */
const handleExportReport: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { report_type, format = "csv", from_date, to_date } = req.body;

    // Create audit log
    await createAuditLog({
      actorType: "broker",
      actorId: brokerId,
      action: "export_report",
      entityType: "report",
      changes: { report_type, format, from_date, to_date },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      success: true,
      message: "Report export initiated. Download will begin shortly.",
      download_url: `/api/reports/download/${report_type}?format=${format}`,
    });
  } catch (error) {
    console.error("Error exporting report:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to export report",
    });
  }
};

// =====================================================
// =====================================================
// SYSTEM SETTINGS HANDLERS
// =====================================================

/**
 * GET /api/settings
 * Returns all system settings for the authenticated broker's tenant.
 */
const handleGetSettings: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ? LIMIT 1",
      [brokerId],
    );
    if (!tenantRows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Broker not found" });
    }
    const tenantId = tenantRows[0].tenant_id;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM system_settings
       WHERE tenant_id = ? OR tenant_id IS NULL
       ORDER BY tenant_id DESC, setting_key ASC`,
      [tenantId],
    );

    // Deduplicate: prefer tenant-scoped over global
    const seen = new Set<string>();
    const settings = rows.filter((r) => {
      if (seen.has(r.setting_key)) return false;
      seen.add(r.setting_key);
      return true;
    });

    return res.json({ success: true, settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch settings" });
  }
};

/**
 * PUT /api/settings
 * Batch-upsert system settings for the authenticated broker's tenant.
 * Admin only.
 */
const handleUpdateSettings: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const brokerRole = (req as any).brokerRole;
    if (brokerRole !== "admin" && brokerRole !== "superadmin") {
      return res
        .status(403)
        .json({ success: false, error: "Admin access required" });
    }

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ? LIMIT 1",
      [brokerId],
    );
    if (!tenantRows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Broker not found" });
    }
    const tenantId = tenantRows[0].tenant_id;

    const { updates } = req.body as {
      updates: { setting_key: string; setting_value: string }[];
    };
    if (!Array.isArray(updates) || updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "updates array is required" });
    }

    for (const { setting_key, setting_value } of updates) {
      await pool.query(
        `INSERT INTO system_settings (tenant_id, setting_key, setting_value, updated_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
        [tenantId, setting_key, setting_value],
      );
    }

    await createAuditLog({
      actorType: "broker",
      actorId: brokerId,
      action: "update_system_settings",
      entityType: "system_settings",
      entityId: tenantId,
      changes: { keys: updates.map((u) => u.setting_key) },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to update settings" });
  }
};

// =====================================================
// ADMIN SECTION CONTROLS HANDLERS
// =====================================================

/**
 * GET /api/admin/section-controls
 * Returns the enabled/disabled state and tooltip messages for all admin sidebar sections.
 */
const handleGetAdminSectionControls: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ? LIMIT 1",
      [brokerId],
    );
    if (!tenantRows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Broker not found" });
    }
    const tenantId = tenantRows[0].tenant_id;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM admin_section_controls WHERE tenant_id = ? ORDER BY id ASC`,
      [tenantId],
    );

    const controls = rows.map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      section_id: r.section_id,
      is_disabled: r.is_disabled === 1 || r.is_disabled === true,
      tooltip_message: r.tooltip_message || "Coming Soon",
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return res.json({ success: true, controls });
  } catch (error) {
    console.error("Error fetching admin section controls:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch admin section controls",
    });
  }
};

/**
 * PUT /api/admin/section-controls
 * Batch-upsert admin section controls. Admin only.
 */
const handleUpdateAdminSectionControls: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const brokerRole = (req as any).brokerRole;
    if (brokerRole !== "admin" && brokerRole !== "superadmin") {
      return res
        .status(403)
        .json({ success: false, error: "Admin access required" });
    }

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ? LIMIT 1",
      [brokerId],
    );
    if (!tenantRows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Broker not found" });
    }
    const tenantId = tenantRows[0].tenant_id;

    const { controls } = req.body as {
      controls: {
        section_id: string;
        is_disabled: boolean;
        tooltip_message?: string;
      }[];
    };

    if (!Array.isArray(controls) || controls.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "controls array is required" });
    }

    for (const { section_id, is_disabled, tooltip_message } of controls) {
      await pool.query(
        `INSERT INTO admin_section_controls (tenant_id, section_id, is_disabled, tooltip_message, updated_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           is_disabled = VALUES(is_disabled),
           tooltip_message = VALUES(tooltip_message),
           updated_at = NOW()`,
        [
          tenantId,
          section_id,
          is_disabled ? 1 : 0,
          tooltip_message ?? "Coming Soon",
        ],
      );
    }

    await createAuditLog({
      actorType: "broker",
      actorId: brokerId,
      action: "update_admin_section_controls",
      entityType: "admin_section_controls",
      entityId: tenantId,
      changes: { sections: controls.map((c) => c.section_id) },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({
      success: true,
      message: "Section controls updated successfully",
    });
  } catch (error) {
    console.error("Error updating admin section controls:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update admin section controls",
    });
  }
};

/**
 * GET /api/admin/init
 * Single bootstrap endpoint — returns broker profile + section controls in one
 * round-trip. Replaces separate calls to /validate, /profile, /section-controls.
 */
const handleAdminInit: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;

    // Fetch full broker profile with broker_profiles join
    const [profileRows] = await pool.query<any[]>(
      `SELECT
        b.id, b.email, b.first_name, b.last_name, b.phone, b.role,
        b.license_number, b.specializations, b.tenant_id,
        bp.bio, bp.avatar_url, bp.office_address, bp.office_city,
        bp.office_state, bp.office_zip, bp.years_experience,
        COALESCE(bp.total_loans_closed, 0) AS total_loans_closed
      FROM brokers b
      LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
      WHERE b.id = ? AND b.tenant_id = ?`,
      [brokerId, MORTGAGE_TENANT_ID],
    );

    if (profileRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Broker not found" });
    }

    const profile = profileRows[0];
    if (typeof profile.specializations === "string") {
      try {
        profile.specializations = JSON.parse(profile.specializations);
      } catch {
        profile.specializations = [];
      }
    }

    // Fetch section controls for this tenant
    const [controlRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM admin_section_controls WHERE tenant_id = ? ORDER BY id ASC`,
      [profile.tenant_id],
    );

    const controls = controlRows.map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      section_id: r.section_id,
      is_disabled: r.is_disabled === 1 || r.is_disabled === true,
      tooltip_message: r.tooltip_message || "Coming Soon",
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return res.json({ success: true, profile, controls });
  } catch (error) {
    console.error("Error in admin init:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to initialise admin session" });
  }
};

// =====================================================
// PRE-APPROVAL LETTER HANDLERS
// =====================================================

/**
 * Build default pre-approval HTML content.
 * Placeholders wrapped in {{...}} will be replaced by data at render time.
 */
function buildSignatureSectionHtml(letter: Record<string, any>): string {
  const brokerPhotoHtml = letter.broker_photo_url
    ? `<div style="width:72px; height:72px; border-radius:50%; overflow:hidden; border:3px solid #1a3a5c; box-sizing:border-box;"><img src="${letter.broker_photo_url}" style="width:100%; height:100%; object-fit:cover; display:block;" /></div>`
    : `<div style="width:72px; height:72px; border-radius:50%; background:#e8edf5; border:3px solid #1a3a5c; text-align:center; line-height:72px; font-size:24px; font-weight:bold; color:#1a3a5c; box-sizing:border-box;">${(letter.broker_first_name?.[0] ?? "") + (letter.broker_last_name?.[0] ?? "")}</div>`;

  const mbLicenseHtml = letter.broker_license_number
    ? `<p style="margin:3px 0; font-size:13px; color:#555;">NMLS# ${letter.broker_license_number}</p>`
    : "";

  const isPartnerLoan =
    letter.loan_broker_role === "broker" && letter.partner_first_name;

  if (isPartnerLoan) {
    const partnerLicenseHtml = letter.partner_license_number
      ? `<p style="margin:3px 0; font-size:13px; color:#555;">NMLS# ${letter.partner_license_number}</p>`
      : "";
    const partnerPhotoHtml = letter.partner_photo_url
      ? `<div style="width:72px; height:72px; border-radius:50%; overflow:hidden; border:3px solid #1a3a5c; box-sizing:border-box;"><img src="${letter.partner_photo_url}" style="width:100%; height:100%; object-fit:cover; display:block;" /></div>`
      : `<div style="width:72px; height:72px; border-radius:50%; background:#e8edf5; border:3px solid #1a3a5c; text-align:center; line-height:72px; font-size:24px; font-weight:bold; color:#1a3a5c; box-sizing:border-box;">${(letter.partner_first_name?.[0] ?? "") + (letter.partner_last_name?.[0] ?? "")}</div>`;
    return `<table style="width: 100%; border-collapse: collapse;">
  <tr>
    <td style="vertical-align: top; width: 88px;">${brokerPhotoHtml}</td>
    <td style="vertical-align: top; padding-left: 16px; padding-right: 28px; font-size: 13px; border-right: 1px solid #e5e7eb;">
      <p style="margin: 0 0 3px;"><strong>${letter.broker_first_name ?? ""} ${letter.broker_last_name ?? ""}</strong></p>
      <p style="margin: 0 0 3px; color: #444;">Mortgage Banker</p>
      ${mbLicenseHtml}
      <p style="margin: 3px 0; color: #444;">${letter.company_name ?? "The Mortgage Professionals"}</p>
      <p style="margin: 3px 0; color: #444;">${letter.broker_phone ?? ""}</p>
      <p style="margin: 0; color: #444;">${letter.broker_email ?? ""}</p>
    </td>
    <td style="vertical-align: top; padding-left: 24px; padding-right: 0; width: 88px;">${partnerPhotoHtml}</td>
    <td style="vertical-align: top; padding-left: 16px; font-size: 13px;">
      <p style="margin: 0 0 3px;"><strong>${letter.partner_first_name} ${letter.partner_last_name}</strong></p>
      <p style="margin: 0 0 3px; color: #444;">Partner</p>
      ${partnerLicenseHtml}
      <p style="margin: 3px 0; color: #444;">${letter.partner_phone ?? ""}</p>
      <p style="margin: 0; color: #444;">${letter.partner_email ?? ""}</p>
    </td>
  </tr>
</table>`;
  }

  return `<table style="width: 100%; border-collapse: collapse;">
  <tr>
    <td style="vertical-align: top; width: 88px;">${brokerPhotoHtml}</td>
    <td style="vertical-align: top; padding-left: 16px; font-size: 13px;">
      <p style="margin: 0 0 3px;"><strong>${letter.broker_first_name ?? ""} ${letter.broker_last_name ?? ""}</strong></p>
      <p style="margin: 0 0 3px; color: #444;">Mortgage Banker</p>
      ${mbLicenseHtml}
      <p style="margin: 3px 0; color: #444;">${letter.company_name ?? "The Mortgage Professionals"}</p>
      <p style="margin: 3px 0; color: #444;">${letter.broker_phone ?? ""}</p>
      <p style="margin: 0; color: #444;">${letter.broker_email ?? ""}</p>
    </td>
  </tr>
</table>`;
}

function buildDefaultPreApprovalHtml(): string {
  return `<div style="font-family: Arial, Helvetica, sans-serif; width: 100%; box-sizing: border-box; padding: 48px; background: #fff; color: #222;">

  <!-- HEADER: Logo left, company info right -->
  <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
    <tr>
      <td style="vertical-align: top; width: 55%;">
        {{COMPANY_LOGO}}
      </td>
      <td style="vertical-align: top; text-align: right; font-size: 13px; color: #333; line-height: 1.8;">
        <strong>{{COMPANY_NAME}}</strong><br>
        P. {{COMPANY_PHONE}}<br>
        NMLS# {{COMPANY_NMLS}}
      </td>
    </tr>
  </table>

  <hr style="border: none; border-top: 1px solid #ccc; margin-bottom: 20px;">

  <!-- DATE + EXPIRES row -->
  <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
    <tr>
      <td style="font-size: 13px;">Date: {{LETTER_DATE}}</td>
      <td style="font-size: 13px; text-align: right;">Expires: {{EXPIRES_SHORT}}</td>
    </tr>
  </table>

  <!-- RE LINE -->
  <p style="margin: 0 0 20px; font-size: 13px;">Re: {{CLIENT_FULL_NAME}}</p>

  <hr style="border: none; border-top: 1px solid #ccc; margin-bottom: 20px;">

  <!-- BODY -->
  <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.7;">
    This letter shall serve as a pre-approval for a loan in connection with the purchase transaction for the above referenced buyer(s). Based on preliminary information, a pre-approval is herein granted with the following terms:
  </p>

  <!-- LOAN DETAILS -->
  <p style="margin: 0 0 5px; font-size: 13px;">Purchase Price: {{APPROVED_AMOUNT}}</p>
  <p style="margin: 0 0 5px; font-size: 13px;">Loan Type: {{LOAN_TYPE}}</p>
  <p style="margin: 0 0 5px; font-size: 13px;">Term: 30 years</p>
  <p style="margin: 0 0 5px; font-size: 13px;">FICO Score: {{FICO_SCORE}}</p>
  <p style="margin: 0 0 20px; font-size: 13px;">Property Address: {{PROPERTY_ADDRESS}}</p>

  <!-- REVIEWED SECTION -->
  <p style="margin: 0 0 8px; font-size: 13px;"><strong>We have reviewed the following:</strong></p>
  <ul style="margin: 0 0 20px; padding-left: 24px; font-size: 13px; line-height: 1.9;">
    <li>Reviewed applicant&#39;s credit report and credit score</li>
    <li>Verified applicant&#39;s income documentation and debt to income ratio</li>
    <li>Verified applicant&#39;s assets documentation</li>
  </ul>

  <!-- DISCLAIMER -->
  <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.7;">
    Disclaimer: <strong>Loan Contingency.</strong> Even though a buyer may hold a pre-approval letter, further investigations concerning the property or the borrower could result in a loan denial. We suggest the buyer consider a loan contingency requirement in the purchase contract (to protect earnest money deposit) in accordance with applicable state law.
  </p>

  <!-- BROKER + PARTNER SIGNATURE -->
  {{BROKER_SIGNATURE_SECTION}}

</div>`;
}

/**
 * Build the default branded email HTML for sending a pre-approval letter.
 */
function buildDefaultPreApprovalEmailHtml(params: {
  logoUrl: string;
  companyName: string;
  companyAddress: string;
  clientFirstName: string;
  brokerName: string;
  brokerPhone: string;
  brokerEmail: string;
  brokerNmls: string;
  approvedAmount: number;
  letterDateFormatted: string;
  expiresShort: string;
  propertyAddr: string;
  pdfFilename: string;
  hasPdf: boolean;
  customMessage?: string;
}): string {
  const {
    logoUrl,
    companyName,
    companyAddress,
    clientFirstName,
    brokerName,
    brokerPhone,
    brokerEmail,
    brokerNmls,
    approvedAmount,
    letterDateFormatted,
    expiresShort,
    propertyAddr,
    pdfFilename,
    hasPdf,
    customMessage,
  } = params;

  const amountFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(approvedAmount);

  const customBlock = customMessage?.trim()
    ? `<tr><td style="padding:0 0 20px 0;">
        <div style="background:#f8fafc;border-left:4px solid #0A2F52;border-radius:0 8px 8px 0;padding:14px 18px;font-size:14px;color:#333;line-height:1.6;">${customMessage.trim()}</div>
       </td></tr>`
    : "";

  const expiresRow = expiresShort
    ? `<tr>
         <td style="padding:6px 0;color:#64748b;font-size:13px;width:160px;">Valid Until</td>
         <td style="padding:6px 0;color:#0f172a;font-size:14px;">${expiresShort}</td>
       </tr>`
    : "";

  const brokerPhoneLine = brokerPhone
    ? `<p style="margin:2px 0 0;color:#475569;font-size:13px;">📞 ${brokerPhone}</p>`
    : "";
  const brokerEmailLine = brokerEmail
    ? `<p style="margin:2px 0 0;color:#475569;font-size:13px;">✉ ${brokerEmail}</p>`
    : "";
  const brokerNmlsLine = brokerNmls
    ? `<p style="margin:2px 0 0;color:#94a3b8;font-size:12px;">NMLS# ${brokerNmls}</p>`
    : "";

  const attachNote = hasPdf
    ? `<tr><td style="padding:16px 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;">
              <p style="margin:0;color:#166534;font-size:13px;">📎 <strong>${pdfFilename}</strong> is attached to this email.</p>
            </td>
          </tr>
        </table>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pre-Approval Letter</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background-color:#ffffff;padding:24px 32px;border-radius:16px 16px 0 0;border-bottom:3px solid #0A2F52;text-align:center;">
            <img src="${logoUrl}" alt="${companyName}" style="height:52px;width:auto;display:inline-block;" />
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:40px 32px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${customBlock}
              <tr>
                <td style="padding:0 0 8px 0;">
                  <h2 style="margin:0;color:#0f172a;font-size:22px;font-weight:700;">Congratulations, ${clientFirstName || "Applicant"}!</h2>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 24px 0;color:#475569;font-size:15px;line-height:1.6;">
                  Your pre-approval letter is ready. Please find it attached to this email as a PDF.
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 20px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                    <tr>
                      <td style="padding:20px 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="padding:6px 0;color:#64748b;font-size:13px;width:160px;">Pre-Approved Amount</td>
                            <td style="padding:6px 0;color:#0A2F52;font-size:18px;font-weight:700;">${amountFormatted}</td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;color:#64748b;font-size:13px;">Letter Date</td>
                            <td style="padding:6px 0;color:#0f172a;font-size:14px;">${letterDateFormatted}</td>
                          </tr>
                          ${expiresRow}
                          <tr>
                            <td style="padding:6px 0;color:#64748b;font-size:13px;">Property</td>
                            <td style="padding:6px 0;color:#0f172a;font-size:14px;">${propertyAddr || "TBD"}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${attachNote}
              <tr>
                <td style="padding:20px 0 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <p style="margin:0 0 2px;color:#0f172a;font-size:14px;font-weight:600;">${brokerName}</p>
                        ${brokerPhoneLine}
                        ${brokerEmailLine}
                        ${brokerNmlsLine}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#0f172a;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
            <p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-weight:600;">${companyName}</p>
            <p style="margin:0;color:#94a3b8;font-size:12px;">${companyAddress}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * GET /api/loans/:loanId/pre-approval-letter
 * Fetch the pre-approval letter for a loan (with all joined data).
 */
const handleGetPreApprovalLetter: RequestHandler = async (req, res) => {
  try {
    const { loanId } = req.params;
    const brokerId = (req as any).brokerId;

    // Verify the loan exists (tenant-scoped)
    const [loanRows] = await pool.query<RowDataPacket[]>(
      `SELECT la.id, la.tenant_id FROM loan_applications la WHERE la.id = ? AND la.tenant_id = (
          SELECT tenant_id FROM brokers WHERE id = ? LIMIT 1
       )`,
      [loanId, brokerId],
    );
    if (!loanRows.length) {
      return res.status(404).json({ success: false, error: "Loan not found" });
    }
    const tenantId = loanRows[0].tenant_id;

    // Fetch letter with joined fields
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
          pal.*,
          b.first_name  AS broker_first_name,
          b.last_name   AS broker_last_name,
          b.email       AS broker_email,
          b.phone       AS broker_phone,
          b.license_number AS broker_license_number,
          bp.avatar_url AS broker_photo_url,
          lb.role          AS loan_broker_role,
          lb.first_name    AS partner_first_name,
          lb.last_name     AS partner_last_name,
          lb.email         AS partner_email,
          lb.phone         AS partner_phone,
          lb.license_number AS partner_license_number,
          lbp.avatar_url   AS partner_photo_url,
          c.first_name  AS client_first_name,
          c.last_name   AS client_last_name,
          c.email       AS client_email,
          la.property_address,
          la.property_city,
          la.property_state,
          la.property_zip,
          la.application_number,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_logo_url'  AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_logo_url,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_name'      AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_name,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_address'   AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_address,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_phone'     AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_phone,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_nmls'      AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_nmls
       FROM pre_approval_letters pal
       INNER JOIN brokers b_creator ON pal.created_by_broker_id = b_creator.id
       LEFT JOIN brokers b ON b.id = IF(b_creator.role = 'admin', b_creator.id, COALESCE(b_creator.created_by_broker_id, b_creator.id))
       LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
       INNER JOIN loan_applications la ON pal.application_id = la.id
       LEFT JOIN brokers lb ON la.partner_broker_id = lb.id
       LEFT JOIN broker_profiles lbp ON lbp.broker_id = lb.id
       INNER JOIN clients c ON la.client_user_id = c.id
       WHERE pal.application_id = ? AND pal.tenant_id = ?
       ORDER BY pal.created_at DESC
       LIMIT 1`,
      [tenantId, tenantId, tenantId, tenantId, tenantId, loanId, tenantId],
    );

    if (!rows.length) {
      return res.json({ success: true, letter: null });
    }

    const letter = {
      ...rows[0],
      approved_amount: parseFloat(rows[0].approved_amount),
      max_approved_amount: parseFloat(rows[0].max_approved_amount),
      is_active: !!rows[0].is_active,
    };

    return res.json({ success: true, letter });
  } catch (error) {
    console.error("Error fetching pre-approval letter:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch pre-approval letter",
    });
  }
};

/**
 * POST /api/loans/:loanId/pre-approval-letter
 * Create a pre-approval letter for a loan. Admin only (sets max_approved_amount).
 */
const handleCreatePreApprovalLetter: RequestHandler = async (req, res) => {
  try {
    const { loanId } = req.params;
    const brokerId = (req as any).brokerId;
    const brokerRole: string = (req as any).brokerRole;
    const isAdmin = brokerRole === "admin" || brokerRole === "superadmin";

    const [
      max_approved_amount,
      approved_amount,
      html_content,
      letter_date,
      expires_at,
      loan_type,
      fico_score,
    ] = [
      req.body.max_approved_amount,
      req.body.approved_amount,
      req.body.html_content,
      req.body.letter_date,
      req.body.expires_at,
      req.body.loan_type,
      req.body.fico_score,
    ];

    if (!approved_amount || isNaN(Number(approved_amount))) {
      return res
        .status(400)
        .json({ success: false, error: "approved_amount is required" });
    }

    // Partners cannot set max — their max equals their approved amount
    const effectiveMax =
      isAdmin && max_approved_amount
        ? Number(max_approved_amount)
        : Number(approved_amount);

    if (Number(approved_amount) > effectiveMax) {
      return res.status(400).json({
        success: false,
        error: "approved_amount cannot exceed max_approved_amount",
      });
    }

    // Get loan (tenant-scoped)
    const [loanRows] = await pool.query<RowDataPacket[]>(
      `SELECT la.* FROM loan_applications la WHERE la.id = ? AND la.tenant_id = (
          SELECT tenant_id FROM brokers WHERE id = ? LIMIT 1
       )`,
      [loanId, brokerId],
    );
    if (!loanRows.length) {
      return res.status(404).json({ success: false, error: "Loan not found" });
    }
    const loan = loanRows[0];

    // Check for existing letter (one per loan)
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM pre_approval_letters WHERE application_id = ? AND tenant_id = ?",
      [loanId, loan.tenant_id],
    );
    if (existing.length) {
      return res.status(409).json({
        success: false,
        error:
          "A pre-approval letter already exists for this loan. Use PUT to update it.",
      });
    }

    // Partners cannot provide custom HTML — always use the default template
    const finalHtml =
      isAdmin && html_content?.trim()
        ? html_content.trim()
        : buildDefaultPreApprovalHtml();
    const finalDate = letter_date || new Date().toISOString().split("T")[0];

    const [result] = await pool.query<any>(
      `INSERT INTO pre_approval_letters
         (tenant_id, application_id, approved_amount, max_approved_amount, html_content, letter_date, expires_at, loan_type, fico_score, is_active, created_by_broker_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        loan.tenant_id,
        loanId,
        Number(approved_amount),
        effectiveMax,
        finalHtml,
        finalDate,
        expires_at || null,
        loan_type || null,
        fico_score ? Number(fico_score) : null,
        brokerId,
      ],
    );
    const newId = result.insertId;

    // Add to documents table so it shows in the documents section
    await pool.query(
      `INSERT INTO documents
         (tenant_id, application_id, uploaded_by_broker_id, document_type, document_name, file_path, mime_type, status, is_required)
       VALUES (?, ?, ?, 'other', ?, ?, 'text/html', 'approved', 0)`,
      [
        loan.tenant_id,
        loanId,
        brokerId,
        `Pre-Approval Letter - ${new Date(finalDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        `/pre-approval-letters/${newId}`,
      ],
    );

    // Audit log
    await createAuditLog({
      actorType: "broker",
      actorId: brokerId,
      action: "create_pre_approval_letter",
      entityType: "pre_approval_letter",
      entityId: newId,
      changes: { application_id: loanId, approved_amount, max_approved_amount },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Return the full letter
    const [letterRows] = await pool.query<RowDataPacket[]>(
      `SELECT
          pal.*,
          b.first_name AS broker_first_name, b.last_name AS broker_last_name,
          b.email AS broker_email, b.phone AS broker_phone,
          b.license_number AS broker_license_number, bp.avatar_url AS broker_photo_url,
          lb.role AS loan_broker_role, lb.first_name AS partner_first_name, lb.last_name AS partner_last_name,
          lb.email AS partner_email, lb.phone AS partner_phone,
          lb.license_number AS partner_license_number, lbp.avatar_url AS partner_photo_url,
          c.first_name AS client_first_name, c.last_name AS client_last_name, c.email AS client_email,
          la.property_address, la.property_city, la.property_state, la.property_zip, la.application_number,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_logo_url' AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_logo_url,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_name'     AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_name,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_address'  AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_address,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_phone'    AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_phone,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_nmls'     AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_nmls
       FROM pre_approval_letters pal
       INNER JOIN brokers b_creator ON pal.created_by_broker_id = b_creator.id
       LEFT JOIN brokers b ON b.id = IF(b_creator.role = 'admin', b_creator.id, COALESCE(b_creator.created_by_broker_id, b_creator.id))
       LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
       INNER JOIN loan_applications la ON pal.application_id = la.id
       LEFT JOIN brokers lb ON la.partner_broker_id = lb.id
       LEFT JOIN broker_profiles lbp ON lbp.broker_id = lb.id
       INNER JOIN clients c ON la.client_user_id = c.id
       WHERE pal.id = ?`,
      [
        loan.tenant_id,
        loan.tenant_id,
        loan.tenant_id,
        loan.tenant_id,
        loan.tenant_id,
        newId,
      ],
    );

    const letter = {
      ...letterRows[0],
      approved_amount: parseFloat(letterRows[0].approved_amount),
      max_approved_amount: parseFloat(letterRows[0].max_approved_amount),
      is_active: !!letterRows[0].is_active,
    };

    return res.status(201).json({
      success: true,
      letter,
      message: "Pre-approval letter created successfully",
    });
  } catch (error) {
    console.error("Error creating pre-approval letter:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create pre-approval letter",
    });
  }
};

/**
 * PUT /api/loans/:loanId/pre-approval-letter
 * Update the pre-approval letter. Any broker can update html_content, approved_amount (≤ max).
 * Only admin can update max_approved_amount or is_active.
 */
const handleUpdatePreApprovalLetter: RequestHandler = async (req, res) => {
  try {
    const { loanId } = req.params;
    const brokerId = (req as any).brokerId;
    const brokerRole: string = (req as any).brokerRole;

    // Get broker's tenant
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    if (!tenantRows.length) {
      return res
        .status(401)
        .json({ success: false, error: "Broker not found" });
    }
    const tenantId = tenantRows[0].tenant_id;

    // Fetch existing letter
    const [letterRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM pre_approval_letters WHERE application_id = ? AND tenant_id = ?",
      [loanId, tenantId],
    );
    if (!letterRows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Pre-approval letter not found" });
    }
    const existing = letterRows[0];

    const {
      approved_amount,
      html_content,
      letter_date,
      expires_at,
      is_active,
    } = req.body;

    // max_approved_amount is locked after creation — delete and recreate to change it
    const newMax = parseFloat(existing.max_approved_amount);
    const newAmount =
      approved_amount !== undefined
        ? Number(approved_amount)
        : parseFloat(existing.approved_amount);

    if (newAmount > newMax) {
      return res.status(400).json({
        success: false,
        error: `approved_amount (${newAmount}) cannot exceed max_approved_amount (${newMax})`,
      });
    }

    // Non-admins cannot edit HTML content
    if (html_content !== undefined && brokerRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Only admin brokers can edit the letter content",
      });
    }

    // Build update
    const updates: string[] = [];
    const values: any[] = [];

    if (approved_amount !== undefined) {
      updates.push("approved_amount = ?");
      values.push(newAmount);
    }
    if (html_content !== undefined) {
      updates.push("html_content = ?");
      values.push(html_content);
    }
    if (letter_date !== undefined) {
      updates.push("letter_date = ?");
      values.push(letter_date);
    }
    if (expires_at !== undefined) {
      updates.push("expires_at = ?");
      values.push(expires_at || null);
    }
    if (is_active !== undefined && brokerRole === "admin") {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    updates.push("updated_by_broker_id = ?");
    values.push(brokerId);

    if (updates.length === 1) {
      return res
        .status(400)
        .json({ success: false, error: "No valid fields to update" });
    }

    values.push(existing.id);
    await pool.query(
      `UPDATE pre_approval_letters SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    // Also update the document record name if date changed
    if (letter_date !== undefined) {
      await pool.query(
        `UPDATE documents SET document_name = ? WHERE application_id = ? AND file_path = ? AND tenant_id = ?`,
        [
          `Pre-Approval Letter - ${new Date(letter_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
          loanId,
          `/pre-approval-letters/${existing.id}`,
          tenantId,
        ],
      );
    }

    // Audit log
    await createAuditLog({
      actorType: "broker",
      actorId: brokerId,
      action: "update_pre_approval_letter",
      entityType: "pre_approval_letter",
      entityId: existing.id,
      changes: {
        approved_amount,
        html_content: html_content ? "(updated)" : undefined,
        letter_date,
        expires_at,
        is_active,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Return updated letter
    const [updated] = await pool.query<RowDataPacket[]>(
      `SELECT
          pal.*,
          b.first_name AS broker_first_name, b.last_name AS broker_last_name,
          b.email AS broker_email, b.phone AS broker_phone,
          b.license_number AS broker_license_number, bp.avatar_url AS broker_photo_url,
          lb.role AS loan_broker_role, lb.first_name AS partner_first_name, lb.last_name AS partner_last_name,
          lb.email AS partner_email, lb.phone AS partner_phone,
          lb.license_number AS partner_license_number, lbp.avatar_url AS partner_photo_url,
          c.first_name AS client_first_name, c.last_name AS client_last_name, c.email AS client_email,
          la.property_address, la.property_city, la.property_state, la.property_zip, la.application_number,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_logo_url' AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_logo_url,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_name'     AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_name,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_address'  AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_address,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_phone'    AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_phone,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_nmls'     AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_nmls
       FROM pre_approval_letters pal
       INNER JOIN brokers b_creator ON pal.created_by_broker_id = b_creator.id
       LEFT JOIN brokers b ON b.id = IF(b_creator.role = 'admin', b_creator.id, COALESCE(b_creator.created_by_broker_id, b_creator.id))
       LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
       INNER JOIN loan_applications la ON pal.application_id = la.id
       LEFT JOIN brokers lb ON la.partner_broker_id = lb.id
       LEFT JOIN broker_profiles lbp ON lbp.broker_id = lb.id
       INNER JOIN clients c ON la.client_user_id = c.id
       WHERE pal.id = ?`,
      [tenantId, tenantId, tenantId, tenantId, tenantId, existing.id],
    );

    const letter = {
      ...updated[0],
      approved_amount: parseFloat(updated[0].approved_amount),
      max_approved_amount: parseFloat(updated[0].max_approved_amount),
      is_active: !!updated[0].is_active,
    };

    return res.json({
      success: true,
      letter,
      message: "Pre-approval letter updated successfully",
    });
  } catch (error) {
    console.error("Error updating pre-approval letter:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update pre-approval letter",
    });
  }
};

/**
 * POST /api/loans/:loanId/pre-approval-letter/send-email
 * Send the rendered pre-approval letter as an HTML email to the client.
 * Optionally wraps inside an existing email template body.
 */
const handleSendPreApprovalLetterEmail: RequestHandler = async (req, res) => {
  try {
    const { loanId } = req.params;
    const brokerId = (req as any).brokerId;
    const { subject, custom_message, template_id, pdf_base64 } = req.body;

    // Get broker's tenant
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    if (!tenantRows.length) {
      return res
        .status(401)
        .json({ success: false, error: "Broker not found" });
    }
    const tenantId = tenantRows[0].tenant_id;

    // Fetch letter with all joined data
    const [letterRows] = await pool.query<RowDataPacket[]>(
      `SELECT
          pal.*,
          b.first_name AS broker_first_name, b.last_name AS broker_last_name,
          b.email AS broker_email, b.phone AS broker_phone,
          b.license_number AS broker_license_number, bp.avatar_url AS broker_photo_url,
          lb.role AS loan_broker_role, lb.first_name AS partner_first_name, lb.last_name AS partner_last_name,
          lb.email AS partner_email, lb.phone AS partner_phone,
          lb.license_number AS partner_license_number, lbp.avatar_url AS partner_photo_url,
          c.first_name AS client_first_name, c.last_name AS client_last_name,
          c.email AS client_email, c.id AS client_id,
          la.property_address, la.property_city, la.property_state, la.property_zip, la.application_number,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_logo_url' AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_logo_url,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_name'     AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_name,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_address'  AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_address,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_phone'    AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_phone,
          (SELECT setting_value FROM system_settings WHERE setting_key = 'company_nmls'     AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY tenant_id DESC LIMIT 1) AS company_nmls
       FROM pre_approval_letters pal
       INNER JOIN brokers b_creator ON pal.created_by_broker_id = b_creator.id
       LEFT JOIN brokers b ON b.id = IF(b_creator.role = 'admin', b_creator.id, COALESCE(b_creator.created_by_broker_id, b_creator.id))
       LEFT JOIN broker_profiles bp ON bp.broker_id = b.id
       INNER JOIN loan_applications la ON pal.application_id = la.id
       LEFT JOIN brokers lb ON la.partner_broker_id = lb.id
       LEFT JOIN broker_profiles lbp ON lbp.broker_id = lb.id
       INNER JOIN clients c ON la.client_user_id = c.id
       WHERE pal.application_id = ? AND pal.tenant_id = ? AND pal.is_active = 1
       ORDER BY pal.created_at DESC LIMIT 1`,
      [tenantId, tenantId, tenantId, tenantId, tenantId, loanId, tenantId],
    );

    if (!letterRows.length) {
      return res.status(404).json({
        success: false,
        error: "No active pre-approval letter found for this loan",
      });
    }

    const letter = letterRows[0];

    if (!letter.client_email) {
      return res.status(400).json({
        success: false,
        error: "Client has no email address on file",
      });
    }

    // --- Build placeholder map (same logic as frontend renderer) ---
    const approvedAmount = parseFloat(letter.approved_amount);
    const clientName =
      `${letter.client_first_name ?? ""} ${letter.client_last_name ?? ""}`.trim();
    const propertyAddr = [
      letter.property_address,
      letter.property_city,
      letter.property_state,
      letter.property_zip,
    ]
      .filter(Boolean)
      .join(", ");

    const letterDateFormatted = letter.letter_date
      ? new Date(letter.letter_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

    const expiryNote = letter.expires_at
      ? `This pre-approval is valid through <strong>${new Date(letter.expires_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>. After this date a new pre-qualification review will be required.`
      : `This pre-approval letter does not have a set expiration date; however, your financial circumstances, creditworthiness, and market conditions are subject to change.`;

    const expiresShort = letter.expires_at
      ? new Date(letter.expires_at).toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        })
      : "";

    const logoHtml = letter.company_logo_url
      ? `<img src="${letter.company_logo_url}" alt="${letter.company_name ?? "Company"} Logo" style="max-height:64px; max-width:200px; object-fit:contain;" />`
      : `<div style="font-size:20px; font-weight:bold; color:#1a3a5c;">${letter.company_name ?? "The Mortgage Professionals"}</div>`;

    const brokerPhotoHtml = letter.broker_photo_url
      ? `<img src="${letter.broker_photo_url}" alt="${letter.broker_first_name ?? ""} ${letter.broker_last_name ?? ""}" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid #1a3a5c;" />`
      : `<div style="width:72px; height:72px; border-radius:50%; background:#e8edf5; border:3px solid #1a3a5c; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold; color:#1a3a5c;">${(letter.broker_first_name?.[0] ?? "") + (letter.broker_last_name?.[0] ?? "")}</div>`;

    const brokerLicenseHtml = letter.broker_license_number
      ? `<p style="margin:4px 0 0; font-size:13px; color:#555;">NMLS# ${letter.broker_license_number}</p>`
      : "";

    const placeholders: Record<string, string> = {
      "{{COMPANY_LOGO}}": logoHtml,
      "{{COMPANY_ADDRESS}}": letter.company_address ?? "",
      "{{COMPANY_PHONE}}": (() => {
        const d = String(letter.company_phone ?? "").replace(/\D/g, "");
        return d.length === 10
          ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
          : String(letter.company_phone ?? "");
      })(),
      "{{COMPANY_NMLS}}": letter.company_nmls ?? "",
      "{{LETTER_DATE}}": letterDateFormatted,
      "{{CLIENT_FULL_NAME}}": clientName || "Applicant",
      "{{PROPERTY_ADDRESS}}": propertyAddr || "Property Address TBD",
      "{{APPROVED_AMOUNT}}": new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(approvedAmount),
      "{{EXPIRY_NOTE}}": expiryNote,
      "{{EXPIRES_SHORT}}": expiresShort,
      "{{BROKER_PHOTO}}": brokerPhotoHtml,
      "{{BROKER_FULL_NAME}}":
        `${letter.broker_first_name ?? ""} ${letter.broker_last_name ?? ""}`.trim(),
      "{{COMPANY_NAME}}": letter.company_name ?? "The Mortgage Professionals",
      "{{BROKER_LICENSE}}": brokerLicenseHtml,
      "{{BROKER_PHONE}}": letter.broker_phone ?? "",
      "{{BROKER_EMAIL}}": letter.broker_email ?? "",
      "{{BROKER_LICENSE_NUMBER}}": letter.broker_license_number ?? "",
      "{{BROKER_SIGNATURE_SECTION}}": buildSignatureSectionHtml(letter),
    };

    let renderedLetterHtml = letter.html_content as string;
    for (const [placeholder, value] of Object.entries(placeholders)) {
      renderedLetterHtml = renderedLetterHtml.replace(
        new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
        value,
      );
    }

    // --- Optionally wrap in an email template ---
    let finalSubject =
      subject?.trim() ||
      `Your Pre-Approval Letter — ${letter.application_number}`;
    let finalBody = "";

    const effectiveLogoUrl =
      (letter.company_logo_url as string | null) ||
      "https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png";
    const companyName =
      (letter.company_name as string) || "The Mortgage Professionals";
    const brokerName =
      `${letter.broker_first_name ?? ""} ${letter.broker_last_name ?? ""}`.trim() ||
      "Your Loan Officer";
    const pdfFilename = `Pre-Approval-${letter.application_number ?? loanId}.pdf`;

    if (template_id) {
      const [templateRows] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM templates WHERE id = ? AND tenant_id = ? AND template_type = 'email' AND is_active = 1",
        [template_id, tenantId],
      );
      if (templateRows.length) {
        const tpl = templateRows[0];
        const tplVariables: Record<string, string> = {
          client_name: clientName || "Applicant",
          first_name: letter.client_first_name ?? "",
          last_name: letter.client_last_name ?? "",
          application_number: letter.application_number ?? "",
          approved_amount: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
          }).format(approvedAmount),
          broker_name: brokerName,
          pre_approval_letter: renderedLetterHtml,
          current_date: letterDateFormatted,
        };
        finalBody = processTemplateVariables(tpl.body, tplVariables);
        if (tpl.subject && !subject?.trim()) {
          finalSubject = processTemplateVariables(tpl.subject, tplVariables);
        }
      }
    }

    // --- Build branded email when no custom template ---
    if (!finalBody) {
      finalBody = buildDefaultPreApprovalEmailHtml({
        logoUrl: effectiveLogoUrl,
        companyName,
        companyAddress: letter.company_address ?? "",
        clientFirstName: letter.client_first_name ?? "",
        brokerName,
        brokerPhone: letter.broker_phone ?? "",
        brokerEmail: letter.broker_email ?? "",
        brokerNmls: letter.broker_license_number ?? "",
        approvedAmount,
        letterDateFormatted,
        expiresShort,
        propertyAddr,
        pdfFilename,
        hasPdf: !!pdf_base64,
        customMessage: custom_message,
      });
    }

    // --- Send the email (inline transporter to support PDF attachment) ---
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });

    const attachments: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }> = [];
    if (pdf_base64) {
      attachments.push({
        filename: pdfFilename,
        content: Buffer.from(pdf_base64, "base64"),
        contentType: "application/pdf",
      });
    }

    let sendSuccess = false;
    let externalId: string | undefined;
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: letter.client_email,
        subject: finalSubject,
        html: finalBody,
        attachments,
      });
      sendSuccess = true;
      externalId = info.messageId;
    } catch (mailErr: any) {
      console.error("❌ Pre-approval email send failed:", mailErr);
    }

    // Audit log
    await createAuditLog({
      actorType: "broker",
      actorId: brokerId,
      action: "send_pre_approval_letter_email",
      entityType: "pre_approval_letter",
      entityId: letter.id,
      changes: {
        application_id: loanId,
        client_email: letter.client_email,
        subject: finalSubject,
        template_id: template_id || null,
        send_success: sendSuccess,
        pdf_attached: !!pdf_base64,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (!sendSuccess) {
      return res.status(502).json({
        success: false,
        error: "Email delivery failed",
      });
    }

    return res.json({
      success: true,
      message: `Pre-approval letter sent to ${letter.client_email}`,
      external_id: externalId,
    });
  } catch (error) {
    console.error("Error sending pre-approval letter email:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    });
  }
};

/**
 * DELETE /api/loans/:loanId/pre-approval-letter
 * Delete the pre-approval letter for a loan. Admin only.
 */
const handleDeletePreApprovalLetter: RequestHandler = async (req, res) => {
  try {
    const { loanId } = req.params;
    const brokerId = (req as any).brokerId;
    const brokerRole: string = (req as any).brokerRole;

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    const tenantId = tenantRows[0]?.tenant_id;

    // Partners (role = 'broker') cannot delete pre-approval letters
    if (brokerRole === "broker") {
      return res.status(403).json({
        success: false,
        error: "Partners are not authorized to delete pre-approval letters",
      });
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM pre_approval_letters WHERE application_id = ? AND tenant_id = ?",
      [loanId, tenantId],
    );
    if (!existing.length) {
      return res
        .status(404)
        .json({ success: false, error: "Pre-approval letter not found" });
    }

    const letterId = existing[0].id;

    // Remove document record
    await pool.query(
      "DELETE FROM documents WHERE application_id = ? AND file_path = ? AND tenant_id = ?",
      [loanId, `/pre-approval-letters/${letterId}`, tenantId],
    );

    // Delete letter
    await pool.query("DELETE FROM pre_approval_letters WHERE id = ?", [
      letterId,
    ]);

    await createAuditLog({
      actorType: "broker",
      actorId: brokerId,
      action: "delete_pre_approval_letter",
      entityType: "pre_approval_letter",
      entityId: letterId,
      changes: { application_id: loanId },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({
      success: true,
      message: "Pre-approval letter deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting pre-approval letter:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete pre-approval letter",
    });
  }
};

// =====================================================
// REMINDER FLOWS HANDLERS
// =====================================================

/**
 * GET /api/reminder-flows
 * List all reminder flows for the tenant
 */
const handleGetReminderFlows: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    const tenantId = tenantRows[0]?.tenant_id;

    const [flows] = await pool.query<RowDataPacket[]>(
      `SELECT rf.*,
        (SELECT COUNT(*) FROM reminder_flow_executions rfe WHERE rfe.flow_id = rf.id AND rfe.status = 'active') AS active_executions_count
       FROM reminder_flows rf
       WHERE rf.tenant_id = ?
       ORDER BY rf.created_at DESC`,
      [tenantId],
    );

    return res.json({ success: true, flows });
  } catch (error) {
    console.error("Error fetching reminder flows:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch reminder flows" });
  }
};

/**
 * POST /api/reminder-flows
 * Create a new reminder flow (metadata only, no steps yet)
 */
const handleCreateReminderFlow: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const {
      name,
      description,
      trigger_event,
      trigger_delay_days = 0,
      is_active = true,
      apply_to_all_loans = true,
      loan_type_filter = "all",
    } = req.body;

    if (!name || !trigger_event) {
      return res
        .status(400)
        .json({ success: false, error: "name and trigger_event are required" });
    }

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    const tenantId = tenantRows[0]?.tenant_id;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO reminder_flows (tenant_id, name, description, trigger_event, trigger_delay_days, is_active, apply_to_all_loans, loan_type_filter, created_by_broker_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        name,
        description || null,
        trigger_event,
        trigger_delay_days,
        is_active ? 1 : 0,
        apply_to_all_loans ? 1 : 0,
        ["all", "purchase", "refinance"].includes(loan_type_filter)
          ? loan_type_filter
          : "all",
        brokerId,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Reminder flow created",
      flow_id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating reminder flow:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create reminder flow" });
  }
};

/**
 * GET /api/reminder-flows/:flowId
 * Get a single flow with its steps and connections
 */
const handleGetReminderFlow: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { flowId } = req.params;

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    const tenantId = tenantRows[0]?.tenant_id;

    const [flowRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM reminder_flows WHERE id = ? AND tenant_id = ?",
      [flowId, tenantId],
    );

    if (!flowRows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Reminder flow not found" });
    }

    const flow = flowRows[0];

    const [steps] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM reminder_flow_steps WHERE flow_id = ? ORDER BY id ASC",
      [flowId],
    );

    const [connections] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM reminder_flow_connections WHERE flow_id = ? ORDER BY id ASC",
      [flowId],
    );

    // Parse JSON config for steps
    const parsedSteps = steps.map((s) => ({
      ...s,
      config: s.config
        ? typeof s.config === "string"
          ? JSON.parse(s.config)
          : s.config
        : null,
    }));

    return res.json({
      success: true,
      flow: { ...flow, steps: parsedSteps, connections },
    });
  } catch (error) {
    console.error("Error fetching reminder flow:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch reminder flow" });
  }
};

/**
 * PUT /api/reminder-flows/:flowId
 * Save/update a flow including all steps and connections (full replace)
 */
const handleSaveReminderFlow: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { flowId } = req.params;
    const {
      name,
      description,
      trigger_event,
      trigger_delay_days = 0,
      is_active,
      apply_to_all_loans,
      loan_type_filter,
      steps = [],
      connections = [],
    } = req.body;

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    const tenantId = tenantRows[0]?.tenant_id;

    const [flowRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM reminder_flows WHERE id = ? AND tenant_id = ?",
      [flowId, tenantId],
    );

    if (!flowRows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Reminder flow not found" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Update flow metadata
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (name !== undefined) {
        updateFields.push("name = ?");
        updateValues.push(name);
      }
      if (description !== undefined) {
        updateFields.push("description = ?");
        updateValues.push(description || null);
      }
      if (trigger_event !== undefined) {
        updateFields.push("trigger_event = ?");
        updateValues.push(trigger_event);
      }
      if (trigger_delay_days !== undefined) {
        updateFields.push("trigger_delay_days = ?");
        updateValues.push(trigger_delay_days);
      }
      if (is_active !== undefined) {
        updateFields.push("is_active = ?");
        updateValues.push(is_active ? 1 : 0);
      }
      if (apply_to_all_loans !== undefined) {
        updateFields.push("apply_to_all_loans = ?");
        updateValues.push(apply_to_all_loans ? 1 : 0);
      }
      if (
        loan_type_filter !== undefined &&
        ["all", "purchase", "refinance"].includes(loan_type_filter)
      ) {
        updateFields.push("loan_type_filter = ?");
        updateValues.push(loan_type_filter);
      }

      if (updateFields.length) {
        await conn.query(
          `UPDATE reminder_flows SET ${updateFields.join(", ")} WHERE id = ?`,
          [...updateValues, flowId],
        );
      }

      // Replace all steps
      await conn.query("DELETE FROM reminder_flow_steps WHERE flow_id = ?", [
        flowId,
      ]);
      if (steps.length > 0) {
        const stepValues = steps.map((s: any) => [
          flowId,
          s.step_key,
          s.step_type,
          s.label,
          s.description || null,
          s.config ? JSON.stringify(s.config) : null,
          s.position_x ?? 0,
          s.position_y ?? 0,
        ]);
        await conn.query(
          `INSERT INTO reminder_flow_steps (flow_id, step_key, step_type, label, description, config, position_x, position_y)
           VALUES ?`,
          [stepValues],
        );
      }

      // Replace all connections
      await conn.query(
        "DELETE FROM reminder_flow_connections WHERE flow_id = ?",
        [flowId],
      );
      if (connections.length > 0) {
        const edgeValues = connections.map((e: any) => [
          flowId,
          e.edge_key,
          e.source_step_key,
          e.target_step_key,
          e.label || null,
          e.edge_type || "default",
        ]);
        await conn.query(
          `INSERT INTO reminder_flow_connections (flow_id, edge_key, source_step_key, target_step_key, label, edge_type)
           VALUES ?`,
          [edgeValues],
        );
      }

      await conn.commit();
      return res.json({
        success: true,
        message: "Reminder flow saved",
        flow_id: Number(flowId),
      });
    } catch (innerErr) {
      await conn.rollback();
      throw innerErr;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Error saving reminder flow:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to save reminder flow" });
  }
};

/**
 * DELETE /api/reminder-flows/:flowId
 * Delete a flow and all its steps/connections (cascade)
 */
const handleDeleteReminderFlow: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { flowId } = req.params;

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    const tenantId = tenantRows[0]?.tenant_id;

    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM reminder_flows WHERE id = ? AND tenant_id = ?",
      [flowId, tenantId],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Reminder flow not found" });
    }

    return res.json({ success: true, message: "Reminder flow deleted" });
  } catch (error) {
    console.error("Error deleting reminder flow:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to delete reminder flow" });
  }
};

/**
 * PATCH /api/reminder-flows/:flowId/toggle
 * Toggle is_active on a flow
 */
const handleToggleReminderFlow: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { flowId } = req.params;

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    const tenantId = tenantRows[0]?.tenant_id;

    const [flowRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, is_active FROM reminder_flows WHERE id = ? AND tenant_id = ?",
      [flowId, tenantId],
    );

    if (!flowRows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Reminder flow not found" });
    }

    const newActive = !flowRows[0].is_active;
    await pool.query("UPDATE reminder_flows SET is_active = ? WHERE id = ?", [
      newActive ? 1 : 0,
      flowId,
    ]);

    return res.json({
      success: true,
      message: newActive ? "Flow activated" : "Flow deactivated",
      is_active: newActive,
    });
  } catch (error) {
    console.error("Error toggling reminder flow:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to toggle reminder flow" });
  }
};

/**
 * GET /api/reminder-flow-executions
 * Get all executions (across all flows) for the tenant
 */
const handleGetReminderFlowExecutions: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;
    const { status, flow_id } = req.query;

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tenant_id FROM brokers WHERE id = ?",
      [brokerId],
    );
    const tenantId = tenantRows[0]?.tenant_id;

    let query = `
      SELECT rfe.*,
        rf.name AS flow_name,
        CONCAT(c.first_name, ' ', c.last_name) AS client_name,
        la.application_number
      FROM reminder_flow_executions rfe
      JOIN reminder_flows rf ON rf.id = rfe.flow_id
      LEFT JOIN clients c ON c.id = rfe.client_id
      LEFT JOIN loan_applications la ON la.id = rfe.loan_application_id
      WHERE rfe.tenant_id = ?`;
    const params: any[] = [tenantId];

    if (status) {
      query += " AND rfe.status = ?";
      params.push(status);
    }
    if (flow_id) {
      query += " AND rfe.flow_id = ?";
      params.push(flow_id);
    }

    query += " ORDER BY rfe.created_at DESC LIMIT 200";

    const [executions] = await pool.query<RowDataPacket[]>(query, params);

    // Parse JSON
    const parsed = executions.map((e) => ({
      ...e,
      completed_steps: e.completed_steps
        ? typeof e.completed_steps === "string"
          ? JSON.parse(e.completed_steps)
          : e.completed_steps
        : null,
    }));

    return res.json({
      success: true,
      executions: parsed,
      total: parsed.length,
    });
  } catch (error) {
    console.error("Error fetching flow executions:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch flow executions" });
  }
};

// =====================================================
// SERVER INITIALIZATION
// =====================================================

// Create the Express app once (reused across invocations)
let app: express.Application | null = null;

function createServer() {
  console.log("Creating Express server for Vercel...");

  const expressApp = express();

  // Middleware
  expressApp.use(cors());
  expressApp.use(express.json({ limit: "10mb" }));
  expressApp.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Log requests
  expressApp.use((req, _res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // ==================== CONFIGURE API ROUTES ====================

  // Health & ping
  expressApp.get("/api/health", handleHealth);
  expressApp.get("/api/ping", handlePing);

  // Broker auth routes (no auth required)
  expressApp.post("/api/admin/auth/send-code", handleAdminSendCode);
  expressApp.post("/api/admin/auth/verify-code", handleAdminVerifyCode);
  expressApp.get("/api/admin/auth/validate", handleAdminValidateSession);
  expressApp.post("/api/admin/auth/logout", handleAdminLogout);

  // Client auth routes (no auth required)
  expressApp.post("/api/client/auth/send-code", handleClientSendCode);
  expressApp.post("/api/client/auth/verify-code", handleClientVerifyCode);
  expressApp.get("/api/client/auth/validate", handleClientValidateSession);
  expressApp.post("/api/client/auth/logout", handleClientLogout);

  // Public apply route (no auth required)
  expressApp.post("/api/apply", handlePublicApply);

  // Public broker info for share link (no auth required)
  expressApp.get("/api/public/broker/:token", handleGetBrokerPublicInfo);

  // Broker share link (requires broker auth)
  expressApp.get(
    "/api/brokers/my-share-link",
    verifyBrokerSession,
    handleGetMyShareLink,
  );
  expressApp.post(
    "/api/brokers/my-share-link/regenerate",
    verifyBrokerSession,
    handleRegenerateShareLink,
  );
  expressApp.post(
    "/api/brokers/my-share-link/email",
    verifyBrokerSession,
    handleSendShareLinkEmail,
  );

  // Broker self-profile routes (require broker session)
  expressApp.get(
    "/api/admin/profile",
    verifyBrokerSession,
    handleGetBrokerProfile,
  );
  expressApp.put(
    "/api/admin/profile",
    verifyBrokerSession,
    handleUpdateBrokerProfile,
  );
  expressApp.put(
    "/api/admin/profile/avatar",
    verifyBrokerSession,
    handleUpdateBrokerAvatar,
  );

  // Protected routes (require broker session)
  expressApp.get(
    "/api/dashboard/stats",
    verifyBrokerSession,
    handleGetDashboardStats,
  );
  expressApp.get(
    "/api/dashboard/broker-metrics/annual",
    verifyBrokerSession,
    handleGetAnnualMetrics,
  );
  expressApp.get(
    "/api/dashboard/broker-metrics",
    verifyBrokerSession,
    handleGetBrokerMetrics,
  );
  expressApp.put(
    "/api/dashboard/broker-metrics",
    verifyBrokerSession,
    handleUpdateBrokerMetrics,
  );
  expressApp.post("/api/loans/create", verifyBrokerSession, handleCreateLoan);
  expressApp.get("/api/loans", verifyBrokerSession, handleGetLoans);
  expressApp.get(
    "/api/loans/:loanId",
    verifyBrokerSession,
    handleGetLoanDetails,
  );
  expressApp.patch(
    "/api/loans/:loanId/assign-broker",
    verifyBrokerSession,
    handleAssignBroker,
  );
  expressApp.patch(
    "/api/loans/:loanId/assign-partner",
    verifyBrokerSession,
    handleAssignPartner,
  );
  expressApp.patch(
    "/api/loans/:loanId/status",
    verifyBrokerSession,
    handleUpdateLoanStatus,
  );
  expressApp.get(
    "/api/loans/:loanId/export-mismo",
    verifyBrokerSession,
    handleGenerateMISMO,
  );
  expressApp.get("/api/clients", verifyBrokerSession, handleGetClients);
  expressApp.delete(
    "/api/clients/:clientId",
    verifyBrokerSession,
    handleDeleteClient,
  );
  expressApp.get("/api/brokers", verifyBrokerSession, handleGetBrokers);
  expressApp.post("/api/brokers", verifyBrokerSession, handleCreateBroker);
  expressApp.put(
    "/api/brokers/:brokerId",
    verifyBrokerSession,
    handleUpdateBroker,
  );
  expressApp.delete(
    "/api/brokers/:brokerId",
    verifyBrokerSession,
    handleDeleteBroker,
  );
  // Admin broker profile/avatar/share-link management
  expressApp.get(
    "/api/brokers/:brokerId/share-link",
    verifyBrokerSession,
    handleGetBrokerShareLinkByAdmin,
  );
  expressApp.get(
    "/api/brokers/:brokerId/profile",
    verifyBrokerSession,
    handleGetBrokerProfileByAdmin,
  );
  expressApp.put(
    "/api/brokers/:brokerId/profile",
    verifyBrokerSession,
    handleUpdateBrokerProfileByAdmin,
  );
  expressApp.put(
    "/api/brokers/:brokerId/avatar",
    verifyBrokerSession,
    handleUpdateBrokerAvatarByAdmin,
  );
  expressApp.get("/api/tasks", verifyBrokerSession, handleGetTaskTemplates);
  expressApp.post("/api/tasks", verifyBrokerSession, handleCreateTaskTemplate);
  expressApp.patch("/api/tasks/:taskId", verifyBrokerSession, handleUpdateTask);
  expressApp.put(
    "/api/tasks/:taskId",
    verifyBrokerSession,
    handleUpdateTaskTemplateFull,
  );
  expressApp.delete(
    "/api/tasks/:taskId",
    verifyBrokerSession,
    handleDeleteTaskTemplate,
  );

  // Task instance management (different from templates)
  expressApp.delete(
    "/api/tasks/instance/:taskId",
    verifyBrokerSession,
    handleDeleteTaskInstance,
  );

  // Task approval routes
  expressApp.post(
    "/api/tasks/:taskId/approve",
    verifyBrokerSession,
    handleApproveTask,
  );
  expressApp.post(
    "/api/tasks/:taskId/reopen",
    verifyBrokerSession,
    handleReopenTask,
  );

  // Task form fields routes (require broker session)
  expressApp.post(
    "/api/tasks/:taskId/form-fields",
    verifyBrokerSession,
    handleCreateTaskFormFields,
  );
  expressApp.get(
    "/api/tasks/:taskId/form-fields",
    verifyBrokerSession,
    handleGetTaskFormFields,
  );

  // Task form responses (broker review)
  expressApp.get(
    "/api/tasks/:taskId/responses",
    verifyBrokerSession,
    handleGetTaskFormResponses,
  );

  // Task documents routes (broker and client can access)
  expressApp.post(
    "/api/tasks/:taskId/documents",
    verifyBrokerSession,
    handleUploadTaskDocument,
  );
  expressApp.get(
    "/api/tasks/:taskId/documents",
    verifyBrokerSession,
    handleGetTaskDocuments,
  );
  expressApp.delete(
    "/api/tasks/documents/:documentId",
    verifyBrokerSession,
    handleDeleteTaskDocument,
  );

  // All documents route (admin documents page)
  expressApp.get(
    "/api/documents",
    verifyBrokerSession,
    handleGetAllTaskDocuments,
  );

  // Task form submission routes (broker and client can access)
  expressApp.post(
    "/api/tasks/:taskId/submit-form",
    verifyBrokerSession,
    handleSubmitTaskForm,
  );

  // PDF proxy (public — fetches from disruptinglabs.com server-side to avoid CORS)
  expressApp.get("/api/proxy/pdf", handleProxyPdf);

  // Document signing routes (broker)
  expressApp.post(
    "/api/tasks/:templateId/sign-document",
    verifyBrokerSession,
    handleSaveSignDocument,
  );
  expressApp.get(
    "/api/tasks/:templateId/sign-document",
    verifyBrokerSession,
    handleGetSignDocument,
  );
  expressApp.get(
    "/api/tasks/:taskId/signatures",
    verifyBrokerSession,
    handleGetTaskSignatures,
  );

  // Email template routes (require broker session)
  expressApp.get(
    "/api/email-templates",
    verifyBrokerSession,
    handleGetEmailTemplates,
  );
  expressApp.post(
    "/api/email-templates",
    verifyBrokerSession,
    handleCreateEmailTemplate,
  );
  expressApp.put(
    "/api/email-templates/:templateId",
    verifyBrokerSession,
    handleUpdateEmailTemplate,
  );
  expressApp.delete(
    "/api/email-templates/:templateId",
    verifyBrokerSession,
    handleDeleteEmailTemplate,
  );

  // Client Portal routes (require client session)
  expressApp.get(
    "/api/client/applications",
    verifyClientSession,
    handleGetClientApplications,
  );
  expressApp.get(
    "/api/client/tasks",
    verifyClientSession,
    handleGetClientTasks,
  );
  expressApp.patch(
    "/api/client/tasks/:taskId",
    verifyClientSession,
    handleUpdateClientTask,
  );
  expressApp.get(
    "/api/client/tasks/:taskId/details",
    verifyClientSession,
    handleGetTaskDetails,
  );
  expressApp.get(
    "/api/client/profile",
    verifyClientSession,
    handleGetClientProfile,
  );
  expressApp.put(
    "/api/client/profile",
    verifyClientSession,
    handleUpdateClientProfile,
  );

  // Client task form and document routes (require client session)
  expressApp.post(
    "/api/client/tasks/:taskId/submit-form",
    verifyClientSession,
    handleSubmitTaskForm,
  );
  expressApp.post(
    "/api/client/tasks/:taskId/documents",
    verifyClientSession,
    handleUploadTaskDocument,
  );
  expressApp.get(
    "/api/client/tasks/:taskId/documents",
    verifyClientSession,
    handleGetTaskDocuments,
  );
  expressApp.delete(
    "/api/client/tasks/documents/:documentId",
    verifyClientSession,
    handleDeleteTaskDocument,
  );

  // All documents for authenticated client
  expressApp.get(
    "/api/client/documents",
    verifyClientSession,
    handleGetClientDocuments,
  );

  // Document signing routes (client)
  expressApp.get(
    "/api/client/tasks/:taskId/sign-document",
    verifyClientSession,
    handleGetClientSignDocument,
  );
  expressApp.post(
    "/api/client/tasks/:taskId/signatures",
    verifyClientSession,
    handleSubmitTaskSignatures,
  );

  // SMS Templates routes
  expressApp.get(
    "/api/sms-templates",
    verifyBrokerSession,
    handleGetSmsTemplates,
  );
  expressApp.post(
    "/api/sms-templates",
    verifyBrokerSession,
    handleCreateSmsTemplate,
  );
  expressApp.put(
    "/api/sms-templates/:templateId",
    verifyBrokerSession,
    handleUpdateSmsTemplate,
  );
  expressApp.delete(
    "/api/sms-templates/:templateId",
    verifyBrokerSession,
    handleDeleteSmsTemplate,
  );

  // WhatsApp Template routes
  expressApp.get(
    "/api/whatsapp-templates",
    verifyBrokerSession,
    handleGetWhatsappTemplates,
  );
  expressApp.post(
    "/api/whatsapp-templates",
    verifyBrokerSession,
    handleCreateWhatsappTemplate,
  );
  expressApp.put(
    "/api/whatsapp-templates/:templateId",
    verifyBrokerSession,
    handleUpdateWhatsappTemplate,
  );
  expressApp.delete(
    "/api/whatsapp-templates/:templateId",
    verifyBrokerSession,
    handleDeleteWhatsappTemplate,
  );

  // Pipeline Step Templates routes
  expressApp.get(
    "/api/pipeline-step-templates",
    verifyBrokerSession,
    handleGetPipelineStepTemplates,
  );
  expressApp.put(
    "/api/pipeline-step-templates",
    verifyBrokerSession,
    handleUpsertPipelineStepTemplate,
  );
  expressApp.delete(
    "/api/pipeline-step-templates/:step/:channel",
    verifyBrokerSession,
    handleDeletePipelineStepTemplate,
  );

  // Inbound email webhook — no broker auth, protected by INBOUND_WEBHOOK_SECRET
  expressApp.post("/api/webhooks/inbound-email", handleInboundEmail);

  // Inbound IMAP poll cron — called by Vercel Cron or HostGator cPanel cron via curl
  expressApp.get("/api/cron/poll-inbound-email", handlePollInboundEmail);

  // Reminder flow execution engine cron — run every 5-15 min via cPanel cron:
  //   curl -s "https://yourdomain.com/api/cron/process-reminder-flows?secret=CRON_SECRET"
  expressApp.get(
    "/api/cron/process-reminder-flows",
    handleProcessReminderFlows,
  );

  // Conversation routes
  expressApp.get(
    "/api/conversations/threads",
    verifyBrokerSession,
    handleGetConversationThreads,
  );
  expressApp.get(
    "/api/conversations/:conversationId/messages",
    verifyBrokerSession,
    handleGetConversationMessages,
  );
  expressApp.post(
    "/api/conversations/send",
    verifyBrokerSession,
    handleSendMessage,
  );
  expressApp.put(
    "/api/conversations/:conversationId",
    verifyBrokerSession,
    handleUpdateConversation,
  );
  expressApp.get(
    "/api/conversations/templates",
    verifyBrokerSession,
    handleGetConversationTemplates,
  );
  expressApp.get(
    "/api/conversations/stats",
    verifyBrokerSession,
    handleGetConversationStats,
  );

  // Audit Logs routes
  expressApp.get("/api/audit-logs", verifyBrokerSession, handleGetAuditLogs);
  expressApp.get(
    "/api/audit-logs/stats",
    verifyBrokerSession,
    handleGetAuditLogStats,
  );

  // Reports & Analytics routes
  expressApp.get(
    "/api/reports/overview",
    verifyBrokerSession,
    handleGetReportsOverview,
  );
  expressApp.get(
    "/api/reports/revenue",
    verifyBrokerSession,
    handleGetRevenueReport,
  );
  expressApp.get(
    "/api/reports/performance",
    verifyBrokerSession,
    handleGetPerformanceReport,
  );
  expressApp.post(
    "/api/reports/export",
    verifyBrokerSession,
    handleExportReport,
  );

  // Image proxy (for client-side PDF generation – bypasses CORS on external images)
  expressApp.get("/api/image-proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url || !/^https?:\/\//.test(url)) {
      return res.status(400).send("Invalid url");
    }
    try {
      const response = await fetch(url);
      if (!response.ok) return res.status(502).send("Upstream error");
      const contentType = response.headers.get("content-type") || "image/png";
      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(buffer);
    } catch {
      return res.status(502).send("Failed to fetch image");
    }
  });

  // System Settings routes
  expressApp.get("/api/settings", verifyBrokerSession, handleGetSettings);
  expressApp.put("/api/settings", verifyBrokerSession, handleUpdateSettings);

  // Admin init (merged bootstrap)
  expressApp.get("/api/admin/init", verifyBrokerSession, handleAdminInit);

  // Admin Section Controls routes
  expressApp.get(
    "/api/admin/section-controls",
    verifyBrokerSession,
    handleGetAdminSectionControls,
  );
  expressApp.put(
    "/api/admin/section-controls",
    verifyBrokerSession,
    handleUpdateAdminSectionControls,
  );

  // Pre-Approval Letter routes
  expressApp.get(
    "/api/loans/:loanId/pre-approval-letter",
    verifyBrokerSession,
    handleGetPreApprovalLetter,
  );
  expressApp.post(
    "/api/loans/:loanId/pre-approval-letter",
    verifyBrokerSession,
    handleCreatePreApprovalLetter,
  );
  expressApp.put(
    "/api/loans/:loanId/pre-approval-letter",
    verifyBrokerSession,
    handleUpdatePreApprovalLetter,
  );
  expressApp.delete(
    "/api/loans/:loanId/pre-approval-letter",
    verifyBrokerSession,
    handleDeletePreApprovalLetter,
  );
  expressApp.post(
    "/api/loans/:loanId/pre-approval-letter/send-email",
    verifyBrokerSession,
    handleSendPreApprovalLetterEmail,
  );

  // ============================================================
  // REMINDER FLOWS ROUTES
  // ============================================================
  expressApp.get(
    "/api/reminder-flows",
    verifyBrokerSession,
    handleGetReminderFlows,
  );
  expressApp.post(
    "/api/reminder-flows",
    verifyBrokerSession,
    handleCreateReminderFlow,
  );
  expressApp.get(
    "/api/reminder-flows/:flowId",
    verifyBrokerSession,
    handleGetReminderFlow,
  );
  expressApp.put(
    "/api/reminder-flows/:flowId",
    verifyBrokerSession,
    handleSaveReminderFlow,
  );
  expressApp.delete(
    "/api/reminder-flows/:flowId",
    verifyBrokerSession,
    handleDeleteReminderFlow,
  );
  expressApp.patch(
    "/api/reminder-flows/:flowId/toggle",
    verifyBrokerSession,
    handleToggleReminderFlow,
  );
  expressApp.get(
    "/api/reminder-flow-executions",
    verifyBrokerSession,
    handleGetReminderFlowExecutions,
  );
  expressApp.post(
    "/api/reminder-flow-executions/:executionId/respond",
    verifyBrokerSession,
    handleMarkFlowExecutionResponded,
  );

  // ─── Contact Form ────────────────────────────────────────────────────────

  const handleSubmitContact: RequestHandler = async (req, res) => {
    try {
      const { name, email, phone, subject, message } = req.body as {
        name?: string;
        email?: string;
        phone?: string | null;
        subject?: string;
        message?: string;
      };

      if (
        !name?.trim() ||
        !email?.trim() ||
        !subject?.trim() ||
        !message?.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: "name, email, subject, and message are required",
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid email address" });
      }

      await pool.execute(
        `INSERT INTO contact_submissions (tenant_id, name, email, phone, subject, message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          MORTGAGE_TENANT_ID,
          name.trim().slice(0, 255),
          email.trim().toLowerCase().slice(0, 255),
          phone?.trim().slice(0, 30) || null,
          subject.trim().slice(0, 255),
          message.trim(),
        ],
      );

      return res.status(201).json({
        success: true,
        message: "Message received. We will be in touch shortly.",
      });
    } catch (err: any) {
      console.error("handleSubmitContact error:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  };

  const handleGetContactSubmissions: RequestHandler = async (_req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT id, name, email, phone, subject, message, is_read, read_by_broker_id, read_at, created_at
         FROM contact_submissions
         WHERE tenant_id = ?
         ORDER BY created_at DESC`,
        [MORTGAGE_TENANT_ID],
      );

      return res.json({ success: true, submissions: rows });
    } catch (err: any) {
      console.error("handleGetContactSubmissions error:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  };

  expressApp.post("/api/contact", handleSubmitContact);
  expressApp.get(
    "/api/contact",
    verifyBrokerSession,
    handleGetContactSubmissions,
  );

  // 404 handler - only for API routes
  expressApp.use("/api", (_req, res, next) => {
    if (!res.headersSent) {
      res.status(404).json({
        success: false,
        message: "API endpoint not found",
      });
    } else {
      next();
    }
  });

  // Error handler
  expressApp.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("Express error:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    },
  );

  return expressApp;
}

function getApp() {
  if (!app) {
    console.log("Initializing Express app for serverless...");
    app = createServer();
  }
  return app;
}

// Export createServer for development use
export { createServer };

// Export handler for Vercel serverless
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const expressApp = getApp();
    expressApp(req as any, res as any);
  } catch (error) {
    console.error("API Handler Error:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: {
          code: "500",
          message: "A server error has occurred",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }
};
