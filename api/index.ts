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
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { background-color: white; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
          .code { font-size: 36px; font-weight: bold; color: #667eea; text-align: center; padding: 25px; background-color: #f0f0f0; border-radius: 8px; margin: 25px 0; letter-spacing: 8px; }
          .footer { color: #666; font-size: 12px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>The Mortgage Professionals Admin</h1>
            <p>Código de Verificación</p>
          </div>
          <h2>Hola ${firstName},</h2>
          <p>Tu código de verificación es:</p>
          <div class="code">${code}</div>
          <p><strong>Validez:</strong> Este código expirará en <strong>15 minutos</strong></p>
          <div class="footer">
            <p><strong>The Mortgage Professionals</strong> - Panel de Administración</p>
          </div>
        </div>
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
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { background-color: white; border-radius: 10px; padding: 30px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
          .code { font-size: 36px; font-weight: bold; color: #3b82f6; text-align: center; padding: 25px; background-color: #eff6ff; border-radius: 8px; margin: 25px 0; letter-spacing: 8px; border: 2px dashed #3b82f6; }
          .welcome { font-size: 18px; color: #333; margin-bottom: 20px; }
          .info { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .footer { color: #666; font-size: 12px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 The Mortgage Professionals</h1>
            <p>Welcome to Your Client Portal</p>
          </div>
          <div class="welcome">
            <h2>Hello ${firstName},</h2>
            <p>Welcome! We're excited to help you with your mortgage loan process.</p>
          </div>
          <p>To access your client portal, use the following verification code:</p>
          <div class="code">${code}</div>
          <div class="info">
            <p><strong>⏱️ Validity:</strong> This code will expire in <strong>15 minutes</strong></p>
            <p><strong>🔒 Security:</strong> Never share this code with anyone</p>
          </div>
          <p style="color: #64748b; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
          <div class="footer">
            <p><strong>The Mortgage Professionals</strong></p>
            <p>Your partner on the path to your new home</p>
          </div>
        </div>
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
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #0ea5e9; padding: 16px; margin: 12px 0; border-radius: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <h3 style="margin: 0; color: #0c4a6e; font-size: 16px; font-weight: 600;">${task.title}</h3>
            <span style="background: ${
              task.priority === "urgent"
                ? "#dc2626"
                : task.priority === "high"
                  ? "#f59e0b"
                  : task.priority === "medium"
                    ? "#0ea5e9"
                    : "#10b981"
            }; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${task.priority}</span>
          </div>
          <p style="margin: 8px 0; color: #475569; font-size: 14px; line-height: 1.5;">${task.description}</p>
          <p style="margin: 8px 0 0 0; color: #64748b; font-size: 12px;">📅 Due: ${new Date(task.due_date).toLocaleDateString()}</p>
        </div>
      `,
      )
      .join("");

    const mailOptions = {
      from: `"The Mortgage Professionals" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your Loan Application ${applicationNumber} - Next Steps`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
            <div style="background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <div style="font-size: 40px;">🏡</div>
              </div>
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">Welcome to The Mortgage Professionals!</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #334155; font-size: 16px;">Hi <strong>${firstName}</strong>,</p>
              <p style="color: #475569; font-size: 15px;">Your loan application for <strong>$${loanAmount}</strong> has been created.</p>
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                <p style="margin: 0; color: #166534; font-size: 14px;">Application Number</p>
                <p style="margin: 8px 0 0 0; color: #15803d; font-size: 24px; font-weight: 700;">${applicationNumber}</p>
              </div>
              <h2 style="color: #0c4a6e; font-size: 20px;">📋 Your Next Steps</h2>
              ${taskListHTML}
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.CLIENT_URL}/portal" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600;">Access Your Portal</a>
              </div>
            </div>
          </div>
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
        <html>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <div style="font-size: 40px;">📝</div>
              </div>
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">Task Needs Revision</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #334155; font-size: 16px;">Hi <strong>${firstName}</strong>,</p>
              <p style="color: #475569; font-size: 15px;">Your task <strong>"${taskTitle}"</strong> has been reviewed and needs some revisions before it can be approved.</p>
              
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">📋 Feedback from Your Loan Officer</h3>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${reason}</p>
              </div>

              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600;">✅ What to Do Next</h3>
                <ol style="margin: 0; padding-left: 20px; color: #1e3a8a;">
                  <li style="margin: 8px 0; font-size: 14px;">Log in to your client portal</li>
                  <li style="margin: 8px 0; font-size: 14px;">Review the feedback above</li>
                  <li style="margin: 8px 0; font-size: 14px;">Make the necessary updates or corrections</li>
                  <li style="margin: 8px 0; font-size: 14px;">Resubmit the task for review</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.CLIENT_URL}/portal" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">Review Task Now</a>
              </div>

              <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 20px;">
                <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
                  If you have any questions, please don't hesitate to contact your loan officer.
                </p>
              </div>
            </div>
          </div>
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

// =====================================================
// MIDDLEWARE
// =====================================================

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
      "SELECT * FROM brokers WHERE email = ? AND status = 'active' AND tenant_id = ?",
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 1, 8, ?, ?, NOW())`,

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
    let whereClause =
      brokerRole === "admin"
        ? "WHERE la.tenant_id = ?"
        : "WHERE la.broker_user_id = ? AND la.tenant_id = ?";

    const baseParams =
      brokerRole === "admin"
        ? [MORTGAGE_TENANT_ID]
        : [brokerId, MORTGAGE_TENANT_ID];

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
        : [brokerId, MORTGAGE_TENANT_ID];

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
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?`,
      [...queryParams, ...subqueryParams, limitNum, offset],
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

    // Admins can view any loan, regular brokers only their own
    const whereClause =
      brokerRole === "admin"
        ? "WHERE la.id = ? AND la.tenant_id = ?"
        : "WHERE la.id = ? AND la.broker_user_id = ? AND la.tenant_id = ?";
    const queryParams =
      brokerRole === "admin"
        ? [loanId, MORTGAGE_TENANT_ID]
        : [loanId, brokerId, MORTGAGE_TENANT_ID];

    // Get loan details with client and broker info
    const [loans] = (await pool.query(
      `SELECT 
        la.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        c.phone as client_phone,
        b.first_name as broker_first_name,
        b.last_name as broker_last_name
      FROM loan_applications la
      INNER JOIN clients c ON la.client_user_id = c.id
      LEFT JOIN brokers b ON la.broker_user_id = b.id
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
      WHERE broker_user_id = ? AND tenant_id = ?
        AND status NOT IN ('denied', 'cancelled', 'closed')`,
      [brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    // Get average closing days (from submitted to closed)
    const [closingStats] = (await pool.query(
      `SELECT 
        COALESCE(AVG(DATEDIFF(actual_close_date, submitted_at)), 0) as avgClosingDays
      FROM loan_applications
      WHERE broker_user_id = ? AND tenant_id = ?
        AND status = 'closed'
        AND actual_close_date IS NOT NULL
        AND submitted_at IS NOT NULL
        AND submitted_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`,
      [brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    // Get closure rate (approved/closed vs denied/cancelled)
    const [closureRateStats] = (await pool.query(
      `SELECT 
        COUNT(CASE WHEN status IN ('approved', 'closed') THEN 1 END) as successful,
        COUNT(CASE WHEN status IN ('denied', 'cancelled') THEN 1 END) as unsuccessful
      FROM loan_applications
      WHERE broker_user_id = ? AND tenant_id = ?
        AND status IN ('approved', 'closed', 'denied', 'cancelled')`,
      [brokerId, MORTGAGE_TENANT_ID],
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
      WHERE broker_user_id = ? AND tenant_id = ?
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC`,
      [brokerId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    // Get status breakdown
    const [statusBreakdown] = (await pool.query(
      `SELECT 
        status,
        COUNT(*) as count
      FROM loan_applications
      WHERE broker_user_id = ? AND tenant_id = ?
        AND status NOT IN ('denied', 'cancelled')
      GROUP BY status
      ORDER BY count DESC`,
      [brokerId, MORTGAGE_TENANT_ID],
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
 * Get all clients
 */
const handleGetClients: RequestHandler = async (req, res) => {
  try {
    const brokerId = (req as any).brokerId;

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
        SUM(CASE WHEN la.status IN ('submitted', 'under_review', 'documents_pending', 'underwriting', 'conditional_approval') THEN 1 ELSE 0 END) as active_applications
      FROM clients c
      LEFT JOIN loan_applications la ON c.id = la.client_user_id
      WHERE c.assigned_broker_id = ? AND c.tenant_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
      [brokerId, MORTGAGE_TENANT_ID],
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

    // Check if client exists and belongs to this broker
    const [clientRows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, COUNT(DISTINCT la.id) as total_applications
       FROM clients c 
       LEFT JOIN loan_applications la ON c.id = la.client_user_id
       WHERE c.id = ? AND c.assigned_broker_id = ? AND c.tenant_id = ?
       GROUP BY c.id`,
      [clientId, brokerId, MORTGAGE_TENANT_ID],
    );

    if (!Array.isArray(clientRows) || clientRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Client not found or not accessible",
      });
    }

    const client = clientRows[0];

    // Use the safety check utility
    const safetyCheck = await checkDeletionSafety(
      "clients",
      parseInt(clientId.toString()),
      [
        {
          table: "loan_applications",
          foreignKey: "client_user_id",
          tenantFilter: true,
          friendlyName: "loan applications",
        },
        {
          table: "tasks",
          foreignKey: "assigned_to_user_id",
          tenantFilter: true,
          friendlyName: "assigned tasks",
        },
      ],
    );

    if (!safetyCheck.canDelete) {
      const totalViolations = safetyCheck.violations.reduce(
        (sum, v) => sum + v.count,
        0,
      );
      return res.status(400).json({
        success: false,
        error:
          "Cannot delete client: Client has associated data that must be handled first",
        details: {
          client_name: `${client.first_name} ${client.last_name}`,
          client_email: client.email,
          violations: safetyCheck.violations,
          message: `This client has ${totalViolations} associated records. Please reassign or complete these items before deletion.`,
        },
      });
    }

    console.log(
      `🗑️ Deleting client ${clientId} "${client.first_name} ${client.last_name}"`,
    );

    // Safe to delete
    await pool.query(
      "DELETE FROM clients WHERE id = ? AND assigned_broker_id = ? AND tenant_id = ?",
      [clientId, brokerId, MORTGAGE_TENANT_ID],
    );

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

    // Insert new broker
    const [result] = (await pool.query(
      `INSERT INTO brokers 
        (tenant_id, email, first_name, last_name, phone, role, license_number, specializations, status, email_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)`,
      [
        MORTGAGE_TENANT_ID,
        email,
        first_name,
        last_name,
        phone || null,
        role || "broker",
        license_number || null,
        specializations ? JSON.stringify(specializations) : null,
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
          foreignKey: "assigned_broker_id",
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
      application_id, // Ignore this for templates
    } = req.body;

    // Validate required fields
    if (!title || !task_type || !priority) {
      res.status(400).json({
        success: false,
        error: "Title, task type, and priority are required",
      });
      return;
    }

    // Get max order_index to append new template at end
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
        default_due_days || null,
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
        default_due_days || null,
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
            response.field_value,
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
    const userId = (req as any).userId;
    const brokerId = (req as any).brokerId;

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

    // Verify task is completed
    if (task.status !== "completed") {
      return res.status(400).json({
        success: false,
        error: "Task must be completed before approval",
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
        body_html,
        body_text,
        template_type,
        is_active,
        created_at,
        updated_at
      FROM email_templates
      WHERE tenant_id = ?
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
    const { name, subject, body_html, body_text, template_type, is_active } =
      req.body;

    if (!name || !subject || !body_html || !template_type) {
      return res.status(400).json({
        success: false,
        error: "Name, subject, body_html, and template_type are required",
      });
    }

    const [result] = (await pool.query(
      `INSERT INTO email_templates 
        (tenant_id, name, subject, body_html, body_text, template_type, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        MORTGAGE_TENANT_ID,
        name,
        subject,
        body_html,
        body_text || null,
        template_type,
        is_active !== false ? 1 : 0,
      ],
    )) as [ResultSetHeader, any];

    const [templates] = (await pool.query(
      "SELECT * FROM email_templates WHERE id = ? AND tenant_id = ?",
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
    const { name, subject, body_html, body_text, template_type, is_active } =
      req.body;

    // Check if template exists
    const [existingRows] = (await pool.query(
      "SELECT id FROM email_templates WHERE id = ? AND tenant_id = ?",
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
      updates.push("body_html = ?");
      values.push(body_html);
    }
    if (body_text !== undefined) {
      updates.push("body_text = ?");
      values.push(body_text);
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
      `UPDATE email_templates SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const [templates] = (await pool.query(
      "SELECT * FROM email_templates WHERE id = ? AND tenant_id = ?",
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
      "SELECT id, name FROM email_templates WHERE id = ? AND tenant_id = ?",
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Email template not found",
      });
    }

    await pool.query(
      "DELETE FROM email_templates WHERE id = ? AND tenant_id = ?",
      [templateId, MORTGAGE_TENANT_ID],
    );

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
        b.first_name as broker_first_name,
        b.last_name as broker_last_name,
        b.phone as broker_phone,
        b.email as broker_email,
        (SELECT COUNT(*) FROM tasks WHERE application_id = la.id AND status = 'completed' AND tenant_id = ?) as completed_tasks,
        (SELECT COUNT(*) FROM tasks WHERE application_id = la.id AND tenant_id = ?) as total_tasks
      FROM loan_applications la
      LEFT JOIN brokers b ON la.broker_user_id = b.id
      WHERE la.client_user_id = ? AND la.tenant_id = ?
      ORDER BY la.created_at DESC`,
      [clientId, MORTGAGE_TENANT_ID, MORTGAGE_TENANT_ID, MORTGAGE_TENANT_ID],
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
    if (!["in_progress", "completed"].includes(status)) {
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

    const completedAt = status === "completed" ? new Date() : null;

    await pool.query(
      "UPDATE tasks SET status = ?, completed_at = ?, updated_at = NOW() WHERE id = ?",
      [status, completedAt, taskId],
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
    let formFields = [];
    if (task.template_id) {
      const [fields] = await pool.query<any[]>(
        `SELECT * FROM task_form_fields 
         WHERE task_template_id = ? AND tenant_id = ?
         ORDER BY order_index`,
        [task.template_id, MORTGAGE_TENANT_ID],
      );
      formFields = fields;
      console.log(
        `✅ Found ${fields.length} form fields for template ${task.template_id} (tenant ${MORTGAGE_TENANT_ID})`,
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
        CASE WHEN td.id IS NOT NULL THEN 1 ELSE 0 END as is_uploaded
       FROM task_form_fields tff
       LEFT JOIN task_documents td ON td.task_id = ? AND td.field_id = tff.id
       WHERE tff.task_template_id = ? AND tff.tenant_id = ?
       AND (tff.field_type = 'file_pdf' OR tff.field_type = 'file_image')
       ORDER BY tff.order_index`,
      [taskId, task.template_id || 0, MORTGAGE_TENANT_ID],
    );

    console.log(
      `📄 Found ${documents.length} document fields for template ${task.template_id || 0} (tenant ${MORTGAGE_TENANT_ID})`,
    );

    res.json({
      success: true,
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date,
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
 * Get all SMS templates
 */
const handleGetSmsTemplates: RequestHandler = async (req, res) => {
  try {
    const [templates] = (await pool.query(
      "SELECT * FROM sms_templates WHERE tenant_id = ? ORDER BY created_at DESC",
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
    const { name, body, template_type, is_active } = req.body;

    // Validate required fields
    if (!name || !body || !template_type) {
      return res.status(400).json({
        success: false,
        error: "Name, body, and template_type are required",
      });
    }

    // Check character limit (1600 as per schema)
    if (body.length > 1600) {
      return res.status(400).json({
        success: false,
        error: "SMS body cannot exceed 1600 characters",
      });
    }

    const [result] = (await pool.query(
      `INSERT INTO sms_templates 
        (tenant_id, name, body, template_type, is_active) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        MORTGAGE_TENANT_ID,
        name,
        body,
        template_type,
        is_active !== false ? 1 : 0,
      ],
    )) as [ResultSetHeader, any];

    const [templates] = (await pool.query(
      "SELECT * FROM sms_templates WHERE id = ? AND tenant_id = ?",
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
      "SELECT id FROM sms_templates WHERE id = ? AND tenant_id = ?",
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
      `UPDATE sms_templates SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      values,
    );

    const [templates] = (await pool.query(
      "SELECT * FROM sms_templates WHERE id = ? AND tenant_id = ?",
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
      "SELECT id, name FROM sms_templates WHERE id = ? AND tenant_id = ?",
      [templateId, MORTGAGE_TENANT_ID],
    )) as [RowDataPacket[], any];

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "SMS template not found",
      });
    }

    await pool.query(
      "DELETE FROM sms_templates WHERE id = ? AND tenant_id = ?",
      [templateId, MORTGAGE_TENANT_ID],
    );

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

  // Protected routes (require broker session)
  expressApp.get(
    "/api/dashboard/stats",
    verifyBrokerSession,
    handleGetDashboardStats,
  );
  expressApp.post("/api/loans/create", verifyBrokerSession, handleCreateLoan);
  expressApp.get("/api/loans", verifyBrokerSession, handleGetLoans);
  expressApp.get(
    "/api/loans/:loanId",
    verifyBrokerSession,
    handleGetLoanDetails,
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
