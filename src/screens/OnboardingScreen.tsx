import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { useAppStore } from '../store/appStore';

const { width } = Dimensions.get('window');

interface Slide {
  title: string;
  description: string;
  emoji: string;
  gradient: string[];
}

const SLIDES: Slide[] = [
  {
    title: 'Welcome to StudyMate AI',
    description: 'Your intelligent study companion that helps you learn smarter, not harder.',
    emoji: '📚',
    gradient: ['#6366F1', '#818CF8'],
  },
  {
    title: 'Import & Read',
    description: 'Import PDFs, documents, and presentations. Read and annotate with powerful tools.',
    emoji: '📖',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
  {
    title: 'AI-Powered Study',
    description: 'Chat with AI about your documents, generate flashcards, and take quizzes — all automatically.',
    emoji: '🧠',
    gradient: ['#06B6D4', '#22D3EE'],
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const { completeOnboarding } = useAppStore();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const scrollTo = (index: number) => {
    setActiveSlide(index);
    scrollRef.current?.scrollTo({ x: width * index, animated: true });
  };

  const handleNext = () => {
    if (activeSlide < SLIDES.length - 1) {
      scrollTo(activeSlide + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveSlide(index);
        }}
        style={styles.slides}
      >
        {SLIDES.map((slide, idx) => (
          <View key={idx} style={[styles.slide, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.emojiCircle, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={styles.emoji}>{slide.emoji}</Text>
            </View>
            <Text
              variant="headlineMedium"
              style={[styles.slideTitle, { color: theme.colors.onBackground }]}
            >
              {slide.title}
            </Text>
            <Text
              variant="bodyLarge"
              style={[styles.slideDesc, { color: theme.colors.onSurfaceVariant }]}
            >
              {slide.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {SLIDES.map((_, idx) => (
          <TouchableOpacity key={idx} onPress={() => scrollTo(idx)}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: idx === activeSlide ? theme.colors.primary : theme.colors.outline,
                  width: idx === activeSlide ? 24 : 8,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        {activeSlide < SLIDES.length - 1 && (
          <Button mode="text" onPress={handleSkip} labelStyle={{ color: theme.colors.onSurfaceVariant }}>
            Skip
          </Button>
        )}
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.nextButton}
          contentStyle={styles.nextButtonContent}
        >
          {activeSlide === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slides: { flex: 1 },
  slide: { width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  emojiCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emoji: { fontSize: 56 },
  slideTitle: { textAlign: 'center', fontWeight: '700' },
  slideDesc: { textAlign: 'center', maxWidth: 300, lineHeight: 24 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 },
  dot: { height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32 },
  nextButton: { borderRadius: 24, flex: 1, marginLeft: 16 },
  nextButtonContent: { paddingVertical: 4 },
});
