import { cents } from "../src/model/money";
import {
  MAX_TRADE_OFFERS,
  addTradeOffer,
  bestTradeOffer,
  decoderBenchmarks,
  parsePrep,
  prepStatus,
  removeTradeOffer,
  updatePrep,
  type Prep,
  type TradeOffer,
} from "../src/model/prep";

const clutch: TradeOffer = { source: "Clutch", amount: cents(920000), date: "2026-11-01" };
const dealer: TradeOffer = { source: "Second dealer", amount: cents(875000), date: "2026-11-03" };

describe("bestTradeOffer", () => {
  it("is the higher offer, because that one could actually be taken", () => {
    expect(bestTradeOffer([dealer, clutch])).toBe(cents(920000));
  });

  it("is undefined with no offers", () => {
    expect(bestTradeOffer([])).toBeUndefined();
    expect(bestTradeOffer(undefined)).toBeUndefined();
  });
});

describe("decoderBenchmarks", () => {
  it("passes the pre-approval through and uses the best offer as the outside offer", () => {
    expect(decoderBenchmarks({ preApprovalApr: 0.0599, tradeOffers: [dealer, clutch], walkAway: cents(3300000) })).toEqual({
      preApprovalApr: 0.0599,
      outsideTradeOffer: cents(920000),
    });
  });

  it("leaves out what was never entered", () => {
    expect(decoderBenchmarks(undefined)).toEqual({});
    expect(decoderBenchmarks({ walkAway: cents(3300000) })).toEqual({});
  });
});

describe("prepStatus", () => {
  it("counts nothing done on an empty checklist", () => {
    expect(prepStatus(undefined)).toEqual({
      preApproval: false,
      tradeFigures: 0,
      walkAway: false,
      rules: false,
      done: 0,
      total: 4,
    });
  });

  it("counts the trade row done only with two figures", () => {
    expect(prepStatus({ tradeOffers: [clutch] }).done).toBe(0);
    expect(prepStatus({ tradeOffers: [clutch] }).tradeFigures).toBe(1);
    expect(prepStatus({ tradeOffers: [clutch, dealer] }).done).toBe(1);
  });

  it("counts every row on a finished checklist, including a 0% rate", () => {
    const full: Prep = {
      preApprovalApr: 0,
      tradeOffers: [clutch, dealer],
      walkAway: cents(3300000),
      rulesReadOn: "2026-11-04",
    };
    expect(prepStatus(full)).toEqual({
      preApproval: true,
      tradeFigures: 2,
      walkAway: true,
      rules: true,
      done: 4,
      total: 4,
    });
  });
});

describe("trade offers", () => {
  it("adds up to two", () => {
    const one = addTradeOffer({}, clutch);
    const two = addTradeOffer(one, dealer);
    expect(two.tradeOffers).toEqual([clutch, dealer]);
    expect(MAX_TRADE_OFFERS).toBe(2);
    expect(() => addTradeOffer(two, clutch)).toThrow(RangeError);
  });

  it("removes by position and drops the list when it empties", () => {
    const two: Prep = { walkAway: cents(100), tradeOffers: [clutch, dealer] };
    expect(removeTradeOffer(two, 0)).toEqual({ walkAway: cents(100), tradeOffers: [dealer] });
    expect(removeTradeOffer({ tradeOffers: [clutch] }, 0)).toEqual({});
  });
});

describe("parsePrep", () => {
  const full: Prep = {
    preApprovalApr: 0.0599,
    tradeOffers: [clutch, { source: "Outside offer", amount: cents(500000) }],
    walkAway: cents(3300000),
    rulesReadOn: "2026-11-04",
  };

  it("round-trips through JSON", () => {
    expect(parsePrep(JSON.parse(JSON.stringify(full)))).toEqual(full);
    expect(parsePrep({})).toEqual({});
  });

  it.each([
    ["null", null],
    ["a number", 5],
    ["pre-approval over 100%", { preApprovalApr: 1.5 }],
    ["offers not an array", { tradeOffers: clutch }],
    ["three offers", { tradeOffers: [clutch, dealer, clutch] }],
    ["an offer with no source", { tradeOffers: [{ amount: 100 }] }],
    ["an offer with a blank source", { tradeOffers: [{ source: " ", amount: 100 }] }],
    ["a fractional offer", { tradeOffers: [{ source: "Clutch", amount: 1.5 }] }],
    ["an offer with a bad date", { tradeOffers: [{ source: "Clutch", amount: 100, date: "2026-02-30" }] }],
    ["a negative walk-away", { walkAway: -1 }],
    ["a bad rules date", { rulesReadOn: "yesterday" }],
  ])("rejects %s", (_name, value) => {
    expect(parsePrep(value)).toBeNull();
  });
});

describe("updatePrep", () => {
  it("sets values and drops ones cleared to undefined", () => {
    const prep: Prep = { preApprovalApr: 0.0599, walkAway: cents(3300000) };
    expect(updatePrep(prep, { walkAway: undefined, rulesReadOn: "2026-11-04" })).toEqual({
      preApprovalApr: 0.0599,
      rulesReadOn: "2026-11-04",
    });
  });
});
