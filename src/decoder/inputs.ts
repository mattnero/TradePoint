import type { PaymentFrequency } from "../math/loan";
import type { DealQuote } from "../model/deal";
import { cents, parseMoneyInput, type Cents } from "../model/money";
import type { Benchmarks } from "../model/verdict";

export interface DecoderInputs {
  payment: string;
  frequency: PaymentFrequency;
  term: string;
  apr: string;
  down: string;
  advertised: string;
  tradeAllowance: string;
  tradePayoff: string;
  preApprovalApr: string;
  outsideOffer: string;
}

export type DecoderField = Exclude<keyof DecoderInputs, "frequency">;

export type FieldProblems = Partial<Record<DecoderField, string>>;

export interface DecoderReading {
  quote: DealQuote | null;
  benchmarks: Benchmarks;
  problems: FieldProblems;
}

const MAX_TERM_MONTHS = 120;

const MONEY_EXAMPLES: Record<"down" | "advertised" | "tradeAllowance" | "tradePayoff" | "outsideOffer", string> = {
  down: "3000",
  advertised: "29995",
  tradeAllowance: "8000",
  tradePayoff: "5000",
  outsideOffer: "9200",
};

export function emptyDecoder(): DecoderInputs {
  return {
    payment: "",
    frequency: "monthly",
    term: "",
    apr: "",
    down: "",
    advertised: "",
    tradeAllowance: "",
    tradePayoff: "",
    preApprovalApr: "",
    outsideOffer: "",
  };
}

export function parsePercentInput(input: string): number | null {
  const cleaned = input.replace(/[\s%]/g, "").replace(",", ".");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const percent = Number(cleaned);
  return percent > 100 ? null : percent / 100;
}

export function formatPercentInput(rate: number): string {
  return String(Math.round(rate * 100 * 10_000) / 10_000);
}

function parseTerm(input: string): number | null {
  const cleaned = input.trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const months = Number(cleaned);
  return months >= 1 && months <= MAX_TERM_MONTHS ? months : null;
}

function optionalMoney(input: string): Cents | undefined {
  return parseMoneyInput(input) ?? undefined;
}

function isBlank(input: string): boolean {
  return input.trim() === "";
}

export function fieldProblems(inputs: DecoderInputs): FieldProblems {
  const problems: FieldProblems = {};
  if (!isBlank(inputs.payment)) {
    const payment = parseMoneyInput(inputs.payment);
    if (payment === null) problems.payment = "Enter the payment in dollars, like 450.";
    else if (payment <= 0) problems.payment = "The payment has to be more than $0.";
  }
  if (!isBlank(inputs.term) && parseTerm(inputs.term) === null) {
    problems.term = `Enter the term in whole months, 1 to ${MAX_TERM_MONTHS}.`;
  }
  if (!isBlank(inputs.apr) && parsePercentInput(inputs.apr) === null) {
    problems.apr = "Enter the rate as a percent, like 7.99.";
  }
  if (!isBlank(inputs.preApprovalApr) && parsePercentInput(inputs.preApprovalApr) === null) {
    problems.preApprovalApr = "Enter the rate as a percent, like 5.99.";
  }
  for (const [field, example] of Object.entries(MONEY_EXAMPLES) as [keyof typeof MONEY_EXAMPLES, string][]) {
    if (!isBlank(inputs[field]) && parseMoneyInput(inputs[field]) === null) {
      problems[field] = `Enter dollars only, like ${example}.`;
    }
  }
  return problems;
}

export function readDecoder(inputs: DecoderInputs): DecoderReading {
  const problems = fieldProblems(inputs);
  const benchmarks: Benchmarks = {};
  const preApprovalApr = parsePercentInput(inputs.preApprovalApr);
  if (preApprovalApr !== null) benchmarks.preApprovalApr = preApprovalApr;
  const outsideTradeOffer = optionalMoney(inputs.outsideOffer);
  if (outsideTradeOffer !== undefined) benchmarks.outsideTradeOffer = outsideTradeOffer;

  const payment = parseMoneyInput(inputs.payment);
  const termMonths = parseTerm(inputs.term);
  const apr = parsePercentInput(inputs.apr);
  if (
    Object.keys(problems).length > 0 ||
    payment === null ||
    payment <= 0 ||
    termMonths === null ||
    apr === null
  ) {
    return { quote: null, benchmarks, problems };
  }

  const quote: DealQuote = {
    payment,
    frequency: inputs.frequency,
    termMonths,
    apr,
    downPayment: optionalMoney(inputs.down) ?? cents(0),
    tradeAllowance: optionalMoney(inputs.tradeAllowance) ?? cents(0),
    tradePayoff: optionalMoney(inputs.tradePayoff) ?? cents(0),
    province: "ON",
  };
  const advertisedPrice = optionalMoney(inputs.advertised);
  if (advertisedPrice !== undefined) quote.advertisedPrice = advertisedPrice;
  return { quote, benchmarks, problems };
}
