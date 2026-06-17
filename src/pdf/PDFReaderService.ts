import * as FileSystem from 'expo-file-system';
import { Document } from '../components/ModuleConnector';

const POSITIONS_DIR = `${FileSystem.documentDirectory}StudyMateDocs/positions/`;

export interface PDFExtractionResult {
  totalPages: number;
  currentPage: number;
  text: string;
  hasRealText: boolean;
}

export interface PDFPosition {
  documentId: string;
  page: number;
  scrollOffset?: number;
  updatedAt: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The PDF file could not be found. It may have been moved or deleted.',
  PASSWORD: 'This PDF is password-protected. Please provide the password to open it.',
  CORRUPTED: 'This PDF appears to be corrupted and cannot be opened.',
  EMPTY: 'This PDF has no pages to display.',
  GENERAL: 'An error occurred while reading the PDF. Please try again.',
};

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.GENERAL;
}

async function ensurePositionsDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(POSITIONS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(POSITIONS_DIR, { intermediates: true });
  }
}

export async function extractPDFText(
  filePath: string,
  page?: number
): Promise<PDFExtractionResult> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('NOT_FOUND');
    }

    const base64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const textContent = decodePDFBase64(base64);
    const pages = splitIntoPages(textContent);
    const totalPages = Math.max(pages.length, 1);
    const requestedPage = page ?? 1;
    const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);

    const pageText = pages.length > 0 ? pages[currentPage - 1] || '' : '';
    const hasRealText = checkHasRealText(textContent);

    return {
      totalPages,
      currentPage,
      text: pageText,
      hasRealText,
    };
  } catch (err: any) {
    const msg = err?.message ?? '';
    if (msg === 'NOT_FOUND') {
      throw new Error(friendlyError('NOT_FOUND'));
    }
    if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypted')) {
      throw new Error(friendlyError('PASSWORD'));
    }
    if (msg.toLowerCase().includes('corrupt') || msg.toLowerCase().includes('damaged')) {
      throw new Error(friendlyError('CORRUPTED'));
    }
    throw new Error(friendlyError('GENERAL'));
  }
}

function decodePDFBase64(base64: string): string {
  try {
    const binaryStr = atob(base64);
    const textParts: string[] = [];

    const textPattern = /\(([^)]*)\)/g;
    const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;

    let match: RegExpExecArray | null;
    const textContent = atob(base64);

    while ((match = textPattern.exec(textContent)) !== null) {
      const extracted = match[1];
      if (extracted && isReadableText(extracted)) {
        textParts.push(extracted);
      }
    }

    while ((match = streamPattern.exec(textContent)) !== null) {
      const streamContent = match[1];
      if (streamContent && isReadableText(streamContent.substring(0, 500))) {
        const lines = streamContent
          .split(/\n|\r/)
          .filter((l) => l.trim().length > 3 && isReadableText(l));
        textParts.push(...lines);
      }
    }

    return textParts.join('\n');
  } catch {
    return '';
  }
}

function isReadableText(text: string): boolean {
  const printable = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  if (printable.length === 0) return false;
  const ratio = printable.length / text.length;
  return ratio > 0.7;
}

function splitIntoPages(text: string): string[] {
  if (!text.trim()) return [];

  const pageBreakPattern = /---\s*Page\s+\d+\s*---/g;
  const parts = text.split(pageBreakPattern).filter((p) => p.trim().length > 0);

  if (parts.length > 1) {
    return parts;
  }

  const lineCount = text.split('\n').length;
  const linesPerPage = 50;
  const pages: string[] = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage).join('\n'));
  }

  return pages.length > 0 ? pages : [text];
}

function checkHasRealText(fullText: string): boolean {
  if (!fullText || fullText.trim().length === 0) return false;

  const cleanText = fullText.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
  const wordCount = cleanText.split(/\s+/).filter((w) => w.length > 1).length;

  return wordCount >= 10;
}

export async function saveReadingPosition(
  documentId: string,
  page: number,
  scrollOffset?: number
): Promise<void> {
  try {
    await ensurePositionsDir();

    const position: PDFPosition = {
      documentId,
      page,
      scrollOffset,
      updatedAt: new Date().toISOString(),
    };

    const filePath = `${POSITIONS_DIR}${documentId}.json`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(position));
  } catch {
    // Silently fail - position saving is non-critical
  }
}

export async function loadReadingPosition(documentId: string): Promise<PDFPosition | null> {
  try {
    const filePath = `${POSITIONS_DIR}${documentId}.json`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (!fileInfo.exists) return null;

    const content = await FileSystem.readAsStringAsync(filePath);
    return JSON.parse(content) as PDFPosition;
  } catch {
    return null;
  }
}

export async function deleteReadingPosition(documentId: string): Promise<void> {
  try {
    const filePath = `${POSITIONS_DIR}${documentId}.json`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath);
    }
  } catch {
    // Silently fail
  }
}

export { friendlyError };
