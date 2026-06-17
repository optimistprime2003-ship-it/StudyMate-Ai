import React from 'react';
import { useTheme, Text, Button } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, message, icon = 'file-document-outline', actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text style={{ fontSize: 40 }}>{icon === 'file-document-outline' ? '📄' : icon === 'chat-outline' ? '💬' : icon === 'school-outline' ? '🎓' : '📭'}</Text>
      </View>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    maxWidth: 280,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
  },
});
