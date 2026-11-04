import { isIsoDate, type IsoDate } from "../model/dates";
import type { Loan } from "../model/loan";
import type { Benchmarks } from "../model/verdict";
import { parseMoneyInput } from "../model/money";
import type { NewVehicle, Purchase } from "../model/vehicle";
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

export interface BenchmarksForm {
  preApprovalApr: string;
  outsideOffer: string;
}

export function readBenchmarks(form: BenchmarksForm): Result<Benchmarks> {
  const value: Benchmarks = {};
  if (form.preApprovalApr.trim() !== "") {
    const apr = parsePercentInput(form.preApprovalApr);
    if (apr === null) return { ok: false, error: "Enter the pre-approval rate, like 5.99." };
    value.preApprovalApr = apr;
  }
  if (form.outsideOffer.trim() !== "") {
    const offer = parseMoneyInput(form.outsideOffer);
    if (offer === null) return { ok: false, error: "Enter the outside offer in dollars, like 9200." };
    value.outsideTradeOffer = offer;
  }
  return { ok: true, value };
}
