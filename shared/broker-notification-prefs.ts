/**
 * Per-broker email alert preferences (Profile → Notification Preferences).
 * In-app bell is always on; these flags only gate email.
 * Missing DB row = all email alerts ON (no breaking change for existing brokers).
 */

export const BROKER_EMAIL_ALERT_EVENTS = [
  "new_application",
  "voicemail",
  "inbound_sms",
  "inbound_email",
  "scheduler_booking",
  "reminder_flow_broker",
] as const;

export type BrokerEmailAlertEvent = (typeof BROKER_EMAIL_ALERT_EVENTS)[number];

export const BROKER_EMAIL_ALERT_COLUMNS = {
  new_application: "email_new_application",
  voicemail: "email_voicemail",
  inbound_sms: "email_inbound_sms",
  inbound_email: "email_inbound_email",
  scheduler_booking: "email_scheduler_booking",
  reminder_flow_broker: "email_reminder_flow_broker",
} as const satisfies Record<BrokerEmailAlertEvent, string>;

export type BrokerEmailAlertColumn =
  (typeof BROKER_EMAIL_ALERT_COLUMNS)[BrokerEmailAlertEvent];

export interface BrokerNotificationPrefs {
  email_new_application: boolean;
  email_voicemail: boolean;
  email_inbound_sms: boolean;
  email_inbound_email: boolean;
  email_scheduler_booking: boolean;
  email_reminder_flow_broker: boolean;
  secondary_email: string | null;
}

export interface BrokerNotificationPrefsResponse extends BrokerNotificationPrefs {
  account_email: string;
  account_email_sendable: boolean;
}

export const BROKER_EMAIL_ALERT_LABELS: Record<
  BrokerEmailAlertEvent,
  { title: string; description: string }
> = {
  new_application: {
    title: "New share-link application",
    description:
      "When a client submits via your /apply link",
  },
  voicemail: {
    title: "Voicemail",
    description: "When a caller leaves a voicemail on your line",
  },
  inbound_sms: {
    title: "Inbound SMS",
    description:
      "When a new SMS arrives in Conversations (can be high volume)",
  },
  inbound_email: {
    title: "Inbound email",
    description:
      "When a new client email arrives in Conversations (off by default — can be high volume; CRM alert emails are never re-notified)",
  },
  scheduler_booking: {
    title: "Scheduler booking",
    description: "When someone books a meeting on your scheduler link",
  },
  reminder_flow_broker: {
    title: "Reminder / workflow alerts",
    description:
      "When a reminder flow notifies you (e.g. realtor prospecting steps)",
  },
};

export function defaultBrokerNotificationPrefs(): BrokerNotificationPrefs {
  return {
    email_new_application: true,
    email_voicemail: true,
    // OFF by default: O365 sync + alert email creates a feedback loop when
    // no-reply CRM alerts land in the banker's connected Inbox.
    email_inbound_sms: true,
    email_inbound_email: false,
    email_scheduler_booking: true,
    email_reminder_flow_broker: true,
    secondary_email: null,
  };
}

export function coalesceBool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return fallback;
}

export function mergeBrokerNotificationPrefs(
  row: Partial<Record<string, unknown>> | null | undefined,
): BrokerNotificationPrefs {
  const d = defaultBrokerNotificationPrefs();
  if (!row) return d;
  return {
    email_new_application: coalesceBool(
      row.email_new_application,
      d.email_new_application,
    ),
    email_voicemail: coalesceBool(row.email_voicemail, d.email_voicemail),
    email_inbound_sms: coalesceBool(row.email_inbound_sms, d.email_inbound_sms),
    email_inbound_email: coalesceBool(
      row.email_inbound_email,
      d.email_inbound_email,
    ),
    email_scheduler_booking: coalesceBool(
      row.email_scheduler_booking,
      d.email_scheduler_booking,
    ),
    email_reminder_flow_broker: coalesceBool(
      row.email_reminder_flow_broker,
      d.email_reminder_flow_broker,
    ),
    secondary_email: normalizeSecondaryEmail(
      typeof row.secondary_email === "string" ? row.secondary_email : null,
    ),
  };
}

/** Same guard as voicemail / public-apply alerts. */
export function isSendableBrokerEmail(
  email: string | null | undefined,
): boolean {
  const trimmed = String(email || "").trim();
  if (!trimmed) return false;
  if (!trimmed.includes("@")) return false;
  if (trimmed.toLowerCase().startsWith("noemail_")) return false;
  return true;
}

export function normalizeSecondaryEmail(
  raw: string | null | undefined,
): string | null {
  const trimmed = String(raw || "").trim().toLowerCase();
  if (!trimmed) return null;
  if (!isSendableBrokerEmail(trimmed)) return null;
  return trimmed;
}

export function isBrokerEmailAlertEnabled(
  prefs: BrokerNotificationPrefs,
  event: BrokerEmailAlertEvent,
): boolean {
  const col = BROKER_EMAIL_ALERT_COLUMNS[event];
  return Boolean(prefs[col]);
}

/**
 * Primary account email + optional secondary, deduped, sendable only.
 */
export function collectBrokerAlertRecipients(
  accountEmail: string | null | undefined,
  secondaryEmail: string | null | undefined,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const candidate of [accountEmail, secondaryEmail]) {
    const e = String(candidate || "").trim();
    if (!isSendableBrokerEmail(e)) continue;
    const key = e.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export function parseBrokerNotificationPrefsPatch(
  body: Record<string, unknown>,
): { ok: true; prefs: BrokerNotificationPrefs } | { ok: false; error: string } {
  const base = defaultBrokerNotificationPrefs();
  const next: BrokerNotificationPrefs = { ...base };

  for (const event of BROKER_EMAIL_ALERT_EVENTS) {
    const col = BROKER_EMAIL_ALERT_COLUMNS[event];
    if (col in body) {
      const v = body[col];
      if (typeof v !== "boolean" && v !== 0 && v !== 1 && v !== "0" && v !== "1") {
        return { ok: false, error: `${col} must be a boolean` };
      }
      next[col] = coalesceBool(v, true);
    }
  }

  if ("secondary_email" in body) {
    const raw = body.secondary_email;
    if (raw === null || raw === "") {
      next.secondary_email = null;
    } else if (typeof raw !== "string") {
      return { ok: false, error: "secondary_email must be a string or null" };
    } else {
      const normalized = normalizeSecondaryEmail(raw);
      if (raw.trim() && !normalized) {
        return {
          ok: false,
          error: "secondary_email must be a valid email address",
        };
      }
      next.secondary_email = normalized;
    }
  }

  return { ok: true, prefs: next };
}

/**
 * Apply a partial prefs patch onto current prefs (for GET→PUT merge + race-safe column updates).
 * Only keys present in `body` change.
 */
export function applyBrokerNotificationPrefsPatch(
  current: BrokerNotificationPrefs,
  body: Record<string, unknown>,
):
  | {
      ok: true;
      prefs: BrokerNotificationPrefs;
      changedColumns: string[];
    }
  | { ok: false; error: string } {
  const next: BrokerNotificationPrefs = { ...current };
  const changedColumns: string[] = [];

  for (const event of BROKER_EMAIL_ALERT_EVENTS) {
    const col = BROKER_EMAIL_ALERT_COLUMNS[event];
    if (!(col in body)) continue;
    const v = body[col];
    if (typeof v !== "boolean" && v !== 0 && v !== 1 && v !== "0" && v !== "1") {
      return { ok: false, error: `${col} must be a boolean` };
    }
    next[col] = coalesceBool(v, true);
    changedColumns.push(col);
  }

  if ("secondary_email" in body) {
    const raw = body.secondary_email;
    if (raw === null || raw === "") {
      next.secondary_email = null;
    } else if (typeof raw !== "string") {
      return { ok: false, error: "secondary_email must be a string or null" };
    } else {
      const normalized = normalizeSecondaryEmail(raw);
      if (raw.trim() && !normalized) {
        return {
          ok: false,
          error: "secondary_email must be a valid email address",
        };
      }
      next.secondary_email = normalized;
    }
    changedColumns.push("secondary_email");
  }

  if (!changedColumns.length) {
    return { ok: false, error: "No preference fields to update" };
  }

  return { ok: true, prefs: next, changedColumns };
}

/** Pure delivery gate used by API + tests (no I/O). */
export function resolveBrokerEmailAlertDelivery(input: {
  prefs: BrokerNotificationPrefs;
  event: BrokerEmailAlertEvent;
  accountEmail: string | null | undefined;
}): { send: boolean; recipients: string[]; reason?: string } {
  if (!isBrokerEmailAlertEnabled(input.prefs, input.event)) {
    return { send: false, recipients: [], reason: "prefs_off" };
  }
  const recipients = collectBrokerAlertRecipients(
    input.accountEmail,
    input.prefs.secondary_email,
  );
  if (!recipients.length) {
    return { send: false, recipients: [], reason: "no_sendable_email" };
  }
  return { send: true, recipients };
}

/** Inbound channel → preference event. */
export function inboundCommunicationToEmailAlertEvent(
  communicationType: string,
): BrokerEmailAlertEvent | null {
  if (communicationType === "email") return "inbound_email";
  if (communicationType === "sms") return "inbound_sms";
  return null;
}

/**
 * CRM transactional alerts (Resend no-reply) must never be treated as inbound
 * client mail — O365 mailbox sync would otherwise re-notify in a loop.
 */
export const CRM_SYSTEM_NOTIFICATION_FROM_ADDRESSES = [
  "no-reply@themortgageprofessionals.net",
  "noreply@themortgageprofessionals.net",
] as const;

export function extractEmailAddress(
  raw: string | null | undefined,
): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const angle = s.match(/<([^>]+)>/);
  return (angle?.[1] || s).trim().toLowerCase();
}

export function isCrmSystemNotificationFromAddress(
  fromEmail: string | null | undefined,
): boolean {
  const addr = extractEmailAddress(fromEmail);
  if (!addr) return false;
  if (
    (CRM_SYSTEM_NOTIFICATION_FROM_ADDRESSES as readonly string[]).includes(addr)
  ) {
    return true;
  }
  // Also treat configured SMTP_FROM local-part@domain if it looks like no-reply
  if (addr.startsWith("no-reply@") || addr.startsWith("noreply@")) {
    return true;
  }
  return false;
}

export function isCrmSystemNotificationSubject(
  subject: string | null | undefined,
): boolean {
  const s = String(subject || "").trim().toLowerCase();
  if (!s) return false;
  return (
    s.startsWith("new email from ") ||
    s.startsWith("new sms from ") ||
    s.startsWith("new application from ") ||
    s.startsWith("new meeting scheduled") ||
    s.includes("new voicemail from")
  );
}

/** True when an O365/inbound message is our own CRM alert (skip sync/notify). */
export function isCrmSystemNotificationMessage(input: {
  fromEmail?: string | null;
  subject?: string | null;
}): boolean {
  if (isCrmSystemNotificationFromAddress(input.fromEmail)) return true;
  // Subject alone is weaker; only combine with system-looking from name paths
  // when from is already system. Keep subject helper for logging/tests.
  return false;
}
