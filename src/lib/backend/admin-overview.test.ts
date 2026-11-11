import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ failure: "", range: vi.fn(), role: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (table: string) => {
  const query = {
    select() { return this; }, eq() { return this; }, in() { return this; }, gte() { return this; }, order() { return this; }, limit() { return this; },
    maybeSingle: async () => ({ data: null, error: null }),
    range: mocks.range,
    then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: [], error: mocks.failure === table ? { message: "unavailable" } : null }).then(resolve); },
  };
  return query;
} } }));
import { adminOverviewAction } from "./online-actions";
const context = { userId: "admin-a", supabase: { rpc: mocks.role } as never };
beforeEach(() => { mocks.failure = ""; mocks.role.mockReset().mockResolvedValue({ data: true, error: null }); mocks.range.mockReset().mockResolvedValue({ data: [], error: null }); });
it.each(["app_events", "profiles"])("never returns zero statistics after a %s read failure", async table => {
  mocks.failure = table;
  await expect(adminOverviewAction({ context })).rejects.toThrow("err:bad_action");
});
it("reads past the former 100000-row activity cutoff", async () => {
  const event = { kind: "heartbeat", user_id: "app-a", device_id: "phone-a", platform: "ios", detail: { sid: "a", seconds: 60 }, created_at: new Date().toISOString() };
  mocks.range.mockImplementation(async (offset: number) => ({ data: offset < 100000 ? Array(1000).fill(event) : [], error: null }));
  const result = await adminOverviewAction({ context });
  expect(mocks.range).toHaveBeenLastCalledWith(100000, 100999);
  expect(result.days.at(-1)?.appDevices).toBe(1);
});
it("requires the server role before reading statistics", async () => {
  mocks.role.mockResolvedValue({ data: false, error: null });
  await expect(adminOverviewAction({ context })).rejects.toThrow("err:forbidden");
  expect(mocks.range).not.toHaveBeenCalled();
});