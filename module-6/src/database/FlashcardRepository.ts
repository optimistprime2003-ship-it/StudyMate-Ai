import { getDB } from './DatabaseService';
import { Flashcard } from '../components/ModuleConnector';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DIFFICULTY_INTERVALS: Record<string, number> = {
  easy: 4 * 24 * 60 * 60 * 1000,
  medium: 1 * 24 * 60 * 60 * 1000,
  hard: 4 * 60 * 60 * 1000,
};

function nextReviewDate(difficulty: string): string {
  const interval = DIFFICULTY_INTERVALS[difficulty] ?? DIFFICULTY_INTERVALS.medium;
  return new Date(Date.now() + interval).toISOString();
}

export async function saveFlashcards(cards: Flashcard[]): Promise<void> {
  const db = await getDB();
  for (const card of cards) {
    await db.runAsync(
      `INSERT OR REPLACE INTO flashcards
        (id, document_id, question, answer, difficulty, times_reviewed, last_reviewed, next_review)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.id ?? generateId(),
        card.document_id,
        card.question,
        card.answer,
        card.difficulty ?? 'medium',
        card.times_reviewed ?? 0,
        card.last_reviewed ?? null,
        card.next_review ?? nextReviewDate(card.difficulty ?? 'medium'),
      ]
    );
  }
}

export async function getFlashcards(documentId: string): Promise<Flashcard[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM flashcards WHERE document_id = ? ORDER BY created_at ASC',
    [documentId]
  );
  return rows.map(mapRow);
}

export async function markReviewed(
  cardId: string,
  correct: boolean
): Promise<void> {
  const db = await getDB();
  const card = await db.getFirstAsync<any>(
    'SELECT * FROM flashcards WHERE id = ?',
    [cardId]
  );
  if (!card) return;

  const timesReviewed = (card.times_reviewed ?? 0) + 1;
  const difficulty = correct
    ? adjustDifficultyUp(card.difficulty)
    : adjustDifficultyDown(card.difficulty);

  await db.runAsync(
    `UPDATE flashcards
     SET times_reviewed = ?, last_reviewed = ?, next_review = ?, difficulty = ?
     WHERE id = ?`,
    [
      timesReviewed,
      new Date().toISOString(),
      nextReviewDate(difficulty),
      difficulty,
      cardId,
    ]
  );
}

export async function getDueCards(documentId: string): Promise<Flashcard[]> {
  const db = await getDB();
  const now = new Date().toISOString();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM flashcards
     WHERE document_id = ?
       AND (next_review IS NULL OR next_review <= ?)
     ORDER BY next_review ASC`,
    [documentId, now]
  );
  return rows.map(mapRow);
}

function adjustDifficultyUp(current: string): string {
  const order = ['hard', 'medium', 'easy'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : 'easy';
}

function adjustDifficultyDown(current: string): string {
  const order = ['hard', 'medium', 'easy'];
  const idx = order.indexOf(current);
  return idx > 0 ? order[idx - 1] : 'hard';
}

function mapRow(row: any): Flashcard {
  return {
    id: row.id,
    document_id: row.document_id,
    question: row.question,
    answer: row.answer,
    difficulty: row.difficulty,
    times_reviewed: row.times_reviewed,
    last_reviewed: row.last_reviewed,
    next_review: row.next_review,
  };
}
