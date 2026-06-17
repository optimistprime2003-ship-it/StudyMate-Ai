export type SummaryMode = 'short' | 'medium' | 'detailed' | 'exam' | 'bullets';

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  documentId: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ModelInfo {
  name: string;
  displayName: string;
  size: string;
  downloadUrl: string;
  filename: string;
}
