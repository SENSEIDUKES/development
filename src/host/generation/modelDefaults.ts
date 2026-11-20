/** NovelExpanded and Workshop defaults. The portable Router has its own defaults. */
export const CHAPTER_DEFAULT_MODEL = 'anthropic/claude-haiku-5-5';
export const TAGGER_DEFAULT_MODEL = 'openai/gpt-6-luna';
export const TAGGER_DEFAULT_REASONING = 'medium';
export const BLUEPRINT_DEFAULT_MODEL = CHAPTER_DEFAULT_MODEL;
export const BLUEPRINT_DEFAULT_REASONING = 'high';

export const IMAGE_JOB_DEFAULTS = {
  images: 'openai/gpt-image-2.6-flare',
  'codex-images': 'minimax/MiniMax-H3-Image',
} as const;

export type ImageJob = keyof typeof IMAGE_JOB_DEFAULTS;
