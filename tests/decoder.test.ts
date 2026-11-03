import { emptyDecoder, parsePercentInput, readDecoder, type DecoderInputs } from "../src/decoder/inputs";
import { dealFigures } from "../src/model/deal";

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
};

describe("parsePercentInput", () => {
  it.each([
    ["7.99", 0.0799],
    [" 7.99% ", 0.0799],
    ["0", 0],
    ["6", 0.06],
    [".5", 0.005],
    ["5,99", 0.0599],
  ])("parses %j", (input, expected) => {
    expect(parsePercentInput(input)).toBeCloseTo(expected, 10);
  });

  it.each(["", "%", "abc", "-1", "7.9.9", "101"])("rejects %j", (input) => {
    expect(parsePercentInput(input)).toBeNull();
  });
});

describe("readDecoder", () => {
  it("reads the worked example into a quote and benchmarks", () => {
    const { quote, benchmarks } = readDecoder(workedExample);
    expect(quote).toEqual({
      payment: 45000,
      frequency: "monthly",
      termMonths: 84,
      apr: 0.0799,
      downPayment: 300000,
      tradeAllowance: 800000,
      tradePayoff: 500000,
      province: "ON",
      advertisedPrice: 2999500,
    });
    expect(benchmarks).toEqual({ preApprovalApr: 0.0599, outsideTradeOffer: 920000 });
  });

  it("shows $28,881 financed for the worked example", () => {
    const { quote } = readDecoder(workedExample);
    expect(Math.round(dealFigures(quote!).amountFinanced / 100)).toBe(28881);
  });

  it("needs payment, term and rate", () => {
    expect(readDecoder(emptyDecoder()).quote).toBeNull();
    expect(readDecoder({ ...workedExample, payment: "" }).quote).toBeNull();
    expect(readDecoder({ ...workedExample, term: "" }).quote).toBeNull();
    expect(readDecoder({ ...workedExample, apr: "" }).quote).toBeNull();
  });

  it("rejects a zero payment, a fractional term and an absurd term", () => {
    expect(readDecoder({ ...workedExample, payment: "0" }).quote).toBeNull();
    expect(readDecoder({ ...workedExample, term: "84.5" }).quote).toBeNull();
    expect(readDecoder({ ...workedExample, term: "0" }).quote).toBeNull();
    expect(readDecoder({ ...workedExample, term: "400" }).quote).toBeNull();
  });

  it("accepts a 0% rate", () => {
    expect(readDecoder({ ...workedExample, apr: "0" }).quote?.apr).toBe(0);
  });

  it("treats blank down payment and trade fields as zero", () => {
    const { quote } = readDecoder({ ...workedExample, down: "", tradeAllowance: "", tradePayoff: "" });
    expect(quote?.downPayment).toBe(0);
    expect(quote?.tradeAllowance).toBe(0);
    expect(quote?.tradePayoff).toBe(0);
  });

  it("leaves out advertised price and benchmarks when blank", () => {
    const { quote, benchmarks } = readDecoder({
      ...workedExample,
      advertised: "",
      preApprovalApr: "",
      outsideOffer: "",
    });
    expect(quote).not.toBeNull();
    expect(quote).not.toHaveProperty("advertisedPrice");
    expect(benchmarks).toEqual({});
  });

  it("carries the quoted frequency", () => {
    expect(readDecoder({ ...workedExample, frequency: "biweekly" }).quote?.frequency).toBe("biweekly");
  });
});
