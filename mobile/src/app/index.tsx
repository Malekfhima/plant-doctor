import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSelector } from '@/components/LanguageSelector';
import { LocalizedText } from '@/components/LocalizedText';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const [isContinuing, setIsContinuing] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <LocalizedText style={styles.brand}>{t('common.brand')}</LocalizedText>
        <LocalizedText style={styles.title}>{t('onboarding.title')}</LocalizedText>
        <LocalizedText style={styles.subtitle}>{t('onboarding.subtitle')}</LocalizedText>
        <LanguageSelector />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.continue')}
          disabled={isContinuing}
          onPress={() => {
            setIsContinuing(true);
            router.replace('/(tabs)');
          }}
          style={({ pressed }) => [
            styles.continueButton,
            pressed && styles.pressedButton,
          ]}
        >
          <LocalizedText style={styles.continueLabel}>{t('common.continue')}</LocalizedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f7f8f3',
    flex: 1,
  },
  container: {
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    color: '#3e7045',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    color: '#1e2d22',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#59665b',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  continueButton: {
    alignItems: 'center',
    backgroundColor: '#3e7045',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
    paddingHorizontal: 20,
  },
  pressedButton: {
    opacity: 0.8,
  },
  continueLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
