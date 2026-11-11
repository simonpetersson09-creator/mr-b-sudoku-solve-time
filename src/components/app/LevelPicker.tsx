import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { loadProgress } from "@/lib/player/storage";
import { isUnlocked, prevLevel, remainingFor, type Progress } from "@/lib/player/unlock";
import { LEVELS, type Level } from "@/lib/sudoku/engine";
import { LEVEL_KEY } from "@/lib/sudoku/format";
import { useTranslation } from "@/lib/i18n";

/** How hard each level is, 1 = easiest. Drives the meter bars. */
const DIFFICULTY: Record<Level, number> = { easy: 1, medium: 2, hard: 3, expert: 4, ultra: 5, impossible: 6, master: 7 };

/**
 * Centre-screen dialog for picking a level. Colour plus a rising meter bar
 * shows how hard each level is, so it reads without reading the words.
 */
export function LevelPicker({ onSelect, onClose, busy = false }: { onSelect: (level: Level) => void; onClose: () => void; busy?: boolean }) {
  const { t } = useTranslation();
  const [progress] = useState<Progress>(() => loadProgress());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("chooseLevel")}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-gold/25 bg-secondary p-4 shadow-lg animate-in fade-in zoom-in-95 duration-200"
      >
        <p className="mb-3 text-center font-display text-base font-bold text-foreground" role="status">{busy ? t("loading") : t("chooseLevel")}</p>
        <div className="flex flex-col gap-2">
          {LEVELS.map((l) => {
            const open = isUnlocked(progress, l);
            const prev = prevLevel(l);
            return (
            <button key={l} type="button" disabled={!open || busy} onClick={() => onSelect(l)} className={`lvl-btn lvl-${l}`}>
              <span className="flex min-w-0 flex-col items-start">
                <span className="lvl-name font-display flex items-center gap-1.5">{!open && <Lock size={14} />}{t(LEVEL_KEY[l])}</span>
                {!open && prev && <span className="lvl-lock">{t("lockedNeed", { n: remainingFor(progress, l), level: t(LEVEL_KEY[prev]) })}</span>}
              </span>
              <span className="lvl-meter" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <span key={n} className={`lvl-bar${n <= DIFFICULTY[l] ? " lvl-bar-on" : ""}`} />
                ))}
              </span>
            </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="mt-1 min-h-11 w-full rounded-2xl text-xs font-semibold text-muted-foreground transition-transform active:scale-[0.97]"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
