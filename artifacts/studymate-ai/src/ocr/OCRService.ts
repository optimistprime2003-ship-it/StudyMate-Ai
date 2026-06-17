/**
 * OCRService — Module 3: On-device text recognition (fully offline)
 *
 * Uses Google ML Kit (@react-native-ml-kit/text-recognition) which runs
 * entirely on-device. No internet connection is required.
 *
 * PDF DEPENDENCY NOTE:
 * extractTextFromScannedPDF and detectHasText require a PDF rendering library.
 * Inject your PDF-to-image converter via setPDFRenderer() (called by Module 2).
 * Recommended: react-native-pdf-lib, react-native-pdf-thumbnail, or equivalent.
 *
 * CAMERA NOTE:
 * extractTextFromCamera uses expo-image-picker for the simplest promise-based
 * camera flow. For a fully custom camera UI, use CameraView from expo-camera.
 *
 * NATIVE BUILD REQUIRED:
 * @react-native-ml-kit/text-recognition is a native module. It will NOT work
 * in Expo Go — a development build (EAS Build or local expo run) is required.
 */

import TextRecognition, {
  TextRecognitionScript,
} from "@react-native-ml-kit/text-recognition";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { preprocessImageForOCR } from "./ImagePreprocessor";

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: Array<{ text: string; confidence: number }>;
  lines: Array<{ text: string; confidence: number }>;
  processingTimeMs: number;
}

/**
 * PDF-to-image renderer interface.
 * Implement and register this via setPDFRenderer() (Module 2 responsibility).
 */
export interface PDFRenderer {
  /**
   * Returns the number of pages in the PDF.
   */
  getPageCount(pdfPath: string): Promise<number>;

  /**
   * Renders a single PDF page to a temporary image file.
   * Returns the local URI of the rendered image.
   */
  renderPage(pdfPath: string, pageIndex: number): Promise<string>;

  /**
   * Returns whether the PDF has embedded text on the given page.
   * Return false if all pages are scanned images.
   */
  hasEmbeddedText(pdfPath: string): Promise<boolean>;
}

let _pdfRenderer: PDFRenderer | null = null;

/**
 * Register the PDF renderer used by extractTextFromScannedPDF and detectHasText.
 * This must be called by Module 2 (PDFReaderService) during app initialization.
 *
 * @example
 * // In Module 2 / PDFReaderService.ts:
 * import { setPDFRenderer } from '@/src/ocr';
 * setPDFRenderer(myPdfRendererImplementation);
 */
export function setPDFRenderer(renderer: PDFRenderer): void {
  _pdfRenderer = renderer;
}

/**
 * A flag that signals in-flight OCR operations to stop.
 * Set to true to cancel; reset to false after cancellation completes.
 */
let _cancelRequested = false;

export function cancelOCR(): void {
  _cancelRequested = true;
}

export function resetCancelFlag(): void {
  _cancelRequested = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// detectHasText
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a PDF has embedded (selectable) text.
 *
 * Returns true  → PDF has real text; standard text extraction can be used.
 * Returns false → PDF pages are scanned images; OCR is required.
 *
 * If no PDFRenderer has been registered, falls back to a lightweight
 * byte-level heuristic (checks for PDF text stream markers).
 *
 * @param pdfPath - Local file URI of the PDF document.
 */
export async function detectHasText(pdfPath: string): Promise<boolean> {
  if (_pdfRenderer) {
    return _pdfRenderer.hasEmbeddedText(pdfPath);
  }

  // Fallback heuristic: read a slice of the PDF and look for text operators.
  // A PDF containing embedded text will have "BT" (begin text) blocks.
  // This is intentionally approximate — for reliable detection use a PDF library.
  try {
    if (Platform.OS === "web") return false;

    const fileInfo = await FileSystem.getInfoAsync(pdfPath);
    if (!fileInfo.exists) return false;

    // Read the first 64 KB as a string — enough to catch text in most PDFs.
    const slice = await FileSystem.readAsStringAsync(pdfPath, {
      encoding: FileSystem.EncodingType.UTF8,
      length: 65536,
      position: 0,
    });

    // Presence of "BT" (Begin Text) and "ET" (End Text) PDF operators
    // strongly suggests embedded text.
    const hasBT = slice.includes(" BT ") || slice.includes("\nBT\n") || slice.includes("\rBT\r");
    const hasET = slice.includes(" ET ") || slice.includes("\nET\n") || slice.includes("\rET\r");

    return hasBT && hasET;
  } catch {
    // If reading fails (e.g. binary encoding issues), default to false → use OCR.
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// extractTextFromImage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs on-device OCR on a single image file.
 *
 * Pipeline:
 *   1. Preprocess: resize to 1600px wide (improves ML Kit accuracy).
 *   2. Run ML Kit text recognition on-device.
 *   3. Return structured OCRResult.
 *
 * @param imagePath - Local file URI of the image (JPEG, PNG, etc.).
 * @returns OCRResult with extracted text, confidence, blocks, lines, and timing.
 */
export async function extractTextFromImage(imagePath: string): Promise<OCRResult> {
  const startTime = Date.now();

  // Step 1 — Preprocess
  const { uri: processedUri } = await preprocessImageForOCR(imagePath);

  // Step 2 — ML Kit on-device recognition
  const recognition = await TextRecognition.recognize(
    processedUri,
    TextRecognitionScript.LATIN
  );

  const processingTimeMs = Date.now() - startTime;

  // Step 3 — Map ML Kit result → OCRResult
  // ML Kit does not expose per-block confidence scores; we derive a proxy from
  // text density: blocks with more characters are more likely to be accurate.
  const blocks = recognition.blocks.map((block) => ({
    text: block.text,
    confidence: _estimateConfidence(block.text),
  }));

  const lines = recognition.blocks.flatMap((block) =>
    block.lines.map((line) => ({
      text: line.text,
      confidence: _estimateConfidence(line.text),
    }))
  );

  const overallConfidence =
    blocks.length > 0
      ? blocks.reduce((sum, b) => sum + b.confidence, 0) / blocks.length
      : 0;

  return {
    text: recognition.text,
    confidence: overallConfidence,
    blocks,
    lines,
    processingTimeMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// extractTextFromScannedPDF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs OCR on every page of a scanned PDF.
 *
 * Requires a registered PDFRenderer (set via setPDFRenderer).
 * Module 2 (PDFReaderService) is responsible for registering the renderer
 * before calling this function.
 *
 * @param pdfPath    - Local file URI of the PDF document.
 * @param onProgress - Called after each page with (currentPage, totalPages).
 * @returns Array of extracted text strings, one entry per page.
 *          Pages that fail or are blank return an empty string.
 *
 * @throws Error if no PDFRenderer has been registered.
 */
export async function extractTextFromScannedPDF(
  pdfPath: string,
  onProgress: (page: number, total: number) => void
): Promise<string[]> {
  if (!_pdfRenderer) {
    throw new Error(
      "[OCRService] No PDFRenderer registered. " +
        "Call setPDFRenderer() from Module 2 before extractTextFromScannedPDF()."
    );
  }

  _cancelRequested = false;

  const pageCount = await _pdfRenderer.getPageCount(pdfPath);
  const results: string[] = [];

  for (let i = 0; i < pageCount; i++) {
    if (_cancelRequested) break;

    try {
      const pageImageUri = await _pdfRenderer.renderPage(pdfPath, i);
      const ocrResult = await extractTextFromImage(pageImageUri);
      results.push(ocrResult.text);
    } catch {
      results.push("");
    }

    onProgress(i + 1, pageCount);
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// extractTextFromCamera
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opens the device camera, lets the user take a photo, and runs OCR on it.
 *
 * Uses expo-image-picker for the simplest promise-based camera flow.
 * For a fully custom camera viewfinder, use CameraView from expo-camera instead.
 *
 * @returns OCRResult for the captured image.
 * @throws Error if camera permission is denied or the user cancels.
 */
export async function extractTextFromCamera(): Promise<OCRResult> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    throw new Error(
      "[OCRService] Camera permission denied. " +
        "Please enable camera access in device settings."
    );
  }

  const pickerResult = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1.0,
  });

  if (pickerResult.canceled || pickerResult.assets.length === 0) {
    throw new Error("[OCRService] Camera capture cancelled by user.");
  }

  const capturedUri = pickerResult.assets[0].uri;
  return extractTextFromImage(capturedUri);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimates OCR confidence from text length and character composition.
 *
 * ML Kit Latin script recognition is very accurate (>95%) on clean images.
 * We penalise very short strings (possibly noise) slightly.
 */
function _estimateConfidence(text: string): number {
  const len = text.trim().length;
  if (len === 0) return 0;
  if (len < 3) return 0.7;
  if (len < 8) return 0.85;
  return 0.95;
}
