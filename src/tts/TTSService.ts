import * as Speech from 'expo-speech';
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

const PREFS_KEY = '@studymate_tts_preferences';
const DEFAULT_PREFS: TTSPreferences = {
  speed: 1.0,
  pitch: 1.0,
  voiceId: '',
};

type SentenceBoundaryCallback = (sentenceIndex: number) => void;

class TTSServiceClass {
  private initialized = false;
  private preferences: TTSPreferences = { ...DEFAULT_PREFS };
  private currentText = '';
  private sentences: string[] = [];
  private currentSentenceIndex = 0;
  private isSpeaking = false;
  private isPaused = false;
  private boundaryCallback: SentenceBoundaryCallback | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.preferences = await this.loadPreferences();
    this.initialized = true;
  }

  async speak(text: string): Promise<void> {
    await this.initialize();
    this.currentText = text;
    this.sentences = this.splitIntoSentences(text);
    this.currentSentenceIndex = 0;

    Speech.stop();
    this.isPaused = false;
    this.isSpeaking = true;

    for (let i = 0; i < this.sentences.length; i++) {
      await this.speakSentence(this.sentences[i], i);
      if (!this.isSpeaking) break;
    }

    this.isSpeaking = false;
  }

  private async speakSentence(sentence: string, index: number): Promise<void> {
    return new Promise((resolve) => {
      this.currentSentenceIndex = index;
      if (this.boundaryCallback) {
        this.boundaryCallback(index);
      }

      const options: Speech.SpeechOptions = {
        rate: this.preferences.speed,
        pitch: this.preferences.pitch,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      };

      if (this.preferences.voiceId) {
        options.voice = this.preferences.voiceId;
      }

      Speech.speak(sentence, options);
    });
  }

  async speakFromPosition(text: string, startSentence: number): Promise<void> {
    await this.initialize();
    this.currentText = text;
    this.sentences = this.splitIntoSentences(text);
    this.currentSentenceIndex = startSentence;

    Speech.stop();
    this.isPaused = false;
    this.isSpeaking = true;

    for (let i = startSentence; i < this.sentences.length; i++) {
      await this.speakSentence(this.sentences[i], i);
      if (!this.isSpeaking) break;
    }

    this.isSpeaking = false;
  }

  pause(): void {
    if (this.isSpeaking && !this.isPaused) {
      Speech.stop();
      this.isPaused = true;
      this.isSpeaking = false;
    }
  }

  stop(): void {
    Speech.stop();
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentSentenceIndex = 0;
  }

  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.speakFromPosition(this.currentText, this.currentSentenceIndex);
    }
  }

  setSpeed(rate: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, rate));
    this.preferences.speed = clamped;
  }

  setVoice(voiceId: string): void {
    this.preferences.voiceId = voiceId;
  }

  setPitch(pitch: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, pitch));
    this.preferences.pitch = clamped;
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.map((v) => ({
      id: v.identifier || v.language,
      name: v.name || v.language,
      language: v.language,
    }));
  }

  onWordBoundary(callback: SentenceBoundaryCallback): void {
    this.boundaryCallback = callback;
  }

  splitIntoSentences(text: string): string[] {
    const raw = text
      .split(/(?<=[.!?])\s+|(?<=\n\n)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return raw;
  }

  async savePreferences(prefs: TTSPreferences): Promise<void> {
    this.preferences = prefs;
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  async loadPreferences(): Promise<TTSPreferences> {
    const stored = await AsyncStorage.getItem(PREFS_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
      } catch {
        return { ...DEFAULT_PREFS };
      }
    }
    return { ...DEFAULT_PREFS };
  }

  getProgress(): number {
    if (this.sentences.length === 0) return 0;
    return Math.round((this.currentSentenceIndex / this.sentences.length) * 100);
  }

  getCurrentSentenceIndex(): number {
    return this.currentSentenceIndex;
  }

  getSentences(): string[] {
    return this.sentences;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getPreferences(): TTSPreferences {
    return { ...this.preferences };
  }
}

const TTSService = new TTSServiceClass();
export default TTSService;
