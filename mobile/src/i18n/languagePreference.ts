import type { LanguageCode } from './languages';

export interface LanguagePreferenceDependencies {
  persist: (language: LanguageCode) => Promise<void>;
  apply: (language: LanguageCode) => Promise<void>;
  synchronize?: (language: LanguageCode) => Promise<void>;
}

export async function updateLanguagePreference(
  language: LanguageCode,
  dependencies: LanguagePreferenceDependencies
): Promise<void> {
  await dependencies.persist(language);
  await dependencies.apply(language);
  await dependencies.synchronize?.(language);
}
