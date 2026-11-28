import { useEffect, useState } from 'react';

// Het actuele weer in Kaulille, voor de sfeerlaag op het startscherm (regen, sneeuw, zon, wind).
// Bron: Open-Meteo (gratis, geen account of sleutel nodig). We sturen enkel de vaste coördinaten
// van Kaulille mee, niets over de gebruiker. Het resultaat wordt 20 minuten bewaard in de browser.

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm';

export interface Weather {
  kind: WeatherKind;
  intensity: number; // 0..1, hoe hard het regent/sneeuwt
  windy: boolean;
  isDay: boolean;
}

const KAULILLE = { lat: 51.19, lon: 5.52 };
const URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${KAULILLE.lat}&longitude=${KAULILLE.lon}` +
  '&current=weather_code,wind_speed_10m,is_day&timezone=Europe%2FBrussels';
const CACHE_KEY = 'weatherKaulille:v1';
const CACHE_MS = 20 * 60 * 1000;
const WINDY_KMH = 25;

// WMO-weercodes (zoals Open-Meteo ze gebruikt) omzetten naar wat we tekenen
function fromCode(code: number): { kind: WeatherKind; intensity: number } {
  if (code <= 1) return { kind: 'clear', intensity: 0 };
  if (code <= 48) return { kind: 'cloudy', intensity: 0 }; // bewolkt en mist
  if (code <= 57) return { kind: 'rain', intensity: 0.35 }; // motregen
  if (code <= 67) return { kind: 'rain', intensity: code >= 65 ? 1 : code >= 63 ? 0.75 : 0.5 };
  if (code <= 77) return { kind: 'snow', intensity: code >= 75 ? 1 : code >= 73 ? 0.7 : 0.45 };
  if (code <= 82) return { kind: 'rain', intensity: code === 82 ? 1 : code === 81 ? 0.8 : 0.55 }; // buien
  if (code <= 86) return { kind: 'snow', intensity: code === 86 ? 1 : 0.6 }; // sneeuwbuien
  return { kind: 'storm', intensity: 1 }; // onweer
}

// Om de effecten te kunnen bekijken als het droog is: ?weer=regen|sneeuw|zon|onweer|bewolkt,
// eventueel gecombineerd met wind, bv. ?weer=sneeuw,wind (of enkel ?weer=wind).
function overrideFromUrl(): Weather | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('weer');
  if (!v) return null;
  const parts = v.toLowerCase().split(',').map(p => p.trim());
  const kinds: Record<string, Pick<Weather, 'kind' | 'intensity'>> = {
    regen: { kind: 'rain', intensity: 0.6 },
    sneeuw: { kind: 'snow', intensity: 0.8 },
    zon: { kind: 'clear', intensity: 0 },
    onweer: { kind: 'storm', intensity: 1 },
    bewolkt: { kind: 'cloudy', intensity: 0 },
  };
  const base = parts.map(p => kinds[p]).find(Boolean) ?? kinds.bewolkt;
  const windy = parts.includes('wind') || base.kind === 'storm';
  if (!parts.some(p => p in kinds || p === 'wind')) return null;
  return { ...base, windy, isDay: true };
}

export function useWeather(): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(() => {
    const override = overrideFromUrl();
    if (override) return override;
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.at < CACHE_MS) return cached.weather as Weather;
    } catch {
      // geen opslag beschikbaar: gewoon opnieuw ophalen
    }
    return null;
  });

  useEffect(() => {
    if (weather || overrideFromUrl()) return;
    let cancelled = false;
    fetch(URL)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        const current = data?.current;
        if (cancelled || !current) return;
        const { kind, intensity } = fromCode(Number(current.weather_code));
        const result: Weather = {
          kind,
          intensity,
          windy: Number(current.wind_speed_10m) >= WINDY_KMH,
          isDay: current.is_day === 1,
        };
        setWeather(result);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), weather: result }));
        } catch {
          // niet erg
        }
      })
      .catch(() => {
        // Geen weer (bv. offline): de sfeerlaag toont dan enkel het gras.
      });
    return () => { cancelled = true; };
  }, [weather]);

  return weather;
}
