import { describe, expect, it } from "vitest";
import {
  detectSmsEncoding,
  estimateBroadcastSmsSegments,
  estimateSmsSegments,
  gsm7Length,
} from "./sms-segments";

describe("sms-segments", () => {
  it("detects GSM-7 for plain ASCII", () => {
    expect(detectSmsEncoding("Hello realtor")).toBe("GSM-7");
  });

  it("detects UCS-2 for emoji / non-GSM", () => {
    expect(detectSmsEncoding("Hello 👋")).toBe("UCS-2");
    expect(detectSmsEncoding("你好")).toBe("UCS-2");
  });

  it("counts GSM extended chars as 2 septets", () => {
    expect(gsm7Length("Hello€")).toBe(7); // € is extended
  });

  it("segments GSM single vs concatenated", () => {
    const short = estimateSmsSegments("x".repeat(160));
    expect(short.segmentCount).toBe(1);
    expect(short.encoding).toBe("GSM-7");

    const long = estimateSmsSegments("x".repeat(161));
    expect(long.segmentCount).toBe(2);
    expect(long.charsPerSegment).toBe(153);
  });

  it("segments UCS-2 at 70/67", () => {
    const short = estimateSmsSegments("🙂".repeat(70));
    expect(short.encoding).toBe("UCS-2");
    expect(short.segmentCount).toBe(1);

    const long = estimateSmsSegments("🙂".repeat(71));
    expect(long.segmentCount).toBe(2);
    expect(long.charsPerSegment).toBe(67);
    expect(long.hasEmoji).toBe(true);
  });

  it("sets soft/hard warn thresholds", () => {
    // ~153*3 = 459 GSM chars → 3 segments
    const soft = estimateSmsSegments("a".repeat(459));
    expect(soft.segmentCount).toBe(3);
    expect(soft.softWarn).toBe(true);
    expect(soft.hardConfirm).toBe(false);

    const hard = estimateSmsSegments("a".repeat(153 * 5));
    expect(hard.segmentCount).toBe(5);
    expect(hard.hardConfirm).toBe(true);
  });

  it("estimates blast cost", () => {
    const blast = estimateBroadcastSmsSegments("Hi", 10);
    expect(blast.totalSegments).toBe(10);
    expect(blast.estimatedCostUsd).toBe(0.12);
  });
});
