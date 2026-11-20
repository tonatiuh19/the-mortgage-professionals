import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  checkLegalRequirements,
  fillLegalPlaceholders,
  findUnknownPlaceholders,
  formatLegalDate,
  legalUrl,
  type LegalCompanyDetails,
} from "./legal";

const details: LegalCompanyDetails = {
  company_name: "The Mortgage Professionals, Inc.",
  company_short_name: "The Mortgage Professionals",
  nmls: "2302276",
  address_line1: "16901 Bellflower Blvd.",
  address_line2: "Bellflower, CA 90706",
  phone: "(562) 665-4132",
  email: "raul@theosegueragroup.com",
  website: "https://www.themortgageprofessionals.net/",
};

const migration = fs.readFileSync(
  path.resolve(__dirname, "../database/migrations/20261120_100000_legal_documents.sql"),
  "utf8",
);
/** v1 Markdown as seeded (SQL-unescaped). */
const seeded = (key: "privacy" | "terms") => {
  const m = new RegExp(`\\(2, '${key}', 1, '((?:[^'\\\\]|''|\\\\.)*)'`).exec(migration);
  if (!m) throw new Error(`seed for ${key} not found`);
  return m[1].replace(/''/g, "'").replace(/\\\\/g, "\\");
};

describe("fillLegalPlaceholders", () => {
  it("fills every known field and formats the date without a timezone shift", () => {
    const out = fillLegalPlaceholders(
      "{{company_name}} NMLS #{{nmls}} {{phone}} {{effective_date}} {{privacy_url}} {{terms_url}}",
      details,
      "2026-11-19",
    );
    expect(out).toBe(
      "The Mortgage Professionals, Inc. NMLS #2302276 (562) 665-4132 November 19, 2026 https://www.themortgageprofessionals.net/privacy-policy https://www.themortgageprofessionals.net/terms-and-conditions",
    );
  });

  it("leaves unknown placeholders visible and reports them", () => {
    expect(fillLegalPlaceholders("Hi {{fax}}", details, "2026-01-01")).toBe("Hi {{fax}}");
    expect(findUnknownPlaceholders("{{phone}} {{fax}} {{ fax }}")).toEqual(["fax"]);
  });

  it("handles missing optional details and odd dates", () => {
    expect(fillLegalPlaceholders("[{{email}}]", { ...details, email: null }, "2026-01-01")).toBe("[]");
    expect(formatLegalDate("not-a-date")).toBe("not-a-date");
    expect(legalUrl(null, "/terms-and-conditions")).toBe("/terms-and-conditions");
  });
});

describe("seeded v1 documents (from the Nov 19, 2026 PDF)", () => {
  for (const key of ["privacy", "terms"] as const) {
    it(`${key}: uses only known placeholders and passes the carrier checklist`, () => {
      const md = seeded(key);
      expect(findUnknownPlaceholders(md)).toEqual([]);
      const filled = fillLegalPlaceholders(md, details, "2026-11-19");
      expect(filled).not.toMatch(/\{\{/);
      expect(checkLegalRequirements(key, filled).filter((c) => !c.ok)).toEqual([]);
      expect(filled).toContain("(562) 665-4132");
      expect(filled).toContain("NMLS #2302276");
    });
  }

  it("flags removed carrier language", () => {
    const failing = checkLegalRequirements("terms", "Just some text").filter((c) => !c.ok);
    expect(failing.map((c) => c.id)).toContain("stop");
    expect(failing.map((c) => c.id)).toContain("carrier");
  });
});

describe("api/index.ts inlined copy", () => {
  const api = fs.readFileSync(path.resolve(__dirname, "../api/index.ts"), "utf8");
  it("uses the same public paths and placeholder keys", () => {
    expect(api).toContain(`privacy: { title: "Privacy Policy", path: "/privacy-policy" }`);
    expect(api).toContain(`terms: { title: "Terms & Conditions", path: "/terms-and-conditions" }`);
    for (const key of ["company_name", "company_short_name", "nmls", "address_line1", "address_line2", "phone", "email", "website", "effective_date", "privacy_url", "terms_url"]) {
      expect(api).toMatch(new RegExp(`\\b${key}: `));
    }
  });
});
