/**
 * Editable legal pages (Privacy Policy, Terms & Conditions).
 * Markdown source contains {{placeholders}} filled from legal_company_details.
 * The API keeps an inlined copy of fillLegalPlaceholders ("Legal pages — inlined
 * for Vercel serverless" in api/index.ts). Change BOTH together.
 */

export type LegalDocKey = "privacy" | "terms";

export const LEGAL_DOC_KEYS: readonly LegalDocKey[] = ["privacy", "terms"];

export const LEGAL_DOC_META: Record<LegalDocKey, { title: string; path: string }> = {
  privacy: { title: "Privacy Policy", path: "/privacy-policy" },
  terms: { title: "Terms & Conditions", path: "/terms-and-conditions" },
};

export interface LegalCompanyDetails {
  company_name: string;
  company_short_name: string;
  nmls: string | null;
  address_line1: string | null;
  address_line2: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

export type LegalPlaceholder =
  | keyof LegalCompanyDetails
  | "effective_date"
  | "privacy_url"
  | "terms_url";

/** Shown in the editor's "Insert field" menu, in this order. */
export const LEGAL_PLACEHOLDERS: { key: LegalPlaceholder; label: string }[] = [
  { key: "company_name", label: "Company legal name" },
  { key: "company_short_name", label: "Company short name" },
  { key: "nmls", label: "NMLS #" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "address_line1", label: "Address line 1" },
  { key: "address_line2", label: "Address line 2 (city, state, ZIP)" },
  { key: "effective_date", label: "Effective date" },
  { key: "privacy_url", label: "Privacy Policy link" },
  { key: "terms_url", label: "Terms link" },
];

const PLACEHOLDER_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

/** "2026-11-19" → "November 19, 2026" (no timezone shift). */
export function formatLegalDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return isoDate;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** Joins the site origin and a path without doubling slashes. */
export function legalUrl(website: string | null | undefined, path: string): string {
  const base = (website || "").trim().replace(/\/+$/, "");
  return base ? `${base}${path}` : path;
}

/**
 * Replaces {{placeholders}}. Unknown placeholders are left as typed so a typo is
 * visible in the preview instead of silently disappearing.
 */
export function fillLegalPlaceholders(
  markdown: string,
  details: LegalCompanyDetails,
  effectiveDate: string,
): string {
  const values: Record<string, string> = {
    company_name: details.company_name,
    company_short_name: details.company_short_name,
    nmls: details.nmls ?? "",
    address_line1: details.address_line1 ?? "",
    address_line2: details.address_line2 ?? "",
    phone: details.phone ?? "",
    email: details.email ?? "",
    website: details.website ?? "",
    effective_date: formatLegalDate(effectiveDate),
    privacy_url: legalUrl(details.website, LEGAL_DOC_META.privacy.path),
    terms_url: legalUrl(details.website, LEGAL_DOC_META.terms.path),
  };
  return markdown.replace(PLACEHOLDER_RE, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : whole,
  );
}

/** Placeholders used in the text that aren't known fields (shown as warnings). */
export function findUnknownPlaceholders(markdown: string): string[] {
  const known = new Set<string>(LEGAL_PLACEHOLDERS.map((p) => p.key));
  const unknown = new Set<string>();
  for (const m of markdown.matchAll(PLACEHOLDER_RE)) if (!known.has(m[1])) unknown.add(m[1]);
  return [...unknown];
}

// ── API shapes ────────────────────────────────────────────────────────────────

export interface PublicLegalDocResponse {
  success: boolean;
  doc_key: LegalDocKey;
  title: string;
  version: number;
  effective_date: string;
  /** Placeholders already filled in. */
  markdown: string;
}

export interface LegalVersionSummary {
  version: number;
  effective_date: string;
  change_note: string | null;
  published_at: string;
  published_by_name: string | null;
}

export interface AdminLegalDoc {
  doc_key: LegalDocKey;
  published_version: number | null;
  published_markdown: string;
  published_effective_date: string | null;
  draft_markdown: string | null;
  draft_updated_at: string | null;
  draft_updated_by_name: string | null;
  versions: LegalVersionSummary[];
}

export interface AdminLegalResponse {
  success: boolean;
  details: LegalCompanyDetails;
  docs: AdminLegalDoc[];
}

// ── Carrier (A2P 10DLC) checklist ────────────────────────────────────────────
// Warn — never block — when an edit removes language carriers look for.

export interface LegalRequirement {
  id: string;
  label: string;
  /** Any one of these (case-insensitive, after placeholders are filled) satisfies it. */
  patterns: RegExp[];
}

export const LEGAL_REQUIREMENTS: Record<LegalDocKey, LegalRequirement[]> = {
  privacy: [
    { id: "no-share", label: "SMS opt-in data is not sold or shared for marketing", patterns: [/do not (sell|share)[^.]*(sms|opt-in)[^.]*/i, /not be (sold|shared)[^.]*/i] },
    { id: "stop", label: "Opt out by replying STOP", patterns: [/\bSTOP\b/] },
    { id: "help", label: "Reply HELP for assistance", patterns: [/\bHELP\b/] },
    { id: "rates", label: "Message and data rates may apply", patterns: [/message (and|&) data rates may apply/i] },
    { id: "frequency", label: "Message frequency varies", patterns: [/message frequency varies/i] },
    { id: "voluntary", label: "Consent is not a condition of service", patterns: [/not a condition/i] },
  ],
  terms: [
    { id: "program", label: "Describes the SMS program (marketing and non-marketing)", patterns: [/non-marketing/i] },
    { id: "stop", label: "Opt out by replying STOP", patterns: [/\bSTOP\b/] },
    { id: "help", label: "Reply HELP for assistance", patterns: [/\bHELP\b/] },
    { id: "rates", label: "Message and data rates may apply", patterns: [/message (and|&) data rates may apply/i] },
    { id: "frequency", label: "Message frequency varies", patterns: [/message frequency varies/i] },
    { id: "carrier", label: "Carriers are not liable for delayed or undelivered messages", patterns: [/carriers? (are|is) not liable/i] },
    { id: "privacy-link", label: "Links to the Privacy Policy", patterns: [/privacy[- ]policy/i] },
  ],
};

export function checkLegalRequirements(docKey: LegalDocKey, filledMarkdown: string) {
  return LEGAL_REQUIREMENTS[docKey].map((r) => ({
    ...r,
    ok: r.patterns.some((p) => p.test(filledMarkdown)),
  }));
}
