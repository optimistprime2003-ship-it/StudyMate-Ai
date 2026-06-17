import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import {
  RotateCcw,
  Shuffle,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
} from 'lucide-react-native';
import type { Flashcard } from '../components/ModuleConnector';

interface FlashcardComponentProps {
  cards: Flashcard[];
  onRate: (cardId: string, difficulty: Flashcard['difficulty']) => void;
  onComplete: (reviewed: number, correct: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = 320;

export default function FlashcardComponent({
  cards,
  onRate,
  onComplete,
}: FlashcardComponentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const flipAngle = useSharedValue(0);
  const cardTranslateX = useSharedValue(0);

  const orderedCards = useMemo(() => {
    if (shuffleMode && shuffledOrder.length > 0) {
      return shuffledOrder.map((i) => cards[i]).filter(Boolean);
    }
    return cards;
  }, [cards, shuffleMode, shuffledOrder]);

  const currentCard = orderedCards[currentIndex];

  const flipAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAngle.value, [0, 180], [0, 180], Extrapolation.CLAMP);
    const opacity = interpolate(
      flipAngle.value,
      [89, 91],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotateY}deg` }],
      opacity: isFlipped ? 1 : opacity,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAngle.value, [0, 180], [180, 360], Extrapolation.CLAMP);
    const opacity = interpolate(
      flipAngle.value,
      [89, 91],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotateY}deg` }],
      opacity: isFlipped ? opacity : 0,
      position: 'absolute' as const,
    };
  });

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cardTranslateX.value }],
  }));

  const flipCard = useCallback(() => {
    if (isFlipped) {
      flipAngle.value = withTiming(0, { duration: 300 });
      setIsFlipped(false);
    } else {
      flipAngle.value = withTiming(180, { duration: 300 });
      setIsFlipped(true);
    }
  }, [isFlipped]);

  const handleRate = useCallback(
    (difficulty: Flashcard['difficulty']) => {
      if (!currentCard) return;
      const isCorrect = difficulty === 'easy' || difficulty === 'medium';
      onRate(currentCard.id, difficulty);
      setReviewedCount((c) => c + 1);
      if (isCorrect) setCorrectCount((c) => c + 1);

      // Animate slide out, then advance
      cardTranslateX.value = withSpring(isCorrect ? 300 : -300, { damping: 15 }, () => {
        runOnJS(advanceCard)();
      });
    },
    [currentCard, onRate],
  );

  const advanceCard = useCallback(() => {
    cardTranslateX.value = 0;
    flipAngle.value = 0;
    setIsFlipped(false);

    if (currentIndex + 1 >= orderedCards.length) {
      const finalReviewed = reviewedCount + 1;
      const finalCorrect = correctCount + ((currentCard && (isFlipped)) ? 1 : 0);
      setIsComplete(true);
      onComplete(finalReviewed, finalCorrect);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, orderedCards.length, reviewedCount, correctCount]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      flipAngle.value = 0;
      setIsFlipped(false);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const toggleShuffle = useCallback(() => {
    if (!shuffleMode) {
      const indices = cards.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledOrder(indices);
      setCurrentIndex(0);
      setShuffleMode(true);
    } else {
      setShuffleMode(false);
      setCurrentIndex(0);
    }
    setCorrectCount(0);
    setReviewedCount(0);
    setIsComplete(false);
  }, [shuffleMode, cards]);

  if (isComplete) {
    const pct = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0;
    return (
      <View style={styles.completeContainer}>
        <Text style={styles.completeTitle}>Session Complete</Text>
        <Text style={styles.completeScore}>
          {correctCount} / {reviewedCount} correct ({pct}%)
        </Text>
        <View style={styles.scoreBar}>
          <View style={[styles.scoreBarFill, { width: `${pct}%` }]} />
        </View>
        <TouchableOpacity style={styles.restartBtn} onPress={toggleShuffle}>
          <RotateCcw size={20} color="#fff" />
          <Text style={styles.restartBtnText}>Restart</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No flashcards available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.progressText}>
          Card {currentIndex + 1} of {orderedCards.length}
        </Text>
        <TouchableOpacity onPress={toggleShuffle} style={styles.shuffleBtn}>
          <Shuffle size={20} color={shuffleMode ? '#2563eb' : '#64748b'} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${((currentIndex + 1) / orderedCards.length) * 100}%` },
          ]}
        />
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        <Animated.View
          style={[styles.card, flipAnimatedStyle, slideAnimatedStyle]}
        >
          <Text style={styles.questionText}>{currentCard.question}</Text>
          <TouchableOpacity style={styles.flipHint} onPress={flipCard}>
            <Text style={styles.flipHintText}>Tap to reveal answer</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[styles.card, styles.cardBack, backAnimatedStyle, slideAnimatedStyle]}
        >
          <Text style={styles.answerLabel}>Answer</Text>
          <Text style={styles.answerText}>{currentCard.answer}</Text>
        </Animated.View>
      </View>

      {/* Navigation */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={goBack} disabled={currentIndex === 0} style={styles.navBtn}>
          <ChevronLeft size={24} color={currentIndex === 0 ? '#cbd5e1' : '#334155'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={flipCard} style={styles.flipBtn}>
          <RotateCcw size={20} color="#2563eb" />
          <Text style={styles.flipBtnText}>Flip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (currentIndex + 1 < orderedCards.length) {
              setCurrentIndex((i) => i + 1);
              flipAngle.value = 0;
              setIsFlipped(false);
            }
          }}
          style={styles.navBtn}
        >
          <ChevronRight size={24} color="#334155" />
        </TouchableOpacity>
      </View>

      {/* Difficulty buttons (show when flipped) */}
      {isFlipped && (
        <View style={styles.difficultyRow}>
          <TouchableOpacity
            style={[styles.diffBtn, styles.easyBtn]}
            onPress={() => handleRate('easy')}
          >
            <Check size={18} color="#fff" />
            <Text style={styles.diffBtnText}>Easy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diffBtn, styles.mediumBtn]}
            onPress={() => handleRate('medium')}
          >
            <Text style={styles.diffBtnText}>Medium</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diffBtn, styles.hardBtn]}
            onPress={() => handleRate('hard')}
          >
            <X size={18} color="#fff" />
            <Text style={styles.diffBtnText}>Hard</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  shuffleBtn: {
    padding: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 24,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  cardContainer: {
    alignItems: 'center',
    height: CARD_HEIGHT,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    backfaceVisibility: 'hidden',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 28,
  },
  flipHint: {
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  flipHintText: {
    fontSize: 14,
    color: '#64748b',
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  answerText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 26,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  navBtn: {
    padding: 12,
  },
  flipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },
  flipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  diffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  easyBtn: { backgroundColor: '#16a34a' },
  mediumBtn: { backgroundColor: '#d97706' },
  hardBtn: { backgroundColor: '#dc2626' },
  diffBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  completeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  completeScore: {
    fontSize: 20,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 24,
  },
  scoreBar: {
    width: '80%',
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    marginBottom: 32,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: 12,
    backgroundColor: '#16a34a',
    borderRadius: 6,
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  restartBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
});
