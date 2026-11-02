import { describe, it, expect } from "vitest";
import {
  defaultBrokerNotificationPrefs,
  mergeBrokerNotificationPrefs,
  isSendableBrokerEmail,
  collectBrokerAlertRecipients,
  isBrokerEmailAlertEnabled,
  parseBrokerNotificationPrefsPatch,
  applyBrokerNotificationPrefsPatch,
  normalizeSecondaryEmail,
  resolveBrokerEmailAlertDelivery,
  inboundCommunicationToEmailAlertEvent,
  isCrmSystemNotificationFromAddress,
  isCrmSystemNotificationMessage,
  BROKER_EMAIL_ALERT_EVENTS,
  BROKER_EMAIL_ALERT_COLUMNS,
} from "./broker-notification-prefs";

describe("defaults", () => {
  it("opts critical alerts on; inbound email off (loop-safe)", () => {
    const d = defaultBrokerNotificationPrefs();
    expect(d.email_new_application).toBe(true);
    expect(d.email_voicemail).toBe(true);
    expect(d.email_inbound_sms).toBe(true);
    expect(d.email_inbound_email).toBe(false);
    expect(d.email_scheduler_booking).toBe(true);
    expect(d.email_reminder_flow_broker).toBe(true);
    expect(d.secondary_email).toBeNull();
  });

  it("covers every event column", () => {
    for (const event of BROKER_EMAIL_ALERT_EVENTS) {
      expect(BROKER_EMAIL_ALERT_COLUMNS[event]).toMatch(/^email_/);
    }
  });
});

describe("mergeBrokerNotificationPrefs", () => {
  it("treats missing row as all on", () => {
    expect(mergeBrokerNotificationPrefs(null).email_voicemail).toBe(true);
    expect(mergeBrokerNotificationPrefs(undefined).email_inbound_sms).toBe(
      true,
    );
  });

  it("respects explicit offs from DB tinyints", () => {
    const p = mergeBrokerNotificationPrefs({
      email_inbound_sms: 0,
      email_new_application: 1,
      secondary_email: "Also@TheMortgageProfessionals.net",
    });
    expect(p.email_inbound_sms).toBe(false);
    expect(p.email_new_application).toBe(true);
    expect(p.secondary_email).toBe("also@themortgageprofessionals.net");
  });

  it("ignores garbage boolean strings by falling back", () => {
    const p = mergeBrokerNotificationPrefs({
      email_voicemail: "maybe",
    });
    expect(p.email_voicemail).toBe(true);
  });
});

describe("isSendableBrokerEmail", () => {
  it("rejects empty, missing @, and noemail_ placeholders", () => {
    expect(isSendableBrokerEmail("")).toBe(false);
    expect(isSendableBrokerEmail("   ")).toBe(false);
    expect(isSendableBrokerEmail(null)).toBe(false);
    expect(isSendableBrokerEmail("not-an-email")).toBe(false);
    expect(isSendableBrokerEmail("noemail_1@imported.local")).toBe(false);
    expect(isSendableBrokerEmail("NOEMAIL_x@y.com")).toBe(false);
    expect(isSendableBrokerEmail("Alyssa@themortgageprofessionals.net")).toBe(true);
  });
});

describe("collectBrokerAlertRecipients", () => {
  it("includes secondary and dedupes case-insensitively", () => {
    expect(
      collectBrokerAlertRecipients(
        "Alyssa@themortgageprofessionals.net",
        "alyssa@themortgageprofessionals.net",
      ),
    ).toEqual(["Alyssa@themortgageprofessionals.net"]);
    expect(collectBrokerAlertRecipients("a@x.com", "b@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
    ]);
  });

  it("falls back to secondary when account is noemail_", () => {
    expect(
      collectBrokerAlertRecipients("noemail_x@y.com", "b@x.com"),
    ).toEqual(["b@x.com"]);
  });

  it("returns empty when neither is sendable", () => {
    expect(collectBrokerAlertRecipients("noemail_x@y.com", null)).toEqual([]);
    expect(collectBrokerAlertRecipients("", "")).toEqual([]);
  });
});

describe("isBrokerEmailAlertEnabled", () => {
  it("reads the matching column", () => {
    const p = {
      ...defaultBrokerNotificationPrefs(),
      email_scheduler_booking: false,
    };
    expect(isBrokerEmailAlertEnabled(p, "scheduler_booking")).toBe(false);
    expect(isBrokerEmailAlertEnabled(p, "voicemail")).toBe(true);
  });
});

describe("applyBrokerNotificationPrefsPatch", () => {
  it("only changes keys present in body (race-safe merge)", () => {
    const current = {
      ...defaultBrokerNotificationPrefs(),
      email_voicemail: false,
      secondary_email: "ops@example.com",
    };
    const r = applyBrokerNotificationPrefsPatch(current, {
      email_inbound_sms: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.prefs.email_inbound_sms).toBe(false);
      expect(r.prefs.email_voicemail).toBe(false);
      expect(r.prefs.secondary_email).toBe("ops@example.com");
      expect(r.changedColumns).toEqual(["email_inbound_sms"]);
    }
  });

  it("rejects empty patch", () => {
    const r = applyBrokerNotificationPrefsPatch(
      defaultBrokerNotificationPrefs(),
      {},
    );
    expect(r.ok).toBe(false);
  });

  it("rejects invalid secondary while keeping other fields", () => {
    const r = applyBrokerNotificationPrefsPatch(
      defaultBrokerNotificationPrefs(),
      { secondary_email: "not-an-email" },
    );
    expect(r.ok).toBe(false);
  });

  it("clears secondary with null or empty string", () => {
    const current = {
      ...defaultBrokerNotificationPrefs(),
      secondary_email: "ops@example.com",
    };
    const a = applyBrokerNotificationPrefsPatch(current, {
      secondary_email: null,
    });
    const b = applyBrokerNotificationPrefsPatch(current, {
      secondary_email: "",
    });
    expect(a.ok && a.prefs.secondary_email).toBeNull();
    expect(b.ok && b.prefs.secondary_email).toBeNull();
  });
});

describe("parseBrokerNotificationPrefsPatch", () => {
  it("accepts partial boolean patches from defaults", () => {
    const r = parseBrokerNotificationPrefsPatch({
      email_inbound_email: false,
      secondary_email: "ops@example.com",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.prefs.email_inbound_email).toBe(false);
      expect(r.prefs.email_voicemail).toBe(true);
      expect(r.prefs.secondary_email).toBe("ops@example.com");
    }
  });
});

describe("resolveBrokerEmailAlertDelivery", () => {
  it("skips when prefs off", () => {
    const prefs = {
      ...defaultBrokerNotificationPrefs(),
      email_new_application: false,
    };
    const r = resolveBrokerEmailAlertDelivery({
      prefs,
      event: "new_application",
      accountEmail: "a@x.com",
    });
    expect(r).toEqual({
      send: false,
      recipients: [],
      reason: "prefs_off",
    });
  });

  it("skips when no sendable email", () => {
    const r = resolveBrokerEmailAlertDelivery({
      prefs: defaultBrokerNotificationPrefs(),
      event: "voicemail",
      accountEmail: "noemail_1@imported.local",
    });
    expect(r.reason).toBe("no_sendable_email");
    expect(r.send).toBe(false);
  });

  it("sends to account + secondary when both valid", () => {
    const prefs = {
      ...defaultBrokerNotificationPrefs(),
      secondary_email: "ops@example.com",
    };
    const r = resolveBrokerEmailAlertDelivery({
      prefs,
      event: "scheduler_booking",
      accountEmail: "banker@example.com",
    });
    expect(r.send).toBe(true);
    expect(r.recipients).toEqual(["banker@example.com", "ops@example.com"]);
  });

  it("sends only secondary when account is placeholder", () => {
    const prefs = {
      ...defaultBrokerNotificationPrefs(),
      secondary_email: "ops@example.com",
    };
    const r = resolveBrokerEmailAlertDelivery({
      prefs,
      event: "inbound_sms",
      accountEmail: "noemail_9@imported.local",
    });
    expect(r.send).toBe(true);
    expect(r.recipients).toEqual(["ops@example.com"]);
  });
});

describe("inboundCommunicationToEmailAlertEvent", () => {
  it("maps channels", () => {
    expect(inboundCommunicationToEmailAlertEvent("email")).toBe(
      "inbound_email",
    );
    expect(inboundCommunicationToEmailAlertEvent("sms")).toBe("inbound_sms");
    expect(inboundCommunicationToEmailAlertEvent("call")).toBeNull();
  });
});

describe("normalizeSecondaryEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeSecondaryEmail("  Ops@Example.COM  ")).toBe(
      "ops@example.com",
    );
  });
});

describe("isCrmSystemNotificationFromAddress", () => {
  it("detects Resend no-reply addresses that caused the Andres/Lena loop", () => {
    expect(
      isCrmSystemNotificationFromAddress("no-reply@themortgageprofessionals.net"),
    ).toBe(true);
    expect(
      isCrmSystemNotificationFromAddress(
        "The Mortgage Professionals <no-reply@themortgageprofessionals.net>",
      ),
    ).toBe(true);
    expect(isCrmSystemNotificationFromAddress("client@gmail.com")).toBe(false);
  });
});

describe("isCrmSystemNotificationMessage", () => {
  it("flags CRM alert from address", () => {
    expect(
      isCrmSystemNotificationMessage({
        fromEmail: "no-reply@themortgageprofessionals.net",
        subject: "New email from The Mortgage Professionals",
      }),
    ).toBe(true);
  });
});
