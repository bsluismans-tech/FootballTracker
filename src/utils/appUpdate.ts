import { useEffect, useRef } from 'react';

// Een web-app op het iPhone-beginscherm blijft in het geheugen hangen en herlaadt (bijna) nooit
// vanzelf, waardoor een nieuwe versie pas zichtbaar werd na opnieuw toevoegen aan het beginscherm.
// Daarom kijken we telkens de app (opnieuw) zichtbaar wordt, én om de paar minuten, of er een
// nieuwe build online staat: Vite geeft elke build een andere bestandsnaam (index-<hash>.js), dus
// verschilt die van de huidige, dan herladen we.
const CHECK_INTERVAL_MS = 5 * 60_000;
const BUNDLE_PATTERN = /\/assets\/index-[^"']+\.js/;

const getCurrentBundle = () =>
  document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')
    ?.src.match(BUNDLE_PATTERN)?.[0] ?? null;

const fetchLatestBundle = async () => {
  const response = await fetch('/', { cache: 'no-store' });
  if (!response.ok) return null;
  return (await response.text()).match(BUNDLE_PATTERN)?.[0] ?? null;
};

// canReload: false zolang herladen data zou kunnen kosten (tijdens het registreren van een
// wedstrijd staat er nog niet-opgeslagen data lokaal). Een gevonden update wordt dan bewaard en
// pas toegepast zodra canReload weer true is.
export const useAutoUpdate = (canReload: boolean) => {
  const updatePendingRef = useRef(false);
  const canReloadRef = useRef(canReload);
  canReloadRef.current = canReload;

  useEffect(() => {
    if (canReload && updatePendingRef.current) window.location.reload();
  }, [canReload]);

  useEffect(() => {
    const current = getCurrentBundle();
    if (!current) return; // dev-server: geen gebundelde build, niets te controleren

    const check = async () => {
      if (document.visibilityState !== 'visible' || updatePendingRef.current) return;
      try {
        const latest = await fetchLatestBundle();
        if (!latest || latest === current) return;
        updatePendingRef.current = true;
        if (canReloadRef.current) window.location.reload();
      } catch {
        // Offline of tijdelijk onbereikbaar: volgende keer opnieuw proberen.
      }
    };

    const onVisibilityChange = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(interval);
    };
  }, []);
};
