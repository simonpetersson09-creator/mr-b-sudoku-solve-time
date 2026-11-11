import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LevelPicker } from "./LevelPicker";
vi.mock("@/lib/i18n", async () => { const { sv } = await import("@/lib/i18n/translations/sv"); return { useTranslation: () => ({ t: (key: keyof typeof sv) => sv[key] }) }; });
afterEach(cleanup);
it("keeps keyboard focus within the level dialog and restores its opener", () => {
  const opener = document.createElement("button"); document.body.append(opener); opener.focus();
  const { unmount } = render(<LevelPicker onSelect={vi.fn()} onClose={vi.fn()} />);
  const controls = within(screen.getByRole("dialog")).getAllByRole("button").filter((c) => !c.hasAttribute("disabled"));
  expect(document.activeElement).toBe(controls[0]);
  controls[controls.length - 1].focus(); fireEvent.keyDown(document, { key: "Tab" });
  expect(document.activeElement).toBe(controls[0]);
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(controls[controls.length - 1]);
  unmount(); expect(document.activeElement).toBe(opener); opener.remove();
});