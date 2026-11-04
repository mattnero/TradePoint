import {
  readInServiceDate,
  readKm,
  readBenchmarks,
  readLoanSnapshot,
  readNewVehicle,
  readPurchase,
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

describe("readBenchmarks", () => {
  it("reads both", () => {
    expect(readBenchmarks({ preApprovalApr: "5.99", outsideOffer: "9,200" })).toEqual({
      ok: true,
      value: { preApprovalApr: 0.0599, outsideTradeOffer: cents(920000) },
    });
  });

  it("reads either alone, and blank means cleared", () => {
    expect(readBenchmarks({ preApprovalApr: "5.99", outsideOffer: "" })).toEqual({ ok: true, value: { preApprovalApr: 0.0599 } });
    expect(readBenchmarks({ preApprovalApr: "", outsideOffer: "9200" })).toEqual({
      ok: true,
      value: { outsideTradeOffer: cents(920000) },
    });
    expect(readBenchmarks({ preApprovalApr: " ", outsideOffer: "" })).toEqual({ ok: true, value: {} });
  });

  it("accepts a zero offer and a 0% rate", () => {
    expect(readBenchmarks({ preApprovalApr: "0", outsideOffer: "0" })).toEqual({
      ok: true,
      value: { preApprovalApr: 0, outsideTradeOffer: cents(0) },
    });
  });

  it("explains a bad entry instead of dropping it", () => {
    expect(readBenchmarks({ preApprovalApr: "five", outsideOffer: "" })).toEqual({
      ok: false,
      error: "Enter the pre-approval rate, like 5.99.",
    });
    expect(readBenchmarks({ preApprovalApr: "", outsideOffer: "lots" })).toEqual({
      ok: false,
      error: "Enter the outside offer in dollars, like 9200.",
    });
  });
});
