import React from 'react';
import { LayoutDashboard, Users, Gamepad2Icon, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  view: string;
  setView: (v: string) => void;
  isAdminMode: boolean;
}

export const Navigation: React.FC<Props> = ({ view, setView, isAdminMode }) => {
  const { t } = useTranslation();

  // Eén tab: actief = licht navy vlakje met een limoengroen streepje onder het label.
  const tab = (id: string, Icon: React.ElementType, label: string, lang?: string) => {
    const active = view === id;
    return (
      <button
        onClick={() => setView(id)}
        aria-current={active ? 'page' : undefined}
        className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${active ? 'bg-navy/5 text-navy' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <Icon size={22} />
        <span lang={lang} className="text-[11px] font-semibold">{label}</span>
        <span aria-hidden className={`h-[3px] w-4 rounded-full ${active ? 'bg-volt' : 'bg-transparent'}`} />
      </button>
    );
  };

  // Zwevende navigatiekaart: los van de onderrand, met afgeronde hoeken en een zachte schaduw.
  // De wrapper laat klikken door (pointer-events-none), enkel de kaart zelf vangt ze op.
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 px-4 pb-3 pointer-events-none">
      <div className="pointer-events-auto max-w-2xl mx-auto flex gap-1 p-1.5 bg-white rounded-2xl ring-1 ring-navy/5 shadow-[0_12px_32px_-6px_rgba(4,23,76,0.25)]">
        {tab('dashboard', LayoutDashboard, t('nav.start'))}
        {tab('history', Gamepad2Icon, t('nav.matches'))}
        {tab('settings', Users, t('nav.team'))}
        {/* Enkel zichtbaar in Admin-mode: statistieken zijn niet relevant voor ouders/spelers */}
        {isAdminMode && tab('insights', BarChart3, 'Inzichten', 'nl')}
      </div>
    </nav>
  );
};
