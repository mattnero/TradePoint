export type Cents = number & { readonly __unit: "cents" };

const MINUS = "−";

const wholeDollars = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const withCents = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) throw new RangeError(`Not a whole number of cents: ${value}`);
  return value as Cents;
}

export function fromDollars(dollars: number): Cents {
  const rounded = Math.sign(dollars) * Math.round(Math.abs(dollars) * 100);
  return cents(rounded === 0 ? 0 : rounded);
}

export function toDollars(amount: Cents): number {
  return amount / 100;
}

export interface FormatOptions {
  showCents?: boolean;
  signed?: boolean;
}

export function formatCAD(amount: Cents, { showCents = false, signed = false }: FormatOptions = {}): string {
  const formatter = showCents ? withCents : wholeDollars;
  const magnitude = formatter.format(Math.abs(amount) / 100);
  if (magnitude === formatter.format(0)) return magnitude;
  if (amount < 0) return MINUS + magnitude;
  return signed ? `+${magnitude}` : magnitude;
}

export function parseMoneyInput(input: string): Cents | null {
  const match = /^(\d*)(?:\.(\d*))?$/.exec(input.replace(/[\s$,]/g, ""));
  if (!match) return null;
  const [, whole = "", fraction = ""] = match;
  if (whole === "" && fraction === "") return null;
  const total = Number(whole || "0") * 100 + Math.round(Number(`0.${fraction || "0"}`) * 100);
  return Number.isSafeInteger(total) ? cents(total) : null;
}
