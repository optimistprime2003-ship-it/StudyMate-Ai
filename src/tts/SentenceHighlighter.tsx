import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';

interface SentenceHighlighterProps {
  text: string;
  currentSentenceIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  highlightColor?: string;
  textColor?: string;
  highlightTextColor?: string;
  fontSize?: number;
  lineHeight?: number;
}

export const SentenceHighlighter: React.FC<SentenceHighlighterProps> = ({
  text,
  currentSentenceIndex,
  isPlaying,
  isPaused,
  highlightColor = '#3B82F6',
  textColor = '#1F2937',
  highlightTextColor = '#FFFFFF',
  fontSize = 16,
  lineHeight = 28,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const sentenceRefs = useRef<Map<number, number>>(new Map());
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);

  const getSentences = useCallback(() => {
    if (!text || text.trim().length === 0) {
      return [];
    }
    const sentenceRegex = /[^.!?]*[.!?]+\s*|[^.!?]+$/g;
    const matches = text.match(sentenceRegex) || [];
    return matches.map(s => s.trim()).filter(s => s.length > 0);
  }, [text]);

  const sentenceList = getSentences();

  useEffect(() => {
    if (currentSentenceIndex >= 0 && currentSentenceIndex < sentenceList.length) {
      const yPosition = sentenceRefs.current.get(currentSentenceIndex) || 0;
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, yPosition - 50),
        animated: true,
      });
    }
  }, [currentSentenceIndex, sentenceList.length]);

  const handleLayout = useCallback((index: number, y: number) => {
    sentenceRefs.current.set(index, y);
  }, []);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {sentenceList.map((sentence, index) => {
        const isHighlighted = index === currentSentenceIndex && isPlaying;
        const isPastSentences = index < currentSentenceIndex;
        const isFutureSentences = index > currentSentenceIndex;

        return (
          <View
            key={index}
            style={[
              styles.sentenceContainer,
              isHighlighted && { backgroundColor: highlightColor },
              isPastSentences && styles.pastSentence,
              isPaused && index === currentSentenceIndex && styles.pausedHighlight,
            ]}
            onLayout={(event) => {
              handleLayout(index, event.nativeEvent.layout.y);
            }}
          >
            <Text
              style={[
                styles.sentenceText,
                {
                  fontSize,
                  lineHeight,
                  color: isHighlighted
                    ? highlightTextColor
                    : isPastSentences
                    ? '#9CA3AF'
                    : textColor,
                },
              ]}
            >
              {sentence}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  sentenceContainer: {
    borderRadius: 8,
    marginVertical: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    transition: 'all 0.3s ease',
  },
  pastSentence: {
    opacity: 0.6,
  },
  pausedHighlight: {
    opacity: 0.8,
  },
  sentenceText: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },
});

export default SentenceHighlighter;
