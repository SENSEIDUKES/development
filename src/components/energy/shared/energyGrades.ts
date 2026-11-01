/**
 * Energy grades: Mortal, Immortal and Heaven. Every model is sorted into a
 * grade by what it costs SEIHouse to run, and each kind of generation has one
 * Energy price per grade, so a premium model costs more Energy without the
 * reader ever seeing a fractional or moving price. The Mortal price of a kind
 * is the same as its entry in `ENERGY_PRICE_CATALOG`.
 *
 * The owner sets the grades and prices here (draft sort, 2026-11-01). A model
 * the table does not name is Mortal. Chapter narration (read aloud) is not
 * priced yet: add its kind here when that pipeline is finished.
 */

export const ENERGY_GRADES = ['mortal', 'immortal', 'heaven'] as const;
export type EnergyGrade = (typeof ENERGY_GRADES)[number];

export const ENERGY_GRADE_LABELS: Record<EnergyGrade, string> = {
  mortal: 'Mortal',
  immortal: 'Immortal',
  heaven: 'Heaven',
};

/** The kinds of generation that cost Energy by grade. `live-minute` is charged per started minute. */
export type GradedEnergyKind = 'chapter' | 'image' | 'live-minute';

export const GRADED_ENERGY_PRICES: Record<GradedEnergyKind, Record<EnergyGrade, number>> = {
  chapter: { mortal: 2, immortal: 4, heaven: 8 },
  image: { mortal: 5, immortal: 10, heaven: 20 },
  'live-minute': { mortal: 1, immortal: 2, heaven: 3 },
};

/** Each model's grade, by the Model Router's model id. */
export const MODEL_ENERGY_GRADES: Readonly<Record<string, EnergyGrade>> = {
  // Chapters. About half a cent a chapter: Haiku, Luna, MiniMax, DeepSeek and the light models.
  'anthropic/claude-haiku-5-5': 'mortal',
  'openrouter/anthropic/claude-haiku-5.5': 'mortal',
  'openrouter/openai/gpt-6-luna': 'mortal',
  'minimax/MiniMax-M3.1-Flash': 'mortal',
  'minimax/MiniMax-M3': 'mortal',
  'minimax/MiniMax-M2.7': 'mortal',
  'minimax/MiniMax-M2.7-highspeed': 'mortal',
  'minimax/MiniMax-M2.5': 'mortal',
  'minimax/MiniMax-M2.5-highspeed': 'mortal',
  'minimax/MiniMax-M2.1': 'mortal',
  'minimax/MiniMax-M2.1-highspeed': 'mortal',
  'minimax/MiniMax-M2': 'mortal',
  'openrouter/minimax/minimax-m2.7': 'mortal',
  'openrouter/deepseek/deepseek-v4.1-flash': 'mortal',
  'openrouter/z-ai/glm-5.3-flash': 'mortal',
  'openrouter/qwen/qwen3.8-flash': 'mortal',
  'openrouter/arcee-ai/trinity-large-thinking': 'mortal',
  'google/gemini-3.1-flash-lite': 'mortal',
  'google/gemini-3.5-flash-lite': 'mortal',
  'lmstudio/loaded': 'mortal',
  'google/gemini-3.8-flash': 'immortal',
  'google/gemini-3.7-flash': 'immortal',
  'google/gemini-3.5-flash': 'immortal',
  'openrouter/google/gemini-3.8-flash': 'immortal',
  'anthropic/claude-sonnet-5-5': 'immortal',
  'google/gemini-3.1-pro-preview': 'heaven',
  'openrouter/openai/gpt-6-luna-pro': 'heaven',
  'anthropic/claude-opus-5-5': 'heaven',
  'anthropic/claude-fable-5-1': 'heaven',
  // Images.
  'google/gemini-3.1-flash-lite-image': 'mortal',
  'minimax/image-01': 'mortal',
  'minimax/image-01-live': 'mortal',
  'google/gemini-3.1-flash-image': 'immortal',
  'google/gemini-3-pro-image': 'heaven',
  'openrouter/openai/gpt-5.4-image-2': 'heaven',
  // Live speech, per minute.
  'google/gemini-3.8-live': 'mortal',
  'openai/gpt-live-1': 'immortal',
};

export const modelEnergyGrade = (model: string | undefined): EnergyGrade =>
  (model && Object.hasOwn(MODEL_ENERGY_GRADES, model) ? MODEL_ENERGY_GRADES[model] : undefined) ?? 'mortal';

/** The Energy one generation of `kind` costs on `model`. */
export const gradedEnergyPrice = (kind: GradedEnergyKind, model: string | undefined): number =>
  GRADED_ENERGY_PRICES[kind][modelEnergyGrade(model)];

/** Live talk is charged per started minute: 61 seconds is two minutes. */
export const liveTalkEnergy = (model: string | undefined, seconds: number): number =>
  seconds <= 0 ? 0 : Math.ceil(seconds / 60) * gradedEnergyPrice('live-minute', model);
