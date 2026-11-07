import { formatPercentInput, type DecoderInputs } from "../decoder/inputs";
import type { PaymentFrequency } from "../math/loan";
import { monthName } from "./cliffCopy";
import { isIsoDate, monthOf, type IsoDate } from "./dates";
import type { DealQuote } from "./deal";
import { cents, formatCAD, formatInputMoney, type Cents } from "./money";
import { headline, verdict, type Benchmarks } from "./verdict";

export interface SavedDeal {
  id: string;
  label: string;
  savedAt: IsoDate;
  quote: DealQuote;
  benchmarks: Benchmarks;
  vehicleId?: string;
}

export const MAX_LABEL_LENGTH = 40;

const FREQUENCIES: PaymentFrequency[] = ["monthly", "biweekly", "weekly"];
const MAX_TERM_MONTHS = 120;

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseQuote(value: unknown): DealQuote | null {
  if (typeof value !== "object" || value === null) return null;
  const q = value as Record<string, unknown>;
  if (!isCount(q.payment) || q.payment === 0) return null;
  if (!FREQUENCIES.includes(q.frequency as PaymentFrequency)) return null;
  if (!isCount(q.termMonths) || q.termMonths < 1 || q.termMonths > MAX_TERM_MONTHS) return null;
  if (!isRate(q.apr)) return null;
  if (!isCount(q.downPayment) || !isCount(q.tradeAllowance) || !isCount(q.tradePayoff)) return null;
  if (q.province !== "ON") return null;
  const quote: DealQuote = {
    payment: cents(q.payment),
    frequency: q.frequency as PaymentFrequency,
    termMonths: q.termMonths,
    apr: q.apr,
    downPayment: cents(q.downPayment),
    tradeAllowance: cents(q.tradeAllowance),
    tradePayoff: cents(q.tradePayoff),
    province: "ON",
  };
  if (q.advertisedPrice !== undefined) {
    if (!isCount(q.advertisedPrice) || q.advertisedPrice === 0) return null;
    quote.advertisedPrice = cents(q.advertisedPrice);
  }
  return quote;
}

function parseBenchmarks(value: unknown): Benchmarks | null {
  if (typeof value !== "object" || value === null) return null;
  const b = value as Record<string, unknown>;
  const benchmarks: Benchmarks = {};
  if (b.preApprovalApr !== undefined) {
    if (!isRate(b.preApprovalApr)) return null;
    benchmarks.preApprovalApr = b.preApprovalApr;
  }
  if (b.outsideTradeOffer !== undefined) {
    if (!isCount(b.outsideTradeOffer)) return null;
    benchmarks.outsideTradeOffer = cents(b.outsideTradeOffer);
  }
  return benchmarks;
}

export function parseSavedDeal(value: unknown): SavedDeal | null {
  if (typeof value !== "object" || value === null) return null;
  const d = value as Record<string, unknown>;
  if (!isText(d.id) || !isText(d.label) || !isIsoDate(d.savedAt)) return null;
  const quote = parseQuote(d.quote);
  const benchmarks = parseBenchmarks(d.benchmarks);
  if (quote === null || benchmarks === null) return null;
  const deal: SavedDeal = { id: d.id, label: d.label, savedAt: d.savedAt, quote, benchmarks };
  if (d.vehicleId !== undefined) {
    if (!isText(d.vehicleId)) return null;
    deal.vehicleId = d.vehicleId;
  }
  return deal;
}

function optionalMoney(amount: Cents | undefined): string {
  return amount === undefined ? "" : formatInputMoney(amount);
}

export function savedDealInputs(deal: SavedDeal, walkAway: string): DecoderInputs {
  const { quote, benchmarks } = deal;
  return {
    payment: formatInputMoney(quote.payment),
    frequency: quote.frequency,
    term: String(quote.termMonths),
    apr: formatPercentInput(quote.apr),
    down: formatInputMoney(quote.downPayment),
    advertised: optionalMoney(quote.advertisedPrice),
    tradeAllowance: formatInputMoney(quote.tradeAllowance),
    tradePayoff: formatInputMoney(quote.tradePayoff),
    preApprovalApr: benchmarks.preApprovalApr === undefined ? "" : formatPercentInput(benchmarks.preApprovalApr),
    outsideOffer: optionalMoney(benchmarks.outsideTradeOffer),
    walkAway,
  };
}

export function cleanLabel(input: string): string {
  return input.trim().slice(0, MAX_LABEL_LENGTH).trim();
}

export function defaultLabel(existing: SavedDeal[]): string {
  return `Deal ${existing.length + 1}`;
}

export function createSavedDeal(input: {
  id: string;
  label: string;
  today: IsoDate;
  quote: DealQuote;
  benchmarks: Benchmarks;
  existing: SavedDeal[];
  vehicleId?: string;
}): SavedDeal {
  const deal: SavedDeal = {
    id: input.id,
    label: cleanLabel(input.label) || defaultLabel(input.existing),
    savedAt: input.today,
    quote: input.quote,
    benchmarks: input.benchmarks,
  };
  if (input.vehicleId !== undefined) deal.vehicleId = input.vehicleId;
  return deal;
}

export function addDeal(deals: SavedDeal[], deal: SavedDeal): SavedDeal[] {
  return [...deals, deal];
}

export function renameDeal(deals: SavedDeal[], id: string, label: string): SavedDeal[] {
  const cleaned = cleanLabel(label);
  if (cleaned === "") return deals;
  return deals.map((d) => (d.id === id ? { ...d, label: cleaned } : d));
}

export function removeDeal(deals: SavedDeal[], id: string): SavedDeal[] {
  return deals.filter((d) => d.id !== id);
}

export function newestFirst(deals: SavedDeal[]): SavedDeal[] {
  return [...deals].reverse();
}

function sameQuote(a: DealQuote, b: DealQuote): boolean {
  return (
    a.payment === b.payment &&
    a.frequency === b.frequency &&
    a.termMonths === b.termMonths &&
    a.apr === b.apr &&
    a.downPayment === b.downPayment &&
    a.tradeAllowance === b.tradeAllowance &&
    a.tradePayoff === b.tradePayoff &&
    a.province === b.province &&
    a.advertisedPrice === b.advertisedPrice
  );
}

function sameBenchmarks(a: Benchmarks, b: Benchmarks): boolean {
  return a.preApprovalApr === b.preApprovalApr && a.outsideTradeOffer === b.outsideTradeOffer;
}

export function findSaved(deals: SavedDeal[], quote: DealQuote, benchmarks: Benchmarks): SavedDeal | undefined {
  return deals.find((d) => sameQuote(d.quote, quote) && sameBenchmarks(d.benchmarks, benchmarks));
}

function savedOn(savedAt: IsoDate, today: IsoDate): string {
  if (savedAt === today) return "Saved today";
  const { year, month } = monthOf(savedAt);
  const day = Number(savedAt.slice(8, 10));
  const base = `Saved ${monthName(month)} ${day}`;
  return year === monthOf(today).year ? base : `${base}, ${year}`;
}

export function savedLine(deal: SavedDeal, today: IsoDate): string {
  const result = verdict(deal.quote, deal.benchmarks);
  return `${formatCAD(result.figures.impliedAllIn)} all-in · ${headline(result.level)} · ${savedOn(deal.savedAt, today)}`;
}
