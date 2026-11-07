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

describe("compare route", () => {
  it("parses two deal ids", () => {
    expect(parseHash("#compare=abc-1,def-2")).toEqual({ name: "compare", ids: ["abc-1", "def-2"] });
  });

  it.each([
    ["#compare"],
    ["#compare="],
    ["#compare=abc"],
    ["#compare=abc,"],
    ["#compare=,abc"],
    ["#compare=abc,abc"],
    ["#compare=a,b,c"],
  ])("has no ids for %s", (hash) => {
    expect(parseHash(hash)).toEqual({ name: "compare", ids: null });
  });
});

describe("tabFor", () => {
  it("highlights Dealer while comparing", () => {
    expect(tabFor({ name: "compare", ids: null })).toBe("dealer");
  });

  it("highlights Dealer while on the verdict", () => {
    expect(tabFor({ name: "verdict", code: null })).toBe("dealer");
  });

  it("highlights the matching tab otherwise", () => {
    expect(tabFor({ name: "timeline" })).toBe("timeline");
  });
});
