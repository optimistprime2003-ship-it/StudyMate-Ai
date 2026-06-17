import { File } from 'expo-file-system';

export interface DocxReadResult {
  text: string;
  paragraphs: string[];
  wordCount: number;
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The document file could not be found.',
  UNSUPPORTED: 'This file format is not supported for reading.',
  CORRUPTED: 'The document appears to be corrupted.',
  EMPTY: 'The document is empty.',
  GENERAL: 'An error occurred while reading the document.',
};

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.GENERAL;
}

function extractTextFromDocxXml(xml: string): string[] {
  const paragraphs: string[] = [];
  const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = paragraphRegex.exec(xml)) !== null) {
    const runRegex = /<w:r[^>]*>([\s\S]*?)<\/w:r>/g;
    const textParts: string[] = [];
    let rMatch: RegExpExecArray | null;

    while ((rMatch = runRegex.exec(pMatch[1])) !== null) {
      const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let tMatch: RegExpExecArray | null;
      while ((tMatch = textRegex.exec(rMatch[1])) !== null) {
        textParts.push(tMatch[1]);
      }
    }

    const paragraphText = textParts.join('');
    if (paragraphText.trim().length > 0) {
      paragraphs.push(paragraphText);
    }
  }

  return paragraphs;
}

function extractTextFromDocBinary(data: string): string[] {
  const paragraphs: string[] = [];
  const lines = data.split(/[\r\n]+/).filter((line) => {
    const clean = line.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
    return clean.length > 2;
  });

  for (const line of lines) {
    const clean = line.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
    if (clean.length > 0) {
      paragraphs.push(clean);
    }
  }

  return paragraphs;
}

export async function readDocx(filePath: string): Promise<DocxReadResult> {
  try {
    const file = new File(filePath);
    if (!file.exists) {
      throw new Error('NOT_FOUND');
    }

    const ext = filePath.split('.').pop()?.toLowerCase();

    if (ext === 'docx') {
      return await readDocxFile(filePath);
    } else if (ext === 'doc') {
      return await readDocFile(filePath);
    }

    throw new Error('UNSUPPORTED');
  } catch (err: any) {
    const msg = err?.message ?? '';
    if (msg === 'NOT_FOUND') throw new Error(friendlyError('NOT_FOUND'));
    if (msg === 'UNSUPPORTED') throw new Error(friendlyError('UNSUPPORTED'));
    if (msg.toLowerCase().includes('corrupt')) throw new Error(friendlyError('CORRUPTED'));
    throw new Error(friendlyError('GENERAL'));
  }
}

async function readDocxFile(filePath: string): Promise<DocxReadResult> {
  const file = new File(filePath);
  const base64 = await file.base64();

  const binaryString = atob(base64);
  const paragraphs = extractTextFromDocxXml(binaryString);

  if (paragraphs.length === 0) {
    const xmlContent = binaryString;
    const fallbackParagraphs = extractTextFromDocxXml(xmlContent);
    if (fallbackParagraphs.length === 0) {
      return {
        text: '',
        paragraphs: [],
        wordCount: 0,
      };
    }
    const text = fallbackParagraphs.join('\n\n');
    return {
      text,
      paragraphs: fallbackParagraphs,
      wordCount: text.split(/\s+/).filter((w) => w.length > 0).length,
    };
  }

  const text = paragraphs.join('\n\n');
  return {
    text,
    paragraphs,
    wordCount: text.split(/\s+/).filter((w) => w.length > 0).length,
  };
}

async function readDocFile(filePath: string): Promise<DocxReadResult> {
  const file = new File(filePath);
  const base64 = await file.base64();

  const binaryString = atob(base64);
  const paragraphs = extractTextFromDocBinary(binaryString);

  const text = paragraphs.join('\n\n');
  return {
    text,
    paragraphs,
    wordCount: text.split(/\s+/).filter((w) => w.length > 0).length,
  };
}

export { friendlyError };
