import React from 'react';
import { Switch, useTheme, Text } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { useAppStore } from '../store/appStore';

export default function ThemeToggle() {
  const { settings, setThemeMode, setIsDark } = useAppStore();
  const theme = useTheme();
  const isDark = settings.themeMode === 'dark';

  const handleToggle = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
    setIsDark(newMode === 'dark');
  };

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
        Dark Mode
      </Text>
      <Switch
        value={isDark}
        onValueChange={handleToggle}
        color={theme.colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
