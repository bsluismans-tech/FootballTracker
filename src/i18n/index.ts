import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { nl } from './locales/nl';
import { en } from './locales/en';
import { fr } from './locales/fr';
import { pl } from './locales/pl';
import { ar } from './locales/ar';

// dateLocale: gebruikt voor datums (toLocaleDateString). Voor Arabisch forceren we westerse
// cijfers (nu-latn), zodat datums er hetzelfde uitzien als scores en minuten.
export const LANGUAGES = [
  { code: 'nl', label: 'Nederlands', dateLocale: 'nl-NL' },
  { code: 'en', label: 'English', dateLocale: 'en-GB' },
  { code: 'fr', label: 'Français', dateLocale: 'fr-BE' },
  { code: 'pl', label: 'Polski', dateLocale: 'pl-PL' },
  { code: 'ar', label: 'العربية', dateLocale: 'ar-u-nu-latn' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

const STORAGE_KEY = 'language';
const RTL_LANGUAGES: LanguageCode[] = ['ar'];

const isSupported = (code: string): code is LanguageCode => LANGUAGES.some(l => l.code === code);

// Bewust gekozen taal (per toestel) gaat voor; anders de taal van de telefoon als we die
// ondersteunen; anders Nederlands.
const detectLanguage = (): LanguageCode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isSupported(stored)) return stored;
  } catch { /* localStorage niet beschikbaar (bv. privénavigatie) */ }

  for (const lang of navigator.languages ?? [navigator.language]) {
    const code = lang.toLowerCase().split('-')[0];
    if (isSupported(code)) return code;
  }
  return 'nl';
};

const applyToDocument = (code: string) => {
  document.documentElement.lang = code;
  document.documentElement.dir = RTL_LANGUAGES.includes(code as LanguageCode) ? 'rtl' : 'ltr';
};

i18n.use(initReactI18next).init({
  resources: {
    nl: { translation: nl },
    en: { translation: en },
    fr: { translation: fr },
    pl: { translation: pl },
    ar: { translation: ar },
  },
  lng: detectLanguage(),
  fallbackLng: 'nl',
  interpolation: { escapeValue: false }, // React escapet zelf al
});

applyToDocument(i18n.language);
i18n.on('languageChanged', applyToDocument);

export const setLanguage = (code: LanguageCode) => {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch { /* geen probleem, dan geldt de keuze enkel voor deze sessie */ }
  i18n.changeLanguage(code);
};

export const getDateLocale = (): string =>
  LANGUAGES.find(l => l.code === i18n.language)?.dateLocale ?? 'nl-NL';

export default i18n;
