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

// Kaart met meerdere statistieken (Doelpunten/Assists/Tackles/Reddingen) achter tabjes i.p.v.
// aparte kaarten onder elkaar — compacter, en makkelijker om snel tussen statistieken te wisselen.
const StatTabsCard: React.FC<{
  tabs: { key: string; label: string; unit: string; badgeClassName: string; entries: LeaderboardEntry[] }[];
}> = ({ tabs }) => {
  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const activeTab = tabs.find(t => t.key === activeKey) ?? tabs[0];
  const sorted = [...activeTab.entries].filter(e => e.value > 0).sort((a, b) => b.value - a.value);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50">
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
      {sorted.length === 0 ? (
        <p className="text-gray-400 italic text-sm">Geen data</p>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((entry, index) => (
            <div key={entry.id} className="flex justify-between items-center text-sm gap-2">
              <span className="font-semibold text-gray-700 truncate">{index + 1}. {entry.name}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 whitespace-nowrap ${activeTab.badgeClassName}`}>
                {entry.value} {activeTab.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

  const goalEntries = playerInsights.map(p => ({ id: p.id, name: p.name, value: p.goals }));
  const assistEntries = playerInsights.map(p => ({ id: p.id, name: p.name, value: p.assists }));
  const tackleEntries = playerInsights.map(p => ({ id: p.id, name: p.name, value: p.tackles }));
  const saveEntries = playerInsights.map(p => ({ id: p.id, name: p.name, value: p.saves }));
  const cleanSheetEntries = playerInsights.map(p => ({ id: p.id, name: p.name, value: p.cleanSheets }));
  const injuryEntries = playerInsights.map(p => ({ id: p.id, name: p.name, value: p.injuries }));

  // Speelminuten + aanwezigheid gecombineerd tot één overzicht per speler, gesorteerd op
  // speelminuten — enkel spelers die effectief aanwezig waren zijn relevant hier.
  const minutesAndPresence = [...playerInsights]
    .filter(p => p.matchesPresent > 0)
    .sort((a, b) => b.minutesTotal - a.minutesTotal);

  const [minutesViewMode, setMinutesViewMode] = useState<'lijst' | 'grafiek'>('lijst');
  const maxMinutesTotal = Math.max(1, ...minutesAndPresence.map(p => p.minutesTotal));

  // Voor de speler-tabs bij "Speelminuten per positie": alfabetisch, makkelijker om een
  // specifieke speler snel terug te vinden dan gesorteerd op speelminuten.
  const playersAlphabetically = [...minutesAndPresence].sort((a, b) => a.name.localeCompare(b.name));

  // Welke speler geselecteerd staat bij "Speelminuten per positie". Verdwijnt de geselecteerde
  // speler uit de lijst (bv. door van seizoen te wisselen), dan valt dit terug op de eerste
  // (alfabetisch) i.p.v. een lege/ongeldige selectie te tonen.
  const [selectedPositionPlayerId, setSelectedPositionPlayerId] = useState<number | null>(null);
  const selectedPositionPlayer =
    playersAlphabetically.find(p => p.id === selectedPositionPlayerId) ?? playersAlphabetically[0] ?? null;

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
              { key: 'goals', label: 'Doelpunten', unit: 'goals', badgeClassName: 'bg-yellow-50 text-yellow-700', entries: goalEntries },
              { key: 'assists', label: 'Assists', unit: 'assists', badgeClassName: 'bg-yellow-50 text-yellow-700', entries: assistEntries },
              { key: 'tackles', label: 'Tackles', unit: 'tackles', badgeClassName: 'bg-blue-50 text-blue-700', entries: tackleEntries },
              { key: 'saves', label: 'Reddingen', unit: 'reddingen', badgeClassName: 'bg-green-50 text-green-700', entries: saveEntries },
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
                    <div className="flex flex-wrap justify-end items-center gap-x-3 gap-y-0.5 shrink-0">
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 whitespace-nowrap">
                        {p.minutesTotal}min ({p.minutesPercentage}%)
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {p.matchesPresent}/{team.totalGames} aanwezig ({p.presencePercentage}%)
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
                        <span className="text-[10px] font-bold text-blue-700 mb-1">{p.minutesTotal}'</span>
                        <div
                          className="w-8 bg-blue-500 rounded-t-md"
                          style={{ height: `${Math.max(4, (p.minutesTotal / maxMinutesTotal) * 100)}px` }}
                        />
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-[10px] font-bold text-gray-700 truncate w-16">{p.name}</p>
                        <p className="text-[9px] text-gray-400 leading-tight">{p.minutesTotal}min ({p.minutesPercentage}%)</p>
                        <p className="text-[9px] text-gray-400 leading-tight">{p.matchesPresent}/{team.totalGames} aanw.</p>
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
                          return (
                            <div
                              key={pos}
                              className={`w-20 py-2 rounded-xl border-2 flex flex-col items-center justify-center text-center px-1 ${wingOffset} ${
                                minutes > 0 ? 'border-[#04174C]/30 bg-white' : 'border-dashed border-gray-200 bg-white/60'
                              }`}
                            >
                              {minutes > 0 ? (
                                <>
                                  <span className="text-xs font-bold text-[#04174C]">{minutes}min</span>
                                  <span className="text-[9px] text-gray-400">{pct}%</span>
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

          <Leaderboard title="Clean sheets" icon={<Shield size={18} className="text-emerald-500" />} entries={cleanSheetEntries} unit="clean sheets" badgeClassName="bg-emerald-50 text-emerald-700" />
          <Leaderboard title="Blessures" icon={<Bandage size={18} className="text-orange-500" />} entries={injuryEntries} unit="keer" badgeClassName="bg-orange-50 text-orange-700" />
        </>
      )}
    </div>
  );
};
