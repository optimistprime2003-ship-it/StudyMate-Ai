import { getDb } from './DatabaseService';
import type { ChatMessage, ChatMessageRow } from '../components/ModuleConnector';

export async function saveMessage(msg: ChatMessageRow): Promise<void> {
  const db = getDb();
  db.runSync(
    `INSERT INTO chat_messages (id, document_id, role, content, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [msg.id, msg.document_id, msg.role, msg.content, msg.timestamp],
  );
}

export async function saveBasicMessage(msg: ChatMessage, documentId: string): Promise<void> {
  const row: ChatMessageRow = {
    id: msg.id,
    document_id: documentId,
    role: msg.role === 'ai' ? 'assistant' : msg.role,
    content: msg.content,
    timestamp: typeof msg.timestamp === 'number'
      ? new Date(msg.timestamp).toISOString()
      : String(msg.timestamp),
  };
  await saveMessage(row);
}

export async function getMessages(documentId: string): Promise<ChatMessageRow[]> {
  const db = getDb();
  const rows = db.getAllSync<any>(
    `SELECT * FROM chat_messages WHERE document_id = ? ORDER BY timestamp`,
    [documentId],
  );
  return rows.map((row: any) => ({
    id: row.id,
    document_id: row.document_id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp,
  }));
}

export async function getBasicMessages(documentId: string): Promise<ChatMessage[]> {
  const rows = await getMessages(documentId);
  return rows.map((row) => ({
    id: row.id,
    role: row.role === 'assistant' ? 'ai' as const : row.role as 'user',
    content: row.content,
    timestamp: new Date(row.timestamp).getTime(),
  }));
}

export async function clearHistory(documentId: string): Promise<void> {
  const db = getDb();
  db.runSync(`DELETE FROM chat_messages WHERE document_id = ?`, [documentId]);
}
