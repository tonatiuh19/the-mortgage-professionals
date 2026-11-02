import { describe, it, expect } from "vitest";
import {
  getBillingPaymentStatus,
  resolveBillingPeriodQuotaPct,
  formatBillingPaymentAlertCopy,
} from "./billing-payment-status";
import type {
  BillingConfigPayload,
  QuotaUsageSlice,
  UnifiedQuotaSummary,
} from "@shared/api";

const slice = (pct: number): QuotaUsageSlice => ({
  dimension: "email_sends",
  used: pct * 50,
  included: 5000,
  reserved: 0,
  pct,
});

const baseConfig = {
  billingQuotaMode: "warn",
  billingUiEnabled: true,
} as BillingConfigPayload;

const quota = (emailPct: number): UnifiedQuotaSummary => ({
  mode: "warn",
  periodStart: "2026-06-20",
  sms_segments: { dimension: "sms_segments", used: 0, included: 1000, reserved: 0, pct: 10 },
  voice_minutes: { dimension: "voice_minutes", used: 0, included: 1500, reserved: 0, pct: 1 },
  email_sends: slice(emailPct),
  scheduler_bookings: { dimension: "scheduler_bookings", used: 0, included: 100, reserved: 0, pct: 0 },
  mortgi_ai_tokens: { dimension: "mortgi_ai_tokens", used: 0, included: 500000, reserved: 0, pct: 0 },
});

describe("resolveBillingPeriodQuotaPct", () => {
  it("prefers live billing-period quota over 30-day expenditure", () => {
    expect(resolveBillingPeriodQuotaPct(slice(1), 100)).toBe(1);
  });

  it("falls back to expenditure when quota slice missing", () => {
    expect(resolveBillingPeriodQuotaPct(undefined, 85)).toBe(85);
  });
});

describe("getBillingPaymentStatus", () => {
  it("does not warn on email when 30d is 100% but paid period is 1%", () => {
    const status = getBillingPaymentStatus({
      config: baseConfig,
      expenditure: {
        pctEmail: 100,
        pctSms: 66,
      } as never,
      quota: quota(1),
    });
    expect(status.shouldWarn).toBe(false);
    expect(status.quotaAtCap).toBe(false);
    expect(status.maxPct).toBe(10);
  });

  it("warns when paid-period email is at 100%", () => {
    const status = getBillingPaymentStatus({
      config: baseConfig,
      expenditure: { pctEmail: 1 } as never,
      quota: quota(100),
    });
    expect(status.shouldWarn).toBe(true);
    expect(status.quotaAtCap).toBe(true);
    expect(status.overDimensions).toContain("Email");
  });

  it("approaching copy only between 80-99%", () => {
    const status = getBillingPaymentStatus({
      config: baseConfig,
      expenditure: null,
      quota: quota(85),
    });
    expect(status.quotaAtCap).toBe(false);
    expect(status.overDimensions).toContain("Email");
  });
});

describe("formatBillingPaymentAlertCopy", () => {
  it("says monthly quota reached at cap in warn mode", () => {
    const copy = formatBillingPaymentAlertCopy({
      shouldWarn: true,
      paymentRequired: false,
      quotaAtCap: true,
      overDimensions: ["Email"],
      maxPct: 100,
      suggestedPackId: "email_1k",
    });
    expect(copy.title).toBe("Monthly quota reached");
    expect(copy.body).toContain("billing period");
    expect(copy.body).not.toContain("Approaching");
  });
});
