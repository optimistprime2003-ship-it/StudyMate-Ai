import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Timer, CheckCircle, XCircle, RotateCcw } from 'lucide-react-native';
import type { QuizQuestion, StudySession } from '../components/ModuleConnector';
import { getDb } from '../database/DatabaseService';

interface QuizComponentProps {
  questions: QuizQuestion[];
  documentId: string;
  onComplete?: (session: StudySession) => void;
}

export default function QuizComponent({
  questions,
  documentId,
  onComplete,
}: QuizComponentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (!timerEnabled || isAnswered || isComplete) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, timerEnabled, isAnswered, isComplete]);

  const handleTimeout = useCallback(() => {
    setIsAnswered(true);
    setAnswers((a) => [...a, false]);
  }, []);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (isAnswered) return;
      const correct = answer === currentQuestion.correct_answer;
      setIsAnswered(true);
      setSelectedAnswer(answer);
      if (correct) setScore((s) => s + 1);
      setAnswers((a) => [...a, correct]);
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [currentQuestion, isAnswered],
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setIsComplete(true);
      const sessionId = `session_${Date.now()}`;
      const now = new Date().toISOString();
      const finalScore = score;
      const finalAnswers = [...answers, selectedAnswer === currentQuestion?.correct_answer];

      const session: StudySession = {
        id: sessionId,
        document_id: documentId,
        started_at: now,
        ended_at: now,
        cards_reviewed: questions.length,
        correct_count: finalScore,
      };

      try {
        const db = getDb();
        db.runSync(
          `INSERT INTO study_sessions (id, document_id, started_at, ended_at, cards_reviewed, correct_count)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [session.id, session.document_id, session.started_at, session.ended_at, session.cards_reviewed, session.correct_count],
        );
      } catch {
        // non-critical
      }

      onComplete?.(session);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(30);
    }
  }, [currentIndex, questions.length, score, answers]);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setAnswers([]);
    setTimeLeft(30);
    setIsComplete(false);
  }, []);

  if (isComplete) {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <View style={styles.completeContainer}>
        <Text style={styles.completeTitle}>Quiz Complete</Text>
        <Text style={styles.completeScore}>
          {score} / {questions.length} ({pct}%)
        </Text>
        <View style={styles.scoreBar}>
          <View style={[styles.scoreBarFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.gradeText}>
          {pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Good job!' : pct >= 50 ? 'Keep practicing' : 'Needs improvement'}
        </Text>
        <TouchableOpacity style={styles.restartBtn} onPress={restart}>
          <RotateCcw size={20} color="#fff" />
          <Text style={styles.restartBtnText}>Retake Quiz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentQuestion) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No quiz questions available</Text>
      </View>
    );
  }

  const options: string[] = (() => {
    try {
      return JSON.parse(currentQuestion.options);
    } catch {
      return [];
    }
  })();

  const isTrueFalse = currentQuestion.type === 'true_false';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.questionCount}>
          Q{currentIndex + 1} of {questions.length}
        </Text>
        <View style={styles.headerRight}>
          <Text style={styles.scoreLabel}>Score: {score}</Text>
          <TouchableOpacity
            onPress={() => setTimerEnabled(!timerEnabled)}
            style={[styles.timerToggle, timerEnabled && styles.timerToggleActive]}
          >
            <Timer size={16} color={timerEnabled ? '#2563eb' : '#94a3b8'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Timer */}
      {timerEnabled && !isAnswered && (
        <View style={styles.timerBar}>
          <View style={[styles.timerBarFill, { width: `${(timeLeft / 30) * 100}%` }]} />
        </View>
      )}

      {/* Progress */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${((currentIndex + 1) / questions.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Question */}
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {isTrueFalse ? (
            ['True', 'False'].map((opt) => {
              const isSelected = selectedAnswer === opt;
              const isCorrect = opt === currentQuestion.correct_answer;
              let optStyle = styles.optionBtn;
              if (isAnswered && isCorrect) optStyle = { ...optStyle, ...styles.optionCorrect };
              else if (isAnswered && isSelected && !isCorrect) optStyle = { ...optStyle, ...styles.optionIncorrect };
              else if (isAnswered) optStyle = { ...optStyle, ...styles.optionDisabled };

              return (
                <TouchableOpacity
                  key={opt}
                  style={optStyle}
                  onPress={() => handleAnswer(opt)}
                  disabled={isAnswered}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {isAnswered && isCorrect && <CheckCircle size={20} color="#16a34a" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle size={20} color="#dc2626" />}
                </TouchableOpacity>
              );
            })
          ) : (
            options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = selectedAnswer === opt;
              const isCorrect = opt === currentQuestion.correct_answer;
              let optStyle = styles.optionBtn;
              if (isAnswered && isCorrect) optStyle = { ...optStyle, ...styles.optionCorrect };
              else if (isAnswered && isSelected && !isCorrect) optStyle = { ...optStyle, ...styles.optionIncorrect };
              else if (isAnswered) optStyle = { ...optStyle, ...styles.optionDisabled };

              return (
                <TouchableOpacity
                  key={idx}
                  style={optStyle}
                  onPress={() => handleAnswer(opt)}
                  disabled={isAnswered}
                >
                  <View style={styles.optionLetter}>
                    <Text style={styles.optionLetterText}>{letter}</Text>
                  </View>
                  <Text style={styles.optionText} numberOfLines={3}>
                    {opt}
                  </Text>
                  {isAnswered && isCorrect && <CheckCircle size={20} color="#16a34a" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle size={20} color="#dc2626" />}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Explanation */}
        {isAnswered && currentQuestion.explanation && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>Explanation</Text>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* Next button */}
      {isAnswered && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {currentIndex + 1 >= questions.length ? 'Finish Quiz' : 'Next Question'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  questionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  timerToggle: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  timerToggleActive: {
    backgroundColor: '#dbeafe',
  },
  timerBar: {
    height: 3,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: 3,
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 20,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 28,
    marginTop: 16,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 10,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionCorrect: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  optionIncorrect: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 20,
  },
  explanationBox: {
    marginTop: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  nextBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 16,
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
    overflow: 'hidden',
    marginBottom: 16,
  },
  scoreBarFill: {
    height: 12,
    backgroundColor: '#16a34a',
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 32,
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
