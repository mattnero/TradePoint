import { cents, formatCAD, fromDollars, parseMoneyInput, toDollars } from "../src/model/money";

describe("cents", () => {
  it("accepts whole numbers", () => {
    expect(cents(187700)).toBe(187700);
  });

  it("rejects fractions of a cent", () => {
    expect(() => cents(1.5)).toThrow(RangeError);
  });
});

describe("fromDollars and toDollars", () => {
  it("rounds to the nearest cent", () => {
    expect(fromDollars(28881.374)).toBe(2888137);
    expect(fromDollars(28881.375)).toBe(2888138);
  });

  it("rounds negatives symmetrically", () => {
    expect(fromDollars(-1.125)).toBe(-113);
  });

  it("round-trips", () => {
    expect(toDollars(fromDollars(421.77))).toBe(421.77);
  });
});

describe("formatCAD", () => {
  it("shows whole dollars with thousands separators by default", () => {
    expect(formatCAD(cents(3488137))).toBe("$34,881");
  });

  it("shows cents when asked", () => {
    expect(formatCAD(cents(42177), { showCents: true })).toBe("$421.77");
  });

  it("uses a true minus sign for negatives", () => {
    expect(formatCAD(cents(-120000))).toBe("−$1,200");
  });

  it("adds a plus sign when signed", () => {
    expect(formatCAD(cents(187700), { signed: true })).toBe("+$1,877");
    expect(formatCAD(cents(-120000), { signed: true })).toBe("−$1,200");
  });

  it("never signs an amount that rounds to zero", () => {
    expect(formatCAD(cents(0), { signed: true })).toBe("$0");
    expect(formatCAD(cents(-40), { signed: true })).toBe("$0");
    expect(formatCAD(cents(40), { signed: true })).toBe("$0");
  });
});

describe("parseMoneyInput", () => {
  it.each([
    ["29995", 2999500],
    ["29,995", 2999500],
    ["$29,995.50", 2999550],
    ["  450 ", 45000],
    ["1 234", 123400],
    ["450.", 45000],
    [".5", 50],
    ["421.775", 42178],
    ["0", 0],
  ])("parses %j", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(["", "  ", "$", ".", "-450", "abc", "4.5.0", "1e5", "99999999999999999999"])(
    "rejects %j",
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );
});
