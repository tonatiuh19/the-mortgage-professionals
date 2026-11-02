import { describe, it, expect } from "vitest";
import { isBillingInternalEconomicsEnabled } from "./billing-internal";

describe("isBillingInternalEconomicsEnabled", () => {
  it("enabled only in local development (no Vercel env)", () => {
    expect(isBillingInternalEconomicsEnabled({ NODE_ENV: "development" })).toBe(
      true,
    );
  });

  it("disabled on Vercel production even if NODE_ENV were development", () => {
    expect(
      isBillingInternalEconomicsEnabled({
        NODE_ENV: "development",
        VERCEL_ENV: "production",
      }),
    ).toBe(false);
  });

  it("disabled on Vercel preview", () => {
    expect(
      isBillingInternalEconomicsEnabled({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      }),
    ).toBe(false);
  });

  it("disabled in production regardless of BILLING_INTERNAL_ECONOMICS", () => {
    expect(
      isBillingInternalEconomicsEnabled({
        NODE_ENV: "production",
        BILLING_INTERNAL_ECONOMICS: "true",
        VERCEL_ENV: "production",
      }),
    ).toBe(false);
  });

  it("disabled in test environments", () => {
    expect(isBillingInternalEconomicsEnabled({ NODE_ENV: "test" })).toBe(false);
  });
});
