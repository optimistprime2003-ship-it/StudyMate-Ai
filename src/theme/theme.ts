import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const fontConfig = {
  displayLarge: { fontFamily: 'Inter-Bold', fontSize: 57, lineHeight: 64, letterSpacing: -0.25 },
  displayMedium: { fontFamily: 'Inter-Bold', fontSize: 45, lineHeight: 52 },
  displaySmall: { fontFamily: 'Inter-Bold', fontSize: 36, lineHeight: 44 },
  headlineLarge: { fontFamily: 'Inter-Bold', fontSize: 32, lineHeight: 40 },
  headlineMedium: { fontFamily: 'Inter-Bold', fontSize: 28, lineHeight: 36 },
  headlineSmall: { fontFamily: 'Inter-Bold', fontSize: 24, lineHeight: 32 },
  titleLarge: { fontFamily: 'Inter-Bold', fontSize: 22, lineHeight: 28 },
  titleMedium: { fontFamily: 'Inter-Bold', fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  titleSmall: { fontFamily: 'Inter-Bold', fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  bodyLarge: { fontFamily: 'Inter-Regular', fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  bodyMedium: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  bodySmall: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  labelLarge: { fontFamily: 'Inter-Bold', fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  labelMedium: { fontFamily: 'Inter-Bold', fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  labelSmall: { fontFamily: 'Inter-Bold', fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
};

// Use tertiary as the accent color slot in MD3
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366F1',
    primaryContainer: '#E0E7FF',
    secondary: '#8B5CF6',
    secondaryContainer: '#EDE9FE',
    tertiary: '#06B6D4',
    tertiaryContainer: '#CFFAFE',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    onBackground: '#0F172A',
    onSurface: '#1E293B',
    onSurfaceVariant: '#475569',
    outline: '#CBD5E1',
    outlineVariant: '#E2E8F0',
    error: '#EF4444',
    errorContainer: '#FEE2E2',
    onError: '#FFFFFF',
    onErrorContainer: '#991B1B',
    inverseSurface: '#1E293B',
    inverseOnSurface: '#F1F5F9',
    inversePrimary: '#A5B4FC',
    shadow: '#94A3B8',
    scrim: '#000000',
    backdrop: 'rgba(0,0,0,0.4)',
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8',
    primaryContainer: '#4338CA',
    secondary: '#A78BFA',
    secondaryContainer: '#5B21B6',
    tertiary: '#22D3EE',
    tertiaryContainer: '#164E63',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceVariant: '#334155',
    onBackground: '#F8FAFC',
    onSurface: '#E2E8F0',
    onSurfaceVariant: '#94A3B8',
    outline: '#475569',
    outlineVariant: '#334155',
    error: '#F87171',
    errorContainer: '#7F1D1D',
    onError: '#FFFFFF',
    onErrorContainer: '#FCA5A5',
    inverseSurface: '#F1F5F9',
    inverseOnSurface: '#1E293B',
    inversePrimary: '#6366F1',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0,0,0,0.6)',
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
};

export const Colors = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  accent: '#06B6D4',
  backgroundLight: '#F8FAFC',
  backgroundDark: '#0F172A',
  surfaceLight: '#FFFFFF',
  surfaceDark: '#1E293B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
