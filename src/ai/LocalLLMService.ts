import { initLlama, type LlamaContext } from 'llama.rn';
import type { SummaryMode, Flashcard, QuizQuestion } from './types';

const STOP_WORDS = [
  '</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>',
  '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>', '</answer>',
];

class LocalLLMService {
  private context: LlamaContext | null = null;
  private modelPath: string | null = null;
  private loadingProgress: number = 0;

  async initializeModel(modelPath: string): Promise<void> {
    if (this.context) {
      this.unloadModel();
    }

    this.loadingProgress = 0;

    this.context = await initLlama({
      model: modelPath,
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 0,
    });

    this.modelPath = modelPath;
    this.loadingProgress = 100;
  }

  async generateResponse(
    question: string,
    context: string,
    onToken: (token: string) => void,
  ): Promise<string> {
    if (!this.context) {
      throw new Error('Model not loaded. Call initializeModel() first.');
    }

    const prompt = context
      ? `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer based on the context above. Be concise and accurate.`
      : `Question: ${question}\n\nAnswer:`;

    const result = await this.context.completion(
      {
        prompt,
        n_predict: 512,
        stop: STOP_WORDS,
        temperature: 0.7,
        top_k: 40,
        top_p: 0.9,
        penalty_repeat: 1.1,
      },
      (data) => {
        if (data.token) {
          onToken(data.token);
        }
      },
    );

    return result.text.trim();
  }

  async summarize(text: string, mode: SummaryMode): Promise<string> {
    if (!this.context) {
      throw new Error('Model not loaded.');
    }

    const modePrompts: Record<SummaryMode, string> = {
      short: 'Summarize the following text in 2-3 sentences. Focus on the main idea.',
      medium: 'Summarize the following text in 1-2 paragraphs. Cover key points and supporting details.',
      detailed: 'Provide a detailed summary of the following text. Include all important concepts, definitions, and relationships.',
      exam: 'Create exam preparation notes from the following text. Include definitions, key concepts, and likely exam topics.',
      bullets: 'Summarize the following text as bullet points. List each key point on a new line starting with a dash.',
    };

    const instruction = modePrompts[mode];
    const prompt = `${instruction}\n\nText:\n${text}\n\nSummary:`;

    const result = await this.context.completion({
      prompt,
      n_predict: 1024,
      stop: STOP_WORDS,
      temperature: 0.5,
      top_k: 40,
      top_p: 0.9,
    });

    return result.text.trim();
  }

  async generateKeyPoints(text: string): Promise<string[]> {
    if (!this.context) {
      throw new Error('Model not loaded.');
    }

    const prompt = `Extract 5-10 key points from the following text. List each point on a new line starting with a number.\n\nText:\n${text}\n\nKey points:`;

    const result = await this.context.completion({
      prompt,
      n_predict: 1024,
      stop: STOP_WORDS,
      temperature: 0.3,
    });

    const lines = result.text
      .trim()
      .split('\n')
      .map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((l) => l.length > 0);

    return lines.slice(0, 10);
  }

  async generateFlashcards(text: string, count: number): Promise<Flashcard[]> {
    if (!this.context) {
      throw new Error('Model not loaded.');
    }

    const prompt = `Create ${count} flashcards from the following text. Format each flashcard as "Q: [question] A: [answer]" on separate lines.\n\nText:\n${text}\n\nFlashcards:`;

    const result = await this.context.completion({
      prompt,
      n_predict: 1024,
      stop: STOP_WORDS,
      temperature: 0.4,
    });

    const flashcards: Flashcard[] = [];
    const pairs = result.text.split(/(?=Q:)/);

    for (const pair of pairs) {
      const qMatch = pair.match(/Q:\s*(.+)/);
      const aMatch = pair.match(/A:\s*(.+)/);
      if (qMatch && aMatch) {
        flashcards.push({
          id: `fc-${Date.now()}-${flashcards.length}`,
          question: qMatch[1].trim(),
          answer: aMatch[1].trim(),
          documentId: '',
        });
      }
    }

    return flashcards.slice(0, count);
  }

  async generateQuizQuestions(
    text: string,
    count: number,
    type: 'multiple_choice' | 'true_false' | 'short_answer',
  ): Promise<QuizQuestion[]> {
    if (!this.context) {
      throw new Error('Model not loaded.');
    }

    const typeInstructions: Record<string, string> = {
      multiple_choice: `Create ${count} multiple choice questions. Format each as:\nQuestion: [question]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nCorrect: [A/B/C/D]\nExplanation: [explanation]`,
      true_false: `Create ${count} true/false questions. Format each as:\nQuestion: [statement]\nCorrect: [True/False]\nExplanation: [explanation]`,
      short_answer: `Create ${count} short answer questions. Format each as:\nQuestion: [question]\nAnswer: [answer]\nExplanation: [explanation]`,
    };

    const prompt = `${typeInstructions[type]}\n\nText:\n${text}\n\nQuestions:`;

    const result = await this.context.completion({
      prompt,
      n_predict: 2048,
      stop: STOP_WORDS,
      temperature: 0.4,
    });

    const questions: QuizQuestion[] = [];
    const blocks = result.text.split(/(?=Question:)/);

    for (const block of blocks) {
      const qMatch = block.match(/Question:\s*(.+)/);
      if (!qMatch) continue;

      const question: QuizQuestion = {
        id: `q-${Date.now()}-${questions.length}`,
        question: qMatch[1].trim(),
        type,
        correctAnswer: '',
        explanation: '',
      };

      if (type === 'multiple_choice') {
        const opts: string[] = [];
        const optA = block.match(/A\)\s*(.+)/);
        const optB = block.match(/B\)\s*(.+)/);
        const optC = block.match(/C\)\s*(.+)/);
        const optD = block.match(/D\)\s*(.+)/);
        if (optA) opts.push(optA[1].trim());
        if (optB) opts.push(optB[1].trim());
        if (optC) opts.push(optC[1].trim());
        if (optD) opts.push(optD[1].trim());
        question.options = opts;

        const correctMatch = block.match(/Correct:\s*([A-D])/);
        question.correctAnswer = correctMatch ? correctMatch[1] : '';
      } else if (type === 'true_false') {
        question.options = ['True', 'False'];
        const correctMatch = block.match(/Correct:\s*(True|False)/i);
        question.correctAnswer = correctMatch ? correctMatch[1] : 'True';
      } else {
        const answerMatch = block.match(/Answer:\s*(.+)/);
        question.correctAnswer = answerMatch ? answerMatch[1].trim() : '';
      }

      const explMatch = block.match(/Explanation:\s*(.+)/);
      question.explanation = explMatch ? explMatch[1].trim() : '';

      if (question.question && question.correctAnswer) {
        questions.push(question);
      }
    }

    return questions.slice(0, count);
  }

  isModelLoaded(): boolean {
    return this.context !== null;
  }

  unloadModel(): void {
    if (this.context) {
      this.context.release();
      this.context = null;
      this.modelPath = null;
      this.loadingProgress = 0;
    }
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
