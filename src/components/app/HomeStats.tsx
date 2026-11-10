import { useEffect, useRef, useState } from "react";
import { ChevronDown, Grid3x3, ShieldCheck } from "lucide-react";
import { LEVELS } from "@/lib/sudoku/engine";
import { LEVEL_KEY, formatTime } from "@/lib/sudoku/format";
import { emptyStats, loadStats, type Stats } from "@/lib/player/storage";
import { useTranslation } from "@/lib/i18n";

/** Grid columns for the level cards and how many of them a card may take. */
const COLS = 2;
/** Written out so Tailwind keeps the classes. */
const SPAN_CLS = ["col-span-1", "col-span-2", "col-span-3"];

/** Home "your numbers": totals, plus best time and games per level when expanded. */
export function HomeStats() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoBtnRef = useRef<HTMLButtonElement>(null);
  const infoBoxRef = useRef<HTMLDivElement>(null);
  const [s, setS] = useState<Stats>(emptyStats);
  useEffect(() => setS(loadStats()), []);

  // The explanation closes when you tap anywhere outside it.
  useEffect(() => {
    if (!infoOpen) return;
    const onDown = (e: Event) => {
      const n = e.target as Node;
      if (!infoBtnRef.current?.contains(n) && !infoBoxRef.current?.contains(n)) setInfoOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [infoOpen]);

  const played = LEVELS.reduce((n, l) => n + s[l].played, 0);
  const perfect = LEVELS.reduce((n, l) => n + s[l].perfect, 0);
  const card = "flex min-h-[63px] flex-col items-center justify-center gap-1 py-2 sm:py-2.5 px-1.5 rounded-2xl bg-secondary/60 border border-border/50";
  const numLabel = "text-[8px] font-semibold uppercase tracking-wider text-muted-foreground";
  const numValue = "font-display text-sm font-bold leading-none tabular-nums";

  /** One number with its meaning written above it. */
  const num = (label: string, value: string) => (
    <span className="flex flex-col items-center gap-0.5">
      <span className={numLabel}>{label}</span>
      <span className={numValue}>{value}</span>
    </span>
  );

  return (
    <div className="relative w-full max-w-md space-y-2.5 px-5 pb-6 pt-4">
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="mb-1 flex w-full items-center justify-center gap-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t("statsTitle")} {s.year}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: t("statGamesShort"), value: String(played), icon: Grid3x3, info: null as string | null },
          { label: t("statPerfect"), value: String(perfect), icon: ShieldCheck, info: t("statPerfectInfo") },
        ].map((stat) => (
          <div key={stat.label} className={`${card} relative`}>
            <stat.icon className="h-3 w-3 text-primary/70" />
            <span className="font-display text-lg font-black leading-none tabular-nums text-foreground sm:text-xl">{stat.value}</span>
            <span className="flex items-center gap-1">
              <span className="max-w-full truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
              {stat.info && (
                <button
                  ref={infoBtnRef}
                  type="button"
                  aria-label={t("statPerfectInfoLabel")}
                  aria-expanded={infoOpen}
                  onClick={() => setInfoOpen((v) => !v)}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-gold/70 text-[9px] font-black leading-none text-gold"
                >
                  !
                </button>
              )}
            </span>
            {stat.info && infoOpen && (
              <div
                ref={infoBoxRef}
                role="tooltip"
                className="absolute left-1/2 top-full z-30 mt-1.5 w-44 -translate-x-1/2 rounded-xl border border-border/60 bg-popover p-2 text-center text-[10px] leading-snug text-popover-foreground shadow-lg"
              >
                {stat.info}
              </div>
            )}
          </div>
        ))}
      </div>
      {expanded && (
        <div className="grid grid-cols-2 gap-2">
          {LEVELS.map((l, i) => {
            // The last level fills the rest of its row, so it never sits alone as a narrow card.
            const span = COLS - ((LEVELS.length - 1) % COLS);
            const wide = i === LEVELS.length - 1 && span > 1;
            const best = s[l].bestMs != null ? formatTime(s[l].bestMs) : "–";
            if (wide) {
              return (
                <div key={l} className={`${SPAN_CLS[span - 1]} flex min-h-[63px] items-center justify-between gap-3 rounded-2xl border border-border/50 bg-secondary/60 px-3 py-2`}>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-gold">{t(LEVEL_KEY[l])}</span>
                  <span className="flex items-center gap-4">
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t("statBestTime")}</span>
                      <span className={numValue}>{best}</span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t("statPlayed")}</span>
                      <span className={numValue}>{s[l].played}</span>
                    </span>
                  </span>
                </div>
              );
            }
            return (
              <div key={l} className={card}>
                <span className="max-w-full truncate text-[9px] font-semibold uppercase tracking-wider text-gold">{t(LEVEL_KEY[l])}</span>
                <span className="flex items-end gap-3">
                  {num(t("statBestTime"), best)}
                  {num(t("statPlayed"), String(s[l].played))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
