import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Volume2,
  Settings,
} from 'lucide-react-native';
import { TTSService, TTSVoice } from './TTSService';
import { TTSSettingsComponent } from './TTSSettingsComponent';

interface TTSPlayerProps {
  documentTitle?: string;
  text: string;
  visible: boolean;
  onClose?: () => void;
  onSentenceChange?: (index: number) => void;
}

const { width } = Dimensions.get('window');

export const TTSPlayerComponent: React.FC<TTSPlayerProps> = ({
  documentTitle = 'Document',
  text,
  visible,
  onClose,
  onSentenceChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [totalSentences, setTotalSentences] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const speedOptions = [0.5, 1.0, 1.5, 2.0];

  useEffect(() => {
    if (visible && text) {
      TTSService.initialize().then(() => {
        setVoices(TTSService.getAvailableVoices());
        const prefs = TTSService.getPreferences();
        setSelectedVoice(prefs.voiceId);
        setSpeed(prefs.speed);
      });

      const sentences = TTSService.splitIntoSentences(text);
      setTotalSentences(sentences.length);

      TTSService.onWordBoundary((index) => {
        setCurrentSentence(index);
        setProgress(TTSService.getProgress());
        onSentenceChange?.(index);
      });
    }
  }, [visible, text, onSentenceChange]);

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      TTSService.pause();
      setIsPlaying(false);
      setIsPaused(true);
    } else if (isPaused) {
      TTSService.resume();
      setIsPlaying(true);
      setIsPaused(false);
    } else {
      await TTSService.speak(text);
      setIsPlaying(true);
      setIsPaused(false);
    }
  }, [isPlaying, isPaused, text]);

  const handleStop = useCallback(() => {
    TTSService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentence(0);
    setProgress(0);
  }, []);

  const handlePrevious = useCallback(async () => {
    const newIndex = Math.max(0, currentSentence - 1);
    setCurrentSentence(newIndex);
    await TTSService.speakFromPosition(text, newIndex);
    setIsPlaying(true);
    setIsPaused(false);
  }, [currentSentence, text]);

  const handleNext = useCallback(async () => {
    const newIndex = Math.min(totalSentences - 1, currentSentence + 1);
    setCurrentSentence(newIndex);
    await TTSService.speakFromPosition(text, newIndex);
    setIsPlaying(true);
    setIsPaused(false);
  }, [currentSentence, totalSentences, text]);

  const handleSpeedChange = useCallback(async (newSpeed: number) => {
    setSpeed(newSpeed);
    await TTSService.setSpeed(newSpeed);
  }, []);

  const handleVoiceChange = useCallback(async (voiceId: string) => {
    setSelectedVoice(voiceId);
    await TTSService.setVoice(voiceId);
    setShowVoicePicker(false);
  }, []);

  const handleSeek = useCallback(async (sentenceIndex: number) => {
    setCurrentSentence(sentenceIndex);
    await TTSService.speakFromPosition(text, sentenceIndex);
    setIsPlaying(true);
    setIsPaused(false);
  }, [text]);

  if (!visible) return null;

  return (
    <>
      <Animated.View style={[styles.container, isMinimized && styles.containerMinimized]}>
        {isMinimized ? (
          <TouchableOpacity
            style={styles.minimizedBar}
            onPress={() => setIsMinimized(false)}
            activeOpacity={0.8}
          >
            <View style={styles.minimizedContent}>
              <Volume2 size={18} color="#3B82F6" />
              <Text style={styles.minimizedTitle} numberOfLines={1}>
                {documentTitle}
              </Text>
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setIsMinimized(false)}
              >
                <ChevronUp size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.playButtonMini}
              onPress={handlePlayPause}
            >
              {isPlaying ? (
                <Pause size={20} color="#FFFFFF" />
              ) : (
                <Play size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.minimizeButton}
                onPress={() => setIsMinimized(true)}
              >
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={1}>
                  {documentTitle}
                </Text>
                <Text style={styles.sentenceCount}>
                  Sentence {currentSentence + 1} of {totalSentences}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setShowSettings(true)}
              >
                <Settings size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handlePrevious}
                disabled={currentSentence === 0}
              >
                <SkipBack
                  size={24}
                  color={currentSentence === 0 ? '#9CA3AF' : '#3B82F6'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause size={32} color="#FFFFFF" />
                ) : (
                  <Play size={32} color="#FFFFFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleNext}
                disabled={currentSentence >= totalSentences - 1}
              >
                <SkipForward
                  size={24}
                  color={currentSentence >= totalSentences - 1 ? '#9CA3AF' : '#3B82F6'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStop}
              >
                <Square size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.speedContainer}>
              {speedOptions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.speedButton, speed === s && styles.speedButtonActive]}
                  onPress={() => handleSpeedChange(s)}
                >
                  <Text
                    style={[
                      styles.speedText,
                      speed === s && styles.speedTextActive,
                    ]}
                  >
                    {s}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.voiceSelector}
              onPress={() => setShowVoicePicker(true)}
            >
              <Volume2 size={18} color="#6B7280" />
              <Text style={styles.voiceText} numberOfLines={1}>
                {voices.find(v => v.id === selectedVoice)?.name || 'Default Voice'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      <Modal
        visible={showVoicePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVoicePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Voice</Text>
              <TouchableOpacity onPress={() => setShowVoicePicker(false)}>
                <Square size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.voiceList}>
              {voices.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceItem,
                    selectedVoice === voice.id && styles.voiceItemActive,
                  ]}
                  onPress={() => handleVoiceChange(voice.id)}
                >
                  <View style={styles.voiceItemContent}>
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContent}>
            <TTSSettingsComponent
              onClose={() => setShowSettings(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    paddingBottom: 34,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  containerMinimized: {
    paddingTop: 8,
    paddingBottom: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  minimizedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  minimizedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  expandButton: {
    padding: 4,
  },
  playButtonMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  minimizeButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sentenceCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    width: 40,
    textAlign: 'right',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  secondaryButton: {
    padding: 12,
    marginHorizontal: 8,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopButton: {
    padding: 12,
    marginHorizontal: 8,
  },
  speedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  speedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },
  speedButtonActive: {
    backgroundColor: '#3B82F6',
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  speedTextActive: {
    color: '#FFFFFF',
  },
  voiceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  voiceText: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  voiceList: {
    padding: 16,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  voiceItemActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  voiceItemContent: {
    flex: 1,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  voiceNameActive: {
    color: '#3B82F6',
  },
  voiceLanguage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  settingsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
});

export default TTSPlayerComponent;
