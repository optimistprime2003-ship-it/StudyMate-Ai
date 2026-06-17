import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  BookOpen,
  Brain,
  Flame,
  CheckCircle,
  Clock,
  ChevronRight,
  BarChart3,
} from 'lucide-react-native';
import { getDb } from '../database/DatabaseService';
import type { StudySession, Flashcard } from '../components/ModuleConnector';

interface DashboardStats {
  cardsDueToday: number;
  quizAccuracy: number;
  studyStreak: number;
  documentsThisWeek: number;
  recentSessions: StudySession[];
}

interface StudyDashboardProps {
  onStartReview?: () => void;
  onStartQuiz?: () => void;
}

export default function StudyDashboard({ onStartReview, onStartQuiz }: StudyDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    cardsDueToday: 0,
    quizAccuracy: 0,
    studyStreak: 0,
    documentsThisWeek: 0,
    recentSessions: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    const db = getDb();
    const now = new Date();
    const today = now.toISOString();

    // Cards due today
    const dueRow = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM flashcards WHERE next_review <= ?`,
      [today],
    );
    const cardsDueToday = dueRow?.count ?? 0;

    // Quiz accuracy (last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const accuracyRow = db.getFirstSync<{ total: number; correct: number }>(
      `SELECT SUM(cards_reviewed) as total, SUM(correct_count) as correct
       FROM study_sessions WHERE started_at >= ?`,
      [weekAgo],
    );
    const quizAccuracy =
      accuracyRow && accuracyRow.total > 0
        ? Math.round((accuracyRow.correct / accuracyRow.total) * 100)
        : 0;

    // Study streak
    let streak = 0;
    const dayCheck = new Date(now);
    dayCheck.setHours(23, 59, 59, 999);
    for (let i = 0; i < 365; i++) {
      const dayEnd = dayCheck.toISOString();
      const dayStart = new Date(dayCheck.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const row = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM study_sessions WHERE started_at >= ? AND started_at <= ?`,
        [dayStart, dayEnd],
      );
      if (row && row.count > 0) {
        streak++;
        dayCheck.setTime(dayCheck.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }

    // Documents studied this week
    const docRow = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(DISTINCT document_id) as count FROM study_sessions WHERE started_at >= ?`,
      [weekAgo],
    );
    const documentsThisWeek = docRow?.count ?? 0;

    // Recent sessions
    const sessionRows = db.getAllSync<any>(
      `SELECT * FROM study_sessions ORDER BY started_at DESC LIMIT 5`,
    );
    const recentSessions: StudySession[] = sessionRows.map((r: any) => ({
      id: r.id,
      document_id: r.document_id,
      started_at: r.started_at,
      ended_at: r.ended_at,
      cards_reviewed: r.cards_reviewed,
      correct_count: r.correct_count,
    }));

    setStats({
      cardsDueToday,
      quizAccuracy,
      studyStreak: streak,
      documentsThisWeek,
      recentSessions,
    });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Stat cards */}
      <View style={styles.statGrid}>
        <View style={[styles.statCard, { borderLeftColor: '#2563eb' }]}>
          <Brain size={22} color="#2563eb" />
          <Text style={styles.statValue}>{stats.cardsDueToday}</Text>
          <Text style={styles.statLabel}>Cards Due</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: '#16a34a' }]}>
          <BarChart3 size={22} color="#16a34a" />
          <Text style={styles.statValue}>{stats.quizAccuracy}%</Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: '#ea580c' }]}>
          <Flame size={22} color="#ea580c" />
          <Text style={styles.statValue}>{stats.studyStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: '#7c3aed' }]}>
          <BookOpen size={22} color="#7c3aed" />
          <Text style={styles.statValue}>{stats.documentsThisWeek}</Text>
          <Text style={styles.statLabel}>Docs This Week</Text>
        </View>
      </View>

      {/* Quick start */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Start</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={onStartReview}>
            <Brain size={24} color="#2563eb" />
            <Text style={styles.quickBtnLabel}>Review Cards</Text>
            {stats.cardsDueToday > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.cardsDueToday}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={onStartQuiz}>
            <CheckCircle size={24} color="#16a34a" />
            <Text style={styles.quickBtnLabel}>Take Quiz</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent sessions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {stats.recentSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={32} color="#cbd5e1" />
            <Text style={styles.emptyText}>No sessions yet. Start studying!</Text>
          </View>
        ) : (
          stats.recentSessions.map((session) => {
            const pct =
              session.cards_reviewed > 0
                ? Math.round((session.correct_count / session.cards_reviewed) * 100)
                : 0;
            return (
              <View key={session.id} style={styles.sessionRow}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionDate}>
                    {formatDate(session.started_at)}
                  </Text>
                  <Text style={styles.sessionDetail}>
                    {session.cards_reviewed} cards reviewed
                  </Text>
                </View>
                <View style={styles.sessionRight}>
                  <Text style={[styles.sessionPct, { color: pct >= 70 ? '#16a34a' : '#dc2626' }]}>
                    {pct}%
                  </Text>
                  <ChevronRight size={18} color="#94a3b8" />
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  sessionDetail: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionPct: {
    fontSize: 16,
    fontWeight: '700',
  },
});
