import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getDB } from '../database/DatabaseService';

interface DashboardStats {
  dueToday: number;
  quizAccuracy: number;
  studyStreak: number;
  documentsThisWeek: number;
}

interface RecentSession {
  id: string;
  document_id: string;
  documentTitle: string;
  started_at: string;
  cards_reviewed: number;
  correct_count: number;
}

interface Props {
  onStartFlashcards?: (documentId?: string) => void;
  onStartQuiz?: (documentId?: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString();
}

async function fetchStats(): Promise<DashboardStats> {
  const db = await getDB();
  const now = new Date().toISOString();

  const dueRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM flashcards WHERE next_review IS NULL OR next_review <= ?`,
    [now]
  );

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const accuracyRows = await db.getAllAsync<{ correct_count: number; cards_reviewed: number }>(
    `SELECT correct_count, cards_reviewed FROM study_sessions WHERE started_at >= ?`,
    [weekAgo]
  );
  const totalReviewed = accuracyRows.reduce((s, r) => s + (r.cards_reviewed ?? 0), 0);
  const totalCorrect = accuracyRows.reduce((s, r) => s + (r.correct_count ?? 0), 0);
  const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;

  const docWeekRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(DISTINCT document_id) as cnt FROM study_sessions WHERE started_at >= ?`,
    [weekAgo]
  );

  const streakRows = await db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT date(started_at) as day FROM study_sessions ORDER BY day DESC LIMIT 60`
  );
  let streak = 0;
  if (streakRows.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let expected = today;
    for (const row of streakRows) {
      const d = new Date(row.day + 'T00:00:00');
      if (d.getTime() === expected.getTime()) {
        streak++;
        expected = new Date(expected.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  }

  return {
    dueToday: dueRow?.cnt ?? 0,
    quizAccuracy: accuracy,
    studyStreak: streak,
    documentsThisWeek: docWeekRow?.cnt ?? 0,
  };
}

async function fetchRecentSessions(): Promise<RecentSession[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT ss.id, ss.document_id, ss.started_at, ss.cards_reviewed, ss.correct_count, d.title as documentTitle
     FROM study_sessions ss
     LEFT JOIN documents d ON d.id = ss.document_id
     ORDER BY ss.started_at DESC
     LIMIT 10`
  );
  return rows.map((r) => ({
    id: r.id,
    document_id: r.document_id,
    documentTitle: r.documentTitle ?? 'Unknown Document',
    started_at: r.started_at,
    cards_reviewed: r.cards_reviewed ?? 0,
    correct_count: r.correct_count ?? 0,
  }));
}

export default function StudyDashboard({ onStartFlashcards, onStartQuiz }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, sess] = await Promise.all([fetchStats(), fetchRecentSessions()]);
      setStats(s);
      setSessions(sess);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
    >
      <Text style={styles.heading}>Study Dashboard</Text>

      <View style={styles.statsGrid}>
        <StatCard label="Due Today" value={stats?.dueToday ?? 0} unit="cards" color="#6C63FF" />
        <StatCard label="Accuracy" value={stats?.quizAccuracy ?? 0} unit="%" color="#4CAF50" />
        <StatCard label="Streak" value={stats?.studyStreak ?? 0} unit="days" color="#FF9800" />
        <StatCard label="Docs This Week" value={stats?.documentsThisWeek ?? 0} unit="docs" color="#2196F3" />
      </View>

      <Text style={styles.sectionTitle}>Quick Start</Text>
      <View style={styles.quickRow}>
        <TouchableOpacity
          style={[styles.quickBtn, styles.quickBtnPrimary]}
          onPress={() => onStartFlashcards?.()}
        >
          <Text style={styles.quickBtnEmoji}>🃏</Text>
          <Text style={styles.quickBtnLabel}>Review Cards</Text>
          <Text style={styles.quickBtnSub}>
            {stats?.dueToday ?? 0} due today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickBtn, styles.quickBtnSecondary]}
          onPress={() => onStartQuiz?.()}
        >
          <Text style={styles.quickBtnEmoji}>📝</Text>
          <Text style={styles.quickBtnLabel}>Take Quiz</Text>
          <Text style={styles.quickBtnSub}>Test your knowledge</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Sessions</Text>
      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No study sessions yet.</Text>
          <Text style={styles.emptyStateSubtext}>Start reviewing cards or take a quiz!</Text>
        </View>
      ) : (
        sessions.map((sess) => {
          const pct =
            sess.cards_reviewed > 0
              ? Math.round((sess.correct_count / sess.cards_reviewed) * 100)
              : 0;
          return (
            <View key={sess.id} style={styles.sessionCard}>
              <View style={styles.sessionLeft}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {sess.documentTitle}
                </Text>
                <Text style={styles.sessionMeta}>
                  {formatDate(sess.started_at)} · {sess.cards_reviewed} cards
                </Text>
              </View>
              <View style={styles.sessionRight}>
                <Text style={[styles.sessionPct, pct >= 70 ? styles.pctGood : styles.pctBad]}>
                  {pct}%
                </Text>
                <Text style={styles.sessionPctLabel}>correct</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1117' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1117' },
  heading: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#1A1B2E',
    borderRadius: 14,
    padding: 16,
    borderTopWidth: 3,
  },
  statValue: { fontSize: 32, fontWeight: '900' },
  statUnit: { color: '#666', fontSize: 12, marginTop: -2 },
  statLabel: { color: '#aaa', fontSize: 13, marginTop: 6 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  quickBtn: { flex: 1, borderRadius: 16, padding: 18, alignItems: 'center' },
  quickBtnPrimary: { backgroundColor: '#1E1A3A', borderWidth: 1, borderColor: '#6C63FF' },
  quickBtnSecondary: { backgroundColor: '#1A2A1A', borderWidth: 1, borderColor: '#4CAF50' },
  quickBtnEmoji: { fontSize: 32, marginBottom: 8 },
  quickBtnLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  quickBtnSub: { color: '#888', fontSize: 12, marginTop: 4 },
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1B2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  sessionLeft: { flex: 1, marginRight: 12 },
  sessionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  sessionMeta: { color: '#666', fontSize: 12 },
  sessionRight: { alignItems: 'center' },
  sessionPct: { fontSize: 22, fontWeight: '800' },
  pctGood: { color: '#4CAF50' },
  pctBad: { color: '#F44336' },
  sessionPctLabel: { color: '#666', fontSize: 11 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyStateText: { color: '#aaa', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyStateSubtext: { color: '#555', fontSize: 13 },
});
