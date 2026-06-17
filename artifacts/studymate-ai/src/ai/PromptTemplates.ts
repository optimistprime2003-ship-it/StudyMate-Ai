export const QUICK_PROMPTS = {
  explain: 'Explain this topic in simple terms',
  summarize: 'Summarize the key points',
  examPrep: 'Give me exam preparation notes',
  likeIm10: 'Explain this like I am 10 years old',
  formulas: 'List all important formulas',
  quiz: 'Give me 5 practice questions',
} as const;

export type QuickPromptKey = keyof typeof QUICK_PROMPTS;

export const QUICK_PROMPT_LABELS: Record<QuickPromptKey, string> = {
  explain: 'Explain',
  summarize: 'Summarize',
  examPrep: 'Exam Prep',
  likeIm10: 'Simple',
  formulas: 'Formulas',
  quiz: 'Quiz Me',
};

export const QUICK_PROMPT_ICONS: Record<QuickPromptKey, string> = {
  explain: 'book-open',
  summarize: 'list',
  examPrep: 'award',
  likeIm10: 'smile',
  formulas: 'percent',
  quiz: 'help-circle',
};

export const SUMMARY_PROMPTS = {
  short: (text: string) =>
    `Summarize in 2-3 sentences: ${text}`,
  medium: (text: string) =>
    `Write a one paragraph summary: ${text}`,
  detailed: (text: string) =>
    `Write a detailed summary covering all main points: ${text}`,
  exam: (text: string) =>
    `Create exam preparation notes with key concepts and definitions: ${text}`,
  bullets: (text: string) =>
    `Convert to bullet points with the most important information: ${text}`,
};
