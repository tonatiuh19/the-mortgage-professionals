import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_INPUTS } from "@shared/loan-calc-engine";
import {
  __clearLoanCalcSavesForTests,
  deleteSavedCalculation,
  listSavedCalculations,
  normalizeLoanCalcInputs,
  saveCalculation,
} from "./loanCalcStorage";

// Node test environment has no browser storage.
const storageData = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storageData.get(key) ?? null,
    setItem: (key: string, value: string) => storageData.set(key, value),
    removeItem: (key: string) => storageData.delete(key),
    clear: () => storageData.clear(),
  },
});

describe("loanCalcStorage", () => {
  beforeEach(() => {
    __clearLoanCalcSavesForTests();
  });

  it("normalizeLoanCalcInputs rejects missing income/debts arrays", () => {
    expect(normalizeLoanCalcInputs(null)).toBeNull();
    expect(normalizeLoanCalcInputs({ salesPrice: 1 })).toBeNull();
    expect(
      normalizeLoanCalcInputs({
        salesPrice: 100,
        income: [{ id: "1", label: "A", amount: 1 }],
        debts: [{ id: "1", label: "B", amount: 2 }],
      }),
    ).toMatchObject({ salesPrice: 100 });
  });

  it("refuses save without brokerId", () => {
    const r = saveCalculation({
      kind: "fha",
      title: "Test",
      brokerId: null,
      inputs: DEFAULT_INPUTS,
    });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toBe("no_broker");
    expect(listSavedCalculations(1)).toHaveLength(0);
  });

  it("saves and lists only for the owning broker", () => {
    const a = saveCalculation({
      kind: "fha",
      title: "Broker 1",
      brokerId: 1,
      inputs: { ...DEFAULT_INPUTS, salesPrice: 250_000 },
    });
    const b = saveCalculation({
      kind: "va",
      title: "Broker 2",
      brokerId: 2,
      inputs: { ...DEFAULT_INPUTS, salesPrice: 300_000 },
    });
    expect(a.ok && b.ok).toBe(true);
    expect(listSavedCalculations(1).map((s) => s.title)).toEqual(["Broker 1"]);
    expect(listSavedCalculations(2).map((s) => s.title)).toEqual(["Broker 2"]);
    expect(listSavedCalculations(null)).toEqual([]);
  });

  it("delete is scoped to broker", () => {
    const saved = saveCalculation({
      kind: "conventional",
      title: "Mine",
      brokerId: 9,
      inputs: DEFAULT_INPUTS,
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    deleteSavedCalculation(saved.row.id, 8);
    expect(listSavedCalculations(9)).toHaveLength(1);
    deleteSavedCalculation(saved.row.id, 9);
    expect(listSavedCalculations(9)).toHaveLength(0);
  });

  it("ignores corrupt localStorage rows", () => {
    localStorage.setItem(
      "tmp_loan_calc_saves_v1",
      JSON.stringify([
        { id: "bad", kind: "fha", brokerId: 1, inputs: { salesPrice: 1 } },
        {
          id: "good",
          kind: "fha",
          title: "OK",
          savedAt: "2026-01-01T00:00:00.000Z",
          brokerId: 1,
          inputs: {
            ...DEFAULT_INPUTS,
            income: [{ id: "i", label: "W", amount: 1 }],
            debts: [{ id: "d", label: "D", amount: 0 }],
          },
        },
      ]),
    );
    expect(listSavedCalculations(1)).toHaveLength(1);
    expect(listSavedCalculations(1)[0].title).toBe("OK");
  });

  it("clones inputs so later edits do not mutate the saved copy", () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      salesPrice: 100_000,
      income: [{ id: "i", label: "W", amount: 5000 }],
      debts: [{ id: "d", label: "D", amount: 100 }],
    };
    const saved = saveCalculation({
      kind: "fha",
      title: "Clone",
      brokerId: 3,
      inputs,
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    inputs.salesPrice = 999;
    inputs.income[0].amount = 1;
    const listed = listSavedCalculations(3)[0];
    expect(listed.inputs.salesPrice).toBe(100_000);
    expect(listed.inputs.income[0].amount).toBe(5000);
  });
});
