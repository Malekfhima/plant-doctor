import type { LanguageCode } from '../i18n/languages';

import { requestAuthenticated } from './client';

export async function analyzePlant(
  formData: FormData,
  language: LanguageCode
): Promise<unknown | null> {
  formData.append('language', language);
  return requestAuthenticated('/api/v1/analyze', {
    method: 'POST',
    body: formData,
  });
}
