import type { SummaryMode, Flashcard, QuizQuestion } from './types';

class LocalLLMService {
  private modelPath: string | null = null;
  private loadingProgress: number = 0;

  async initializeModel(modelPath: string): Promise<void> {
    throw new Error('Local AI models are currently unavailable. This feature will be re-enabled in a future update.');
  }

  async generateResponse(
    question: string,
    context: string,
    onToken: (token: string) => void,
  ): Promise<string> {
    throw new Error('Local AI models are currently unavailable. This feature will be re-enabled in a future update.');
  }

  async summarize(text: string, mode: SummaryMode): Promise<string> {
    throw new Error('Local AI models are currently unavailable. This feature will be re-enabled in a future update.');
  }

  async generateKeyPoints(text: string): Promise<string[]> {
    throw new Error('Local AI models are currently unavailable. This feature will be re-enabled in a future update.');
  }

  async generateFlashcards(text: string, count: number): Promise<Flashcard[]> {
    throw new Error('Local AI models are currently unavailable. This feature will be re-enabled in a future update.');
  }

  async generateQuizQuestions(
    text: string,
    count: number,
    type: 'multiple_choice' | 'true_false' | 'short_answer',
  ): Promise<QuizQuestion[]> {
    throw new Error('Local AI models are currently unavailable. This feature will be re-enabled in a future update.');
  }

  isModelLoaded(): boolean {
    return false;
  }

  unloadModel(): void {
    this.modelPath = null;
    this.loadingProgress = 0;
  }

  getModelPath(): string | null {
    return this.modelPath;
  }

  getLoadingProgress(): number {
    return this.loadingProgress;
  }
}

export const localLLMService = new LocalLLMService();
export default LocalLLMService;
