import { beforeEach, afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  log: vi.fn(), serverDelete: vi.fn(async () => {}), signOut: vi.fn(async () => ({})),
  store: new Map<string, string>(), removeFails: false,
}));
const secure = {
  keys: async () => ({ value: [...m.store.keys()] }),
  get: async ({ key }: { key: string }) => ({ value: m.store.get(key) ?? "" }),
  set: async ({ key, value }: { key: string; value: string }) => { m.store.set(key, value); return {}; },
  remove: async ({ key }: { key: string }) => { if (m.removeFails) throw new Error("keychain busy"); m.store.delete(key); return {}; },
};
vi.mock("@/lib/backend/online.functions", () => ({ deletePlayerData: () => m.serverDelete(), logEvent: m.log }));
vi.mock("./online.functions", () => ({ logEvent: m.log }));
vi.mock("@/lib/auth/client", () => ({ supabase: { auth: { signOut: m.signOut } } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: async () => ({ version: "1.0.0", build: "2" }) } }));
vi.mock("capacitor-secure-storage-plugin", () => ({ SecureStoragePlugin: secure }));
import { deletePlayerData } from "./player/player-data";
import { deviceId, initDeviceId } from "./backend/telemetry";
import { redactSensitive } from "./backend/redact";
import { newGame, explainHint, PEERS } from "./sudoku/engine";

const DEV = "mrb-sudoku:v1:device-id";
const QKEY = "mrb-sudoku:v1:report-queue";
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); m.store.clear(); m.removeFails = false; m.log.mockReset(); m.serverDelete.mockReset(); m.serverDelete.mockResolvedValue(undefined); m.signOut.mockClear(); vi.resetModules(); });
afterEach(() => { vi.useRealTimers(); });
vi.setConfig({ testTimeout: 30_000 }); // fake-timer queue drains with dynamic imports are slow under full-suite load

// ---------- P1 ----------
const finish = (id: string) => ({ id, kind: "local_game", detail: { gid: id, phase: "finish", level: "easy" }, at: Date.now() });
// Load every module delivery imports before faking timers; module loading under fake timers can stall.
const warm = async () => { await Promise.all([import("./backend/report"), import("./backend/telemetry"), import("./backend/online.functions"), import("@capacitor/app"), import("@capacitor/core")]); vi.useFakeTimers(); };
const limit = () => Promise.reject(new Error("err:daily_finish_limit"));

it("P1: a finish over the daily limit stays queued while errors, ads and game starts are still sent", async () => {
  await warm();
  m.log.mockImplementation(({ data }) => data.kind === "local_game" && data.detail.phase === "finish" ? limit() : Promise.resolve({ ok: true }));
  localStorage.setItem(QKEY, JSON.stringify([finish("f1"),
    { id: "e", kind: "error", detail: { source: "x", message: "m" }, at: Date.now() },
    finish("f2"),
    { id: "a", kind: "ad", detail: { name: "shown" }, at: Date.now() },
    { id: "s", kind: "local_game", detail: { gid: "g", phase: "start", level: "easy" }, at: Date.now() }]));
  const { flushQueuedReports } = await import("./backend/report");
  let done = false; const p = flushQueuedReports().then(() => { done = true; });
  while (!done) { await vi.advanceTimersByTimeAsync(600); await new Promise((r) => setImmediate(r)); }
  await p;
  const q = JSON.parse(localStorage.getItem(QKEY) ?? "[]");
  expect(q.map((r: { id: string }) => r.id)).toEqual(["f1", "f2"]);
  // Only one finish attempt while blocked; the rest of the queue still went out.
  expect(m.log.mock.calls.map(([o]) => o.data.kind + ":" + (o.data.detail.phase ?? ""))).toEqual(["local_game:finish", "error:", "ad:", "local_game:start"]);
});

it("P1: deferred finishes are delivered once the limit allows, each exactly once", async () => {
  vi.useFakeTimers();
  let blocked = true;
  m.log.mockImplementation(({ data }) => blocked && data.detail.phase === "finish" ? limit() : Promise.resolve({ ok: true }));
  localStorage.setItem(QKEY, JSON.stringify([finish("f1"), finish("f2")]));
  const { flushQueuedReports } = await import("./backend/report");
  await flushQueuedReports();
  expect(JSON.parse(localStorage.getItem(QKEY) ?? "[]")).toHaveLength(2);
  blocked = false;
  await vi.advanceTimersByTimeAsync(62_000);
  expect(localStorage.getItem(QKEY)).toBeNull();
  const gids = m.log.mock.calls.filter(([o]) => !blocked).map(([o]) => o.data.detail.gid);
  expect(gids.filter((g) => g === "f2")).toHaveLength(1);
});

it("P1: concurrent flushes and reports queued mid-flush are not lost or double-sent", async () => {
  await warm();
  m.log.mockImplementation(({ data }) => data.detail.phase === "finish" ? limit() : Promise.resolve({ ok: true }));
  localStorage.setItem(QKEY, JSON.stringify([finish("f1")]));
  const r = await import("./backend/report");
  const a = r.flushQueuedReports(); const b = r.flushQueuedReports();
  r.reportLocalGame("start", { id: "g2", level: "easy" });
  r.reportLocalGame("finish", { id: "g2", level: "easy" });
  r.reportAppError(new Error("boom"), "test");
  await vi.advanceTimersByTimeAsync(3000); await Promise.all([a, b]);
  const q = JSON.parse(localStorage.getItem(QKEY) ?? "[]");
  expect(q.map((x: { detail: { gid: string } }) => x.detail.gid).sort()).toEqual(["f1", "g2"]);
  const sentStarts = m.log.mock.calls.filter(([o]) => o.data.detail.phase === "start");
  expect(sentStarts).toHaveLength(1);
  expect(m.log.mock.calls.filter(([o]) => o.data.kind === "error")).toHaveLength(1);
});

it("P1: other failures (offline) still stop the flush without dropping anything", async () => {
  m.log.mockRejectedValue(new Error("err:rate_limited"));
  localStorage.setItem(QKEY, JSON.stringify([finish("f1"), { id: "e", kind: "error", detail: { message: "m" }, at: Date.now() }]));
  const { flushQueuedReports } = await import("./backend/report");
  await flushQueuedReports();
  expect(m.log).toHaveBeenCalledOnce();
  expect(JSON.parse(localStorage.getItem(QKEY) ?? "[]")).toHaveLength(2);
});

// ---------- P2 ----------
const candidates = (vals: number[], i: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !PEERS[i].some((p) => vals[p] === d));

it("P2: a cell with a single candidate (any digit) is found as a naked single", () => {
  for (let target = 1; target <= 9; target++) {
    const g = newGame("easy", 100 + target, "p2");
    const i = g.solution.findIndex((d, k) => d === target && g.values[k] === 0);
    const values = g.solution.slice(); values[i] = 0;
    const h = explainHint({ ...g, values }, null)!;
    expect(h).toMatchObject({ cell: i, digit: target, kind: "naked" });
  }
});

it("P2: hints without a selected cell point at a logically forced cell", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = newGame(seed % 2 ? "easy" : "hard", seed, "p2b");
    const h = explainHint(g, null)!;
    expect(g.values[h.cell]).toBe(0);
    expect(h.digit).toBe(g.solution[h.cell]);
    const c = candidates(g.values, h.cell);
    expect(c).toContain(h.digit);
    if (h.kind === "naked") expect(c).toEqual([h.digit]);
    if (h.kind === "hidden") expect(h.unit.filter((k) => g.values[k] === 0 && candidates(g.values, k).includes(h.digit))).toEqual([h.cell]);
  }
});

// ---------- P3 ----------
it("P3: JSON fields, quoted values and Basic authorization are masked", () => {
  expect(redactSensitive('{"password":"hunter 2","refresh_token":"abc","ok":1}')).toBe('{"password":"[redacted]","refresh_token":"[redacted]","ok":1}');
  expect(redactSensitive("token: 'a b c'")).toBe("token: '[redacted]'");
  expect(redactSensitive('secret="x y"')).toBe('secret="[redacted]"');
  expect(redactSensitive("Authorization: Basic dXNlcjpwYXNz")).toBe("Authorization: Basic [redacted]");
  expect(redactSensitive("https://u:p@host.se/a")).toBe("https://[redacted]@host.se/a");
  expect(redactSensitive("pin=1234&x=1")).toBe("pin=[redacted]&x=1");
});

it("P3: harmless error codes and diagnostics are kept", () => {
  for (const t of ["code=23505", "err:rate_limited", "duplicate key value violates unique constraint", "auth: session missing", "key: gid", "TypeError: x is undefined at play.tsx:12"])
    expect(redactSensitive(t)).toBe(t);
});

// ---------- P4-P5 ----------
it("P4: the deleted device number never returns even when secure storage removal fails", async () => {
  const old = await initDeviceId();
  expect(m.store.get(DEV)).toBe(old);
  m.removeFails = true;
  await deletePlayerData();
  expect(m.store.get(DEV)).not.toBe(old); // overwritten instead
  m.store.set(DEV, old); // even if the overwrite had also failed
  expect(await initDeviceId()).not.toBe(old);
  expect(deviceId()).not.toBe(old);
});

it("P5: one failing local storage step does not stop the remaining steps", async () => {
  const old = deviceId();
  localStorage.setItem("mrb-sudoku:v1:saves", "x"); localStorage.setItem("mrb-sudoku:v1:stats", "y");
  m.signOut.mockRejectedValueOnce(new Error("storage"));
  const orig = Storage.prototype.removeItem;
  const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (this: Storage, k: string) {
    if (k === "mrb-sudoku:v1:saves") throw new Error("quota"); return orig.call(this, k);
  });
  await expect(deletePlayerData()).resolves.toBeUndefined();
  spy.mockRestore();
  expect(localStorage.getItem("mrb-sudoku:v1:stats")).toBeNull();
  expect(deviceId()).not.toBe(old);
});

it("P5: nothing local is erased before the server confirmed", async () => {
  const old = deviceId(); localStorage.setItem("mrb-sudoku:v1:stats", "y");
  m.serverDelete.mockRejectedValueOnce(new Error("offline"));
  await expect(deletePlayerData()).rejects.toThrow();
  expect(localStorage.getItem("mrb-sudoku:v1:stats")).toBe("y");
  expect(deviceId()).toBe(old);
  expect(m.signOut).not.toHaveBeenCalled();
});
