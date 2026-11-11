import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyIosPackage } from "../../../scripts/verify-ios-package.mjs";

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "sudoku-ios-check-"));
  roots.push(root);
  const put = (path: string, text: string) => { mkdirSync(join(root, path, ".."), { recursive: true }); writeFileSync(join(root, path), text); };
  put("ios/App/App/capacitor.config.json", JSON.stringify({ appId: "se.shiningdays.mrbsudoku", packageClassList: ["AdMobPlugin", "InAppReviewPlugin", "AppPlugin", "HapticsPlugin", "CAPNetworkPlugin", "SharePlugin", "StatusBarPlugin", "SecureStoragePlugin"] }));
  put("ios/App/App.xcodeproj/project.pbxproj", ['PRODUCT_BUNDLE_IDENTIFIER = se.shiningdays.mrbsudoku;', 'MARKETING_VERSION = 1.0.0;', 'CURRENT_PROJECT_VERSION = 1;', 'DEVELOPMENT_TEAM = "";'].join("\n").repeat(2));
  put("ios/App/App/Info.plist", "ca-app-pub-7448540924654868~5197213597");
  for (const file of ["AppDelegate.swift", "SceneDelegate.swift", "App.entitlements", "PrivacyInfo.xcprivacy", "Base.lproj/Main.storyboard", "Base.lproj/LaunchScreen.storyboard"]) put(`ios/App/App/${file}`, "fixture");
  for (const dir of ["dist-native", "ios/App/App/public"]) {
    put(`${dir}/index.html`, "packaged game");
    put(`${dir}/assets/font.woff2`, "font");
    put(`${dir}/assets/generation.worker.js`, "worker");
    put(`${dir}/assets/game.js`, "https://mr-b-sudoku-solve-time.lovable.app ca-app-pub-7448540924654868/5823578752 ca-app-pub-7448540924654868/3884131928 ca-app-pub-7448540924654868/8705213764");
  }
  return { root, put };
}
afterEach(() => { roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })); });
describe("iOS-only packaged build verification", () => {
  it("accepts a synchronized iOS package without Android output", () => { expect(() => verifyIosPackage(fixture().root)).not.toThrow(); });
  it("rejects stale copied game files", () => { const { root, put } = fixture(); put("ios/App/App/public/index.html", "old game"); expect(() => verifyIosPackage(root)).toThrow("Stale iOS asset"); });
  it("rejects a different bundle identity", () => { const { root, put } = fixture(); put("ios/App/App/capacitor.config.json", JSON.stringify({ appId: "wrong" })); expect(() => verifyIosPackage(root)).toThrow("Wrong iOS identity"); });
});