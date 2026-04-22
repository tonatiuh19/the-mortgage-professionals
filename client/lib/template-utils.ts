import type { ConversationTemplate, ConversationThread } from "@shared/api";

// ── Variable map ─────────────────────────────────────────────────────────────

export interface VarStatus {
  name: string;
  value: string;
  resolved: boolean;
}

export interface BrokerInfo {
  first_name?: string | null;
  last_name?: string | null;
}

/**
 * Build a map of all supported template variables → their resolved values
 * using data available on the frontend (no API call needed).
 */
export function buildVarMap(
  thread: ConversationThread | null | undefined,
  broker: BrokerInfo | null | undefined,
): Record<string, string> {
  const clientName = thread?.client_name ?? "";
  const nameParts = clientName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  const brokerFirst = broker?.first_name ?? "";
  const brokerLast = broker?.last_name ?? "";
  const brokerFull = [brokerFirst, brokerLast].filter(Boolean).join(" ");

  return {
    first_name: firstName,
    last_name: lastName,
    client_name: clientName || firstName,
    client_first_name: firstName,
    client_last_name: lastName,
    application_id: thread?.application_id ? String(thread.application_id) : "",
    application_number: thread?.application_id
      ? String(thread.application_id)
      : "",
    broker_name: brokerFull || brokerFirst || "",
    broker_first_name: brokerFirst,
    broker_last_name: brokerLast,
    current_date: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

/**
 * Resolve all {{var}} placeholders in a string using the provided map.
 * Unresolved variables are left as-is.
 */
export function resolveVars(
  text: string,
  varMap: Record<string, string>,
): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const val = varMap[key.trim()];
    return val !== undefined && val !== "" ? val : match;
  });
}

/**
 * Return the status of every unique {{var}} found in the text.
 */
export function getVarStatus(
  text: string,
  varMap: Record<string, string>,
): VarStatus[] {
  const seen = new Set<string>();
  const result: VarStatus[] = [];
  for (const [, key] of text.matchAll(/\{\{([^}]+)\}\}/g)) {
    const name = key.trim();
    if (seen.has(name)) continue;
    seen.add(name);
    const value = varMap[name] ?? "";
    result.push({ name, value, resolved: value !== "" });
  }
  return result;
}

/**
 * How many of a template's declared variables can be resolved?
 */
export function getTemplateCompatibility(
  template: ConversationTemplate,
  varMap: Record<string, string>,
): { resolved: number; total: number; score: number } {
  const vars = template.variables ?? [];
  if (vars.length === 0) return { resolved: 0, total: 0, score: 1 };
  const resolved = vars.filter((v) => !!varMap[v]).length;
  return { resolved, total: vars.length, score: resolved / vars.length };
}

// ── Recently-used tracking (localStorage) ───────────────────────────────────

const LS_KEY = "conv_recent_templates";
const MAX_RECENT = 5;

export function getRecentTemplateIds(): number[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordTemplateUsed(id: number): void {
  try {
    const existing = getRecentTemplateIds().filter((x) => x !== id);
    const updated = [id, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable — ignore
  }
}

// ── Smart template sort ──────────────────────────────────────────────────────

/**
 * Sort templates for the picker:
 *   1. Recently used (most recent first)
 *   2. Fully compatible (all vars resolvable)
 *   3. Partially compatible (some vars resolvable)
 *   4. Rest
 * Within each group, sort by usage_count descending.
 */
export function sortTemplatesSmart(
  templates: ConversationTemplate[],
  varMap: Record<string, string>,
  recentIds: number[],
): ConversationTemplate[] {
  const recentSet = new Set(recentIds);

  const rank = (t: ConversationTemplate): number => {
    if (recentSet.has(t.id)) return 0;
    const { score } = getTemplateCompatibility(t, varMap);
    if (score >= 1) return 1;
    if (score > 0) return 2;
    return 3;
  };

  return [...templates].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    // Within the "recently used" tier respect recency order
    if (ra === 0) return recentIds.indexOf(a.id) - recentIds.indexOf(b.id);
    // Otherwise sort by usage_count desc
    return (b.usage_count ?? 0) - (a.usage_count ?? 0);
  });
}

// ── Available variable catalogue ─────────────────────────────────────────────

export const ALL_VARIABLES: { name: string; label: string }[] = [
  { name: "first_name", label: "First Name" },
  { name: "last_name", label: "Last Name" },
  { name: "client_name", label: "Client Full Name" },
  { name: "broker_name", label: "Broker Name" },
  { name: "broker_first_name", label: "Broker First Name" },
  { name: "application_number", label: "Application #" },
  { name: "current_date", label: "Today's Date" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  welcome: "Welcome",
  reminder: "Reminder",
  update: "Update",
  follow_up: "Follow-up",
  marketing: "Marketing",
  system: "System",
};
