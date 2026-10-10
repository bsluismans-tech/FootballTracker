import { useEffect, useState } from 'react';
import {
  collection, deleteDoc, doc, getCountFromServer, query, serverTimestamp, setDoc, Timestamp, where,
} from 'firebase/firestore';
import { db } from '../firebase';

// Elke kijker op het Dashboard schrijft periodiek een "heartbeat" naar
// games/{gameId}/viewers/{viewerId}. Wie de laatste ACTIVE_WINDOW_MS iets van zich liet horen,
// telt als meekijker. We tellen via een count-aggregatie (1 read per opvraging) i.p.v. een
// real-time listener, anders kost elke heartbeat een read bij álle kijkers — zo blijven we
// ruim binnen het gratis Firestore-quotum.
const HEARTBEAT_MS = 30_000;
const ACTIVE_WINDOW_MS = 75_000;

// crypto.randomUUID bestaat enkel in een "secure context" (https/localhost), niet bij lokaal
// testen via http://<ip>:5173 op een gsm — daarom een eenvoudige fallback.
const randomId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// Vaste id per browser, zodat meerdere tabbladen/herladen als één persoon tellen.
const getViewerId = () => {
  const key = 'liveViewerId';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return randomId();
  }
};

export const useLiveViewerCount = (gameId: number | null): number | null => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (gameId == null) {
      setCount(null);
      return;
    }

    const viewersRef = collection(db, 'games', gameId.toString(), 'viewers');
    const myRef = doc(viewersRef, getViewerId());

    const beat = async () => {
      // Enkel meetellen als de pagina effectief zichtbaar is (niet in een achtergrond-tab).
      if (document.visibilityState !== 'visible') return;
      try {
        await setDoc(myRef, { lastSeen: serverTimestamp() });
        const since = Timestamp.fromMillis(Date.now() - ACTIVE_WINDOW_MS);
        const snapshot = await getCountFromServer(query(viewersRef, where('lastSeen', '>', since)));
        setCount(snapshot.data().count);
      } catch (error) {
        console.error('Fout bij bijhouden meekijkers:', error);
      }
    };

    const leave = () => { deleteDoc(myRef).catch(() => {}); };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') beat();
      else leave();
    };

    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', leave);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, [gameId]);

  return count;
};
