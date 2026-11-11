import { isLanguageCode, type LanguageCode } from '../i18n/languages';

import { requestAuthenticated } from './client';

export async function getProfileLanguage(): Promise<LanguageCode | null> {
  const profile = await requestAuthenticated('/api/v1/me');
  if (profile === null) {
    return null;
  }
  if (!isRecord(profile) || !isLanguageCode(profile.language)) {
    throw new Error('The profile response contains an unsupported language.');
  }
  return profile.language;
}

export async function updateProfileLanguage(
  language: LanguageCode
): Promise<boolean> {
  const profile = await requestAuthenticated('/api/v1/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  });
  if (profile === null) {
    return false;
  }
  if (!isRecord(profile) || !isLanguageCode(profile.language)) {
    throw new Error('The profile response contains an unsupported language.');
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
