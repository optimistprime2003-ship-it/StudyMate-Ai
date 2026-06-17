import React from 'react';
import { Card, Text, Badge, IconButton } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import type { Document } from './ModuleConnector';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_COLORS } from './ModuleConnector';
import { useAppStore } from '../store/appStore';

interface DocumentCardProps {
  document: Document;
  onPress?: (doc: Document) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function DocumentCard({ document, onPress }: DocumentCardProps) {
  const isDark = useAppStore((s) => s.isDark);

  return (
    <Card
      style={[styles.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
      onPress={() => onPress?.(document)}
      mode="elevated"
      elevation={1}
    >
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text
              variant="titleMedium"
              style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}
              numberOfLines={1}
            >
              {document.title}
            </Text>
            <Badge
              style={[styles.badge, { backgroundColor: DOCUMENT_TYPE_COLORS[document.type] }]}
              size={20}
            >
              {DOCUMENT_TYPE_LABELS[document.type]}
            </Badge>
          </View>
          <Text
            variant="bodySmall"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            {formatBytes(document.size)} · {timeAgo(document.lastOpened)}
          </Text>
        </View>
        <IconButton
          icon="chevron-right"
          size={20}
          iconColor={isDark ? '#94A3B8' : '#64748B'}
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 0,
  },
  header: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    color: '#FFFFFF',
  },
});
