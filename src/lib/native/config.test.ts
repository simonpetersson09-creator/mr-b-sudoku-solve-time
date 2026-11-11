import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGUAGES, mapTagToLanguage } from "../i18n/language";

const read = (path: string) => readFileSync(path, "utf8");
describe("approved native configuration", () => {
  it("uses se.shiningdays.mrbsudoku consistently on both platforms", () => {
    expect(read("capacitor.config.ts")).toContain('appId: "se.shiningdays.mrbsudoku"');
    expect(read("android/app/build.gradle")).toContain('applicationId "se.shiningdays.mrbsudoku"');
    expect(read("android/app/build.gradle")).toContain('namespace = "se.shiningdays.mrbsudoku"');
    expect(read("android/app/src/main/java/se/shiningdays/mrbsudoku/MainActivity.java")).toContain('package se.shiningdays.mrbsudoku;');
    expect(read("ios/App/App/Info.plist")).toContain('<key>CFBundleURLName</key><string>se.shiningdays.mrbsudoku</string>');
    expect(read("ios/App/App.xcodeproj/project.pbxproj").match(/PRODUCT_BUNDLE_IDENTIFIER = se\.shiningdays\.mrbsudoku;/g)).toHaveLength(2);
  });
  it("uses version 1.0.0 on both platforms", () => {
    expect(read("android/app/build.gradle")).toContain('versionName "1.0.0"');
    expect(read("ios/App/App.xcodeproj/project.pbxproj").match(/MARKETING_VERSION = 1\.0\.0;/g)).toHaveLength(2);
  });
  it("uses build number 1 on both platforms", () => {
    expect(read("android/app/build.gradle")).toMatch(/versionCode 1\s/);
    expect(read("ios/App/App.xcodeproj/project.pbxproj").match(/CURRENT_PROJECT_VERSION = 1;/g)).toHaveLength(2);
  });
  it("leaves the Apple team empty until Mr.B. Sudoku's own team is approved", () => {
    const project = read("ios/App/App.xcodeproj/project.pbxproj");
    expect(project.match(/DEVELOPMENT_TEAM = "";/g)).toHaveLength(2);
    expect(project).not.toContain("F43HQMHCAT");
  });
  it("ships no QR scanner or push plugin", () => {
    for (const f of ["package.json", "ios/App/CapApp-SPM/Package.swift", "android/capacitor.settings.gradle", "android/app/capacitor.build.gradle"]) {
      expect(read(f)).not.toContain("barcode-scanner");
      expect(read(f)).not.toContain("push-notifications");
    }
  });
  it("declares all 40 actual UI languages on both platforms", () => {
    const plist = read("ios/App/App/Info.plist");
    const locales = plist.match(/<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1] ?? "";
    const iosTags = [...locales.matchAll(/<string>(.*?)<\/string>/g)].map(m => m[1]);
    const androidTags = [...read("android/app/src/main/res/xml/locales_config.xml").matchAll(/android:name="(.*?)"/g)].map(m => m[1]);
    const expected = LANGUAGES.map(l => l.code).sort();
    for (const tags of [iosTags, androidTags]) {
      expect(tags).toHaveLength(40);
      expect(tags.map(mapTagToLanguage).sort()).toEqual(expected);
    }
  });
  it("has no push entitlement or background modes", () => {
    expect(read("capacitor.config.ts")).not.toContain("PushNotifications");
    expect(read("android/app/src/main/AndroidManifest.xml")).not.toContain("POST_NOTIFICATIONS");
    expect(read("ios/App/App/App.entitlements")).not.toContain("aps-environment");
    expect(read("ios/App/App/Info.plist")).not.toContain("UIBackgroundModes");
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).not.toContain("com.apple.Push");
  });
  it("chooses profile photos without a camera plugin or camera permission", () => {
    expect(read("package.json")).not.toContain('"@capacitor/camera"');
    expect(read("ios/App/App/Info.plist")).not.toContain("NSCameraUsageDescription");
    expect(read("android/app/src/main/AndroidManifest.xml")).not.toContain("android.permission.CAMERA");
  });
});