import {
  readInServiceDate,
  readKm,
  readPreApproval,
  readTradeOffer,
  readWalkAway,
  readLoanSnapshot,
  readNewVehicle,
  readPurchase,
  readValueEntry,
  type NewVehicleForm,
} from "../src/garage/inputs";
import { cents } from "../src/model/money";

const TODAY = "2026-11-03";

const form: NewVehicleForm = { year: "2019", make: "Hyundai", model: "Santa Fe", trim: "", km: "118,000" };

describe("readKm", () => {
  it.each([
    ["118000", 118000],
    ["118,000", 118000],
    [" 118 000 km ", 118000],
    ["0", 0],
  ])("reads %j", (text, expected) => {
    expect(readKm(text)).toBe(expected);
  });

  it.each(["", "km", "-5", "118000.5", "1e5", "99999999999"])("rejects %j", (text) => {
    expect(readKm(text)).toBeNull();
  });
});

describe("readNewVehicle", () => {
  it("builds the vehicle input with today's date on the first reading", () => {
    expect(readNewVehicle(form, TODAY)).toEqual({
      ok: true,
      value: { year: 2019, make: "Hyundai", model: "Santa Fe", odometer: { date: TODAY, km: 118000 } },
    });
  });

  it("keeps a trim when given", () => {
    const r = readNewVehicle({ ...form, trim: " Luxury " }, TODAY);
    expect(r.ok && r.value.trim).toBe("Luxury");
  });

  it.each([
    ["year", { year: "19" }, "Enter the model year, like 2019."],
    ["year range", { year: "1850" }, "Enter the model year, like 2019."],
    ["make", { make: " " }, "Enter the make, like Hyundai."],
    ["model", { model: "" }, "Enter the model, like Santa Fe."],
    ["km", { km: "lots" }, "Enter the odometer in whole kilometres."],
  ])("explains a bad %s", (_name, patch, error) => {
    expect(readNewVehicle({ ...form, ...patch }, TODAY)).toEqual({ ok: false, error });
  });
});

describe("readInServiceDate", () => {
  it("accepts a real past date", () => {
    expect(readInServiceDate("2019-04-01", TODAY)).toEqual({ ok: true, value: "2019-04-01" });
  });

  it("accepts today", () => {
    expect(readInServiceDate(TODAY, TODAY)).toEqual({ ok: true, value: TODAY });
  });

  it.each(["", "April 2019", "2019-02-30"])("rejects %j", (text) => {
    expect(readInServiceDate(text, TODAY)).toEqual({ ok: false, error: "Pick the date it went into service." });
  });

  it("rejects a future date", () => {
    expect(readInServiceDate("2027-01-01", TODAY)).toEqual({ ok: false, error: "That date is in the future." });
  });
});

describe("readLoanSnapshot", () => {
  it("builds a balance snapshot dated today", () => {
    expect(readLoanSnapshot({ balance: "15,100", apr: "4.49", monthsLeft: "30" }, TODAY)).toEqual({
      ok: true,
      value: { kind: "snapshot", balance: cents(1510000), apr: 0.0449, monthsRemaining: 30, asOf: TODAY },
    });
  });

  it("accepts a 0% loan", () => {
    const r = readLoanSnapshot({ balance: "8000", apr: "0", monthsLeft: "12" }, TODAY);
    expect(r.ok && r.value.apr).toBe(0);
  });

  it.each([
    ["balance", { balance: "", apr: "4.49", monthsLeft: "30" }, "Enter what you still owe."],
    ["rate", { balance: "15000", apr: "", monthsLeft: "30" }, "Enter the loan rate, like 4.49."],
    ["months", { balance: "15000", apr: "4.49", monthsLeft: "0" }, "Enter the months left, 1 or more."],
    ["fractional months", { balance: "15000", apr: "4.49", monthsLeft: "2.5" }, "Enter the months left, 1 or more."],
  ])("explains a bad %s", (_name, f, error) => {
    expect(readLoanSnapshot(f, TODAY)).toEqual({ ok: false, error });
  });
});

describe("readPurchase", () => {
  it("reads the price and date paid", () => {
    expect(readPurchase({ price: "$32,995", date: "2023-03-15" }, TODAY)).toEqual({
      ok: true,
      value: { price: cents(3299500), date: "2023-03-15" },
    });
  });

  it.each([
    ["missing price", { price: "", date: "2023-03-15" }, "Enter what you paid, like 32995."],
    ["zero price", { price: "0", date: "2023-03-15" }, "Enter what you paid, like 32995."],
    ["missing date", { price: "32995", date: "" }, "Pick the date you bought it."],
    ["future date", { price: "32995", date: "2026-11-04" }, "That date is in the future."],
  ])("explains a %s", (_name, f, error) => {
    expect(readPurchase(f, TODAY)).toEqual({ ok: false, error });
  });
});

describe("readValueEntry", () => {
  const entry = { kind: "comps" as const, comps: "", amount: "", date: TODAY };

  it("turns pasted comp prices into a comps anchor at their median", () => {
    expect(readValueEntry({ ...entry, comps: "$16,950\n15,900\n17,500" }, TODAY)).toEqual({
      ok: true,
      value: { date: TODAY, value: cents(1695000), source: "comps" },
    });
  });

  it("reads prices separated by spaces, commas or semicolons as well as lines", () => {
    const r = readValueEntry({ ...entry, comps: "16950, 15900; 17500 18200" }, TODAY);
    expect(r.ok && r.value.value).toBe(cents(1722500));
  });

  it("dates the comps by the chosen day", () => {
    const r = readValueEntry({ ...entry, comps: "16950 15900 17500", date: "2026-10-28" }, TODAY);
    expect(r.ok && r.value.date).toBe("2026-10-28");
  });

  it.each([
    ["two prices", "16950 15900", "Enter 3 to 5 prices, one per line."],
    ["six prices", "1 2 3 4 5 6".replace(/\d/g, "16950"), "Enter 3 to 5 prices, one per line."],
    ["nothing", "", "Enter 3 to 5 prices, one per line."],
    ["a word", "16950 15900 about17500", "Couldn't read “about17500” as a price."],
    ["a price that is clearly not one", "16950 15900 170", "“170” doesn't look like a price for a car."],
    ["a km figure run into a price", "16950 15900 17500,119194", "“17500,119194” doesn't look like a price for a car."],
  ])("explains %s", (_name, comps, error) => {
    expect(readValueEntry({ ...entry, comps }, TODAY)).toEqual({ ok: false, error });
  });

  it("reads a single amount as an outside offer", () => {
    expect(readValueEntry({ kind: "offer", comps: "", amount: "$9,200", date: TODAY }, TODAY)).toEqual({
      ok: true,
      value: { date: TODAY, value: cents(920000), source: "offer" },
    });
  });

  it("reads a single amount as the owner's own figure", () => {
    const r = readValueEntry({ kind: "manual", comps: "", amount: "14200", date: TODAY }, TODAY);
    expect(r.ok && r.value.source).toBe("manual");
  });

  it.each([
    ["no amount", { kind: "manual" as const, amount: "" }, "Enter the value in dollars, like 14200."],
    ["a tiny amount", { kind: "offer" as const, amount: "50" }, "Enter the value in dollars, like 14200."],
    ["a huge amount", { kind: "manual" as const, amount: "5000000" }, "Enter the value in dollars, like 14200."],
  ])("explains %s", (_name, partial, error) => {
    expect(readValueEntry({ ...entry, ...partial }, TODAY)).toEqual({ ok: false, error });
  });

  it("needs a real date that is not in the future", () => {
    const good = { kind: "manual" as const, comps: "", amount: "14200", date: TODAY };
    expect(readValueEntry({ ...good, date: "" }, TODAY)).toEqual({ ok: false, error: "Pick the date for this value." });
    expect(readValueEntry({ ...good, date: "2026-11-04" }, TODAY)).toEqual({ ok: false, error: "That date is in the future." });
  });
});

describe("readPreApproval", () => {
  it("reads a rate, including 0%", () => {
    expect(readPreApproval("5.99")).toEqual({ ok: true, value: 0.0599 });
    expect(readPreApproval("0")).toEqual({ ok: true, value: 0 });
  });

  it("treats blank as cleared", () => {
    expect(readPreApproval(" ")).toEqual({ ok: true, value: undefined });
  });

  it("explains a bad entry", () => {
    expect(readPreApproval("five")).toEqual({ ok: false, error: "Enter the pre-approval rate, like 5.99." });
  });
});

describe("readTradeOffer", () => {
  it("reads who made it and the amount, dated today", () => {
    expect(readTradeOffer({ source: " Clutch ", amount: "9,200" }, TODAY)).toEqual({
      ok: true,
      value: { source: "Clutch", amount: cents(920000), date: TODAY },
    });
  });

  it("needs both", () => {
    expect(readTradeOffer({ source: "", amount: "9200" }, TODAY)).toEqual({
      ok: false,
      error: "Say where the figure came from, like Clutch or a second dealer.",
    });
    expect(readTradeOffer({ source: "Clutch", amount: "" }, TODAY)).toEqual({
      ok: false,
      error: "Enter the figure in dollars, like 9200.",
    });
    expect(readTradeOffer({ source: "Clutch", amount: "9.2k" }, TODAY)).toEqual({
      ok: false,
      error: "Enter the figure in dollars, like 9200.",
    });
  });
});

describe("readWalkAway", () => {
  it("reads dollars and treats blank as cleared", () => {
    expect(readWalkAway("33,000")).toEqual({ ok: true, value: cents(3300000) });
    expect(readWalkAway("")).toEqual({ ok: true, value: undefined });
  });

  it("refuses zero and unreadable amounts", () => {
    const error = "Enter the most you'll pay all-in, like 33000.";
    expect(readWalkAway("0")).toEqual({ ok: false, error });
    expect(readWalkAway("33k")).toEqual({ ok: false, error });
  });
});
