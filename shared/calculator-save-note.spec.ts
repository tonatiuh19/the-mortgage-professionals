import { describe, expect, it } from "vitest";
import {
  appendCalculatorNoteToLoanNotes,
  calculatorKindLabel,
  formatCalculatorApplyNote,
} from "./calculator-save-note";

describe("calculator-save-note", () => {
  it("labels kinds", () => {
    expect(calculatorKindLabel("fha")).toBe("FHA");
    expect(calculatorKindLabel("income")).toBe("Wage Earner Income");
  });

  it("formats loan calc snapshot without touching income lines", () => {
    const text = formatCalculatorApplyNote({
      kind: "fha",
      title: "FHA · $400,000",
      summary: {
        sales_price: 400_000,
        total_monthly_payment: 2_850.12,
        interest_rate: 6.5,
        ltv: 96.5,
        front_end_ratio: 28.1,
        back_end_ratio: 36.2,
      },
      savedAt: "2026-09-24T15:00:00.000Z",
      brokerName: "Alex Broker",
    });
    expect(text).toContain("Kind: FHA");
    expect(text).toContain("Sales price:");
    expect(text).toContain("Est. monthly payment:");
    expect(text).toContain("By: Alex Broker");
    expect(text).not.toMatch(/overwrite|income lines/i);
  });

  it("formats income worksheet snapshot", () => {
    const text = formatCalculatorApplyNote({
      kind: "income",
      title: "Wage Earner",
      summary: { household_total: 12_500 },
      payload: {
        borrowers: [{ name: "Pat" }, { name: "" }],
      },
    });
    expect(text).toContain("Household qualifying income");
    expect(text).toContain("Pat");
  });

  it("appends without overwriting prior notes", () => {
    const next = appendCalculatorNoteToLoanNotes(
      "Prior note about appraisal.",
      "——— Calculator snapshot ———\nKind: VA",
    );
    expect(next.startsWith("Prior note about appraisal.")).toBe(true);
    expect(next).toContain("Kind: VA");
  });
});
