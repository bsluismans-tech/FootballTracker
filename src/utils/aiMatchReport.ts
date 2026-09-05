import type { Game, Player } from '../types';

const buildPrompt = (game: Game, players: Player[], ourGoals: number, opponentGoals: number): string => {
  const getName = (id: number | null | undefined) =>
    id != null ? players.find(p => p.id === id)?.name || null : null;

  const goalsByPlayer: Record<string, number> = {};
  const assistsByPlayer: Record<string, number> = {};
  game.quarters.forEach(q => {
    q.goalEvents.forEach(e => {
      const scorer = getName(e.scorerId);
      if (scorer) goalsByPlayer[scorer] = (goalsByPlayer[scorer] || 0) + 1;
      const assist = getName(e.assistId);
      if (assist) assistsByPlayer[assist] = (assistsByPlayer[assist] || 0) + 1;
    });
  });

  const listWithCounts = (counts: Record<string, number>) =>
    Object.entries(counts).map(([name, count]) => (count > 1 ? `${name} (${count}x)` : name)).join(', ');

  const scorersText = listWithCounts(goalsByPlayer) || 'niemand';
  const assistsText = listWithCounts(assistsByPlayer);

  const keeperNames = Array.from(
    new Set(game.quarters.map(q => getName(q.lineup?.keeper)).filter((n): n is string => !!n))
  );
  const totalSaves = game.quarters.reduce((sum, q) => sum + (q.saves || 0), 0);

  const matchup = game.isAway
    ? `${game.opponent || 'de tegenstander'} - Kaulille`
    : `Kaulille - ${game.opponent || 'de tegenstander'}`;
  const score = game.isAway ? `${opponentGoals}-${ourGoals}` : `${ourGoals}-${opponentGoals}`;

  return [
    'Schrijf een kort, enthousiast wedstrijdverslag (max. 4 zinnen, Nederlands) voor het jeugdvoetbalteam U10 Kaulille.',
    `Wedstrijd: ${matchup}, eindstand ${score}.`,
    `Doelpuntenmakers: ${scorersText}.`,
    assistsText ? `Assists: ${assistsText}.` : '',
    keeperNames.length ? `Keeper(s): ${keeperNames.join(', ')}, samen ${totalSaves} reddingen.` : '',
    'Schrijf in de wij-vorm, gericht op ouders die het verslag lezen. Gewoon lopende tekst, geen opsomming, geen titel, geen aanhef.',
  ]
    .filter(Boolean)
    .join('\n');
};

// Praat met onze eigen Cloudflare Worker (map "worker/" in dit project), die op zijn beurt
// Cloudflare Workers AI aanroept. Geen API-key in de app nodig — de Worker regelt dat zelf,
// gratis, zonder externe account. Zie worker/src/index.ts.
const AI_WORKER_URL = import.meta.env.VITE_AI_WORKER_URL || 'https://kaulille-ai-verslag-poc.footballtrackerpoc.workers.dev';

const REQUEST_TIMEOUT_MS = 20000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callWorker = async (prompt: string): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(AI_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ prompt }),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw Object.assign(new Error('Aanroep duurde te lang'), { timedOut: true });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw Object.assign(new Error(`Worker gaf status ${response.status}: ${errorText}`), { status: response.status });
  }

  const data = await response.json();
  const text = data?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`Worker gaf geen tekst terug: ${JSON.stringify(data)}`);
  }
  return text.trim();
};

// Genereert een wedstrijdverslag via onze eigen AI-Worker. Geeft null terug bij een
// blijvend mislukte aanroep, zodat de UI dan gewoon terugvalt op de standaard-placeholder.
export const generateMatchReport = async (
  game: Game,
  players: Player[],
  ourGoals: number,
  opponentGoals: number
): Promise<string | null> => {
  const prompt = buildPrompt(game, players, ourGoals, opponentGoals);

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callWorker(prompt);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const timedOut = (err as { timedOut?: boolean }).timedOut;
      const isRetryable = timedOut || (typeof status === 'number' && status >= 500);

      if (isRetryable && attempt < maxAttempts) {
        console.warn(`AI-verslag genereren: poging ${attempt} mislukt, nieuwe poging...`, err);
        await sleep(1500);
        continue;
      }
      console.warn('AI-verslag genereren mislukt:', err);
      return null;
    }
  }
  return null;
};
