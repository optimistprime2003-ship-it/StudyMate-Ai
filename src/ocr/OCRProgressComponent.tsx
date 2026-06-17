import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import { processCapturedImage, extractTextFromScannedPDF } from './OCRService';
import type { OCRResult } from './types';

// Custom ProgressBar component since react-native doesn't export ProgressBar
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={styles.progressBarTrack}>
      <View
        style={[
          styles.progressBarFill,
          { width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

interface OCRProgressProps {
  /** PDF path for scanned PDF OCR mode */
  pdfPath?: string;
  /** Camera mode: opens camera for live capture */
  cameraMode?: boolean;
  /** Image URI for direct image OCR */
  imageUri?: string;
  /** Called when OCR completes */
  onComplete?: (result: OCRResult | string[]) => void;
  /** Called when user cancels */
  onCancel?: () => void;
}

type OCRPhase = 'idle' | 'camera' | 'processing' | 'complete' | 'error';

export default function OCRProgressComponent({
  pdfPath,
  cameraMode,
  imageUri,
  onComplete,
  onCancel,
}: OCRProgressProps) {
  const [phase, setPhase] = useState<OCRPhase>('idle');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [previewText, setPreviewText] = useState('');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (cameraMode) {
      setPhase('camera');
    } else if (pdfPath) {
      runPDFOCR();
    } else if (imageUri) {
      runImageOCR();
    }
  }, []);

  const runPDFOCR = async () => {
    if (!pdfPath) return;
    setPhase('processing');
    cancelledRef.current = false;

    try {
      const results = await extractTextFromScannedPDF(
        pdfPath,
        (page, total) => {
          if (cancelledRef.current) return;
          setCurrentPage(page);
          setTotalPages(total);
          setProgress(page / total);
          setPreviewText(`Page ${page} processed`);
        }
      );

      if (!cancelledRef.current) {
        setPhase('complete');
        onComplete?.(results);
      }
    } catch (error: any) {
      if (!cancelledRef.current) {
        setPhase('error');
        setErrorMessage(error.message ?? 'OCR processing failed');
      }
    }
  };

  const runImageOCR = async () => {
    if (!imageUri) return;
    setPhase('processing');
    setCurrentPage(1);
    setTotalPages(1);
    setProgress(0.5);

    try {
      const result = await processCapturedImage(imageUri);
      setOcrResult(result);
      setPreviewText(result.text.slice(0, 200));
      setProgress(1);
      setPhase('complete');
      onComplete?.(result);
    } catch (error: any) {
      setPhase('error');
      setErrorMessage(error.message ?? 'OCR processing failed');
    }
  };

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
      });

      if (!photo?.uri) {
        setPhase('error');
        setErrorMessage('Failed to capture photo');
        return;
      }

      setPhase('processing');
      setCurrentPage(1);
      setTotalPages(1);
      setProgress(0.5);
      setPreviewText('Processing image...');

      const result = await processCapturedImage(photo.uri);
      setOcrResult(result);
      setPreviewText(result.text.slice(0, 200));
      setProgress(1);
      setPhase('complete');
      onComplete?.(result);
    } catch (error: any) {
      setPhase('error');
      setErrorMessage(error.message ?? 'Camera capture failed');
    }
  }, []);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    onCancel?.();
  }, [onCancel]);

  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  // Camera mode
  if (phase === 'camera') {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                <Text style={styles.flipButtonText}>Flip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // Processing mode
  if (phase === 'processing') {
    return (
      <View style={styles.container}>
        <View style={styles.processingCard}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={styles.scanningText}>
            Scanning page {currentPage} of {totalPages}...
          </Text>
          <ProgressBar progress={progress} color="#0A84FF" />
          <Text style={styles.progressPercent}>
            {Math.round(progress * 100)}%
          </Text>
          {previewText ? (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Preview:</Text>
              <Text style={styles.previewText} numberOfLines={4}>
                {previewText}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.cancelButtonFull} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Error mode
  if (phase === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>OCR Failed</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity style={styles.cancelButtonFull} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Complete mode
  if (phase === 'complete' && ocrResult) {
    return (
      <View style={styles.container}>
        <View style={styles.completeCard}>
          <Text style={styles.completeTitle}>Text Extracted</Text>
          <Text style={styles.confidenceText}>
            Confidence: {Math.round(ocrResult.confidence * 100)}%
          </Text>
          <Text style={styles.timeText}>
            Processed in {ocrResult.processingTimeMs}ms
          </Text>
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Extracted text:</Text>
            <Text style={styles.previewText} numberOfLines={8}>
              {ocrResult.text}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // PDF complete (no single OCRResult)
  if (phase === 'complete') {
    return (
      <View style={styles.container}>
        <View style={styles.completeCard}>
          <Text style={styles.completeTitle}>PDF OCR Complete</Text>
          <Text style={styles.confidenceText}>
            Processed {totalPages} pages
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0E',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  flipButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  flipButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  processingCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  scanningText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressPercent: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewContainer: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  previewLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  previewText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  cancelButtonFull: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  errorCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: '#FF453A',
    fontSize: 20,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
  completeCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  completeTitle: {
    color: '#30D158',
    fontSize: 20,
    fontWeight: '700',
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  timeText: {
    color: '#8E8E93',
    fontSize: 14,
  },
});
