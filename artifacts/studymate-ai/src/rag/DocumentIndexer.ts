import AsyncStorage from '@react-native-async-storage/async-storage';

interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  keywords: string[];
}

const STORAGE_KEY_PREFIX = 'doc_index_';

class DocumentIndexer {
  private chunkCache: Map<string, DocumentChunk[]> = new Map();

  async indexDocument(documentId: string, text: string): Promise<void> {
    const chunks = this._splitIntoChunks(text, 500);

    const documentChunks: DocumentChunk[] = chunks.map((chunkText, i) => ({
      id: `${documentId}_chunk_${i}`,
      documentId,
      chunkIndex: i,
      text: chunkText,
      keywords: this._extractKeywords(chunkText),
    }));

    this.chunkCache.set(documentId, documentChunks);

    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${documentId}`,
      JSON.stringify(documentChunks)
    );
  }

  async retrieveRelevantChunks(
    query: string,
    documentId: string,
    topK: number = 3
  ): Promise<string[]> {
    let chunks = this.chunkCache.get(documentId);

    if (!chunks) {
      const stored = await AsyncStorage.getItem(
        `${STORAGE_KEY_PREFIX}${documentId}`
      );
      if (!stored) return [];
      chunks = JSON.parse(stored) as DocumentChunk[];
      this.chunkCache.set(documentId, chunks);
    }

    const queryKeywords = this._extractKeywords(query);

    const scored = chunks.map((chunk) => ({
      chunk,
      score: this._scoreChunk(chunk, queryKeywords),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored
      .slice(0, topK)
      .filter((s) => s.score > 0)
      .map((s) => s.chunk.text);
  }

  buildPromptWithContext(
    question: string,
    chunks: string[],
    title: string
  ): string {
    const context = chunks.join('\n\n---\n\n');
    return `You are a helpful study tutor. Document: ${title}.\n\nRelevant Content:\n${context}\n\nQuestion: ${question}\nAnswer:`;
  }

  async removeDocument(documentId: string): Promise<void> {
    this.chunkCache.delete(documentId);
    await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${documentId}`);
  }

  private _splitIntoChunks(text: string, wordsPerChunk: number): string[] {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const overlap = i > 0 ? 50 : 0;
      const start = Math.max(0, i - overlap);
      chunks.push(words.slice(start, i + wordsPerChunk).join(' '));
    }

    return chunks;
  }

  private _extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'that', 'this', 'these', 'those', 'it', 'its',
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 30);
  }

  private _scoreChunk(chunk: DocumentChunk, queryKeywords: string[]): number {
    if (queryKeywords.length === 0) return 0;

    let score = 0;
    for (const keyword of queryKeywords) {
      if (chunk.keywords.includes(keyword)) {
        score += 2;
      } else if (chunk.text.toLowerCase().includes(keyword)) {
        score += 1;
      }
    }

    return score;
  }
}

export const documentIndexer = new DocumentIndexer();
export default documentIndexer;
