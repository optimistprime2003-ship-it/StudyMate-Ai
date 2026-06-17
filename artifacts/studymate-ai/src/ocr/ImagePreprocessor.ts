import * as ImageManipulator from "expo-image-manipulator";

export interface PreprocessOptions {
  targetWidth?: number;
}

export interface PreprocessResult {
  uri: string;
  width: number;
  height: number;
}

/**
 * Preprocesses an image for optimal OCR accuracy.
 *
 * Applies:
 *   - Resize to optimal OCR resolution (1600px wide by default)
 *   - Maximum compression quality (lossless JPEG)
 *
 * Note: True grayscale and contrast enhancement require a native
 * image processing library (e.g. react-native-image-filter-kit).
 * The resize step alone significantly improves ML Kit accuracy on
 * low-resolution captures.
 */
export async function preprocessImageForOCR(
  imagePath: string,
  options: PreprocessOptions = {}
): Promise<PreprocessResult> {
  const { targetWidth = 1600 } = options;

  const result = await ImageManipulator.manipulateAsync(
    imagePath,
    [{ resize: { width: targetWidth } }],
    {
      compress: 1.0,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Preprocesses an image specifically for document scanning.
 * Uses a slightly smaller target width to balance OCR quality and speed.
 */
export async function preprocessDocumentImage(
  imagePath: string
): Promise<PreprocessResult> {
  return preprocessImageForOCR(imagePath, { targetWidth: 2048 });
}
