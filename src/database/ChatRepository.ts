import { getDb } from './DatabaseService';
import type { ChatMessage } from '../components/ModuleConnector';

export async function saveMessage(msg: ChatMessage): Promise<void> {
  const db = getDb();
  db.runSync(
    `INSERT INTO chat_messages (id, document_id, role, content, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [msg.id, msg.document_id, msg.role, msg.content, msg.timestamp],
  );
}

export async function getMessages(documentId: string): Promise<ChatMessage[]> {
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

export async function clearHistory(documentId: string): Promise<void> {
  const db = getDb();
  db.runSync(`DELETE FROM chat_messages WHERE document_id = ?`, [documentId]);
}
