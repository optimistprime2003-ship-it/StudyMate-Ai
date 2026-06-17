import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Document, ChatMessage, Flashcard } from '../components/ModuleConnector';

interface AppSettings {
  themeMode: 'light' | 'dark' | 'system';
  voiceEnabled: boolean;
  voiceSpeed: number;
  hasCompletedOnboarding: boolean;
}

interface AppState {
  settings: AppSettings;
  documents: Document[];
  chatMessages: ChatMessage[];
  flashcards: Flashcard[];
  searchQuery: string;
  isDark: boolean;

  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setVoiceSpeed: (speed: number) => void;
  completeOnboarding: () => void;
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  addFlashcard: (card: Flashcard) => void;
  removeFlashcard: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setIsDark: (isDark: boolean) => void;
  hydrate: () => Promise<void>;
}

const SETTINGS_KEY = 'studymate_settings';

const defaultSettings: AppSettings = {
  themeMode: 'system',
  voiceEnabled: true,
  voiceSpeed: 1.0,
  hasCompletedOnboarding: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  settings: defaultSettings,
  documents: [],
  chatMessages: [],
  flashcards: [],
  searchQuery: '',
  isDark: false,

  setThemeMode: (mode) => {
    const settings = { ...get().settings, themeMode: mode };
    set({ settings, isDark: mode === 'dark' ? true : mode === 'light' ? false : get().isDark });
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  setVoiceEnabled: (enabled) => {
    const settings = { ...get().settings, voiceEnabled: enabled };
    set({ settings });
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  setVoiceSpeed: (speed) => {
    const settings = { ...get().settings, voiceSpeed: speed };
    set({ settings });
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  completeOnboarding: () => {
    const settings = { ...get().settings, hasCompletedOnboarding: true };
    set({ settings });
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  addDocument: (doc) => set((s) => ({ documents: [...s.documents, doc] })),
  removeDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  addFlashcard: (card) => set((s) => ({ flashcards: [...s.flashcards, card] })),
  removeFlashcard: (id) => set((s) => ({ flashcards: s.flashcards.filter((f) => f.id !== id) })),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsDark: (isDark) => set({ isDark }),

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const settings = JSON.parse(raw) as AppSettings;
        set({ settings });
      }
    } catch {
      // ignore storage errors
    }
  },
}));
