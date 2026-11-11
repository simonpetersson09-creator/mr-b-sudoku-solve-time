import { afterEach, expect, it, vi } from "vitest";
import { ADMIN_REFRESH_MS, startAdminRefresh } from "./admin-refresh";

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it("refreshes visible admin every minute and stops after disposal", () => {
  vi.useFakeTimers();
  const refresh = vi.fn(); const stop = startAdminRefresh(refresh);
  vi.advanceTimersByTime(ADMIN_REFRESH_MS - 1); expect(refresh).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1); expect(refresh).toHaveBeenCalledTimes(1);
  stop(); vi.advanceTimersByTime(ADMIN_REFRESH_MS); window.dispatchEvent(new Event("focus"));
  expect(refresh).toHaveBeenCalledTimes(1);
});
it("does not poll hidden/offline but catches up on visibility, network and native return", () => {
  vi.useFakeTimers();
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  const refresh = vi.fn(); const stop = startAdminRefresh(refresh);
  vi.advanceTimersByTime(ADMIN_REFRESH_MS); expect(refresh).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible"); document.dispatchEvent(new Event("visibilitychange"));
  expect(refresh).toHaveBeenCalledTimes(1);
  online.mockReturnValue(false); vi.advanceTimersByTime(ADMIN_REFRESH_MS); expect(refresh).toHaveBeenCalledTimes(1);
  online.mockReturnValue(true); window.dispatchEvent(new Event("online")); window.dispatchEvent(new Event("mrb-sudoku:resume"));
  expect(refresh).toHaveBeenCalledTimes(3); stop();
});