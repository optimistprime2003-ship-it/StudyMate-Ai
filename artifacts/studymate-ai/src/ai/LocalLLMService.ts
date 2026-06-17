import { Platform } from 'react-native';
import type { LlamaContext } from 'llama.rn';

export type SummaryMode = 'short' | 'medium' | 'detailed' | 'exam' | 'bullets';

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

type ProgressCallback = (progress: number) => void;

class LocalLLMService {
  private context: LlamaContext | null = null;
  private modelLoaded = false;

  async initializeModel(
    modelPath: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('Local AI models are not supported on web. Use the Android app.');
    }

    try {
      const { initLlama } = await import('llama.rn');

      if (this.context) {
        await this.context.release();
        this.context = null;
        this.modelLoaded = false;
      }

      onProgress?.(0.05);

      this.context = await initLlama({
        model: modelPath,
        use_mlock: false,
        n_ctx: 2048,
        n_threads: 4,
        n_batch: 512,
      });

      onProgress?.(1.0);
      this.modelLoaded = true;
    } catch (error) {
      this.modelLoaded = false;
      throw new Error(`Failed to load model: ${error}`);
    }
  }

  async generateResponse(
    question: string,
    context: string,
    onToken: (token: string) => void
  ): Promise<string> {
    if (Platform.OS === 'web') {
      throw new Error('Local AI is not available on web.');
    }
    if (!this.context) throw new Error('Model not loaded');

    const prompt = `<|user|>\nContext: ${context}\n\nQuestion: ${question}<|end|>\n<|assistant|>`;

    let fullResponse = '';
    await this.context.completion(
      {
        prompt,
        n_predict: 512,
        temperature: 0.7,
        top_p: 0.9,
        stop: ['<|end|>', '<|user|>', '</s>'],
      },
      (data) => {
        const token = data.token;
        fullResponse += token;
        onToken(token);
      }
    );

    return fullResponse.trim();
  }

  async summarize(text: string, mode: SummaryMode): Promise<string> {
    if (Platform.OS === 'web') {
      throw new Error('Local AI is not available on web.');
    }
    if (!this.context) throw new Error('Model not loaded');

    const templates: Record<SummaryMode, string> = {
      short: `Summarize the following text in 2-3 sentences:\n\n${text}\n\nSummary:`,
      medium: `Write a clear and concise summary of the following text in one paragraph:\n\n${text}\n\nSummary:`,
      detailed: `Write a comprehensive, detailed summary of the following text covering all main points:\n\n${text}\n\nDetailed Summary:`,
      exam: `Create exam preparation notes from the following text. Include key concepts, definitions, and important points:\n\n${text}\n\nExam Notes:`,
      bullets: `Convert the following text into clear bullet points highlighting the most important information:\n\n${text}\n\nBullet Points:`,
    };

    const prompt = templates[mode];
    let result = '';

    await this.context.completion(
      {
        prompt,
        n_predict: 600,
        temperature: 0.5,
        top_p: 0.9,
        stop: ['</s>', '<|end|>'],
      },
      (data) => {
        result += data.token;
      }
    );

    return result.trim();
  }

  async generateKeyPoints(text: string): Promise<string[]> {
    if (Platform.OS === 'web') {
      throw new Error('Local AI is not available on web.');
    }
    if (!this.context) throw new Error('Model not loaded');

    const prompt = `Extract 5-10 key points from the following text. Format each point on a new line starting with "- ":\n\n${text}\n\nKey Points:`;

    let result = '';
    await this.context.completion(
      {
        prompt,
        n_predict: 400,
        temperature: 0.4,
        stop: ['</s>', '<|end|>'],
      },
      (data) => {
        result += data.token;
      }
    );

    return result
      .trim()
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 10);
  }

  async generateFlashcards(text: string, count: number): Promise<Flashcard[]> {
    if (Platform.OS === 'web') {
      throw new Error('Local AI is not available on web.');
    }
    if (!this.context) throw new Error('Model not loaded');

    const prompt = `Create ${count} flashcard question-answer pairs from the following text. Format as JSON array: [{"question": "...", "answer": "..."}]\n\nText:\n${text}\n\nFlashcards (JSON only):`;

    let result = '';
    await this.context.completion(
      {
        prompt,
        n_predict: 800,
        temperature: 0.6,
        stop: ['</s>', '<|end|>'],
      },
      (data) => {
        result += data.token;
      }
    );

    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return this._fallbackFlashcards(text, count);

      const parsed: Array<{ question: string; answer: string }> = JSON.parse(
        jsonMatch[0]
      );
      return parsed.slice(0, count).map((item, i) => ({
        id: `fc_${Date.now()}_${i}`,
        question: item.question,
        answer: item.answer,
      }));
    } catch {
      return this._fallbackFlashcards(text, count);
    }
  }

  async generateQuizQuestions(
    text: string,
    count: number,
    type: 'multiple_choice' | 'true_false' | 'short_answer'
  ): Promise<QuizQuestion[]> {
    if (Platform.OS === 'web') {
      throw new Error('Local AI is not available on web.');
    }
    if (!this.context) throw new Error('Model not loaded');

    const typeInstructions: Record<string, string> = {
      multiple_choice: `Create ${count} multiple choice questions. Each must have 4 options labeled A-D and specify the correct answer. Format as JSON: [{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","explanation":"..."}]`,
      true_false: `Create ${count} true/false questions. Format as JSON: [{"question":"...","correctAnswer":"True","explanation":"..."}]`,
      short_answer: `Create ${count} short answer questions. Format as JSON: [{"question":"...","correctAnswer":"...","explanation":"..."}]`,
    };

    const prompt = `${typeInstructions[type]}\n\nText:\n${text}\n\nQuestions (JSON only):`;

    let result = '';
    await this.context.completion(
      {
        prompt,
        n_predict: 1000,
        temperature: 0.6,
        stop: ['</s>', '<|end|>'],
      },
      (data) => {
        result += data.token;
      }
    );

    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.slice(0, count).map(
        (
          item: {
            question: string;
            options?: string[];
            correctAnswer: string;
            explanation: string;
          },
          i: number
        ) => ({
          id: `q_${Date.now()}_${i}`,
          question: item.question,
          type,
          options: item.options,
          correctAnswer: item.correctAnswer,
          explanation: item.explanation ?? '',
        })
      );
    } catch {
      return [];
    }
  }

  isModelLoaded(): boolean {
    return this.modelLoaded;
  }

  async unloadModel(): Promise<void> {
    if (this.context) {
      await this.context.release();
      this.context = null;
    }
    this.modelLoaded = false;
  }

  private _fallbackFlashcards(text: string, count: number): Flashcard[] {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    return sentences.slice(0, count).map((sentence, i) => ({
      id: `fc_${Date.now()}_${i}`,
      question: `What does this statement refer to: "${sentence.trim().substring(0, 80)}..."?`,
      answer: sentence.trim(),
    }));
  }
}

export const localLLMService = new LocalLLMService();
export default localLLMService;
