import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { localLLMService } from './LocalLLMService';

interface ModelInfo {
  name: string;
  size: string;
  sizeBytes: number;
  description: string;
  downloadUrl: string;
  recommended: boolean;
  filename: string;
}

const MODELS: ModelInfo[] = [
  {
    name: 'Phi-3 Mini',
    size: '2.4 GB',
    sizeBytes: 2400,
    description: 'Best quality. Smart and accurate. Recommended for most devices.',
    downloadUrl:
      'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf',
    recommended: true,
    filename: 'phi3-mini-q4.gguf',
  },
  {
    name: 'TinyLlama',
    size: '670 MB',
    sizeBytes: 670,
    description: 'Lightweight and fast. Good for older or low-memory devices.',
    downloadUrl:
      'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    recommended: false,
    filename: 'tinyllama-1.1b-q4.gguf',
  },
];

interface Props {
  onModelLoaded?: (modelPath: string, modelName: string) => void;
  currentModelName?: string;
}

export default function ModelDownloadScreen({
  onModelLoaded,
  currentModelName,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingModelName, setLoadingModelName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleOpenDownloadLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const handleLoadModel = async (modelPath: string, modelName: string) => {
    setIsLoading(true);
    setLoadingModelName(modelName);
    setError(null);
    setLoadingProgress(0);

    try {
      await localLLMService.initializeModel(modelPath, (progress) => {
        setLoadingProgress(progress);
      });
      onModelLoaded?.(modelPath, modelName);
    } catch (err) {
      setError(
        `Failed to load ${modelName}. Make sure the model file is downloaded to your device and the path is correct.`
      );
    } finally {
      setIsLoading(false);
      setLoadingModelName('');
    }
  };

  const styles = createStyles(colors);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.offlineBadge}>
          <Feather name="wifi-off" size={12} color="#fff" />
          <Text style={styles.offlineBadgeText}>Runs fully offline on your device</Text>
        </View>
        <Text style={styles.title}>AI Models</Text>
        <Text style={styles.subtitle}>
          Download a GGUF model to enable on-device AI. No internet required after setup.
        </Text>
      </View>

      {currentModelName ? (
        <View style={styles.activeModelBanner}>
          <Feather name="cpu" size={16} color="#4CAF50" />
          <Text style={styles.activeModelText}>
            Active: <Text style={styles.activeModelName}>{currentModelName}</Text>
          </Text>
        </View>
      ) : (
        <View style={styles.noModelBanner}>
          <Feather name="alert-circle" size={16} color="#FF9800" />
          <Text style={styles.noModelText}>No model loaded. Download and load one below.</Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingTitle}>Loading {loadingModelName}...</Text>
          <View style={styles.progressBarTrack}>
            <View
              style={[styles.progressBarFill, { width: `${loadingProgress * 100}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(loadingProgress * 100)}%
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Feather name="x-circle" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Available Models</Text>

      {MODELS.map((model) => (
        <View key={model.name} style={styles.modelCard}>
          <View style={styles.modelHeader}>
            <View style={styles.modelTitleRow}>
              <Text style={styles.modelName}>{model.name}</Text>
              {model.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              )}
            </View>
            <Text style={styles.modelSize}>{model.size}</Text>
          </View>

          <Text style={styles.modelDescription}>{model.description}</Text>

          <View style={styles.storageNote}>
            <Feather name="hard-drive" size={12} color={colors.mutedForeground} />
            <Text style={styles.storageNoteText}>
              Requires {model.size} of free storage
            </Text>
          </View>

          <View style={styles.modelActions}>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => handleOpenDownloadLink(model.downloadUrl)}
              activeOpacity={0.75}
            >
              <Feather name="download" size={14} color={colors.primary} />
              <Text style={styles.downloadButtonText}>Download Model</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loadButton,
                isLoading && styles.loadButtonDisabled,
              ]}
              onPress={() =>
                handleLoadModel(
                  `/storage/emulated/0/Download/${model.filename}`,
                  model.name
                )
              }
              disabled={isLoading}
              activeOpacity={0.75}
            >
              <Feather name="play" size={14} color="#fff" />
              <Text style={styles.loadButtonText}>Load Model</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How to use:</Text>
        {[
          '1. Tap "Download Model" to open the download link in your browser.',
          '2. Save the .gguf file to your Downloads folder.',
          '3. Tap "Load Model" to load it into the app.',
          '4. The AI will run completely offline on your device.',
        ].map((step) => (
          <Text key={step} style={styles.instructionStep}>
            {step}
          </Text>
        ))}
      </View>

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
    },
    header: {
      marginBottom: 20,
    },
    offlineBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#4CAF50',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      marginBottom: 12,
    },
    offlineBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600' as const,
    },
    title: {
      fontSize: 26,
      fontWeight: '700' as const,
      color: colors.foreground,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    activeModelBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#E8F5E9',
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
    },
    activeModelText: {
      fontSize: 13,
      color: '#2E7D32',
    },
    activeModelName: {
      fontWeight: '700' as const,
    },
    noModelBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FFF3E0',
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
    },
    noModelText: {
      fontSize: 13,
      color: '#E65100',
    },
    loadingCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      gap: 10,
    },
    loadingTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.foreground,
    },
    progressBarTrack: {
      height: 6,
      backgroundColor: colors.muted,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
    progressText: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'right' as const,
    },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: '#FEF2F2',
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: '#EF4444',
      lineHeight: 18,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.mutedForeground,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    modelCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    modelTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    modelName: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.foreground,
    },
    recommendedBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    recommendedText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '600' as const,
    },
    modelSize: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontWeight: '500' as const,
    },
    modelDescription: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 18,
      marginBottom: 10,
    },
    storageNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 14,
    },
    storageNoteText: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    modelActions: {
      flexDirection: 'row',
      gap: 10,
    },
    downloadButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    downloadButtonText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    loadButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    loadButtonDisabled: {
      opacity: 0.5,
    },
    loadButtonText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: '#fff',
    },
    instructions: {
      backgroundColor: colors.muted,
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
      gap: 6,
    },
    instructionsTitle: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: colors.foreground,
      marginBottom: 4,
    },
    instructionStep: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 20,
    },
  });
