import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), getMe: vi.fn(), profile: vi.fn(), avatar: vi.fn(), report: vi.fn(), remove: vi.fn(), admin: vi.fn(), diagnostics: vi.fn(), pin: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/backend/server-timing", () => ({ timed: (_name: string, fn: () => unknown) => fn() }));
vi.mock("@/lib/backend/online-actions", () => ({ getMeAction: mocks.getMe, updateProfileAction: mocks.profile, setAvatarAction: mocks.avatar, logEventAction: mocks.report, deletePlayerDataAction: mocks.remove, adminOverviewAction: mocks.admin, adminAdDiagnosticsAction: mocks.diagnostics, adminPinLoginAction: mocks.pin }));
import { Route } from "@/routes/api/public/native";
const handlers = (Route as unknown as { server: { handlers: { POST: (args: { request: Request }) => Promise<Response> } } }).server.handlers;
const post = (operation: string, data?: unknown, bearer = true, origin = "capacitor://localhost") => handlers.POST({ request: new Request("https://mr-b-sudoku-solve-time.lovable.app/api/public/native", { method: "POST", headers: { Origin: origin, ...(bearer ? { Authorization: "Bearer test-player-token" } : {}) }, body: JSON.stringify({ operation, data }) }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "player-a" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  for (const action of [mocks.getMe, mocks.profile, mocks.avatar, mocks.report, mocks.remove, mocks.admin, mocks.diagnostics, mocks.pin]) action.mockResolvedValue({ ok: true });
});
describe("native endpoint authentication and dispatch", () => {
  it.each(["getMe", "updateProfile", "setAvatar", "logEvent", "deletePlayerData", "adminOverview", "adminAdDiagnostics", "adminPinLogin", "getMonthlyMostActive"])("rejects unauthenticated %s before any action", async (operation) => {
    expect((await post(operation, {}, false)).status).toBe(401);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("rejects an invalid identity", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid token") });
    expect((await post("deletePlayerData", {})).status).toBe(401);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it.each(["capacitor://localhost", "http://localhost", "https://localhost"])("uses the verified caller for deletion from %s", async (origin) => {
    const response = await post("deletePlayerData", {}, true, origin);
    expect(response.status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledWith("test-player-token");
    expect(mocks.remove.mock.calls[0][0].context.userId).toBe("player-a");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });
  it.each([
    ["getMe", {}, mocks.getMe],
    ["updateProfile", { display_name: "Sudoku", avatar: "🧩", country: "SE" }, mocks.profile],
    ["setAvatar", { image: null }, mocks.avatar],
    ["logEvent", { kind: "error", platform: "android", deviceId: "device-a" }, mocks.report],
    ["adminOverview", {}, mocks.admin],
    ["adminAdDiagnostics", {}, mocks.diagnostics],
    ["adminPinLogin", { pin: "1234" }, mocks.pin],
  ])("dispatches authenticated %s with the same verified identity", async (operation, data, action) => {
    expect((await post(operation, data)).status).toBe(200);
    expect(action).toHaveBeenCalledTimes(1);
    expect(action.mock.calls[0][0].context.userId).toBe("player-a");
  });
  it("preserves server admin denial", async () => {
    mocks.admin.mockRejectedValue(new Error("err:forbidden"));
    const response = await post("adminOverview");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "err:forbidden" });
  });
  it("mirrors the monthly server operation", async () => {
    const response = await post("getMonthlyMostActive");
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("get_monthly_most_active", { _limit: 10 });
    expect(await response.json()).toEqual({ me: "player-a", rows: [] });
  });
  it("rejects foreign origins before authentication", async () => {
    expect((await post("getMe", {}, true, "https://attacker.example")).status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});