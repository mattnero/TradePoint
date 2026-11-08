import { askFor, gapRows, subtitle, tenMinutesText, walkAwayLine } from "../src/model/verdictCopy";
import { cents, fromDollars } from "../src/model/money";
import type { DealQuote } from "../src/model/deal";
import { verdict } from "../src/model/verdict";
import fixture from "./fixtures/worked-example.json";

const quote: DealQuote = {
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

const benchmarks = {
  preApprovalApr: fixture.benchmarks.preApprovalApr,
  outsideTradeOffer: fromDollars(fixture.benchmarks.outsideTradeOffer),
};

const worked = verdict(quote, benchmarks);

function withoutAdvertised(q: DealQuote): DealQuote {
  const { advertisedPrice: _, ...rest } = q;
  return rest;
}

describe("subtitle", () => {
  it("names the count and the 3% line for the worked example", () => {
    expect(subtitle(worked)).toBe("3 gaps over 3% of the deal ($1,046). Ask before you sign.");
  });

  it("uses the singular for one gap", () => {
    const one = verdict(quote);
    expect(subtitle(one)).toBe("1 gap over 3% of the deal ($1,046). Ask before you sign.");
  });

  it("still asks for the bill of sale when nothing is flagged", () => {
    const matching = verdict(withoutAdvertised(quote));
    expect(matching.level).toBe("match");
    expect(subtitle(matching)).toBe("Every gap is under 3% of the deal. Still ask for the bill of sale.");
  });
});

describe("gapRows", () => {
  const rows = gapRows(quote, benchmarks, worked);

  it("spells out each comparison, as in the mockup", () => {
    expect(rows.map((r) => [r.title, r.detail, r.amount, r.level])).toEqual([
      ["Price gap", "Implied all-in vs advertised + HST + licensing", "+$1,877", "ask"],
      ["Rate gap", "7.99% quoted vs your 5.99% pre-approval, over 84 months", "+$2,371", "ask"],
      ["Trade gap", "$8,000 trade-in value vs your $9,200 outside offer", "−$1,200", "ask"],
    ]);
  });

  it("omits rows with no benchmark", () => {
    expect(gapRows(quote, {}, verdict(quote)).map((r) => r.title)).toEqual(["Price gap"]);
  });
});

describe("askFor", () => {
  it("lists all four chips for the worked example", () => {
    expect(askFor(quote, worked)).toEqual([
      "Itemized bill of sale",
      "The buy rate",
      "Trade appraisal sheet",
      "Same price at 60 months",
    ]);
  });

  it("always asks for the itemized bill of sale and nothing else when all gaps match", () => {
    const short = { ...quote, termMonths: 60 };
    const v = verdict(short);
    expect(askFor(short, { ...v, gaps: v.gaps.map((g) => ({ ...g, level: "match" as const })) })).toEqual([
      "Itemized bill of sale",
    ]);
  });

  it("only offers the 60-month comparison on terms longer than 60 months", () => {
    const q = { ...quote, termMonths: 72 };
    expect(askFor(q, verdict(q, benchmarks))).toContain("Same price at 60 months");
    const q60 = { ...quote, termMonths: 60 };
    expect(askFor(q60, verdict(q60, benchmarks))).not.toContain("Same price at 60 months");
  });
});

describe("tenMinutesText", () => {
  it("summarises the quote, the reversed numbers and the flagged gaps", () => {
    expect(tenMinutesText(quote, worked)).toBe(
      [
        "I'm at the dealership and need 10 minutes before I sign anything.",
        "Their quote: $450 monthly for 84 months at 7.99% APR, $3,000 down.",
        "Reversed, that is $28,881 financed and $34,881 all-in.",
        "Gaps to ask about: price +$1,877, rate +$2,371, trade −$1,200.",
        "Can you look it over with me?",
      ].join("\n"),
    );
  });

  it("leaves out the gaps line when nothing is flagged and shows cents when the payment has them", () => {
    const q = { ...quote, payment: cents(20850), frequency: "biweekly" as const };
    const text = tenMinutesText(q, verdict(withoutAdvertised(q)));
    expect(text).toContain("$208.50 bi-weekly");
    expect(text).not.toContain("Gaps to ask about");
  });
});

describe("walkAwayLine", () => {
  it("reads the worked example against a $33,000 walk-away", () => {
    expect(walkAwayLine(worked.figures.impliedAllIn, cents(3300000))).toBe("$1,881 over your walk-away of $33,000.");
  });

  it("says under, and says when it lands right on it", () => {
    expect(walkAwayLine(cents(3200000), cents(3300000))).toBe("$1,000 under your walk-away of $33,000.");
    expect(walkAwayLine(cents(3300040), cents(3300000))).toBe("Right at your walk-away of $33,000.");
  });
});
