export type LanguageCode = 'fr' | 'en' | 'ar';

export interface LanguageDefinition {
  code: LanguageCode;
  nativeName: string;
  isRTL: boolean;
}

export const LANGUAGES: readonly LanguageDefinition[] = [
  { code: 'fr', nativeName: 'Français', isRTL: false },
  { code: 'en', nativeName: 'English', isRTL: false },
  { code: 'ar', nativeName: 'العربية', isRTL: true },
];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

export function languageCodeFromLocale(
  locale: string | null | undefined
): LanguageCode | undefined {
  const code = locale?.split(/[-_]/, 1)[0]?.toLowerCase();
  return isLanguageCode(code) ? code : undefined;
}

export function resolveInitialLanguage(
  savedLanguage: string | null | undefined,
  deviceLocales: readonly (string | null | undefined)[]
): LanguageCode {
  if (isLanguageCode(savedLanguage)) {
    return savedLanguage;
  }

  for (const locale of deviceLocales) {
    const language = languageCodeFromLocale(locale);
    if (language) {
      return language;
    }
  }

  return 'en';
}
