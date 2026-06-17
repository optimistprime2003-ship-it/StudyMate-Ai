import { localLLMService } from './LocalLLMService';
import { documentIndexer } from '../rag/DocumentIndexer';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatSession {
  documentId: string;
  documentTitle: string;
  messages: ChatMessage[];
}

class ChatService {
  private sessions: Map<string, ChatSession> = new Map();
  private activeSessionId: string | null = null;

  createSession(documentId: string, documentTitle: string): string {
    const sessionId = `session_${Date.now()}`;
    this.sessions.set(sessionId, {
      documentId,
      documentTitle,
      messages: [],
    });
    this.activeSessionId = sessionId;
    return sessionId;
  }

  getSession(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getActiveSession(): ChatSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) ?? null;
  }

  addUserMessage(sessionId: string, content: string): ChatMessage {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    session.messages.push(message);
    return message;
  }

  async getAIResponse(
    sessionId: string,
    question: string,
    onToken: (token: string, messageId: string) => void
  ): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (!localLLMService.isModelLoaded()) {
      throw new Error('AI model is not loaded. Please load a model first.');
    }

    const chunks = await documentIndexer.retrieveRelevantChunks(
      question,
      session.documentId,
      3
    );

    const contextText =
      chunks.length > 0
        ? chunks.join('\n\n')
        : 'No specific document content available.';

    const prompt = documentIndexer.buildPromptWithContext(
      question,
      chunks,
      session.documentTitle
    );

    const aiMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    session.messages.push(aiMessage);

    const fullResponse = await localLLMService.generateResponse(
      question,
      contextText,
      (token) => {
        aiMessage.content += token;
        onToken(token, aiMessage.id);
      }
    );

    aiMessage.content = fullResponse;
    aiMessage.isStreaming = false;

    return aiMessage;
  }

  clearHistory(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
  }
}

export const chatService = new ChatService();
export default chatService;
