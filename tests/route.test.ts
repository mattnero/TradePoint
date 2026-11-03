import { parseHash, tabFor } from "../src/router/parse";

describe("parseHash", () => {
  it.each(["timeline", "dealer", "settings"] as const)("parses #%s", (name) => {
    expect(parseHash(`#${name}`)).toEqual({ name });
  });

  it("defaults to garage for empty and unknown hashes", () => {
    expect(parseHash("")).toEqual({ name: "garage" });
    expect(parseHash("#garage")).toEqual({ name: "garage" });
    expect(parseHash("#nonsense")).toEqual({ name: "garage" });
  });

  it("parses a share code into the verdict route", () => {
    expect(parseHash("#d=abc_123-x")).toEqual({ name: "verdict", code: "abc_123-x" });
  });

  it("treats an empty share code and bare #verdict as a verdict with no code", () => {
    expect(parseHash("#d=")).toEqual({ name: "verdict", code: null });
    expect(parseHash("#verdict")).toEqual({ name: "verdict", code: null });
  });
});

describe("tabFor", () => {
  it("highlights Dealer while on the verdict", () => {
    expect(tabFor({ name: "verdict", code: null })).toBe("dealer");
  });

  it("highlights the matching tab otherwise", () => {
    expect(tabFor({ name: "timeline" })).toBe("timeline");
  });
});
