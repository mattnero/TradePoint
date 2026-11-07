import { emptyDecoder, readDecoder } from "../src/decoder/inputs";
import type { DealQuote } from "../src/model/deal";
import { cents } from "../src/model/money";
import {
  MAX_LABEL_LENGTH,
  addDeal,
  cleanLabel,
  createSavedDeal,
  defaultLabel,
  findSaved,
  newestFirst,
  parseSavedDeal,
  removeDeal,
  renameDeal,
  savedDealInputs,
  savedLine,
  type SavedDeal,
} from "../src/model/savedDeal";

const workedQuote: DealQuote = {
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

const worked: SavedDeal = {
  id: "d1",
  label: "Honda of Oakville",
  savedAt: "2026-11-07",
  quote: workedQuote,
  benchmarks: { preApprovalApr: 0.0599, outsideTradeOffer: cents(920000) },
  vehicleId: "v-santa-fe",
};

const stored = (deal: SavedDeal) => JSON.parse(JSON.stringify(deal)) as unknown;

describe("parseSavedDeal", () => {
  it("reads back a deal exactly as it was stored", () => {
    expect(parseSavedDeal(stored(worked))).toEqual(worked);
  });

  it("reads a deal with no advertised price, no benchmarks and no vehicle", () => {
    const { advertisedPrice: _, ...quote } = workedQuote;
    const bare: SavedDeal = { id: "d2", label: "Kia", savedAt: "2026-11-07", quote, benchmarks: {} };
    expect(parseSavedDeal(stored(bare))).toEqual(bare);
  });

  it("drops fields it does not know", () => {
    const extra = { ...(stored(worked) as object), colour: "red", quote: { ...workedQuote, note: "x" } };
    expect(parseSavedDeal(extra)).toEqual(worked);
  });

  it.each([
    ["not an object", 5],
    ["null", null],
    ["a missing id", { ...worked, id: undefined }],
    ["an empty id", { ...worked, id: "" }],
    ["a blank label", { ...worked, label: "   " }],
    ["a label that is not text", { ...worked, label: 7 }],
    ["a savedAt that is not a date", { ...worked, savedAt: "yesterday" }],
    ["a missing quote", { ...worked, quote: undefined }],
    ["a zero payment", { ...worked, quote: { ...workedQuote, payment: 0 } }],
    ["a fractional payment", { ...worked, quote: { ...workedQuote, payment: 450.5 } }],
    ["an unknown frequency", { ...worked, quote: { ...workedQuote, frequency: "daily" } }],
    ["a term of zero", { ...worked, quote: { ...workedQuote, termMonths: 0 } }],
    ["a term past ten years", { ...worked, quote: { ...workedQuote, termMonths: 121 } }],
    ["a rate written as a percent", { ...worked, quote: { ...workedQuote, apr: 7.99 } }],
    ["a negative down payment", { ...worked, quote: { ...workedQuote, downPayment: -1 } }],
    ["a text trade allowance", { ...worked, quote: { ...workedQuote, tradeAllowance: "8000" } }],
    ["a missing trade payoff", { ...worked, quote: { ...workedQuote, tradePayoff: undefined } }],
    ["an unknown province", { ...worked, quote: { ...workedQuote, province: "QC" } }],
    ["an advertised price of zero", { ...worked, quote: { ...workedQuote, advertisedPrice: 0 } }],
    ["benchmarks that are not an object", { ...worked, benchmarks: 3 }],
    ["a pre-approval written as a percent", { ...worked, benchmarks: { preApprovalApr: 5.99 } }],
    ["a negative outside offer", { ...worked, benchmarks: { outsideTradeOffer: -5 } }],
    ["a vehicle id that is not text", { ...worked, vehicleId: 4 }],
  ])("rejects %s", (_name, value) => {
    expect(parseSavedDeal(JSON.parse(JSON.stringify(value ?? null)))).toBeNull();
  });
});

describe("savedDealInputs", () => {
  it("restores the decoder so it reads back the same quote and benchmarks", () => {
    const reading = readDecoder(savedDealInputs(worked, ""));
    expect(reading.quote).toEqual(workedQuote);
    expect(reading.benchmarks).toEqual(worked.benchmarks);
    expect(reading.problems).toEqual({});
  });

  it("round-trips a bi-weekly quote typed into the decoder with odd cents and no extras", () => {
    const typed = readDecoder({
      ...emptyDecoder(),
      payment: "193.94",
      frequency: "biweekly",
      term: "72",
      apr: "6.495",
    });
    const deal: SavedDeal = { id: "d3", label: "Toyota", savedAt: "2026-11-07", quote: typed.quote!, benchmarks: {} };
    const inputs = savedDealInputs(parseSavedDeal(stored(deal))!, "");
    expect(inputs.advertised).toBe("");
    expect(inputs.preApprovalApr).toBe("");
    expect(inputs.outsideOffer).toBe("");
    expect(readDecoder(inputs).quote).toEqual(typed.quote);
  });

  it("keeps the walk-away it is given, since that is yours and not the deal's", () => {
    expect(savedDealInputs(worked, "33000").walkAway).toBe("33000");
  });
});

describe("labels", () => {
  it("trims and caps a label", () => {
    expect(cleanLabel("  Honda of Oakville  ")).toBe("Honda of Oakville");
    expect(cleanLabel("x".repeat(100))).toHaveLength(MAX_LABEL_LENGTH);
  });

  it("is empty for a blank label so the caller can choose a default", () => {
    expect(cleanLabel("   ")).toBe("");
  });

  it("numbers the default label after the deals already saved", () => {
    expect(defaultLabel([])).toBe("Deal 1");
    expect(defaultLabel([worked, { ...worked, id: "d2" }])).toBe("Deal 3");
  });
});

describe("createSavedDeal", () => {
  it("uses the cleaned label, or the default when it is blank", () => {
    const made = createSavedDeal({
      id: "n1",
      label: "  Ford  ",
      today: "2026-11-07",
      quote: workedQuote,
      benchmarks: {},
      existing: [],
    });
    expect(made).toEqual({ id: "n1", label: "Ford", savedAt: "2026-11-07", quote: workedQuote, benchmarks: {} });
    const unnamed = createSavedDeal({
      id: "n2",
      label: "",
      today: "2026-11-07",
      quote: workedQuote,
      benchmarks: {},
      existing: [worked],
    });
    expect(unnamed.label).toBe("Deal 2");
  });

  it("records the vehicle only when one is given", () => {
    const made = createSavedDeal({
      id: "n1",
      label: "Ford",
      today: "2026-11-07",
      quote: workedQuote,
      benchmarks: {},
      existing: [],
      vehicleId: "v1",
    });
    expect(made.vehicleId).toBe("v1");
  });

  it("produces something the parser accepts", () => {
    const made = createSavedDeal({
      id: "n1",
      label: "",
      today: "2026-11-07",
      quote: workedQuote,
      benchmarks: worked.benchmarks,
      existing: [],
    });
    expect(parseSavedDeal(stored(made))).toEqual(made);
  });
});

describe("list changes", () => {
  const a = { ...worked, id: "a", label: "A" };
  const b = { ...worked, id: "b", label: "B" };
  const c = { ...worked, id: "c", label: "C" };

  it("adds to the end and lists newest first", () => {
    const deals = addDeal(addDeal(addDeal([], a), b), c);
    expect(deals.map((d) => d.id)).toEqual(["a", "b", "c"]);
    expect(newestFirst(deals).map((d) => d.id)).toEqual(["c", "b", "a"]);
    expect(deals.map((d) => d.id)).toEqual(["a", "b", "c"]);
  });

  it("renames one deal and leaves the rest alone", () => {
    const renamed = renameDeal([a, b], "b", "  Big Box Motors ");
    expect(renamed).toEqual([a, { ...b, label: "Big Box Motors" }]);
  });

  it("ignores a blank rename", () => {
    const deals = [a, b];
    expect(renameDeal(deals, "a", "  ")).toBe(deals);
  });

  it("removes one deal by id", () => {
    expect(removeDeal([a, b, c], "b")).toEqual([a, c]);
    expect(removeDeal([a], "missing")).toEqual([a]);
  });
});

describe("findSaved", () => {
  it("finds the saved deal with the same quote and benchmarks", () => {
    expect(findSaved([worked], { ...workedQuote }, { ...worked.benchmarks })).toBe(worked);
  });

  it("treats a different payment, a missing advertised price or other benchmarks as a different deal", () => {
    const { advertisedPrice: _, ...noPrice } = workedQuote;
    expect(findSaved([worked], { ...workedQuote, payment: cents(44999) }, worked.benchmarks)).toBeUndefined();
    expect(findSaved([worked], noPrice, worked.benchmarks)).toBeUndefined();
    expect(findSaved([worked], workedQuote, { preApprovalApr: 0.0599 })).toBeUndefined();
  });
});

describe("savedLine", () => {
  it("gives the all-in, the verdict and when it was saved", () => {
    expect(savedLine(worked, "2026-11-07")).toBe("$34,881 all-in · Numbers don't match · Saved today");
    expect(savedLine(worked, "2026-12-01")).toBe("$34,881 all-in · Numbers don't match · Saved Nov 7");
    expect(savedLine(worked, "2027-01-03")).toBe("$34,881 all-in · Numbers don't match · Saved Nov 7, 2026");
  });

  it("matches the verdict a deal with no benchmarks or price would get", () => {
    const { advertisedPrice: _, ...quote } = workedQuote;
    expect(savedLine({ ...worked, quote, benchmarks: {} }, "2026-11-07")).toBe("$34,881 all-in · Numbers match · Saved today");
  });
});
