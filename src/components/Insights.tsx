import React, { useMemo, useState } from 'react';
import { BarChart3, Target, Shield, Clock, Users, Bandage } from 'lucide-react';
import type { Game, Player, FieldPosition } from '../types';
import { computeInsights, getAvailableSeasons } from '../utils/insights';
import { getSeasonId } from '../utils/season';

// Visuele opstelling (dubbele ruit), zelfde indeling als QuarterLineup.tsx: aanval bovenaan,
// keeper onderaan — herkenbaar voor trainers die het live-invoerscherm al kennen.
const FORMATION_ROWS: FieldPosition[][] = [
  ['aanvaller_links', 'spits', 'aanvaller_rechts'],
  ['middenvelder'],
  ['verdediger_links', 'verdediger_centraal', 'verdediger_rechts'],
  ['keeper'],
];

// Volgorde + labels voor de positie-tabs bij "Spelers per positie".
const POSITION_TAB_ORDER: FieldPosition[] = [
  'keeper',
  'verdediger_links',
  'verdediger_centraal',
  'verdediger_rechts',
  'middenvelder',
  'aanvaller_links',
  'spits',
  'aanvaller_rechts',
];

const POSITION_TAB_LABELS: Record<FieldPosition, { full: string; abbr: string }> = {
  keeper: { full: 'Doelman', abbr: 'DM' },
  verdediger_links: { full: 'Verdediger links', abbr: 'VL' },
  verdediger_centraal: { full: 'Verdediger centraal', abbr: 'VC' },
  verdediger_rechts: { full: 'Verdediger rechts', abbr: 'VR' },
  middenvelder: { full: 'Centrale middenvelder', abbr: 'CM' },
  aanvaller_links: { full: 'Aanvaller links', abbr: 'AL' },
  spits: { full: 'Aanvaller centraal', abbr: 'AC' },
  aanvaller_rechts: { full: 'Aanvaller rechts', abbr: 'AR' },
};

interface Props {
  games: Game[];
  players: Player[];
}

interface LeaderboardEntry {
  id: number;
  name: string;
  value: number;
  suffix?: string;
}

// Eén statistiek-kaart: alle spelers gerangschikt op die statistiek, hoogste bovenaan — zo
// kunnen trainers per statistiek meteen spelers onderling vergelijken.
const Leaderboard: React.FC<{
  title: string;
  icon: React.ReactNode;
  entries: LeaderboardEntry[];
  unit: string;
  badgeClassName: string;
}> = ({ title, icon, entries, unit, badgeClassName }) => {
  const sorted = [...entries].filter(e => e.value > 0).sort((a, b) => b.value - a.value);
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
      <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
        {icon} {title}
      </div>
      {sorted.length === 0 ? (
        <p className="text-gray-400 italic text-sm">Geen data</p>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((entry, index) => (
            <div key={entry.id} className="flex justify-between items-center text-sm gap-2">
              <span className="font-semibold text-gray-700 truncate">{index + 1}. {entry.name}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 whitespace-nowrap ${badgeClassName}`}>
                {entry.suffix ?? `${entry.value} ${unit}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Eén rij in een StatTabsCard: de ranking gebeurt vooraf, de kaart toont enkel.
interface StatRow {
  id: number;
  name: string;
  primary: string; // prominent in de badge (bv. "elke 23 min")
  detail: string; // minder prominent ernaast (bv. "12 goals")
}

interface StatTab {
  key: string;
  label: string;
  badgeClassName: string;
  rows: StatRow[];
  description?: string; // korte uitleg voor trainers, subtiel onder de tabjes
}

// Rangschikt op "om de hoeveel minuten" i.p.v. op het totaal — eerlijker voor spelers met minder
// speeltijd. Laagste = beste; bij gelijkstand wint het hoogste totaal. Spelers zonder
// geregistreerde minuten (oude data) komen onderaan zonder ratio.
const rankByMinutesPer = (
  entries: { id: number; name: string; value: number; minutes: number }[],
  unit: string
): StatRow[] =>
  entries
    .filter(e => e.value > 0)
    .map(e => ({ ...e, minutesPer: e.minutes > 0 ? e.minutes / e.value : Infinity }))
    .sort((a, b) => a.minutesPer - b.minutesPer || b.value - a.value)
    .map(e => ({
      id: e.id,
      name: e.name,
      primary: Number.isFinite(e.minutesPer) ? `elke ${Math.round(e.minutesPer)} min` : '–',
      detail: `${e.value} ${unit}`,
    }));

// Kaart met meerdere statistieken achter tabjes i.p.v. aparte kaarten onder elkaar — compacter,
// en makkelijker om snel tussen statistieken te wisselen.
const StatTabsCard: React.FC<{ title?: string; icon?: React.ReactNode; tabs: StatTab[] }> = ({ title, icon, tabs }) => {
  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const activeTab = tabs.find(t => t.key === activeKey) ?? tabs[0];

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
      {title && (
        <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
          {icon} {title}
        </div>
      )}
      <div className="overflow-x-auto -mx-1 px-1 mb-4">
        <div className="flex gap-1.5 min-w-min">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveKey(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                activeKey === tab.key ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {activeTab.description && (
        <p className="text-[11px] leading-snug text-gray-400 -mt-2 mb-4">{activeTab.description}</p>
      )}
      {activeTab.rows.length === 0 ? (
        <p className="text-gray-400 italic text-sm">Geen data</p>
      ) : (
        <div className="space-y-2.5">
          {activeTab.rows.map((row, index) => (
            <div key={row.id} className="flex justify-between items-center text-sm gap-2">
              <span className="font-semibold text-gray-700 truncate">{index + 1}. {row.name}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-gray-400 whitespace-nowrap">{row.detail}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap ${activeTab.badgeClassName}`}>
                  {row.primary}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// Kleurschaal voor de positie-heatmap: van heel lichtblauw (0%) via helder blauw naar het
// donkere navy van de app (100%). Meerdere tussenstappen i.p.v. enkel doorzichtigheid, zodat
// ook middenwaardes (bv. 28% vs 46%) duidelijk van elkaar verschillen.
const HEATMAP_STOPS: [number, number, number][] = [
  [239, 246, 255], // 0%   blue-50
  [147, 197, 253], // 25%  blue-300
  [59, 130, 246], //  50%  blue-500
  [29, 78, 216], //   75%  blue-700
  [4, 23, 76], //     100% navy #04174C
];
const heatmapColor = (pct: number): string => {
  const scaled = (Math.min(100, Math.max(0, pct)) / 100) * (HEATMAP_STOPS.length - 1);
  const i = Math.min(Math.floor(scaled), HEATMAP_STOPS.length - 2);
  const t = scaled - i;
  const [r, g, b] = HEATMAP_STOPS[i].map((c, k) => Math.round(c + (HEATMAP_STOPS[i + 1][k] - c) * t));
  return `rgb(${r}, ${g}, ${b})`;
};

// Geen overbodige ".0" tonen bij een rond gemiddelde (bv. "4" i.p.v. "4.0").
const formatAvg = (value: number): string => (Number.isInteger(value) ? `${value}` : value.toFixed(1));

// "Onbekend" (doelpunten van vóór de goal-type-tracking) altijd onderaan tonen, in het grijs,
// ongeacht het aantal — de overige types blijven gesorteerd op aantal.
const sortWithUnknownLast = <T extends { type: string }>(items: T[]): T[] => {
  const known = items.filter(i => i.type !== 'onbekend');
  const unknown = items.filter(i => i.type === 'onbekend');
  return [...known, ...unknown];
};

export const Insights: React.FC<Props> = ({ games, players }) => {
  const availableSeasons = useMemo(() => getAvailableSeasons(games), [games]);
  const [seasonFilter, setSeasonFilter] = useState<string>(() => getSeasonId());

  const data = useMemo(() => computeInsights(games, players, seasonFilter), [games, players, seasonFilter]);
  const { team, players: playerInsights } = data;

  const goalRows = rankByMinutesPer(
    playerInsights.map(p => ({ id: p.id, name: p.name, value: p.goals, minutes: p.minutesTotal })),
    'goals'
  );
  const assistRows = rankByMinutesPer(
    playerInsights.map(p => ({ id: p.id, name: p.name, value: p.assists, minutes: p.minutesTotal })),
    'assists'
  );
  const tackleRows = rankByMinutesPer(
    playerInsights.map(p => ({ id: p.id, name: p.name, value: p.tackles, minutes: p.minutesTotal })),
    'tackles'
  );
  // Reddingen enkel afzetten tegen de minuten in doel — veldminuten zouden de ratio vertekenen.
  const saveRows = rankByMinutesPer(
    playerInsights.map(p => ({ id: p.id, name: p.name, value: p.saves, minutes: p.minutesByPosition.keeper || 0 })),
    'reddingen'
  );

  // Aanval: om de hoeveel minuten de ploeg scoort terwijl deze speler vooraan staat. Lager =
  // beter; wie vooraan stond zonder dat de ploeg scoorde, komt onderaan.
  const teamGoalsInAttackRows: StatRow[] = playerInsights
    .filter(p => p.minutesInAttack > 0)
    .map(p => ({ ...p, minutesPer: p.teamGoalsInAttack > 0 ? p.minutesInAttack / p.teamGoalsInAttack : Infinity }))
    .sort((a, b) => a.minutesPer - b.minutesPer || b.teamGoalsInAttack - a.teamGoalsInAttack)
    .map(p => ({
      id: p.id,
      name: p.name,
      primary: Number.isFinite(p.minutesPer) ? `elke ${Math.round(p.minutesPer)} min` : 'nog geen goal',
      detail: `${p.teamGoalsInAttack} goals in ${p.minutesInAttack}min`,
    }));

  // Betrokkenheid: doelpunt of assist van de speler zelf, over al zijn speelminuten.
  const involvementRows = rankByMinutesPer(
    playerInsights.map(p => ({ id: p.id, name: p.name, value: p.goals + p.assists, minutes: p.minutesTotal })),
    'goals + assists'
  );

  // Clean sheets als % van de kwarten in doel/verdediging — eerlijker dan het totaal, dat vooral
  // beloont wie vaak achterin stond. Bij gelijk percentage wint het hoogste aantal clean sheets.
  const cleanSheetRows: StatRow[] = playerInsights
    .filter(p => p.cleanSheets > 0)
    .map(p => ({ ...p, pct: Math.round((p.cleanSheets / p.quartersInGoalOrDefense) * 100) }))
    .sort((a, b) => b.pct - a.pct || b.cleanSheets - a.cleanSheets)
    .map(p => ({
      id: p.id,
      name: p.name,
      primary: `${p.pct}% clean`,
      detail: `${p.cleanSheets} van ${p.quartersInGoalOrDefense} kwarten`,
    }));

  // Tegendoelpunten: om de hoeveel minuten de ploeg een goal slikt terwijl deze speler keeper of
  // verdediger is. Hoger = beter; wie nog geen enkele tegengoal kreeg staat bovenaan (bij
  // gelijkstand: wie het langst achterin stond).
  const goalsAgainstRows: StatRow[] = playerInsights
    .filter(p => p.minutesInGoalOrDefense > 0)
    .map(p => ({
      ...p,
      minutesPer: p.goalsAgainstInGoalOrDefense > 0 ? p.minutesInGoalOrDefense / p.goalsAgainstInGoalOrDefense : Infinity,
    }))
    .sort((a, b) => b.minutesPer - a.minutesPer || b.minutesInGoalOrDefense - a.minutesInGoalOrDefense)
    .map(p => ({
      id: p.id,
      name: p.name,
      primary: Number.isFinite(p.minutesPer) ? `elke ${Math.round(p.minutesPer)} min` : 'geen tegengoal',
      detail: `${p.goalsAgainstInGoalOrDefense} tegen in ${p.minutesInGoalOrDefense}min`,
    }));
  const injuryEntries = playerInsights.map(p => ({ id: p.id, name: p.name, value: p.injuries }));

  // Speelminuten + aanwezigheid gecombineerd tot één overzicht per speler, gesorteerd op % van
  // de aanwezige tijd dat hij speelde (eerlijker dan totaal minuten bij wisselende aanwezigheid);
  // bij gelijkstand wint het hoogste totaal. Enkel spelers die effectief aanwezig waren.
  const minutesAndPresence = [...playerInsights]
    .filter(p => p.matchesPresent > 0)
    .sort((a, b) => b.minutesPercentage - a.minutesPercentage || b.minutesTotal - a.minutesTotal);

  const [minutesViewMode, setMinutesViewMode] = useState<'lijst' | 'grafiek'>('lijst');

  // Voor de speler-tabs bij "Speelminuten per positie": alfabetisch, makkelijker om een
  // specifieke speler snel terug te vinden dan gesorteerd op speelminuten.
  const playersAlphabetically = [...minutesAndPresence].sort((a, b) => a.name.localeCompare(b.name));

  // Welke speler geselecteerd staat bij "Speelminuten per positie". Verdwijnt de geselecteerde
  // speler uit de lijst (bv. door van seizoen te wisselen), dan valt dit terug op de eerste
  // (alfabetisch) i.p.v. een lege/ongeldige selectie te tonen.
  const [selectedPositionPlayerId, setSelectedPositionPlayerId] = useState<number | null>(null);
  const selectedPositionPlayer =
    playersAlphabetically.find(p => p.id === selectedPositionPlayerId) ?? playersAlphabetically[0] ?? null;
  // Positie(s) waar de geselecteerde speler het meest stond krijgen een opvallende rand.
  const maxPositionMinutes = selectedPositionPlayer
    ? Math.max(0, ...Object.values(selectedPositionPlayer.minutesByPosition))
    : 0;

  // Welke positie geselecteerd staat bij "Spelers per positie".
  const [selectedPositionTab, setSelectedPositionTab] = useState<FieldPosition>('keeper');

  // Alle spelers die op de geselecteerde positie stonden, met hun minuten en aandeel t.o.v.
  // alle minuten die er ooit op die positie gespeeld zijn (door om het even wie).
  const playersForSelectedPosition = useMemo(() => {
    const entries = playerInsights
      .map(p => ({ id: p.id, name: p.name, minutes: p.minutesByPosition[selectedPositionTab] || 0 }))
      .filter(e => e.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
    const totalMinutesAtPosition = entries.reduce((sum, e) => sum + e.minutes, 0);
    return entries.map(e => ({
      ...e,
      percentage: totalMinutesAtPosition > 0 ? Math.round((e.minutes / totalMinutesAtPosition) * 100) : 0,
    }));
  }, [playerInsights, selectedPositionTab]);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32 space-y-6">
      {/* Header + seizoensfilter */}
      <div className="px-1 pt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-[#04174C]" size={24} />
          <h1 className="text-2xl font-bold text-[#04174C]">Inzichten</h1>
        </div>
        <select
          value={seasonFilter}
          onChange={e => setSeasonFilter(e.target.value)}
          className="bg-white border border-blue-100 text-[#04174C] text-xs font-bold rounded-xl px-3 py-2 shadow-sm"
        >
          {!availableSeasons.includes(seasonFilter) && (
            <option value={seasonFilter}>{seasonFilter}</option>
          )}
          {availableSeasons.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="all">Alle seizoenen</option>
        </select>
      </div>

      {team.totalGames === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center">
          <BarChart3 className="mx-auto text-gray-200 mb-2" size={32} />
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
            Nog geen voltooide wedstrijden in dit seizoen
          </p>
        </div>
      ) : (
        <>
          {/* --- TEAM-NIVEAU --- */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-50">
            <div className="flex items-center gap-2 mb-6 text-[#04174C] font-bold uppercase text-xs tracking-wider">
              <Users size={18} className="text-blue-500" /> Team-gemiddeldes per wedstrijd
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
              {[
                { label: 'Doelpunten voor', value: team.avgGoalsFor },
                { label: 'Doelpunten tegen', value: team.avgGoalsAgainst },
                { label: 'Assists', value: team.avgAssists },
                { label: 'Tackles', value: team.avgTackles },
                { label: 'Saves', value: team.avgSaves },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-xl font-black text-[#04174C] tabular-nums">{formatAvg(item.value)}</div>
                  <div className="text-[9px] uppercase font-black tracking-widest text-gray-400">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
              <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
                <Target size={18} className="text-green-500" /> Doelpunten voor, per type
              </div>
              <div className="space-y-2">
                {sortWithUnknownLast(team.goalsForByType).map(t => (
                  <div key={t.type} className="flex justify-between items-center text-sm">
                    <span className={`font-semibold ${t.type === 'onbekend' ? 'text-gray-400' : 'text-gray-700'}`}>{t.label}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${t.type === 'onbekend' ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-700'}`}>{t.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
              <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
                <Target size={18} className="text-red-500" /> Doelpunten tegen, per type
              </div>
              <div className="space-y-2">
                {team.goalsAgainstByType.length === 0 ? (
                  <p className="text-gray-400 italic text-sm">Geen data</p>
                ) : (
                  sortWithUnknownLast(team.goalsAgainstByType).map(t => (
                    <div key={t.type} className="flex justify-between items-center text-sm">
                      <span className={`font-semibold ${t.type === 'onbekend' ? 'text-gray-400' : 'text-gray-700'}`}>{t.label}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${t.type === 'onbekend' ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-700'}`}>{t.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* --- PER SPELER, PER STATISTIEK --- */}
          <StatTabsCard
            tabs={[
              { key: 'goals', label: 'Doelpunten', badgeClassName: 'bg-yellow-50 text-yellow-700', rows: goalRows },
              { key: 'assists', label: 'Assists', badgeClassName: 'bg-yellow-50 text-yellow-700', rows: assistRows },
              { key: 'tackles', label: 'Tackles', badgeClassName: 'bg-blue-50 text-blue-700', rows: tackleRows },
              { key: 'saves', label: 'Reddingen', badgeClassName: 'bg-green-50 text-green-700', rows: saveRows },
            ]}
          />

          {/* Speelminuten + aanwezigheid gecombineerd: lijst (compact, naast elkaar) of
              staafdiagram, wisselbaar via de tabjes rechtsboven. */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 text-[#04174C] font-bold uppercase text-xs tracking-wider">
                <Clock size={18} className="text-[#04174C]" /> Speelminuten &amp; aanwezigheid
              </div>
              <div className="flex bg-gray-100 rounded-lg p-0.5 text-[10px] font-black uppercase tracking-wider shrink-0">
                {(['lijst', 'grafiek'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setMinutesViewMode(mode)}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      minutesViewMode === mode ? 'bg-white text-[#04174C] shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {minutesAndPresence.length === 0 ? (
              <p className="text-gray-400 italic text-sm">Geen data</p>
            ) : minutesViewMode === 'lijst' ? (
              <div className="space-y-2.5">
                {minutesAndPresence.map((p, index) => (
                  <div key={p.id} className="flex justify-between items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-700 truncate">{index + 1}. {p.name}</span>
                    <div className="flex flex-wrap justify-end items-center gap-x-2 gap-y-0.5 shrink-0">
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 whitespace-nowrap">
                        {p.minutesPercentage}% gespeeld
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        ({p.minutesTotal}min in {p.matchesPresent} {p.matchesPresent === 1 ? 'wedstrijd' : 'wedstrijden'})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Staafdiagram: op mobiel horizontaal scrollbaar zodat alle spelers (bv. 12) naast
              // elkaar passen, ook als ze niet allemaal tegelijk op het scherm passen.
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="flex gap-3 min-w-min">
                  {minutesAndPresence.map(p => (
                    <div key={p.id} className="flex flex-col items-center w-16 shrink-0">
                      <div className="flex flex-col items-center justify-end" style={{ height: '120px' }}>
                        <span className="text-[10px] font-bold text-blue-700 mb-1">{p.minutesPercentage}%</span>
                        <div
                          className="w-8 bg-blue-500 rounded-t-md"
                          style={{ height: `${Math.min(100, Math.max(4, p.minutesPercentage))}px` }}
                        />
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-[10px] font-bold text-gray-700 truncate w-16">{p.name}</p>
                        <p className="text-[9px] text-gray-400 leading-tight">{p.minutesTotal}min</p>
                        <p className="text-[9px] text-gray-400 leading-tight">{p.matchesPresent} wedstr.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Speelminuten per positie: per speler (tabs) de visuele veldopstelling, met per
              positie hoeveel minuten (en welk aandeel van zijn totale speeltijd) hij daar stond. */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
            <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
              <Clock size={18} className="text-[#04174C]" /> Speelminuten per positie
            </div>
            {minutesAndPresence.length === 0 ? (
              <p className="text-gray-400 italic text-sm">Geen data</p>
            ) : (
              <>
                <div className="overflow-x-auto -mx-1 px-1 mb-4">
                  <div className="flex gap-1.5 min-w-min">
                    {playersAlphabetically.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPositionPlayerId(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                          selectedPositionPlayer?.id === p.id ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPositionPlayer && (
                  <div className="bg-green-50 rounded-2xl border-2 border-green-100 p-4 space-y-6">
                    {FORMATION_ROWS.map((row, i) => (
                      <div key={i} className="flex justify-center gap-2">
                        {row.map(pos => {
                          const minutes = selectedPositionPlayer.minutesByPosition[pos] || 0;
                          const pct = selectedPositionPlayer.minutesTotal > 0
                            ? Math.round((minutes / selectedPositionPlayer.minutesTotal) * 100)
                            : 0;
                          const wingOffset =
                            pos === 'verdediger_links' || pos === 'verdediger_rechts'
                              ? '-translate-y-6'
                              : pos === 'aanvaller_links' || pos === 'aanvaller_rechts'
                              ? 'translate-y-6'
                              : '';
                          // Heatmap: hoe groter het aandeel van zijn speeltijd op deze positie, hoe
                          // feller blauw — zo zie je in één oogopslag waar een speler vooral staat.
                          // Vanaf een donkere tint schakelt de tekst naar wit voor leesbaarheid.
                          const darkCell = pct >= 35;
                          const isTopPosition = minutes > 0 && minutes === maxPositionMinutes;
                          return (
                            <div
                              key={pos}
                              className={`w-20 py-2 rounded-xl border-2 flex flex-col items-center justify-center text-center px-1 ${wingOffset} ${
                                isTopPosition
                                  ? 'border-amber-400 shadow-md shadow-amber-200'
                                  : minutes > 0
                                  ? 'border-blue-900/10'
                                  : 'border-dashed border-gray-200 bg-white/60'
                              }`}
                              style={minutes > 0 ? { backgroundColor: heatmapColor(pct) } : undefined}
                            >
                              {minutes > 0 ? (
                                <>
                                  <span className={`text-xs font-bold ${darkCell ? 'text-white' : 'text-[#04174C]'}`}>{minutes}min</span>
                                  <span className={`text-[9px] ${darkCell ? 'text-blue-100' : 'text-gray-500'}`}>{pct}%</span>
                                </>
                              ) : (
                                <span className="text-gray-300 text-sm font-bold">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Spelers per positie: het omgekeerde perspectief van hierboven — per positie (tabs)
              welke spelers daar stonden, met hun minuten en aandeel t.o.v. alle minuten die op
              die positie gespeeld werden (door om het even wie). */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
            <div className="flex items-center gap-2 mb-4 text-[#04174C] font-bold uppercase text-xs tracking-wider">
              <Users size={18} className="text-[#04174C]" /> Spelers per positie
            </div>

            <div className="overflow-x-auto -mx-1 px-1 mb-4">
              <div className="flex gap-1.5 min-w-min">
                {POSITION_TAB_ORDER.map(pos => (
                  <button
                    key={pos}
                    onClick={() => setSelectedPositionTab(pos)}
                    title={POSITION_TAB_LABELS[pos].full}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                      selectedPositionTab === pos ? 'bg-[#04174C] text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {POSITION_TAB_LABELS[pos].abbr}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-3">
              {POSITION_TAB_LABELS[selectedPositionTab].full}
            </p>

            {playersForSelectedPosition.length === 0 ? (
              <p className="text-gray-400 italic text-sm">Geen data</p>
            ) : (
              <div className="space-y-2.5">
                {playersForSelectedPosition.map((entry, index) => (
                  <div key={entry.id} className="flex justify-between items-center text-sm gap-2">
                    <span className="font-semibold text-gray-700 truncate">{index + 1}. {entry.name}</span>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 shrink-0 whitespace-nowrap">
                      {entry.minutes}min ({entry.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <StatTabsCard
            title="Verdediging"
            icon={<Shield size={18} className="text-emerald-500" />}
            tabs={[
              {
                key: 'goalsAgainst',
                label: 'Tegendoelpunten',
                badgeClassName: 'bg-emerald-50 text-emerald-700',
                rows: goalsAgainstRows,
                description:
                  'Om de hoeveel minuten de ploeg gemiddeld een tegendoelpunt krijgt wanneer deze speler in doel of in de verdediging staat. Hoe hoger, hoe beter.',
              },
              {
                key: 'cleanSheets',
                label: 'Clean sheets',
                badgeClassName: 'bg-emerald-50 text-emerald-700',
                rows: cleanSheetRows,
                description:
                  'Hoeveel kwarten de ploeg geen tegendoelpunt kreeg wanneer de speler in doel of in de verdediging stond. Hoe hoger, hoe beter.',
              },
            ]}
          />

          <StatTabsCard
            title="Aanval"
            icon={<Target size={18} className="text-yellow-500" />}
            tabs={[
              {
                key: 'teamGoalsInAttack',
                label: 'Ploeg scoort',
                badgeClassName: 'bg-yellow-50 text-yellow-700',
                rows: teamGoalsInAttackRows,
                description:
                  'Om de hoeveel minuten de ploeg gemiddeld scoort terwijl deze speler in de aanval staat. Hoe lager, hoe beter.',
              },
              {
                key: 'involvement',
                label: 'Betrokkenheid',
                badgeClassName: 'bg-yellow-50 text-yellow-700',
                rows: involvementRows,
                description:
                  'Om de hoeveel minuten deze speler zelf een doelpunt maakt of een assist geeft, over al zijn speelminuten (op elke positie). Hoe minder minuten, hoe beter.',
              },
            ]}
          />
          <Leaderboard title="Blessures" icon={<Bandage size={18} className="text-orange-500" />} entries={injuryEntries} unit="keer" badgeClassName="bg-orange-50 text-orange-700" />
        </>
      )}
    </div>
  );
};
