/** Native distribution information used only to keep TestFlight out of admin activity metrics. */
let testFlightPromise: Promise<boolean> | null = null;

export function isTestFlight(): Promise<boolean> {
  testFlightPromise ??= (async () => {
    try {
      const { Capacitor, registerPlugin } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return false;
      const plugin = registerPlugin<{ isTestFlight(): Promise<{ testFlight?: boolean }> }>("AppEnvironment");
      const result = await plugin.isTestFlight();
      return result.testFlight === true;
    } catch {
      // Older iOS packages have no environment plugin; explicit owner/test exclusions still apply.
      return false;
    }
  })();
  return testFlightPromise;
}

export function testFlightDetail(testFlight: boolean) {
  return testFlight ? { testFlight: true as const } : {};
}
