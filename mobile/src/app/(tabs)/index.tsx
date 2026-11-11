import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedText } from '@/components/LocalizedText';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <LocalizedText style={styles.brand}>{t('common.brand')}</LocalizedText>
        <LocalizedText style={styles.title}>{t('home.title')}</LocalizedText>
        <LocalizedText style={styles.subtitle}>{t('home.subtitle')}</LocalizedText>
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
    gap: 16,
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
    lineHeight: 24,
    textAlign: 'center',
  },
});
