import { describe, expect, it } from "vitest";
import {
  BROADCAST_BULK_DEFAULT_CHUNK_SIZE,
  BROADCAST_BULK_MAX_RECIPIENTS_PER_REQUEST,
  broadcastBulkBillingLabel,
  chunkArray,
  isBulkOperationTerminal,
  mapBulkOperationStatsToProgress,
  normalizeBroadcastPhone,
  parseBroadcastSmsEngine,
  parseOperationIdsJson,
  phonesMatch,
  resolveBroadcastSmsEngineFromEnv,
  shouldUseBulkSmsEngine,
} from "./broadcast-bulk";

describe("normalizeBroadcastPhone / phonesMatch", () => {
  it("normalizes 10-digit US numbers", () => {
    expect(normalizeBroadcastPhone("(562) 337-0000")).toBe("15623370000");
  });

  it("keeps 11-digit numbers starting with 1", () => {
    expect(normalizeBroadcastPhone("+15623370000")).toBe("15623370000");
  });

  it("matches equivalent formats", () => {
    expect(phonesMatch("+1 562-337-0000", "5623370000")).toBe(true);
    expect(phonesMatch("5623370000", "2135551212")).toBe(false);
  });

  it("does not match empty / null phones", () => {
    expect(phonesMatch("", "")).toBe(false);
    expect(phonesMatch(null, "5623370000")).toBe(false);
    expect(phonesMatch("5623370000", undefined)).toBe(false);
    expect(normalizeBroadcastPhone("   ")).toBe("");
    expect(normalizeBroadcastPhone(null)).toBe("");
  });
});

describe("chunkArray", () => {
  it("chunks under 10k", () => {
    const items = Array.from({ length: 9500 }, (_, i) => i);
    const chunks = chunkArray(items, 9000);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(9000);
    expect(chunks[1]).toHaveLength(500);
  });

  it("returns empty for empty input", () => {
    expect(chunkArray([], 9000)).toEqual([]);
  });

  it("single chunk when under size", () => {
    expect(chunkArray([1, 2, 3], 9000)).toEqual([[1, 2, 3]]);
  });

  it("caps chunk size at Twilio max 10k", () => {
    const items = Array.from({ length: 10001 }, (_, i) => i);
    const chunks = chunkArray(items, 50_000);
    expect(chunks[0]).toHaveLength(BROADCAST_BULK_MAX_RECIPIENTS_PER_REQUEST);
    expect(chunks).toHaveLength(2);
    expect(chunks[1]).toHaveLength(1);
  });

  it("uses default chunk size when omitted", () => {
    const items = Array.from(
      { length: BROADCAST_BULK_DEFAULT_CHUNK_SIZE + 10 },
      (_, i) => i,
    );
    const chunks = chunkArray(items);
    expect(chunks[0]).toHaveLength(BROADCAST_BULK_DEFAULT_CHUNK_SIZE);
    expect(chunks[1]).toHaveLength(10);
  });

  it("treats invalid size as 1", () => {
    expect(chunkArray([1, 2, 3], 0)).toEqual([[1], [2], [3]]);
    expect(chunkArray([1, 2], -5)).toEqual([[1], [2]]);
  });
});

describe("parseBroadcastSmsEngine / shouldUseBulkSmsEngine", () => {
  it("defaults to messages", () => {
    expect(parseBroadcastSmsEngine(undefined)).toBe("messages");
    expect(parseBroadcastSmsEngine(null)).toBe("messages");
    expect(parseBroadcastSmsEngine("")).toBe("messages");
    expect(parseBroadcastSmsEngine("weird")).toBe("messages");
    expect(parseBroadcastSmsEngine("BULK")).toBe("bulk");
    expect(parseBroadcastSmsEngine(" bulk ")).toBe("bulk");
  });

  it("resolves engine from env (internal gate, default off)", () => {
    expect(resolveBroadcastSmsEngineFromEnv({})).toBe("messages");
    expect(
      resolveBroadcastSmsEngineFromEnv({ BROADCAST_BULK_MESSAGING_ENABLED: "0" }),
    ).toBe("messages");
    expect(
      resolveBroadcastSmsEngineFromEnv({ BROADCAST_BULK_MESSAGING_ENABLED: "1" }),
    ).toBe("bulk");
    expect(
      resolveBroadcastSmsEngineFromEnv({ BROADCAST_SMS_ENGINE: "bulk" }),
    ).toBe("bulk");
    expect(
      resolveBroadcastSmsEngineFromEnv({
        BROADCAST_SMS_ENGINE: "messages",
        BROADCAST_BULK_MESSAGING_ENABLED: "1",
      }),
    ).toBe("messages");
  });

  it("requires bulk flag, sms channel, and min recipients", () => {
    expect(
      shouldUseBulkSmsEngine({
        engineSetting: "bulk",
        channel: "sms",
        smsRecipientCount: 50,
        minRecipients: 1,
      }),
    ).toBe(true);
    expect(
      shouldUseBulkSmsEngine({
        engineSetting: "messages",
        channel: "sms",
        smsRecipientCount: 500,
      }),
    ).toBe(false);
    expect(
      shouldUseBulkSmsEngine({
        engineSetting: "bulk",
        channel: "email",
        smsRecipientCount: 500,
      }),
    ).toBe(false);
    expect(
      shouldUseBulkSmsEngine({
        engineSetting: "bulk",
        channel: "sms",
        smsRecipientCount: 10,
        minRecipients: 200,
      }),
    ).toBe(false);
  });

  it("allows both channel for Bulk SMS half", () => {
    expect(
      shouldUseBulkSmsEngine({
        engineSetting: "bulk",
        channel: "both",
        smsRecipientCount: 5,
        minRecipients: 1,
      }),
    ).toBe(true);
  });

  it("rejects zero recipients even when flag on", () => {
    expect(
      shouldUseBulkSmsEngine({
        engineSetting: "bulk",
        channel: "sms",
        smsRecipientCount: 0,
        minRecipients: 1,
      }),
    ).toBe(false);
  });

  it("boundary: exactly minRecipients enables Bulk", () => {
    expect(
      shouldUseBulkSmsEngine({
        engineSetting: "bulk",
        channel: "sms",
        smsRecipientCount: 200,
        minRecipients: 200,
      }),
    ).toBe(true);
    expect(
      shouldUseBulkSmsEngine({
        engineSetting: "bulk",
        channel: "sms",
        smsRecipientCount: 199,
        minRecipients: 200,
      }),
    ).toBe(false);
  });
});

describe("mapBulkOperationStatsToProgress", () => {
  it("maps Twilio operation stats", () => {
    const p = mapBulkOperationStatsToProgress(
      {
        sent: 10,
        delivered: 5,
        failed: 2,
        undelivered: 1,
        recipients: 20,
      },
      20,
      "COMPLETED",
    );
    expect(p.sentCount).toBe(15);
    expect(p.failedCount).toBe(3);
    expect(p.pendingCount).toBe(2);
    expect(p.progressPct).toBe(90);
    expect(p.operationStatus).toBe("COMPLETED");
  });

  it("handles null / empty stats without NaN", () => {
    const p = mapBulkOperationStatsToProgress(null, 100, "QUEUED");
    expect(p.sentCount).toBe(0);
    expect(p.failedCount).toBe(0);
    expect(p.pendingCount).toBe(100);
    expect(p.progressPct).toBe(0);
  });

  it("counts canceled + unaddressable as failed", () => {
    const p = mapBulkOperationStatsToProgress(
      { canceled: 3, unaddressable: 2, sent: 5, recipients: 10 },
      10,
    );
    expect(p.failedCount).toBe(5);
    expect(p.sentCount).toBe(5);
    expect(p.progressPct).toBe(100);
  });

  it("never exceeds 100% progress", () => {
    const p = mapBulkOperationStatsToProgress(
      { sent: 50, delivered: 50, failed: 10, recipients: 10 },
      10,
    );
    expect(p.progressPct).toBe(100);
  });

  it("zero recipient campaign stays at 0%", () => {
    const p = mapBulkOperationStatsToProgress({}, 0, null);
    expect(p.progressPct).toBe(0);
    expect(p.pendingCount).toBe(0);
  });
});

describe("isBulkOperationTerminal", () => {
  it("detects terminal statuses", () => {
    expect(isBulkOperationTerminal("COMPLETED")).toBe(true);
    expect(isBulkOperationTerminal("FAILED")).toBe(true);
    expect(isBulkOperationTerminal("CANCELED")).toBe(true);
    expect(isBulkOperationTerminal("CANCELLED")).toBe(true);
    expect(isBulkOperationTerminal("queued")).toBe(false);
    expect(isBulkOperationTerminal("RUNNING")).toBe(false);
    expect(isBulkOperationTerminal(null)).toBe(false);
    expect(isBulkOperationTerminal(undefined)).toBe(false);
  });
});

describe("parseOperationIdsJson", () => {
  it("parses array, JSON string, and single id", () => {
    expect(parseOperationIdsJson(["a", "b"])).toEqual(["a", "b"]);
    expect(parseOperationIdsJson('["op1","op2"]')).toEqual(["op1", "op2"]);
    expect(parseOperationIdsJson("op-single")).toEqual(["op-single"]);
    expect(parseOperationIdsJson(null)).toEqual([]);
    expect(parseOperationIdsJson("")).toEqual([]);
    expect(parseOperationIdsJson("{bad")).toEqual(["{bad"]);
    expect(parseOperationIdsJson(123)).toEqual([]);
  });
});

describe("broadcastBulkBillingLabel", () => {
  it("labels Bulk vs standard", () => {
    expect(broadcastBulkBillingLabel("bulk")).toBe("Broadcast (Bulk)");
    expect(broadcastBulkBillingLabel("messages")).toBe("Broadcast");
    expect(broadcastBulkBillingLabel(null)).toBe("Broadcast");
    expect(broadcastBulkBillingLabel("")).toBe("Broadcast");
  });
});
