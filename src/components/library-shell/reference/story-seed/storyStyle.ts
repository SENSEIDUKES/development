/**
 * Story Style — the novel's storytelling tradition.
 *
 * Style is the first decision a creator makes: which novel tradition the book
 * is written in. It is a closed set of stable values, not a freeform
 * description of how the prose should sound.
 *
 * This module is deliberately the *skeleton only*: valid values, labels, and
 * normalization. No tradition-specific generation behavior lives here yet —
 * no pacing rules, naming conventions, prompt fragments, or cultural rule
 * sets. When that work starts, this is the extension point: keep `StoryStyle`
 * as the key and add a separate module that maps a key to its generation
 * behavior, so the seed contract never has to change again.
 */

export type StoryStyle = 'chinese' | 'korean' | 'japanese';

export interface StoryStyleOption {
  value: StoryStyle;
  label: string;
}

export const STORY_STYLE_OPTIONS: readonly StoryStyleOption[] = [
  { value: 'chinese', label: 'Chinese' },
  { value: 'korean', label: 'Korean' },
  { value: 'japanese', label: 'Japanese' },
] as const;

const STORY_STYLE_VALUES = STORY_STYLE_OPTIONS.map(option => option.value);

export const isStoryStyle = (value: unknown): value is StoryStyle =>
  typeof value === 'string' && (STORY_STYLE_VALUES as string[]).includes(value);

/**
 * Accepts a stored value or a visible label ("Chinese") and returns the stable
 * key. Anything else — including the freeform prose descriptions older seeds
 * carried in `story.style` — returns `undefined`, so it reads as "no tradition
 * chosen yet" rather than silently counting as a choice.
 */
export const normalizeStoryStyle = (value: unknown): StoryStyle | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return isStoryStyle(normalized) ? normalized : undefined;
};

export const getStoryStyleLabel = (value: unknown): string =>
  STORY_STYLE_OPTIONS.find(option => option.value === normalizeStoryStyle(value))?.label || '';
