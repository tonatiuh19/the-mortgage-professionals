import { describe, expect, it } from "vitest";
import reducer, {
  createStripeSubscriptionSetup,
  fetchBillingOverdue,
  fetchOverduePaymentOptions,
  payOverdueInvoice,
} from "./billingSlice";
import {
  formatDaysOverdue,
  formatOverdueAmount,
} from "@/hooks/useBillingOverdue";
import type { BillingOverdueInvoice } from "@shared/api";

const invoice: BillingOverdueInvoice = {
  invoice_id: "in_1",
  number: "QHYJCHRX-0015",
  amount_due_usd: 350,
  currency: "usd",
  failed_at: "2026-10-20T20:08:18.000Z",
  days_overdue: 6,
  attempt_count: 4,
  next_payment_attempt: null,
  hosted_invoice_url: "https://invoice.stripe.com/i/x",
};

const initial = () => reducer(undefined, { type: "@@init" });

describe("billing slice — overdue renewal", () => {
  it("starts with nothing owed and not loaded", () => {
    const s = initial();
    expect(s.overdue).toBeNull();
    expect(s.overdueLoaded).toBe(false);
    expect(s.isCheckingOverdue).toBe(false);
  });

  it("stores the overdue invoice when the check succeeds", () => {
    let s = reducer(initial(), fetchBillingOverdue.pending("r", undefined));
    expect(s.isCheckingOverdue).toBe(true);
    s = reducer(s, fetchBillingOverdue.fulfilled(invoice, "r", undefined));
    expect(s.overdue).toEqual(invoice);
    expect(s.overdueLoaded).toBe(true);
    expect(s.isCheckingOverdue).toBe(false);
  });

  it("clears the badge once Stripe says nothing is owed", () => {
    let s = reducer(initial(), fetchBillingOverdue.fulfilled(invoice, "r", undefined));
    s = reducer(s, fetchBillingOverdue.fulfilled(null, "r2", true));
    expect(s.overdue).toBeNull();
  });

  it("keeps the last known value when a check fails (no flicker, no false clear)", () => {
    let s = reducer(initial(), fetchBillingOverdue.fulfilled(invoice, "r", undefined));
    s = reducer(
      s,
      fetchBillingOverdue.rejected(new Error("502"), "r2", undefined, "Could not check"),
    );
    expect(s.overdue).toEqual(invoice);
    expect(s.isCheckingOverdue).toBe(false);
  });

  it("a 409 from subscription setup shows the overdue card, not an error", () => {
    const s = reducer(
      initial(),
      createStripeSubscriptionSetup.rejected(
        new Error("409"),
        "r",
        undefined,
        { message: "Your last renewal is unpaid.", overdue: invoice },
      ),
    );
    expect(s.overdue).toEqual(invoice);
    expect(s.overdueLoaded).toBe(true);
    expect(s.error).toBeNull();
    expect(s.subscriptionSetup).toBeNull();
    expect(s.isSubscriptionSetupLoading).toBe(false);
  });

  it("other setup failures still surface as an error", () => {
    const s = reducer(
      initial(),
      createStripeSubscriptionSetup.rejected(new Error("x"), "r", undefined, "Card declined"),
    );
    expect(s.error).toBe("Card declined");
    expect(s.overdue).toBeNull();
  });
});

describe("billing slice — in-app overdue payment", () => {
  const card = {
    id: "pm_mc",
    brand: "mastercard",
    last4: "4444",
    exp_month: 12,
    exp_year: 2031,
    wallet: null,
    is_default: false,
    usable: true,
    unusable_reason: null,
  };
  const req = { invoice_id: "in_1", payment_method_id: "pm_mc" };

  it("loads the overdue invoice and cards together", () => {
    const s = reducer(
      initial(),
      fetchOverduePaymentOptions.fulfilled({ overdue: invoice, cards: [card] }, "r"),
    );
    expect(s.overdue).toEqual(invoice);
    expect(s.overdueCards).toEqual([card]);
    expect(s.isLoadingOverdueCards).toBe(false);
  });

  it("a successful payment clears the overdue state", () => {
    let s = reducer(
      initial(),
      fetchOverduePaymentOptions.fulfilled({ overdue: invoice, cards: [card] }, "r"),
    );
    s = reducer(s, payOverdueInvoice.pending("p", req));
    expect(s.isPayingOverdue).toBe(true);
    s = reducer(s, payOverdueInvoice.fulfilled({ paid: true }, "p", req));
    expect(s.isPayingOverdue).toBe(false);
    expect(s.overdue).toBeNull();
    expect(s.overdueCards).toEqual([]);
  });

  it("3-D Secure step keeps the invoice overdue until confirmed", () => {
    let s = reducer(
      initial(),
      fetchOverduePaymentOptions.fulfilled({ overdue: invoice, cards: [card] }, "r"),
    );
    s = reducer(
      s,
      payOverdueInvoice.fulfilled(
        { paid: false, requiresAction: true, clientSecret: "pi_secret" },
        "p",
        req,
      ),
    );
    expect(s.overdue).toEqual(invoice);
    expect(s.isPayingOverdue).toBe(false);
  });

  it("a decline keeps the invoice and stops the spinner", () => {
    let s = reducer(
      initial(),
      fetchOverduePaymentOptions.fulfilled({ overdue: invoice, cards: [card] }, "r"),
    );
    s = reducer(s, payOverdueInvoice.pending("p", req));
    s = reducer(
      s,
      payOverdueInvoice.rejected(new Error("402"), "p", req, "Your card was declined."),
    );
    expect(s.overdue).toEqual(invoice);
    expect(s.isPayingOverdue).toBe(false);
  });
});

describe("overdue formatters", () => {
  it("formats the amount as currency", () => {
    expect(formatOverdueAmount(invoice)).toBe("$350.00");
    expect(formatOverdueAmount({ ...invoice, amount_due_usd: 1234.5 })).toBe("$1,234.50");
  });

  it("says today / 1 day / N days", () => {
    expect(formatDaysOverdue({ ...invoice, days_overdue: 0 })).toBe("today");
    expect(formatDaysOverdue({ ...invoice, days_overdue: -1 })).toBe("today");
    expect(formatDaysOverdue({ ...invoice, days_overdue: 1 })).toBe("1 day");
    expect(formatDaysOverdue({ ...invoice, days_overdue: 6 })).toBe("6 days");
  });
});
