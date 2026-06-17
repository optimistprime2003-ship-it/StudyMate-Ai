import { getDb } from './DatabaseService';
import type { SearchResult } from '../components/ModuleConnector';

export async function search(query: string): Promise<SearchResult[]> {
  const db = getDb();
  const like = `%${query}%`;
  const results: SearchResult[] = [];

  // Search document titles
  const titleRows = db.getAllSync<any>(
    `SELECT id, title FROM documents WHERE title LIKE ?`,
    [like],
  );
  for (const row of titleRows) {
    results.push({
      documentId: row.id,
      documentTitle: row.title,
      pageNumber: null,
      matchType: 'title',
      snippet: row.title,
      relevanceScore: 1.0,
    });
  }

  // Search extracted text
  const textRows = db.getAllSync<any>(
    `SELECT et.document_id, et.page_number, et.content, d.title
     FROM extracted_text et
     JOIN documents d ON d.id = et.document_id
     WHERE et.content LIKE ?`,
    [like],
  );
  for (const row of textRows) {
    results.push({
      documentId: row.document_id,
      documentTitle: row.title,
      pageNumber: row.page_number,
      matchType: 'text',
      snippet: snippet(row.content, query),
      relevanceScore: 0.8,
    });
  }

  // Search notes
  const noteRows = db.getAllSync<any>(
    `SELECT n.document_id, n.page_number, n.content, d.title
     FROM notes n
     JOIN documents d ON d.id = n.document_id
     WHERE n.content LIKE ?`,
    [like],
  );
  for (const row of noteRows) {
    results.push({
      documentId: row.document_id,
      documentTitle: row.title,
      pageNumber: row.page_number,
      matchType: 'note',
      snippet: snippet(row.content, query),
      relevanceScore: 0.7,
    });
  }

  // Search summaries
  const summaryRows = db.getAllSync<any>(
    `SELECT id, title, summary_short, summary_detailed FROM documents
     WHERE summary_short LIKE ? OR summary_detailed LIKE ?`,
    [like, like],
  );
  for (const row of summaryRows) {
    const text = row.summary_short || row.summary_detailed || '';
    results.push({
      documentId: row.id,
      documentTitle: row.title,
      pageNumber: null,
      matchType: 'summary',
      snippet: snippet(text, query),
      relevanceScore: 0.6,
    });
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return results;
}

function snippet(text: string, query: string, radius = 40): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 80);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  let s = text.slice(start, end);
  if (start > 0) s = '...' + s;
  if (end < text.length) s = s + '...';
  return s;
}
