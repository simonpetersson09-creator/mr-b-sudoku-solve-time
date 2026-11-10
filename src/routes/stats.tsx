import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
        {s && LEVELS.map((l) => {
          const x = s[l];
          const rows: [string, string][] = [
            [t("statPlayed"), String(x.played)],
            [t("statWins"), String(x.wins)],
            [t("statBestTime"), x.bestMs != null ? formatTime(x.bestMs) : "–"],
            [t("statAvgTime"), x.played ? formatTime(x.totalMs / x.played) : "–"],
          ];
          return (
            <section key={l} className="mb-3 overflow-hidden rounded-2xl border border-border/40 bg-secondary/50">
              <p className="px-3 pt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gold">{t(LEVEL_KEY[l])}</p>
              <div className="grid grid-cols-4 gap-1 px-2 pb-2.5 pt-1 text-center">
                {rows.map(([k, v]) => (
                  <div key={k}><p className="font-display text-lg font-bold tabular-nums">{v}</p><p className="text-[11px] text-muted-foreground">{k}</p></div>
                ))}
              </div>
            </section>
          );
        })}
        <p className="px-2 text-xs text-muted-foreground">{t("statsNote")}</p>
      </div>
    </main>
  );
}
