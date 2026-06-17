import * as SQLite from 'expo-sqlite';

const DB_NAME = 'studymate.db';

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
  }
  return db;
}

export async function initialize(): Promise<void> {
  const database = getDb();

  database.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_opened TEXT,
      page_count INTEGER NOT NULL DEFAULT 0,
      has_real_text INTEGER NOT NULL DEFAULT 0,
      summary_short TEXT,
      summary_detailed TEXT
    );

    CREATE TABLE IF NOT EXISTS extracted_text (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      content TEXT NOT NULL,
      ocr_confidence REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      times_reviewed INTEGER NOT NULL DEFAULT 0,
      last_reviewed TEXT,
      next_review TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      question TEXT NOT NULL,
      type TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      options TEXT NOT NULL,
      explanation TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      content TEXT NOT NULL,
      page_number INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      document_id TEXT PRIMARY KEY,
      current_page INTEGER NOT NULL DEFAULT 0,
      current_sentence INTEGER NOT NULL DEFAULT 0,
      percentage REAL NOT NULL DEFAULT 0,
      last_read TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      cards_reviewed INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_extracted_text_doc ON extracted_text(document_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_doc ON chat_messages(document_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_doc ON flashcards(document_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review);
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_doc ON quiz_questions(document_id);
    CREATE INDEX IF NOT EXISTS idx_notes_doc ON notes(document_id);
    CREATE INDEX IF NOT EXISTS idx_study_sessions_doc ON study_sessions(document_id);
  `);
}

export async function resetDatabase(): Promise<void> {
  const database = getDb();

  database.execSync(`
    DROP TABLE IF EXISTS study_sessions;
    DROP TABLE IF EXISTS reading_progress;
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS quiz_questions;
    DROP TABLE IF EXISTS flashcards;
    DROP TABLE IF EXISTS chat_messages;
    DROP TABLE IF EXISTS extracted_text;
    DROP TABLE IF EXISTS documents;
  `);

  await initialize();
}

export { getDb };

const DatabaseService = {
  initialize,
  resetDatabase,
  getDb,
};

export default DatabaseService;
