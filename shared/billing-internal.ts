import type {
  BillingExpenditurePayload,
  BillingFixedInfraBreakdown,
  BillingStripePack,
  BillingTopUpPackEconomics,
} from "./api";
import type { BudgetBreakdown } from "./billing-calculator";

/** Internal COGS/margin — local `npm run dev` only. */
export function isBillingInternalEconomicsEnabled(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {},
): boolean {
  const vercelEnv = String(env.VERCEL_ENV ?? "").trim().toLowerCase();
  if (vercelEnv === "production" || vercelEnv === "preview") return false;
  return env.NODE_ENV === "development";
}

const EMPTY_INFRA: BillingFixedInfraBreakdown = {
  vercelUsd: 0,
  ablyUsd: 0,
  tidbUsd: 0,
  resendUsd: 0,
  cdnHostgatorImapUsd: 0,
  tenDlcAmortizedUsd: 0,
  zoomApiLicenseUsd: 0,
};

export function stripInternalBillingExpenditure(
  expenditure: BillingExpenditurePayload,
): BillingExpenditurePayload {
  return {
    ...expenditure,
    variableUsageCogsUsd: 0,
    fixedInfraCogsUsd: 0,
    fixedInfraBreakdown: EMPTY_INFRA,
    zoomBrokerCogsUsd: 0,
    totalPlatformCogsUsd: 0,
    stripeFeesUsd: 0,
    grossMarginUsd: 0,
    estimatedMarginUsd: 0,
    mortgiCogsUsd: 0,
    broadcast: {
      ...expenditure.broadcast,
      cogsUsd: 0,
      emailCogsUsd: 0,
      shareOfVariableCogsPct: 0,
    },
  };
}

export function stripInternalBudgetForecast(
  forecast: BudgetBreakdown,
): BudgetBreakdown {
  return {
    ...forecast,
    estimatedCogsUsd: 0,
    stripeFeesUsd: 0,
    grossMarginUsd: 0,
    estimatedMarginUsd: 0,
    broadcast: {
      ...forecast.broadcast,
      cogsUsd: 0,
      emailCogsUsd: 0,
      costPerBlastUsd: 0,
      shareOfVariableCogsPct: 0,
    },
  };
}

export function stripInternalPackEconomics(
  packs: BillingStripePack[],
): BillingStripePack[] {
  return packs.map(({ economics: _economics, ...pack }) => pack);
}

export type { BillingTopUpPackEconomics };
