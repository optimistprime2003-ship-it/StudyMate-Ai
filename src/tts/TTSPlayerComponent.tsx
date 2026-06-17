import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Play, Pause, SkipBack, SkipForward, Square, ChevronUp, ChevronDown, Gauge, Mic } from 'lucide-react-native';
import TTSService, { TTSVoice, TTSPreferences } from './TTSService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0];

interface TTSPlayerProps {
  documentTitle: string;
  text: string;
  onStartSentence?: (index: number) => void;
}

export default function TTSPlayerComponent({ documentTitle, text, onStartSentence }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [totalSentences, setTotalSentences] = useState(0);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeedState] = useState(1.0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const loadPrefs = async () => {
      const prefs = await TTSService.loadPreferences();
      setSpeedState(prefs.speed);
      setSelectedVoiceId(prefs.voiceId);
    };
    loadPrefs();
  }, []);

  useEffect(() => {
    if (text) {
      const sentences = TTSService.splitIntoSentences(text);
      setTotalSentences(sentences.length);
      setCurrentSentence(0);
      setProgress(0);
    }
  }, [text]);

  useEffect(() => {
    TTSService.onWordBoundary((index: number) => {
      setCurrentSentence(index);
      setProgress(TTSService.getProgress());
      onStartSentence?.(index);
    });
  }, [onStartSentence]);

  const handlePlay = useCallback(async () => {
    if (isPaused) {
      TTSService.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    if (!isPlaying && text) {
      await TTSService.speak(text);
      setIsPlaying(true);
      setIsPaused(false);
    }
  }, [isPlaying, isPaused, text]);

  const handlePause = useCallback(() => {
    TTSService.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    TTSService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentence(0);
    setProgress(0);
  }, []);

  const handlePrevious = useCallback(() => {
    const prev = Math.max(0, currentSentence - 1);
    setCurrentSentence(prev);
    if (isPlaying || isPaused) {
      TTSService.speakFromPosition(text, prev);
      setIsPaused(false);
      setIsPlaying(true);
    }
  }, [currentSentence, isPlaying, isPaused, text]);

  const handleNext = useCallback(() => {
    const next = Math.min(totalSentences - 1, currentSentence + 1);
    setCurrentSentence(next);
    if (isPlaying || isPaused) {
      TTSService.speakFromPosition(text, next);
      setIsPaused(false);
      setIsPlaying(true);
    }
  }, [currentSentence, totalSentences, isPlaying, isPaused, text]);

  const handleSpeedChange = useCallback((rate: number) => {
    setSpeedState(rate);
    TTSService.setSpeed(rate);
    TTSService.savePreferences({ speed: rate, pitch: TTSService.getPreferences().pitch, voiceId: selectedVoiceId });
  }, [selectedVoiceId]);

  const handleOpenVoicePicker = useCallback(async () => {
    setShowVoicePicker(true);
    setLoadingVoices(true);
    const availableVoices = await TTSService.getAvailableVoices();
    setVoices(availableVoices);
    setLoadingVoices(false);
  }, []);

  const handleSelectVoice = useCallback((voice: TTSVoice) => {
    setSelectedVoiceId(voice.id);
    TTSService.setVoice(voice.id);
    TTSService.savePreferences({ speed, pitch: TTSService.getPreferences().pitch, voiceId: voice.id });
    setShowVoicePicker(false);
  }, [speed]);

  const toggleMinimize = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: isMinimized ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setIsMinimized(!isMinimized);
  }, [isMinimized, slideAnim]);

  const progressPercent = totalSentences > 0 ? (currentSentence / totalSentences) * 100 : 0;

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          isMinimized && styles.containerMinimized,
        ]}
      >
        {isMinimized ? (
          <TouchableOpacity style={styles.minimizedBar} onPress={toggleMinimize} activeOpacity={0.8}>
            <View style={styles.minimizedInfo}>
              <Text style={styles.minimizedTitle} numberOfLines={1}>{documentTitle}</Text>
              <Text style={styles.minimizedProgress}>{progress}%</Text>
            </View>
            <TouchableOpacity style={styles.miniPlayBtn} onPress={isPlaying ? handlePause : handlePlay}>
              {isPlaying ? <Pause size={20} color="#fff" /> : <Play size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMinimize} style={styles.expandBtn}>
              <ChevronUp size={18} color="#64748b" />
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>{documentTitle}</Text>
              <TouchableOpacity onPress={toggleMinimize} style={styles.collapseBtn}>
                <ChevronDown size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.sentenceInfo}>
              <Text style={styles.sentenceText}>
                Sentence {currentSentence + 1} of {totalSentences}
              </Text>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>

            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.controlBtn} onPress={handleStop}>
                <Square size={22} color="#ef4444" fill="#ef4444" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlBtn} onPress={handlePrevious}>
                <SkipBack size={26} color="#1e293b" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.playBtn} onPress={isPlaying ? handlePause : handlePlay}>
                {isPlaying ? (
                  <Pause size={32} color="#fff" fill="#fff" />
                ) : (
                  <Play size={32} color="#fff" fill="#fff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlBtn} onPress={handleNext}>
                <SkipForward size={26} color="#1e293b" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconBtn} onPress={handleOpenVoicePicker}>
                <Mic size={22} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <View style={styles.speedRow}>
              {SPEED_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
                  onPress={() => handleSpeedChange(s)}
                >
                  <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>
                    {s}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </Animated.View>

      <Modal visible={showVoicePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Voice</Text>
              <TouchableOpacity onPress={() => setShowVoicePicker(false)}>
                <Square size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            {loadingVoices ? (
              <ActivityIndicator size="large" color="#0ea5e9" />
            ) : (
              <FlatList
                data={voices}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.voiceItem, selectedVoiceId === item.id && styles.voiceItemActive]}
                    onPress={() => handleSelectVoice(item)}
                  >
                    <View style={styles.voiceInfo}>
                      <Text style={styles.voiceName}>{item.name}</Text>
                      <Text style={styles.voiceLang}>{item.language}</Text>
                    </View>
                    {selectedVoiceId === item.id && <View style={styles.voiceCheck} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    zIndex: 1000,
  },
  containerMinimized: {
    paddingBottom: 12,
    paddingTop: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  minimizedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  minimizedInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minimizedTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1e293b',
  },
  minimizedProgress: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#0ea5e9',
  },
  miniPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBtn: {
    padding: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  collapseBtn: {
    padding: 4,
  },
  sentenceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sentenceText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  },
  progressText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#0ea5e9',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0ea5e9',
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 14,
  },
  controlBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  speedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  speedBtnActive: {
    backgroundColor: '#0ea5e9',
  },
  speedText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#64748b',
  },
  speedTextActive: {
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  voiceItemActive: {
    backgroundColor: '#f0f9ff',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1e293b',
  },
  voiceLang: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginTop: 2,
  },
  voiceCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0ea5e9',
  },
});
