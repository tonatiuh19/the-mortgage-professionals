/**
 * Per-owner CRM — shared types and feature-flag helpers.
 * Spec: docs/PER_OWNER_CRM_ARCHITECTURE.md
 *
 * Phase 0: types + flags only. Runtime behavior stays legacy until
 * PER_OWNER_CRM_ENABLED is set in environment (see .env.example).
 */

// ─── Environment variables (authoritative feature-flag source) ───────────────

export const PER_OWNER_CRM_ENV_KEYS = {
  enabled: "PER_OWNER_CRM_ENABLED",
} as const;

/** @deprecated Ignored at runtime — use PER_OWNER_CRM_ENABLED only. */
export const PER_OWNER_CRM_LEGACY_ENV_KEYS = {
  allowProduction: "PER_OWNER_CRM_ALLOW_PRODUCTION",
  pilotBrokerIds: "PER_OWNER_CRM_PILOT_BROKER_IDS",
} as const;

/** @deprecated DB keys kept for historical migrations only — use env vars to toggle. */
export const PER_OWNER_CRM_SETTING_KEYS = {
  enabled: "per_owner_crm_enabled",
  allowProduction: "per_owner_crm_allow_production",
  pilotBrokerIds: "per_owner_crm_pilot_broker_ids",
} as const;

// ─── Enums / status types ────────────────────────────────────────────────────

export type ClientListVisibility = "active" | "hidden" | "archived";

export type CrmPersonGroupStatus =
  | "pending"
  | "linked"
  | "merged"
  | "rejected";

export type CrmPersonGroupMemberRole = "member" | "borrower_of_record";

export type CrmPersonEntityType = "client" | "broker" | "lead";

export type CrmTransferJobStatus =
  | "pending"
  | "review"
  | "completed"
  | "cancelled";

export type CrmTransferSourceEntityType = "client" | "broker";

/** Wizard resolution payload stored on crm_transfer_jobs.resolution_json */
export type CrmTransferResolution =
  | "keep_target_name"
  | "replace_with_source"
  | "merge_fields"
  | "duplicate_import_name"
  | "rename_on_import";

// ─── Row / DTO shapes ────────────────────────────────────────────────────────

export interface CrmPersonGroup {
  id: number;
  tenant_id: number;
  status: CrmPersonGroupStatus;
  canonical_client_id: number | null;
  created_by_broker_id: number;
  approved_by_broker_id: number | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CrmPersonGroupMember {
  id: number;
  tenant_id: number;
  group_id: number;
  entity_type: CrmPersonEntityType;
  entity_id: number;
  role: CrmPersonGroupMemberRole;
  joined_at: string;
}

export interface CrmTransferJob {
  id: number;
  tenant_id: number;
  from_broker_id: number;
  to_broker_id: number;
  source_entity_type: CrmTransferSourceEntityType;
  source_entity_id: number;
  status: CrmTransferJobStatus;
  resolution_json: Record<string, unknown> | null;
  created_by_broker_id: number;
  created_at: string;
  completed_at: string | null;
}

/** Platform-owner people view — one phone, many owner rows */
export interface CrmPeoplePhoneGroup {
  normalized_phone: string;
  display_phone: string | null;
  member_count: number;
  members: CrmPeoplePhoneMember[];
}

export interface CrmPeoplePhoneMember {
  client_id: number;
  first_name: string;
  last_name: string;
  assigned_broker_id: number | null;
  assigned_broker_name: string | null;
  list_visibility: ClientListVisibility;
  link_group_id: number | null;
  link_group_status: CrmPersonGroupStatus | null;
}

// ─── API request/response (Phase 4+ endpoints; types ready in Phase 0) ─────

export interface CreatePersonGroupLinkRequest {
  member_entity_type: CrmPersonEntityType;
  member_entity_id: number;
  notes?: string;
}

export interface CreatePersonGroupLinkResponse {
  success: boolean;
  group?: CrmPersonGroup;
  message?: string;
  error?: string;
}

export interface ApprovePersonGroupRequest {
  approve: boolean;
  notes?: string;
}

export interface StartCrmTransferRequest {
  to_broker_id: number;
  source_entity_type: CrmTransferSourceEntityType;
  source_entity_id: number;
}

export interface StartCrmTransferResponse {
  success: boolean;
  job?: CrmTransferJob;
  conflicts?: Array<{
    field: string;
    source_value: string;
    target_value: string;
  }>;
  error?: string;
}

export interface ResolveCrmTransferRequest {
  resolution: CrmTransferResolution;
  field_overrides?: Record<string, unknown>;
}

export interface GetCrmPeopleResponse {
  success: boolean;
  groups: CrmPeoplePhoneGroup[];
  pagination?: { page: number; limit: number; total: number };
}

export interface PerOwnerCrmFeatureFlags {
  enabled: boolean;
  /** @deprecated Always mirrors `enabled` — kept for API compatibility */
  allowProduction: boolean;
  /** @deprecated Always [] — pilot list removed; use single master flag */
  pilotBrokerIds: number[];
  /** True when PER_OWNER_CRM_ENABLED is on (all environments, all brokers) */
  activeForBroker: boolean;
}

// ─── Feature flag resolution (pure — testable without DB) ────────────────────

function parseBoolSetting(value: string | undefined | null, fallback = false): boolean {
  if (value == null || String(value).trim() === "") return fallback;
  const v = String(value).toLowerCase().trim();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Parse pilot broker IDs from JSON array or comma-separated string. */
export function parsePilotBrokerIds(raw: string | undefined | null): number[] {
  if (!raw || !String(raw).trim()) return [];
  const trimmed = String(raw).trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0);
    }
  } catch {
    // fall through to comma-separated
  }
  return trimmed
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export interface PerOwnerCrmSettingsInput {
  enabled?: string | boolean | null;
  /** @deprecated Ignored */
  allowProduction?: string | boolean | null;
  /** @deprecated Ignored */
  pilotBrokerIds?: string | number[] | null;
  runtime?: string;
  brokerId?: number | null;
}

export interface PerOwnerCrmEnvInput {
  enabled?: string;
  /** @deprecated Ignored */
  allowProduction?: string;
  /** @deprecated Ignored */
  pilotBrokerIds?: string;
  runtime?: string;
  brokerId?: number | null;
}

/**
 * Resolve per-owner CRM flags from environment variables.
 * Single switch: PER_OWNER_CRM_ENABLED (1/true/yes/on). Off by default → legacy behavior.
 */
export function resolvePerOwnerCrmFromEnv(
  overrides: PerOwnerCrmEnvInput = {},
): PerOwnerCrmFeatureFlags {
  const env =
    typeof process !== "undefined" ? process.env : ({} as NodeJS.ProcessEnv);

  return resolvePerOwnerCrmActive({
    enabled: overrides.enabled ?? env[PER_OWNER_CRM_ENV_KEYS.enabled],
    brokerId: overrides.brokerId ?? null,
  });
}

function settingToBool(
  value: string | boolean | null | undefined,
  fallback = false,
): boolean {
  if (typeof value === "boolean") return value;
  return parseBoolSetting(
    value == null ? undefined : String(value),
    fallback,
  );
}

/**
 * Resolve whether per-owner CRM behavior is active for a broker session.
 * Default: false (legacy). When PER_OWNER_CRM_ENABLED is on, active for all brokers.
 */
export function resolvePerOwnerCrmActive(
  input: PerOwnerCrmSettingsInput = {},
): PerOwnerCrmFeatureFlags {
  const enabled = settingToBool(input.enabled, false);

  return {
    enabled,
    allowProduction: enabled,
    pilotBrokerIds: [],
    activeForBroker: enabled,
  };
}

/** Default list filter when per-owner CRM is active (Phase 3+). */
export function clientListVisibilityFilter(
  flags: PerOwnerCrmFeatureFlags,
): ClientListVisibility[] {
  return flags.activeForBroker ? ["active"] : ["active", "hidden", "archived"];
}

// ─── Phone conflict scope (Phase 1+ — legacy tenant-wide until flags on) ─────

export type ClientPhoneConflictScope = "tenant" | "per_owner";

/**
 * When per-owner CRM is active AND the row has an assigned owner, phone
 * conflicts are scoped to that owner only. Otherwise legacy tenant-wide
 * uniqueness applies (no breaking change while flags are off).
 */
export function resolveClientPhoneConflictScope(
  flags: PerOwnerCrmFeatureFlags,
  assignedBrokerId: number | null | undefined,
): ClientPhoneConflictScope {
  if (flags.activeForBroker && assignedBrokerId != null) return "per_owner";
  return "tenant";
}

/** WHERE clause fragment for client phone conflict lookups (alias `c`). */
export function clientPhoneConflictWhere(
  scope: ClientPhoneConflictScope,
  opts: { excludeClientId?: boolean } = {},
): string {
  const exclude = opts.excludeClientId ? " AND c.id != ?" : "";
  if (scope === "per_owner") {
    return `c.tenant_id = ? AND c.normalized_phone = ? AND c.phone IS NOT NULL AND c.assigned_broker_id = ?${exclude}`;
  }
  return `c.tenant_id = ? AND c.normalized_phone = ? AND c.phone IS NOT NULL${exclude}`;
}

/** Parameter order matching clientPhoneConflictWhere (no table alias). */
export function clientPhoneConflictWhereBare(
  scope: ClientPhoneConflictScope,
  opts: { excludeClientId?: boolean } = {},
): string {
  const exclude = opts.excludeClientId ? " AND id != ?" : "";
  if (scope === "per_owner") {
    return `tenant_id = ? AND normalized_phone = ? AND phone IS NOT NULL AND assigned_broker_id = ?${exclude}`;
  }
  return `tenant_id = ? AND normalized_phone = ? AND phone IS NOT NULL${exclude}`;
}

// ─── List / thread scope SQL (Phase 3+ — used when activeForBroker) ──────────

export type ConversationInboxScope = "mine" | "shared" | "all";

/** Default inbox tab when per-owner CRM is active for a non–platform-owner broker. */
export function defaultConversationInboxScope(
  flags: PerOwnerCrmFeatureFlags,
): ConversationInboxScope {
  return flags.activeForBroker ? "mine" : "all";
}

/**
 * WHERE fragment for GET /api/clients when per-owner CRM is active.
 * Params: brokerId, ...visibility enum values.
 */
export function perOwnerClientListWhere(
  clientAlias = "c",
  visibility: ClientListVisibility[] = ["active"],
): string {
  const vis = visibility.map((v) => `'${v}'`).join(",");
  return `${clientAlias}.assigned_broker_id = ? AND ${clientAlias}.list_visibility IN (${vis})`;
}

/** Shared company-number claim queue (unclaimed threads). */
export function perOwnerThreadSharedQueueWhere(threadAlias = "ct"): string {
  return `(${threadAlias}.client_id IS NULL AND ${threadAlias}.broker_id IS NULL)`;
}

/**
 * Mine tab: exclude shared queue; thread belongs to this broker's CRM scope.
 * Params: brokerId × 3.
 */
export function perOwnerThreadMineWhere(threadAlias = "ct"): string {
  const shared = perOwnerThreadSharedQueueWhere(threadAlias);
  return `(NOT ${shared} AND (
    ${threadAlias}.owner_client_scope_broker_id = ?
    OR (${threadAlias}.broker_id = ? AND (
      ${threadAlias}.owner_client_scope_broker_id IS NULL
      OR ${threadAlias}.owner_client_scope_broker_id = ?
    ))
  ))`;
}

/** Normalize phone to last-10 digits for dedupe keys. */
export function normalizePhoneLast10(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-10);
}
