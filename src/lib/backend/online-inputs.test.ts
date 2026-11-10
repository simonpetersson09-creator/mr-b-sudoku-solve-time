import { describe, expect, it } from "vitest";
import { setAvatarInput } from "./online-inputs";

const jpeg = `data:image/jpeg;base64,${"A".repeat(4000)}`;

describe("profile picture input", () => {
  it("accepts a small jpeg picture", () => {
    expect(setAvatarInput({ image: jpeg }).image).toBe(jpeg);
  });

  it("accepts removing the picture", () => {
    expect(setAvatarInput({ image: null })).toEqual({ image: null });
    expect(setAvatarInput({ image: "" })).toEqual({ image: null });
  });

  it("rejects anything that is not a picture", () => {
    expect(() => setAvatarInput({ image: "https://example.com/a.jpg" })).toThrow("err:bad_image");
    expect(() => setAvatarInput({ image: "data:text/html;base64,AAA" })).toThrow("err:bad_image");
    expect(() => setAvatarInput({ image: "data:image/svg+xml;base64,AAA" })).toThrow("err:bad_image");
  });

  it("rejects a picture bigger than the stored limit", () => {
    expect(() => setAvatarInput({ image: `data:image/jpeg;base64,${"A".repeat(119978)}` })).toThrow("err:image_too_large");
    expect(setAvatarInput({ image: `data:image/jpeg;base64,${"A".repeat(119977)}` }).image?.length).toBe(120000);
  });

});
