import * as FileSystem from 'expo-file-system';

const CHUNK_SIZE = 50000;

export interface TextReadResult {
  text: string;
  totalCharacters: number;
  totalChunks: number;
  currentChunk: number;
  isLargeFile: boolean;
}

export interface TextChunk {
  chunkIndex: number;
  text: string;
  isLast: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The text file could not be found.',
  UNSUPPORTED: 'This text format is not supported.',
  TOO_LARGE: 'The file is too large to read.',
  GENERAL: 'An error occurred while reading the text file.',
};

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.GENERAL;
}

function stripRtfFormatting(rtfContent: string): string {
  let text = rtfContent;

  // Remove RTF header and group markers
  text = text.replace(/\\fonttbl[^}]*}/g, '');
  text = text.replace(/\\colortbl[^}]*}/g, '');
  text = text.replace(/\\stylesheet[^}]*}/g, '');
  text = text.replace(/\{\\[^}]*}/g, '');

  // Remove RTF control words
  text = text.replace(/\\par[d]?/g, '\n');
  text = text.replace(/\\line/g, '\n');
  text = text.replace(/\\tab/g, '\t');
  text = text.replace(/\\'/g, '');
  text = text.replace(/\\[a-z]+\d*\s?/g, '');
  text = text.replace(/[{}]/g, '');
  text = text.replace(/\\\\/g, '\\');

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

export async function readTextFile(filePath: string): Promise<TextReadResult> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('NOT_FOUND');
    }

    const ext = filePath.split('.').pop()?.toLowerCase();

    if (ext === 'rtf') {
      return await readRtfFile(filePath);
    } else if (ext === 'txt') {
      return await readTxtFile(filePath);
    }

    throw new Error('UNSUPPORTED');
  } catch (err: any) {
    const msg = err?.message ?? '';
    if (msg === 'NOT_FOUND') throw new Error(friendlyError('NOT_FOUND'));
    if (msg === 'UNSUPPORTED') throw new Error(friendlyError('UNSUPPORTED'));
    if (msg.toLowerCase().includes('too large')) throw new Error(friendlyError('TOO_LARGE'));
    throw new Error(friendlyError('GENERAL'));
  }
}

async function readTxtFile(filePath: string): Promise<TextReadResult> {
  const content = await FileSystem.readAsStringAsync(filePath);
  const totalCharacters = content.length;
  const totalChunks = Math.ceil(totalCharacters / CHUNK_SIZE);
  const isLargeFile = totalCharacters > CHUNK_SIZE;

  return {
    text: content,
    totalCharacters,
    totalChunks,
    currentChunk: 1,
    isLargeFile,
  };
}

async function readRtfFile(filePath: string): Promise<TextReadResult> {
  const rtfContent = await FileSystem.readAsStringAsync(filePath);
  const text = stripRtfFormatting(rtfContent);
  const totalCharacters = text.length;
  const totalChunks = Math.ceil(totalCharacters / CHUNK_SIZE);
  const isLargeFile = totalCharacters > CHUNK_SIZE;

  return {
    text,
    totalCharacters,
    totalChunks,
    currentChunk: 1,
    isLargeFile,
  };
}

export function getTextChunk(
  fullText: string,
  chunkIndex: number
): TextChunk {
  const totalChunks = Math.ceil(fullText.length / CHUNK_SIZE);
  const clampedIndex = Math.max(0, Math.min(chunkIndex, totalChunks - 1));
  const start = clampedIndex * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, fullText.length);
  const text = fullText.substring(start, end);

  return {
    chunkIndex: clampedIndex,
    text,
    isLast: clampedIndex >= totalChunks - 1,
  };
}

export function getChunksInRange(
  fullText: string,
  startChunk: number,
  endChunk: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const totalChunks = Math.ceil(fullText.length / CHUNK_SIZE);
  const start = Math.max(0, startChunk);
  const end = Math.min(endChunk, totalChunks - 1);

  for (let i = start; i <= end; i++) {
    chunks.push(getTextChunk(fullText, i));
  }

  return chunks;
}

export { friendlyError, CHUNK_SIZE };
