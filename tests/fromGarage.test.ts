import { garageDecoderValues, mergeGarageValues, type GarageValues } from "../src/decoder/fromGarage";
import { emptyDecoder, readDecoder, type DecoderInputs } from "../src/decoder/inputs";
import { verdict } from "../src/model/verdict";
import { cents } from "../src/model/money";
import type { Vehicle } from "../src/model/vehicle";

const santaFe: Vehicle = {
  id: "v",
  year: 2022,
  make: "Hyundai",
  model: "Santa Fe",
  odometer: [{ date: "2026-11-02", km: 86800 }],
  loan: { kind: "snapshot", balance: cents(1510000), apr: 0.0449, monthsRemaining: 30, asOf: "2026-11-02" },
  prep: {
    preApprovalApr: 0.0599,
    tradeOffers: [
      { source: "Second dealer", amount: cents(875000), date: "2026-11-01" },
      { source: "Clutch", amount: cents(920000), date: "2026-11-02" },
    ],
    walkAway: cents(3300000),
  },
};

describe("garageDecoderValues", () => {
  it("fills the payoff from the loan balance today, and the prep figures from the vehicle", () => {
    expect(garageDecoderValues(santaFe, "2027-05-02")).toEqual({
      tradePayoff: "12213.81",
      preApprovalApr: "5.99",
      outsideOffer: "9200",
      walkAway: "33000",
    });
  });

  it("uses the full balance on the day the loan snapshot was taken", () => {
    expect(garageDecoderValues(santaFe, "2026-11-02").tradePayoff).toBe("15100");
  });

  it("writes a paid-off loan as zero rather than leaving the payoff blank", () => {
    expect(garageDecoderValues(santaFe, "2030-01-01").tradePayoff).toBe("0");
  });

  it("leaves out whatever the garage does not know", () => {
    const { loan: _l, prep: _p, ...bare } = santaFe;
    expect(garageDecoderValues(bare, "2026-11-02")).toEqual({});
    const oneOffer = { tradeOffers: [{ source: "Clutch", amount: cents(920000) }] };
    expect(garageDecoderValues({ ...bare, prep: oneOffer }, "2026-11-02")).toEqual({
      outsideOffer: "9200",
    });
  });

  it("never fills the trade allowance, which is the dealer's number", () => {
    expect(garageDecoderValues(santaFe, "2027-05-02")).not.toHaveProperty("tradeAllowance");
  });
});

describe("mergeGarageValues", () => {
  const garage: GarageValues = { tradePayoff: "12213.81", preApprovalApr: "5.99", outsideOffer: "9200" };

  it("fills blank fields", () => {
    const merged = mergeGarageValues(emptyDecoder(), {}, garage);
    expect(merged).toMatchObject(garage);
  });

  it("keeps what the user already typed", () => {
    const typed: DecoderInputs = { ...emptyDecoder(), tradePayoff: "11000", outsideOffer: "9500" };
    const merged = mergeGarageValues(typed, {}, garage);
    expect(merged.tradePayoff).toBe("11000");
    expect(merged.outsideOffer).toBe("9500");
    expect(merged.preApprovalApr).toBe("5.99");
  });

  it("refreshes a value that was only ever the garage's own earlier number", () => {
    const earlier: GarageValues = { tradePayoff: "13000" };
    const current: DecoderInputs = { ...emptyDecoder(), tradePayoff: "13000" };
    expect(mergeGarageValues(current, earlier, garage).tradePayoff).toBe("12213.81");
  });

  it("does not touch fields the garage has nothing for", () => {
    const current: DecoderInputs = { ...emptyDecoder(), payment: "450", tradeAllowance: "8000" };
    const merged = mergeGarageValues(current, {}, { tradePayoff: "5000" });
    expect(merged.payment).toBe("450");
    expect(merged.tradeAllowance).toBe("8000");
    expect(merged.outsideOffer).toBe("");
  });
});

describe("a garage with a loan feeds a verdict that includes the trade gap", () => {
  it("reads as the mockup deal once the dealer's numbers are typed in", () => {
    const filled = mergeGarageValues(
      {
        ...emptyDecoder(),
        payment: "450",
        term: "84",
        apr: "7.99",
        down: "3000",
        advertised: "29995",
        tradeAllowance: "8000",
      },
      {},
      { ...garageDecoderValues({ ...santaFe, loan: { kind: "snapshot", balance: cents(500000), apr: 0.0449, monthsRemaining: 30, asOf: "2026-11-02" } }, "2026-11-02") },
    );
    expect(filled.tradePayoff).toBe("5000");
    const { quote, benchmarks } = readDecoder(filled);
    const v = verdict(quote!, benchmarks);
    expect(v.gaps.map((g) => g.kind)).toEqual(["price", "rate", "trade"]);
    expect(Math.round(v.gaps[2]!.amount / 100)).toBe(-1200);
  });
});
