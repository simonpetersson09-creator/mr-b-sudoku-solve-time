import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ failure: "", range: vi.fn(), profileRange: vi.fn(), role: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (table: string) => {
  const query = {
    select() { return this; }, eq() { return this; }, in() { return this; }, gte() { return this; }, lte() { return this; }, order() { return this; }, limit() { return this; },
    maybeSingle: async () => ({ data: null, error: null }),
    range: table === 'profiles' ? mocks.profileRange : mocks.range,
    then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: [], error: mocks.failure === table ? { message: "unavailable" } : null }).then(resolve); },
  };
  return query;
} } }));
import { adminOverviewAction } from "./online-actions";
vi.mock('./event-pages', () => ({ readEventPages: async () => {
  if(mocks.failure==='app_events')throw new Error('err:bad_action');
  const rows=[];
  for(let offset=0;;offset+=1000){const {data}=await mocks.range(offset,offset+999);rows.push(...data);if(data.length<1000)break;}
  return rows;
} }));
const context = { userId: "admin-a", supabase: { rpc: mocks.role } as never };
beforeEach(() => { mocks.failure = ""; mocks.role.mockReset().mockResolvedValue({ data: true, error: null }); mocks.range.mockReset().mockResolvedValue({ data: [], error: null }); mocks.profileRange.mockReset().mockImplementation(async () => ({ data: [], error: mocks.failure === 'profiles' ? new Error('unavailable') : null })); });
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
it('reads profiles beyond 10000 without truncating the app cohort', async () => {
  mocks.profileRange.mockImplementation(async (offset: number) => ({ data: offset < 11000 ? Array.from({ length: 1000 }, (_, n) => ({ id: `p-${offset+n}`, created_at: '2026-09-01', last_seen: '2026-09-01' })) : [], error: null }));
  await adminOverviewAction({ context });
  expect(mocks.profileRange).toHaveBeenLastCalledWith(11000, 11999);
});
it('returns app age, issue and post-match metrics in the admin day rows', async () => {
  const at = new Date().toISOString();
  const base = { user_id: 'app-a', device_id: 'phone-a', platform: 'ios', created_at: at };
  mocks.range.mockResolvedValue({ data: [
    { ...base, kind: 'session', detail: { sid: 'visit-a', seconds: 60, v: '1.0.0 (1)' } },
    { ...base, kind: 'error', detail: { v: '1.0.0 (1)' } },
    { ...base, kind: 'ad', detail: { name: 'post_match_exit', matchKey: 'game-a', completed: true, result: 'clicked' } },
    { ...base, kind: 'ad', detail: { name: 'post_match_exit', matchKey: 'game-a', completed: true, result: 'shown' } },
  ], error: null });
  const result = await adminOverviewAction({ context });
  expect(result.days.at(-1)).toEqual(expect.objectContaining({ avgAppAgeDays: 0, issues: 1, issueDevices: 1, postMatchShown: 1, postMatchOpportunities: 1 }));
});