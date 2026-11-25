import React, { useEffect, useRef, useState } from 'react';

// Getal dat oploopt zodra het in beeld komt (eenmalig), en daarna bij een nieuwe waarde vanaf de
// vorige waarde verder telt. Wie "minder beweging" heeft ingesteld, ziet meteen het eindgetal.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Snel starten, zacht afremmen
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

interface Props {
  value: number;
  decimals?: number;
  duration?: number; // ms
  prefix?: string;
  suffix?: string;
  // Toon een + voor positieve getallen (bv. doelsaldo)
  signed?: boolean;
  className?: string;
}

export const CountUp: React.FC<Props> = ({ value, decimals = 0, duration = 900, prefix = '', suffix = '', signed = false, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));
  const [visible, setVisible] = useState(false);
  const fromRef = useRef(prefersReducedMotion() ? value : 0);

  // Pas beginnen tellen als het getal in beeld komt
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (prefersReducedMotion()) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    if (from === value) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const current = from + (value - from) * easeOutCubic(progress);
      setDisplay(current);
      fromRef.current = current;
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, value, duration]);

  const factor = Math.pow(10, decimals);
  const rounded = Math.round(display * factor) / factor;
  const text = rounded.toFixed(decimals);
  return (
    <span ref={ref} className={className}>
      {prefix}{signed && rounded > 0 ? '+' : ''}{text}{suffix}
    </span>
  );
};
