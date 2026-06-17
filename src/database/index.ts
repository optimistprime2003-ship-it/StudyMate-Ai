// Module 6 — Database layer
export { initialize, resetDatabase, getDb } from './DatabaseService';
export * as DocumentRepository from './DocumentRepository';
export * as FlashcardRepository from './FlashcardRepository';
export * as ChatRepository from './ChatRepository';
export * as SearchService from './SearchService';

// npm packages used: expo-sqlite, expo-file-system, @react-native-async-storage/async-storage
