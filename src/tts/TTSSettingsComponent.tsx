import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Play, RotateCcw, Volume2 } from 'lucide-react-native';
import TTSService, { TTSVoice, TTSPreferences } from './TTSService';

const TEST_PHRASE = 'Hello, this is a test of the text to speech voice. StudyMate AI helps you learn better.';

export default function TTSSettingsComponent() {
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const prefs = await TTSService.loadPreferences();
      setSpeed(prefs.speed);
      setPitch(prefs.pitch);
      setSelectedVoiceId(prefs.voiceId);
    };
    load();
  }, []);

  const handleLoadVoices = useCallback(async () => {
    setLoadingVoices(true);
    const available = await TTSService.getAvailableVoices();
    setVoices(available);
    setLoadingVoices(false);
  }, []);

  useEffect(() => {
    handleLoadVoices();
  }, [handleLoadVoices]);

  const handleSpeedChange = useCallback((value: number) => {
    setSpeed(value);
    TTSService.setSpeed(value);
  }, []);

  const handlePitchChange = useCallback((value: number) => {
    setPitch(value);
    TTSService.setPitch(value);
  }, []);

  const handleVoiceSelect = useCallback((voice: TTSVoice) => {
    setSelectedVoiceId(voice.id);
    TTSService.setVoice(voice.id);
  }, []);

  const handlePreviewVoice = useCallback(async (voice: TTSVoice) => {
    setPreviewingVoiceId(voice.id);
    TTSService.stop();
    const prevVoice = selectedVoiceId;
    TTSService.setVoice(voice.id);
    TTSService.setSpeed(speed);
    TTSService.setPitch(pitch);
    await TTSService.speak(TEST_PHRASE);

    setTimeout(() => {
      setPreviewingVoiceId(null);
    }, 3000);

    TTSService.setVoice(prevVoice);
  }, [selectedVoiceId, speed, pitch]);

  const handleTestVoice = useCallback(async () => {
    TTSService.stop();
    TTSService.setSpeed(speed);
    TTSService.setPitch(pitch);
    if (selectedVoiceId) {
      TTSService.setVoice(selectedVoiceId);
    }
    await TTSService.speak(TEST_PHRASE);
  }, [speed, pitch, selectedVoiceId]);

  const handleSave = useCallback(async () => {
    await TTSService.savePreferences({
      speed,
      pitch,
      voiceId: selectedVoiceId,
    });
  }, [speed, pitch, selectedVoiceId]);

  const handleReset = useCallback(async () => {
    const defaults: TTSPreferences = { speed: 1.0, pitch: 1.0, voiceId: '' };
    setSpeed(defaults.speed);
    setPitch(defaults.pitch);
    setSelectedVoiceId(defaults.voiceId);
    TTSService.setSpeed(defaults.speed);
    TTSService.setPitch(defaults.pitch);
    await TTSService.savePreferences(defaults);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Voice</Text>
      {loadingVoices ? (
        <ActivityIndicator size="small" color="#0ea5e9" style={styles.loader} />
      ) : (
        <View style={styles.voiceList}>
          {voices.slice(0, 10).map((voice) => (
            <TouchableOpacity
              key={voice.id}
              style={[
                styles.voiceCard,
                selectedVoiceId === voice.id && styles.voiceCardActive,
              ]}
              onPress={() => handleVoiceSelect(voice)}
            >
              <View style={styles.voiceInfo}>
                <Text
                  style={[
                    styles.voiceName,
                    selectedVoiceId === voice.id && styles.voiceNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {voice.name}
                </Text>
                <Text style={styles.voiceLang}>{voice.language}</Text>
              </View>
              <TouchableOpacity
                style={styles.previewBtn}
                onPress={() => handlePreviewVoice(voice)}
              >
                {previewingVoiceId === voice.id ? (
                  <Volume2 size={18} color="#0ea5e9" />
                ) : (
                  <Play size={18} color="#64748b" fill="#64748b" />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          {voices.length > 10 && (
            <Text style={styles.moreVoices}>+{voices.length - 10} more voices available</Text>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Speed</Text>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>0.5x</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={2.0}
          step={0.1}
          value={speed}
          onValueChange={handleSpeedChange}
          minimumTrackTintColor="#0ea5e9"
          maximumTrackTintColor="#e2e8f0"
          thumbTintColor="#0ea5e9"
        />
        <Text style={styles.sliderLabel}>2.0x</Text>
      </View>
      <Text style={styles.sliderValue}>{speed.toFixed(1)}x</Text>

      <Text style={styles.sectionTitle}>Pitch</Text>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>0.5</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={2.0}
          step={0.1}
          value={pitch}
          onValueChange={handlePitchChange}
          minimumTrackTintColor="#0ea5e9"
          maximumTrackTintColor="#e2e8f0"
          thumbTintColor="#0ea5e9"
        />
        <Text style={styles.sliderLabel}>2.0</Text>
      </View>
      <Text style={styles.sliderValue}>{pitch.toFixed(1)}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.testBtn} onPress={handleTestVoice}>
          <Volume2 size={18} color="#fff" />
          <Text style={styles.testBtnText}>Test Voice</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <RotateCcw size={18} color="#64748b" />
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 10,
  },
  loader: {
    marginVertical: 20,
  },
  voiceList: {
    gap: 8,
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  voiceCardActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#334155',
  },
  voiceNameActive: {
    fontFamily: 'Inter-Bold',
    color: '#0c4a6e',
  },
  voiceLang: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 2,
  },
  previewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreVoices: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    width: 36,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#0ea5e9',
    textAlign: 'center',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    gap: 10,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 12,
  },
  testBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resetBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
});
