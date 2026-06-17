import { localLLMService } from './LocalLLMService';
import { documentIndexer } from '../rag/DocumentIndexer';
import type { ChatMessage } from './types';

class ChatService {
  private history: ChatMessage[] = [];
  private activeDocumentId: string | null = null;
  private activeDocumentTitle: string = '';

  setActiveDocument(documentId: string | null, title: string = ''): void {
    this.activeDocumentId = documentId;
    this.activeDocumentTitle = title;
  }

  getActiveDocument(): { id: string | null; title: string } {
    return { id: this.activeDocumentId, title: this.activeDocumentTitle };
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  addUserMessage(content: string): ChatMessage {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    this.history.push(message);
    return message;
  }

  async getAIResponse(
    userMessage: string,
    onToken: (token: string) => void,
  ): Promise<ChatMessage> {
    let context = '';

    if (this.activeDocumentId) {
      const chunks = await documentIndexer.retrieveRelevantChunks(
        userMessage,
        this.activeDocumentId,
        3,
      );

      if (chunks.length > 0) {
        context = documentIndexer.buildPromptWithContext(
          userMessage,
          chunks,
          this.activeDocumentTitle,
        );
      }
    }

    const responseText = await localLLMService.generateResponse(
      userMessage,
      context,
      onToken,
    );

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
    };
    this.history.push(assistantMessage);
    return assistantMessage;
  }

  clearHistory(): void {
    this.history = [];
  }
}

export const chatService = new ChatService();
export default ChatService;
