export const QUICK_PROMPTS = {
  explain: 'Explain this topic in simple terms',
  summarize: 'Summarize the key points',
  examPrep: 'Give me exam preparation notes',
  likeIm10: 'Explain this like I am 10 years old',
  formulas: 'List all important formulas',
  quiz: 'Give me 5 practice questions',
} as const;

export type QuickPromptKey = keyof typeof QUICK_PROMPTS;

export const SUMMARY_MODE_PROMPTS = {
  short: {
    label: 'Short',
    instruction: 'Summarize in 2-3 sentences. Focus on the main idea only.',
  },
  detailed: {
    label: 'Detailed',
    instruction: 'Provide a thorough summary covering all important concepts, definitions, and relationships.',
  },
  exam: {
    label: 'Exam',
    instruction: 'Create exam preparation notes. Include definitions, key concepts, and likely exam topics.',
  },
  bullets: {
    label: 'Bullets',
    instruction: 'List key points as bullet points. Each point on a new line starting with a dash.',
  },
} as const;
