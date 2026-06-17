import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Copy, Share, FileText, Check } from 'lucide-react-native';
import { localLLMService } from './LocalLLMService';
import { SUMMARY_MODE_PROMPTS } from './PromptTemplates';
import type { SummaryMode } from './types';

interface Props {
  text: string;
  documentTitle?: string;
}

type SummaryTab = 'short' | 'detailed' | 'exam' | 'bullets';

export default function SummaryComponent({ text, documentTitle }: Props) {
  const [activeTab, setActiveTab] = useState<SummaryTab>('short');
  const [summaries, setSummaries] = useState<Record<SummaryTab, string | null>>({
    short: null,
    detailed: null,
    exam: null,
    bullets: null,
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateSummary = async (mode: SummaryTab) => {
    if (summaries[mode]) return;
    if (!localLLMService.isModelLoaded()) {
      setSummaries((prev) => ({
        ...prev,
        [mode]: 'Please load a model first from the Model Manager screen.',
      }));
      return;
    }

    setLoading(true);
    try {
      const result = await localLLMService.summarize(text, mode);
      setSummaries((prev) => ({ ...prev, [mode]: result }));
    } catch {
      setSummaries((prev) => ({
        ...prev,
        [mode]: 'Failed to generate summary. Please try again.',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleTabPress = (tab: SummaryTab) => {
    setActiveTab(tab);
    if (!summaries[tab]) {
      generateSummary(tab);
    }
  };

  const handleCopy = async () => {
    const content = summaries[activeTab];
    if (!content) return;
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(content);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  const handleShare = async () => {
    const content = summaries[activeTab];
    if (!content) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Summary - ${documentTitle || 'Document'}`,
          text: content,
        });
      }
    } catch {
      // Share not available
    }
  };

  const tabs: SummaryTab[] = ['short', 'detailed', 'exam', 'bullets'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FileText size={18} color="#2563eb" />
        <Text style={styles.headerTitle}>
          Summary: {documentTitle || 'Document'}
        </Text>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => handleTabPress(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.activeTabText]}
            >
              {SUMMARY_MODE_PROMPTS[tab].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>
              Generating {SUMMARY_MODE_PROMPTS[activeTab].label.toLowerCase()} summary...
            </Text>
          </View>
        ) : summaries[activeTab] ? (
          <Text style={styles.summaryText}>{summaries[activeTab]}</Text>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Tap a tab to generate that summary type
            </Text>
          </View>
        )}
      </ScrollView>

      {summaries[activeTab] && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
            {copied ? (
              <Check size={16} color="#16a34a" />
            ) : (
              <Copy size={16} color="#64748b" />
            )}
            <Text style={[styles.actionBtnText, copied && styles.copiedActionText]}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Share size={16} color="#64748b" />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  activeTab: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#0f172a',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  placeholderText: {
    fontSize: 15,
    color: '#94a3b8',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  copiedActionText: {
    color: '#16a34a',
  },
});
