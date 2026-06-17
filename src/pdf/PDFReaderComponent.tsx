import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Pdf from 'react-native-pdf';
import { saveReadingPosition, loadReadingPosition } from './PDFReaderService';
import { Document } from '../components/ModuleConnector';
import { MessageCircle } from 'lucide-react-native';

interface PDFReaderComponentProps {
  document: Document;
  onAIChatPress?: (document: Document, currentPage: number) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PDFReaderComponent({
  document,
  onAIChatPress,
}: PDFReaderComponentProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageInput, setPageInput] = useState('');
  const [showPageInput, setShowPageInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<any>(null);

  useEffect(() => {
    loadSavedPosition();
  }, [document.id]);

  const loadSavedPosition = async () => {
    try {
      const position = await loadReadingPosition(document.id);
      if (position) {
        setCurrentPage(position.page);
      }
    } catch {
      // Use default page 1
    }
  };

  const handleLoadComplete = useCallback(
    (numberOfPages: number, path: string) => {
      setTotalPages(numberOfPages);
      setIsLoading(false);
      setError(null);
    },
    []
  );

  const handlePageChanged = useCallback(
    (page: number, numberOfPages: number) => {
      setCurrentPage(page);
      setTotalPages(numberOfPages);
      saveReadingPosition(document.id, page).catch(() => {});
    },
    [document.id]
  );

  const handleError = useCallback((error: any) => {
    setIsLoading(false);
    const msg = error?.message ?? '';
    if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypted')) {
      setError('This PDF is password-protected and cannot be opened.');
    } else if (msg.toLowerCase().includes('corrupt')) {
      setError('This PDF is corrupted and cannot be opened.');
    } else {
      setError('Could not open this PDF. The file may be damaged.');
    }
  }, []);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      pdfRef.current?.setPage(newPage);
      saveReadingPosition(document.id, newPage).catch(() => {});
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      pdfRef.current?.setPage(newPage);
      saveReadingPosition(document.id, newPage).catch(() => {});
    }
  };

  const jumpToPage = () => {
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      pdfRef.current?.setPage(pageNum);
      saveReadingPosition(document.id, pageNum).catch(() => {});
      setShowPageInput(false);
      setPageInput('');
      Keyboard.dismiss();
    }
  };

  const progress = totalPages > 0 ? currentPage / totalPages : 0;

  const source =
    Platform.OS === 'web'
      ? { uri: document.path }
      : { uri: document.path, cache: true };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {totalPages > 0 ? `${Math.round(progress * 100)}%` : 'Loading...'}
        </Text>
      </View>

      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Opening PDF...</Text>
          </View>
        )}

        <Pdf
          ref={pdfRef}
          source={source}
          onLoadComplete={handleLoadComplete}
          onPageChanged={handlePageChanged}
          onError={handleError}
          style={styles.pdf}
          enablePaging
          horizontal={false}
          fitPolicy={0}
          spacing={10}
        />
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        {/* Page Indicator */}
        <View style={styles.pageInfoRow}>
          <TouchableOpacity
            onPress={() => setShowPageInput(!showPageInput)}
            activeOpacity={0.7}
          >
            <Text style={styles.pageIndicator}>
              Page {currentPage} of {totalPages}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Page Jump Input */}
        {showPageInput && (
          <View style={styles.pageInputRow}>
            <TextInput
              style={styles.pageInput}
              keyboardType="number-pad"
              placeholder={`Go to page (1-${totalPages})`}
              placeholderTextColor="#9CA3AF"
              value={pageInput}
              onChangeText={setPageInput}
              onSubmitEditing={jumpToPage}
              returnKeyType="go"
              maxLength={4}
            />
            <TouchableOpacity style={styles.goButton} onPress={jumpToPage}>
              <Text style={styles.goButtonText}>Go</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navButton, currentPage <= 1 && styles.navButtonDisabled]}
            onPress={goToPrevPage}
            disabled={currentPage <= 1}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navButtonText,
                currentPage <= 1 && styles.navButtonTextDisabled,
              ]}
            >
              Prev Page
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, currentPage >= totalPages && styles.navButtonDisabled]}
            onPress={goToNextPage}
            disabled={currentPage >= totalPages}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.navButtonText,
                currentPage >= totalPages && styles.navButtonTextDisabled,
              ]}
            >
              Next Page
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating AI Chat Button */}
      {onAIChatPress && (
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => onAIChatPress(document, currentPage)}
          activeOpacity={0.8}
        >
          <MessageCircle size={24} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  progressText: {
    marginLeft: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 40,
    textAlign: 'right',
  },
  pdfContainer: {
    flex: 1,
    position: 'relative',
  },
  pdf: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: '#F3F4F6',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  controlsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pageInfoRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  pageIndicator: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  pageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pageInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  goButton: {
    marginLeft: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  navButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  aiButton: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    textAlign: 'center',
    lineHeight: 64,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
