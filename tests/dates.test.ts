import { addDays, addMonths, addYears, daysBetween, isIsoDate, wholeMonthsBetween } from "../src/model/dates";

describe("isIsoDate", () => {
  it.each(["2026-11-02", "2024-02-29", "1999-12-31"])("accepts %s", (s) => {
    expect(isIsoDate(s)).toBe(true);
  });

  it.each(["2025-02-29", "2026-13-01", "2026-00-10", "2026-1-1", "2026-11-02T10:00", "", "tomorrow", "2026-04-31"])(
    "rejects %j",
    (s) => {
      expect(isIsoDate(s)).toBe(false);
    },
  );
});

describe("daysBetween", () => {
  it("counts calendar days", () => {
    expect(daysBetween("2025-01-01", "2025-07-01")).toBe(181);
  });

  it("is negative when the second date is earlier", () => {
    expect(daysBetween("2025-01-10", "2025-01-01")).toBe(-9);
  });

  it("crosses a leap day", () => {
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
  });
});

describe("wholeMonthsBetween", () => {
  it.each([
    ["2024-01-15", "2024-01-15", 0],
    ["2024-01-15", "2024-02-14", 0],
    ["2024-01-15", "2024-02-15", 1],
    ["2024-01-15", "2025-01-15", 12],
    ["2024-01-15", "2025-01-14", 11],
    ["2024-01-31", "2024-02-29", 1],
    ["2025-01-31", "2025-02-27", 0],
    ["2025-01-31", "2025-02-28", 1],
    ["2024-01-15", "2023-12-01", 0],
  ])("%s to %s is %i", (from, to, expected) => {
    expect(wholeMonthsBetween(from, to)).toBe(expected);
  });
});

describe("addYears", () => {
  it("moves the year and keeps the day", () => {
    expect(addYears("2022-06-15", 5)).toBe("2027-06-15");
  });

  it("lands a leap day on Feb 28 in a common year", () => {
    expect(addYears("2024-02-29", 5)).toBe("2029-02-28");
    expect(addYears("2024-02-29", 4)).toBe("2028-02-29");
  });
});

describe("addMonths", () => {
  it("moves the month and keeps the day", () => {
    expect(addMonths("2026-11-02", 3)).toBe("2027-02-02");
  });

  it("clamps to the end of a shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("crosses year boundaries both ways", () => {
    expect(addMonths("2026-11-15", 14)).toBe("2028-01-15");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
  });
});

describe("addDays", () => {
  it("adds calendar days across months and leap years", () => {
    expect(addDays("2026-11-02", 270)).toBe("2027-07-30");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });
});
