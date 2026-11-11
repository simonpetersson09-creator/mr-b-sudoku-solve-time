import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as client from "./online-client";

const mocks = vi.hoisted(() => ({ session: vi.fn(), origin: vi.fn() }));
vi.mock("@/lib/auth/player", () => ({ ensurePlayerSession: mocks.session }));
vi.mock("./origin", () => ({ nativeOnlineOrigin: mocks.origin }));
const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ access_token: "test-player-token", user: { id: "player-a" } });
  mocks.origin.mockReturnValue("https://mr-b-sudoku-solve-time.lovable.app");
  fetchMock.mockImplementation(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("native backend transport", () => {
  const profile = { display_name: "Sudoku", avatar: "🧩", country: "SE" };
  const cases = [
    ["getMe", () => client.getMe(), undefined],
    ["updateProfile", () => client.updateProfile({ data: profile }), profile],
    ["setAvatar", () => client.setAvatar({ data: { image: null } }), { image: null }],
    ["logEvent", () => client.logEvent({ data: { kind: "error", platform: "ios" } }), { kind: "error", platform: "ios" }],
    ["deletePlayerData", () => client.deletePlayerData({ data: {} }), {}],
    ["adminPinLogin", () => client.adminPinLogin({ data: { pin: "1234" } }), { pin: "1234" }],
    ["adminOverview", () => client.adminOverview(), undefined],
    ["adminAdDiagnostics", () => client.adminAdDiagnostics(), undefined],
    ["getMonthlyMostActive", () => client.getMonthlyMostActive(), undefined],
  ] as const;
  it.each(cases)("sends %s to Sudoku with the current app identity", async (operation, call, data) => {
    await expect(call()).resolves.toEqual({ ok: true });
    expect(mocks.session).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://mr-b-sudoku-solve-time.lovable.app/api/public/native");
    expect(init.headers.Authorization).toBe("Bearer test-player-token");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("omit");
    expect(init.redirect).toBe("error");
    expect(JSON.parse(init.body)).toEqual({ operation, ...(data === undefined ? {} : { data }) });
  });
  it("reuses a refreshed bearer on the next request", async () => {
    await client.getMe();
    mocks.session.mockResolvedValue({ access_token: "test-refreshed-token" });
    await client.adminOverview();
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer test-refreshed-token");
  });
  it("does not send any request when saved identity restoration fails", async () => {
    mocks.session.mockRejectedValue(new Error("storage unavailable"));
    await expect(client.deletePlayerData({ data: {} })).rejects.toThrow("storage unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects a missing bearer", async () => {
    mocks.session.mockResolvedValue({ access_token: "" });
    await expect(client.getMe()).rejects.toThrow("err:forbidden");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([401, 403])("preserves server access denial (%s) without retrying", async (status) => {
    fetchMock.mockResolvedValue(Response.json({ error: "err:forbidden" }, { status }));
    await expect(client.adminOverview()).rejects.toThrow("err:forbidden");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("preserves deletion failure and never retries the mutation", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "err:delete_failed" }, { status: 400 }));
    await expect(client.deletePlayerData({ data: {} })).rejects.toThrow("err:delete_failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("does not treat an HTML error page as a successful response", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Unavailable</html>", { status: 503 }));
    await expect(client.getMe()).rejects.toThrow("err:bad_action");
  });
  it("returns the server profile unchanged", async () => {
    const me = { userId: "player-a", profile: { display_name: "Sudoku" }, isAdmin: false };
    fetchMock.mockResolvedValue(Response.json(me));
    await expect(client.getMe()).resolves.toEqual(me);
  });
});