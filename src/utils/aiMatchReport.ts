import type { Game, Player } from '../types';

// Gratis Gemini-tier, rechtstreeks vanuit de browser aangeroepen (geen backend nodig).
// De API-key wordt via een build-time env var meegegeven en zit dus zichtbaar in de
// publieke bundel. Idealiter wordt de key domein-beperkt (net als de publieke Firebase-key
// in firebase.ts), maar AI Studio-keys ondersteunen geen "Application restrictions:
// Websites" — zie .env.example. Beperk de key minstens tot de Generative Language API
// via "API restrictions" in Google Cloud Console, zodat een gelekte key nergens anders
// mee kan bellen (het gratis Gemini-quotum misbruiken is dan het enige resterende risico).
const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Sommige netwerken (firewall/VPN/proxy) blokkeren POST-verzoeken naar dit endpoint stil —
// de browser blijft dan eindeloos wachten op een antwoord dat nooit komt. Zonder timeout zou
// de "Genereer AI-verslag"-knop in dat geval voor altijd blijven laden. Zie ai-match-report-gemini.md.
const REQUEST_TIMEOUT_MS = 15000;

// Eén aanroep naar Gemini. Geeft de tekst terug, of gooit een Error met daarin de
// HTTP-status (zodat de retry-logica hierboven kan beslissen of het de moeite is
// om het opnieuw te proberen).
const callGemini = async (
  apiKey: string,
  game: Game,
  players: Player[],
  ourGoals: number,
  opponentGoals: number
): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(game, players, ourGoals, opponentGoals) }] }],
        // gemini-flash-latest is een "thinking"-model: het verbruikt eerst een deel van het
        // tokenbudget aan interne redenering vóór het antwoord schrijft. Met een te laag
        // maxOutputTokens raakt dat budget op vóór er zichtbare tekst is — vandaar ruim genomen.
        generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
      }),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw Object.assign(new Error('Aanroep duurde te lang (netwerk blokkeert mogelijk deze aanroep)'), { timedOut: true });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw Object.assign(new Error(`Gemini gaf status ${response.status}: ${errorText}`), { status: response.status });
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`Gemini gaf geen tekst terug (finishReason: ${candidate?.finishReason})`);
  }
  return text.trim();
};

// Genereert een wedstrijdverslag via de gratis Gemini-tier. Geeft null terug bij een ontbrekende
// key of een blijvend mislukte aanroep, zodat de UI dan gewoon terugvalt op de standaard-placeholder.
// Een 503 (model tijdelijk overbelast) of een timeout wordt een paar keer opnieuw geprobeerd.
// Een 429 (dagquotum bereikt — gratis tier is 20 verzoeken/dag/model) heeft geen zin om meteen
// opnieuw te proberen, dus die faalt meteen met een duidelijke log.
export const generateMatchReport = async (
  game: Game,
  players: Player[],
  ourGoals: number,
  opponentGoals: number
): Promise<string | null> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY ontbreekt: AI-verslag wordt overgeslagen.');
    return null;
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callGemini(apiKey, game, players, ourGoals, opponentGoals);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const timedOut = (err as { timedOut?: boolean }).timedOut;

      if (status === 429) {
        console.warn('AI-verslag genereren mislukt: gratis dagquotum bereikt (probeer morgen opnieuw).', err);
        return null;
      }

      const isRetryable = status === 503 || timedOut;
      if (isRetryable && attempt < maxAttempts) {
        console.warn(`AI-verslag genereren: poging ${attempt} mislukt (${timedOut ? 'timeout' : `status ${status}`}), nieuwe poging...`);
        await sleep(attempt * 1000);
        continue;
      }
      console.warn('AI-verslag genereren mislukt:', err);
      return null;
    }
  }
  return null;
};
