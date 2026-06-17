// Module 6 — Study features
export { default as FlashcardComponent } from './FlashcardComponent';
export { default as QuizComponent } from './QuizComponent';
export { default as StudyDashboard } from './StudyDashboard';
export * as ExportService from './ExportService';

// Types re-exported from ModuleConnector
export type { Document, ChatMessage, Flashcard } from '../components/ModuleConnector';

// npm packages used: expo-sqlite, expo-file-system, @react-native-async-storage/async-storage,
//   react-native-reanimated, react-native-gesture-handler, lucide-react-native
