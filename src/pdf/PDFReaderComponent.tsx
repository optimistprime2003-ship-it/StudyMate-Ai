import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as PDFReaderService from './PDFReaderService';
import { Document } from '../components/ModuleConnector';

interface PDFReaderComponentProps {
  document: Document;
  onClose: () => void;
  onOpenChat: (documentContent: string) => void;
}

const PDFReaderComponent: React.FC<PDFReaderComponentProps> = ({
  document,
  onClose,
  onOpenChat,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageText, setPageText] = useState('');
  const [hasRealText, setHasRealText] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [jumpToPage, setJumpToPage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize PDF on mount
  useEffect(() => {
    initializePDF();
  }, [document.path]);

  // Restore reading position on mount
  useEffect(() => {
    restoreReadingPosition();
  }, []);

  const initializePDF = async () => {
    try {
      setLoading(true);
      const pageCount = await PDFReaderService.getPDFPageCount(document.path);
      setTotalPages(pageCount);

      // Validate PDF
      const isValid = await PDFReaderService.validatePDF(document.path);
      if (!isValid) {
        Alert.alert('Error', 'This PDF file appears to be corrupted.');
        onClose();
        return;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to open PDF: ${errorMessage}`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const restoreReadingPosition = async () => {
    try {
      const position = await PDFReaderService.getReadingPosition(document.path);
      if (position) {
        setCurrentPage(Math.min(position.page, totalPages || 1));
        setScrollOffset(position.scrollOffset);
      }
    } catch (error) {
      console.warn('Failed to restore reading position:', error);
    }
  };

  const loadPageText = async (page: number) => {
    try {
      const text = await PDFReaderService.extractPageText(document.path, page);
      setPageText(text);
      // Determine if page has real text or just scanned images
      setHasRealText(text.trim().length > 0);
    } catch (error) {
      console.warn('Failed to extract page text:', error);
      setPageText('');
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      loadPageText(newPage);
      saveReadingPosition(newPage);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      loadPageText(newPage);
      saveReadingPosition(newPage);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const jumpToPageNumber = () => {
    const page = parseInt(jumpToPage, 10);
    if (isNaN(page) || page < 1 || page > totalPages) {
      Alert.alert('Invalid Page', `Please enter a page number between 1 and ${totalPages}`);
      return;
    }
    setCurrentPage(page);
    loadPageText(page);
    saveReadingPosition(page);
    setJumpToPage('');
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const saveReadingPosition = async (page: number) => {
    try {
      await PDFReaderService.saveReadingPosition(document.path, page, scrollOffset);
    } catch (error) {
      console.warn('Failed to save reading position:', error);
    }
  };

  const handleScrollViewScroll = (event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    setScrollOffset(offset);
  };

  const handleOpenChat = () => {
    onOpenChat(pageText || 'No text available on this page');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading PDF...</Text>
      </View>
    );
  }

  const progressPercentage = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {document.title}
        </Text>
        <View style={styles.spacer} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${progressPercentage}%` },
          ]}
        />
      </View>

      {/* PDF Viewer Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.contentArea}
        onScroll={handleScrollViewScroll}
        scrollEventThrottle={16}
      >
        {/* PDF Page Placeholder */}
        <View style={styles.pdfPageContainer}>
          <View style={styles.pdfPage}>
            <MaterialIcons name="description" size={64} color="#ccc" />
            <Text style={styles.pageNumberPlaceholder}>Page {currentPage}</Text>
          </View>

          {/* Page Content */}
          <View style={styles.pageContentContainer}>
            {hasRealText ? (
              <Text style={styles.pageText}>{pageText}</Text>
            ) : (
              <View style={styles.scannedImageNotice}>
                <MaterialIcons name="info" size={24} color="#ff9800" />
                <Text style={styles.noticeText}>
                  This page contains scanned images. AI OCR will process this.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Page Indicator */}
      <View style={styles.pageIndicatorContainer}>
        <Text style={styles.pageIndicator}>
          Page {currentPage} of {totalPages}
        </Text>
      </View>

      {/* Navigation Controls */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          onPress={goToPreviousPage}
          disabled={currentPage === 1}
          style={[
            styles.navigationButton,
            currentPage === 1 && styles.buttonDisabled,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentPage === 1 ? '#ccc' : '#0066cc'}
          />
          <Text style={[
            styles.navigationButtonText,
            currentPage === 1 && styles.buttonTextDisabled,
          ]}>
            Prev
          </Text>
        </TouchableOpacity>

        {/* Jump to Page Input */}
        <View style={styles.jumpToPageContainer}>
          <TextInput
            style={styles.jumpToPageInput}
            placeholder="Go to page"
            keyboardType="number-pad"
            value={jumpToPage}
            onChangeText={setJumpToPage}
            onSubmitEditing={jumpToPageNumber}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            onPress={jumpToPageNumber}
            style={styles.jumpButton}
          >
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={goToNextPage}
          disabled={currentPage === totalPages}
          style={[
            styles.navigationButton,
            currentPage === totalPages && styles.buttonDisabled,
          ]}
        >
          <Text style={[
            styles.navigationButtonText,
            currentPage === totalPages && styles.buttonTextDisabled,
          ]}>
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={currentPage === totalPages ? '#ccc' : '#0066cc'}
          />
        </TouchableOpacity>
      </View>

      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.floatingChatButton}
        onPress={handleOpenChat}
      >
        <Ionicons name="chatbubble" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  spacer: {
    width: 40,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0066cc',
  },
  contentArea: {
    flex: 1,
  },
  pdfPageContainer: {
    padding: 16,
  },
  pdfPage: {
    width: '100%',
    aspectRatio: 8.5 / 11,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pageNumberPlaceholder: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  pageContentContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  pageText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  scannedImageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#f57c00',
    fontWeight: '500',
  },
  pageIndicatorContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  pageIndicator: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  navigationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: '#ccc',
  },
  jumpToPageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jumpToPageInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  jumpButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingChatButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default PDFReaderComponent;
