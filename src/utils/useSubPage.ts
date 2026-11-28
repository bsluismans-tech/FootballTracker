import { useEffect, useRef, useState } from 'react';

/**
 * Een "subpagina" binnen een scherm (bv. het detail van een wedstrijd of de fiche van een speler):
 * - `open(waarde)` toont de subpagina bovenaan en onthoudt waar je in het overzicht stond;
 * - `close()` gaat terug naar het overzicht, op dezelfde scrollpositie;
 * - de terug-knop/-veeg van de telefoon (of browser) sluit de subpagina ook, i.p.v. de app te
 *   verlaten: daarvoor voegen we bij het openen een stap toe aan de browsergeschiedenis.
 *
 * `initial` opent meteen een subpagina (bv. als er vanaf het startscherm op een wedstrijd getikt is).
 */
export function useSubPage<T>(initial: T | null = null) {
  const [selected, setSelected] = useState<T | null>(initial);
  const listScrollRef = useRef(0);
  const pushedHistoryRef = useRef(false);

  useEffect(() => {
    if (initial != null) {
      window.history.pushState({ subPage: true }, '');
      pushedHistoryRef.current = true;
    }
    const onPopState = () => {
      if (!pushedHistoryRef.current) return;
      pushedHistoryRef.current = false;
      setSelected(null);
      requestAnimationFrame(() => window.scrollTo(0, listScrollRef.current));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // Enkel bij het tonen van het scherm: `initial` is een startwaarde.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (value: T) => {
    listScrollRef.current = window.scrollY;
    setSelected(value);
    if (!pushedHistoryRef.current) {
      window.history.pushState({ subPage: true }, '');
      pushedHistoryRef.current = true;
    }
    window.scrollTo(0, 0);
  };

  const close = () => {
    if (pushedHistoryRef.current) {
      // Via de geschiedenis terug, zodat die in sync blijft; popstate sluit de subpagina.
      window.history.back();
    } else {
      setSelected(null);
      requestAnimationFrame(() => window.scrollTo(0, listScrollRef.current));
    }
  };

  return { selected, open, close };
}
