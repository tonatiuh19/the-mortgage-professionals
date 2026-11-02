/**
 * SMS segment estimation (GSM-7 vs UCS-2) for broadcast cost/guardrail UX.
 * Aligns with Twilio segment rules at a practical approximation.
 */

export const SMS_COST_PER_SEGMENT_USD = 0.012;

/** Soft warn when a single message would use this many segments or more. */
export const SMS_SEGMENT_SOFT_WARN = 3;

/** Hard confirm when a single message would use this many segments or more. */
export const SMS_SEGMENT_HARD_CONFIRM = 5;

/** Characters that force UCS-2 even if most of the body is GSM-7. */
const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

const GSM7_EXTENDED = "^{}\\[~]|€";

const GSM7_BASIC_SET = new Set(GSM7_BASIC.split(""));
const GSM7_EXTENDED_SET = new Set(GSM7_EXTENDED.split(""));

export type SmsEncoding = "GSM-7" | "UCS-2";

export interface SmsSegmentEstimate {
  encoding: SmsEncoding;
  charCount: number;
  segmentCount: number;
  charsPerSegment: number;
  remainingInLastSegment: number;
  hasEmoji: boolean;
  estimatedCostUsd: number;
  softWarn: boolean;
  hardConfirm: boolean;
}

const EMOJI_RE =
  /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u2600-\u27BF])/u;

export function detectSmsEncoding(body: string): SmsEncoding {
  const text = body ?? "";
  for (const ch of text) {
    if (GSM7_BASIC_SET.has(ch) || GSM7_EXTENDED_SET.has(ch)) continue;
    return "UCS-2";
  }
  return "GSM-7";
}

export function bodyHasEmoji(body: string): boolean {
  try {
    return EMOJI_RE.test(body ?? "");
  } catch {
    // Environments without Unicode property escapes: treat non-GSM as emoji-ish warn
    return detectSmsEncoding(body) === "UCS-2";
  }
}

/** GSM-7 septet length (extended chars count as 2). */
export function gsm7Length(body: string): number {
  let len = 0;
  for (const ch of body ?? "") {
    if (GSM7_EXTENDED_SET.has(ch)) len += 2;
    else len += 1;
  }
  return len;
}

export function estimateSmsSegments(body: string): SmsSegmentEstimate {
  const text = body ?? "";
  const encoding = detectSmsEncoding(text);
  const hasEmoji = bodyHasEmoji(text);
  const charCount = encoding === "GSM-7" ? gsm7Length(text) : [...text].length;

  let charsPerSegment: number;
  if (encoding === "GSM-7") {
    charsPerSegment = charCount <= 160 ? 160 : 153;
  } else {
    charsPerSegment = charCount <= 70 ? 70 : 67;
  }

  const segmentCount =
    charCount === 0 ? 0 : Math.max(1, Math.ceil(charCount / charsPerSegment));
  const usedInLast =
    segmentCount === 0 ? 0 : charCount - (segmentCount - 1) * charsPerSegment;
  const remainingInLastSegment =
    segmentCount === 0 ? charsPerSegment : Math.max(0, charsPerSegment - usedInLast);

  return {
    encoding,
    charCount,
    segmentCount,
    charsPerSegment,
    remainingInLastSegment,
    hasEmoji,
    estimatedCostUsd: Number(
      (segmentCount * SMS_COST_PER_SEGMENT_USD).toFixed(4),
    ),
    softWarn: segmentCount >= SMS_SEGMENT_SOFT_WARN,
    hardConfirm: segmentCount >= SMS_SEGMENT_HARD_CONFIRM,
  };
}

/** Total segments for a blast (per-message estimate × recipient count). */
export function estimateBroadcastSmsSegments(
  body: string,
  recipientCount: number,
): {
  perMessage: SmsSegmentEstimate;
  totalSegments: number;
  estimatedCostUsd: number;
} {
  const perMessage = estimateSmsSegments(body);
  const totalSegments = perMessage.segmentCount * Math.max(0, recipientCount);
  return {
    perMessage,
    totalSegments,
    estimatedCostUsd: Number(
      (totalSegments * SMS_COST_PER_SEGMENT_USD).toFixed(4),
    ),
  };
}
