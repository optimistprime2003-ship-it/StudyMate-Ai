import * as FileSystem from 'expo-file-system';

export interface SlideContent {
  slideNumber: number;
  title: string;
  content: string;
  notes: string;
}

export interface PPTXReadResult {
  slides: SlideContent[];
  totalSlides: number;
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The presentation file could not be found.',
  UNSUPPORTED: 'This presentation format is not supported.',
  CORRUPTED: 'The presentation appears to be corrupted.',
  EMPTY: 'The presentation has no slides.',
  GENERAL: 'An error occurred while reading the presentation.',
};

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.GENERAL;
}

function extractTextFromXml(xml: string): string {
  const textParts: string[] = [];
  const textRegex = /<a:t>([\s\S]*?)<\/a:t>/g;
  let match: RegExpExecArray | null;

  while ((match = textRegex.exec(xml)) !== null) {
    if (match[1].trim()) {
      textParts.push(match[1].trim());
    }
  }

  return textParts.join(' ');
}

function extractTitleFromSlideXml(xml: string): string {
  const titleRegex = /<p:ph[^>]*type="ctrTitle"[^>]*>[\s\S]*?<\/p:ph>/;
  const hasTitle = titleRegex.test(xml);

  if (!hasTitle) {
    const altTitleRegex = /<p:ph[^>]*type="title"[^>]*>[\s\S]*?<\/p:ph>/;
    if (!altTitleRegex.test(xml)) {
      return '';
    }
  }

  return extractTextFromXml(xml);
}

function extractNotesFromSlideXml(notesXml: string): string {
  return extractTextFromXml(notesXml);
}

function parseSlidesFromBinary(binaryString: string): SlideContent[] {
  const slides: SlideContent[] = [];
  const slidePattern = /<p:sld[\s\S]*?<\/p:sld>/g;
  let slideMatch: RegExpExecArray | null;
  let slideNumber = 1;

  while ((slideMatch = slidePattern.exec(binaryString)) !== null) {
    const slideXml = slideMatch[0];
    const title = extractTitleFromSlideXml(slideXml);
    const content = extractTextFromXml(slideXml);
    const notes = extractNotesFromSlideXml(slideXml);

    slides.push({
      slideNumber,
      title: title || `Slide ${slideNumber}`,
      content,
      notes,
    });

    slideNumber++;
  }

  return slides;
}

function parsePptBinary(binaryString: string): SlideContent[] {
  const slides: SlideContent[] = [];
  const readableText: string[] = [];
  const lines = binaryString.split(/[\r\n]+/);

  for (const line of lines) {
    const clean = line.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
    if (clean.length > 3) {
      readableText.push(clean);
    }
  }

  if (readableText.length === 0) {
    return [];
  }

  // Group text into approximate slides (every 5-10 readable lines)
  const linesPerSlide = 8;
  for (let i = 0; i < readableText.length; i += linesPerSlide) {
    const chunk = readableText.slice(i, i + linesPerSlide);
    const slideNum = Math.floor(i / linesPerSlide) + 1;

    slides.push({
      slideNumber: slideNum,
      title: chunk[0] || `Slide ${slideNum}`,
      content: chunk.join('\n'),
      notes: '',
    });
  }

  return slides;
}

export async function readPPTX(filePath: string): Promise<PPTXReadResult> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('NOT_FOUND');
    }

    const ext = filePath.split('.').pop()?.toLowerCase();

    if (ext === 'pptx') {
      return await readPptxFile(filePath);
    } else if (ext === 'ppt') {
      return await readPptFile(filePath);
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

async function readPptxFile(filePath: string): Promise<PPTXReadResult> {
  const base64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binaryString = atob(base64);
  const slides = parseSlidesFromBinary(binaryString);

  return {
    slides,
    totalSlides: slides.length,
  };
}

async function readPptFile(filePath: string): Promise<PPTXReadResult> {
  const base64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binaryString = atob(base64);
  const slides = parsePptBinary(binaryString);

  return {
    slides,
    totalSlides: slides.length,
  };
}

export { friendlyError };
