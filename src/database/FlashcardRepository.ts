import { getDb } from './DatabaseService';
import type { Flashcard } from '../components/ModuleConnector';

const DIFFICULTY_INTERVALS: Record<string, number> = {
  easy: 4 * 24 * 60 * 60 * 1000,       // 4 days
  medium: 2 * 24 * 60 * 60 * 1000,      // 2 days
  hard: 1 * 24 * 60 * 60 * 1000,        // 1 day
};

function getNextReview(difficulty: string): string {
  const interval = DIFFICULTY_INTERVALS[difficulty] ?? DIFFICULTY_INTERVALS.medium;
  return new Date(Date.now() + interval).toISOString();
}

export async function saveFlashcards(cards: Flashcard[]): Promise<void> {
  const db = getDb();
  db.withTransactionSync(() => {
    for (const card of cards) {
      db.runSync(
        `INSERT OR REPLACE INTO flashcards
         (id, document_id, question, answer, difficulty, times_reviewed, last_reviewed, next_review)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          card.id,
          card.document_id,
          card.question,
          card.answer,
          card.difficulty,
          card.times_reviewed,
          card.last_reviewed ?? null,
          card.next_review,
        ],
      );
    }
  });
}

export async function getFlashcards(documentId: string): Promise<Flashcard[]> {
  const db = getDb();
  const rows = db.getAllSync<any>(
    `SELECT * FROM flashcards WHERE document_id = ? ORDER BY id`,
    [documentId],
  );
  return rows.map(rowToFlashcard);
}

export async function markReviewed(
  cardId: string,
  correct: boolean,
): Promise<void> {
  const db = getDb();
  const row = db.getFirstSync<any>(
    `SELECT difficulty, times_reviewed FROM flashcards WHERE id = ?`,
    [cardId],
  );
  if (!row) return;

  let newDifficulty: Flashcard['difficulty'] = row.difficulty;
  if (correct) {
    if (newDifficulty === 'hard') newDifficulty = 'medium';
    else if (newDifficulty === 'medium') newDifficulty = 'easy';
  } else {
    if (newDifficulty === 'easy') newDifficulty = 'medium';
    else if (newDifficulty === 'medium') newDifficulty = 'hard';
  }

  const now = new Date().toISOString();
  db.runSync(
    `UPDATE flashcards
     SET difficulty = ?, times_reviewed = times_reviewed + 1, last_reviewed = ?, next_review = ?
     WHERE id = ?`,
    [newDifficulty, now, getNextReview(newDifficulty), cardId],
  );
}

export async function getDueCards(documentId: string): Promise<Flashcard[]> {
  const db = getDb();
  const now = new Date().toISOString();
  const rows = db.getAllSync<any>(
    `SELECT * FROM flashcards WHERE document_id = ? AND next_review <= ? ORDER BY next_review`,
    [documentId, now],
  );
  return rows.map(rowToFlashcard);
}

function rowToFlashcard(row: any): Flashcard {
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
