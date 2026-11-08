import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.mattnero.tradepoint",
  appName: "TradePoint",
  webDir: "dist-native",
  ios: {
    contentInset: "never",
    backgroundColor: "#FFFFFF",
  },
  plugins: {
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#FFFFFF",
    },
  },
};

export default config;
