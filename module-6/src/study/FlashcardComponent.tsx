import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Flashcard } from '../components/ModuleConnector';
import { markReviewed } from '../database/FlashcardRepository';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface Props {
  cards: Flashcard[];
  onSessionComplete?: (correct: number, total: number) => void;
}

interface SessionResult {
  correct: number;
  total: number;
}

export default function FlashcardComponent({ cards: initialCards, onSessionComplete }: Props) {
  const [cards, setCards] = useState<Flashcard[]>(() => [...initialCards]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [result, setResult] = useState<SessionResult>({ correct: 0, total: 0 });

  const flipAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const flipCard = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Animated.timing(flipAnim, {
      toValue: flipped ? 0 : 180,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setFlipped((f) => !f);
      isAnimating.current = false;
    });
  }, [flipped, flipAnim]);

  const resetCard = useCallback(() => {
    swipeAnim.setValue(0);
    flipAnim.setValue(0);
    setFlipped(false);
  }, [swipeAnim, flipAnim]);

  const advance = useCallback(
    async (wasCorrect: boolean) => {
      const card = cards[currentIndex];
      if (card?.id) {
        await markReviewed(card.id, wasCorrect).catch(() => {});
      }

      const newCorrect = wasCorrect ? correct + 1 : correct;
      const nextIndex = currentIndex + 1;

      if (nextIndex >= cards.length) {
        setResult({ correct: newCorrect, total: cards.length });
        setSessionDone(true);
        onSessionComplete?.(newCorrect, cards.length);
      } else {
        Animated.timing(swipeAnim, {
          toValue: wasCorrect ? SCREEN_WIDTH : -SCREEN_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setCurrentIndex(nextIndex);
          setCorrect(newCorrect);
          resetCard();
        });
      }
    },
    [cards, currentIndex, correct, swipeAnim, resetCard, onSessionComplete]
  );

  const handleDifficulty = useCallback(
    async (difficulty: 'easy' | 'medium' | 'hard') => {
      await advance(difficulty !== 'hard');
    },
    [advance]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        swipeAnim.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) {
          advance(true);
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          advance(false);
        } else {
          Animated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const toggleShuffle = () => {
    const arr = [...initialCards];
    if (!shuffled) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    setCards(arr);
    setCurrentIndex(0);
    setCorrect(0);
    setSessionDone(false);
    resetCard();
    setShuffled((s) => !s);
  };

  const restart = () => {
    setCurrentIndex(0);
    setCorrect(0);
    setSessionDone(false);
    resetCard();
  };

  if (cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No flashcards</Text>
        <Text style={styles.emptySubtitle}>Generate flashcards from your document first.</Text>
      </View>
    );
  }

  if (sessionDone) {
    const pct = Math.round((result.correct / result.total) * 100);
    return (
      <ScrollView contentContainerStyle={styles.sessionDone}>
        <Text style={styles.doneEmoji}>{pct >= 70 ? '🎉' : '📚'}</Text>
        <Text style={styles.doneTitle}>Session Complete!</Text>
        <Text style={styles.doneScore}>
          {result.correct} / {result.total} correct
        </Text>
        <Text style={styles.donePct}>{pct}%</Text>
        <Text style={styles.doneMsg}>
          {pct >= 90
            ? 'Outstanding! Keep it up.'
            : pct >= 70
            ? 'Great work! Review the tricky ones.'
            : 'Keep practicing — you are making progress.'}
        </Text>
        <TouchableOpacity style={styles.restartBtn} onPress={restart}>
          <Text style={styles.restartBtnText}>Study Again</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const card = cards[currentIndex];

  const swipeStyle = {
    transform: [
      { translateX: swipeAnim },
      {
        rotate: swipeAnim.interpolate({
          inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          outputRange: ['-15deg', '0deg', '15deg'],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progress}>
          Card {currentIndex + 1} of {cards.length}
        </Text>
        <TouchableOpacity onPress={toggleShuffle} style={[styles.shuffleBtn, shuffled && styles.shuffleActive]}>
          <Text style={styles.shuffleBtnText}>{shuffled ? 'Shuffled' : 'Shuffle'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex) / cards.length) * 100}%` }]} />
      </View>

      <View style={styles.swipeHints}>
        <Text style={[styles.swipeHint, styles.swipeHintLeft]}>✗ Incorrect</Text>
        <Text style={styles.tapHint}>Tap to flip</Text>
        <Text style={[styles.swipeHint, styles.swipeHintRight]}>Correct ✓</Text>
      </View>

      <View style={styles.cardArea} {...panResponder.panHandlers}>
        <Animated.View style={[styles.card, swipeStyle]}>
          <TouchableOpacity activeOpacity={1} onPress={flipCard} style={styles.cardTouchable}>
            <Animated.View
              style={[styles.cardFace, styles.cardFront, { transform: [{ rotateY: frontInterpolate }] }]}
            >
              <Text style={styles.cardLabel}>QUESTION</Text>
              <Text style={styles.cardText}>{card.question}</Text>
              <Text style={styles.difficultyBadge}>{card.difficulty?.toUpperCase()}</Text>
            </Animated.View>
            <Animated.View
              style={[styles.cardFace, styles.cardBack, { transform: [{ rotateY: backInterpolate }] }]}
            >
              <Text style={[styles.cardLabel, { color: '#4CAF50' }]}>ANSWER</Text>
              <Text style={styles.cardText}>{card.answer}</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {flipped && (
        <View style={styles.ratingRow}>
          <TouchableOpacity style={[styles.ratingBtn, styles.ratingHard]} onPress={() => handleDifficulty('hard')}>
            <Text style={styles.ratingBtnText}>Hard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ratingBtn, styles.ratingMedium]} onPress={() => handleDifficulty('medium')}>
            <Text style={styles.ratingBtnText}>Medium</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ratingBtn, styles.ratingEasy]} onPress={() => handleDifficulty('easy')}>
            <Text style={styles.ratingBtnText}>Easy</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.swipeInstruction}>Swipe right = correct · Swipe left = incorrect</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1117', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1117' },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: '#888', fontSize: 14, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progress: { color: '#aaa', fontSize: 14 },
  shuffleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#444' },
  shuffleActive: { borderColor: '#6C63FF', backgroundColor: '#1E1A3A' },
  shuffleBtnText: { color: '#fff', fontSize: 12 },
  progressBar: { height: 4, backgroundColor: '#2A2A3A', borderRadius: 2, marginBottom: 8 },
  progressFill: { height: 4, backgroundColor: '#6C63FF', borderRadius: 2 },
  swipeHints: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  swipeHint: { fontSize: 12 },
  swipeHintLeft: { color: '#F44336' },
  swipeHintRight: { color: '#4CAF50' },
  tapHint: { color: '#666', fontSize: 12 },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { width: SCREEN_WIDTH - 48, height: 300 },
  cardTouchable: { flex: 1 },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  cardFront: { backgroundColor: '#1A1B2E', borderWidth: 1, borderColor: '#2A2B3E' },
  cardBack: { backgroundColor: '#1A2E1A', borderWidth: 1, borderColor: '#2A3E2A' },
  cardLabel: { color: '#6C63FF', fontSize: 12, letterSpacing: 2, fontWeight: '700', marginBottom: 16 },
  cardText: { color: '#fff', fontSize: 18, textAlign: 'center', lineHeight: 26 },
  difficultyBadge: { position: 'absolute', top: 12, right: 16, color: '#555', fontSize: 10 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, marginBottom: 8 },
  ratingBtn: { flex: 1, marginHorizontal: 6, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ratingHard: { backgroundColor: '#C62828' },
  ratingMedium: { backgroundColor: '#F57C00' },
  ratingEasy: { backgroundColor: '#2E7D32' },
  ratingBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  swipeInstruction: { color: '#444', fontSize: 11, textAlign: 'center', marginTop: 4 },
  sessionDone: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1117', padding: 32 },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 8 },
  doneScore: { color: '#aaa', fontSize: 18, marginBottom: 4 },
  donePct: { color: '#6C63FF', fontSize: 48, fontWeight: '900', marginBottom: 16 },
  doneMsg: { color: '#888', fontSize: 15, textAlign: 'center', marginBottom: 32 },
  restartBtn: { backgroundColor: '#6C63FF', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 16 },
  restartBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
