import * as FileSystem from 'expo-file-system';
import { getDB } from '../database/DatabaseService';

async function ensureDownloadsDir(): Promise<string> {
  const dir = `${FileSystem.documentDirectory}Downloads/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

export async function exportFlashcards(documentId: string): Promise<string> {
  const db = await getDB();

  const docRow = await db.getFirstAsync<any>(
    'SELECT title FROM documents WHERE id = ?',
    [documentId]
  );
  const title = docRow?.title ?? 'document';

  const cards = await db.getAllAsync<any>(
    'SELECT question, answer, difficulty FROM flashcards WHERE document_id = ? ORDER BY rowid ASC',
    [documentId]
  );

  const lines: string[] = [
    `StudyMate AI — Flashcards`,
    `Document: ${title}`,
    `Exported: ${new Date().toLocaleString()}`,
    `Total cards: ${cards.length}`,
    '',
    '='.repeat(60),
    '',
  ];

  cards.forEach((card, i) => {
    lines.push(`Card ${i + 1} [${card.difficulty}]`);
    lines.push(`Q: ${card.question}`);
    lines.push(`A: ${card.answer}`);
    lines.push('');
  });

  const dir = await ensureDownloadsDir();
  const safeName = title.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
  const path = `${dir}${safeName}_flashcards_${Date.now()}.txt`;
  await FileSystem.writeAsStringAsync(path, lines.join('\n'), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return path;
}

export async function exportNotes(documentId: string): Promise<string> {
  const db = await getDB();

  const docRow = await db.getFirstAsync<any>(
    'SELECT title FROM documents WHERE id = ?',
    [documentId]
  );
  const title = docRow?.title ?? 'document';

  const notes = await db.getAllAsync<any>(
    'SELECT content, page_number, created_at FROM notes WHERE document_id = ? ORDER BY page_number ASC, created_at ASC',
    [documentId]
  );

  const lines: string[] = [
    `StudyMate AI — Notes`,
    `Document: ${title}`,
    `Exported: ${new Date().toLocaleString()}`,
    `Total notes: ${notes.length}`,
    '',
    '='.repeat(60),
    '',
  ];

  notes.forEach((note, i) => {
    const pageLabel = note.page_number != null ? ` (Page ${note.page_number})` : '';
    lines.push(`Note ${i + 1}${pageLabel}`);
    lines.push(`Date: ${new Date(note.created_at).toLocaleString()}`);
    lines.push(note.content);
    lines.push('');
  });

  const dir = await ensureDownloadsDir();
  const safeName = title.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
  const path = `${dir}${safeName}_notes_${Date.now()}.txt`;
  await FileSystem.writeAsStringAsync(path, lines.join('\n'), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return path;
}

export async function exportSummary(documentId: string): Promise<string> {
  const db = await getDB();

  const docRow = await db.getFirstAsync<any>(
    'SELECT title, summary_short, summary_detailed FROM documents WHERE id = ?',
    [documentId]
  );

  const title = docRow?.title ?? 'document';

  const lines: string[] = [
    `StudyMate AI — Summary`,
    `Document: ${title}`,
    `Exported: ${new Date().toLocaleString()}`,
    '',
    '='.repeat(60),
    '',
  ];

  if (docRow?.summary_short) {
    lines.push('SHORT SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(docRow.summary_short);
    lines.push('');
  }

  if (docRow?.summary_detailed) {
    lines.push('DETAILED SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(docRow.summary_detailed);
    lines.push('');
  }

  if (!docRow?.summary_short && !docRow?.summary_detailed) {
    lines.push('No summary available for this document.');
  }

  const dir = await ensureDownloadsDir();
  const safeName = title.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
  const path = `${dir}${safeName}_summary_${Date.now()}.txt`;
  await FileSystem.writeAsStringAsync(path, lines.join('\n'), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return path;
}
