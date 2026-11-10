import { createFileRoute } from "@tanstack/react-router";

// Temporary preview of proposed play-screen effects (not linked from the app).
export const Route = createFileRoute("/effekter")({
  head: () => ({
    meta: [
      { title: "Effekter – förhandsvisning – Mr.B. Sudoku" },
      { name: "description", content: "Förhandsvisning av föreslagna effekter på spelsidan." },
      { property: "og:title", content: "Effekter – Mr.B. Sudoku" },
      { property: "og:description", content: "Förhandsvisning av föreslagna effekter på spelsidan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Effects,
});

const ROW = [5, 3, 0, 0, 7, 0, 1, 9, 8];

function Row({ fx, at }: { fx: string; at?: number[] }) {
  return (
    <div className="sdk-board" style={{ gridTemplateRows: "1fr", aspectRatio: "9 / 1" }}>
      {ROW.map((v, i) => (
        <div key={i} className={"sdk-cell " + (at && !at.includes(i) ? "" : fx)} data-r={8} data-c={i} data-given={v !== 0 && !(at?.includes(i))}>
          {at?.includes(i) ? (fx === "fx-wrong" ? 4 : 6) : v || ""}
        </div>
      ))}
    </div>
  );
}

function Card({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={`fx${n}`} className="rounded-2xl border border-border/40 bg-secondary/40 p-3">
      <p className="mb-2 font-display text-sm font-bold text-gold">{n}. {title}</p>
      {children}
    </section>
  );
}

function Effects() {
  return (
    <main className="app-screen">
      <div className="mx-auto flex max-w-md flex-col gap-3 py-4">
        <h1 className="brand-title text-2xl">Effekter</h1>
        <Card n={1} title="Siffran poppar in"><Row fx="fx-pop" at={[2]} /></Card>
        <Card n={2} title="Fel skakar och blinkar rött"><Row fx="fx-wrong" at={[3]} /></Card>
        <Card n={3} title="Guldvåg + konfetti vid vinst">
          <div className="relative overflow-hidden rounded-xl"><Row fx="fx-wave" />
            {Array.from({ length: 14 }, (_, i) => <span key={i} className="fx-confetti" style={{ left: `${i * 7 + 2}%`, animationDelay: `${(i % 5) * 0.25}s` }} />)}
          </div>
        </Card>
        <Card n={4} title="Sifferknappen klar">
          <div className="sdk-pad">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <div key={d} className={"sdk-key relative " + (d === 6 ? "fx-done" : "")}>{d}<small>{d === 6 ? "✓" : 3}</small></div>)}</div>
        </Card>
        <Card n={5} title="Mjuk markering"><Row fx="fx-soft" /></Card>
        <Card n={6} title="Ledtråden glöder"><Row fx="fx-glow" at={[5]} /></Card>
      </div>
    </main>
  );
}
