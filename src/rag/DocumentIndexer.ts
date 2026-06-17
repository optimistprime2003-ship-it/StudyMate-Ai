import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = 'doc_index_';
const CHUNK_WORDS = 500;

interface DocumentChunk {
  documentId: string;
  chunkIndex: number;
  text: string;
  keywords: string[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function extractKeywords(text: string): string[] {
  const words = tokenize(text);
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been',
    'from', 'this', 'that', 'with', 'will', 'they', 'what', 'when',
    'make', 'like', 'just', 'over', 'such', 'take', 'than', 'them',
    'very', 'also', 'some', 'into', 'could', 'other', 'after', 'then',
    'there', 'these', 'would', 'about', 'which', 'their', 'being',
  ]);
  return Object.entries(freq)
    .filter(([w]) => !stopWords.has(w))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([w]) => w);
}

function splitIntoChunks(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

function scoreChunk(query: string, chunk: DocumentChunk): number {
  const queryTokens = new Set(tokenize(query));
  let score = 0;

  for (const keyword of chunk.keywords) {
    if (queryTokens.has(keyword)) {
      score += 1;
    }
  }

  const chunkTokens = new Set(tokenize(chunk.text));
  for (const qt of queryTokens) {
    if (chunkTokens.has(qt)) {
      score += 0.5;
    }
  }

  return score;
}

class DocumentIndexer {
  async indexDocument(documentId: string, text: string): Promise<void> {
    const chunks = splitIntoChunks(text, CHUNK_WORDS);
    const indexedChunks: DocumentChunk[] = chunks.map((chunkText, index) => ({
      documentId,
      chunkIndex: index,
      text: chunkText,
      keywords: extractKeywords(chunkText),
    }));

    const key = `${STORAGE_KEY_PREFIX}${documentId}`;
    await AsyncStorage.setItem(key, JSON.stringify(indexedChunks));
  }

  async retrieveRelevantChunks(
    query: string,
    documentId: string,
    topK: number = 3,
  ): Promise<string[]> {
    const key = `${STORAGE_KEY_PREFIX}${documentId}`;
    const stored = await AsyncStorage.getItem(key);

    if (!stored) {
      return [];
    }

    const chunks: DocumentChunk[] = JSON.parse(stored);
    const scored = chunks
      .map((chunk) => ({ chunk, score: scoreChunk(query, chunk) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map((s) => s.chunk.text);
  }

  buildPromptWithContext(
    question: string,
    chunks: string[],
    title: string,
  ): string {
    const contentSection = chunks.length > 0
      ? `Content from "${title}":\n${chunks.join('\n\n')}`
      : 'No relevant document content found.';

    return `You are a study tutor helping a student understand course material. Use the provided content to answer accurately. If the content doesn't contain the answer, say so honestly.

${contentSection}

Question: ${question}

Answer based on the content above:`;
  }

  async removeDocumentIndex(documentId: string): Promise<void> {
    const key = `${STORAGE_KEY_PREFIX}${documentId}`;
    await AsyncStorage.removeItem(key);
  }
}

export const documentIndexer = new DocumentIndexer();
export default DocumentIndexer;
