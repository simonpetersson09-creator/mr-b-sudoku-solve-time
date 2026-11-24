import { readFileSync, writeFileSync } from "node:fs";

/** Capacitor generates packageClassList from dependencies; retain the app-owned plugin after every sync. */
const path = "ios/App/App/capacitor.config.json";
const config = JSON.parse(readFileSync(path, "utf8"));
config.packageClassList = [...new Set([...(config.packageClassList ?? []), "AppEnvironmentPlugin"])];
writeFileSync(path, `${JSON.stringify(config, null, "\t")}\n`);
