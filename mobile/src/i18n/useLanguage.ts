import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform } from 'react-native';

import { getProfileLanguage, updateProfileLanguage } from '@/api/profile';

import { applyLanguageDirection, isRTLForLanguage } from './direction';
import { updateLanguagePreference } from './languagePreference';
import { LANGUAGES, type LanguageCode } from './languages';
import { LANGUAGE_STORAGE_KEY } from './index';

export interface LanguageChangeOptions {
  syncBackend?: boolean;
}

export interface LanguageController {
  language: LanguageCode;
  isRTL: boolean;
  changeLanguage: (
    language: LanguageCode,
    options?: LanguageChangeOptions
  ) => Promise<void>;
  syncLanguageFromProfile: () => Promise<void>;
}

export function useLanguage(): LanguageController {
  const { i18n, t } = useTranslation();
  const language = (i18n.resolvedLanguage ?? i18n.language) as LanguageCode;
  const isRTL = LANGUAGES.find((item) => item.code === language)?.isRTL ?? false;

  const changeLanguage = useCallback(
    async (
      nextLanguage: LanguageCode,
      options: LanguageChangeOptions = {}
    ): Promise<void> => {
      const shouldSyncBackend = options.syncBackend ?? true;
      const persist = async (languageToSave: LanguageCode) => {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageToSave);
      };

      const nextIsRTL = isRTLForLanguage(nextLanguage);
      if (Platform.OS !== 'web' && nextIsRTL !== isRTL) {
        await persist(nextLanguage);
        if (shouldSyncBackend) {
          await updateProfileLanguage(nextLanguage);
        }
        Alert.alert(
          t('common.directionChangeTitle'),
          t('common.directionChangeMessage'),
          [
            {
              text: t('common.restartNow'),
              onPress: () => {
                void applyLanguageDirection(nextLanguage).catch(
                  async (reloadError: unknown) => {
                    console.error('Could not reload after changing text direction.', reloadError);
                    try {
                      await i18n.changeLanguage(nextLanguage);
                    } catch (languageError) {
                      console.error(
                        'Could not apply the selected language after reload failed.',
                        languageError
                      );
                    }
                    const translated = i18n.getFixedT(nextLanguage);
                    Alert.alert(
                      translated('errors.directionReloadFailedTitle'),
                      translated('errors.directionReloadFailedMessage')
                    );
                  }
                );
              },
            },
          ],
          { cancelable: false }
        );
        return;
      }

      await updateLanguagePreference(nextLanguage, {
        persist,
        apply: async (languageToApply) => {
          await applyLanguageDirection(languageToApply);
          await i18n.changeLanguage(languageToApply);
        },
        synchronize: shouldSyncBackend
          ? async (languageToSync) => {
              await updateProfileLanguage(languageToSync);
            }
          : undefined,
      });
    },
    [i18n, isRTL, t]
  );

  const syncLanguageFromProfile = useCallback(async (): Promise<void> => {
    const profileLanguage = await getProfileLanguage();
    if (profileLanguage && profileLanguage !== language) {
      await changeLanguage(profileLanguage, { syncBackend: false });
    }
  }, [changeLanguage, language]);

  return { language, isRTL, changeLanguage, syncLanguageFromProfile };
}
