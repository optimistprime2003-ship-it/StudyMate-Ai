export interface OCRBlock {
  text: string;
  confidence: number;
}

export interface OCRLine {
  text: string;
  confidence: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
  lines: OCRLine[];
  processingTimeMs: number;
}

export interface PreprocessOptions {
  resize?: { width: number; height: number };
  grayscale?: boolean;
  contrast?: number;
}

export interface PreprocessResult {
  path: string;
  width: number;
  height: number;
}
