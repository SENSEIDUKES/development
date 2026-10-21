// How a character or thing looks: what the planner gives someone new (SENSEI, 2026-10-20), and what the Codex keeps.

/** The traits a character's look is told by. Each is a few words in the story's own language; any may be unknown. */
export const CHARACTER_LOOK_TRAITS = ['build', 'face', 'eyes', 'hair', 'skin', 'clothing', 'marks', 'gear'] as const;
/** The traits a thing's look is told by. */
export const THING_LOOK_TRAITS = ['form', 'size', 'material', 'colour', 'condition', 'marks'] as const;
export type LookTrait = (typeof CHARACTER_LOOK_TRAITS)[number] | (typeof THING_LOOK_TRAITS)[number];

/**
 * One whole look: what an artist needs to draw it, and nothing about how to
 * show it (no camera, framing, pose, lighting or art style).
 */
export interface Look {
  /** One line, the first thing an artist needs. */
  summary: string;
  /** Only the traits that are known, by trait. */
  traits: Partial<Record<LookTrait, string>>;
}
