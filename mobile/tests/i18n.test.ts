import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';

import { ApiError, configureAccessTokenProvider } from '../src/api/client';
import { analyzePlant } from '../src/api/analysis';
import { getProfileLanguage, updateProfileLanguage } from '../src/api/profile';
import { localizedApiError } from '../src/i18n/apiErrors';
import ar from '../src/i18n/locales/ar.json';
import en from '../src/i18n/locales/en.json';
import fr from '../src/i18n/locales/fr.json';
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  isolateLatinText,
} from '../src/i18n/formatters';
import { resolveInitialLanguage } from '../src/i18n/languages';
import { updateLanguagePreference } from '../src/i18n/languagePreference';

afterEach(() => {
  configureAccessTokenProvider(null);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('language selection', () => {
  it('prefers a saved supported language, then a supported device locale, then English', () => {
    expect(resolveInitialLanguage('ar', ['fr-FR'])).toBe('ar');
    expect(resolveInitialLanguage('de', ['es-ES', 'fr-FR'])).toBe('fr');
    expect(resolveInitialLanguage(null, ['de-DE'])).toBe('en');
  });

  it('persists and applies a language before syncing it', async () => {
    const events: string[] = [];

    await updateLanguagePreference('ar', {
      persist: async (language) => {
        events.push(`persist:${language}`);
      },
      apply: async (language) => {
        events.push(`apply:${language}`);
      },
      synchronize: async (language) => {
        events.push(`sync:${language}`);
      },
    });

    expect(events).toEqual(['persist:ar', 'apply:ar', 'sync:ar']);
  });
});

describe('translations and formatting', () => {
  it('uses the language-specific plural forms, including Arabic plural categories', async () => {
    const i18n = createInstance();
    await i18n.init({
      lng: 'ar',
      fallbackLng: 'en',
      resources: {
        fr: { translation: fr },
        en: { translation: en },
        ar: { translation: ar },
      },
      interpolation: { escapeValue: false },
    });

    expect(i18n.t('history.scansCount', { count: 0 })).toBe(ar.history.scansCount_zero);
    expect(i18n.t('history.scansCount', { count: 1 })).toBe('تشخيص واحد (1)');
    expect(i18n.t('history.scansCount', { count: 2 })).toBe('تشخيصان (2)');
    expect(i18n.t('history.scansCount', { count: 7 })).toBe('7 تشخيصات');
    expect(i18n.t('history.scansCount', { count: 20 })).toBe('20 تشخيصًا');
    expect(i18n.t('history.scansCount', { count: 101 })).toBe('101 تشخيص');
  });

  it('formats numbers, percentages, dates, relative time, and Arabic mixed-direction text', () => {
    const now = new Date('2026-01-15T12:00:00Z');

    expect(formatNumber(1234.5, 'ar')).toContain('1');
    expect(formatPercent(0.93, 'ar')).toContain('93');
    expect(formatDate(now, 'fr')).toContain('2026');
    expect(formatRelativeTime('2026-01-15T10:00:00Z', 'en', now)).toBe('2 hours ago');
    expect(isolateLatinText('Rosa canina', 'ar')).toBe('\u2066Rosa canina\u2069');
    expect(isolateLatinText('Rosa canina', 'fr')).toBe('Rosa canina');
  });
});

describe('profile language synchronization', () => {
  it('reads and patches the authenticated profile language', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.example.test/');
    configureAccessTokenProvider(async () => 'test-access-token');
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ language: 'ar' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ language: 'fr' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getProfileLanguage()).resolves.toBe('ar');
    await expect(updateProfileLanguage('fr')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, request] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api.example.test/api/v1/me');
    expect(new Headers(request?.headers).get('Authorization')).toBe(
      'Bearer test-access-token'
    );
    expect(request?.body).toBe(JSON.stringify({ language: 'fr' }));
  });

  it('skips profile calls when no authenticated token provider is configured', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await expect(getProfileLanguage()).resolves.toBeNull();
    await expect(updateProfileLanguage('en')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the active language as a multipart analysis field', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.example.test');
    configureAccessTokenProvider(async () => 'test-access-token');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ plant_name: 'ريحان' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const formData = new FormData();
    formData.append('plant_hint', 'basil');

    await analyzePlant(formData, 'ar');

    expect(formData.get('language')).toBe('ar');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/api/v1/analyze');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });
});

describe('backend error translations', () => {
  it('maps known API error codes to localized keys', () => {
    const message = localizedApiError(
      new ApiError('RATE_LIMITED', 429, 'Too many requests.'),
      (key) => (key === 'errors.api.RATE_LIMITED' ? 'Translated rate limit' : key)
    );

    expect(message).toBe('Translated rate limit');
  });
});
