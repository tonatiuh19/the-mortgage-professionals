import { describe, it, expect } from "vitest";
import {
  toSqlDate,
  currentCalendarMonthStart,
  calendarMonthEnd,
  stripePeriodToSqlDate,
  stripeSubscriptionPeriodFromObject,
  resolveBillingPeriodAnchor,
  shouldAdvanceCalendarBillingPeriod,
  resolveActivePeriodStart,
  isBillingPeriodTransition,
  shouldSyncStripeSubscriptionPeriod,
  formatBillingPeriodRange,
  formatQuotaRenewalLabel,
  quotaRenewsOnDate,
  resolveUsageSnapshotPeriod,
} from "./billing-period";

describe("toSqlDate", () => {
  it("parses YYYY-MM-DD strings", () => {
    expect(toSqlDate("2026-06-20")).toBe("2026-06-20");
    expect(toSqlDate("2026-06-20T00:00:00.000Z")).toBe("2026-06-20");
  });

  it("parses Date objects in local components", () => {
    expect(toSqlDate(new Date("2026-07-20T15:00:00Z"))).toBe("2026-07-20");
  });

  it("returns null for invalid input", () => {
    expect(toSqlDate(null)).toBeNull();
    expect(toSqlDate("")).toBeNull();
    expect(toSqlDate("not-a-date")).toBeNull();
  });
});

describe("currentCalendarMonthStart", () => {
  it("returns first of month in UTC", () => {
    expect(currentCalendarMonthStart(new Date("2026-07-09T12:00:00Z"))).toBe(
      "2026-07-01",
    );
    expect(currentCalendarMonthStart(new Date("2026-12-31T23:59:59Z"))).toBe(
      "2026-12-01",
    );
  });
});

describe("calendarMonthEnd", () => {
  it("handles 31-day months", () => {
    expect(calendarMonthEnd("2026-07-01")).toBe("2026-07-31");
  });

  it("handles February in leap year", () => {
    expect(calendarMonthEnd("2028-02-01")).toBe("2028-02-29");
  });

  it("handles February in non-leap year", () => {
    expect(calendarMonthEnd("2026-02-01")).toBe("2026-02-28");
  });

  it("handles 30-day months", () => {
    expect(calendarMonthEnd("2026-06-01")).toBe("2026-06-30");
  });
});

describe("stripePeriodToSqlDate", () => {
  const jun20Unix = Math.floor(
    new Date("2026-06-20T00:00:00Z").getTime() / 1000,
  );
  const jul20Unix = Math.floor(
    new Date("2026-07-20T00:00:00Z").getTime() / 1000,
  );

  it("converts unix seconds to UTC date", () => {
    expect(stripePeriodToSqlDate(jun20Unix)).toBe("2026-06-20");
  });

  it("handles renewal boundary (Jul 20, 2026 00:00:00 UTC)", () => {
    expect(stripePeriodToSqlDate(jul20Unix)).toBe("2026-07-20");
  });

  it("rejects invalid timestamps", () => {
    expect(stripePeriodToSqlDate(0)).toBeNull();
    expect(stripePeriodToSqlDate(-1)).toBeNull();
    expect(stripePeriodToSqlDate("bad")).toBeNull();
    expect(stripePeriodToSqlDate(null)).toBeNull();
  });
});

describe("stripeSubscriptionPeriodFromObject", () => {
  const jun20Unix = Math.floor(
    new Date("2026-06-20T00:00:00Z").getTime() / 1000,
  );
  const jul20Unix = Math.floor(
    new Date("2026-07-20T00:00:00Z").getTime() / 1000,
  );

  it("extracts period from Stripe subscription payload", () => {
    const sub = {
      current_period_start: jun20Unix,
      current_period_end: jul20Unix,
    };
    expect(stripeSubscriptionPeriodFromObject(sub)).toEqual({
      periodStart: "2026-06-20",
      periodEnd: "2026-07-20",
    });
  });

  it("returns nulls when fields missing", () => {
    expect(stripeSubscriptionPeriodFromObject({})).toEqual({
      periodStart: null,
      periodEnd: null,
    });
  });
});

describe("resolveBillingPeriodAnchor", () => {
  it("uses calendar when no Stripe subscription id", () => {
    expect(
      resolveBillingPeriodAnchor({
        stripeSubscriptionId: null,
        subscriptionStatus: "active",
      }),
    ).toBe("calendar");
    expect(
      resolveBillingPeriodAnchor({
        stripeSubscriptionId: "",
        subscriptionStatus: "active",
      }),
    ).toBe("calendar");
  });

  it("uses stripe anchor for active linked subscriptions", () => {
    expect(
      resolveBillingPeriodAnchor({
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "active",
      }),
    ).toBe("stripe");
  });

  it("uses stripe anchor for trialing and past_due", () => {
    expect(
      resolveBillingPeriodAnchor({
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "trialing",
      }),
    ).toBe("stripe");
    expect(
      resolveBillingPeriodAnchor({
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "past_due",
      }),
    ).toBe("stripe");
  });

  it("falls back to calendar when subscription canceled or inactive", () => {
    for (const status of ["canceled", "inactive", "incomplete_expired"]) {
      expect(
        resolveBillingPeriodAnchor({
          stripeSubscriptionId: "sub_123",
          subscriptionStatus: status,
        }),
      ).toBe("calendar");
    }
  });

  it("keeps stripe anchor for incomplete (checkout in progress)", () => {
    expect(
      resolveBillingPeriodAnchor({
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "incomplete",
      }),
    ).toBe("stripe");
  });
});

describe("shouldAdvanceCalendarBillingPeriod", () => {
  it("never advances when stripe anchor is active", () => {
    expect(
      shouldAdvanceCalendarBillingPeriod({
        anchor: "stripe",
        storedPeriodStart: "2026-06-20",
        calendarMonthStart: "2026-07-01",
      }),
    ).toBe(false);
  });

  it("advances calendar tenants when month rolled over", () => {
    expect(
      shouldAdvanceCalendarBillingPeriod({
        anchor: "calendar",
        storedPeriodStart: "2026-06-01",
        calendarMonthStart: "2026-07-01",
      }),
    ).toBe(true);
  });

  it("does not advance when still in same calendar month", () => {
    expect(
      shouldAdvanceCalendarBillingPeriod({
        anchor: "calendar",
        storedPeriodStart: "2026-07-01",
        calendarMonthStart: "2026-07-01",
      }),
    ).toBe(false);
  });

  it("does not advance when stored period is ahead (clock skew guard)", () => {
    expect(
      shouldAdvanceCalendarBillingPeriod({
        anchor: "calendar",
        storedPeriodStart: "2026-08-01",
        calendarMonthStart: "2026-07-01",
      }),
    ).toBe(false);
  });
});

describe("resolveActivePeriodStart", () => {
  it("prefers subscription period when set", () => {
    expect(
      resolveActivePeriodStart({
        subscriptionPeriodStart: "2026-06-20",
        anchor: "stripe",
        calendarMonthStart: "2026-07-01",
      }),
    ).toBe("2026-06-20");
  });

  it("falls back to calendar month start", () => {
    expect(
      resolveActivePeriodStart({
        subscriptionPeriodStart: null,
        anchor: "calendar",
        calendarMonthStart: "2026-07-01",
      }),
    ).toBe("2026-07-01");
  });
});

describe("isBillingPeriodTransition", () => {
  it("detects period changes in both directions", () => {
    expect(isBillingPeriodTransition("2026-07-01", "2026-06-20")).toBe(true);
    expect(isBillingPeriodTransition("2026-06-20", "2026-07-20")).toBe(true);
  });

  it("is false when period unchanged", () => {
    expect(isBillingPeriodTransition("2026-06-20", "2026-06-20")).toBe(false);
  });

  it("is false when next period is null", () => {
    expect(isBillingPeriodTransition("2026-06-20", null)).toBe(false);
  });

  it("is true on first period assignment", () => {
    expect(isBillingPeriodTransition(null, "2026-06-20")).toBe(true);
  });
});

describe("shouldSyncStripeSubscriptionPeriod", () => {
  it("syncs when status differs", () => {
    expect(
      shouldSyncStripeSubscriptionPeriod({
        dbPeriodStart: "2026-06-20",
        dbStatus: "active",
        stripePeriodStart: "2026-06-20",
        stripeStatus: "past_due",
      }),
    ).toBe(true);
  });

  it("syncs when Stripe period differs (calendar drift fix)", () => {
    expect(
      shouldSyncStripeSubscriptionPeriod({
        dbPeriodStart: "2026-07-01",
        dbStatus: "active",
        stripePeriodStart: "2026-06-20",
        stripeStatus: "active",
      }),
    ).toBe(true);
  });

  it("skips when already aligned", () => {
    expect(
      shouldSyncStripeSubscriptionPeriod({
        dbPeriodStart: "2026-06-20",
        dbStatus: "active",
        stripePeriodStart: "2026-06-20",
        stripeStatus: "active",
      }),
    ).toBe(false);
  });

  it("skips when Stripe period is missing", () => {
    expect(
      shouldSyncStripeSubscriptionPeriod({
        dbPeriodStart: "2026-07-01",
        dbStatus: "active",
        stripePeriodStart: null,
        stripeStatus: "active",
      }),
    ).toBe(false);
  });
});

describe("formatBillingPeriodRange", () => {
  it("formats range with end date", () => {
    expect(formatBillingPeriodRange("2026-06-20", "2026-07-20")).toBe(
      "2026-06-20 → 2026-07-20",
    );
  });

  it("formats open-ended period", () => {
    expect(formatBillingPeriodRange("2026-06-20", null)).toBe(
      "Started 2026-06-20",
    );
  });
});

describe("formatQuotaRenewalLabel", () => {
  it("formats renewal date for UI", () => {
    expect(formatQuotaRenewalLabel("2026-07-20")).toBe("Jul 20, 2026");
    expect(formatQuotaRenewalLabel("2026-07-20", { short: true })).toBe(
      "Jul 20",
    );
  });

  it("returns null for missing date", () => {
    expect(formatQuotaRenewalLabel(null)).toBeNull();
  });
});

describe("quotaRenewsOnDate", () => {
  it("passes through valid ISO dates", () => {
    expect(quotaRenewsOnDate("2026-07-20")).toBe("2026-07-20");
  });
});

describe("resolveUsageSnapshotPeriod", () => {
  it("uses Stripe subscription period when present", () => {
    const window = resolveUsageSnapshotPeriod({
      subscriptionPeriodStart: "2026-06-20",
      subscriptionPeriodEnd: "2026-07-20",
    });
    expect(window.periodStart).toBe("2026-06-20");
    expect(window.periodEnd).toBe("2026-07-20");
    expect(window.sinceUtc).toBe("2026-06-20 00:00:00");
  });

  it("falls back to calendar month when no subscription dates", () => {
    const window = resolveUsageSnapshotPeriod({
      subscriptionPeriodStart: null,
      subscriptionPeriodEnd: null,
      calendarMonthStart: "2026-07-01",
    });
    expect(window.periodStart).toBe("2026-07-01");
    expect(window.periodEnd).toBe("2026-07-31");
    expect(window.sinceUtc).toBe("2026-07-01 00:00:00");
  });
});

describe("edge cases — subscription started on 20th", () => {
  const jun20Unix = Math.floor(
    new Date("2026-06-20T00:00:00Z").getTime() / 1000,
  );
  const jul20Unix = Math.floor(
    new Date("2026-07-20T00:00:00Z").getTime() / 1000,
  );

  it("stripe period spans Jun 20 – Jul 20", () => {
    const period = stripeSubscriptionPeriodFromObject({
      current_period_start: jun20Unix,
      current_period_end: jul20Unix,
    });
    expect(period.periodStart).toBe("2026-06-20");
    expect(period.periodEnd).toBe("2026-07-20");
    expect(formatQuotaRenewalLabel(period.periodEnd!)).toBe("Jul 20, 2026");
  });

  it("calendar advance on Jul 1 must not apply to stripe-anchored tenant", () => {
    const anchor = resolveBillingPeriodAnchor({
      stripeSubscriptionId: "sub_live",
      subscriptionStatus: "active",
    });
    expect(
      shouldAdvanceCalendarBillingPeriod({
        anchor,
        storedPeriodStart: "2026-06-20",
        calendarMonthStart: "2026-07-01",
      }),
    ).toBe(false);
  });

  it("billing config load corrects Jul 1 drift back to Jun 20", () => {
    expect(
      shouldSyncStripeSubscriptionPeriod({
        dbPeriodStart: "2026-07-01",
        dbStatus: "active",
        stripePeriodStart: "2026-06-20",
        stripeStatus: "active",
      }),
    ).toBe(true);
  });
});

describe("edge cases — year boundary", () => {
  it("calendar month end for December", () => {
    expect(calendarMonthEnd("2026-12-01")).toBe("2026-12-31");
  });

  it("calendar advance from December to January", () => {
    expect(
      shouldAdvanceCalendarBillingPeriod({
        anchor: "calendar",
        storedPeriodStart: "2026-12-01",
        calendarMonthStart: "2027-01-01",
      }),
    ).toBe(true);
  });
});
