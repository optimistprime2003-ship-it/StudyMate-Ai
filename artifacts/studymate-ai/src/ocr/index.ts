export type { OCRResult, PDFRenderer } from "./OCRService";
export {
  setPDFRenderer,
  cancelOCR,
  resetCancelFlag,
  detectHasText,
  extractTextFromImage,
  extractTextFromScannedPDF,
  extractTextFromCamera,
} from "./OCRService";

export type { PreprocessOptions, PreprocessResult } from "./ImagePreprocessor";
export {
  preprocessImageForOCR,
  preprocessDocumentImage,
} from "./ImagePreprocessor";

export type { OCRProgressProps } from "./OCRProgressComponent";
export { OCRProgressComponent } from "./OCRProgressComponent";
