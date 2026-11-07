import { decodeDeal, planPayment, type PlanInputs } from "../src/math/deal";
import { readPlan, type DecoderInputs } from "../src/decoder/inputs";
import { dealFigures, paymentPlan } from "../src/model/deal";
import { cents } from "../src/model/money";

const shopping: PlanInputs = {
  frequency: "monthly",
  termMonths: 84,
  apr: 0.0799,
  downPayment: 3000,
  tradeAllowance: 8000,
  tradePayoff: 5000,
  province: "ON",
  advertisedPrice: 29995,
};

describe("planPayment", () => {
  const plan = planPayment(shopping);

  it("prices the worked example's car the way Ontario says it should be sold", () => {
    expect(plan.salesTax).toBeCloseTo(2859.35, 2);
    expect(plan.licensing).toBe(150);
    expect(plan.allIn).toBeCloseTo(33004.35, 2);
  });

  it("finances the all-in less the down payment and the trade equity", () => {
    expect(plan.netTradeEquity).toBe(3000);
    expect(plan.amountFinanced).toBeCloseTo(27004.35, 2);
  });

  it("is $420.76 a month at 7.99% over 84 months", () => {
    expect(plan.payment).toBeCloseTo(420.76, 2);
    expect(Math.round(plan.totalInterest)).toBe(8340);
    expect(Math.round(plan.totalPaid)).toBe(41344);
  });

  it("is what the decoder would call a matching quote", () => {
    const decoded = decodeDeal({ ...shopping, payment: plan.payment });
    expect(decoded.unexplainedGap).toBeCloseTo(0, 6);
  });

  it("works at the chosen frequency", () => {
    expect(planPayment({ ...shopping, frequency: "biweekly" }).payment).toBeCloseTo(193.94, 2);
  });

  it("rolls negative trade equity into the loan", () => {
    const upsideDown = planPayment({ ...shopping, tradeAllowance: 8000, tradePayoff: 11000 });
    expect(upsideDown.netTradeEquity).toBe(-3000);
    expect(upsideDown.amountFinanced).toBeCloseTo(33004.35, 2);
  });

  it("splits evenly at 0%", () => {
    const free = planPayment({ ...shopping, apr: 0, termMonths: 60 });
    expect(free.payment).toBeCloseTo(27004.35 / 60, 6);
    expect(free.totalInterest).toBeCloseTo(0, 6);
  });

  it("has nothing to finance when cash and trade cover the price", () => {
    const covered = planPayment({ ...shopping, downPayment: 40000 });
    expect(covered.amountFinanced).toBe(0);
    expect(covered.payment).toBe(0);
    expect(covered.totalInterest).toBe(0);
    expect(covered.totalPaid).toBe(40000 + 3000);
  });
});

describe("paymentPlan (cents)", () => {
  const plan = paymentPlan({
    frequency: "monthly",
    termMonths: 84,
    apr: 0.0799,
    downPayment: cents(300000),
    tradeAllowance: cents(800000),
    tradePayoff: cents(500000),
    province: "ON",
    advertisedPrice: cents(2999500),
  });

  it("rounds the payment to the cent and totals from the rounded payment", () => {
    expect(plan.payment).toBe(42076);
    expect(plan.totalPaid).toBe(42076 * 84 + 600000);
    expect(plan.totalInterest).toBe(42076 * 84 - plan.amountFinanced);
  });

  it("gives the breakdown in cents", () => {
    expect(plan.advertisedPrice).toBe(2999500);
    expect(plan.salesTax).toBe(285935);
    expect(plan.licensing).toBe(15000);
    expect(plan.allIn).toBe(3300435);
    expect(plan.amountFinanced).toBe(2700435);
  });

  it("checks out within a dollar when the rounded payment is decoded", () => {
    const figures = dealFigures({
      payment: plan.payment,
      frequency: "monthly",
      termMonths: 84,
      apr: 0.0799,
      downPayment: cents(300000),
      tradeAllowance: cents(800000),
      tradePayoff: cents(500000),
      province: "ON",
      advertisedPrice: cents(2999500),
    });
    expect(Math.abs(figures.unexplainedGap ?? Infinity)).toBeLessThan(100);
  });
});

describe("readPlan", () => {
  const inputs: DecoderInputs = {
    payment: "",
    frequency: "monthly",
    term: "84",
    apr: "7.99",
    down: "3,000",
    advertised: "29995",
    tradeAllowance: "8000",
    tradePayoff: "5000",
    preApprovalApr: "",
    outsideOffer: "",
    walkAway: "",
  };

  it("reads the shopping inputs in cents", () => {
    expect(readPlan(inputs).plan).toEqual({
      frequency: "monthly",
      termMonths: 84,
      apr: 0.0799,
      downPayment: 300000,
      tradeAllowance: 800000,
      tradePayoff: 500000,
      province: "ON",
      advertisedPrice: 2999500,
    });
  });

  it("needs the price, term and rate", () => {
    expect(readPlan({ ...inputs, advertised: "" }).plan).toBeNull();
    expect(readPlan({ ...inputs, term: "" }).plan).toBeNull();
    expect(readPlan({ ...inputs, apr: "" }).plan).toBeNull();
  });

  it("treats blank down payment and trade fields as zero", () => {
    const plan = readPlan({ ...inputs, down: "", tradeAllowance: "", tradePayoff: "" }).plan;
    expect(plan?.downPayment).toBe(0);
    expect(plan?.tradeAllowance).toBe(0);
    expect(plan?.tradePayoff).toBe(0);
  });

  it("ignores the quote-only fields it doesn't show", () => {
    const reading = readPlan({ ...inputs, payment: "lots", preApprovalApr: "x", outsideOffer: "x", walkAway: "x" });
    expect(reading.problems).toEqual({});
    expect(reading.plan).not.toBeNull();
  });

  it("gives no plan while a shown field can't be read, so it never guesses zero", () => {
    const reading = readPlan({ ...inputs, down: "3k" });
    expect(reading.plan).toBeNull();
    expect(reading.problems.down).toBeDefined();
  });

  it("rejects a zero price", () => {
    const reading = readPlan({ ...inputs, advertised: "0" });
    expect(reading.plan).toBeNull();
    expect(reading.problems.advertised).toBeDefined();
  });
});
