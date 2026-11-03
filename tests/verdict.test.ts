import { cents, fromDollars } from "../src/model/money";
import type { DealQuote } from "../src/model/deal";
import { headline, verdict, type Gap, type GapKind } from "../src/model/verdict";
import fixture from "./fixtures/worked-example.json";

const workedExample: DealQuote = {
  payment: fromDollars(fixture.inputs.payment),
  frequency: "monthly",
  termMonths: fixture.inputs.termMonths,
  apr: fixture.inputs.apr,
  downPayment: fromDollars(fixture.inputs.downPayment),
  tradeAllowance: fromDollars(fixture.inputs.tradeAllowance),
  tradePayoff: fromDollars(fixture.inputs.tradePayoff),
  province: "ON",
  advertisedPrice: fromDollars(fixture.inputs.advertisedPrice),
};

const workedBenchmarks = {
  preApprovalApr: fixture.benchmarks.preApprovalApr,
  outsideTradeOffer: fromDollars(fixture.benchmarks.outsideTradeOffer),
};

function gap(gaps: Gap[], kind: GapKind): Gap {
  const found = gaps.find((g) => g.kind === kind);
  if (!found) throw new Error(`no ${kind} gap`);
  return found;
}

const dollars = (amount: number) => Math.round(amount / 100);

describe("worked example (docs 03 and the mockup)", () => {
  const v = verdict(workedExample, workedBenchmarks);

  it("puts the ask line at $1,046 and the large line at $2,790", () => {
    expect(dollars(v.askLine)).toBe(1046);
    expect(dollars(v.largeLine)).toBe(2790);
  });

  it("returns three ask gaps with the documented amounts, in price, rate, trade order", () => {
    expect(v.gaps.map((g) => [g.kind, dollars(g.amount), g.level])).toEqual([
      ["price", 1877, "ask"],
      ["rate", 2371, "ask"],
      ["trade", -1200, "ask"],
    ]);
  });

  it("is an ask verdict with three gaps over the line", () => {
    expect(v.level).toBe("ask");
    expect(v.overAskLine).toBe(3);
    expect(headline(v.level)).toBe("Numbers don't match");
  });

  it("carries the breakdown in cents", () => {
    expect(dollars(v.figures.amountFinanced)).toBe(28881);
    expect(v.figures.cashIn).toBe(600000);
    expect(dollars(v.figures.impliedAllIn)).toBe(34881);
    expect(dollars(v.figures.totalInterest)).toBe(8919);
    expect(v.figures.totalPaid).toBe(4380000);
  });
});

describe("missing benchmarks are omitted, not zero", () => {
  it("shows only the price gap when no benchmarks are entered", () => {
    expect(verdict(workedExample).gaps.map((g) => g.kind)).toEqual(["price"]);
  });

  it("shows no gaps without an advertised price or benchmarks", () => {
    const { advertisedPrice: _, ...noAdvertised } = workedExample;
    const v = verdict(noAdvertised);
    expect(v.gaps).toEqual([]);
    expect(v.level).toBe("match");
    expect(v.figures.expectedAllIn).toBeUndefined();
  });

  it("shows only the trade gap when only an outside offer is entered", () => {
    const { advertisedPrice: _, ...noAdvertised } = workedExample;
    const v = verdict(noAdvertised, { outsideTradeOffer: cents(920000) });
    expect(v.gaps.map((g) => g.kind)).toEqual(["trade"]);
  });
});

describe("thresholds scale with the deal", () => {
  it("cheap used car: a $557 rate markup is worth asking about", () => {
    const v = verdict(
      {
        payment: cents(27000),
        frequency: "monthly",
        termMonths: 60,
        apr: 0.0999,
        downPayment: cents(100000),
        tradeAllowance: cents(0),
        tradePayoff: cents(0),
        province: "ON",
        advertisedPrice: cents(1200000),
      },
      { preApprovalApr: 0.0849 },
    );
    expect(dollars(v.askLine)).toBe(411);
    expect(dollars(v.largeLine)).toBe(1097);
    expect(v.gaps.map((g) => [g.kind, dollars(g.amount), g.level])).toEqual([
      ["price", 1, "match"],
      ["rate", 557, "ask"],
    ]);
    expect(v.level).toBe("ask");
    expect(v.overAskLine).toBe(1);
  });

  it("$60k truck: a $1,500 trade shortfall is under the line, a $6,045 price gap is large", () => {
    const v = verdict(
      {
        payment: cents(70000),
        frequency: "monthly",
        termMonths: 84,
        apr: 0.0699,
        downPayment: cents(500000),
        tradeAllowance: cents(2000000),
        tradePayoff: cents(0),
        province: "ON",
        advertisedPrice: cents(6000000),
      },
      { preApprovalApr: 0.0699, outsideTradeOffer: cents(2150000) },
    );
    expect(dollars(v.askLine)).toBe(2142);
    expect(dollars(v.largeLine)).toBe(5712);
    expect(v.gaps.map((g) => [g.kind, dollars(g.amount), g.level])).toEqual([
      ["price", 6045, "large"],
      ["rate", 0, "match"],
      ["trade", -1500, "match"],
    ]);
    expect(v.level).toBe("large");
    expect(v.overAskLine).toBe(1);
    expect(headline(v.level)).toBe("Large gaps");
  });
});

describe("threshold boundaries", () => {
  const evenDeal: DealQuote = {
    payment: cents(40000),
    frequency: "monthly",
    termMonths: 60,
    apr: 0,
    downPayment: cents(1000000),
    tradeAllowance: cents(500000),
    tradePayoff: cents(500000),
    province: "ON",
  };

  it("has an implied all-in of exactly $34,000", () => {
    expect(verdict(evenDeal).figures.impliedAllIn).toBe(3400000);
  });

  it("a gap exactly at 3% is a match; one cent over is ask", () => {
    expect(gap(verdict(evenDeal, { outsideTradeOffer: cents(602000) }).gaps, "trade").level).toBe("match");
    expect(gap(verdict(evenDeal, { outsideTradeOffer: cents(602001) }).gaps, "trade").level).toBe("ask");
  });

  it("a gap exactly at 8% is ask; one cent over is large", () => {
    expect(gap(verdict(evenDeal, { outsideTradeOffer: cents(772000) }).gaps, "trade").level).toBe("ask");
    expect(gap(verdict(evenDeal, { outsideTradeOffer: cents(772001) }).gaps, "trade").level).toBe("large");
  });

  it("gaps in the buyer's favour are a match however large", () => {
    const v = verdict(evenDeal, { outsideTradeOffer: cents(100000), preApprovalApr: 0.09 });
    expect(v.gaps.map((g) => [g.kind, g.level])).toEqual([
      ["rate", "match"],
      ["trade", "match"],
    ]);
    expect(gap(v.gaps, "trade").amount).toBe(400000);
    expect(gap(v.gaps, "rate").amount).toBeLessThan(0);
    expect(v.level).toBe("match");
    expect(headline(v.level)).toBe("Numbers match");
  });
});

describe("payment frequency", () => {
  it("prices the rate gap at the quoted frequency", () => {
    const biweekly = verdict(
      { ...workedExample, payment: cents(20800), frequency: "biweekly" },
      { preApprovalApr: 0.0599 },
    );
    expect(dollars(gap(biweekly.gaps, "rate").amount)).toBeGreaterThan(2300);
    expect(dollars(gap(biweekly.gaps, "rate").amount)).toBeLessThan(2450);
  });
});
