import { getDB } from './DatabaseService';
import { Document, ReadingProgress } from '../components/ModuleConnector';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveDocument(doc: Document): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO documents
      (id, title, type, path, size, created_at, last_opened, page_count, has_real_text, summary_short, summary_detailed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      doc.id,
      doc.title,
      doc.type,
      doc.path,
      doc.size ?? 0,
      doc.created_at ?? new Date().toISOString(),
      doc.last_opened ?? null,
      doc.page_count ?? 0,
      doc.has_real_text ? 1 : 0,
      doc.summary_short ?? null,
      doc.summary_detailed ?? null,
    ]
  );
}

export async function getDocument(id: string): Promise<Document | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM documents WHERE id = ?',
    [id]
  );
  if (!row) return null;
  return mapRowToDocument(row);
}

export async function getAllDocuments(): Promise<Document[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM documents ORDER BY last_opened DESC, created_at DESC'
  );
  return rows.map(mapRowToDocument);
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM documents WHERE id = ?', [id]);
}

export async function updateLastOpened(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'UPDATE documents SET last_opened = ? WHERE id = ?',
    [new Date().toISOString(), id]
  );
}

export async function saveReadingProgress(
  documentId: string,
  page: number,
  sentence: number,
  percentage: number
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO reading_progress
      (document_id, current_page, current_sentence, percentage, last_read)
     VALUES (?, ?, ?, ?, ?)`,
    [documentId, page, sentence, percentage, new Date().toISOString()]
  );
}

export async function getReadingProgress(
  documentId: string
): Promise<ReadingProgress | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM reading_progress WHERE document_id = ?',
    [documentId]
  );
  if (!row) return null;
  return {
    document_id: row.document_id,
    current_page: row.current_page,
    current_sentence: row.current_sentence,
    percentage: row.percentage,
    last_read: row.last_read,
  };
}

export async function saveExtractedText(
  documentId: string,
  pages: string[]
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'DELETE FROM extracted_text WHERE document_id = ?',
    [documentId]
  );
  for (let i = 0; i < pages.length; i++) {
    await db.runAsync(
      `INSERT INTO extracted_text (id, document_id, page_number, content, ocr_confidence)
       VALUES (?, ?, ?, ?, ?)`,
      [generateId(), documentId, i + 1, pages[i], 1.0]
    );
  }
}

export async function getExtractedText(documentId: string): Promise<string[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    'SELECT content FROM extracted_text WHERE document_id = ? ORDER BY page_number ASC',
    [documentId]
  );
  return rows.map((r) => r.content as string);
}

function mapRowToDocument(row: any): Document {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    path: row.path,
    size: row.size,
    created_at: row.created_at,
    last_opened: row.last_opened,
    page_count: row.page_count,
    has_real_text: row.has_real_text === 1,
    summary_short: row.summary_short,
    summary_detailed: row.summary_detailed,
  };
}
