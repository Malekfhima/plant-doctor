import type { LanguageCode } from './languages';

export const USE_LATIN_DIGITS_FOR_ARABIC = true;

function localeFor(language: LanguageCode): string {
  return language === 'ar' && USE_LATIN_DIGITS_FOR_ARABIC ? 'ar-u-nu-latn' : language;
}

export function formatNumber(
  value: number,
  language: LanguageCode,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(localeFor(language), options).format(value);
}

export function formatPercent(
  value: number,
  language: LanguageCode,
  maximumFractionDigits = 0
): string {
  return formatNumber(value, language, {
    style: 'percent',
    maximumFractionDigits,
  });
}

export function formatDate(
  value: Date | string | number,
  language: LanguageCode
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatRelativeTime(
  value: Date | string | number,
  language: LanguageCode,
  now: Date | number = Date.now()
): string {
  const date = value instanceof Date ? value : new Date(value);
  const nowMs = now instanceof Date ? now.getTime() : now;
  const seconds = (date.getTime() - nowMs) / 1000;
  const units: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  const [unit, divisor] = units.find(([, size]) => Math.abs(seconds) >= size) ?? [
    'second',
    1,
  ];

  return new Intl.RelativeTimeFormat(localeFor(language), {
    numeric: 'auto',
  }).format(Math.round(seconds / divisor), unit);
}

export function isolateLatinText(text: string, language: LanguageCode): string {
  return language === 'ar' ? `\u2066${text}\u2069` : text;
}
