import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect, useRef, useState } from 'react';
import { Alert, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import 'react-native-reanimated';

import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { applyLanguageDirection } from '@/i18n/direction';
import { i18nReady } from '@/i18n';
import { useLanguage } from '@/i18n/useLanguage';

void SplashScreen.preventAutoHideAsync();

export {
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    let active = true;
    i18nReady.then(
      () => {
        if (active) {
          setIsI18nReady(true);
        }
      },
      (error: unknown) => {
        if (active) {
          setInitializationError(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
    );
    return () => {
      active = false;
    };
  }, []);

  if (fontError) {
    throw fontError;
  }
  if (initializationError) {
    throw initializationError;
  }
  if (!isI18nReady || !fontsLoaded) {
    return null;
  }

  return <ApplicationShell />;
}

function ApplicationShell() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { language, isRTL, syncLanguageFromProfile } = useLanguage();
  const [directionReady, setDirectionReady] = useState(false);
  const hasLoadedProfileLanguage = useRef(false);

  useEffect(() => {
    let active = true;
    void applyLanguageDirection(language).then(
      () => {
        if (active) {
          setDirectionReady(true);
        }
      },
      (error: unknown) => {
        console.error('Could not apply the saved app layout direction.', error);
        if (active) {
          setDirectionReady(true);
          Alert.alert(
            t('errors.directionReloadFailedTitle'),
            t('errors.directionReloadFailedMessage')
          );
        }
      }
    );
    return () => {
      active = false;
    };
  }, [isRTL, language, t]);

  useEffect(() => {
    if (hasLoadedProfileLanguage.current) {
      return;
    }
    hasLoadedProfileLanguage.current = true;
    void syncLanguageFromProfile().catch((error: unknown) => {
      console.error('Could not load the saved profile language.', error);
      Alert.alert(t('errors.profileSyncFailedTitle'), t('errors.profileSyncFailedMessage'));
    });
  }, [syncLanguageFromProfile, t]);

  useEffect(() => {
    if (directionReady) {
      void SplashScreen.hideAsync();
    }
  }, [directionReady]);

  if (!directionReady) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
