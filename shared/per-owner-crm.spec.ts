import { describe, it, expect } from "vitest";
import {
  PER_OWNER_CRM_ENV_KEYS,
  PER_OWNER_CRM_LEGACY_ENV_KEYS,
  parsePilotBrokerIds,
  resolvePerOwnerCrmActive,
  resolvePerOwnerCrmFromEnv,
  clientListVisibilityFilter,
  resolveClientPhoneConflictScope,
  clientPhoneConflictWhere,
  perOwnerThreadMineWhere,
  perOwnerThreadSharedQueueWhere,
  defaultConversationInboxScope,
  normalizePhoneLast10,
} from "./per-owner-crm";

describe("resolvePerOwnerCrmFromEnv", () => {
  it("defaults to inactive when env unset", () => {
    const f = resolvePerOwnerCrmFromEnv({
      enabled: undefined,
      brokerId: 3,
    });
    expect(f.activeForBroker).toBe(false);
  });

  it("activates in production with ENABLED only", () => {
    const f = resolvePerOwnerCrmFromEnv({
      enabled: "1",
      brokerId: 3,
    });
    expect(f.activeForBroker).toBe(true);
    expect(f.pilotBrokerIds).toEqual([]);
  });
});

describe("PER_OWNER_CRM_ENV_KEYS", () => {
  it("documents single master env var", () => {
    expect(PER_OWNER_CRM_ENV_KEYS.enabled).toBe("PER_OWNER_CRM_ENABLED");
    expect(PER_OWNER_CRM_LEGACY_ENV_KEYS.allowProduction).toBe(
      "PER_OWNER_CRM_ALLOW_PRODUCTION",
    );
  });
});

describe("parsePilotBrokerIds", () => {
  it("still parses for legacy callers", () => {
    expect(parsePilotBrokerIds("3,4,5")).toEqual([3, 4, 5]);
  });
});

describe("resolvePerOwnerCrmActive", () => {
  it("defaults to inactive (legacy behavior)", () => {
    const f = resolvePerOwnerCrmActive({});
    expect(f.enabled).toBe(false);
    expect(f.activeForBroker).toBe(false);
  });

  it("activates in production when enabled (single flag)", () => {
    const f = resolvePerOwnerCrmActive({
      enabled: true,
      brokerId: 3,
    });
    expect(f.activeForBroker).toBe(true);
  });

  it("ignores deprecated allowProduction and pilotBrokerIds inputs", () => {
    const f = resolvePerOwnerCrmActive({
      enabled: true,
      allowProduction: false,
      pilotBrokerIds: [3],
      brokerId: 99,
    });
    expect(f.activeForBroker).toBe(true);
    expect(f.pilotBrokerIds).toEqual([]);
  });
});

describe("resolveClientPhoneConflictScope", () => {
  const activeFlags = {
    enabled: true,
    allowProduction: true,
    pilotBrokerIds: [],
    activeForBroker: true,
  };
  const legacyFlags = {
    enabled: false,
    allowProduction: false,
    pilotBrokerIds: [],
    activeForBroker: false,
  };

  it("uses tenant scope when flags off", () => {
    expect(resolveClientPhoneConflictScope(legacyFlags, 3)).toBe("tenant");
  });

  it("uses per_owner scope when flags on and broker assigned", () => {
    expect(resolveClientPhoneConflictScope(activeFlags, 3)).toBe("per_owner");
  });

  it("falls back to tenant scope when owner is null even if flags on", () => {
    expect(resolveClientPhoneConflictScope(activeFlags, null)).toBe("tenant");
  });
});

describe("clientPhoneConflictWhere", () => {
  it("tenant scope omits assigned_broker_id", () => {
    expect(clientPhoneConflictWhere("tenant")).toContain("normalized_phone = ?");
    expect(clientPhoneConflictWhere("tenant")).not.toContain(
      "assigned_broker_id",
    );
  });

  it("per_owner scope includes assigned_broker_id", () => {
    expect(clientPhoneConflictWhere("per_owner")).toContain(
      "assigned_broker_id = ?",
    );
  });
});

describe("clientListVisibilityFilter", () => {
  it("returns only active when CRM active", () => {
    expect(
      clientListVisibilityFilter({
        enabled: true,
        allowProduction: true,
        pilotBrokerIds: [],
        activeForBroker: true,
      }),
    ).toEqual(["active"]);
  });

  it("returns all visibilities when legacy mode", () => {
    expect(
      clientListVisibilityFilter({
        enabled: false,
        allowProduction: false,
        pilotBrokerIds: [],
        activeForBroker: false,
      }),
    ).toEqual(["active", "hidden", "archived"]);
  });
});

describe("per-owner thread scope SQL", () => {
  it("shared queue matches unclaimed threads", () => {
    expect(perOwnerThreadSharedQueueWhere("ct")).toContain(
      "ct.client_id IS NULL AND ct.broker_id IS NULL",
    );
  });

  it("mine scope excludes shared queue", () => {
    expect(perOwnerThreadMineWhere("ct")).toContain("NOT");
    expect(perOwnerThreadMineWhere("ct")).toContain(
      "owner_client_scope_broker_id = ?",
    );
  });
});

describe("defaultConversationInboxScope", () => {
  it("defaults to mine when CRM active", () => {
    expect(
      defaultConversationInboxScope({
        enabled: true,
        allowProduction: true,
        pilotBrokerIds: [],
        activeForBroker: true,
      }),
    ).toBe("mine");
  });

  it("defaults to all in legacy mode", () => {
    expect(
      defaultConversationInboxScope({
        enabled: false,
        allowProduction: false,
        pilotBrokerIds: [],
        activeForBroker: false,
      }),
    ).toBe("all");
  });
});

describe("normalizePhoneLast10", () => {
  it("strips to last 10 digits", () => {
    expect(normalizePhoneLast10("+1 (562) 449-0000")).toBe("5624490000");
  });
});
