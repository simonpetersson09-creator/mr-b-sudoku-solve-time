import type { CapacitorConfig } from "@capacitor/cli";

// Sudoku's standalone, locally packaged native app.
const config: CapacitorConfig = {
  appId: "se.shiningdays.mrbsudoku",
  appName: "Mr B Sudoku",
  webDir: "dist-native",
  ios: { contentInset: "never" },
  android: { allowMixedContent: false },
  plugins: { StatusBar: { style: "DARK" } },
};
export default config;