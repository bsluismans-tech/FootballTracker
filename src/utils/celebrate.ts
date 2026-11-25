// Kleine, afhankelijkheidsvrije feestanimaties: confetti op een tijdelijk canvas en een korte
// trilling. Geen geluid (bewuste keuze: ouders kijken vaak mee in stille situaties).

const COLORS = ['#C6F432', '#04174C', '#FFFFFF', '#0B2A72', '#C6F432'];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  rotation: number; spin: number;
  color: string;
  tilt: number; tiltSpeed: number;
}

/**
 * Laat confetti uit een punt op het scherm spatten (origin als fractie van de viewport).
 * Het canvas ruimt zichzelf op zodra alle deeltjes uit beeld zijn.
 */
export function burstConfetti(origin: { x: number; y: number } = { x: 0.5, y: 0.3 }, count = 140) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh',
    pointerEvents: 'none', zIndex: '100',
  });
  document.body.appendChild(canvas);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  ctx.scale(dpr, dpr);

  const ox = origin.x * width;
  const oy = origin.y * height;
  const particles: Particle[] = Array.from({ length: count }, () => {
    // Waaier naar boven, met wat spreiding naar links en rechts
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 7 + Math.random() * 9;
    return {
      x: ox, y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tilt: Math.random() * Math.PI,
      tiltSpeed: 0.05 + Math.random() * 0.1,
    };
  });

  const start = performance.now();
  const MAX_DURATION = 4000;

  const frame = (now: number) => {
    ctx.clearRect(0, 0, width, height);
    let alive = 0;
    for (const p of particles) {
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.28; // zwaartekracht
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.tilt += p.tiltSpeed;
      if (p.y < height + 20) alive++;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      // Cosinus van de "tilt" laat het papiertje omdraaien
      ctx.scale(1, Math.cos(p.tilt));
      ctx.fillStyle = p.color;
      // Witte deeltjes een dun navy randje geven zodat ze zichtbaar blijven op een lichte achtergrond
      if (p.color === '#FFFFFF') {
        ctx.strokeStyle = 'rgba(4,23,76,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive > 0 && now - start < MAX_DURATION) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  };
  requestAnimationFrame(frame);
}

/** Confetti vanuit het midden van een element (bv. de scorekaart). */
export function burstConfettiFrom(el: Element | null, count?: number) {
  if (!el) return burstConfetti(undefined, count);
  const r = el.getBoundingClientRect();
  burstConfetti({
    x: (r.left + r.width / 2) / window.innerWidth,
    y: (r.top + r.height / 2) / window.innerHeight,
  }, count);
}

/** Korte trilling (enkel ondersteund op Android; iOS negeert dit stil). */
export function vibrate(pattern: number | number[] = 40) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // niet ondersteund: geen probleem
  }
}
