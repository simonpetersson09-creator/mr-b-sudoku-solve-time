import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectDeviceLanguage, getLanguage, isLanguageManuallySet, LANGUAGES, mapTagToLanguage, setLanguage, subscribeLanguageChanges } from "./language";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("phone language preferences", () => {
  it("supports exactly 40 app languages", () => expect(LANGUAGES).toHaveLength(40));
  it.each([
    ["sv-SE", "sv"], ["en_US", "en"], ["nb-NO", "no"], ["nn-NO", "no"],
    ["pt-PT", "pt"], ["pt-BR", "pt-BR"], ["pt-Latn-PT", "pt"], ["pt", "pt-BR"],
    ["in-ID", "id"], ["ja-JP", "ja"], ["zh-CN", null],
  ])("maps regional tag %s to %s", (tag, expected) => expect(mapTagToLanguage(tag)).toBe(expected));
  it("chooses the first supported phone preference", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["zh-CN", "fi-FI", "en-US"]);
    expect(detectDeviceLanguage()).toBe("fi");
  });
  it("keeps the existing Swedish fallback for unsupported phone languages", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["zh-CN"]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("zh-CN");
    expect(detectDeviceLanguage()).toBe("sv");
  });
  it("persists a manual choice across subsequent startup reads", () => {
    setLanguage("ja");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE"]);
    expect(getLanguage()).toBe("ja");
    expect(isLanguageManuallySet()).toBe(true);
  });
  it("follows a changed phone language when the saved choice was automatic", () => {
    const languages = vi.spyOn(navigator, "languages", "get").mockReturnValue(["sv-SE"]);
    expect(getLanguage()).toBe("sv");
    expect(isLanguageManuallySet()).toBe(false);
    languages.mockReturnValue(["de-DE"]);
    expect(getLanguage()).toBe("de");
    expect(localStorage.getItem("mrb-sudoku:v1:language-source")).toBe("auto");
  });
  it("preserves legacy saved language choices with no source", () => {
    localStorage.setItem("mrb-sudoku:v1:language", "fi");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE"]);
    expect(getLanguage()).toBe("fi");
  });
  it("refreshes automatic language on phone language change and foreground, then removes listeners", () => {
    const languages = vi.spyOn(navigator, "languages", "get").mockReturnValue(["sv-SE"]);
    let observed = getLanguage();
    const changed = vi.fn(() => { observed = getLanguage(); });
    const unsubscribe = subscribeLanguageChanges(changed);
    languages.mockReturnValue(["fr-FR"]);
    window.dispatchEvent(new Event("languagechange"));
    expect(observed).toBe("fr");
    languages.mockReturnValue(["ja-JP"]);
    window.dispatchEvent(new Event("mrb-sudoku:resume"));
    expect(observed).toBe("ja");
    unsubscribe();
    window.dispatchEvent(new Event("languagechange"));
    window.dispatchEvent(new Event("mrb-sudoku:resume"));
    expect(changed).toHaveBeenCalledTimes(2);
  });
  it("still detects the language when device storage reads throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("unavailable"); });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE"]);
    expect(getLanguage()).toBe("de");
    expect(isLanguageManuallySet()).toBe(false);
  });
});