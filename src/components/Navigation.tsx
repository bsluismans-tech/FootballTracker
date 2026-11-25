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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-1 pb-3 shadow-2xl z-50">
      <div className="max-w-2xl mx-auto w-full flex justify-around">
        <button onClick={() => setView('dashboard')} className={`relative flex flex-col items-center px-3 py-2 transition-colors ${view === 'dashboard' ? 'text-navy' : 'text-gray-400'}`}>
          {view === 'dashboard' && <span aria-hidden className="absolute -top-1 inset-x-3 h-1 rounded-b-sm bg-volt" />}
          <LayoutDashboard size={24} />
          <span className="text-[11px] mt-1 font-semibold">{t('nav.start')}</span>
        </button>

        <button onClick={() => setView('history')} className={`relative flex flex-col items-center px-3 py-2 transition-colors ${view === 'history' ? 'text-navy' : 'text-gray-400'}`}>
          {view === 'history' && <span aria-hidden className="absolute -top-1 inset-x-3 h-1 rounded-b-sm bg-volt" />}
          <Gamepad2Icon size={24} />
          <span className="text-[11px] mt-1 font-semibold">{t('nav.matches')}</span>
        </button>

        <button onClick={() => setView('settings')} className={`relative flex flex-col items-center px-3 py-2 transition-colors ${view === 'settings' ? 'text-navy' : 'text-gray-400'}`}>
          {view === 'settings' && <span aria-hidden className="absolute -top-1 inset-x-3 h-1 rounded-b-sm bg-volt" />}
          <Users size={24} />
          <span className="text-[11px] mt-1 font-semibold">{t('nav.team')}</span>
        </button>

        {/* Enkel zichtbaar in Admin-mode: statistieken zijn niet relevant voor ouders/spelers */}
        {isAdminMode && (
          <button onClick={() => setView('insights')} className={`relative flex flex-col items-center px-3 py-2 transition-colors ${view === 'insights' ? 'text-navy' : 'text-gray-400'}`}>
          {view === 'insights' && <span aria-hidden className="absolute -top-1 inset-x-3 h-1 rounded-b-sm bg-volt" />}
            <BarChart3 size={24} />
            <span lang="nl" className="text-[11px] mt-1 font-semibold">Inzichten</span>
          </button>
        )}
      </div>
    </nav>
  );
};