import { decodeDeal, type DealInputs } from "../src/math/deal";
import { amountFinanced, monthlyEquivalent, paymentFor, periodicRate } from "../src/math/loan";
import fixture from "./fixtures/worked-example.json";

const inputs = fixture.inputs as DealInputs;

describe("worked example from workshop doc 03", () => {
  const result = decodeDeal(inputs);

  it.each(Object.entries(fixture.expected))("%s", (key, expected) => {
    const actual = result[key as keyof typeof result];
    expect(actual).toBeDefined();
    expect(Math.round(actual as number)).toBe(expected);
  });

  it("rate markup of 2 points costs about $2,371 over the term", () => {
    const financed = amountFinanced(inputs);
    const atBankRate = paymentFor(financed, periodicRate(0.0599, "monthly"), 84);
    expect(Math.round((inputs.payment - atBankRate) * 84)).toBe(2371);
  });

  it("same principal at 60 months is $585.46 and $6,247 interest", () => {
    const financed = amountFinanced(inputs);
    const p60 = paymentFor(financed, periodicRate(inputs.apr, "monthly"), 60);
    expect(p60).toBeCloseTo(585.46, 2);
    expect(Math.round(p60 * 60 - financed)).toBe(6247);
  });
});

describe("payment frequency", () => {
  it("$199 bi-weekly is $431.17 a month, not $398", () => {
    expect(monthlyEquivalent(199, "biweekly")).toBeCloseTo(431.17, 2);
  });

  it("bi-weekly quote decodes to the same principal as its monthly equivalent within $50", () => {
    const biweekly = amountFinanced({ payment: 208, frequency: "biweekly", termMonths: 84, apr: 0.0799 });
    const monthly = amountFinanced({ payment: monthlyEquivalent(208, "biweekly"), frequency: "monthly", termMonths: 84, apr: 0.0799 });
    expect(Math.abs(biweekly - monthly)).toBeLessThan(50);
  });
});

describe("edge cases", () => {
  it("0% APR is payment times periods", () => {
    expect(amountFinanced({ payment: 500, frequency: "monthly", termMonths: 60, apr: 0 })).toBe(30000);
  });

  it("negative equity on the trade reduces implied all-in", () => {
    const r = decodeDeal({ ...inputs, tradeAllowance: 8000, tradePayoff: 11000 });
    expect(r.netTradeEquity).toBe(-3000);
    expect(Math.round(r.impliedAllIn)).toBe(28881);
  });
});
