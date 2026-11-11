import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listen: vi.fn(async (_event: string, _handler: unknown) => ({ remove: vi.fn() })) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/app", () => ({ App: { addListener: mocks.listen } }));
vi.mock("@capacitor/network", () => ({ Network: { addListener: mocks.listen } }));
vi.mock("@capacitor/status-bar", () => ({ StatusBar: { setStyle: vi.fn(async () => {}) }, Style: { Dark: "DARK" } }));
vi.mock("@/lib/auth/client", () => ({ supabase: { auth: { startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn() } } }));
afterEach(() => vi.clearAllMocks());
it("leaves Android back exclusively to the confirmation-aware component", async () => {
  const { startNativeRuntime } = await import("./runtime");
  const cleanup = await startNativeRuntime(() => {});
  expect(mocks.listen.mock.calls.map(call => call[0])).toEqual(["appStateChange", "networkStatusChange"]);
  cleanup();
});
it("emits the explicit pause event on background and only resume on foreground", async () => {
  const { startNativeRuntime, PAUSE_EVENT, RESUME_EVENT } = await import("./runtime");
  const pause = vi.fn(), resume = vi.fn();
  window.addEventListener(PAUSE_EVENT, pause);
  window.addEventListener(RESUME_EVENT, resume);
  const cleanup = await startNativeRuntime(() => {});
  const handler = mocks.listen.mock.calls.find(call => call[0] === "appStateChange")?.[1];
  if (typeof handler !== "function") throw new Error("missing lifecycle handler");
  handler({ isActive: false });
  expect(pause).toHaveBeenCalledTimes(1);
  expect(resume).not.toHaveBeenCalled();
  handler({ isActive: true });
  expect(pause).toHaveBeenCalledTimes(1);
  expect(resume).toHaveBeenCalledTimes(1);
  cleanup(); window.removeEventListener(PAUSE_EVENT, pause); window.removeEventListener(RESUME_EVENT, resume);
});
it('a network return in native background cannot emit a foreground resume', async () => {
  const { startNativeRuntime, RESUME_EVENT } = await import('./runtime');
  const resume=vi.fn();window.addEventListener(RESUME_EVENT,resume);
  const cleanup=await startNativeRuntime(()=>{});
  const state=mocks.listen.mock.calls.find(c=>c[0]==='appStateChange')?.[1];
  const network=mocks.listen.mock.calls.find(c=>c[0]==='networkStatusChange')?.[1];
  if(typeof state!=='function'||typeof network!=='function')throw new Error('listeners');
  state({isActive:false});network({connected:true});expect(resume).not.toHaveBeenCalled();
  cleanup();window.removeEventListener(RESUME_EVENT,resume);
});