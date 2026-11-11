import { DevSettings, I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';

import type { LanguageCode } from './languages';

export function isRTLForLanguage(language: LanguageCode): boolean {
  return language === 'ar';
}

export async function applyLanguageDirection(language: LanguageCode): Promise<void> {
  const isRTL = isRTLForLanguage(language);

  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
    return;
  }

  const reloadRequired = I18nManager.isRTL !== isRTL;
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);

  if (!reloadRequired) {
    return;
  }

  if (__DEV__) {
    DevSettings.reload('Apply the selected layout direction');
    return;
  }

  if (!Updates.isEnabled) {
    throw new Error(
      'Expo Updates must be configured for automatic layout-direction reloads in release builds.'
    );
  }

  await Updates.reloadAsync();
}
