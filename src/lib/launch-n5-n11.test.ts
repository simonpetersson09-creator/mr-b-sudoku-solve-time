import { beforeEach, expect, it, vi } from "vitest";
const order: string[] = [];
const secure = { keys: vi.fn(async () => ({ value: ["mrb-sudoku:v1:device-id"] })), remove: vi.fn(async () => { order.push("secure-remove"); return {}; }) };
const serverDelete = vi.fn(async () => { order.push("server"); });
vi.mock("@/lib/backend/online.functions", () => ({ deletePlayerData: () => serverDelete() }));
vi.mock("@/lib/auth/client", () => ({ supabase: { auth: { signOut: vi.fn(async () => ({})) } } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("capacitor-secure-storage-plugin", () => ({ SecureStoragePlugin: secure }));
import { deletePlayerData } from "./player/player-data";
import { deviceId } from "./backend/telemetry";
import { newGame, setValue, undo, toggleNote, PEERS } from "./sudoku/engine";
import { readPlayerStorage, JOURNAL_QUARANTINE } from "./player/storage-transaction";
import { startNewGame, loadGame } from "./player/storage";
import { redactSensitive } from "./backend/redact";

beforeEach(() => { localStorage.clear(); order.length = 0; serverDelete.mockClear(); secure.remove.mockClear(); });

it("N5: deletion removes the durable device number only after the server confirmed", async () => {
  const before = deviceId();
  await deletePlayerData();
  expect(order).toEqual(["server", "secure-remove"]);
  expect(localStorage.getItem("mrb-sudoku:v1:device-id")).toBeNull();
  expect(deviceId()).not.toBe(before);
});

it("N5: a failed server deletion keeps the device number and identity", async () => {
  const before = deviceId();
  serverDelete.mockRejectedValueOnce(new Error("offline"));
  await expect(deletePlayerData()).rejects.toThrow();
  expect(secure.remove).not.toHaveBeenCalled();
  expect(deviceId()).toBe(before);
});

const emptyCell = (g: ReturnType<typeof newGame>) => g.values.findIndex((v) => v === 0);

it("N6: undo after correcting a wrong digit restores the empty cell, never the wrong digit", () => {
  let g = newGame("easy", 11, "n6");
  const i = emptyCell(g); const right = g.solution[i]; const wrong = right === 9 ? 1 : right + 1;
  g = setValue(g, i, wrong, true, false);
  g = setValue(g, i, right);
  g = undo(g);
  expect(g.values[i]).toBe(0);
});

it("N7: a wrong digit keeps peer notes; a correct digit still clears them", () => {
  let g = newGame("easy", 12, "n7");
  const i = emptyCell(g); const right = g.solution[i];
  const p = PEERS[i].find((q) => g.values[q] === 0)!;
  const wrong = [1,2,3,4,5,6,7,8,9].find((d) => d !== right)!;
  g = toggleNote(toggleNote(g, p, wrong), p, right);
  const afterWrong = setValue(g, i, wrong, true, false);
  expect(afterWrong.notes[p] & (1 << (wrong - 1))).not.toBe(0);
  const afterRight = setValue(g, i, right, true, true);
  expect(afterRight.notes[p] & (1 << (right - 1))).toBe(0);
});

it("N8: a corrupt journal is quarantined, saved games stay visible and new saves work", () => {
  const g = newGame("easy", 13, "n8");
  startNewGame(g);
  localStorage.setItem("mrb-sudoku:v1:storage-transaction", "{");
  expect(loadGame()?.id).toBe("n8");
  expect(localStorage.getItem("mrb-sudoku:v1:storage-transaction")).toBeNull();
  expect(localStorage.getItem(JOURNAL_QUARANTINE)).toBe("{");
  startNewGame(newGame("easy", 14, "n8b"));
  expect(loadGame()?.id).toBe("n8b");
  expect(readPlayerStorage("mrb-sudoku:v1:active-game-id")).toBe("n8b");
});

it("N11: error text loses tokens, secrets, emails and URL parameters but keeps the message", () => {
  const out = redactSensitive("TypeError: failed https://x.test/api?token=abc Bearer eyJa.b.c sb_secret_XYZ pin=1234 me@mail.se");
  expect(out).toContain("TypeError: failed https://x.test/api?[redacted]");
  for (const leak of ["abc", "eyJa.b.c", "sb_secret_XYZ", "1234", "me@mail.se"]) expect(out).not.toContain(leak);
});
