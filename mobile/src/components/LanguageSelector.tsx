import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client';
import { LocalizedText } from '@/components/LocalizedText';
import { localizedApiError } from '@/i18n/apiErrors';
import { LANGUAGES, type LanguageCode } from '@/i18n/languages';
import { useLanguage } from '@/i18n/useLanguage';

export function LanguageSelector() {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectLanguage = async (code: LanguageCode) => {
    if (isSaving || code === language) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await changeLanguage(code);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof ApiError
          ? localizedApiError(error, (key, options) =>
              t(key, { defaultValue: options?.defaultValue ?? key })
            )
          : t('common.languageSaveError')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View accessibilityRole="radiogroup" style={styles.container}>
      {LANGUAGES.map((item) => {
        const selected = item.code === language;
        return (
          <Pressable
            key={item.code}
            accessibilityRole="radio"
            accessibilityLabel={item.nativeName}
            accessibilityState={{ checked: selected, disabled: isSaving }}
            disabled={isSaving}
            onPress={() => void selectLanguage(item.code)}
            style={[styles.option, selected && styles.selectedOption]}
          >
            <LocalizedText style={[styles.label, selected && styles.selectedLabel]}>
              {item.nativeName}
            </LocalizedText>
          </Pressable>
        );
      })}
      {errorMessage ? (
        <LocalizedText accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </LocalizedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  option: {
    alignItems: 'center',
    borderColor: '#d8e2d5',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  selectedOption: {
    backgroundColor: '#eaf3e7',
    borderColor: '#3e7045',
  },
  label: {
    color: '#253329',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedLabel: {
    color: '#2d6137',
  },
  error: {
    color: '#a33030',
    fontSize: 14,
    textAlign: 'center',
  },
});
