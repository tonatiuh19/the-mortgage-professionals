/**
 * Billing access ladder — subscription grace/restricted/suspended + quota blocks.
 * Shared by API and client for consistent UX gating.
 */

export type BillingAccessLevel =
  | "healthy"
  | "soft_warn"
  | "subscription_grace"
  | "quota_blocked"
  | "subscription_restricted"
  | "subscription_suspended";

/** Why the tenant is in subscription_grace (onboarding vs failed renewal). */
export type BillingGraceKind = "none" | "onboarding" | "payment_past_due";

export type BillingAccessInput = {
  billingQuotaMode: "off" | "shadow" | "warn" | "enforce";
  /** When false, billing is not live — no banners or blocks regardless of mode. */
  billingUiEnabled?: boolean;
  billingOverageEnabled: boolean;
  subscriptionStatus: string | null;
  pastDueAt: string | null;
  graceEndsAt: string | null;
  restrictedAt: string | null;
  suspendedAt: string | null;
  /** When billing UI went live — starts deploy onboarding grace window */
  onboardingStartedAt: string | null;
  graceDays: number;
  suspendDays: number;
  nowMs?: number;
  pctSms: number;
  pctEmail: number;
  pctVoice: number;
  pctScheduler?: number;
  pctMortgi?: number;
  suggestedPackId?: string | null;
};

export type BillingAccessState = {
  level: BillingAccessLevel;
  graceKind: BillingGraceKind;
  /** Block outbound SMS/email, broadcast, scheduler create, Mortgi, etc. */
  blocksCostActions: boolean;
  /** Full-screen billing wall for platform_owner */
  showsFullWall: boolean;
  /** Brokers cannot send (restricted or worse) */
  blocksBrokerSends: boolean;
  graceEndsAt: string | null;
  restrictedAt: string | null;
  suspendedAt: string | null;
  onboardingStartedAt: string | null;
  /** Seconds until grace ends (subscription_grace only) */
  secondsUntilGraceEnd: number | null;
  headline: string;
  detail: string;
  suggestedPackId: string | null;
  whatStillWorks: string[];
  showWarnBanner: boolean;
};

const DEFAULT_STILL_WORKS = [
  "View pipeline, clients, and conversations",
  "Receive inbound SMS and email",
  "Client portal stays online",
  "Export and read historical data",
];

const MS_PER_DAY = 86400000;

function quotaExceeded(
  mode: BillingAccessInput["billingQuotaMode"],
  overage: boolean,
  pcts: number[],
): boolean {
  if (mode !== "enforce") return false;
  if (overage) return false;
  return pcts.some((p) => p >= 100);
}

function softWarn(pcts: number[]): boolean {
  return pcts.some((p) => p >= 80);
}

function ladderFromStart(
  startIso: string,
  graceDays: number,
  suspendDays: number,
  nowMs: number,
  storedGraceEndsAt: string | null,
): {
  graceEndMs: number;
  suspendMs: number;
  secondsUntilGraceEnd: number | null;
  graceEndsAt: string;
} {
  const startMs = new Date(startIso).getTime();
  const graceEndMs = storedGraceEndsAt
    ? new Date(storedGraceEndsAt).getTime()
    : startMs + graceDays * MS_PER_DAY;
  const suspendMs = startMs + suspendDays * MS_PER_DAY;
  const secondsUntilGraceEnd =
    nowMs < graceEndMs
      ? Math.max(0, Math.floor((graceEndMs - nowMs) / 1000))
      : null;
  return {
    graceEndMs,
    suspendMs,
    secondsUntilGraceEnd,
    graceEndsAt: new Date(graceEndMs).toISOString(),
  };
}

function resolveSubscriptionLadder(input: BillingAccessInput): {
  level: BillingAccessLevel;
  graceKind: BillingGraceKind;
  graceEndsAt: string | null;
  secondsUntilGraceEnd: number | null;
} {
  const now = input.nowMs ?? Date.now();
  const status = (input.subscriptionStatus ?? "active").toLowerCase();
  const graceDays = input.graceDays;
  const suspendDays = input.suspendDays;

  if (status === "active" || status === "trialing") {
    return {
      level: "healthy",
      graceKind: "none",
      graceEndsAt: null,
      secondsUntilGraceEnd: null,
    };
  }

  if (status === "past_due" && input.pastDueAt) {
    const { graceEndMs, suspendMs, secondsUntilGraceEnd, graceEndsAt } =
      ladderFromStart(
        input.pastDueAt,
        graceDays,
        suspendDays,
        now,
        input.graceEndsAt,
      );

    if (now < graceEndMs) {
      return {
        level: "subscription_grace",
        graceKind: "payment_past_due",
        graceEndsAt,
        secondsUntilGraceEnd,
      };
    }
    if (now < suspendMs) {
      return {
        level: "subscription_restricted",
        graceKind: "none",
        graceEndsAt,
        secondsUntilGraceEnd: null,
      };
    }
    return {
      level: "subscription_suspended",
      graceKind: "none",
      graceEndsAt,
      secondsUntilGraceEnd: null,
    };
  }

  if (
    (status === "inactive" || status === "incomplete") &&
    input.onboardingStartedAt
  ) {
    const startMs = new Date(input.onboardingStartedAt).getTime();
    if (now < startMs) {
      return {
        level: "healthy",
        graceKind: "none",
        graceEndsAt: null,
        secondsUntilGraceEnd: null,
      };
    }

    const { graceEndMs, suspendMs, secondsUntilGraceEnd, graceEndsAt } =
      ladderFromStart(
        input.onboardingStartedAt,
        graceDays,
        suspendDays,
        now,
        null,
      );

    if (now < graceEndMs) {
      return {
        level: "subscription_grace",
        graceKind: "onboarding",
        graceEndsAt,
        secondsUntilGraceEnd,
      };
    }
    if (now < suspendMs) {
      return {
        level: "subscription_restricted",
        graceKind: "none",
        graceEndsAt,
        secondsUntilGraceEnd: null,
      };
    }
    return {
      level: "subscription_suspended",
      graceKind: "none",
      graceEndsAt,
      secondsUntilGraceEnd: null,
    };
  }

  if (status === "canceled") {
    return {
      level: "subscription_suspended",
      graceKind: "none",
      graceEndsAt: null,
      secondsUntilGraceEnd: null,
    };
  }

  return {
    level: "healthy",
    graceKind: "none",
    graceEndsAt: null,
    secondsUntilGraceEnd: null,
  };
}

export function computeBillingAccessState(
  input: BillingAccessInput,
): BillingAccessState {
  const suggestedPackId = input.suggestedPackId ?? "sms_1k";
  const billingLive = input.billingUiEnabled !== false;

  // Billing not live — today’s production behavior (no banners, no blocks).
  if (input.billingQuotaMode === "off" && !billingLive) {
    return {
      level: "healthy",
      graceKind: "none",
      blocksCostActions: false,
      showsFullWall: false,
      blocksBrokerSends: false,
      graceEndsAt: null,
      restrictedAt: input.restrictedAt,
      suspendedAt: input.suspendedAt,
      onboardingStartedAt: input.onboardingStartedAt,
      secondsUntilGraceEnd: null,
      headline: "All systems normal",
      detail: "Usage and subscription are in good standing.",
      suggestedPackId,
      whatStillWorks: [],
      showWarnBanner: false,
    };
  }

  const pcts = [
    input.pctSms,
    input.pctEmail,
    input.pctVoice,
    input.pctScheduler ?? 0,
    input.pctMortgi ?? 0,
  ];
  const blocksEnforcement = input.billingQuotaMode === "enforce";
  const showUsageBanners =
    input.billingQuotaMode === "warn" || input.billingQuotaMode === "enforce";

  const stillWorks = [...DEFAULT_STILL_WORKS];

  const ladder = resolveSubscriptionLadder(input);
  let level = ladder.level;
  let graceKind = ladder.graceKind;
  let graceEndsAt = ladder.graceEndsAt;
  let secondsUntilGraceEnd = ladder.secondsUntilGraceEnd;

  const quotaBlock = quotaExceeded(
    input.billingQuotaMode,
    input.billingOverageEnabled,
    pcts,
  );

  if (quotaBlock && level !== "subscription_suspended") {
    level = "quota_blocked";
    graceKind = "none";
  } else if (level === "healthy" && showUsageBanners && softWarn(pcts)) {
    level = "soft_warn";
  }

  const blocksCostActions =
    blocksEnforcement &&
    (level === "quota_blocked" ||
      level === "subscription_restricted" ||
      level === "subscription_suspended");

  const showsFullWall =
    blocksEnforcement && level === "subscription_suspended";

  const blocksBrokerSends = blocksCostActions;
  const showWarnBanner =
    billingLive &&
    (level === "subscription_grace" ||
      (level === "soft_warn" && showUsageBanners) ||
      (blocksEnforcement &&
        (level === "quota_blocked" || level === "subscription_restricted")));

  let headline = "All systems normal";
  let detail = "Usage and subscription are in good standing.";

  switch (level) {
    case "soft_warn":
      headline = "Approaching monthly quota";
      detail =
        "You're at 80%+ on SMS, email, or voice. Add capacity before sends are blocked.";
      break;
    case "subscription_grace":
      if (graceKind === "onboarding") {
        headline = "Welcome — activate your platform subscription";
        detail = blocksEnforcement
          ? "You have a complimentary grace period after billing went live. Subscribe before it ends to keep outbound sends uninterrupted."
          : "Billing is live. Complete your subscription during this grace window — enforcement is still off, so nothing is blocked yet.";
      } else {
        headline = "Monthly payment could not be processed";
        detail =
          "Your saved card was declined on the automatic renewal. Update payment before the grace period ends to avoid restrictions.";
      }
      break;
    case "quota_blocked":
      headline = "Monthly quota reached";
      detail =
        "Outbound SMS, email, broadcasts, and other metered actions are paused until you add capacity.";
      break;
    case "subscription_restricted":
      headline = "Billing action required";
      detail =
        graceKind === "onboarding" || input.onboardingStartedAt
          ? "Grace period ended. Subscribe to restore outbound SMS, email, broadcasts, and other metered features."
          : "Grace period ended. Cost-generating features are paused until your platform payment is resolved.";
      break;
    case "subscription_suspended":
      headline = "Account suspended";
      detail =
        "Resolve platform billing to restore full access. Read-only mode is active for your team.";
      stillWorks.push("Billing & top-up page remains available");
      break;
    default:
      break;
  }

  return {
    level,
    graceKind,
    blocksCostActions,
    showsFullWall,
    blocksBrokerSends,
    graceEndsAt,
    restrictedAt: input.restrictedAt,
    suspendedAt: input.suspendedAt,
    onboardingStartedAt: input.onboardingStartedAt,
    secondsUntilGraceEnd,
    headline,
    detail,
    suggestedPackId,
    whatStillWorks: blocksCostActions || showsFullWall ? stillWorks : [],
    showWarnBanner,
  };
}

/** Minimal billing notice for brokers/admins (no payment links or billing page access). */
export type BillingTeamNoticeLevel =
  | "soft_warn"
  | "subscription_grace"
  | "subscription_restricted"
  | "subscription_suspended"
  | "quota_blocked";

export type BillingTeamNotice = {
  show: boolean;
  level: BillingTeamNoticeLevel | null;
  graceKind: BillingGraceKind;
  headline: string;
  detail: string;
  blocksOutbound: boolean;
  secondsUntilGraceEnd: number | null;
};

const TEAM_NOTICE_LEVELS: BillingTeamNoticeLevel[] = [
  "soft_warn",
  "subscription_grace",
  "subscription_restricted",
  "subscription_suspended",
  "quota_blocked",
];

export function buildBillingTeamNotice(
  access: BillingAccessState,
): BillingTeamNotice {
  const empty: BillingTeamNotice = {
    show: false,
    level: null,
    graceKind: "none",
    headline: "",
    detail: "",
    blocksOutbound: false,
    secondsUntilGraceEnd: null,
  };

  if (!TEAM_NOTICE_LEVELS.includes(access.level as BillingTeamNoticeLevel)) {
    return empty;
  }

  const level = access.level as BillingTeamNoticeLevel;

  if (
    (level === "subscription_restricted" ||
      level === "subscription_suspended" ||
      level === "quota_blocked") &&
    !access.blocksCostActions
  ) {
    return empty;
  }

  switch (level) {
    case "soft_warn":
      return {
        show: true,
        level,
        graceKind: "none",
        headline: "Approaching monthly usage limit",
        detail:
          "Your team is at 80%+ on SMS, email, or voice. Contact your platform owner before outbound sends are blocked.",
        blocksOutbound: false,
        secondsUntilGraceEnd: null,
      };
    case "subscription_grace":
      return {
        show: true,
        level,
        graceKind: access.graceKind,
        headline:
          access.graceKind === "onboarding"
            ? "Platform billing setup in progress"
            : "Platform billing needs attention",
        detail:
          access.graceKind === "onboarding"
            ? "Your administrator is activating platform billing. Outbound sends may pause after the grace period if subscription is not completed."
            : "Your administrator is resolving a declined renewal payment. Outbound SMS, email, and broadcasts may pause when the grace period ends.",
        blocksOutbound: false,
        secondsUntilGraceEnd: access.secondsUntilGraceEnd,
      };
    case "subscription_restricted":
      return {
        show: true,
        level,
        graceKind: access.graceKind,
        headline: "Outbound sends paused",
        detail:
          "Platform billing must be resolved by your administrator before you can send messages or broadcasts.",
        blocksOutbound: true,
        secondsUntilGraceEnd: null,
      };
    case "subscription_suspended":
      return {
        show: true,
        level,
        graceKind: "none",
        headline: "Limited access — billing overdue",
        detail:
          "You can still view data and receive inbound messages. Outbound sends stay paused until your administrator resolves platform billing.",
        blocksOutbound: true,
        secondsUntilGraceEnd: null,
      };
    case "quota_blocked":
      return {
        show: true,
        level,
        graceKind: "none",
        headline: "Monthly usage limit reached",
        detail:
          "Your team has hit the monthly SMS, email, or voice limit. Contact your platform owner to add capacity.",
        blocksOutbound: true,
        secondsUntilGraceEnd: null,
      };
    default:
      return empty;
  }
}

export function formatGraceCountdown(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function billingTopUpPath(packId?: string | null): string {
  const base = "/admin/billing?topup=1";
  if (!packId) return base;
  return `${base}&pack=${encodeURIComponent(packId)}`;
}
