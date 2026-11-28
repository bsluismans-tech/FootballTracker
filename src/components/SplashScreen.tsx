import React, { useEffect, useState } from 'react';

// Splashscreen bij het opstarten: het clublogo met daaronder de ploegnaam, daarna vervaagt alles
// naar de app. Tik om over te slaan.

const TOTAL_MS = 1800;
const LOGO_SIZE = 150;

interface Props {
  onDone: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onDone }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setLeaving(true), TOTAL_MS - 350),
      setTimeout(onDone, TOTAL_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const skip = () => {
    setLeaving(true);
    setTimeout(onDone, 250);
  };

  return (
    <div
      onClick={skip}
      aria-label="U10 Kaulille"
      role="img"
      // Zachte limoengroene gloed als radiaal verloop in de achtergrond zelf (geen blur-element: Safari
      // tekende dat in stukken achter de geanimeerde tekst).
      style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(198,244,50,0.12) 0, rgba(198,244,50,0.05) 140px, transparent 260px)' }}
      className={`fixed inset-0 z-[200] bg-navy flex flex-col items-center justify-center select-none transition-opacity duration-300 ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* clublogo-solid.png = het clublogo met de (in het origineel transparante) witte vlakken
          opgevuld, precies binnen de rand van het schild. Zo blijft het logo zichtbaar op navy,
          zonder dat er wit buiten het schild uitsteekt. */}
      <img
        src="/clublogo-solid.png"
        alt=""
        draggable={false}
        className="relative splash-logo drop-shadow-2xl"
        style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
      />

      <div className="relative mt-6 text-center splash-title">
        <p className="font-display text-4xl font-semibold text-white leading-none">U10 Kaulille</p>
        <p className="mt-2 text-sm font-medium text-volt">Voetbaltracker</p>
      </div>
    </div>
  );
};
