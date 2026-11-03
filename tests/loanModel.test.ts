import { cents } from "../src/model/money";
import { loanBalanceAt, monthlyPayment, monthsRemainingAt, parseLoan, type Loan } from "../src/model/loan";

const terms: Loan = {
  kind: "terms",
  principal: cents(2000000),
  apr: 0.06,
  termMonths: 60,
  startDate: "2024-01-15",
};

const snapshot: Loan = {
  kind: "snapshot",
  balance: cents(1510000),
  apr: 0.0449,
  monthsRemaining: 30,
  asOf: "2026-11-02",
};

describe("loan from original terms", () => {
  it("pays $386.66 a month on $20,000 at 6% over 60 months", () => {
    expect(monthlyPayment(terms)).toBe(38666);
  });

  it("owes the full principal before the first payment", () => {
    expect(loanBalanceAt(terms, "2024-01-15")).toBe(2000000);
    expect(loanBalanceAt(terms, "2024-02-14")).toBe(2000000);
  });

  it("owes $16,463.94 after twelve payments", () => {
    expect(loanBalanceAt(terms, "2025-01-15")).toBe(1646394);
    expect(loanBalanceAt(terms, "2025-02-10")).toBe(1646394);
  });

  it("is paid off at the end of the term and stays at zero", () => {
    expect(loanBalanceAt(terms, "2029-01-15")).toBe(0);
    expect(loanBalanceAt(terms, "2031-06-01")).toBe(0);
  });

  it("owes the principal if asked about a date before it started", () => {
    expect(loanBalanceAt(terms, "2023-06-01")).toBe(2000000);
  });

  it("counts months remaining down to zero", () => {
    expect(monthsRemainingAt(terms, "2024-01-15")).toBe(60);
    expect(monthsRemainingAt(terms, "2025-01-15")).toBe(48);
    expect(monthsRemainingAt(terms, "2031-06-01")).toBe(0);
  });

  it("handles a 0% loan as straight-line", () => {
    const interestFree: Loan = { ...terms, principal: cents(1200000), apr: 0, termMonths: 48 };
    expect(monthlyPayment(interestFree)).toBe(25000);
    expect(loanBalanceAt(interestFree, "2025-01-15")).toBe(900000);
  });
});

describe("loan from a balance snapshot", () => {
  it("pays $533.05 a month on $15,100 at 4.49% with 30 months left", () => {
    expect(monthlyPayment(snapshot)).toBe(53305);
  });

  it("owes the snapshot balance on the day it was taken, and before", () => {
    expect(loanBalanceAt(snapshot, "2026-11-02")).toBe(1510000);
    expect(loanBalanceAt(snapshot, "2026-01-01")).toBe(1510000);
  });

  it("owes $12,213.81 six months later", () => {
    expect(loanBalanceAt(snapshot, "2027-05-02")).toBe(1221381);
  });

  it("is paid off after the remaining months", () => {
    expect(loanBalanceAt(snapshot, "2029-05-02")).toBe(0);
    expect(monthsRemainingAt(snapshot, "2027-05-02")).toBe(24);
    expect(monthsRemainingAt(snapshot, "2030-01-01")).toBe(0);
  });
});

describe("parseLoan", () => {
  it("round-trips both shapes through JSON", () => {
    expect(parseLoan(JSON.parse(JSON.stringify(terms)))).toEqual(terms);
    expect(parseLoan(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
  });

  it.each([
    ["null", null],
    ["unknown kind", { ...terms, kind: "lease" }],
    ["negative rate", { ...terms, apr: -0.01 }],
    ["rate over 100%", { ...terms, apr: 1.5 }],
    ["zero term", { ...terms, termMonths: 0 }],
    ["fractional term", { ...terms, termMonths: 60.5 }],
    ["zero principal", { ...terms, principal: 0 }],
    ["bad start date", { ...terms, startDate: "2024-02-30" }],
    ["negative balance", { ...snapshot, balance: -1 }],
    ["zero months remaining", { ...snapshot, monthsRemaining: 0 }],
    ["missing as-of", { ...snapshot, asOf: undefined }],
  ])("rejects %s", (_name, value) => {
    expect(parseLoan(value)).toBeNull();
  });
});
