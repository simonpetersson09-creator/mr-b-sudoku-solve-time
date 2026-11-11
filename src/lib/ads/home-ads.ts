/**
 * Yatzy HomePage App Open rules, ported unchanged:
 * - cold start: once per launch, preload immediately, try after 1.5 s, only on Home;
 * - Sudoku has no return ads: only one App Open opportunity per launch;
 * - leaving Home or backgrounding invalidates the pending opportunity.
 */
import { isAdMobAvailable, preloadAppOpenAd, showAppOpenAd } from "./admob";
import { trackEvent } from "./analytics";

export const STARTUP_AD_DELAY_MS = 1500;

let startupAdChecked = false;
let resumeHomeEpoch = 0;
let resumeWatcherInstalled = false;

const onStartScreen = () => window.location.pathname === "/" && document.visibilityState === "visible";

function installResumeAdWatcher() {
  if (resumeWatcherInstalled) return;
  resumeWatcherInstalled = true;
  void (async () => {
    const { App } = await import("@capacitor/app");
    await App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        resumeHomeEpoch++;
      }
    });
  })();
}

/** Call from Home's mount effect; returns cleanup. */
export function startHomeAds(): () => void {
  if (!isAdMobAvailable()) return () => { resumeHomeEpoch++; };
  installResumeAdWatcher();
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (!startupAdChecked) {
    startupAdChecked = true;
    const epoch = resumeHomeEpoch;
    void preloadAppOpenAd("startup");
    timer = setTimeout(async () => {
      if (await showAppOpenAd(() => !cancelled && epoch === resumeHomeEpoch && onStartScreen(), "startup")) trackEvent("daily_startup_ad");
    }, STARTUP_AD_DELAY_MS);
  }
  return () => { cancelled = true; clearTimeout(timer); resumeHomeEpoch++; };
}
