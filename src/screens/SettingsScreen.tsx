import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Switch, Divider, List } from 'react-native-paper';
import { useAppStore } from '../store/appStore';
import ThemeToggle from '../components/ThemeToggle';

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, setVoiceEnabled, setVoiceSpeed } = useAppStore();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
          Settings
        </Text>
      </View>

      <List.Section>
        <List.Subheader style={{ color: theme.colors.primary }}>Appearance</List.Subheader>
        <ThemeToggle />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader style={{ color: theme.colors.primary }}>Voice & Audio</List.Subheader>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              Text-to-Speech
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Read document content aloud
            </Text>
          </View>
          <Switch
            value={settings.voiceEnabled}
            onValueChange={setVoiceEnabled}
            color={theme.colors.primary}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              Voice Speed
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {settings.voiceSpeed.toFixed(1)}x
            </Text>
          </View>
        </View>
        <View style={styles.sliderContainer}>
          <View style={styles.sliderButtons}>
            {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
              <View
                key={speed}
                style={[
                  styles.speedBtn,
                  { backgroundColor: settings.voiceSpeed === speed ? theme.colors.primary : theme.colors.surfaceVariant },
                ]}
                onTouchEnd={() => setVoiceSpeed(speed)}
              >
                <Text
                  style={{
                    color: settings.voiceSpeed === speed ? '#FFFFFF' : theme.colors.onSurfaceVariant,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {speed.toFixed(speed % 1 === 0 ? 0 : 2)}x
                </Text>
              </View>
            ))}
          </View>
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader style={{ color: theme.colors.primary }}>About</List.Subheader>
        <List.Item
          title="StudyMate AI"
          description="Version 1.0.0"
          left={(props) => <List.Icon {...props} icon="book-education" />}
        />
        <List.Item
          title="Built with React Native & Expo"
          description="AI-powered study companion"
          left={(props) => <List.Icon {...props} icon="code-tags" />}
        />
      </List.Section>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          StudyMate AI v1.0.0 — Module 1: Core Navigation & UI
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  settingInfo: { flex: 1, gap: 2 },
  sliderContainer: { paddingHorizontal: 16, marginBottom: 8 },
  sliderButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  speedBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  footer: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 },
});
