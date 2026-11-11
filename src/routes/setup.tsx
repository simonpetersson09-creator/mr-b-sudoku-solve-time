import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { LEVELS, GIVENS, type Level } from "@/lib/sudoku/engine";
import { createGame, prepareGame } from "@/lib/sudoku/generation";
import { LEVEL_KEY } from "@/lib/sudoku/format";
import { loadLevel, loadProgress, saveLevel, startNewGame } from "@/lib/player/storage";
import { emptyProgress, highestUnlocked, isUnlocked, prevLevel, remainingFor, type Progress } from "@/lib/player/unlock";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Nytt spel – Mr.B. Sudoku" },
      { name: "description", content: "Välj nivå för ett nytt Sudoku: Lätt, Medel, Svår, Expert, Ultraexpert, Omöjlig eller Mr.B Världsmästare." },
      { property: "og:title", content: "Nytt spel – Mr.B. Sudoku" },
      { property: "og:description", content: "Välj nivå för ett nytt Sudoku." },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [level, setLevel] = useState<Level>("easy");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    const l = loadLevel();
    setLevel(isUnlocked(p, l) ? l : highestUnlocked(p));
  }, []);

  useEffect(() => { prepareGame(level); }, [level]);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const game = await createGame(level);
      saveLevel(level);
      startNewGame(game);
      await navigate({ to: "/play" });
    } catch { toast.error(t("genericError")); }
    finally { setBusy(false); }
  };

  return (
    <main className="app-screen">
      <div className="home-stack">
        <Link to="/" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft size={16} /> {t("back")}</Link>
        <h1 className="brand-title text-3xl">{t("newGameTitle")}</h1>
        <p className="mb-3 text-center text-sm text-muted-foreground">{t("chooseLevel")}</p>
        <div className="flex flex-col gap-[7px]">
          {LEVELS.map((l) => {
            const open = isUnlocked(progress, l);
            const prev = prevLevel(l);
            return (
              <button key={l} aria-pressed={l === level} disabled={!open} className={`home-action justify-between ${l === level ? "home-action-gold" : "home-action-ghost"} ${open ? "" : "opacity-50"}`} onClick={() => setLevel(l)}>
                <span className="flex items-center gap-1.5">{!open && <Lock size={14} />}{t(LEVEL_KEY[l])}</span>
                <span className="text-xs font-medium opacity-75">{open || !prev ? t("givensN", { n: GIVENS[l] }) : t("lockedNeed", { n: remainingFor(progress, l), level: t(LEVEL_KEY[prev]) })}</span>
              </button>
            );
          })}
        </div>
        <button className="home-action home-action-success mt-5" disabled={busy} onClick={start}>{busy ? t("loading") : t("startGame")}</button>
      </div>
    </main>
  );
}
