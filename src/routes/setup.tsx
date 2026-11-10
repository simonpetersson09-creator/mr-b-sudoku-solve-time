import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { LEVELS, GIVENS, newGame, type Level } from "@/lib/sudoku/engine";
import { LEVEL_KEY } from "@/lib/sudoku/format";
import { loadLevel, saveLevel, startNewGame } from "@/lib/player/storage";
import { randomId } from "@/lib/random-id";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Nytt spel – Mr.B. Sokudo" },
      { name: "description", content: "Välj nivå för ett nytt Sudoku: Lätt, Medel, Svår eller Expert." },
      { property: "og:title", content: "Nytt spel – Mr.B. Sokudo" },
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
  useEffect(() => setLevel(loadLevel()), []);

  const start = () => {
    setBusy(true);
    saveLevel(level);
    // Let the button show its busy state before the (short) generation runs.
    window.setTimeout(() => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      startNewGame(newGame(level, seed, randomId()));
      void navigate({ to: "/play" });
    }, 30);
  };

  return (
    <main className="app-screen">
      <div className="home-stack">
        <Link to="/" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft size={16} /> {t("back")}</Link>
        <h1 className="brand-title text-3xl">{t("newGameTitle")}</h1>
        <p className="mb-3 text-center text-sm text-muted-foreground">{t("chooseLevel")}</p>
        <div className="flex flex-col gap-[7px]">
          {LEVELS.map((l) => (
            <button key={l} aria-pressed={l === level} className={`home-action justify-between ${l === level ? "home-action-gold" : "home-action-ghost"}`} onClick={() => setLevel(l)}>
              <span>{t(LEVEL_KEY[l])}</span>
              <span className="text-xs font-medium opacity-75">{t("givensN", { n: GIVENS[l] })}</span>
            </button>
          ))}
        </div>
        <button className="home-action home-action-success mt-5" disabled={busy} onClick={start}>{busy ? t("loading") : t("startGame")}</button>
      </div>
    </main>
  );
}
