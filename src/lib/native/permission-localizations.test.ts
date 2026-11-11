import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../i18n/language";
// @ts-expect-error Native tooling is JavaScript, consumed only by source checks.
import { permissionCopy, permissionKeys } from "../../../scripts/ios-permission-copy.js";
// @ts-expect-error Native tooling is JavaScript, consumed only by source checks.
import { iosLocale, stringsFile, registerPermissionResources } from "../../../scripts/ios-permission-localizations.js";

describe("localized iOS permission resources", () => {
  it("ships tracking and photo explanations for all 40 app languages", () => {
    expect(Object.keys(permissionCopy).sort()).toEqual(LANGUAGES.map(l => l.code).sort());
    expect(permissionKeys).toEqual(["NSUserTrackingUsageDescription", "NSPhotoLibraryUsageDescription"]);
    for (const [lang, copy] of Object.entries(permissionCopy)) {
      expect(copy).toHaveLength(2);
      expect(readFileSync(`ios/App/App/${iosLocale(lang)}.lproj/InfoPlist.strings`, "utf8")).toBe(stringsFile(copy));
    }
  });
  it("registers the translations in the app resources without duplicate registration", () => {
    const project = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
    expect(registerPermissionResources(project)).toBe(project);
    expect(project.match(/InfoPlist.strings in Resources/g)).toHaveLength(2);
    expect(iosLocale("no")).toBe("nb");
    expect(iosLocale("pt")).toBe("pt-PT");
  });
});