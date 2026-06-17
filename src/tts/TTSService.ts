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

    await Tts.getInitStatus().catch(async () => {
      await Tts.requestInstallEngine();
    });

    this.preferences = await this.loadPreferences();

    Tts.setDefaultRate(this.preferences.speed);
    Tts.setDefaultPitch(this.preferences.pitch);
    if (this.preferences.voiceId) {
      Tts.setDefaultVoice(this.preferences.voiceId);
    }

    Tts.addEventListener('tts-start', () => {
      this.isSpeaking = true;
      this.isPaused = false;
    });

    Tts.addEventListener('tts-finish', () => {
      this.isSpeaking = false;
      this.isPaused = false;
    });

    Tts.addEventListener('tts-cancel', () => {
      this.isSpeaking = false;
      this.isPaused = false;
    });

    Tts.addEventListener('tts-progress', (event) => {
      if (this.boundaryCallback && event?.utteranceId !== undefined) {
        const utteranceStr = String(event.utteranceId);
        const match = utteranceStr.match(/sentence_(\d+)/);
        if (match) {
          const idx = parseInt(match[1], 10);
          this.currentSentenceIndex = idx;
          this.boundaryCallback(idx);
        }
      }
    });

    this.initialized = true;
  }

  private findSentenceIndex(spokenText: string): number {
    for (let i = 0; i < this.sentences.length; i++) {
      if (this.sentences[i].includes(spokenText) || spokenText.includes(this.sentences[i])) {
        return i;
      }
    }
    return this.currentSentenceIndex;
  }

  async speak(text: string): Promise<void> {
    await this.initialize();
    this.currentText = text;
    this.sentences = this.splitIntoSentences(text);
    this.currentSentenceIndex = 0;

    await Tts.stop();
    this.isPaused = false;

    for (let i = 0; i < this.sentences.length; i++) {
      Tts.speak(this.sentences[i], {
        iosVoiceId: `sentence_${i}`,
        rate: this.preferences.speed,
        androidParams: {
          KEY_PARAM_STREAM: 'STREAM_MUSIC',
          KEY_PARAM_VOLUME: 1.0,
          KEY_PARAM_PAN: 0,
        },
      });
    }

    this.isSpeaking = true;
  }

  async speakFromPosition(text: string, startSentence: number): Promise<void> {
    await this.initialize();
    this.currentText = text;
    this.sentences = this.splitIntoSentences(text);
    this.currentSentenceIndex = startSentence;

    await Tts.stop();
    this.isPaused = false;

    for (let i = startSentence; i < this.sentences.length; i++) {
      Tts.speak(this.sentences[i], {
        iosVoiceId: `sentence_${i}`,
        rate: this.preferences.speed,
        androidParams: {
          KEY_PARAM_STREAM: 'STREAM_MUSIC',
          KEY_PARAM_VOLUME: 1.0,
          KEY_PARAM_PAN: 0,
        },
      });
    }

    this.isSpeaking = true;
  }

  pause(): void {
    if (this.isSpeaking && !this.isPaused) {
      Tts.stop();
      this.isPaused = true;
      this.isSpeaking = false;
    }
  }

  stop(): void {
    Tts.stop();
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
    Tts.setDefaultRate(clamped, true);
  }

  setVoice(voiceId: string): void {
    this.preferences.voiceId = voiceId;
    Tts.setDefaultVoice(voiceId);
  }

  setPitch(pitch: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, pitch));
    this.preferences.pitch = clamped;
    Tts.setDefaultPitch(clamped);
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    const voices = await Tts.voices();
    return voices
      .filter((v: any) => !v.networkConnectionRequired)
      .map((v: any) => ({
        id: v.id,
        name: v.name,
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
