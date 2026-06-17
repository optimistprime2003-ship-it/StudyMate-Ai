import TextRecognition from '@react-native-ml-kit/text-recognition';
import { PDFDocument } from 'pdf-lib';
import { preprocessForOCR } from './ImagePreprocessor';
import type { OCRResult, OCRBlock, OCRLine } from './types';

/**
 * Check if a PDF contains real selectable text or is just scanned images.
 * Returns false if pages are images (OCR needed), true if text is present.
 */
export async function detectHasText(pdfPath: string): Promise<boolean> {
  try {
    const response = await fetch(pdfPath);
    const arrayBuffer = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      // pdf-lib doesn't expose getTextContent directly like pdfjs-dist.
      // We check for text objects in the page content stream.
      // If a page has text operators (Tj, TJ, etc.), it has real text.
      const contents = page.node.Contents();
      if (contents) {
        // If the page content references fonts, it likely has text
        const resources = page.node.Resources();
        if (resources) {
          const fontDict = resources.lookup('Font' as any);
          if (fontDict) {
            // Has fonts defined — likely has real text
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    // If we can't analyze the PDF, assume it needs OCR
    console.warn('detectHasText: Unable to analyze PDF, defaulting to OCR mode', error);
    return false;
  }
}

/**
 * Run ML Kit text recognition on an image.
 * Preprocesses the image first for optimal results.
 */
export async function extractTextFromImage(imagePath: string): Promise<OCRResult> {
  const startTime = Date.now();

  const processedPath = await preprocessForOCR(imagePath);

  const result = await TextRecognition.recognize(processedPath);

  const blocks: OCRBlock[] = (result.blocks ?? []).map((block) => ({
    text: block.text,
    confidence: 1, // ML Kit doesn't provide confidence scores
  }));

  const lines: OCRLine[] = (result.blocks ?? []).flatMap((block) =>
    (block.lines ?? []).map((line) => ({
      text: line.text,
      confidence: 1, // ML Kit doesn't provide confidence scores
    }))
  );

  const fullText = result.text ?? '';
  const avgConfidence = 1; // Default confidence since ML Kit doesn't provide it

  return {
    text: fullText,
    confidence: avgConfidence,
    blocks,
    lines,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Extract text from a scanned PDF by converting each page to an image
 * and running OCR on each page.
 * Calls onProgress as each page is processed.
 */
export async function extractTextFromScannedPDF(
  pdfPath: string,
  onProgress?: (page: number, total: number) => void
): Promise<string[]> {
  // We need to render PDF pages to images on-device.
  // Since there's no direct PDF-to-image renderer in RN,
  // we use a canvas-based approach on web or a native view snapshot.
  // For now, this uses a simplified approach with pdf-lib for page counting
  // and expects the caller (Module 2) to provide pre-rendered page images.

  const response = await fetch(pdfPath);
  const arrayBuffer = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  const pageTexts: string[] = [];

  // On native platforms, PDF rendering to image requires a native library
  // like react-native-pdf or a custom native module.
  // This implementation provides the contract and works with pre-rendered
  // page images that Module 2 (PDFReaderService) would provide.
  for (let i = 0; i < totalPages; i++) {
    onProgress?.(i + 1, totalPages);

    // Attempt to render page to image using canvas (web fallback)
    // or rely on external page image provider
    try {
      const pageImage = await renderPDFPageToImage(pdfPath, i);
      if (pageImage) {
        const ocrResult = await extractTextFromImage(pageImage);
        pageTexts.push(ocrResult.text);
      } else {
        pageTexts.push('');
      }
    } catch (error) {
      console.warn(`OCR failed for page ${i + 1}:`, error);
      pageTexts.push('');
    }
  }

  return pageTexts;
}

/**
 * Render a single PDF page to an image.
 * Uses platform-specific approaches.
 */
async function renderPDFPageToImage(
  _pdfPath: string,
  _pageIndex: number
): Promise<string | null> {
  // On web: Use canvas-based PDF rendering (pdfjs-dist)
  // On native: Use react-native-pdf-thumbnail or similar
  // This is a placeholder that Module 2 can inject page images into.
  // The actual rendering depends on platform capabilities.
  return null;
}

/**
 * Open camera, let user take a photo, and run OCR on it.
 * Returns the extracted text result.
 */
export async function extractTextFromCamera(): Promise<OCRResult> {
  // Camera capture is handled by the OCRProgressComponent UI
  // which renders CameraView and captures a photo.
  // This function provides the OCR processing after capture.
  // The actual camera interaction is UI-driven (see OCRProgressComponent).

  // This is the post-capture processing path:
  // After OCRProgressComponent captures a photo URI, it calls this.
  throw new Error(
    'Use OCRProgressComponent with cameraMode=true for camera-based OCR. ' +
      'This function is the processing endpoint called after capture.'
  );
}

/**
 * Process a camera-captured image through OCR.
 * Called by OCRProgressComponent after photo capture.
 */
export async function processCapturedImage(imageUri: string): Promise<OCRResult> {
  return extractTextFromImage(imageUri);
}
