import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Card, Button, ProgressBar, Chip } from 'react-native-paper';
import { useAppStore } from '../store/appStore';
import EmptyState from '../components/EmptyState';
import type { Flashcard } from '../components/ModuleConnector';

const SAMPLE_FLASHCARDS: Flashcard[] = [
  { id: '1', question: 'What is supervised learning?', answer: 'A type of ML where the model is trained on labeled data, learning to map inputs to outputs.', documentId: '1' },
  { id: '2', question: 'Define gradient descent.', answer: 'An optimization algorithm that iteratively adjusts parameters to minimize a loss function.', documentId: '1' },
  { id: '3', question: 'What is overfitting?', answer: 'When a model learns noise in the training data rather than the underlying pattern, performing poorly on new data.', documentId: '1' },
];

export default function StudyScreen() {
  const theme = useTheme();
  const { flashcards } = useAppStore();
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState<'flashcards' | 'quiz' | 'hub'>('hub');

  const cards = flashcards.length > 0 ? flashcards : SAMPLE_FLASHCARDS;

  if (mode === 'flashcards') {
    const card = cards[currentCard];
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Button mode="text" onPress={() => setMode('hub')} icon="arrow-left">
            Back
          </Button>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {currentCard + 1} / {cards.length}
          </Text>
        </View>

        <ProgressBar
          progress={(currentCard + 1) / cards.length}
          color={theme.colors.primary}
          style={styles.progress}
        />

        <TouchableOpacity
          style={[styles.flashcard, { backgroundColor: theme.colors.surface }]}
          onPress={() => setShowAnswer(!showAnswer)}
          activeOpacity={0.9}
        >
          <Text
            variant="titleLarge"
            style={[styles.cardText, { color: theme.colors.onSurface }]}
          >
            {showAnswer ? card.answer : card.question}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
          >
            {showAnswer ? 'Tap to see question' : 'Tap to reveal answer'}
          </Text>
        </TouchableOpacity>

        <View style={styles.cardNav}>
          <Button
            mode="outlined"
            onPress={() => { setCurrentCard(Math.max(0, currentCard - 1)); setShowAnswer(false); }}
            disabled={currentCard === 0}
          >
            Previous
          </Button>
          <Button
            mode="contained"
            onPress={() => { setCurrentCard(Math.min(cards.length - 1, currentCard + 1)); setShowAnswer(false); }}
            disabled={currentCard === cards.length - 1}
          >
            Next
          </Button>
        </View>
      </View>
    );
  }

  if (mode === 'quiz') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Button mode="text" onPress={() => setMode('hub')} icon="arrow-left">
            Back
          </Button>
        </View>
        <EmptyState
          title="Quiz Module"
          message="AI-powered quizzes will be available when the AI module is integrated. Stay tuned!"
          icon="school-outline"
        />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.hubContent}>
      <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: '700', marginBottom: 8 }}>
        Study Hub
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
        Choose a study mode to get started
      </Text>

      <Card style={[styles.modeCard, { backgroundColor: theme.colors.primaryContainer }]} onPress={() => setMode('flashcards')}>
        <Card.Content style={styles.modeContent}>
          <Text style={{ fontSize: 32 }}>🃏</Text>
          <View style={styles.modeText}>
            <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }}>
              Flashcards
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
              {cards.length} cards ready
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.modeCard, { backgroundColor: theme.colors.secondaryContainer }]} onPress={() => setMode('quiz')}>
        <Card.Content style={styles.modeContent}>
          <Text style={{ fontSize: 32 }}>📝</Text>
          <View style={styles.modeText}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSecondaryContainer, fontWeight: '600' }}>
              Quiz
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer }}>
              AI-generated questions
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  progress: { marginHorizontal: 16, marginBottom: 16 },
  flashcard: { flex: 1, margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  cardText: { textAlign: 'center', lineHeight: 28 },
  cardNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  hubContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24 },
  modeCard: { marginBottom: 16, borderRadius: 16 },
  modeContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modeText: { flex: 1, gap: 2 },
});
