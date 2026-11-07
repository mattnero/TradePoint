import { compareDeals } from "../src/model/compare";
import { compareRows, differenceLines } from "../src/model/compareCopy";
import type { DealQuote } from "../src/model/deal";
import { cents } from "../src/model/money";
import type { SavedDeal } from "../src/model/savedDeal";

const base: DealQuote = {
  payment: cents(45000),
  frequency: "monthly",
  termMonths: 84,
  apr: 0.0799,
  downPayment: cents(300000),
  tradeAllowance: cents(800000),
  tradePayoff: cents(500000),
  province: "ON",
  advertisedPrice: cents(2999500),
};

function deal(id: string, label: string, quote: DealQuote, benchmarks: SavedDeal["benchmarks"] = {}): SavedDeal {
  return { id, label, savedAt: "2026-11-07", quote, benchmarks };
}

const honda = deal("a", "Honda", base);
const toyota = deal("b", "Toyota", { ...base, payment: cents(52000), termMonths: 72, apr: 0.0599 });

describe("compareDeals", () => {
  it("carries each deal's figures and verdict level", () => {
    const { a, b } = compareDeals(honda, toyota);
    expect(a.figures).toMatchObject({ amountFinanced: 2888090, impliedAllIn: 3488090, totalInterest: 891910, totalPaid: 4380000 });
    expect(b.figures).toMatchObject({ amountFinanced: 3138549, impliedAllIn: 3738549, totalInterest: 605451, totalPaid: 4344000 });
    expect(a.level).toBe("ask");
    expect(b.level).toBe("large");
  });

  it("uses each deal's own benchmarks for its verdict", () => {
    const withOffer = deal("c", "Honda + offer", base, { outsideTradeOffer: cents(1100000) });
    expect(compareDeals(honda, withOffer).b.level).toBe("large");
    expect(compareDeals(honda, withOffer).a.level).toBe("ask");
  });
});

describe("compareRows", () => {
  const rows = compareRows(compareDeals(honda, toyota));
  const row = (label: string) => rows.find((r) => r.label === label)!;

  it("lists payment, term, rate, financed, all-in, interest, total, gap and verdict in that order", () => {
    expect(rows.map((r) => r.label)).toEqual([
      "Payment",
      "Term",
      "Rate",
      "Amount financed",
      "All-in price",
      "Total interest",
      "Total paid",
      "Gap vs advertised",
      "Verdict",
    ]);
  });

  it("shows payment with its frequency, term in months and the rate with two decimals", () => {
    expect(row("Payment")).toMatchObject({
      a: { value: "$450.00", note: "monthly" },
      b: { value: "$520.00", note: "monthly" },
    });
    expect(row("Term")).toMatchObject({ a: { value: "84 months" }, b: { value: "72 months" } });
    expect(row("Rate")).toMatchObject({ a: { value: "7.99%" }, b: { value: "5.99%" } });
  });

  it("shows the money rows in whole dollars", () => {
    expect(row("Amount financed")).toMatchObject({ a: { value: "$28,881" }, b: { value: "$31,385" } });
    expect(row("All-in price")).toMatchObject({ a: { value: "$34,881" }, b: { value: "$37,385" } });
    expect(row("Total interest")).toMatchObject({ a: { value: "$8,919" }, b: { value: "$6,055" } });
    expect(row("Total paid")).toMatchObject({ a: { value: "$43,800" }, b: { value: "$43,440" } });
  });

  it("shows the gap against the advertised price signed, and the verdict in the app's words", () => {
    expect(row("Gap vs advertised")).toMatchObject({ a: { value: "+$1,877" }, b: { value: "+$4,381" } });
    expect(row("Verdict")).toMatchObject({ a: { value: "Numbers don't match" }, b: { value: "Large gaps" } });
  });

  it("says so when a deal has no advertised price", () => {
    const { advertisedPrice: _, ...noPrice } = base;
    const r = compareRows(compareDeals(honda, deal("c", "Kia", noPrice))).find((x) => x.label === "Gap vs advertised")!;
    expect(r.a.value).toBe("+$1,877");
    expect(r.b).toEqual({ value: "No price entered" });
  });

  it("converts a bi-weekly payment to a monthly figure in its note", () => {
    const biweekly = deal("c", "Kia", { ...base, payment: cents(19394), frequency: "biweekly" });
    const r = compareRows(compareDeals(honda, biweekly)).find((x) => x.label === "Payment")!;
    expect(r.b).toEqual({ value: "$193.94", note: "bi-weekly, about $420.20 a month" });
  });
});

describe("differenceLines", () => {
  it("gives dollar differences for B against A, in each direction", () => {
    const lines = differenceLines(compareDeals(honda, toyota));
    expect(lines[0]).toBe("B is $2,505 more all-in, $2,865 less interest and $360 less in total paid.");
  });

  it("flips the wording when A and B are swapped", () => {
    const lines = differenceLines(compareDeals(toyota, honda));
    expect(lines[0]).toBe("B is $2,505 less all-in, $2,865 more interest and $360 more in total paid.");
  });

  it("says a higher payment over a shorter term, and a lower one over a longer term, with the term", () => {
    expect(differenceLines(compareDeals(honda, toyota))[1]).toBe(
      "B's payment is $70 a month higher, but it ends 12 months sooner.",
    );
    expect(differenceLines(compareDeals(toyota, honda))[1]).toBe(
      "B's payment is $70 a month lower, but it runs 12 months longer.",
    );
  });

  it("compares payments as monthly amounts when frequencies differ", () => {
    const biweekly = deal("c", "Kia", { ...base, payment: cents(25000), frequency: "biweekly" });
    expect(differenceLines(compareDeals(honda, biweekly))[1]).toBe("B's payment is $92 a month higher.");
  });

  it("uses 'and' rather than 'but' when payment and term move the same way", () => {
    const better = deal("c", "Kia", { ...base, payment: cents(40000), termMonths: 72 });
    expect(differenceLines(compareDeals(honda, better))[1]).toBe(
      "B's payment is $50 a month lower, and it ends 12 months sooner.",
    );
    const worse = deal("d", "Kia", { ...base, payment: cents(50000), termMonths: 96 });
    expect(differenceLines(compareDeals(honda, worse))[1]).toBe(
      "B's payment is $50 a month higher, and it runs 12 months longer.",
    );
  });

  it("says when only the term differs", () => {
    const longer = deal("c", "Kia", { ...base, termMonths: 96 });
    expect(differenceLines(compareDeals(honda, longer))[1]).toBe("The payments match, and B runs 12 months longer.");
  });

  it("leaves out figures that match and reports when everything does", () => {
    const same = deal("c", "Honda again", base);
    expect(differenceLines(compareDeals(honda, same))).toEqual([
      "These two deals have the same all-in price, interest and total paid.",
    ]);
  });

  it("leaves out one matching figure but keeps the others", () => {
    const sameInterest = deal("c", "Kia", { ...base, downPayment: cents(400000) });
    expect(differenceLines(compareDeals(honda, sameInterest))).toEqual([
      "B is $1,000 more all-in and $1,000 more in total paid.",
    ]);
  });

  it("never picks a winner or uses good or bad wording", () => {
    const text = differenceLines(compareDeals(honda, toyota)).join(" ").toLowerCase();
    for (const word of ["better", "worse", "best", "worst", "winner", "good", "bad", "save", "cheaper"]) {
      expect(text).not.toContain(word);
    }
  });
});
