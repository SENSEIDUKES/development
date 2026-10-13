import type { ManuscriptAnchor, ManuscriptAttachment } from '../components/highlight-engine/shared/manuscript';
import { wholeWordRange, wordAt } from '../narrative/words';

/**
 * The chapter's soundtrack, as a reader shapes it in Create mode. The music
 * (the soundscape) and the atmosphere are two separate sounds, apart from
 * Sound Cues, and each is sequenced on its own:
 *
 * - its **opening**, locked at the chapter's start: the writer's choice
 *   (`[[soundscape: …]]`, `[[atmosphere: …]]`), or the reader's own in its
 *   place (`ChapterOpeningSound`);
 * - at most **one change** partway through, on the word where it begins
 *   (a manuscript attachment, so it stays on its word as the chapter is
 *   edited, like a Sound Cue).
 *
 * Two of each, never more (SENSEI): a chapter can turn once, from a forest to
 * a battle, and the next chapter opens fresh. Sequencing sound takes taste and
 * restraint, and two is hard to get wrong. The limit is one number,
 * `SOUNDTRACK_CHANGE_RULES.perChapter`.
 */
export const SOUNDSCAPE_CHANGE_KIND = 'soundscape-change';
export const ATMOSPHERE_CHANGE_KIND = 'atmosphere-change';

export const SOUNDTRACK_CHANGE_RULES = Object.freeze({
  /** Of each kind in one chapter, the opening included. */
  perChapter: 2,
});

/** Where a change begins: the one word it sits on. */
export type SoundtrackChangeAnchor = Extract<ManuscriptAnchor, { level: 'span' }>;

export interface SoundscapeChangePayload {
  /** The exact piece of the chapter's soundscapes that plays from here. */
  pieceId: string;
}

export interface AtmosphereChangePayload {
  /** The id of the atmosphere that plays from here, as the host's reader mixer knows it. */
  atmosphereId: string;
}

export interface SoundscapeChangeAttachment extends ManuscriptAttachment<SoundscapeChangePayload> {
  kind: typeof SOUNDSCAPE_CHANGE_KIND;
  anchor: SoundtrackChangeAnchor;
}

export interface AtmosphereChangeAttachment extends ManuscriptAttachment<AtmosphereChangePayload> {
  kind: typeof ATMOSPHERE_CHANGE_KIND;
  anchor: SoundtrackChangeAnchor;
}

export type SoundtrackChangeAttachment = SoundscapeChangeAttachment | AtmosphereChangeAttachment;
export type SoundtrackChangeKind = SoundtrackChangeAttachment['kind'];

/** The reader's own opening for the chapter, in place of the writer's; locked at the start. */
export interface ChapterOpeningSound {
  soundscape?: { pieceId: string };
  atmosphere?: { atmosphereId: string };
}

export const isSoundtrackChange = (attachment: { kind: string }): attachment is SoundtrackChangeAttachment =>
  attachment.kind === SOUNDSCAPE_CHANGE_KIND || attachment.kind === ATMOSPHERE_CHANGE_KIND;

/**
 * The word a change begins on: the first whole word of a selection. A change
 * marks a moment, not a passage, so only where it begins counts.
 */
export function soundtrackChangeWord(text: string, start: number, end: number, locale?: string): { start: number; end: number } | undefined {
  const whole = wholeWordRange(text, start, end, locale);
  if (!whole) return undefined;
  return wordAt(text, whole.start, locale) ?? whole;
}
