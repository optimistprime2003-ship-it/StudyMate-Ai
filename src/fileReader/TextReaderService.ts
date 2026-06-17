import * as FileSystem from 'expo-file-system';

const CHUNK_SIZE = 50000; // 50,000 characters per chunk

interface TextContent {
  text: string;
  lineCount: number;
  charCount: number;
  chunkCount: number;
  encoding: string;
}

interface TextChunk {
  chunkIndex: number;
  content: string;
  startChar: number;
  endChar: number;
}

/**
 * Reads a TXT file and returns its content
 */
export async function readTxtFile(filePath: string): Promise<TextContent> {
  try {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('TXT file not found');
    }

    // Read entire file
    const text = await FileSystem.readAsStringAsync(filePath);

    // Count lines and characters
    const lineCount = text.split('\n').length;
    const charCount = text.length;
    const chunkCount = Math.ceil(charCount / CHUNK_SIZE);

    return {
      text,
      lineCount,
      charCount,
      chunkCount,
      encoding: 'utf-8',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to read TXT file: ${errorMessage}`);
  }
}

/**
 * Reads an RTF file and extracts plain text
 */
export async function readRtfFile(filePath: string): Promise<TextContent> {
  try {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('RTF file not found');
    }

    // Read RTF file
    const rtfContent = await FileSystem.readAsStringAsync(filePath);

    // Remove RTF control sequences
    const text = stripRtfFormatting(rtfContent);

    // Count lines and characters
    const lineCount = text.split('\n').length;
    const charCount = text.length;
    const chunkCount = Math.ceil(charCount / CHUNK_SIZE);

    return {
      text,
      lineCount,
      charCount,
      chunkCount,
      encoding: 'utf-8',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to read RTF file: ${errorMessage}`);
  }
}

/**
 * Strips RTF formatting codes to extract plain text
 */
function stripRtfFormatting(rtf: string): string {
  // Remove RTF control words and symbols
  let text = rtf
    // Remove control words (e.g., \rtf1, \ansi)
    .replace(/\\[a-z]+\d*/gi, '')
    // Remove special control characters
    .replace(/[{}]/g, '')
    // Decode some common RTF entities
    .replace(/\\/g, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ');

  return text.trim();
}

/**
 * Reads a file in chunks for handling large files
 */
export async function readFileInChunks(filePath: string): Promise<TextChunk[]> {
  try {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    // Read entire file first
    const text = await FileSystem.readAsStringAsync(filePath);
    const chunks: TextChunk[] = [];

    // Split into chunks
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      const chunkIndex = Math.floor(i / CHUNK_SIZE);
      const content = text.substring(i, i + CHUNK_SIZE);

      chunks.push({
        chunkIndex,
        content,
        startChar: i,
        endChar: Math.min(i + CHUNK_SIZE, text.length),
      });
    }

    return chunks;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to read file in chunks: ${errorMessage}`);
  }
}

/**
 * Reads a specific chunk of a file
 */
export async function readFileChunk(
  filePath: string,
  chunkIndex: number
): Promise<TextChunk | null> {
  try {
    const chunks = await readFileInChunks(filePath);
    return chunks[chunkIndex] || null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to read file chunk: ${errorMessage}`);
  }
}

/**
 * Gets line-based content from a text file
 */
export async function readFileLines(filePath: string): Promise<{
  lines: string[];
  totalLines: number;
}> {
  try {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    // Read file
    const text = await FileSystem.readAsStringAsync(filePath);
    const lines = text.split('\n');

    return {
      lines,
      totalLines: lines.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to read file lines: ${errorMessage}`);
  }
}

/**
 * Extracts text from either TXT or RTF files based on file extension
 */
export async function extractTextFileContent(filePath: string): Promise<TextContent> {
  try {
    const filename = filePath.split('/').pop() || '';
    const extension = filename.split('.').pop()?.toLowerCase();

    if (extension === 'txt') {
      return await readTxtFile(filePath);
    } else if (extension === 'rtf') {
      return await readRtfFile(filePath);
    } else {
      throw new Error(`Unsupported format: ${extension}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to extract text file content: ${errorMessage}`);
  }
}
