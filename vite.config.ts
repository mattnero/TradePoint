import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig(({ mode }) => ({
  base: mode === "native" ? "./" : "/TradePoint/",
  plugins: [svelte()],
}));
