import { beforeEach, expect, it, vi } from "vitest";
import { logEventInput } from "./online-inputs";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), insert: vi.fn(), rows: [] as { id: string }[] }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: mocks.rpc, from: () => ({
  insert: mocks.insert,
  select() { return this; }, eq() { return this; }, limit: async () => ({ data: mocks.rows, error: null }),
}) } }));
import { logEventAction } from "./online-actions";
const context = { userId: "player-a", supabase: {} as never };
beforeEach(() => { mocks.rpc.mockReset().mockResolvedValue({ data: true, error: null }); mocks.insert.mockReset().mockResolvedValue({ error: null }); mocks.rows = []; });
it.each(["admin_pin_fail", "server_timing", "made_up"])("rejects forged event kind %s", kind => {
  expect(() => logEventInput({ kind, platform: "ios" })).toThrow("err:bad_action");
});
it("rejects web game finishes and missing game identifiers", () => {
  expect(() => logEventInput({ kind: "local_game", platform: "web", detail: { gid: "a", level: "easy", phase: "finish" } })).toThrow();
  expect(() => logEventInput({ kind: "local_game", platform: "ios", detail: { level: "easy", phase: "finish" } })).toThrow();
});
it("removes sensitive and nested fields without truncating serialized JSON", () => {
  expect(logEventInput({ kind: "error", platform: "ios", detail: { message: "oops", token: "secret", nested: { user: "private" } } }).detail).toEqual({ message: "oops" });
});
it("surfaces database write failure instead of acknowledging the report", async () => {
  mocks.insert.mockResolvedValue({ error: new Error("offline") });
  await expect(logEventAction({ context, data: logEventInput({ kind: "error", platform: "ios" }) })).rejects.toThrow("err:bad_action");
});
it("uses the existing atomic counter with an identity-bound error limit", async () => {
  await logEventAction({ context, data: logEventInput({ kind: "error", platform: "ios" }) });
  expect(mocks.rpc).toHaveBeenCalledWith("rate_hit", { _key: "report:player-a:error", _max: 30, _window_seconds: 60 });
});
it("blocks reports when the counter denies or fails", async () => {
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  await expect(logEventAction({ context, data: logEventInput({ kind: "ad", platform: "ios" }) })).rejects.toThrow("err:rate_limited");
  expect(mocks.insert).not.toHaveBeenCalled();
});
it("acknowledges an already stored game report without inserting another row", async () => {
  mocks.rows = [{ id: "existing" }];
  await expect(logEventAction({ context, data: logEventInput({ kind: "local_game", platform: "ios", detail: { gid: "game-a", phase: "finish", level: "easy" } }) })).resolves.toEqual({ ok: true });
  expect(mocks.insert).not.toHaveBeenCalled();
});
it('stores a delayed game finish on its original day, not receipt day', async () => {
  const data = logEventInput({ kind: 'local_game', platform: 'android', detail: { gid: 'offline-game', phase: 'finish', level: 'easy', occurredAt: '2026-10-31T22:30:00Z' } });
  await logEventAction({ context, data });
  expect(mocks.rpc).toHaveBeenCalledWith('insert_sudoku_game_report',expect.objectContaining({ _created_at: '2026-10-31T22:30:00.000Z',_user_id:'player-a' }));
});
it.each(['invalid', '2099-01-01T00:00:00Z', '1900-01-01T00:00:00Z'])('rejects unsafe original game timestamp %s', occurredAt => {
  expect(() => logEventInput({ kind: 'local_game', platform: 'android', detail: { gid: 'g', phase: 'finish', level: 'easy', occurredAt } })).toThrow('err:bad_action');
});