import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const LANGUAGE_KEY = 'societyhub-language';
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'];

const languageLoaders = {
  en: () => import('./locales/en.json'),
  hi: () => import('./locales/hi.json'),
  mr: () => import('./locales/mr.json')
};

export const getSavedLanguage = () => {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return SUPPORTED_LANGUAGES.includes(saved) ? saved : 'en';
};

export const loadLanguage = async (lng) => {
  const safeLanguage = SUPPORTED_LANGUAGES.includes(lng) ? lng : 'en';
  if (i18n.hasResourceBundle(safeLanguage, 'translation')) return safeLanguage;

  const module = await languageLoaders[safeLanguage]();
  i18n.addResourceBundle(safeLanguage, 'translation', module.default || module, true, true);
  return safeLanguage;
};

export const changeLanguage = async (lng) => {
  const safeLanguage = await loadLanguage(lng);
  localStorage.setItem(LANGUAGE_KEY, safeLanguage);
  await i18n.changeLanguage(safeLanguage);
  document.documentElement.lang = safeLanguage;
  window.dispatchEvent(new CustomEvent('societyhubLanguageRefresh'));
  return safeLanguage;
};

export const initializeI18n = async () => {
  const savedLanguage = getSavedLanguage();
  const english = await languageLoaders.en();
  const resources = {
    en: { translation: english.default || english }
  };

  if (savedLanguage !== 'en') {
    const selected = await languageLoaders[savedLanguage]();
    resources[savedLanguage] = { translation: selected.default || selected };
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGUAGES,
      interpolation: { escapeValue: false },
      react: { useSuspense: true }
    });

  document.documentElement.lang = savedLanguage;
  localStorage.setItem(LANGUAGE_KEY, savedLanguage);
  return i18n;
};

export default i18n;
