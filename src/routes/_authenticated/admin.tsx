import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminOverview } from "@/lib/backend/online.functions";
import { useTranslation } from "@/lib/i18n";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import { startAdminRefresh } from "@/lib/backend/admin-refresh";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Admin – Mr.B. Sudoku" },
      { name: "description", content: "Aktiva spelare, enheter, spel och fel." },
      { property: "og:title", content: "Admin – Mr.B. Sudoku" },
      { property: "og:description", content: "Adminpanel för Mr.B. Sudoku." },
    ],
  }),
  component: AdminPage,
});

type Data = Awaited<ReturnType<typeof adminOverview>>;

function AdminPage() {
  const { t } = useTranslation();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const active = useRef(false);
  const load = useCallback(async () => {
    if (pending.current || !active.current) return;
    pending.current = true;
    setLoading(true); setErr(null);
    try { const next = await adminOverview(); if (active.current) setD(next); }
    catch (error) { if (active.current) setErr(error instanceof Error && error.message === "err:forbidden" ? "noAdmin" : "genericError"); }
    finally { pending.current = false; if (active.current) setLoading(false); }
  }, []);
  useEffect(() => {
    active.current = true;
    void load();
    const stop = startAdminRefresh(() => { void load(); });
    return () => { active.current = false; stop(); };
  }, [load]);
  return (
    <main className="admin-screen min-h-screen max-h-screen overflow-y-auto overscroll-contain bg-background p-4 text-foreground md:p-8">
      <div className="w-full">
        {err && <><p role="alert" className="text-sm text-destructive">{t(err === "noAdmin" ? "noAdmin" : "genericError")}</p>{err === "noAdmin" && <Link to="/admin-login" className="home-action">{t("signIn")}</Link>}</>}
        {!d && !err && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
        {d && (<>
          <AdminAnalytics data={d} loading={loading} onRefresh={load} />
        </>)}
      </div>
    </main>
  );
}
