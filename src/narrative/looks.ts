// How a character or thing looks: kept apart so the Codex entry (holdings) can carry its look without importing appearances.

/** The traits a character's look is told by. Each is a few words in the story's own language; any may be unknown. */
export const CHARACTER_LOOK_TRAITS = ['build', 'face', 'eyes', 'hair', 'skin', 'clothing', 'marks', 'gear'] as const;
/** The traits a thing's look is told by. */
export const THING_LOOK_TRAITS = ['form', 'size', 'material', 'colour', 'condition', 'marks'] as const;
export type LookTrait = (typeof CHARACTER_LOOK_TRAITS)[number] | (typeof THING_LOOK_TRAITS)[number];

/** One look, as written down from the passages that show it: what an artist needs to draw it. */
export interface Look {
  /** One line, the first thing an artist needs. */
  summary: string;
  /** Only the traits the passages (or the author's declared look) state, by trait. */
  traits: Partial<Record<LookTrait, string>>;
}

/**
 * A Codex entry's core look, written on demand: from every passage that shows
 * it, in story order, as it stands after the last of them.
 */
export interface CodexEntryLook extends Look {
  /** The appearances it was written from (`AppearanceAttachment.id`), in story order: when they change, it is written again. */
  from: string[];
  /** Where the passages contradict the look the story's author declared, in one short sentence. */
  conflict?: string;
  at: string;
  model?: string;
}

/** A try to write a Codex entry's look that came back unreadable or failed. */
export interface CodexEntryLookFailure {
  at: string;
  model?: string;
  problem: string;
  /** The model's own answer, when there was one. */
  raw?: string;
}
