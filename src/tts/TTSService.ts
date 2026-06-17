import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
}

export interface TTSPreferences {
  speed: number;
  pitch: number;
  voiceId: string;
}

const PREFERENCES_KEY = '@studymate_tts_preferences';
const DEFAULT_PREFERENCES: TTSPreferences = {
  speed: 1.0,
  pitch: 1.0,
  voiceId: '',
};

class TTSServiceClass {
  private isInitialized: boolean = false;
  private currentText: string = '';
  private sentences: string[] = [];
  private currentSentenceIndex: number = 0;
  private isPaused: boolean = false;
  private isPlaying: boolean = false;
  private wordBoundaryCallback: ((sentenceIndex: number) => void) | null = null;
  private voices: TTSVoice[] = [];
  private preferences: TTSPreferences = DEFAULT_PREFERENCES;

  async initialize(): Promise<void> {
    try {
      // Load saved preferences
      this.preferences = await this.loadPreferences();

      // Configure TTS engine
      await Tts.setDefaultRate(this.preferences.speed);
      await Tts.setDefaultPitch(this.preferences.pitch);

      if (this.preferences.voiceId) {
        await Tts.setDefaultVoice(this.preferences.voiceId);
      }

      // Get available voices
      const voices = await Tts.voices();
      this.voices = voices.map((v: any) => ({
        id: v.id || v.voiceId || '',
        name: v.name || v.voiceName || 'Unknown Voice',
        language: v.language || v.locale || 'en-US',
      }));

      // Set up event listeners
      Tts.addEventListener('tts-start', this.handleTTSStart);
      Tts.addEventListener('tts-finish', this.handleTTSFinish);
      Tts.addEventListener('tts-cancel', this.handleTTSCancel);

      this.isInitialized = true;
    } catch (error) {
      console.error('TTS initialization error:', error);
      throw error;
    }
  }

  private handleTTSStart = () => {
    this.isPlaying = true;
  };

  private handleTTSFinish = () => {
    this.isPlaying = false;
    this.currentSentenceIndex = this.sentences.length;
    if (this.wordBoundaryCallback) {
      this.wordBoundaryCallback(this.currentSentenceIndex);
    }
  };

  private handleTTSCancel = () => {
    this.isPlaying = false;
    this.isPaused = false;
  };

  async speak(text: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.stop();
    this.currentText = text;
    this.sentences = this.splitIntoSentences(text);
    this.currentSentenceIndex = 0;
    this.isPaused = false;

    if (this.sentences.length === 0) {
      return;
    }

    // Speak the first sentence
    await this.speakSentence(0);
  }

  async speakFromPosition(text: string, startSentence: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.stop();
    this.currentText = text;
    this.sentences = this.splitIntoSentences(text);
    this.currentSentenceIndex = Math.max(0, Math.min(startSentence, this.sentences.length - 1));
    this.isPaused = false;

    if (this.sentences.length === 0 || this.currentSentenceIndex >= this.sentences.length) {
      return;
    }

    await this.speakSentence(this.currentSentenceIndex);
  }

  private async speakSentence(index: number): Promise<void> {
    if (index < 0 || index >= this.sentences.length) {
      return;
    }

    this.currentSentenceIndex = index;
    this.isPlaying = true;

    if (this.wordBoundaryCallback) {
      this.wordBoundaryCallback(index);
    }

    // Use a workaround for sentence-by-sentence tracking
    // Speak the current sentence and track completion
    return new Promise((resolve) => {
      const finishListener = (event: any) => {
        if (event.utteranceId === index.toString()) {
          Tts.removeEventListener('tts-finish', finishListener);
          this.isPlaying = false;

          // Automatically move to next sentence if not paused/stopped
          if (!this.isPaused && this.currentSentenceIndex < this.sentences.length - 1) {
            this.speakSentence(this.currentSentenceIndex + 1);
          }
          resolve();
        }
      };

      Tts.addEventListener('tts-finish', finishListener);
      Tts.speak(this.sentences[index], {
        iosVoiceId: this.preferences.voiceId,
        androidParams: {
          KEY_PARAM_VOICE_NAME: this.preferences.voiceId,
        },
      });
    });
  }

  pause(): void {
    if (this.isPlaying) {
      Tts.stop();
      this.isPaused = true;
      this.isPlaying = false;
    }
  }

  stop(): void {
    Tts.stop();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentSentenceIndex = 0;
  }

  resume(): void {
    if (this.isPaused && this.currentSentenceIndex < this.sentences.length) {
      this.isPaused = false;
      this.speakSentence(this.currentSentenceIndex);
    }
  }

  async setSpeed(rate: number): Promise<void> {
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    this.preferences.speed = clampedRate;
    await Tts.setDefaultRate(clampedRate);
    await this.savePreferences(this.preferences);
  }

  async setVoice(voiceId: string): Promise<void> {
    this.preferences.voiceId = voiceId;
    await Tts.setDefaultVoice(voiceId);
    await this.savePreferences(this.preferences);
  }

  async setPitch(pitch: number): Promise<void> {
    const clampedPitch = Math.max(0.5, Math.min(2.0, pitch));
    this.preferences.pitch = clampedPitch;
    await Tts.setDefaultPitch(clampedPitch);
    await this.savePreferences(this.preferences);
  }

  getAvailableVoices(): TTSVoice[] {
    return this.voices;
  }

  onWordBoundary(callback: (sentenceIndex: number) => void): void {
    this.wordBoundaryCallback = callback;
  }

  splitIntoSentences(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Split by sentence-ending punctuation followed by space or end of text
    // This handles: . ! ? and combinations like ... !? etc.
    const sentenceRegex = /[^.!?]*[.!?]+\s*|[^.!?]+$/g;
    const matches = text.match(sentenceRegex) || [];

    // Clean up sentences
    return matches
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  async savePreferences(prefs: TTSPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
      this.preferences = prefs;
    } catch (error) {
      console.error('Error saving TTS preferences:', error);
    }
  }

  async loadPreferences(): Promise<TTSPreferences> {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading TTS preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  }

  getProgress(): number {
    if (this.sentences.length === 0) {
      return 0;
    }
    return Math.round((this.currentSentenceIndex / this.sentences.length) * 100);
  }

  getCurrentSentenceIndex(): number {
    return this.currentSentenceIndex;
  }

  getTotalSentences(): number {
    return this.sentences.length;
  }

  getCurrentText(): string {
    return this.currentText;
  }

  getSentences(): string[] {
    return this.sentences;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getPreferences(): TTSPreferences {
    return this.preferences;
  }
}

export const TTSService = new TTSServiceClass();
