/**
 * SMS consent (A2P 10DLC / TCPA) — single source of truth for consent wording.
 *
 * The API keeps an inlined copy of these helpers (see "SMS consent — inlined
 * for Vercel serverless" in api/index.ts). When the wording changes, update
 * BOTH places and bump SMS_CONSENT_VERSION so stored records stay traceable.
 */

export const SMS_CONSENT_VERSION = "2026-11-19";

export const SMS_CONSENT_DEFAULT_BUSINESS_NAME = "The Mortgage Professionals";

/** Support line quoted in HELP replies (matches the Privacy Policy). */
export const SMS_SUPPORT_PHONE = "562-665-4132";

/** Public forms that can capture SMS consent. Stored in sms_consents.source. */
export type SmsConsentSource =
  | "apply_wizard"
  | "home_lead_form"
  | "contact_form"
  | "scheduler_booking";

export const SMS_CONSENT_SOURCES: readonly SmsConsentSource[] = [
  "apply_wizard",
  "home_lead_form",
  "contact_form",
  "scheduler_booking",
];

/** Values a public form sends alongside its normal payload. Both optional. */
export interface SmsConsentInput {
  sms_consent_transactional?: boolean;
  sms_consent_marketing?: boolean;
}

export interface SmsConsentTexts {
  transactional: string;
  marketing: string;
}

const SMS_DISCLOSURE =
  "Message frequency varies, message & data rates may apply. Reply HELP for assistance, reply STOP to opt out.";

export function buildSmsConsentTexts(
  businessName: string = SMS_CONSENT_DEFAULT_BUSINESS_NAME,
): SmsConsentTexts {
  const name = businessName.trim() || SMS_CONSENT_DEFAULT_BUSINESS_NAME;
  return {
    transactional: `I consent to receive non-marketing text messages from ${name} regarding my loan application status, appointment reminders, and customer support. ${SMS_DISCLOSURE}`,
    marketing: `I consent to receive marketing text messages from ${name} regarding mortgage rates, promotions, and product offers. ${SMS_DISCLOSURE}`,
  };
}

/** Reply to an inbound HELP / INFO keyword. */
export function buildSmsHelpReply(
  businessName: string = SMS_CONSENT_DEFAULT_BUSINESS_NAME,
  supportPhone: string | null = SMS_SUPPORT_PHONE,
): string {
  const name = businessName.trim() || SMS_CONSENT_DEFAULT_BUSINESS_NAME;
  const contact = supportPhone ? ` or call ${supportPhone}` : "";
  return `${name}: For help, reply to this message${contact}. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out.`;
}

export interface PublicSmsConsentConfigResponse {
  success: boolean;
  business_name: string;
  version: string;
  texts: SmsConsentTexts;
}
