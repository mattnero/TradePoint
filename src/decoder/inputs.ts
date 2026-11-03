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

export interface DecoderReading {
  quote: DealQuote | null;
  benchmarks: Benchmarks;
}

const MAX_TERM_MONTHS = 120;

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

export function readDecoder(inputs: DecoderInputs): DecoderReading {
  const benchmarks: Benchmarks = {};
  const preApprovalApr = parsePercentInput(inputs.preApprovalApr);
  if (preApprovalApr !== null) benchmarks.preApprovalApr = preApprovalApr;
  const outsideTradeOffer = optionalMoney(inputs.outsideOffer);
  if (outsideTradeOffer !== undefined) benchmarks.outsideTradeOffer = outsideTradeOffer;

  const payment = parseMoneyInput(inputs.payment);
  const termMonths = parseTerm(inputs.term);
  const apr = parsePercentInput(inputs.apr);
  if (payment === null || payment <= 0 || termMonths === null || apr === null) {
    return { quote: null, benchmarks };
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
  return { quote, benchmarks };
}
