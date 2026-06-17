export { detectHasText, extractTextFromImage, extractTextFromScannedPDF, extractTextFromCamera, processCapturedImage } from './OCRService';
export { preprocessImage, preprocessForOCR } from './ImagePreprocessor';
export { default as OCRProgressComponent } from './OCRProgressComponent';
export type { OCRResult, OCRBlock, OCRLine, PreprocessOptions, PreprocessResult } from './types';
