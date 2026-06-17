import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { PreprocessOptions, PreprocessResult } from './types';

const OPTIMAL_OCR_WIDTH = 2048;

export async function preprocessImage(
  imagePath: string,
  options: PreprocessOptions = {}
): Promise<PreprocessResult> {
  const actions: ReturnType<typeof manipulateAsync> extends Promise<
    infer R extends { width: number; height: number }
  >
    ? never
    : never = [];

  const manipActions: any[] = [];

  // Resize to optimal OCR resolution
  const targetWidth = options.resize?.width ?? OPTIMAL_OCR_WIDTH;
  manipActions.push({
    resize: { width: targetWidth },
  });

  // Note: expo-image-manipulator doesn't have native grayscale/contrast
  // We apply what's available. On native, ML Kit handles preprocessing
  // internally for best results.

  const result = await manipulateAsync(
    imagePath,
    manipActions,
    {
      format: SaveFormat.JPEG,
      compress: 0.9,
    }
  );

  return {
    path: result.uri,
    width: result.width,
    height: result.height,
  };
}

export async function preprocessForOCR(imagePath: string): Promise<string> {
  const result = await preprocessImage(imagePath, {
    resize: { width: OPTIMAL_OCR_WIDTH, height: 0 },
    grayscale: true,
    contrast: 1.5,
  });
  return result.path;
}
