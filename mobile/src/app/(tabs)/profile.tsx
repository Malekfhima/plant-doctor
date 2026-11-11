import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedText } from '@/components/LocalizedText';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function ProfileScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <LocalizedText style={styles.title}>{t('profile.title')}</LocalizedText>
        <View style={styles.section}>
          <LocalizedText style={styles.sectionTitle}>{t('profile.languageTitle')}</LocalizedText>
          <LocalizedText style={styles.description}>{t('profile.languageDescription')}</LocalizedText>
          <LanguageSelector />
        </View>
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
    gap: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    color: '#1e2d22',
    fontSize: 28,
    fontWeight: '700',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#253329',
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: '#59665b',
    fontSize: 15,
    marginBottom: 4,
  },
});
