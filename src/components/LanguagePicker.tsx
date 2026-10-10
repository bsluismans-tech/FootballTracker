import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage, type LanguageCode } from '../i18n';

// Klein taalknopje: een native <select> ligt onzichtbaar over het pilletje, zodat iOS/Android
// hun eigen vertrouwde keuzelijst tonen.
export const LanguagePicker: React.FC = () => {
  const { t, i18n } = useTranslation();

  return (
    <label className="relative flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/70 border border-[#04174C]/10 text-[#04174C]/60 text-[10px] font-black uppercase tracking-widest cursor-pointer shrink-0">
      <Globe size={12} />
      {i18n.language}
      <select
        aria-label={t('language.label')}
        value={i18n.language}
        onChange={e => setLanguage(e.target.value as LanguageCode)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </label>
  );
};
