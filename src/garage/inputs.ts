import { isIsoDate, type IsoDate } from "../model/dates";
import type { Loan } from "../model/loan";
import type { TradeOffer } from "../model/prep";
import { cents, parseMoneyInput, type Cents } from "../model/money";
import { medianPrice } from "../model/comps";
import type { NewVehicle, Purchase, ValueAnchor, ValueSource } from "../model/vehicle";
import { parsePercentInput } from "../decoder/inputs";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export interface NewVehicleForm {
  year: string;
  make: string;
  model: string;
  trim: string;
  km: string;
}

export interface LoanForm {
  balance: string;
  apr: string;
  monthsLeft: string;
}

const MAX_KM = 2_000_000;

export function readKm(text: string): number | null {
  const cleaned = text.replace(/km/i, "").replace(/[\s,]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const km = Number(cleaned);
  return km <= MAX_KM ? km : null;
}

function readCount(text: string): number | null {
  const cleaned = text.trim();
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
}

export function readNewVehicle(form: NewVehicleForm, today: IsoDate): Result<NewVehicle> {
  const year = readCount(form.year);
  if (year === null || year < 1900 || year > 2100) {
    return { ok: false, error: "Enter the model year, like 2019." };
  }
  if (form.make.trim() === "") return { ok: false, error: "Enter the make, like Hyundai." };
  if (form.model.trim() === "") return { ok: false, error: "Enter the model, like Santa Fe." };
  const km = readKm(form.km);
  if (km === null) return { ok: false, error: "Enter the odometer in whole kilometres." };
  const value: NewVehicle = {
    year,
    make: form.make.trim(),
    model: form.model.trim(),
    odometer: { date: today, km },
  };
  const trim = form.trim.trim();
  if (trim !== "") value.trim = trim;
  return { ok: true, value };
}

export function readInServiceDate(text: string, today: IsoDate): Result<IsoDate> {
  if (!isIsoDate(text)) return { ok: false, error: "Pick the date it went into service." };
  if (text > today) return { ok: false, error: "That date is in the future." };
  return { ok: true, value: text };
}

export function readLoanSnapshot(form: LoanForm, today: IsoDate): Result<Loan> {
  const balance = parseMoneyInput(form.balance);
  if (balance === null) return { ok: false, error: "Enter what you still owe." };
  const apr = parsePercentInput(form.apr);
  if (apr === null) return { ok: false, error: "Enter the loan rate, like 4.49." };
  const months = readCount(form.monthsLeft);
  if (months === null || months < 1) return { ok: false, error: "Enter the months left, 1 or more." };
  return { ok: true, value: { kind: "snapshot", balance, apr, monthsRemaining: months, asOf: today } };
}

export interface PurchaseForm {
  price: string;
  date: string;
}

export function readPurchase(form: PurchaseForm, today: IsoDate): Result<Purchase> {
  const price = parseMoneyInput(form.price);
  if (price === null || price === 0) return { ok: false, error: "Enter what you paid, like 32995." };
  if (!isIsoDate(form.date)) return { ok: false, error: "Pick the date you bought it." };
  if (form.date > today) return { ok: false, error: "That date is in the future." };
  return { ok: true, value: { price, date: form.date } };
}

export interface ValueEntryForm {
  kind: ValueSource;
  comps: string;
  amount: string;
  date: string;
}

const MIN_PRICE = cents(50_000);
const MAX_PRICE = cents(50_000_000);
const MIN_COMPS = 3;
const MAX_COMPS = 5;

function readComps(text: string): Result<Cents> {
  const tokens = text.split(/[\s;]+/).map((t) => t.replace(/,+$/, "")).filter((t) => t !== "");
  if (tokens.length < MIN_COMPS || tokens.length > MAX_COMPS) {
    return { ok: false, error: `Enter ${MIN_COMPS} to ${MAX_COMPS} prices, one per line.` };
  }
  const prices: Cents[] = [];
  for (const token of tokens) {
    const price = parseMoneyInput(token);
    if (price === null) return { ok: false, error: `Couldn't read “${token}” as a price.` };
    if (price < MIN_PRICE || price > MAX_PRICE) {
      return { ok: false, error: `“${token}” doesn't look like a price for a car.` };
    }
    prices.push(price);
  }
  return { ok: true, value: medianPrice(prices) };
}

function readAmount(text: string): Result<Cents> {
  const amount = parseMoneyInput(text);
  if (amount === null || amount < MIN_PRICE || amount > MAX_PRICE) {
    return { ok: false, error: "Enter the value in dollars, like 14200." };
  }
  return { ok: true, value: amount };
}

export function readValueEntry(form: ValueEntryForm, today: IsoDate): Result<ValueAnchor> {
  const value = form.kind === "comps" ? readComps(form.comps) : readAmount(form.amount);
  if (!value.ok) return value;
  if (!isIsoDate(form.date)) return { ok: false, error: "Pick the date for this value." };
  if (form.date > today) return { ok: false, error: "That date is in the future." };
  return { ok: true, value: { date: form.date, value: value.value, source: form.kind } };
}

export function readPreApproval(text: string): Result<number | undefined> {
  if (text.trim() === "") return { ok: true, value: undefined };
  const apr = parsePercentInput(text);
  if (apr === null) return { ok: false, error: "Enter the pre-approval rate, like 5.99." };
  return { ok: true, value: apr };
}

export interface TradeOfferForm {
  source: string;
  amount: string;
}

export function readTradeOffer(form: TradeOfferForm, today: IsoDate): Result<TradeOffer> {
  const source = form.source.trim();
  if (source === "") return { ok: false, error: "Say where the figure came from, like Clutch or a second dealer." };
  const amount = parseMoneyInput(form.amount);
  if (amount === null) return { ok: false, error: "Enter the figure in dollars, like 9200." };
  return { ok: true, value: { source, amount, date: today } };
}

export function readWalkAway(text: string): Result<Cents | undefined> {
  if (text.trim() === "") return { ok: true, value: undefined };
  const amount = parseMoneyInput(text);
  if (amount === null || amount === 0) return { ok: false, error: "Enter the most you'll pay all-in, like 33000." };
  return { ok: true, value: amount };
}
