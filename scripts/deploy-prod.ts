/**
 * Production deploy — `npm run deploy:prod [version] [flags]`
 *
 * Combined from the groundwork + optimum-credit deploy scripts, plus this repo's own gates:
 *   1. Git: on main, up to date, pushed, no secrets (offers commit + push).
 *   2. Fast gates first: Vercel login, required tables, api/index.ts inline monolith.
 *   3. typecheck → tests (live progress bar) → local build, then production env check.
 *   4. Git re-check, version (patch/minor/custom), `vercel --prod` (survives CLI drops).
 *   5. Health check BEFORE stamping app_version, then tag, notify, Slack release notes.
 *
 * Prompts can be answered from the terminal or Telegram (scripts/deployAsk.ts).
 * Unit tests here never touch the DB, so (unlike groundwork) there is no fixture purge.
 *
 * Flags: --skip-checks (or SKIP_DEPLOY_CHECKS=1)  --allow-dirty  --dry-run
 *        --stamp-only <version>   (npm run deploy:stamp-version -- <version>)
 */
import "dotenv/config";

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import mysql from "mysql2/promise";
import { checkApiIndexInline } from "./check-api-inline";
import { ask, notify, projectName } from "./deployAsk";
import {
  collectReleaseChanges,
  fetchResolvedRequests,
  markSnapshotAnnounced,
  postReleaseNotesToSlack,
  resolvedRequestsSection,
  writeReleaseNotes,
} from "./releaseNotes";

const PROD_HEALTH_URL =
  process.env.PROD_HEALTH_URL ?? "https://the-mortgage-professionals.vercel.app/api/health";

/** Tables the deployed code queries; a missing one means a migration was not applied. */
const REQUIRED_TABLES = [
  "sms_opt_outs",
  "sms_consents",
  "broker_role_section_permissions",
  "broker_role_public_listing",
  "legal_company_details",
  "legal_documents",
  "legal_document_versions",
  "tenant_subscription",
  "tenant_usage_period",
  "tenant_usage_ledger",
  "tenant_usage_reservations",
  "stripe_webhook_events",
];

/** Columns added by recent migrations (ADD COLUMN migrations don't create tables). */
const REQUIRED_COLUMNS: Array<[table: string, column: string]> = [
  ["brokers", "public_profile_status"],
  ["brokers", "sms_blast_opted_in"],
  ["clients", "sms_blast_opted_in"],
  ["sms_consents", "terms_version"],
];

/** Env vars features need at runtime that nothing else catches before deploy (a missing one = 500/503). */
const REQUIRED_PROD_ENV: Array<{ name: string; why: string }> = [
  { name: "DB_HOST", why: "every API call (TiDB)" },
  { name: "DB_USER", why: "every API call (TiDB)" },
  { name: "DB_PASSWORD", why: "every API call (TiDB)" },
  { name: "DB_NAME", why: "every API call (TiDB)" },
  { name: "JWT_SECRET", why: "every login and session" },
  { name: "TWILIO_ACCOUNT_SID", why: "SMS and voice calls" },
  { name: "TWILIO_AUTH_TOKEN", why: "SMS, voice and webhook signatures" },
  { name: "RESEND_API_KEY", why: "all emails (login codes, notifications)" },
  { name: "ABLY_API_KEY", why: "live notifications and conversations" },
  { name: "CRON_SECRET", why: "scheduled jobs (reminders, broadcasts); crons are rejected without it" },
  { name: "STRIPE_SECRET_KEY", why: "billing" },
  { name: "STRIPE_WEBHOOK_SECRET", why: "billing webhooks" },
];

const DEFAULT_TENANT_ID = Number(process.env.DEPLOY_SETTINGS_TENANT_ID ?? "2");

// ── Small helpers ────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const normalizeVersion = (value: string) => value.trim().replace(/^v(?=\d)/i, "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const tgSafe = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function dbConfig() {
  return {
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT")),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
    ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2" as const },
    // TiDB Serverless drops idle sockets; never hold a conn across vercel --prod.
    enableKeepAlive: true,
    connectTimeout: 20_000,
  };
}

const RETRYABLE_DB = ["ETIMEDOUT", "ECONNREFUSED", "ECONNRESET", "PROTOCOL_CONNECTION_LOST"];

/** Short-lived connection; connecting sends no statement, so it is always safe to retry. */
async function withDb<T>(fn: (conn: mysql.Connection) => Promise<T>): Promise<T> {
  let conn: mysql.Connection | null = null;
  for (let attempt = 1; !conn; attempt++) {
    try {
      conn = await mysql.createConnection(dbConfig());
    } catch (e: any) {
      if (attempt >= 3 || !RETRYABLE_DB.includes(String(e?.code))) throw e;
      console.warn(`⏳ Database connection failed (${e.code}); retrying (${attempt}/2)…`);
      await sleep(attempt * 5_000);
    }
  }
  try {
    return await fn(conn);
  } finally {
    await conn.end().catch(() => undefined);
  }
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false, env: process.env });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`)),
    );
  });
}

async function captureCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], shell: false, env: process.env });
    let out = "";
    child.stdout.on("data", (d) => (out += String(d)));
    child.stderr.on("data", (d) => (out += String(d)));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`)),
    );
  });
}

const git = (args: string[]) => captureCommand("git", args).then((o) => o.trim());

// ── Abort handling ───────────────────────────────────────────────────────────

/** Where the deploy is, for the abort message ("aborted during tests"). */
let stage = "starting";
let interrupted = false;

/** Failed tests from the last run (written by scripts/vitestProgressReporter.ts). */
function failedTestsSummary(): string {
  try {
    const file = path.resolve(process.cwd(), "node_modules/.cache/dl-test-failures.json");
    const list = JSON.parse(fs.readFileSync(file, "utf8")) as string[];
    if (!list.length) return "";
    return `\n${list.slice(0, 5).map((t) => `• ${t}`).join("\n")}${list.length > 5 ? `\n… and ${list.length - 5} more` : ""}`;
  } catch {
    return "";
  }
}

/** Tells the bot why and where the deploy stopped. Never throws; at most ~10 s. */
async function notifyAbort(reason: string): Promise<void> {
  const tests = stage === "tests" ? failedTestsSummary() : "";
  const live = stage === "health check" || stage === "after going live";
  const text = `❌ <b>${tgSafe(projectName)} deploy aborted</b> (during ${tgSafe(stage)})\n${tgSafe(reason).slice(0, 600)}${tgSafe(tests)}\n${live ? "⚠️ The new build may already be live." : "Nothing new went live."}`;
  await Promise.race([notify(text), sleep(10_000)]);
}

/** Ctrl+C: tell the bot, then exit. A second Ctrl+C exits immediately. */
function installInterruptHandler() {
  const onSignal = (signal: NodeJS.Signals) => {
    if (interrupted) process.exit(130);
    interrupted = true;
    console.log(`\n⛔ ${signal}: deploy aborted (Ctrl+C again to exit now).`);
    void notifyAbort(`Stopped by hand (${signal === "SIGINT" ? "Ctrl+C" : signal}).`).finally(() => process.exit(130));
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
}

// ── Git: deploy only what is committed and pushed on main ────────────────────
// `vercel --prod` uploads the working tree, so what goes live must be exactly origin/main.
// `--allow-dirty` lets uncommitted files ship; main, up to date, pushed and no secrets still apply.

/** Never upload these, even if a .gitignore rule goes missing. */
const SECRET_FILE = /(^|\/)(\.env(?!\.example$)(\..*)?|.*\.(pem|key|p12|pfx)|id_rsa.*|.*credentials.*\.json)$/i;

const statusFiles = (porcelain: string) =>
  porcelain
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^.* -> /, ""));

async function gitState() {
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== "main") throw new Error(`Deploys run from main only (you are on "${branch}"). Merge into main first.`);
  await runCommand("git", ["fetch", "--quiet", "origin", "main"]);
  const behind = Number(await git(["rev-list", "--count", "HEAD..origin/main"])) || 0;
  if (behind > 0) throw new Error(`main is ${behind} commit(s) behind origin/main. Pull first (git pull --rebase), then deploy.`);
  // Not trimmed: each porcelain line starts with a 2-letter code that can begin with a space.
  const porcelain = await captureCommand("git", ["status", "--porcelain"]);
  const files = statusFiles(porcelain);
  const secrets = files.filter((f) => SECRET_FILE.test(f));
  if (secrets.length) throw new Error(`These look like secrets and must never be committed or uploaded: ${secrets.join(", ")}. Add them to .gitignore first.`);
  const ahead = Number(await git(["rev-list", "--count", "origin/main..HEAD"])) || 0;
  return { porcelain, files, ahead };
}

/** Final gate right before upload: nothing committed, pulled or edited during the checks slips in. */
async function assertGitReady(allowDirty: boolean): Promise<void> {
  const { files, ahead } = await gitState();
  if (files.length && !allowDirty) {
    const list = files.slice(0, 10).map((f) => `   ${f}`).join("\n");
    throw new Error(`${files.length} uncommitted change(s) appeared during the checks. Commit and push, then deploy again:\n${list}`);
  }
  if (ahead > 0) throw new Error(`main has ${ahead} commit(s) not pushed to origin. Run git push origin main, then deploy.`);
}

/** Rule-based suggestion from the changed files, e.g. "feat: scheduler, api, database (+12 files)". */
function suggestCommitMessage(porcelain: string): string {
  const lines = porcelain.split("\n").filter(Boolean);
  const files = statusFiles(porcelain);
  const added = lines.filter((l) => l.startsWith("??") || l[0] === "A").map((l) => l.slice(3));
  const isDoc = (f: string) => /\.(md|mdc)$/.test(f);
  const isTest = (f: string) => /\.(test|spec)\.tsx?$/.test(f);
  const type = files.every(isDoc)
    ? "docs"
    : files.every((f) => isTest(f) || isDoc(f))
      ? "test"
      : added.some((f) => /^(client\/(pages|components)|database\/migrations)\//.test(f)) || files.includes("api/index.ts")
        ? "feat"
        : files.every((f) => /^(scripts|\.cursor|\.claude)\/|^package(-lock)?\.json$|\.config\.ts$/.test(f) || isDoc(f))
          ? "chore"
          : "fix";
  const area = (f: string) => {
    if (isTest(f) || isDoc(f)) return null;
    const m = f.match(/^client\/(?:pages|components)\/(?:admin\/|client\/)?([^/.]+)/);
    if (m) return m[1].replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    if (f.startsWith("client/store/")) return "store";
    if (f.startsWith("database/")) return "database";
    if (f.startsWith("scripts/")) return "deploy scripts";
    if (f === "api/index.ts" || f === "api/swagger.yaml") return "api";
    return f.split("/")[0].replace(/^\./, "");
  };
  const counts = new Map<string, number>();
  for (const f of files) {
    const a = area(f);
    if (a) counts.set(a, (counts.get(a) || 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a);
  return `${type}: ${top.length ? top.join(", ") : "update"}${files.length > 1 ? ` (+${files.length} files)` : ""}`;
}

/** Before the checks: uncommitted or unpushed work → commit + push (suggested/custom message), wait, or abort. */
async function resolveGit(allowDirty: boolean): Promise<void> {
  while (true) {
    const { porcelain, files, ahead } = await gitState();
    const dirty = files.length > 0 && !allowDirty;
    if (!dirty && !ahead) {
      if (files.length) console.log(`\n⚠️  --allow-dirty: ${files.length} uncommitted change(s) will ship without being committed.`);
      return;
    }
    const suggested = dirty ? suggestCommitMessage(porcelain) : "";
    const what = dirty
      ? `${files.length} uncommitted change(s)${ahead ? ` and ${ahead} unpushed commit(s)` : ""} on main`
      : `${ahead} commit(s) on main not pushed to origin`;
    console.log(`\n📝 ${what}.`);
    const a = await ask(`${what}. Deploys only ship what is on origin/main.`, [
      ...(dirty
        ? [
            { key: "suggested", label: `Commit + push: "${suggested}"` },
            { key: "custom", label: "Commit + push with my own message", text: "Commit message:" },
          ]
        : [{ key: "push", label: `Push ${ahead} commit(s) to origin/main` }]),
      { key: "manual", label: "I'll handle it in the terminal (wait for me)" },
      { key: "abort", label: "Abort the deploy" },
    ]);
    if (a.key === "abort") throw new Error("Deploy cancelled.");
    if (a.key === "manual") {
      await waitForCleanMain();
      continue;
    }
    if (dirty) {
      const message = a.key === "custom" && a.text ? a.text : suggested;
      await runCommand("git", ["add", "-A"]);
      await runCommand("git", ["commit", "--quiet", "-m", message]);
      console.log(`✅ Committed: ${message}`);
    }
    await runCommand("git", ["push", "origin", "main"]);
    console.log("✅ Pushed to origin/main.");
  }
}

/** "I'll handle it": re-check every 5 s until main is clean and pushed (Enter re-checks now). */
async function waitForCleanMain(): Promise<void> {
  console.log("\n⏳ Waiting for you: commit and push to main in another terminal tab. Press Enter to re-check now, or Ctrl+C to abort.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const enter = () => rl.question("").then(() => undefined);
  try {
    let pending = enter();
    while (true) {
      const clean = !(await captureCommand("git", ["status", "--porcelain"])).trim();
      await runCommand("git", ["fetch", "--quiet", "origin", "main"]).catch(() => undefined);
      const ahead = Number(await git(["rev-list", "--count", "origin/main..HEAD"]).catch(() => "1")) || 0;
      if (clean && !ahead) {
        console.log("✅ main is clean and pushed. Continuing...");
        return;
      }
      const tick = await Promise.race([pending.then(() => "enter"), sleep(5000).then(() => "tick")]);
      if (tick === "enter") pending = enter();
    }
  } finally {
    rl.close();
  }
}

// ── Fast gates (seconds) — run before anything slow ──────────────────────────

async function assertVercelAuthenticated(): Promise<void> {
  try {
    await captureCommand("npx", ["vercel", "whoami"]);
  } catch {
    throw new Error("Vercel CLI is not logged in. Run: npx vercel login");
  }
}

async function assertSchemaReady(): Promise<void> {
  const { missingTables, missingColumns } = await withDb(async (conn) => {
    const [t] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT table_name AS name FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name IN (?)`,
      [REQUIRED_TABLES],
    );
    const tables = new Set(t.map((r) => String(r.name)));
    const [c] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT CONCAT(table_name, '.', column_name) AS name FROM information_schema.columns
        WHERE table_schema = DATABASE() AND CONCAT(table_name, '.', column_name) IN (?)`,
      [REQUIRED_COLUMNS.map(([tb, col]) => `${tb}.${col}`)],
    );
    const cols = new Set(c.map((r) => String(r.name)));
    return {
      missingTables: REQUIRED_TABLES.filter((x) => !tables.has(x)),
      missingColumns: REQUIRED_COLUMNS.map(([tb, col]) => `${tb}.${col}`).filter((x) => !cols.has(x)),
    };
  });
  const missing = [...missingTables, ...missingColumns];
  if (missing.length) throw new Error(`Apply migrations first (database/migrations/); missing: ${missing.join(", ")}`);
  console.log("✅ Database schema has every required table and column.");
}

function assertApiInline(): void {
  const inline = checkApiIndexInline();
  console.log(inline.report);
  if (!inline.ok) throw new Error("api/index.ts has relative runtime imports — inline the logic before deploying to Vercel.");
}

// ── Slow checks: typecheck → tests → build ───────────────────────────────────

async function runPreDeployChecks(): Promise<void> {
  console.log("\n🧪 Pre-deploy checks: typecheck → tests → build...\n");
  stage = "typecheck";
  await runCommand("npm", ["run", "typecheck"]);
  console.log("\n✅ Typecheck passed.\n");

  stage = "tests";
  // On a terminal: one live progress bar instead of every test line.
  const progress = process.stdout.isTTY ? ["--reporter=./scripts/vitestProgressReporter.ts"] : [];
  await runCommand("npx", ["vitest", "--run", "--exclude", ".sync-backups/**", ...progress]).catch((e) => {
    throw interrupted ? e : new Error(`Tests failed.${failedTestsSummary() ? "" : ` (${errMsg(e)})`}`);
  });
  console.log("\n✅ Tests passed.\n");

  // Catches bundling errors locally in seconds instead of after a Vercel upload.
  stage = "build";
  await runCommand("npm", ["run", "build"]);
  console.log("\n✅ Build passed.\n");
}

/** Lists Production env names on Vercel; asks before deploying if a required one is missing. */
async function checkProductionEnv(): Promise<void> {
  stage = "production env check";
  console.log("\n🔐 Checking Vercel production env vars...\n");
  let listing: string;
  try {
    listing = await captureCommand("npx", ["vercel", "env", "ls", "production"]);
  } catch (err) {
    console.log(`⚠️  Could not list Vercel env vars (${errMsg(err)}). Skipping env check.`);
    return;
  }
  const names = new Set(
    listing.split("\n").map((line) => line.trim().split(/\s+/)[0]).filter((n) => /^[A-Z][A-Z0-9_]*$/.test(n)),
  );
  const missing = REQUIRED_PROD_ENV.filter((v) => !names.has(v.name));
  if (!missing.length) {
    console.log("✅ Required production env vars present.\n");
    return;
  }
  for (const v of missing) {
    console.log(`❌ Missing ${v.name} in Vercel Production — needed for ${v.why}.\n   Fix: Vercel → Settings → Environment Variables → Production`);
  }
  const a = await ask(`Missing Vercel Production env: ${missing.map((v) => v.name).join(", ")}. Those features will fail until added.`, [
    { key: "abort", label: "Abort and add them first" },
    { key: "deploy", label: "Deploy anyway" },
  ]);
  if (a.key !== "deploy") throw new Error("Deploy cancelled: missing production env vars.");
}

// ── Version ──────────────────────────────────────────────────────────────────

const bump = (v: string, part: "patch" | "minor" | "major") => {
  const m = v.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  const [maj, min, pat] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return part === "major" ? `${maj + 1}.0.0` : part === "minor" ? `${maj}.${min + 1}.0` : `${maj}.${min}.${pat + 1}`;
};

/** Suggested patch / minor / major, a custom one, or typed in the terminal. */
async function chooseVersion(current: string | null): Promise<string> {
  const cur = current?.trim() || "";
  console.log(`\n🏷️  Current production version: ${cur || "not set"}`);
  const patch = bump(cur, "patch");
  const minor = bump(cur, "minor");
  const major = bump(cur, "major");
  const a = await ask(`Release version (now ${cur || "not set"})`, [
    ...(patch ? [{ key: "patch", label: `${patch} (patch, suggested)` }] : []),
    ...(minor ? [{ key: "minor", label: `${minor} (minor)` }] : []),
    ...(major ? [{ key: "major", label: `${major} (major)` }] : []),
    { key: "custom", label: "Custom version", text: "Version:" },
    { key: "abort", label: "Abort the deploy" },
  ]);
  if (a.key === "abort") throw new Error("Deploy cancelled.");
  if (a.key === "patch" && patch) return patch;
  if (a.key === "minor" && minor) return minor;
  if (a.key === "major" && major) return major;
  const typed = normalizeVersion(a.text || "");
  if (!typed) throw new Error("Deploy version cannot be empty.");
  return typed;
}

// system_settings: setting_key is UNIQUE on its own; rows carry the deploy tenant.
async function readSettings(keys: string[]): Promise<Map<string, string | null>> {
  return withDb(async (conn) => {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (?)`,
      [keys],
    );
    return new Map(rows.map((r) => [String(r.setting_key), (r.setting_value as string | null) ?? null]));
  });
}

async function writeSetting(key: string, value: string, description: string): Promise<void> {
  await withDb((conn) =>
    conn.execute(
      `INSERT INTO system_settings (tenant_id, setting_key, setting_value, setting_type, description, updated_at)
       VALUES (?, ?, ?, 'string', ?, NOW())
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description), updated_at = NOW()`,
      [DEFAULT_TENANT_ID, key, value, description],
    ),
  );
}

const readAppVersion = async () => (await readSettings(["app_version"])).get("app_version") ?? null;
const writeAppVersion = (v: string) =>
  writeSetting("app_version", v, "Current deployed application version shown in the admin settings page header.");

// ── Upload + verify ──────────────────────────────────────────────────────────

/** "● Ready" / "● Error" / "● Building" … from `vercel inspect`. null = couldn't tell. */
function parseVercelInspectStatus(output: string): "ready" | "error" | "building" | null {
  const m = output.match(/status\s+●?\s*(\w+)/i);
  if (!m) return null;
  const st = m[1].toLowerCase();
  if (st === "ready") return "ready";
  if (["error", "canceled", "cancelled"].includes(st)) return "error";
  return "building";
}

/**
 * `vercel --prod`, shown live and captured. When the CLI loses its connection after uploading
 * ("fetch failed"), Vercel keeps building: follow the deployment with `vercel inspect` until it
 * is Ready (continue normally) or really failed.
 */
async function deployToVercel(vercelArgs: string[]): Promise<void> {
  let output = "";
  const code = await new Promise<number | null>((resolve, reject) => {
    const child = spawn("npx", ["vercel", "--prod", ...vercelArgs], { stdio: ["inherit", "pipe", "pipe"], shell: false, env: process.env });
    child.stdout.on("data", (d) => {
      output += String(d);
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      output += String(d);
      process.stderr.write(d);
    });
    child.on("error", reject);
    child.on("exit", resolve);
  });
  if (code === 0) return;
  const urls = output.match(/https:\/\/[a-z0-9-]+\.vercel\.app/gi) || [];
  const url = urls[urls.length - 1];
  if (!url || !/fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|network/i.test(output)) {
    throw new Error(`npx vercel --prod failed with exit code ${code ?? "unknown"}`);
  }
  console.log(`\n⏳ The Vercel CLI lost its connection, but the deployment was created. Following it: ${url}`);
  const deadline = Date.now() + 25 * 60_000;
  let misses = 0;
  while (Date.now() < deadline) {
    let st: ReturnType<typeof parseVercelInspectStatus> = null;
    try {
      st = parseVercelInspectStatus(await captureCommand("npx", ["vercel", "inspect", url]));
    } catch {
      st = null;
    }
    if (st === "ready") {
      console.log("✅ Vercel deployment is Ready and live.");
      return;
    }
    if (st === "error") throw new Error(`Vercel deployment failed: ${url} (open it on vercel.com for the build log)`);
    if (st === null && ++misses >= 10) throw new Error(`Couldn't read the Vercel deployment status 10 times in a row: ${url}`);
    if (st !== null) misses = 0;
    await sleep(15_000);
  }
  throw new Error(`Vercel deployment still not Ready after 25 minutes: ${url}`);
}

/** Serverless cold starts can take a while, so retry before calling it failed. */
async function verifyProductionHealth(): Promise<void> {
  stage = "health check";
  let lastError = "no response";
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(PROD_HEALTH_URL, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) {
        console.log(`✅ Health check passed: ${PROD_HEALTH_URL}`);
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (error) {
      lastError = errMsg(error);
    }
    await sleep(5_000);
  }
  throw new Error(
    `The new build is live but ${PROD_HEALTH_URL} is failing (${lastError}). app_version was NOT updated. Roll back with: npx vercel rollback`,
  );
}

/** After the deploy is live: tag the release. A failure only warns (the site is already up). */
async function tagRelease(version: string): Promise<void> {
  const tag = `v${version.replace(/^v/i, "")}`;
  try {
    if (await git(["tag", "--list", tag])) {
      console.log(`ℹ️  Tag ${tag} already exists; not moving it.`);
      return;
    }
    await runCommand("git", ["tag", "-a", tag, "-m", `Production release ${version}`]);
    await runCommand("git", ["push", "origin", tag]);
    console.log(`✅ Tagged and pushed ${tag}.`);
  } catch (e) {
    console.warn(`⚠️  Deploy is live, but tagging failed (${errMsg(e)}). Run: git tag -a ${tag} -m "Production release ${version}" && git push origin ${tag}`);
  }
}

/** "What's new" to Slack — only after a successful deploy; never fails it. */
async function announceRelease(version: string): Promise<void> {
  try {
    const settings = await readSettings(["release_notes_snapshot", "released_request_ids"]);
    let announcedIds: string[] = [];
    try {
      announcedIds = JSON.parse(settings.get("released_request_ids") || "[]");
    } catch {
      announcedIds = [];
    }
    const changes = collectReleaseChanges(settings.get("release_notes_snapshot") ?? null);
    const saveSnapshot = async () => {
      if (!changes.snapshot) return;
      markSnapshotAnnounced(changes.snapshot);
      await writeSetting("release_notes_snapshot", changes.snapshot, "Code snapshot last announced in Slack release notes (deploy-prod).");
    };
    if (!changes.hasBaseline) {
      await saveSnapshot();
      console.log("ℹ️  Release notes baseline recorded — the next deploy announces only new changes.");
      return;
    }
    const resolved = await fetchResolvedRequests(new Set(announcedIds));
    const text = (await writeReleaseNotes(version, changes)) + resolvedRequestsSection(resolved);
    if (!(await postReleaseNotesToSlack(text))) return;
    console.log(`📣 Release notes posted to Slack${resolved.length ? ` (+${resolved.length} resolved request(s))` : ""}.`);
    if (resolved.length) {
      const ids = [...announcedIds, ...resolved.map((r) => r.id)].slice(-1000);
      await writeSetting("released_request_ids", JSON.stringify(ids), "Slack request list rows already announced as resolved (deploy-prod).");
    }
    await saveSnapshot();
  } catch (e) {
    console.warn(`⚠️  Release announcement skipped: ${errMsg(e)}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // `npm run deploy:stamp-version -- 1.2.12`: only record the version (deploy already live).
  if (process.argv[2] === "--stamp-only") {
    const v = normalizeVersion(process.argv[3] || "");
    if (!v) throw new Error("Usage: npm run deploy:stamp-version -- <version>");
    await writeAppVersion(v);
    console.log(`✅ app_version set to ${v}.`);
    return;
  }
  installInterruptHandler();
  dbConfig(); // fail fast on missing DB env

  const cliArgs = process.argv.slice(2);
  const flags = ["--skip-checks", "--allow-dirty", "--dry-run"];
  const skipChecks =
    cliArgs.includes("--skip-checks") || ["1", "true"].includes(String(process.env.SKIP_DEPLOY_CHECKS));
  const allowDirty = cliArgs.includes("--allow-dirty");
  const dryRun = cliArgs.includes("--dry-run");
  const rest = cliArgs.filter((arg) => !flags.includes(arg));
  const explicitVersion = rest.find((arg) => !arg.startsWith("-")) ?? "";
  const vercelArgs = explicitVersion ? rest.filter((_, i) => i !== rest.indexOf(explicitVersion)) : rest;

  stage = "git check";
  await resolveGit(allowDirty);
  const sha = (await git(["rev-parse", "--short", "HEAD"])).slice(0, 12);
  await notify(`🧪 <b>${tgSafe(projectName)} deploy</b>: checks started on <code>${sha}</code>${dryRun ? " (dry run)" : ""}.`);

  // Fast gates first: each takes seconds and fails before the slow checks.
  stage = "fast gates";
  await assertVercelAuthenticated();
  await assertSchemaReady();
  assertApiInline(); // always, even with --skip-checks: a violation 500s every API route

  if (!skipChecks) await runPreDeployChecks();
  else console.log("\n⚠️  Skipping typecheck / tests / build (--skip-checks / SKIP_DEPLOY_CHECKS).\n");
  await checkProductionEnv();

  stage = "git re-check after the checks";
  await assertGitReady(allowDirty);

  if (dryRun) {
    console.log("\n✅ Dry run passed. Nothing was deployed.");
    await notify(`✅ <b>${tgSafe(projectName)}</b> dry run passed on <code>${sha}</code>. Nothing was deployed.`);
    return;
  }

  stage = "version question";
  const currentVersion = await readAppVersion();
  const deployVersion = explicitVersion ? normalizeVersion(explicitVersion) : await chooseVersion(currentVersion);
  if (!deployVersion) throw new Error("Deploy version cannot be empty.");

  console.log(`\n🚀 Starting Vercel production deploy for version ${deployVersion}...\n`);
  stage = "Vercel upload";
  await deployToVercel(vercelArgs);

  // Health before stamping: a broken build never gets recorded as the current version.
  await verifyProductionHealth();

  stage = "after going live";
  // The site is live here: a network blip on the stamp must not read as a failed deploy.
  let stamped = false;
  for (let attempt = 1; attempt <= 4 && !stamped; attempt++) {
    try {
      await writeAppVersion(deployVersion);
      stamped = true;
    } catch (e) {
      if (attempt === 4) {
        console.warn(`\n⚠️  Deploy is LIVE, but saving app_version ${deployVersion} failed (${errMsg(e)}).\n   Run: npm run deploy:stamp-version -- ${deployVersion}`);
        break;
      }
      console.warn(`⏳ Saving app_version failed (${errMsg(e)}); retrying (${attempt}/3)...`);
      await sleep(attempt * 5_000);
    }
  }

  console.log(`\n🎉 Production deploy succeeded!${stamped ? ` app_version updated to ${deployVersion}.` : ""}`);
  await tagRelease(deployVersion);
  await notify(`🎉 <b>${tgSafe(projectName)} ${tgSafe(deployVersion)} is live.</b>${stamped ? "" : "\n⚠️ app_version not saved: run npm run deploy:stamp-version -- " + tgSafe(deployVersion)}`);
  stage = "release notes";
  await announceRelease(deployVersion);
}

// A prompt left waiting on closed stdin (CI, piped input, no Telegram) lets Node drain its event
// loop and exit 0 mid-deploy. Treat any unfinished run as a failure so it never reads as success.
let finished = false;
process.on("beforeExit", () => {
  if (finished || interrupted) return;
  finished = true;
  console.error(`\n❌ Deploy aborted: stopped waiting for an answer during ${stage} (stdin closed). Nothing new went live unless the stage was after the upload.`);
  process.exitCode = 1;
});

main().then(() => {
  finished = true;
}).catch(async (error) => {
  finished = true;
  const msg = errMsg(error);
  console.error(`\n❌ Deploy aborted: ${msg}`);
  if (interrupted) return; // the signal handler owns the message and exit
  await notifyAbort(msg);
  process.exit(1);
});
