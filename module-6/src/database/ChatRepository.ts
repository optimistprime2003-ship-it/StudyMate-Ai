import { getDB } from './DatabaseService';
import { ChatMessage } from '../components/ModuleConnector';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveMessage(msg: ChatMessage): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO chat_messages (id, document_id, role, content, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [
      msg.id ?? generateId(),
      msg.document_id,
      msg.role,
      msg.content,
      msg.timestamp ?? new Date().toISOString(),
    ]
  );
}

export async function getMessages(documentId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM chat_messages WHERE document_id = ? ORDER BY timestamp ASC',
    [documentId]
  );
  return rows.map((row) => ({
    id: row.id,
    document_id: row.document_id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    timestamp: row.timestamp,
  }));
}

export async function clearHistory(documentId: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'DELETE FROM chat_messages WHERE document_id = ?',
    [documentId]
  );
}
