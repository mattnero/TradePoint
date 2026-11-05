import { decodeShare, encodeShare } from "../src/share/codec";
import { emptyDecoder, readDecoder, type DecoderInputs } from "../src/decoder/inputs";

const workedExample: DecoderInputs = {
  payment: "450",
  frequency: "monthly",
  term: "84",
  apr: "7.99",
  down: "3,000",
  advertised: "29995",
  tradeAllowance: "8000",
  tradePayoff: "5000",
  preApprovalApr: "5.99",
  outsideOffer: "9200",
  walkAway: "",
};

function encodeInputs(inputs: DecoderInputs): string {
  const { quote, benchmarks } = readDecoder(inputs);
  if (!quote) throw new Error("fixture does not read");
  return encodeShare(quote, benchmarks);
}

function raw(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("round trip", () => {
  it("restores the worked example exactly", () => {
    const code = encodeInputs(workedExample);
    const decoded = decodeShare(code);
    expect(decoded).not.toBeNull();
    expect(readDecoder(decoded!)).toEqual(readDecoder(workedExample));
  });

  it("restores the decoder strings in plain form for editing", () => {
    expect(decodeShare(encodeInputs(workedExample))).toEqual({
      ...workedExample,
      down: "3000",
    });
  });

  it("round-trips a bi-weekly deal with cents and a fractional rate", () => {
    const inputs: DecoderInputs = {
      ...emptyDecoder(),
      payment: "208.50",
      frequency: "biweekly",
      term: "72",
      apr: "6.249",
      down: "0",
    };
    const decoded = decodeShare(encodeInputs(inputs))!;
    expect(decoded.payment).toBe("208.50");
    expect(decoded.frequency).toBe("biweekly");
    expect(decoded.apr).toBe("6.249");
    expect(readDecoder(decoded)).toEqual(readDecoder(inputs));
  });

  it("round-trips weekly and a 0% rate", () => {
    const inputs: DecoderInputs = { ...emptyDecoder(), payment: "120", frequency: "weekly", term: "48", apr: "0" };
    const decoded = decodeShare(encodeInputs(inputs))!;
    expect(decoded.frequency).toBe("weekly");
    expect(decoded.apr).toBe("0");
  });

  it("keeps optional fields absent rather than zero", () => {
    const inputs: DecoderInputs = { ...workedExample, advertised: "", preApprovalApr: "", outsideOffer: "" };
    const decoded = decodeShare(encodeInputs(inputs))!;
    expect(decoded.advertised).toBe("");
    expect(decoded.preApprovalApr).toBe("");
    expect(decoded.outsideOffer).toBe("");
  });

  it("keeps a zero benchmark distinct from an absent one", () => {
    const decoded = decodeShare(encodeInputs({ ...workedExample, outsideOffer: "0" }))!;
    expect(decoded.outsideOffer).toBe("0");
  });
});

describe("walk-away", () => {
  it("never goes into the link", () => {
    const withWalkAway = { ...workedExample, walkAway: "33000" };
    expect(encodeInputs(withWalkAway)).toBe(encodeInputs(workedExample));
    expect(decodeShare(encodeInputs(withWalkAway))!.walkAway).toBe("");
  });
});

describe("code shape", () => {
  const code = encodeInputs(workedExample);

  it("is URL-safe with no padding", () => {
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is compact enough to paste in a text message", () => {
    expect(code.length).toBeLessThan(120);
  });

  it("is stable for the same deal", () => {
    expect(encodeInputs(workedExample)).toBe(code);
  });

  it("starts with the format version", () => {
    expect(JSON.parse(atob(code.replace(/-/g, "+").replace(/_/g, "/")))[0]).toBe(1);
  });
});

describe("rejects bad codes", () => {
  const good = [1, 45000, 0, 84, 7990, 300000, 800000, 500000, 2999500, 5990, 920000];

  it("accepts the hand-built reference array", () => {
    expect(decodeShare(raw(good))).not.toBeNull();
  });

  it.each([
    ["empty", ""],
    ["not base64", "!!!"],
    ["not JSON", btoa("hello").replace(/=+$/, "")],
    ["not an array", raw({ v: 1 })],
    ["unknown version", raw([2, ...good.slice(1)])],
    ["too short", raw(good.slice(0, 8))],
    ["too long", raw([...good, 1])],
    ["string where a number belongs", raw([1, "45000", ...good.slice(2)])],
    ["fractional cents", raw([1, 450.5, ...good.slice(2)])],
    ["negative money", raw([1, 45000, 0, 84, 7990, -1, ...good.slice(6)])],
    ["zero payment", raw([1, 0, ...good.slice(2)])],
    ["unknown frequency", raw([1, 45000, 3, ...good.slice(3)])],
    ["term over the limit", raw([1, 45000, 0, 400, ...good.slice(4)])],
    ["rate over 100%", raw([1, 45000, 0, 84, 100001, ...good.slice(5)])],
    ["null where required", raw([1, 45000, 0, null, ...good.slice(4)])],
    ["number past safe integer", raw([1, 1e20, ...good.slice(2)])],
  ])("%s", (_name, code) => {
    expect(decodeShare(code)).toBeNull();
  });

  it("does not throw on non-string junk", () => {
    expect(decodeShare("\u0000￿")).toBeNull();
  });
});
