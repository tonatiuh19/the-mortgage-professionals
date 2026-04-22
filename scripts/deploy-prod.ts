import "dotenv/config";

import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import process from "node:process";
import mysql from "mysql2/promise";

// TMP default tenant is 2 (override with DEPLOY_SETTINGS_TENANT_ID when needed)
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

async function main() {
  const dbHost = requireEnv("DB_HOST");
  const dbPort = Number(requireEnv("DB_PORT"));
  const dbUser = requireEnv("DB_USER");
  const dbPassword = requireEnv("DB_PASSWORD");
  const dbName = requireEnv("DB_NAME");

  const cliArgs = process.argv.slice(2);
  const explicitVersion = cliArgs.find((arg) => !arg.startsWith("-")) ?? "";
  const vercelArgs = explicitVersion
    ? cliArgs.filter((arg, index) => index !== cliArgs.indexOf(explicitVersion))
    : cliArgs;

  const pool = await mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2" },
    waitForConnections: true,
    connectionLimit: 2,
  });

  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT setting_value
         FROM system_settings
        WHERE setting_key = 'app_version'
          AND (tenant_id = ? OR tenant_id IS NULL)
        ORDER BY tenant_id DESC
        LIMIT 1`,
      [DEFAULT_TENANT_ID],
    );

    const currentVersion = rows[0]?.setting_value ?? null;
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

    await pool.query(
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

    console.log(
      `\n🎉 Production deploy succeeded! app_version updated to ${deployVersion}.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    `\n❌ Deploy aborted: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
