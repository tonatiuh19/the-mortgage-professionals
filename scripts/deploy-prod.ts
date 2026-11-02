import "dotenv/config";

import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import process from "node:process";
import mysql from "mysql2/promise";
import { checkApiIndexInline } from "./check-api-inline";

const PROD_HEALTH_URL =
  process.env.PROD_HEALTH_URL ??
  "https://the-mortgage-professionals.vercel.app/api/health";

/** Tables the deployed code queries; a missing one means a migration was not applied. */
const REQUIRED_TABLES = [
  "sms_opt_outs",
  "broker_role_section_permissions",
  "tenant_subscription",
  "tenant_usage_period",
  "tenant_usage_ledger",
  "tenant_usage_reservations",
  "stripe_webhook_events",
];

const DEFAULT_TENANT_ID = Number(process.env.DEPLOY_SETTINGS_TENANT_ID ?? "2");

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeVersion(value: string): string {
  return value.trim();
}

function dbConfig() {
  return {
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT")),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
    ssl:
      process.env.DB_SSL === "false"
        ? undefined
        : { minVersion: "TLSv1.2" as const },
    // TiDB Serverless drops idle sockets; never hold a conn across vercel --prod.
    enableKeepAlive: true,
    connectTimeout: 20_000,
  };
}

async function withDb<T>(fn: (conn: mysql.Connection) => Promise<T>): Promise<T> {
  const conn = await mysql.createConnection(dbConfig());
  try {
    return await fn(conn);
  } finally {
    await conn.end().catch(() => undefined);
  }
}

async function runCommand(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

/**
 * Vercel inline monolith gate + typecheck + full validate:all.
 * Relative runtime imports from api/index.ts → ERR_MODULE_NOT_FOUND on Vercel.
 */
async function runPreDeployChecks() {
  console.log("\n🧪 Pre-deploy checks: api inline + validate:all...\n");

  const inline = checkApiIndexInline();
  console.log(inline.report);
  if (!inline.ok) {
    throw new Error(
      "api/index.ts has relative runtime imports — inline the logic before deploying to Vercel.",
    );
  }

  // validate:all includes typecheck, unit tests, domain smokes, and build
  await runCommand("npm", ["run", "validate:all"]);
  console.log("\n✅ validate:all passed. Continuing to deploy...\n");
}

async function captureCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: process.env });
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve(out.trim())
        : reject(new Error(`${command} ${args.join(" ")} exited with ${code}`)),
    );
  });
}

/** `vercel --prod` uploads the working tree, so uncommitted files would ship. */
async function assertCleanWorkingTree() {
  const status = await captureCommand("git", ["status", "--porcelain"]);
  if (status) {
    throw new Error(
      `Working tree has ${status.split("\n").length} uncommitted change(s). Commit first or pass --allow-dirty.`,
    );
  }
}

async function assertVercelAuthenticated() {
  try {
    await captureCommand("npx", ["vercel", "whoami"]);
  } catch {
    throw new Error("Vercel CLI is not logged in. Run: npx vercel login");
  }
}

async function assertRequiredTables() {
  const missing = await withDb(async (conn) => {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT table_name AS name FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name IN (?)`,
      [REQUIRED_TABLES],
    );
    const found = new Set(rows.map((r) => String(r.name)));
    return REQUIRED_TABLES.filter((t) => !found.has(t));
  });
  if (missing.length) {
    throw new Error(`Apply migrations first; missing tables: ${missing.join(", ")}`);
  }
}

/** Serverless cold starts can take a while, so retry before calling it failed. */
async function verifyProductionHealth() {
  let lastError = "no response";
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(PROD_HEALTH_URL, {
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        console.log(`✅ Health check passed: ${PROD_HEALTH_URL}`);
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(
    `Deploy finished but ${PROD_HEALTH_URL} is failing (${lastError}). app_version was not updated; roll back with: npx vercel rollback`,
  );
}

async function promptForVersion(
  currentVersion: string | null,
): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const currentLabel = currentVersion?.trim() || "not set";
    console.log(`\n🏷️  Current production version: ${currentLabel}`);

    while (true) {
      const input = await rl.question("✏️  Enter deploy version: ");
      const version = normalizeVersion(input);
      if (!version) {
        console.log("❌ Version cannot be empty.");
        continue;
      }

      const confirm = await rl.question(
        `❓ Deploy version ${version} to production and update app_version after success? (y/N): `,
      );
      if (confirm.trim().toLowerCase() === "y") {
        console.log(`✅ Confirmed. Proceeding with version ${version}...`);
        return version;
      } else {
        console.log(
          "❌ Deploy cancelled. Please enter a new version or Ctrl+C to abort.",
        );
      }
    }
  } finally {
    rl.close();
  }
}

async function readAppVersion(): Promise<string | null> {
  return withDb(async (conn) => {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT setting_value
         FROM system_settings
        WHERE setting_key = 'app_version'
          AND (tenant_id = ? OR tenant_id IS NULL)
        ORDER BY tenant_id DESC
        LIMIT 1`,
      [DEFAULT_TENANT_ID],
    );
    return (rows as mysql.RowDataPacket[])[0]?.setting_value ?? null;
  });
}

async function writeAppVersion(deployVersion: string): Promise<void> {
  await withDb(async (conn) => {
    await conn.execute(
      `INSERT INTO system_settings (
         tenant_id,
         setting_key,
         setting_value,
         setting_type,
         description,
         updated_at
       ) VALUES (?, 'app_version', ?, 'string', ?, NOW())
       ON DUPLICATE KEY UPDATE
         setting_value = VALUES(setting_value),
         setting_type = VALUES(setting_type),
         description = VALUES(description),
         updated_at = NOW()`,
      [
        DEFAULT_TENANT_ID,
        deployVersion,
        "Current deployed application version shown in the admin settings page header.",
      ],
    );
  });
}

async function main() {
  // Validate DB env early (before long typecheck/validate).
  dbConfig();

  const cliArgs = process.argv.slice(2);
  const skipChecks =
    cliArgs.includes("--skip-checks") ||
    process.env.SKIP_DEPLOY_CHECKS === "1" ||
    process.env.SKIP_DEPLOY_CHECKS === "true";
  const allowDirty = cliArgs.includes("--allow-dirty");
  const dryRun = cliArgs.includes("--dry-run");
  const filteredArgs = cliArgs.filter(
    (arg) => !["--skip-checks", "--allow-dirty", "--dry-run"].includes(arg),
  );
  const explicitVersion =
    filteredArgs.find((arg) => !arg.startsWith("-")) ?? "";
  const vercelArgs = explicitVersion
    ? filteredArgs.filter(
        (arg, index) => index !== filteredArgs.indexOf(explicitVersion),
      )
    : filteredArgs;

  if (!allowDirty) await assertCleanWorkingTree();
  await assertVercelAuthenticated();
  await assertRequiredTables();

  if (!skipChecks) {
    await runPreDeployChecks();
  } else {
    console.log(
      "\n⚠️  Skipping pre-deploy checks (--skip-checks / SKIP_DEPLOY_CHECKS).\n",
    );
  }

  if (dryRun) {
    console.log("\n✅ Dry run passed. Nothing was deployed.");
    return;
  }

  // Short-lived connection — do not hold open across vercel --prod
  // (TiDB Serverless closes idle sockets → "connection is in closed state").
  const currentVersion = await readAppVersion();
  const deployVersion = explicitVersion
    ? normalizeVersion(explicitVersion)
    : await promptForVersion(currentVersion);

  if (!deployVersion) {
    throw new Error("Deploy version cannot be empty.");
  }

  console.log(
    `\n🚀 Starting Vercel production deploy for version ${deployVersion}...\n`,
  );

  await runCommand("npx", ["vercel", "--prod", ...vercelArgs]);

  await verifyProductionHealth();
  await writeAppVersion(deployVersion);

  console.log(
    `\n🎉 Production deploy succeeded! app_version updated to ${deployVersion}.`,
  );
}

main().catch((error) => {
  console.error(
    `\n❌ Deploy aborted: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
