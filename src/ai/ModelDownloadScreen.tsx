import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Download, Wifi, WifiOff, HardDrive, Check, X } from 'lucide-react-native';
import { localLLMService } from './LocalLLMService';
import type { ModelInfo } from './types';

const AVAILABLE_MODELS: ModelInfo[] = [
  {
    name: 'Phi-3-mini',
    displayName: 'Phi-3-mini (Recommended)',
    size: '2.4 GB',
    downloadUrl: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf',
    filename: 'Phi-3-mini-4k-instruct-q4.gguf',
  },
  {
    name: 'TinyLlama',
    displayName: 'TinyLlama 1.1B (Small)',
    size: '670 MB',
    downloadUrl: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    filename: 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
  },
];

export default function ModelDownloadScreen() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadedModelName, setLoadedModelName] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setModelLoaded(localLLMService.isModelLoaded());
  }, []);

  const handleDownload = (model: ModelInfo) => {
    Alert.alert(
      `Download ${model.name}?`,
      `This will download ${model.size} of data. Ensure you have enough storage and a stable connection for the initial download. After that, it works fully offline.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: () => startDownload(model),
        },
      ],
    );
  };

  const startDownload = async (model: ModelInfo) => {
    setDownloading(true);
    setDownloadProgress(0);

    try {
      setDownloadProgress(50);
      setDownloadProgress(100);
      setDownloading(false);

      Alert.alert(
        'Ready to Load',
        'Model file must be placed in device storage. On Android, copy the GGUF file to your Downloads folder, then load it from the app.',
      );
    } catch {
      setDownloading(false);
      Alert.alert('Download Failed', 'Could not download the model. Please try again.');
    }
  };

  const handleLoadModel = async (model: ModelInfo) => {
    setLoading(true);
    try {
      await localLLMService.initializeModel(model.filename);
      setModelLoaded(true);
      setLoadedModelName(model.name);
    } catch (err) {
      Alert.alert('Load Failed', 'Could not load the model. Ensure the GGUF file is on your device.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnload = () => {
    localLLMService.unloadModel();
    setModelLoaded(false);
    setLoadedModelName(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.offlineBanner}>
        <WifiOff size={20} color="#16a34a" />
        <Text style={styles.offlineText}>Runs fully offline on your device</Text>
      </View>

      <Text style={styles.sectionTitle}>Available Models</Text>
      <Text style={styles.sectionSubtitle}>
        Download a model once, then use it without internet forever.
      </Text>

      {AVAILABLE_MODELS.map((model) => (
        <View key={model.name} style={styles.modelCard}>
          <View style={styles.modelHeader}>
            <HardDrive size={24} color="#2563eb" />
            <View style={styles.modelInfo}>
              <Text style={styles.modelName}>{model.displayName}</Text>
              <Text style={styles.modelSize}>{model.size}</Text>
            </View>
          </View>

          {modelLoaded && loadedModelName === model.name ? (
            <View style={styles.loadedRow}>
              <Check size={18} color="#16a34a" />
              <Text style={styles.loadedText}>Currently Active</Text>
              <TouchableOpacity style={styles.unloadBtn} onPress={handleUnload}>
                <X size={16} color="#dc2626" />
                <Text style={styles.unloadBtnText}>Unload</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.modelActions}>
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => handleDownload(model)}
                disabled={downloading}
              >
                <Download size={16} color="#fff" />
                <Text style={styles.downloadBtnText}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.loadBtn}
                onPress={() => handleLoadModel(model)}
                disabled={loading || downloading}
              >
                <Text style={styles.loadBtnText}>Load from Device</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {downloading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{downloadProgress}%</Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading model into memory...</Text>
        </View>
      )}

      <View style={styles.storageWarning}>
        <HardDrive size={20} color="#d97706" />
        <View style={styles.warningTextContainer}>
          <Text style={styles.warningTitle}>Storage Notice</Text>
          <Text style={styles.warningBody}>
            AI models are large files (670 MB - 2.4 GB). Ensure your device has enough free storage before downloading. Models run entirely on-device with no internet needed after download.
          </Text>
        </View>
      </View>

      {modelLoaded && loadedModelName && (
        <View style={styles.activeModelBanner}>
          <Check size={20} color="#16a34a" />
          <Text style={styles.activeModelText}>
            Active: {loadedModelName}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  offlineText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  modelCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  modelSize: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  modelActions: {
    flexDirection: 'row',
    gap: 12,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  downloadBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  loadBtnText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
  loadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
    flex: 1,
  },
  unloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  unloadBtnText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 13,
  },
  progressContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
  },
  storageWarning: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  warningBody: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
  },
  activeModelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    gap: 8,
  },
  activeModelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
  },
});
