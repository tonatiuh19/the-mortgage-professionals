import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  buildSmsConsentTexts,
  buildSmsHelpReply,
  SMS_CONSENT_DEFAULT_BUSINESS_NAME,
  SMS_CONSENT_VERSION,
  SMS_SUPPORT_PHONE,
} from "./sms-consent";

describe("buildSmsConsentTexts", () => {
  it("includes the carrier-required disclosures in both checkboxes", () => {
    const texts = buildSmsConsentTexts("Acme Lending");
    for (const text of [texts.transactional, texts.marketing]) {
      expect(text).toContain("Acme Lending");
      expect(text).toMatch(/Message frequency varies/);
      expect(text).toMatch(/data rates may apply/);
      expect(text).toMatch(/Reply HELP/);
      expect(text).toMatch(/reply STOP to opt out/);
    }
    expect(texts.transactional).toMatch(/non-marketing/);
    expect(texts.marketing).toMatch(/^I consent to receive marketing/);
  });

  it("falls back to the default business name for blank input", () => {
    expect(buildSmsConsentTexts("   ").marketing).toContain(
      SMS_CONSENT_DEFAULT_BUSINESS_NAME,
    );
  });
});

describe("buildSmsHelpReply", () => {
  it("names the business, support phone, and STOP", () => {
    const reply = buildSmsHelpReply("Acme Lending");
    expect(reply).toContain("Acme Lending");
    expect(reply).toContain(SMS_SUPPORT_PHONE);
    expect(reply).toMatch(/Reply STOP/);
  });
});

describe("api/index.ts inlined copy", () => {
  const api = fs.readFileSync(
    path.resolve(__dirname, "../api/index.ts"),
    "utf8",
  );

  it("keeps the same version, name, and support phone", () => {
    expect(api).toContain(`const SMS_CONSENT_VERSION = "${SMS_CONSENT_VERSION}";`);
    expect(api).toContain(
      `const SMS_CONSENT_DEFAULT_BUSINESS_NAME = "${SMS_CONSENT_DEFAULT_BUSINESS_NAME}";`,
    );
    expect(api).toContain(`const SMS_SUPPORT_PHONE = "${SMS_SUPPORT_PHONE}";`);
  });

  it("keeps identical checkbox wording", () => {
    const name = "__NAME__";
    const texts = buildSmsConsentTexts(name);
    const disclosure = api.match(/const SMS_CONSENT_DISCLOSURE =\s*"([^"]+)";/)?.[1];
    expect(disclosure).toBeTruthy();
    const render = (tpl: string) =>
      tpl.replace("${name}", name).replace("${SMS_CONSENT_DISCLOSURE}", disclosure!);
    const tx = api.match(/transactional: `(I consent[^`]+)`/)?.[1];
    const mk = api.match(/marketing: `(I consent[^`]+)`/)?.[1];
    expect(render(tx!)).toBe(texts.transactional);
    expect(render(mk!)).toBe(texts.marketing);
  });
});
