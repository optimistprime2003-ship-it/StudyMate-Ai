// ModuleConnector — shared types for multi-agent architecture
// Modules 1–5 and 7+ types already exist below.
// Module 6 (database + study) types are appended at the end.

export type DocumentType =
  | 'pdf'
  | 'doc'
  | 'docx'
  | 'ppt'
  | 'pptx'
  | 'txt'
  | 'rtf'
  | 'epub'
  | 'jpg'
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'image';

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  path: string;
  size: number;
  createdAt: number;
  lastOpened: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  documentId: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOCX',
  ppt: 'PPT',
  pptx: 'PPTX',
  txt: 'TXT',
  rtf: 'RTF',
  epub: 'EPUB',
  jpg: 'JPG',
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WEBP',
  image: 'Image',
};

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  pdf: '#EF4444',
  doc: '#3B82F6',
  docx: '#3B82F6',
  ppt: '#F59E0B',
  pptx: '#F59E0B',
  txt: '#6B7280',
  rtf: '#6B7280',
  epub: '#8B5CF6',
  jpg: '#10B981',
  jpeg: '#10B981',
  png: '#10B981',
  webp: '#10B981',
  image: '#10B981',
};

// ── Module 6: Database + Study types ──

export interface ExtractedText {
  id: string;
  document_id: string;
  page_number: number;
  content: string;
  ocr_confidence: number;
}

export interface QuizQuestion {
  id: string;
  document_id: string;
  question: string;
  type: 'multiple_choice' | 'true_false';
  correct_answer: string;
  options: string; // JSON-encoded string[]
  explanation: string;
}

export interface Note {
  id: string;
  document_id: string;
  content: string;
  page_number: number | null;
  created_at: string;
}

export interface ReadingProgress {
  document_id: string;
  current_page: number;
  current_sentence: number;
  percentage: number;
  last_read: string;
}

export interface StudySession {
  id: string;
  document_id: string;
  started_at: string;
  ended_at: string | null;
  cards_reviewed: number;
  correct_count: number;
}

export interface SearchResult {
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  matchType: 'title' | 'text' | 'note' | 'summary';
  snippet: string;
  relevanceScore: number;
}

// Extended types used by Module 6 database layer
export interface DocumentRow {
  id: string;
  title: string;
  type: string;
  path: string;
  size: number;
  created_at: string;
  last_opened: string | null;
  page_count: number;
  has_real_text: boolean;
  summary_short: string | null;
  summary_detailed: string | null;
}

export interface FlashcardRow {
  id: string;
  document_id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  times_reviewed: number;
  last_reviewed: string | null;
  next_review: string;
}

export interface ChatMessageRow {
  id: string;
  document_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}
