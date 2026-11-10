import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGUAGES, mapTagToLanguage } from "../i18n/language";

const read = (path: string) => readFileSync(path, "utf8");
describe("approved native configuration", () => {
  it("uses com.pending.mrbsokudo consistently on both platforms", () => {
    expect(read("capacitor.config.ts")).toContain('appId: "com.pending.mrbsokudo"');
    expect(read("android/app/build.gradle")).toContain('applicationId "com.pending.mrbsokudo"');
    expect(read("ios/App/App.xcodeproj/project.pbxproj").match(/PRODUCT_BUNDLE_IDENTIFIER = com\.pending\.mrbsokudo;/g)).toHaveLength(2);
  });
  it("leaves the Apple team empty until Mr.B. Sokudo's own team is approved", () => {
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
    expect(read("ios/App/App/App.entitlements")).not.toContain("aps-environment");
    expect(read("ios/App/App/Info.plist")).not.toContain("UIBackgroundModes");
  });
});