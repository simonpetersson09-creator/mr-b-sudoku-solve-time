import { useEffect, useState } from "react";
import { ChevronDown, Grid3x3, Timer, Trophy } from "lucide-react";
import { LEVELS } from "@/lib/sudoku/engine";
import { LEVEL_KEY, formatTime } from "@/lib/sudoku/format";
import { emptyStats, loadStats, type Stats } from "@/lib/player/storage";
import { useTranslation } from "@/lib/i18n";

/** How many grid columns a level card takes: written out so Tailwind keeps the classes. */
const SPAN_CLS = ["col-span-1", "col-span-2", "col-span-3"];

/** Home "your numbers": totals, plus best time per level when expanded. */
export function HomeStats() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [s, setS] = useState<Stats>(emptyStats);
  useEffect(() => setS(loadStats()), []);

  const played = LEVELS.reduce((n, l) => n + s[l].played, 0);
  const wins = LEVELS.reduce((n, l) => n + s[l].wins, 0);
  const bests = LEVELS.map((l) => s[l].bestMs).filter((x): x is number => x != null);
  const card = "flex min-h-[63px] flex-col items-center justify-center gap-0.5 py-2 sm:py-2.5 px-1.5 rounded-2xl bg-secondary/60 border border-border/50";

  return (
    <div className="relative w-full max-w-md space-y-2.5 px-5 pb-6 pt-4">
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="mb-1 flex w-full items-center justify-center gap-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t("statsTitle")} {s.year}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: t("statGamesShort"), value: String(played), icon: Grid3x3 },
          { label: t("statWins"), value: String(wins), icon: Trophy },
          { label: t("statBestTime"), value: bests.length ? formatTime(Math.min(...bests)) : "–", icon: Timer },
        ].map((stat) => (
          <div key={stat.label} className={card}>
            <stat.icon className="h-3 w-3 text-primary/70" />
            <span className="font-display text-lg font-black leading-none tabular-nums text-foreground sm:text-xl">{stat.value}</span>
            <span className="max-w-full truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>
      {expanded && (
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l, i) => {
            // The last level fills the rest of its row, so it never sits alone as a narrow card.
            const span = 3 - ((LEVELS.length - 1) % 3);
            const wide = i === LEVELS.length - 1 && span > 1;
            const best = s[l].bestMs != null ? formatTime(s[l].bestMs) : "–";
            if (wide) {
              return (
                <div key={l} className={`${SPAN_CLS[span - 1]} flex min-h-[63px] items-center justify-between gap-3 rounded-2xl border border-border/50 bg-secondary/60 px-3 py-2`}>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-gold">{t(LEVEL_KEY[l])}</span>
                  <span className="flex items-center gap-4">
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t("statBestTime")}</span>
                      <span className="font-display text-sm font-bold leading-none tabular-nums">{best}</span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t("statPlayed")}</span>
                      <span className="font-display text-sm font-bold leading-none tabular-nums">{s[l].played}</span>
                    </span>
                  </span>
                </div>
              );
            }
            return (
              <div key={l} className={card}>
                <span className="max-w-full truncate text-[9px] font-semibold uppercase tracking-wider text-gold">{t(LEVEL_KEY[l])}</span>
                <span className="font-display text-sm font-bold leading-none tabular-nums">{best}</span>
                <span className="text-[9px] text-muted-foreground tabular-nums">{s[l].played}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
