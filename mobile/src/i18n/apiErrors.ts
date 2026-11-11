import { ApiError } from '../api/client';

export type Translate = (key: string, options?: { defaultValue?: string }) => string;

export function localizedApiError(
  error: unknown,
  translate: Translate
): string {
  if (error instanceof ApiError) {
    const key = `errors.api.${error.code}`;
    const translated = translate(key, { defaultValue: '' });
    if (translated) {
      return translated;
    }
  }

  return translate('errors.api.HTTP_ERROR');
}
