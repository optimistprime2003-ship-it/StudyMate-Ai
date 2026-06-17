// ModuleConnector — shared types for multi-agent architecture
// Other modules (1–5, 7+) are assumed to already exist.
// Only Module 6 (database + study) types are defined here.

export interface Document {
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

export interface ExtractedText {
  id: string;
  document_id: string;
  page_number: number;
  content: string;
  ocr_confidence: number;
}

export interface ChatMessage {
  id: string;
  document_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Flashcard {
  id: string;
  document_id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  times_reviewed: number;
  last_reviewed: string | null;
  next_review: string;
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
