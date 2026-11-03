import { readDecoder, type DecoderInputs } from "../decoder/inputs";
import type { PaymentFrequency } from "../math/loan";
import type { DealQuote } from "../model/deal";
import { cents, formatInputMoney } from "../model/money";
import type { Benchmarks } from "../model/verdict";

const VERSION = 1;
const FIELD_COUNT = 11;
const FREQUENCIES: PaymentFrequency[] = ["monthly", "biweekly", "weekly"];
const RATE_SCALE = 100_000;

type Slot = number | null;

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const padded = code.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

function rateSlot(rate: number): number {
  return Math.round(rate * RATE_SCALE);
}

export function encodeShare(quote: DealQuote, benchmarks: Benchmarks): string {
  const slots: Slot[] = [
    VERSION,
    quote.payment,
    FREQUENCIES.indexOf(quote.frequency),
    quote.termMonths,
    rateSlot(quote.apr),
    quote.downPayment,
    quote.tradeAllowance,
    quote.tradePayoff,
    quote.advertisedPrice ?? null,
    benchmarks.preApprovalApr === undefined ? null : rateSlot(benchmarks.preApprovalApr),
    benchmarks.outsideTradeOffer ?? null,
  ];
  return toBase64Url(JSON.stringify(slots));
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isOptionalCount(value: unknown): value is Slot {
  return value === null || isCount(value);
}

function moneyText(amount: number): string {
  return formatInputMoney(cents(amount));
}

function percentText(slot: number): string {
  return String(slot / (RATE_SCALE / 100));
}

function optionalMoneyText(slot: Slot): string {
  return slot === null ? "" : moneyText(slot);
}

export function decodeShare(code: string): DecoderInputs | null {
  let slots: unknown;
  try {
    slots = JSON.parse(fromBase64Url(code));
  } catch {
    return null;
  }
  if (!Array.isArray(slots) || slots.length !== FIELD_COUNT || slots[0] !== VERSION) return null;

  const [, payment, frequency, term, apr, down, allowance, payoff, advertised, preApproval, offer] = slots;
  if (!isCount(payment) || !isCount(frequency) || !isCount(term) || !isCount(apr)) return null;
  if (!isCount(down) || !isCount(allowance) || !isCount(payoff)) return null;
  if (!isOptionalCount(advertised) || !isOptionalCount(preApproval) || !isOptionalCount(offer)) return null;
  const quotedFrequency = FREQUENCIES[frequency];
  if (quotedFrequency === undefined) return null;

  const inputs: DecoderInputs = {
    payment: moneyText(payment),
    frequency: quotedFrequency,
    term: String(term),
    apr: percentText(apr),
    down: moneyText(down),
    advertised: optionalMoneyText(advertised),
    tradeAllowance: moneyText(allowance),
    tradePayoff: moneyText(payoff),
    preApprovalApr: preApproval === null ? "" : percentText(preApproval),
    outsideOffer: optionalMoneyText(offer),
  };
  return readDecoder(inputs).quote === null ? null : inputs;
}
