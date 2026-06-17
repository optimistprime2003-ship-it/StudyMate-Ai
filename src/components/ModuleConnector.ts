export type DocumentType = 'pdf' | 'docx' | 'pptx' | 'txt' | 'image' | 'epub';

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
  docx: 'DOCX',
  pptx: 'PPTX',
  txt: 'TXT',
  image: 'Image',
  epub: 'EPUB',
};

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  pdf: '#EF4444',
  docx: '#3B82F6',
  pptx: '#F59E0B',
  txt: '#6B7280',
  image: '#10B981',
  epub: '#8B5CF6',
};
