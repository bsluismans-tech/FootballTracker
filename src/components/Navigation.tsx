import React from 'react';
import { LayoutDashboard, Users, Gamepad2Icon, BarChart3 } from 'lucide-react';

interface Props {
  view: string;
  setView: (v: string) => void;
  isAdminMode: boolean;
}

export const Navigation: React.FC<Props> = ({ view, setView, isAdminMode }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-1 pb-3 shadow-2xl z-50">
      <div className="max-w-2xl mx-auto w-full flex justify-around">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center p-2 ${view === 'dashboard' ? 'text-[#04174C]' : 'text-gray-400'}`}>
          <LayoutDashboard size={24} />
          <span className="text-[10px] mt-1 font-bold">START</span>
        </button>

        <button onClick={() => setView('history')} className={`flex flex-col items-center p-2 ${view === 'history' ? 'text-gray-800' : 'text-gray-400'}`}>
          <Gamepad2Icon size={24} />
          <span className="text-[10px] mt-1 font-bold">WEDSTRIJDEN</span>
        </button>

        <button onClick={() => setView('settings')} className={`flex flex-col items-center p-2 ${view === 'settings' ? 'text-[#04174C]' : 'text-gray-400'}`}>
          <Users size={24} />
          <span className="text-[10px] mt-1 font-bold">PLOEG</span>
        </button>

        {/* Enkel zichtbaar in Admin-mode: statistieken zijn niet relevant voor ouders/spelers */}
        {isAdminMode && (
          <button onClick={() => setView('insights')} className={`flex flex-col items-center p-2 ${view === 'insights' ? 'text-[#04174C]' : 'text-gray-400'}`}>
            <BarChart3 size={24} />
            <span className="text-[10px] mt-1 font-bold">INZICHTEN</span>
          </button>
        )}
      </div>
    </nav>
  );
};