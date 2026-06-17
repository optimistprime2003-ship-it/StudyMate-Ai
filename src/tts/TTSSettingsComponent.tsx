import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Play, RefreshCw, Volume2, X } from 'lucide-react-native';
import { TTSService, TTSVoice } from './TTSService';

interface TTSSettingsProps {
  onClose?: () => void;
}

export const TTSSettingsComponent: React.FC<TTSSettingsProps> = ({ onClose }) => {
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const PREVIEW_TEXT = 'Hello! This is a preview of the selected voice for StudyMate AI.';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    await TTSService.initialize();
    const availableVoices = TTSService.getAvailableVoices();
    setVoices(availableVoices);
    const prefs = TTSService.getPreferences();
    setSelectedVoice(prefs.voiceId);
    setSpeed(prefs.speed);
    setPitch(prefs.pitch);
  };

  const handleVoiceSelect = useCallback(async (voiceId: string) => {
    setSelectedVoice(voiceId);
    await TTSService.setVoice(voiceId);
  }, []);

  const handleSpeedChange = useCallback(async (value: number) => {
    setSpeed(value);
    await TTSService.setSpeed(value);
  }, []);

  const handlePitchChange = useCallback(async (value: number) => {
    setPitch(value);
    await TTSService.setPitch(value);
  }, []);

  const handlePreview = useCallback(async () => {
    if (isPreviewPlaying) {
      TTSService.stop();
      setIsPreviewPlaying(false);
      return;
    }

    setIsPreviewPlaying(true);
    TTSService.onWordBoundary(() => {});
    await TTSService.speak(PREVIEW_TEXT);

    setTimeout(() => {
      setIsPreviewPlaying(false);
    }, 3000);
  }, [isPreviewPlaying]);

  const handleReset = useCallback(async () => {
    const defaults = {
      speed: 1.0,
      pitch: 1.0,
      voiceId: voices[0]?.id || '',
    };
    setSelectedVoice(defaults.voiceId);
    setSpeed(defaults.speed);
    setPitch(defaults.pitch);
    await TTSService.savePreferences(defaults);
    if (defaults.voiceId) {
      await TTSService.setVoice(defaults.voiceId);
    }
    await TTSService.setSpeed(defaults.speed);
    await TTSService.setPitch(defaults.pitch);
  }, [voices]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TTS Settings</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice</Text>
          <Text style={styles.sectionDescription}>
            Select a voice for text-to-speech playback. These voices use your device's built-in TTS engine and work offline.
          </Text>

          <View style={styles.voiceList}>
            {voices.map((voice) => (
              <TouchableOpacity
                key={voice.id}
                style={[
                  styles.voiceItem,
                  selectedVoice === voice.id && styles.voiceItemActive,
                ]}
                onPress={() => handleVoiceSelect(voice.id)}
              >
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={handlePreview}
                >
                  <Volume2
                    size={20}
                    color={selectedVoice === voice.id ? '#FFFFFF' : '#3B82F6'}
                  />
                </TouchableOpacity>
                <View style={styles.voiceInfo}>
                  <Text
                    style={[
                      styles.voiceName,
                      selectedVoice === voice.id && styles.voiceNameActive,
                    ]}
                  >
                    {voice.name}
                  </Text>
                  <Text style={styles.voiceLanguage}>{voice.language}</Text>
                </View>
                {selectedVoice === voice.id && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>ok</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Speed</Text>
          <Text style={styles.sectionDescription}>
            Adjust the reading speed. Normal speed is 1.0x.
          </Text>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>0.5x</Text>
            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={speed}
                onValueChange={handleSpeedChange}
                minimumTrackTintColor="#3B82F6"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#3B82F6"
              />
            </View>
            <Text style={styles.sliderLabel}>2.0x</Text>
          </View>
          <View style={styles.valueDisplay}>
            <Text style={styles.valueText}>{speed.toFixed(1)}x</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pitch</Text>
          <Text style={styles.sectionDescription}>
            Adjust the voice pitch. Normal pitch is 1.0.
          </Text>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Low</Text>
            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={pitch}
                onValueChange={handlePitchChange}
                minimumTrackTintColor="#3B82F6"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#3B82F6"
              />
            </View>
            <Text style={styles.sliderLabel}>High</Text>
          </View>
          <View style={styles.valueDisplay}>
            <Text style={styles.valueText}>{pitch.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Voice</Text>
          <TouchableOpacity style={styles.testButton} onPress={handlePreview}>
            {isPreviewPlaying ? (
              <Text style={styles.testButtonText}>Playing...</Text>
            ) : (
              <>
                <Play size={20} color="#FFFFFF" style={styles.testButtonIcon} />
                <Text style={styles.testButtonText}>Play Preview</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <RefreshCw size={20} color="#6B7280" style={styles.resetButtonIcon} />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  voiceList: {
    marginTop: 8,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  voiceItemActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  previewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  voiceNameActive: {
    color: '#FFFFFF',
  },
  voiceLanguage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '700',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  sliderWrapper: {
    flex: 1,
    paddingHorizontal: 8,
  },
  slider: {
    width: '100%',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 40,
    textAlign: 'center',
  },
  valueDisplay: {
    alignItems: 'center',
    marginTop: 8,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3B82F6',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  testButtonIcon: {
    marginRight: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetButtonIcon: {
    marginRight: 8,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default TTSSettingsComponent;
