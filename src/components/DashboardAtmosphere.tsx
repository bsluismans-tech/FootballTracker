import React, { useEffect, useRef } from 'react';
import type { Weather } from '../utils/weather';

// Sfeerlaag van het startscherm, zoals in de Weer-app van iPhone: een vaste laag áchter de kaarten
// (de kaarten scrollen eroverheen) die tekent:
// - plukjes gras, die bij het scrollen trager meebewegen dan de kaarten (diepte/parallax) en bij
//   wind heen en weer wiegen;
// - het weer in Kaulille: regen die op de bovenrand van het scorebord spat, sneeuw die erop blijft
//   liggen, zon met zachte stralen, onweer met af en toe een flits.
// Wie "minder beweging" heeft ingesteld, ziet enkel het stilstaande gras.

// Plukje gras (6 sprietjes met afgeronde voet), voet op (0,0), ±13 eenheden hoog
const TUFT_PATH =
  'M-3.55 -0.90 Q-4.51 -4.20 -6.90 -6.90 Q-4.08 -3.90 -1.85 -0.90 Q-2.70 0.20 -3.55 -0.90Z ' +
  'M-2.35 0.20 Q-2.75 -5.30 -4.10 -9.80 Q-2.16 -4.80 -0.65 0.20 Q-1.50 1.30 -2.35 0.20Z ' +
  'M-1.25 0.90 Q-0.95 -6.25 -1.00 -12.10 Q-0.16 -5.60 0.45 0.90 Q-0.40 2.00 -1.25 0.90Z ' +
  'M-0.15 0.50 Q0.92 -5.55 2.30 -10.50 Q1.93 -5.00 1.55 0.50 Q0.70 1.60 -0.15 0.50Z ' +
  'M0.85 -0.20 Q2.62 -4.60 5.30 -8.20 Q3.83 -4.20 2.55 -0.20 Q1.70 0.90 0.85 -0.20Z ' +
  'M1.75 -1.00 Q3.87 -3.53 7.20 -5.60 Q5.18 -3.30 3.45 -1.00 Q2.60 0.10 1.75 -1.00Z';

// Plukjes op een tegel van 340×300 die zich herhaalt (x, y, schaal, gespiegeld)
const TILE_W = 340;
const TILE_H = 300;
const TUFTS: [number, number, number, boolean][] = [
  [44, 66, 1.55, false], [214, 44, 1.3, true], [300, 156, 1.45, false], [120, 218, 1.25, true], [254, 276, 1.5, false],
];
// Hoe snel het gras meebeweegt t.o.v. het scrollen (1 = even snel als de kaarten)
const PARALLAX = 0.35;
// Net als de grasstroken vervaagt het gras naar onder toe
const FADE_PX = 640;

interface Drop { x: number; y: number; len: number; speed: number }
interface Flake { x: number; y: number; r: number; speed: number; drift: number; phase: number }
interface Splash { x: number; y: number; vx: number; vy: number; life: number }

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Props {
  weather: Weather | null;
  // De kaart waarop regen spat en sneeuw blijft liggen (het scorebord)
  targetRef: React.RefObject<HTMLElement | null>;
}

export const DashboardAtmosphere: React.FC<Props> = ({ weather, targetRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = prefersReducedMotion();
    const tuft = new Path2D(TUFT_PATH);
    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const kind = weather?.kind ?? 'cloudy';
    const intensity = weather?.intensity ?? 0;
    const windy = !!weather?.windy || kind === 'storm';
    const raining = !reduced && (kind === 'rain' || kind === 'storm');
    const snowing = !reduced && kind === 'snow';
    const sunny = !reduced && kind === 'clear' && !!weather?.isDay;
    const animated = raining || snowing || sunny || (windy && !reduced);
    const windX = windy ? 2.2 : 0.4; // schuinte van regen/sneeuw

    const drops: Drop[] = raining
      ? Array.from({ length: Math.round(18 + 55 * intensity) }, () => ({
          x: Math.random() * width, y: Math.random() * height,
          len: 7 + Math.random() * 7, speed: 8 + Math.random() * 4,
        }))
      : [];
    const flakes: Flake[] = snowing
      ? Array.from({ length: Math.round(30 + 70 * intensity) }, () => ({
          x: Math.random() * width, y: Math.random() * height, r: 1.6 + Math.random() * 2,
          speed: 0.5 + Math.random() * 0.8, drift: 0.3 + Math.random() * 0.6, phase: Math.random() * Math.PI * 2,
        }))
      : [];
    const splashes: Splash[] = [];
    // Sneeuwlaagje op de bovenrand van het scorebord: hoogte per strookje van 4px
    const pile: number[] = [];
    let flashUntil = 0;
    let nextFlash = performance.now() + 4000 + Math.random() * 6000;

    const targetRect = () => {
      const r = targetRef.current?.getBoundingClientRect();
      // Enkel als de bovenrand in beeld is
      return r && r.top > 0 && r.top < height ? r : null;
    };

    const drawTufts = (t: number) => {
      const offset = (window.scrollY * PARALLAX) % TILE_H;
      for (let row = -1; row * TILE_H - offset < FADE_PX + TILE_H; row++) {
        for (let col = 0; col * TILE_W < width + TILE_W; col++) {
          for (const [tx, ty, s, flip] of TUFTS) {
            const x = col * TILE_W + tx;
            const y = row * TILE_H + ty - offset;
            const fade = 1 - y / FADE_PX;
            if (fade <= 0 || y < -20) continue;
            const sway = windy && !reduced ? Math.sin(t / 380 + x * 0.05) * 0.22 : 0;
            ctx.save();
            // Voet op (x, y); de sprietjes hellen met de wind mee (skew vanaf de voet)
            const dpr = canvas.width / width;
            ctx.setTransform(dpr * s * (flip ? -1 : 1), 0, dpr * s * sway, dpr * s, dpr * x, dpr * y);
            const grad = ctx.createLinearGradient(0, 1, 0, -13);
            grad.addColorStop(0, 'rgba(46,125,50,0)');
            grad.addColorStop(0.3, `rgba(46,125,50,${0.3 * fade})`);
            grad.addColorStop(1, `rgba(46,125,50,${0.3 * fade})`);
            ctx.fillStyle = grad;
            ctx.fill(tuft);
            ctx.restore();
          }
        }
      }
    };

    const drawSun = (t: number) => {
      const cx = width - 20;
      const cy = -20;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 320);
      glow.addColorStop(0, 'rgba(255,214,90,0.45)');
      glow.addColorStop(0.45, 'rgba(255,214,90,0.12)');
      glow.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, 360);
      // Langzaam draaiende stralen
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t / 20000);
      ctx.fillStyle = 'rgba(255,214,90,0.07)';
      for (let i = 0; i < 10; i++) {
        ctx.rotate((Math.PI * 2) / 10);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(420, -22);
        ctx.lineTo(420, 22);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    const drawRain = (rect: DOMRect | null) => {
      ctx.strokeStyle = 'rgba(60,90,150,0.22)';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const d of drops) {
        const nx = d.x - windX * (d.len / d.speed) * 2;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(nx, d.y - d.len);
        d.x += windX;
        d.y += d.speed;
        // Valt de druppel op de bovenrand van het scorebord? Dan spat hij daar uiteen.
        const hitsCard = rect && d.x > rect.left + 4 && d.x < rect.right - 4 && d.y >= rect.top && d.y - d.speed < rect.top;
        if (hitsCard) {
          for (let i = 0; i < 3; i++) {
            splashes.push({ x: d.x, y: rect!.top, vx: (Math.random() - 0.5) * 2.4, vy: -1.2 - Math.random() * 1.6, life: 1 });
          }
        }
        if (hitsCard || d.y > height + 20 || d.x > width + 20) {
          d.y = -20 - Math.random() * 80;
          d.x = Math.random() * (width + 60) - 60;
        }
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(60,90,150,0.35)';
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.25;
        s.life -= 0.06;
        if (s.life <= 0) { splashes.splice(i, 1); continue; }
        ctx.globalAlpha = s.life;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawSnow = (t: number, rect: DOMRect | null) => {
      // Sneeuwlaagje bijhouden op de breedte van het scorebord
      const buckets = rect ? Math.ceil(rect.width / 4) : 0;
      while (pile.length < buckets) pile.push(0);
      for (const f of flakes) {
        f.y += f.speed;
        f.x += Math.sin(t / 1000 + f.phase) * f.drift + windX * 0.35;
        const onCard = rect && f.x > rect.left && f.x < rect.right && f.y >= rect.top - 1 && f.y - f.speed < rect.top;
        if (onCard) {
          const i = Math.floor((f.x - rect!.left) / 4);
          pile[i] = Math.min(7, (pile[i] || 0) + 0.6);
        }
        if (onCard || f.y > height + 10) {
          f.y = -10;
          f.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.shadowColor = 'rgba(4,23,76,0.25)';
        ctx.shadowBlur = 2;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      // Het laagje zelf: een zachte witte rand bovenop de kaart (licht uitgevlakt)
      if (rect && pile.length) {
        ctx.beginPath();
        ctx.moveTo(rect.left + 6, rect.top + 1);
        for (let i = 0; i < pile.length; i++) {
          const h = ((pile[i - 1] ?? pile[i]) + pile[i] * 2 + (pile[i + 1] ?? pile[i])) / 4;
          ctx.lineTo(Math.min(rect.left + i * 4 + 2, rect.right - 6), rect.top + 1 - h);
        }
        ctx.lineTo(rect.right - 6, rect.top + 1);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.98)';
        ctx.shadowColor = 'rgba(4,23,76,0.22)';
        ctx.shadowBlur = 3;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    let frame = 0;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const rect = targetRect();
      if (sunny) drawSun(t);
      drawTufts(t);
      if (raining) drawRain(rect);
      if (snowing) drawSnow(t, rect);
      if (kind === 'storm' && !reduced) {
        if (t > nextFlash) {
          flashUntil = t + 140;
          nextFlash = t + 5000 + Math.random() * 9000;
        }
        if (t < flashUntil) {
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.fillRect(0, 0, width, height);
        }
      }
    };

    const loop = (t: number) => {
      if (!document.hidden) draw(t);
      frame = requestAnimationFrame(loop);
    };

    // Stilstaand gras hoeft enkel opnieuw getekend te worden bij scrollen of een ander formaat
    const redraw = () => { if (!animated) draw(performance.now()); };
    const onResize = () => { resize(); redraw(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', redraw, { passive: true });

    if (animated) frame = requestAnimationFrame(loop);
    else draw(performance.now());

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', redraw);
    };
  }, [weather, targetRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 w-screen h-screen"
      style={{ zIndex: -5 }}
    />
  );
};
