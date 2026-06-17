import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { getDB } from '../database/DatabaseService';

interface QuizQuestion {
  id: string;
  document_id: string;
  question: string;
  type: 'multiple_choice' | 'true_false';
  correct_answer: string;
  options?: string[];
  explanation?: string;
}

interface Props {
  documentId: string;
  questions: QuizQuestion[];
  onComplete?: (score: number, total: number) => void;
}

type Phase = 'question' | 'reveal' | 'done';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function QuizComponent({ documentId, questions, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef(generateId());
  const sessionStartRef = useRef(new Date().toISOString());

  const question = questions[currentIndex];

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (timerEnabled && phase === 'question') {
      setTimeLeft(30);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearTimer();
            handleReveal(null);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return clearTimer;
  }, [currentIndex, timerEnabled, phase]);

  const handleReveal = useCallback(
    (answer: string | null) => {
      clearTimer();
      setSelected(answer);
      setPhase('reveal');
      if (answer === question?.correct_answer) {
        setScore((s) => s + 1);
      }
    },
    [question]
  );

  const handleNext = async () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      const finalScore = selected === question?.correct_answer ? score + 1 : score;
      await saveSession(finalScore);
      setPhase('done');
      onComplete?.(finalScore, questions.length);
    } else {
      setCurrentIndex(nextIndex);
      setSelected(null);
      setPhase('question');
    }
  };

  const saveSession = async (finalScore: number) => {
    try {
      const db = await getDB();
      await db.runAsync(
        `INSERT OR REPLACE INTO study_sessions
          (id, document_id, started_at, ended_at, cards_reviewed, correct_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sessionIdRef.current,
          documentId,
          sessionStartRef.current,
          new Date().toISOString(),
          questions.length,
          finalScore,
        ]
      );
    } catch (_) {}
  };

  const restart = () => {
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
    setPhase('question');
    sessionIdRef.current = generateId();
    sessionStartRef.current = new Date().toISOString();
  };

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No quiz questions</Text>
        <Text style={styles.emptySubtitle}>Generate quiz questions from your document first.</Text>
      </View>
    );
  }

  if (phase === 'done') {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <ScrollView contentContainerStyle={styles.donePage}>
        <Text style={styles.doneEmoji}>{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📖'}</Text>
        <Text style={styles.doneTitle}>Quiz Complete!</Text>
        <Text style={styles.doneScore}>{score} / {questions.length} correct</Text>
        <Text style={styles.donePct}>{pct}%</Text>
        <Text style={styles.doneMsg}>
          {pct >= 90
            ? 'Excellent mastery!'
            : pct >= 70
            ? 'Good job — keep reviewing.'
            : 'Keep studying and try again.'}
        </Text>
        <TouchableOpacity style={styles.restartBtn} onPress={restart}>
          <Text style={styles.restartBtnText}>Retake Quiz</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const options =
    question.type === 'true_false'
      ? ['True', 'False']
      : question.options ?? [];

  const isCorrect = selected === question.correct_answer;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.progress}>
          {currentIndex + 1} / {questions.length}
        </Text>
        <Text style={styles.scoreLabel}>Score: {score}</Text>
        <View style={styles.timerToggle}>
          <Text style={styles.timerLabel}>Timer</Text>
          <Switch
            value={timerEnabled}
            onValueChange={setTimerEnabled}
            trackColor={{ false: '#333', true: '#6C63FF' }}
            thumbColor={timerEnabled ? '#fff' : '#888'}
          />
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex) / questions.length) * 100}%` }]} />
      </View>

      {timerEnabled && phase === 'question' && (
        <View style={styles.timerRow}>
          <Text style={[styles.timerText, timeLeft <= 5 && styles.timerUrgent]}>
            {timeLeft}s
          </Text>
        </View>
      )}

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.typeBadgeRow}>
          <Text style={styles.typeBadge}>
            {question.type === 'true_false' ? 'TRUE / FALSE' : 'MULTIPLE CHOICE'}
          </Text>
        </View>

        <Text style={styles.questionText}>{question.question}</Text>

        <View style={styles.optionsList}>
          {options.map((opt) => {
            let optStyle = styles.option;
            let textStyle = styles.optionText;
            if (phase === 'reveal') {
              if (opt === question.correct_answer) {
                optStyle = { ...styles.option, ...styles.optionCorrect };
                textStyle = { ...styles.optionText, ...styles.optionCorrectText };
              } else if (opt === selected) {
                optStyle = { ...styles.option, ...styles.optionWrong };
                textStyle = { ...styles.optionText, ...styles.optionWrongText };
              }
            } else if (opt === selected) {
              optStyle = { ...styles.option, ...styles.optionSelected };
            }

            return (
              <TouchableOpacity
                key={opt}
                style={optStyle}
                onPress={() => phase === 'question' && handleReveal(opt)}
                disabled={phase === 'reveal'}
              >
                <Text style={textStyle}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {phase === 'reveal' && (
          <View style={[styles.resultBanner, isCorrect ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultText}>{isCorrect ? '✓ Correct!' : '✗ Incorrect'}</Text>
            {question.explanation ? (
              <Text style={styles.explanation}>{question.explanation}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      {phase === 'reveal' && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question →'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1117' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1117' },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: '#888', fontSize: 14, textAlign: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  progress: { color: '#aaa', fontSize: 14 },
  scoreLabel: { color: '#6C63FF', fontSize: 14, fontWeight: '700' },
  timerToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerLabel: { color: '#aaa', fontSize: 12 },
  progressBar: { height: 3, backgroundColor: '#1E1E2E', marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: '#6C63FF', borderRadius: 2 },
  timerRow: { alignItems: 'center', paddingVertical: 8 },
  timerText: { color: '#aaa', fontSize: 22, fontWeight: '700' },
  timerUrgent: { color: '#F44336' },
  body: { flex: 1, padding: 16 },
  typeBadgeRow: { marginBottom: 12 },
  typeBadge: { color: '#6C63FF', fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  questionText: { color: '#fff', fontSize: 18, lineHeight: 27, fontWeight: '600', marginBottom: 24 },
  optionsList: { gap: 12 },
  option: {
    backgroundColor: '#1A1B2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2B3E',
  },
  optionSelected: {
    backgroundColor: '#1E1A3A',
    borderColor: '#6C63FF',
  },
  optionCorrect: {
    backgroundColor: '#1A2E1A',
    borderColor: '#4CAF50',
  },
  optionWrong: {
    backgroundColor: '#2E1A1A',
    borderColor: '#F44336',
  },
  optionText: { color: '#ddd', fontSize: 15 },
  optionCorrectText: { color: '#4CAF50', fontWeight: '700' },
  optionWrongText: { color: '#F44336' },
  resultBanner: { marginTop: 20, borderRadius: 12, padding: 16 },
  resultCorrect: { backgroundColor: '#1A2E1A', borderWidth: 1, borderColor: '#4CAF50' },
  resultWrong: { backgroundColor: '#2E1A1A', borderWidth: 1, borderColor: '#F44336' },
  resultText: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  explanation: { color: '#bbb', fontSize: 14, lineHeight: 21 },
  nextBtn: { margin: 16, backgroundColor: '#6C63FF', borderRadius: 14, padding: 16, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  donePage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1117', padding: 32 },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 8 },
  doneScore: { color: '#aaa', fontSize: 18, marginBottom: 4 },
  donePct: { color: '#6C63FF', fontSize: 48, fontWeight: '900', marginBottom: 16 },
  doneMsg: { color: '#888', fontSize: 15, textAlign: 'center', marginBottom: 32 },
  restartBtn: { backgroundColor: '#6C63FF', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 16 },
  restartBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
