import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Clipboard,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { localLLMService, SummaryMode } from './LocalLLMService';

interface Tab {
  key: SummaryMode;
  label: string;
}

const TABS: Tab[] = [
  { key: 'short', label: 'Short' },
  { key: 'detailed', label: 'Detailed' },
  { key: 'exam', label: 'Exam' },
  { key: 'bullets', label: 'Bullets' },
];

interface Props {
  documentText: string;
  documentTitle: string;
  onModelNotLoaded?: () => void;
}

export default function SummaryComponent({
  documentText,
  documentTitle,
  onModelNotLoaded,
}: Props) {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<SummaryMode>('short');
  const [summaries, setSummaries] = useState<Partial<Record<SummaryMode, string>>>({});
  const [loading, setLoading] = useState<SummaryMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (mode: SummaryMode) => {
    if (summaries[mode]) {
      setActiveTab(mode);
      return;
    }

    if (!localLLMService.isModelLoaded()) {
      onModelNotLoaded?.();
      return;
    }

    setActiveTab(mode);
    setLoading(mode);
    setError(null);

    try {
      const result = await localLLMService.summarize(documentText, mode);
      setSummaries((prev) => ({ ...prev, [mode]: result }));
    } catch (err) {
      setError('Failed to generate summary. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleCopy = () => {
    const content = summaries[activeTab];
    if (!content) return;
    Clipboard.setString(content);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const content = summaries[activeTab];
    if (!content) return;
    await Share.share({
      message: `Summary of "${documentTitle}":\n\n${content}`,
      title: `${documentTitle} Summary`,
    });
  };

  const currentContent = summaries[activeTab];
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => handleGenerate(tab.key)}
            activeOpacity={0.75}
          >
            {loading === tab.key ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            )}
            {summaries[tab.key] && (
              <View style={styles.tabDot} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, !currentContent && styles.actionButtonDisabled]}
          onPress={handleCopy}
          disabled={!currentContent}
          activeOpacity={0.7}
        >
          <Feather name={copied ? 'check' : 'copy'} size={14} color={copied ? '#4CAF50' : colors.mutedForeground} />
          <Text style={[styles.actionButtonText, copied && { color: '#4CAF50' }]}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.actionButton, !currentContent && styles.actionButtonDisabled]}
            onPress={handleShare}
            disabled={!currentContent}
            activeOpacity={0.7}
          >
            <Feather name="share" size={14} color={colors.mutedForeground} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleGenerate(activeTab)}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={14} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>Regenerate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentArea}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentPadding}
      >
        {error ? (
          <View style={styles.errorState}>
            <Feather name="x-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : loading === activeTab ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Generating {activeTab} summary...</Text>
          </View>
        ) : currentContent ? (
          <Text style={styles.summaryText}>{currentContent}</Text>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="file-text" size={36} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No summary yet</Text>
            <Text style={styles.emptySubtext}>
              Tap a tab above to generate a {activeTab} summary of this document.
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => handleGenerate(activeTab)}
              activeOpacity={0.75}
            >
              <Feather name="zap" size={14} color="#fff" />
              <Text style={styles.generateButtonText}>Generate Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      position: 'relative' as const,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: '#7C3AED',
    },
    tabText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.mutedForeground,
    },
    tabTextActive: {
      color: '#7C3AED',
      fontWeight: '700' as const,
    },
    tabDot: {
      position: 'absolute' as const,
      top: 6,
      right: 8,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#4CAF50',
    },
    actionBar: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.secondary,
    },
    actionButtonDisabled: {
      opacity: 0.4,
    },
    actionButtonText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: '500' as const,
    },
    contentArea: {
      flex: 1,
    },
    contentPadding: {
      padding: 16,
      flexGrow: 1,
    },
    summaryText: {
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 24,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingVertical: 60,
    },
    loadingText: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    errorState: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 16,
      backgroundColor: '#FEF2F2',
      borderRadius: 12,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      color: '#EF4444',
      lineHeight: 20,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.foreground,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center' as const,
      maxWidth: 260,
      lineHeight: 20,
    },
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#7C3AED',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    generateButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#fff',
    },
  });
