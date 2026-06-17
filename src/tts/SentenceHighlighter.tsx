import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import TTSService from './TTSService';

interface SentenceHighlighterProps {
  text: string;
  currentSentenceIndex: number;
  isPaused: boolean;
}

export default function SentenceHighlighter({
  text,
  currentSentenceIndex,
  isPaused,
}: SentenceHighlighterProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const sentenceYPositions = useRef<number[]>([]);
  const opacityAnims = useRef<Animated.Value[]>([]);

  const sentences = TTSService.splitIntoSentences(text);

  useEffect(() => {
    sentenceYPositions.current = new Array(sentences.length).fill(0);
    opacityAnims.current = sentences.map(
      (_, i) => opacityAnims.current[i] ?? new Animated.Value(1)
    );
  }, [sentences.length]);

  useEffect(() => {
    if (isPaused) {
      opacityAnims.current.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    } else {
      opacityAnims.current.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [isPaused]);

  const scrollToCurrentSentence = useCallback(() => {
    const y = sentenceYPositions.current[currentSentenceIndex];
    if (y && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: Math.max(0, y - 80),
        animated: true,
      });
    }
  }, [currentSentenceIndex]);

  useEffect(() => {
    scrollToCurrentSentence();
  }, [currentSentenceIndex, scrollToCurrentSentence]);

  const handleSentenceLayout = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      sentenceYPositions.current[index] = event.nativeEvent.layout.y;
    },
    []
  );

  return (
    <ScrollView ref={scrollViewRef} style={styles.container} contentContainerStyle={styles.content}>
      {sentences.map((sentence, index) => {
        const isCurrent = index === currentSentenceIndex;
        const opacity = opacityAnims.current[index] ?? new Animated.Value(1);

        return (
          <View
            key={`sentence-${index}`}
            onLayout={handleSentenceLayout(index)}
            style={[
              styles.sentenceWrapper,
              isCurrent && styles.sentenceWrapperActive,
            ]}
          >
            <Animated.View style={[styles.sentenceInner, isCurrent && { opacity }]}>
              <Text
                style={[
                  styles.sentenceText,
                  isCurrent && styles.sentenceTextActive,
                ]}
              >
                {sentence}
              </Text>
            </Animated.View>
            {isCurrent && <View style={styles.activeIndicator} />}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: 200,
  },
  sentenceWrapper: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    borderRadius: 4,
  },
  sentenceWrapperActive: {
    borderLeftColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
  },
  sentenceInner: {
    paddingVertical: 4,
  },
  sentenceText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
    color: '#334155',
  },
  sentenceTextActive: {
    color: '#0c4a6e',
    fontFamily: 'Inter-Bold',
  },
  activeIndicator: {
    height: 2,
    backgroundColor: '#0ea5e9',
    borderRadius: 1,
    marginTop: 2,
  },
});
