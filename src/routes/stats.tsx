import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Flame } from "lucide-react";
import { supabase } from "@/lib/auth/client";
import { getMonthlyMostActive } from "@/lib/backend/online.functions";
import { readPageCache, writePageCache } from "@/lib/page-cache";
import { flag } from "@/lib/backend/profile-options";
import { PlayerAvatar } from "@/components/app/PlayerAvatar";
import { LEVELS } from "@/lib/sudoku/engine";
import { LEVEL_KEY, formatTime } from "@/lib/sudoku/format";
import { loadStats, type Stats } from "@/lib/player/storage";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Statistik – Mr.B. Sudoku" },
      { name: "description", content: "Spelade Sudoku, vinster och bästa tid per nivå." },
      { property: "og:title", content: "Statistik – Mr.B. Sudoku" },
      { property: "og:description", content: "Spelade Sudoku, vinster och bästa tid per nivå." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { t } = useTranslation();
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => setS(loadStats()), []);
  return (
    <main className="app-screen">
      <div className="home-stack">
        <Link to="/" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft size={16} /> {t("back")}</Link>
        <h1 className="brand-title mb-3 text-3xl">{t("statsTitle")}</h1>
        {s && (
          <section className="overflow-hidden rounded-2xl border border-border/40 bg-secondary/50 text-sm">
            <div className="grid grid-cols-[1fr_repeat(4,3.6rem)] gap-1 px-3 pb-1 pt-2 text-right text-[10px] text-muted-foreground">
              <span />
              <span>{t("statPlayed")}</span><span>{t("statWins")}</span><span>{t("statBestTime")}</span><span>{t("statAvgTime")}</span>
            </div>
            {LEVELS.map((l) => {
              const x = s[l];
              return (
                <div key={l} className="grid grid-cols-[1fr_repeat(4,3.6rem)] items-center gap-1 border-t border-border/20 px-3 py-1.5 text-right font-display tabular-nums">
                  <span className="truncate text-left font-sans text-[12px] font-bold uppercase tracking-wide text-gold">{t(LEVEL_KEY[l])}</span>
                  <span className="font-bold">{x.played}</span>
                  <span className="font-bold">{x.wins}</span>
                  <span>{x.bestMs != null ? formatTime(x.bestMs) : "–"}</span>
                  <span>{x.played ? formatTime(x.totalMs / x.played) : "–"}</span>
                </div>
              );
            })}
          </section>
        )}
        <p className="mt-1 px-2 text-[11px] text-muted-foreground">{t("statsNote")}</p>
        <MonthlyMostActive />
      </div>
    </main>
  );
}

type Board = Awaited<ReturnType<typeof getMonthlyMostActive>>;

/** Same layout as Ludo/Yatzy's "Månadens flitigaste": finished Sudoku games this month, top 10. */
function MonthlyMostActive() {
  const { t, lang } = useTranslation();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const cached = readPageCache<Board>("stats-monthly");
    if (cached) { setBoard(cached); setLoading(false); }
    void supabase.auth.getSession().then(({ data }) => (data.session ? getMonthlyMostActive() : null))
      .then((b) => { if (alive && b) { setBoard(b); writePageCache("stats-monthly", b); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const rows = board?.rows ?? [];
  return (
    <section className="mt-5 space-y-2">
      <div className="flex items-center gap-1.5 px-2">
        <Flame className="h-4 w-4 text-gold" />
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">{t("hofGamesTitle")}</p>
      </div>
      <p className="-mt-1 px-2 text-[11px] text-muted-foreground/70">{t("hofGamesSubtitle")}</p>
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-secondary/50">
        <div className="flex justify-end gap-3 px-3 pb-1 pt-2 text-[10px] text-muted-foreground">
          <span className="w-14 text-right">24h</span>
          <span className="w-12 text-right">{t("hofGames")}</span>
        </div>
        {loading && rows.length === 0 && <div className="p-4 text-sm text-muted-foreground">{t("loading")}</div>}
        {!loading && rows.length === 0 && <div className="p-4 text-sm text-muted-foreground">{t("hofEmpty")}</div>}
        {rows.map((p, i) => (
          <div key={p.user_id} className={`flex items-center gap-2.5 px-3 py-2 ${i > 0 ? "border-t border-border/20" : ""} ${p.user_id === board?.me ? "bg-primary/10" : i < 3 ? "bg-gold/5" : ""}`}>
            <span className="w-7 shrink-0 text-center font-display font-bold tabular-nums text-muted-foreground">
              {i < 3 ? <span className="text-2xl" aria-hidden="true">{["🥇", "🥈", "🥉"][i]}</span> : i + 1}
            </span>
            <PlayerAvatar emoji={p.avatar} image={p.avatar_image} className="h-7 w-7 bg-secondary text-sm" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.display_name} {flag(p.country)}</p></div>
            <p className="w-14 shrink-0 text-right font-display text-base font-bold tabular-nums text-gold">{p.games_24h ? `+ ${p.games_24h.toLocaleString(lang)}` : "—"}</p>
            <p className="w-12 shrink-0 text-right font-display text-lg font-bold tabular-nums text-primary">{p.games.toLocaleString(lang)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
