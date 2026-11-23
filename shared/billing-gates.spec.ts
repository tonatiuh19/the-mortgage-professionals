import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { computeBillingAccessState } from "./billing-access";

const api = fs.readFileSync(path.resolve(__dirname, "../api/index.ts"), "utf8");
const schema = fs.readFileSync(path.resolve(__dirname, "../database/schema.sql"), "utf8");

/** Body of a top-level `const name: RequestHandler` / `async function name` in api/index.ts. */
function body(name: string): string {
  const start = api.search(new RegExp(`(const ${name}: RequestHandler|async function ${name}\\()`));
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  const next = api.slice(start + 20).search(/\n(?:const [A-Za-z]+: RequestHandler|async function |function )/);
  return api.slice(start, next === -1 ? undefined : start + 20 + next);
}

describe("billing send gates are wired (regression: they existed but were never called)", () => {
  it.each([
    ["handleEmailSend", "email_sends"],
    ["handleSendMessage", "email_sends"],
    ["executeFlowSendStep", "flowBilling"],
    ["sendBroadcastAsync", "billingPrecheckBroadcast"],
    ["handleCreateBroadcast", "billingPrecheckBroadcast"],
    ["handleBookMeeting", "scheduler_bookings"],
    ["handleCreateScheduledMeeting", "scheduler_bookings"],
    ["handleVoiceTwiml", "voice_minutes"],
  ])("%s checks billing before sending", (fn, marker) => {
    const b = body(fn);
    expect(b).toMatch(/billingPrecheck(Broadcast)?\(/);
    expect(b).toContain(marker);
  });

  it.each(["handleEmailSend", "handleSendMessage", "executeFlowSendStep", "sendBroadcastAsync", "handleBookMeeting", "handleCreateScheduledMeeting", "handleVoiceLog"])(
    "%s records usage after sending",
    (fn) => expect(body(fn)).toContain("billingRecord("),
  );

  it("never gates login codes, inbound SMS or the voice token", () => {
    for (const fn of ["handleVoiceToken"]) expect(body(fn)).not.toContain("billingPrecheck");
    const inbound = api.slice(api.indexOf("Applies a STOP/START reply"), api.indexOf("Applies a STOP/START reply") + 20000);
    expect(inbound).not.toContain("billingPrecheck");
  });

  it("only exempts real loan-lifecycle flow events", () => {
    const enumMatch = /`trigger_event` enum\(([^)]*)\)/.exec(schema);
    const allowed = new Set((enumMatch?.[1] ?? "").split(",").map((v) => v.trim().replace(/'/g, "")));
    const exempt = /BILLING_EXEMPT_FLOW_EVENTS = new Set\(\[([\s\S]*?)\]\)/.exec(api)?.[1] ?? "";
    const events = [...exempt.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) expect(allowed.has(e)).toBe(true);
    for (const marketing of ["app_sent", "no_activity", "manual"]) expect(events).not.toContain(marketing);
  });
});

describe("launch timeline (Nov 24, 2026 00:00 PT, 14-day grace, suspend at day 21)", () => {
  const base = {
    billingQuotaMode: "enforce" as const, billingUiEnabled: true, billingOverageEnabled: false,
    subscriptionStatus: "inactive", pastDueAt: null, graceEndsAt: null, restrictedAt: null, suspendedAt: null,
    onboardingStartedAt: "2026-11-24T08:00:00.000Z", graceDays: 14, suspendDays: 21, pctSms: 0, pctEmail: 0, pctVoice: 0,
  };
  const at = (iso: string, extra: Partial<typeof base> = {}) =>
    computeBillingAccessState({ ...base, ...extra, nowMs: Date.parse(iso) } as any);
  it.each([
    ["2026-11-23T23:00:00Z", "healthy", false],
    ["2026-11-24T08:01:00Z", "subscription_grace", false],
    ["2026-12-08T07:59:00Z", "subscription_grace", false],
    ["2026-12-08T08:01:00Z", "subscription_restricted", true],
    ["2026-12-15T08:01:00Z", "subscription_suspended", true],
  ])("%s → %s", (iso, level, blocks) => {
    const s = at(iso);
    expect(s.level).toBe(level);
    expect(s.blocksCostActions).toBe(blocks);
  });
  it("paying restores access instantly", () => {
    expect(at("2026-12-20T18:00:00Z", { subscriptionStatus: "active" }).blocksCostActions).toBe(false);
  });
});
