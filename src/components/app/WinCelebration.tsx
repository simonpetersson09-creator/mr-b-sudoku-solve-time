import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/sudoku/format";

type Props = { title: string; elapsedMs: number; big: boolean; onSkip: () => void };

/** Win moment: rays, confetti cannons, sparkles, bouncing title and a counting time pill. */
export function WinCelebration({ title, elapsedMs, big, onSkip }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState(0);
  const [box, setBox] = useState<{ top: number; bottom: number; cx: number; cy: number } | null>(null);

  useEffect(() => {
    const b = document.querySelector(".sdk-board")?.getBoundingClientRect();
    if (b) setBox({ top: b.top, bottom: b.bottom, cx: b.left + b.width / 2, cy: b.top + b.height / 2 });
  }, []);

  useEffect(() => {
    let raf = 0;
    const start = window.setTimeout(() => {
      const t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / 1100);
        setShown(elapsedMs * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      tick();
    }, 1500);
    return () => { window.clearTimeout(start); cancelAnimationFrame(raf); };
  }, [elapsedMs]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; g.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const gold = css.getPropertyValue("--game-gold").trim() || "goldenrod";
    const light = css.getPropertyValue("--game-gold-light").trim() || "gold";
    const teal = css.getPropertyValue("--primary").trim() || "teal";
    const cols = [light, gold, "rgba(255,245,210,1)", gold, teal, "rgba(255,255,255,1)"];
    type P = { x: number; y: number; vx: number; vy: number; w: number; h: number; rot: number; vr: number; fl: number; vf: number; c: string; rib: boolean };
    const parts: P[] = [];
    const burst = (x: number, y: number, ang: number, n: number, spd: number) => {
      for (let i = 0; i < n; i++) {
        const a = ang + (Math.random() - .5) * .9, v = spd * (.55 + Math.random() * .6);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 6 + Math.random() * 7, h: 9 + Math.random() * 9, rot: Math.random() * 6, vr: (Math.random() - .5) * .35, fl: Math.random() * 6, vf: .12 + Math.random() * .2, c: cols[i % cols.length], rib: Math.random() < .25 });
      }
    };
    const stars: { x: number; y: number; a: number; s: number }[] = [];
    const n = big ? 130 : 90;
    const cx = W / 2, cy = H * .42;
    let fired = 0, raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      if (fired === 0 && t > .5) { fired = 1; burst(-10, H * .78, -1.05, n, 17); burst(W + 10, H * .78, -2.09, n, 17); }
      if (fired === 1 && t > 1.05) {
        fired = 2;
        for (let i = 0; i < (big ? 80 : 50); i++) { const a = Math.random() * 6.28, v = 3 + Math.random() * 7; parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, w: 5, h: 7, rot: 0, vr: .2, fl: 0, vf: .2, c: cols[i % 4], rib: false }); }
      }
      if (t > .7 && Math.random() < .5) stars.push({ x: Math.random() * W, y: Math.random() * H * .9, a: 0, s: 2 + Math.random() * 4 });
      g.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += .32; p.vx *= .985; p.vy *= .985; p.x += p.vx + Math.sin(p.fl) * .6; p.y += p.vy; p.rot += p.vr; p.fl += p.vf;
        if (p.y > H + 40) continue;
        const sc = Math.cos(p.fl);
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, sc);
        g.globalAlpha = Math.max(0, Math.min(1, (H + 40 - p.y) / 80)); g.fillStyle = p.c;
        if (p.rib) g.fillRect(-2, -p.h, 4, p.h * 2.2); else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        if (Math.abs(sc) > .85) { g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(-p.w / 2, -p.h / 2, p.w, 2); }
        g.restore();
      }
      for (const s of stars) {
        s.a += .06; const al = Math.sin(s.a); if (al < 0) continue;
        g.save(); g.globalAlpha = al; g.translate(s.x, s.y); g.fillStyle = "rgba(255,246,208,1)"; g.shadowColor = light; g.shadowBlur = 12;
        g.beginPath(); for (let k = 0; k < 8; k++) { const rr = k % 2 ? s.s * .25 : s.s * 2, an = k * Math.PI / 4; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } g.fill(); g.restore();
      }
      if (t < 6) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [big]);

  return (
    <div className="sdk-win" onClick={onSkip} role="presentation">
      <div className="sdk-win-dim" />
      <div className="sdk-win-rays" style={box ? { top: box.cy } : undefined} />
      <canvas ref={canvas} className="sdk-win-canvas" />
      <div className="sdk-win-title" style={box ? { top: Math.max(8, box.top - 78) } : undefined} aria-live="polite">
        {[...title].map((ch, i) => <span key={i} style={{ animationDelay: `${.9 + i * .08}s` }}>{ch === " " ? "\u00a0" : ch}</span>)}
      </div>
      <div className="sdk-win-pill" style={box ? { top: box.bottom + 10 } : undefined}>⏱ {formatTime(shown)}</div>
    </div>
  );
}
