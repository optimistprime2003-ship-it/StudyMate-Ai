import { getDB } from './DatabaseService';

export interface SearchResult {
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  matchType: 'title' | 'extracted_text' | 'note' | 'summary';
  snippet: string;
  relevanceScore: number;
}

function buildSnippet(text: string, query: string, maxLength = 120): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLength);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  const snippet = text.slice(start, end);
  return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '');
}

export async function search(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const db = await getDB();
  const results: SearchResult[] = [];
  const q = query.trim();
  const like = `%${q}%`;

  const titleRows = await db.getAllAsync<any>(
    `SELECT id, title, summary_short, summary_detailed
     FROM documents
     WHERE title LIKE ? OR summary_short LIKE ? OR summary_detailed LIKE ?`,
    [like, like, like]
  );

  for (const row of titleRows) {
    const titleMatch = row.title?.toLowerCase().includes(q.toLowerCase());
    const summaryMatch =
      row.summary_short?.toLowerCase().includes(q.toLowerCase()) ||
      row.summary_detailed?.toLowerCase().includes(q.toLowerCase());

    if (titleMatch) {
      results.push({
        documentId: row.id,
        documentTitle: row.title,
        pageNumber: null,
        matchType: 'title',
        snippet: row.title,
        relevanceScore: 10,
      });
    }
    if (summaryMatch) {
      const src = row.summary_short?.toLowerCase().includes(q.toLowerCase())
        ? row.summary_short
        : row.summary_detailed;
      results.push({
        documentId: row.id,
        documentTitle: row.title,
        pageNumber: null,
        matchType: 'summary',
        snippet: buildSnippet(src, q),
        relevanceScore: 7,
      });
    }
  }

  const textRows = await db.getAllAsync<any>(
    `SELECT et.document_id, et.page_number, et.content, d.title
     FROM extracted_text et
     JOIN documents d ON d.id = et.document_id
     WHERE et.content LIKE ?
     LIMIT 50`,
    [like]
  );

  for (const row of textRows) {
    results.push({
      documentId: row.document_id,
      documentTitle: row.title,
      pageNumber: row.page_number,
      matchType: 'extracted_text',
      snippet: buildSnippet(row.content, q),
      relevanceScore: 5,
    });
  }

  const noteRows = await db.getAllAsync<any>(
    `SELECT n.document_id, n.page_number, n.content, d.title
     FROM notes n
     JOIN documents d ON d.id = n.document_id
     WHERE n.content LIKE ?
     LIMIT 30`,
    [like]
  );

  for (const row of noteRows) {
    results.push({
      documentId: row.document_id,
      documentTitle: row.title,
      pageNumber: row.page_number,
      matchType: 'note',
      snippet: buildSnippet(row.content, q),
      relevanceScore: 6,
    });
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return results;
}
