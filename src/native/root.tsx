import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, HeadContent, createRootRouteWithContext, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AndroidBackButton } from "@/components/AndroidBackButton";
import { SwipeBack } from "@/components/SwipeBack";
import { initDeviceId } from "@/lib/backend/telemetry";
import { startActivityTracking } from "@/lib/backend/activity";
import { reportAppError } from "@/lib/backend/report";
import { ensurePlayerSession } from "@/lib/auth/player";
import { syncProfileName } from "@/lib/player/profile-name";
import { supabase } from "@/lib/auth/client";
import { startNativeRuntime, RESUME_EVENT } from "@/lib/native/runtime";
import { installViewportSync } from "@/lib/native/viewport";
import { nativeDiagnostic } from "@/lib/native/diagnostics";
import { useDocumentLanguage } from '@/lib/i18n/document-language';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({ component: NativeRoot });
function NativeRoot() {
  useDocumentLanguage();
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let stopped = false;
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) document.documentElement.classList.add("native-ios");
    const viewportCleanup = installViewportSync();
    nativeDiagnostic("startup", "ready");
    const activity = startActivityTracking();
    const deviceReady = initDeviceId();
    const connect = () => {
      if (!navigator.onLine) { nativeDiagnostic("session", "offline"); return; }
      nativeDiagnostic("session", "started");
      ensurePlayerSession().then(() => {
        nativeDiagnostic("session", "ready");
        void syncProfileName();
        // Counts this phone as an app device in the admin panel once its durable number is known.
        void deviceReady.then(() => activity.ready());
        return router.invalidate();
      }).catch(() => nativeDiagnostic("session", "failed"));
    };
    connect();
    const onError = (e: ErrorEvent) => reportAppError(e.error ?? e.message, "onerror");
    const onRejection = (e: PromiseRejectionEvent) => reportAppError(e.reason, "unhandledrejection");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    startNativeRuntime(() => { void router.navigate({ to: "/" }); }).then(fn => { if (stopped) fn(); else cleanup = fn; }).catch(() => nativeDiagnostic("runtime", "failed"));
    window.addEventListener("online", connect);
    window.addEventListener(RESUME_EVENT, connect);
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => { stopped = true; activity.stop(); cleanup?.(); viewportCleanup(); data.subscription.unsubscribe(); window.removeEventListener("online", connect); window.removeEventListener(RESUME_EVENT, connect); window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, [router, queryClient]);
  return <QueryClientProvider client={queryClient}><HeadContent /><AndroidBackButton /><SwipeBack /><Outlet /><Toaster position="top-center" duration={6000} className="toaster group mrb-toaster" offset={{ top: "calc(var(--safe-top) + 12px)" }} mobileOffset={{ top: "calc(var(--safe-top) + 12px)" }} /></QueryClientProvider>;
}