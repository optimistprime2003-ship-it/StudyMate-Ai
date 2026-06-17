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
