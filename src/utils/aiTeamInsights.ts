import type { Game } from '../types';
import type { TeamInsight, InsightsData } from './insights';
import { askAi } from './aiMatchReport';
import { POSITION_LABELS } from './positions';

const POSITION_GROUP_OF: Record<FieldPosition, string> = {
  keeper: 'keeper',
  verdediger_links: 'verdediging',
  verdediger_centraal: 'verdediging',
  verdediger_rechts: 'verdediging',
  middenvelder: 'midden',
  aanvaller_links: 'aanval',
  spits: 'aanval',
  aanvaller_rechts: 'aanval',
};
import type { FieldPosition } from '../types';

// Eén AI-inzicht over de ploeg als geheel: korte titel + uitleg.
export interface TeamAiInsight {
  title: string;
  text: string;
  // Enkel bij het spelersrapport: sterkte of verbeterpunt.
  kind?: 'sterkte' | 'verbeterpunt';
}

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const avg = (value: number, count: number) => (count > 0 ? (value / count).toFixed(1).replace('.', ',') : '0');

// Vat de voltooide wedstrijden samen in ploegcijfers, bewust zonder spelersnamen: deze
// inzichten gaan over de ploeg, niet over individuen.
const buildPrompt = (games: Game[], team: TeamInsight): string => {
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date));

  const perGame = sorted.map(g => {
    const goalsFor = g.quarters.reduce((sum, q) => sum + q.goalEvents.length, 0);
    const goalsAgainst = g.quarters.reduce((sum, q) => sum + (q.opponentGoalEvents || []).length, 0);
    const result = goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'V' : 'G';

    // Verloop: stond de ploeg na een kwart achter en verloor ze toch niet (ommekeer), of stond
    // ze voor en won ze toch niet (voorsprong uit handen gegeven)?
    let cumFor = 0, cumAgainst = 0, wasBehind = false, wasAhead = false;
    g.quarters.forEach(q => {
      cumFor += q.goalEvents.length;
      cumAgainst += (q.opponentGoalEvents || []).length;
      if (cumFor < cumAgainst) wasBehind = true;
      if (cumFor > cumAgainst) wasAhead = true;
    });
    return {
      goalsFor,
      goalsAgainst,
      result,
      isAway: !!g.isAway,
      wasBehind,
      wasAhead,
    };
  });

  const count = (r: string, list = perGame) => list.filter(g => g.result === r).length;
  const record = (list: typeof perGame) =>
    `${list.length} wedstrijden: ${count('W', list)} gewonnen, ${count('G', list)} gelijk, ${count('V', list)} verloren, doelsaldo ${list.reduce((s, g) => s + g.goalsFor, 0)}-${list.reduce((s, g) => s + g.goalsAgainst, 0)}`;

  const home = perGame.filter(g => !g.isAway);
  const away = perGame.filter(g => g.isAway);

  // Doelpunten per kwart (1-4), over alle wedstrijden samen.
  const quarterLines = [0, 1, 2, 3].map(i => {
    const goalsFor = sorted.reduce((sum, g) => sum + (g.quarters[i]?.goalEvents.length || 0), 0);
    const goalsAgainst = sorted.reduce((sum, g) => sum + (g.quarters[i]?.opponentGoalEvents || []).length, 0);
    return `kwart ${i + 1}: in totaal ${goalsFor} voor en ${goalsAgainst} tegen (gemiddeld ${avg(goalsFor, sorted.length)} voor en ${avg(goalsAgainst, sorted.length)} tegen per wedstrijd)`;
  });

  const allQuarters = sorted.flatMap(g => g.quarters);
  const cleanSheetQuarters = allQuarters.filter(q => (q.opponentGoalEvents || []).length === 0).length;
  const allGoals = allQuarters.flatMap(q => q.goalEvents);
  const goalsWithAssist = allGoals.filter(e => e.assistId != null).length;

  const typeList = (types: TeamInsight['goalsForByType']) =>
    types.filter(t => t.type !== 'onbekend').map(t => `${t.label} ${t.count}`).join(', ') || 'geen gegevens';

  const form = perGame.map(g => `${g.result} ${g.goalsFor}-${g.goalsAgainst}`).join(', ');
  const half = Math.floor(perGame.length / 2);

  return [
    'Je bent een ervaren jeugdvoetbaltrainer. Geef 4 korte, concrete inzichten (Nederlands) over hoe de U10-ploeg van Kaulille presteert als PLOEG, voor de trainers.',
    `Seizoensbalans: ${record(perGame)}.`,
    home.length > 0 ? `Thuis: ${record(home)}.` : null,
    away.length > 0 ? `Uit: ${record(away)}.` : null,
    `Resultaten in chronologische volgorde (W=gewonnen, G=gelijk, V=verloren, onze goals-tegengoals): ${form}.`,
    half >= 2 ? `Eerste helft van de reeks: ${record(perGame.slice(0, half))}. Tweede helft van de reeks: ${record(perGame.slice(half))}.` : null,
    `Doelpunten per kwart over alle wedstrijden samen: ${quarterLines.join('; ')}.`,
    `Gemiddeld per wedstrijd: ${avg(perGame.reduce((s, g) => s + g.goalsFor, 0), perGame.length)} doelpunten voor, ${avg(perGame.reduce((s, g) => s + g.goalsAgainst, 0), perGame.length)} tegen, ${avg(team.avgTackles * perGame.length, perGame.length)} tackles, ${avg(team.avgSaves * perGame.length, perGame.length)} reddingen.`,
    `Kwarten zonder tegendoelpunt: ${cleanSheetQuarters} van ${allQuarters.length} (${pct(cleanSheetQuarters, allQuarters.length)}%).`,
    `Doelpunten met een assist: ${goalsWithAssist} van ${allGoals.length} (${pct(goalsWithAssist, allGoals.length)}%).`,
    (() => {
      const behind = perGame.filter(g => g.wasBehind);
      const ahead = perGame.filter(g => g.wasAhead);
      return `Wedstrijden waarin de ploeg na minstens één kwart achterstond: ${behind.length}; daarvan uiteindelijk ${count('W', behind)} gewonnen, ${count('G', behind)} gelijk, ${count('V', behind)} verloren. Wedstrijden waarin de ploeg na minstens één kwart voorstond: ${ahead.length}; daarvan uiteindelijk ${count('W', ahead)} gewonnen, ${count('G', ahead)} gelijk, ${count('V', ahead)} verloren.`;
    })(),
    `Onze doelpunten per type: ${typeList(team.goalsForByType)}.`,
    `Tegendoelpunten per type: ${typeList(team.goalsAgainstByType)}.`,
    '',
    'Regels:',
    '- Gebruik uitsluitend de cijfers hierboven. Verzin niets, en noem geen spelers (er staan bewust geen namen in).',
    '- Kies zelf de 4 zaken die het meest opvallen in deze cijfers: wat is uitzonderlijk, verrassend of duidelijk anders dan je zou verwachten? Sla over wat gewoon of nietszeggend is, ook al staat het in de gegevens.',
    '- Elk inzicht gaat over iets anders.',
    '- De titel benoemt de vaststelling zelf, specifiek voor deze ploeg (bv. "Thuis nog ongeslagen" of "Het derde kwart hapert"), geen algemene categorie zoals "Veerkracht", "Samenspel" of "Thuisprestaties".',
    '- Vertel wat het patroon zegt over de ploeg, in plaats van cijfers op te sommen. Hoogstens één cijfer per inzicht, ter onderbouwing.',
    '- Geef geen tips, adviezen of trainingssuggesties (dus niet "oefen op ..." of "een aandachtspunt is ..."): enkel wat opvalt aan hoe de ploeg speelt.',
    '- Positief en opbouwend van toon: het gaat om kinderen van 9-10 jaar.',
    // De Worker gebruikt de standaard maximale antwoordlengte van Workers AI (~256 tokens):
    // langere inzichten worden afgekapt, vandaar de strikte woordlimiet.
    '- Antwoord met exact 4 regels, één inzicht per regel, in deze vorm: Korte titel: één volledige, vlot leesbare zin van 15 à 25 woorden',
    '- Geen inleiding, geen afsluiting, geen nummering, geen opsommingstekens, geen markdown.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Haalt "Titel: uitleg"-regels uit het antwoord. Het model houdt zich niet altijd perfect aan
// het formaat (nummering, sterretjes, opsommingstekens), dus die strippen we weg.
const parseInsights = (text: string): TeamAiInsight[] =>
  text
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/\*\*/g, '').replace(/^[:\s]+/, '').trim())
    .filter(Boolean)
    .map(line => {
      const colon = line.indexOf(':');
      return colon > 0 && colon < 60
        ? { title: line.slice(0, colon).trim(), text: capitalize(line.slice(colon + 1).trim()) }
        : { title: '', text: line };
    })
    .filter(i => i.text.length > 0)
    .slice(0, 6);

export const generateTeamInsights = async (games: Game[], team: TeamInsight): Promise<TeamAiInsight[] | null> => {
  const text = await askAi(buildPrompt(games, team), 'AI-ploeginzichten genereren');
  if (!text) return null;
  const insights = parseInsights(text);
  return insights.length > 0 ? insights : null;
};

// --- SPELERSRAPPORT ---
// Een rapport over één speler, enkel zichtbaar voor trainers (admin-scherm), met sterktes én
// verbeterpunten. Wat een sterkte of een verbeterpunt is, bepalen we hier zelf op basis van de data
// (in vergelijking met de rest van de ploeg). De AI schrijft die vaststellingen enkel uit: zo kan ze
// geen sterkte of zwakte verzinnen die niet in de cijfers staat.
const REPORT_MIN_MINUTES = 60; // spelers met minder minuten tellen niet mee in de onderlinge rangen
const REPORT_ROLE_SHARE = 0.3; // een actie (bv. scoren) telt pas als werkpunt bij ≥30% speeltijd in die rol

const fmt = (value: number) => value.toFixed(1).replace('.', ',');

// Regelmaat en evolutie van één actie (doelpunten of tackles) over de wedstrijden heen. Scoort
// een speler in de meeste wedstrijden, of komen zijn doelpunten uit een paar uitschieters? En doet
// hij het in de tweede helft van de reeks beter of minder dan in de eerste?
const REGULARITY_MIN_GAMES = 4;
const describeConsistency = (
  perGame: number[], // aantal per wedstrijd waarin hij aanwezig was, chronologisch
  noun: string, // "doelpunten" / "tackles"
  verb: string, // "scoorde" / "maakte tackles"
  strengths: string[],
  improvements: string[],
  isRole: boolean // hoort deze actie bij zijn rol? Zo niet: geen verbeterpunt (een verdediger is niet "wisselvallig in scoren")
) => {
  const total = perGame.reduce((a, b) => a + b, 0);
  if (perGame.length < REGULARITY_MIN_GAMES || total < 3) return;
  const gamesWith = perGame.filter(n => n > 0).length;
  const shareWith = gamesWith / perGame.length;
  const topTwo = [...perGame].sort((a, b) => b - a).slice(0, 2).reduce((a, b) => a + b, 0);
  const max = Math.max(...perGame);

  if (isRole && shareWith <= 0.5 && topTwo / total >= 0.6 && max >= 3) {
    improvements.push(`[MOET] Wisselvallig in ${noun}: ${verb} in maar ${gamesWith} van zijn ${perGame.length} wedstrijden, maar in enkele wedstrijden opeens veel (tot ${max} in één wedstrijd). Het grootste deel van zijn ${noun} komt uit een paar uitschieters.`);
  } else if (shareWith >= 0.7) {
    strengths.push(`[MOET] Regelmatig in ${noun}: ${verb} in ${gamesWith} van zijn ${perGame.length} wedstrijden, dus niet afhankelijk van één uitschieter.`);
  }

  // Evolutie: eerste vs. tweede helft van zijn wedstrijden (per wedstrijd).
  if (perGame.length >= 6) {
    const half = Math.floor(perGame.length / 2);
    const avg = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length;
    const first = avg(perGame.slice(0, half)), second = avg(perGame.slice(half));
    if (second >= first + 0.75 && second >= first * 1.5) {
      strengths.push(`[MOET] In opmars: in de tweede helft van het seizoen gemiddeld ${fmt(second)} ${noun} per wedstrijd, tegenover ${fmt(first)} in de eerste helft.`);
    } else if (isRole && first >= second + 0.75 && first >= second * 1.5) {
      improvements.push(`[MOET] Minder ${noun} dan eerder: in de tweede helft van het seizoen gemiddeld ${fmt(second)} per wedstrijd, tegenover ${fmt(first)} in de eerste helft.`);
    }
  }
};

const buildPlayerReportPrompt = (playerId: number, data: InsightsData, nameById: Map<number, string>, games: Game[]): string | null => {
  const me = data.players.find(p => p.id === playerId);
  if (!me || me.minutesTotal === 0) return null;
  const others = data.players.filter(p => nameById.has(p.id) && p.minutesTotal >= REPORT_MIN_MINUTES);
  const squadSize = Math.max(others.length, 1);
  const third = Math.max(2, Math.ceil(squadSize / 3));
  const strengths: string[] = [];
  const improvements: string[] = [];

  // --- Profiel (neutraal) ---
  const positions = (Object.entries(me.minutesByPosition) as [FieldPosition, number][])
    .filter(([, m]) => (m || 0) > 0)
    .sort((a, b) => b[1] - a[1]);
  const positionText = positions
    .map(([pos, m]) => `${POSITION_LABELS[pos].toLowerCase()} (${Math.round((m / me.minutesTotal) * 100)}% van zijn speeltijd)`)
    .join(', ');
  const share = (group: 'keeper' | 'verdediging' | 'midden' | 'aanval') => (me.minutesByGroup[group] || 0) / me.minutesTotal;

  // --- Speeltijd en polyvalentie ---
  const minutesRank = others.filter(p => p.id !== me.id && p.minutesTotal > me.minutesTotal).length + 1;
  if (minutesRank <= third) {
    strengths.push(minutesRank === 1 ? 'Speelde de meeste minuten van de hele ploeg.' : `Speelde de ${minutesRank}e meeste minuten van de ploeg.`);
  }
  // In de U10 wordt veel gerouleerd: op veel posities staan is normaal en geen sterkte op zich.
  // Polyvalent is pas een sterkte als hij op (bijna) al die posities ook een meerwaarde is: de
  // ploeg doet het daar met hem minstens even goed als gemiddeld (doelsaldo per wedstrijd), op
  // minstens 4 posities met elk 30+ minuten, verspreid over minstens 2 linies.
  const teamDiff = data.team.avgGoalsFor - data.team.avgGoalsAgainst;
  const realPositions = (Object.entries(me.resultsByPosition) as [FieldPosition, { minutes: number; goalsFor: number; goalsAgainst: number }][])
    .filter(([, r]) => r.minutes >= 30);
  const goodPositions = realPositions.filter(([, r]) => ((r.goalsFor - r.goalsAgainst) / r.minutes) * 60 >= teamDiff);
  const goodGroups = new Set(goodPositions.map(([pos]) => POSITION_GROUP_OF[pos]));
  if (goodPositions.length >= 4 && goodPositions.length >= realPositions.length * 0.75 && goodGroups.size >= 2) {
    strengths.push(`Polyvalent mét meerwaarde: op ${goodPositions.length} verschillende posities (${goodPositions.map(([pos]) => POSITION_LABELS[pos].toLowerCase()).join(', ')}) doet de ploeg het met hem minstens even goed als gemiddeld. Hij is dus overal inzetbaar zonder dat de ploeg erop achteruitgaat.`);
  }
  // Beste en minst goede positie: waar doet de ploeg het met hem duidelijk beter of minder goed
  // dan gemiddeld? Enkel posities met minstens 45 minuten, en pas vanaf 2 zulke posities (anders
  // valt er niets te vergelijken).
  const POSITION_MIN_MINUTES = 45;
  const ranked = (Object.entries(me.resultsByPosition) as [FieldPosition, { minutes: number; goalsFor: number; goalsAgainst: number }][])
    .filter(([, r]) => r.minutes >= POSITION_MIN_MINUTES)
    .map(([pos, r]) => ({ pos, diff: ((r.goalsFor - r.goalsAgainst) / r.minutes) * 60 }))
    .sort((a, b) => b.diff - a.diff);
  if (ranked.length >= 2) {
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    const label = (pos: FieldPosition) => POSITION_LABELS[pos].toLowerCase();
    if (best.diff >= teamDiff + 1) {
      strengths.push(`[MOET] Beste positie: ${label(best.pos)}. Daar doet de ploeg het met hem het best (doelsaldo ${fmt(best.diff)} per wedstrijd, tegenover ${fmt(teamDiff)} gemiddeld voor de ploeg).`);
    }
    if (worst.pos !== best.pos && worst.diff <= teamDiff - 1.5) {
      improvements.push(`[MOET] Minder op zijn plaats als ${label(worst.pos)}: daar doet de ploeg het met hem duidelijk minder goed (doelsaldo ${fmt(worst.diff)} per wedstrijd, tegenover ${fmt(teamDiff)} gemiddeld). Op die positie kan hij nog groeien.`);
    }
  }



  // --- Acties per speelminuut, vergeleken met de ploeg ---
  // Rang op "om de hoeveel minuten" (lager = beter). Wie de actie nooit deed, staat achteraan.
  const rankPerMinute = (value: (p: (typeof others)[number]) => number): number => {
    const rate = (p: (typeof others)[number]) => value(p) / p.minutesTotal;
    return others.filter(p => p.id !== me.id && rate(p) > rate(me)).length + 1;
  };
  const action = (label: string, total: number, value: (p: (typeof others)[number]) => number, relevantShare: number, roleText: string) => {
    const rank = rankPerMinute(value);
    if (total > 0 && rank <= third) {
      strengths.push(`${label}: ${rank === 1 ? 'de beste' : `de ${rank}e beste`} van de ${squadSize} spelers van de ploeg, per speelminuut (${total} in totaal).`);
    } else if (rank > squadSize - third && relevantShare >= REPORT_ROLE_SHARE) {
      improvements.push(`${label}: bij de minste van de ploeg per speelminuut (${total} in totaal), terwijl hij toch ${Math.round(relevantShare * 100)}% van zijn speeltijd ${roleText} speelt.`);
    }
  };
  action('Doelpunten', me.goals, p => p.goals, share('aanval') + share('midden'), 'op het middenveld of in de aanval');
  action('Assists', me.assists, p => p.assists, share('aanval') + share('midden'), 'op het middenveld of in de aanval');
  action('Tackles', me.tackles, p => p.tackles, share('verdediging') + share('midden'), 'in de verdediging of op het middenveld');
  // Reddingen zijn een neutraal profielgegeven: of hij een sterke keeper is, volgt uit de
  // tegendoelpunten hieronder. Anders kan hij als keeper tegelijk sterkte én verbeterpunt zijn.

  // --- Verdediging en aanval: hoe deed de ploeg het terwijl hij daar stond? ---
  const teamAgainst = data.team.avgGoalsAgainst;
  // Keeper en verdediger apart: een keeper die nooit in de verdediging stond, mag niet als
  // "goede verdediger" beschreven worden (en omgekeerd).
  const defensiveRole = (minutes: number, goalsAgainst: number, role: string, strongLabel: string, weakLabel: string) => {
    if (minutes < 60) return;
    const against = (goalsAgainst / minutes) * 60;
    const text = `de ploeg kreeg ${fmt(against)} tegendoelpunten per wedstrijd terwijl hij ${role} was (${minutes} minuten), tegenover ${fmt(teamAgainst)} gemiddeld voor de ploeg.`;
    if (against < teamAgainst * 0.85) strengths.push(`${strongLabel}: ${text}`);
    else if (against > teamAgainst * 1.15) improvements.push(`${weakLabel}: ${text}`);
  };
  defensiveRole(me.minutesByGroup.keeper || 0, me.goalsAgainstAsKeeper, 'keeper', 'Sterk als keeper', 'Minder sterk als keeper');
  defensiveRole(me.minutesByGroup.verdediging || 0, me.goalsAgainstInDefense, 'verdediger', 'Sterk als verdediger', 'Minder sterk als verdediger');
  const teamFor = data.team.avgGoalsFor;
  if (me.minutesInAttack >= 60) {
    const goalsFor = (me.teamGoalsInAttack / me.minutesInAttack) * 60;
    const text = `de ploeg scoorde ${fmt(goalsFor)} doelpunten per wedstrijd terwijl hij in de aanval stond, tegenover ${fmt(teamFor)} gemiddeld voor de ploeg.`;
    if (goalsFor > teamFor * 1.15) strengths.push(`Sterk voorin: ${text}`);
    else if (goalsFor < teamFor * 0.85) improvements.push(`Minder productief voorin: ${text}`);
  }

  // --- Impact op de ploeg (zelfde schatting als "Impact op de ploeg") ---
  const impact = data.impact.find(i => i.playerId === me.id);
  if (impact?.group === 'positive') strengths.push('Rekening houdend met medespelers en tegenstanders presteert de ploeg duidelijk beter als hij op het veld staat.');
  // Een negatieve impact concreet maken, anders wordt het een vaag verbeterpunt ("bijdrage aan de
  // ploeg"): scoort de ploeg minder of krijgt ze meer tegendoelpunten met hem op het veld (t.o.v.
  // wanneer hij op de bank zit), en in welke linie speelt hij dan vooral?
  if (impact?.group === 'negative') {
    const { onField, onBench } = impact;
    const groupLabels = { keeper: 'keeper', verdediging: 'in de verdediging', midden: 'op het middenveld', aanval: 'in de aanval' } as const;
    const mainGroup = (Object.entries(me.minutesByGroup) as [keyof typeof groupLabels, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];
    const where = mainGroup ? ` Hij speelt vooral ${groupLabels[mainGroup]}.` : '';
    if (onField.minutes > 0 && onBench.minutes >= 45) {
      const per60 = (count: number, minutes: number) => (count / minutes) * 60;
      const forOn = per60(onField.goalsFor, onField.minutes), forOff = per60(onBench.goalsFor, onBench.minutes);
      const againstOn = per60(onField.goalsAgainst, onField.minutes), againstOff = per60(onBench.goalsAgainst, onBench.minutes);
      // Mogelijke verklaring per linie, zodat het verbeterpunt aansluit bij zijn rol (een verdediger
      // moet niet "meer scoren", maar kan wel de opbouw verzorgen).
      const scoringHint = { keeper: 'de uitworp en opbouw van achteruit', verdediging: 'de opbouw van achteruit en het doorspelen naar voren', midden: 'de verbinding tussen verdediging en aanval', aanval: 'het afwerken en kansen creëren' } as const;
      const defendingHint = { keeper: 'het keepen', verdediging: 'het verdedigen en dekken', midden: 'het terugkomen en afschermen van de verdediging', aanval: 'het terugverdedigen en druk zetten bij balverlies' } as const;
      const parts: string[] = [];
      if (forOff - forOn >= 0.5) {
        parts.push(`de ploeg scoort minder met hem op het veld (${fmt(forOn)} ploegdoelpunten per wedstrijd, tegenover ${fmt(forOff)} als hij op de bank zit). Dit gaat over de doelpunten van de ploeg, niet over zijn eigen doelpunten${mainGroup ? `; gezien zijn rol ligt een mogelijke verklaring bij ${scoringHint[mainGroup]}` : ''}`);
      }
      if (againstOn - againstOff >= 0.5) {
        parts.push(`de ploeg krijgt meer tegendoelpunten met hem op het veld (${fmt(againstOn)} per wedstrijd, tegenover ${fmt(againstOff)} als hij op de bank zit)${mainGroup ? `; gezien zijn rol ligt een mogelijke verklaring bij ${defendingHint[mainGroup]}` : ''}`);
      }
      if (parts.length > 0) improvements.push(`${parts.join('. Daarnaast: ')}.${where}`);
    }
  }

  // --- Samenspel: met wie loopt het (niet) goed? Resultaat van de ploeg, niet doelpunten van het duo. ---
  const pairs = data.duos
    .filter(d => d.playerIds.includes(me.id) && d.minutes >= 60)
    .map(d => ({ other: d.playerIds[0] === me.id ? d.playerIds[1] : d.playerIds[0], diff: (d.goalsFor - d.goalsAgainst) / d.minutes }))
    .filter(d => nameById.has(d.other))
    .sort((a, b) => b.diff - a.diff);
  const best = pairs.filter(d => d.diff > 0).slice(0, 2).map(d => nameById.get(d.other)!);
  if (best.length > 0) strengths.push(`De ploeg presteert het best als hij samen met ${best.join(' of ')} op het veld staat.`);
  const worst = pairs.filter(d => d.diff < 0).slice(-1).map(d => nameById.get(d.other)!);
  if (worst.length > 0) improvements.push(`De ploeg presteert minder goed als hij samen met ${worst[0]} op het veld staat (het samenspel tussen die twee loopt nog niet vlot).`);

  // --- Regelmaat en evolutie per wedstrijd ---
  const myGames = [...games].sort((a, b) => a.date.localeCompare(b.date)).filter(g => g.playersPresent.includes(me.id));
  const countPerGame = (count: (q: Game['quarters'][number]) => number) => myGames.map(g => g.quarters.reduce((sum, q) => sum + count(q), 0));
  describeConsistency(countPerGame(q => q.goalEvents.filter(e => e.scorerId === me.id).length), 'doelpunten', 'scoorde', strengths, improvements, share('aanval') + share('midden') >= REPORT_ROLE_SHARE);
  describeConsistency(countPerGame(q => (q.tackleEvents || []).filter(e => e.playerId === me.id).length), 'tackles', 'maakte tackles', strengths, improvements, share('verdediging') + share('midden') >= REPORT_ROLE_SHARE);

  const lineupPos = (Object.entries(data.strongestLineup) as [FieldPosition, { playerId: number }][])
    .find(([, slot]) => slot.playerId === me.id)?.[0];
  if (lineupPos) strengths.push(`Staat in de sterkste opstelling van de ploeg als ${POSITION_LABELS[lineupPos].toLowerCase()}.`);

  // Vaststellingen over regelmaat en evolutie ([MOET]) gaan altijd mee: die gaan anders verloren
  // tussen de andere punten, terwijl ze voor trainers net interessant zijn.
  const mustCount = (list: string[]) => list.filter(t => t.startsWith('[MOET]')).length;
  const strengthCount = Math.min(Math.max(3, mustCount(strengths)), Math.max(1, strengths.length));
  const improvementCount = Math.min(Math.max(2, mustCount(improvements)), 3, improvements.length);

  const lines = [
    `Je bent een ervaren jeugdvoetbaltrainer. Schrijf een kort rapport (Nederlands) over ${me.name}, een speler van de U10-ploeg van Kaulille. Het rapport is enkel voor de trainers.`,
    `Aanwezig in ${me.matchesPresent} van de ${data.team.totalGames} wedstrijden. Posities, meest gespeeld eerst: ${positionText}.`,
    me.saves > 0 ? `Reddingen als keeper: ${me.saves} (een neutraal gegeven, geen sterkte op zich).` : null,
    'Noem hem niet polyvalent of veelzijdig, tenzij dat bij STERKTES staat: op meerdere posities spelen is normaal in deze ploeg.',
    'Hij speelde ENKEL op de posities hierboven. Noem hem nooit verdediger, middenvelder, aanvaller of keeper als die positie er niet bij staat.',
    '',
    'STERKTES (uit de data):',
    ...(strengths.length > 0 ? strengths.map(t => `- ${t}`) : ['- geen uitgesproken sterktes in de cijfers; beschrijf dan zijn rol op basis van zijn posities.']),
    '',
    'VERBETERPUNTEN (uit de data):',
    ...(improvements.length > 0 ? improvements.map(t => `- ${t}`) : ['- geen']),
    '',
    'Regels:',
    `- Schrijf ${strengthCount} sterkte(s)${improvementCount > 0 ? ` en ${improvementCount} verbeterpunt(en)` : ' en geen verbeterpunten'}. Punten gemarkeerd met [MOET] neem je altijd op; kies de rest uit de meest opvallende punten.`,
    '- Spreek een [MOET]-punt nooit tegen in een ander punt (bv. niet "scoort regelmatig" als hij wisselvallig is in doelpunten).',
    '- Gebruik uitsluitend de lijsten hierboven: een sterkte komt uit STERKTES, een verbeterpunt uit VERBETERPUNTEN. Verzin niets, en maak van iets dat er niet staat geen sterkte of verbeterpunt.',
    '- Vertel wat het zegt over de speler, in plaats van cijfers op te sommen. Gebruik liefst geen getallen.',
    '- Verbeterpunten eerlijk en concreet, maar respectvol: het gaat om een kind van 9-10 jaar. Formuleer ze als iets waarin hij kan groeien.',
    '- Een verbeterpunt benoemt altijd het concrete aspect uit de lijst: scoren, tegendoelpunten voorkomen, tackles, regelmaat, of het samenspel met een bij naam genoemde medespeler, en waar relevant op welke positie. Vage verbeterpunten zoals "zijn bijdrage aan de ploeg", "zijn impact" of "de teamprestatie" zijn verboden: daar kan een trainer niets mee.',
    '- Schrijf over de speler in de derde persoon, met zijn naam.',
    '- De titel benoemt het inzicht zelf, eigen aan deze speler, geen algemene categorie zoals "Doelpunten" of "Belangrijke speler".',
    '- Antwoord met één inzicht per regel, in deze vorm: STERKTE | Korte titel: één volledige zin van 15 à 25 woorden',
    '  of: VERBETERPUNT | Korte titel: één volledige zin van 15 à 25 woorden',
    '- Eerst de sterktes, dan de verbeterpunten. Geen inleiding, geen afsluiting, geen nummering, geen markdown.',
  ];
  return lines.filter((line): line is string => line !== null).join('\n');
};

// Leest "STERKTE | Titel: zin" / "VERBETERPUNT | Titel: zin". Zonder herkenbaar label rekenen we
// het tot de sterktes.
const parseReport = (text: string): TeamAiInsight[] =>
  text
    .split('\n')
    .map((line): TeamAiInsight | null => {
      const match = line.match(/^\W*(sterkte|verbeterpunt)\w*\W*\|\s*(.*)$/i);
      const kind: TeamAiInsight['kind'] = match?.[1].toLowerCase() === 'verbeterpunt' ? 'verbeterpunt' : 'sterkte';
      const [parsed] = parseInsights(match ? match[2] : line);
      return parsed ? { ...parsed, kind } : null;
    })
    .filter((i): i is TeamAiInsight => i !== null)
    // Het model schrijft soms een lege regel als "Geen verbeterpunten: ..."; de kaart toont dat zelf al.
    .filter(i => !/^geen\b/i.test(i.title) && !/^er zijn geen\b/i.test(i.text))
    .slice(0, 6);

export const generatePlayerReport = async (
  playerId: number,
  data: InsightsData,
  nameById: Map<number, string>,
  games: Game[]
): Promise<TeamAiInsight[] | null> => {
  const prompt = buildPlayerReportPrompt(playerId, data, nameById, games);
  if (!prompt) return null;
  const text = await askAi(prompt, 'AI-spelersrapport genereren');
  if (!text) return null;
  const list = parseReport(text);
  return list.length > 0 ? list : null;
};
