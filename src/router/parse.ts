export type Route =
  | { name: "garage" }
  | { name: "timeline" }
  | { name: "dealer" }
  | { name: "settings" }
  | { name: "verdict"; code: string | null };

export type TabName = "garage" | "timeline" | "dealer" | "settings";

export function parseHash(hash: string): Route {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (raw.startsWith("d=")) {
    const code = raw.slice(2);
    return { name: "verdict", code: code === "" ? null : code };
  }
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
  return route.name === "verdict" ? "dealer" : route.name;
}
