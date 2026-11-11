import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { Platform } from 'react-native';

import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import { resolveInitialLanguage } from './languages';

const LANGUAGE_STORAGE_KEY = '@plantdoctor/language';
const i18n = createInstance();

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  ar: { translation: ar },
} as const;

async function initializeI18n(): Promise<void> {
  const isServerRender = Platform.OS === 'web' && typeof window === 'undefined';
  const savedLanguage = isServerRender
    ? null
    : await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const initialLanguage = resolveInitialLanguage(
    savedLanguage,
    getLocales().map((locale) => locale.languageCode ?? locale.languageTag)
  );

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    supportedLngs: ['fr', 'en', 'ar'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export const i18nReady = initializeI18n();
export { LANGUAGE_STORAGE_KEY };
export default i18n;
