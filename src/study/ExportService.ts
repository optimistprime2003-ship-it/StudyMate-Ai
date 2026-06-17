import { Paths, Directory, EncodingType } from 'expo-file-system';
import { getDb } from '../database/DatabaseService';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
}

function getExportDir(): Directory {
  return new Directory(Paths.document, 'exports');
}

function ensureExportDir(): Directory {
  const dir = getExportDir();
  try {
    dir.list();
  } catch {
    Paths.document.createDirectory('exports');
  }
  return dir;
}

export async function exportFlashcards(documentId: string): Promise<string> {
  const db = getDb();

  const doc = db.getFirstSync<{ title: string }>(
    `SELECT title FROM documents WHERE id = ?`,
    [documentId],
  );
  const docTitle = doc?.title ?? 'document';

  const cards = db.getAllSync<any>(
    `SELECT question, answer, difficulty FROM flashcards WHERE document_id = ? ORDER BY id`,
    [documentId],
  );

  let content = `Flashcards — ${docTitle}\n`;
  content += `Exported: ${new Date().toISOString()}\n`;
  content += '─'.repeat(40) + '\n\n';

  cards.forEach((card: any, i: number) => {
    content += `Card ${i + 1} [${card.difficulty}]\n`;
    content += `Q: ${card.question}\n`;
    content += `A: ${card.answer}\n\n`;
  });

  const dir = ensureExportDir();
  const filename = `${sanitizeFilename(docTitle)}_flashcards.txt`;
  const file = dir.createFile(filename, 'text/plain');
  file.write(content, { encoding: EncodingType.UTF8 });
  return file.uri;
}

export async function exportNotes(documentId: string): Promise<string> {
  const db = getDb();

  const doc = db.getFirstSync<{ title: string }>(
    `SELECT title FROM documents WHERE id = ?`,
    [documentId],
  );
  const docTitle = doc?.title ?? 'document';

  const notes = db.getAllSync<any>(
    `SELECT content, page_number, created_at FROM notes WHERE document_id = ? ORDER BY created_at`,
    [documentId],
  );

  let content = `Notes — ${docTitle}\n`;
  content += `Exported: ${new Date().toISOString()}\n`;
  content += '─'.repeat(40) + '\n\n';

  notes.forEach((note: any, i: number) => {
    const page = note.page_number ? ` (p. ${note.page_number})` : '';
    content += `Note ${i + 1}${page}\n`;
    content += `${note.created_at}\n`;
    content += `${note.content}\n\n`;
  });

  const dir = ensureExportDir();
  const filename = `${sanitizeFilename(docTitle)}_notes.txt`;
  const file = dir.createFile(filename, 'text/plain');
  file.write(content, { encoding: EncodingType.UTF8 });
  return file.uri;
}

export async function exportSummary(documentId: string): Promise<string> {
  const db = getDb();

  const doc = db.getFirstSync<any>(
    `SELECT title, summary_short, summary_detailed FROM documents WHERE id = ?`,
    [documentId],
  );

  if (!doc) throw new Error('Document not found');

  let content = `Summary — ${doc.title}\n`;
  content += `Exported: ${new Date().toISOString()}\n`;
  content += '─'.repeat(40) + '\n\n';

  if (doc.summary_short) {
    content += `Brief Summary\n`;
    content += `${doc.summary_short}\n\n`;
  }

  if (doc.summary_detailed) {
    content += `Detailed Summary\n`;
    content += `${doc.summary_detailed}\n\n`;
  }

  if (!doc.summary_short && !doc.summary_detailed) {
    content += 'No summary available for this document.\n';
  }

  const dir = ensureExportDir();
  const filename = `${sanitizeFilename(doc.title)}_summary.txt`;
  const file = dir.createFile(filename, 'text/plain');
  file.write(content, { encoding: EncodingType.UTF8 });
  return file.uri;
}
