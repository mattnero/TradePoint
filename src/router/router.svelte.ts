import { parseHash, type Route } from "./parse";

let current = $state<Route>(parseHash(window.location.hash));

window.addEventListener("hashchange", () => {
  current = parseHash(window.location.hash);
});

export const router = {
  get route(): Route {
    return current;
  },
};
