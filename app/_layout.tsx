import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, useTheme } from 'react-native-paper';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAppStore } from '../src/store/appStore';
import { lightTheme, darkTheme } from '../src/theme/theme';
import DatabaseService from '../src/database/DatabaseService';
import TTSService from '../src/tts/TTSService';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
  });

  const { settings, isDark, setIsDark, hydrate } = useAppStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      await hydrate();
      try {
        await DatabaseService.initialize();
        await TTSService.initialize();
      } catch (error) {
        console.error('App init error:', error);
      }
      setReady(true);
    };
    initApp();
  }, []);

  useEffect(() => {
    if (settings.themeMode === 'system') {
      const prefersDark = window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
      setIsDark(prefersDark);
    }
  }, [settings.themeMode]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && ready) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, ready]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!ready) {
    return null;
  }

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <RootNavigator isDark={isDark} />
    </PaperProvider>
  );
}

function RootNavigator({ isDark }: { isDark: boolean }) {
  const theme = useTheme();

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reader" />
        <Stack.Screen name="search" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark' } />
    </>
  );
}
