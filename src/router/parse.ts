export type Route =
  | { name: "garage" }
  | { name: "timeline" }
  | { name: "dealer" }
  | { name: "settings" }
  | { name: "verdict"; code: string | null }
  | { name: "compare"; ids: [string, string] | null };

export type TabName = "garage" | "timeline" | "dealer" | "settings";

function compareIds(text: string): [string, string] | null {
  const ids = text.split(",");
  const [first, second] = ids;
  if (ids.length !== 2 || !first || !second || first === second) return null;
  return [first, second];
}

export function parseHash(hash: string): Route {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (raw.startsWith("d=")) {
    const code = raw.slice(2);
    return { name: "verdict", code: code === "" ? null : code };
  }
  if (raw === "compare" || raw.startsWith("compare=")) return { name: "compare", ids: compareIds(raw.slice(8)) };
  switch (raw) {
    case "timeline":
    case "dealer":
    case "settings":
      return { name: raw };
    case "verdict":
      return { name: "verdict", code: null };
    default:
      return { name: "garage" };
  }
}

export function tabFor(route: Route): TabName {
  return route.name === "verdict" || route.name === "compare" ? "dealer" : route.name;
}
