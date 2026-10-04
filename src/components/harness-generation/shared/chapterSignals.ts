import type { HarnessWarning } from '../../../narrative/generation';
import { stripMarks } from '../../../narrative/marks';

/**
 * The chapter signals of the Generation Model Call, in the tiny SEN language.
 *
 * Every signal is a tag the writer puts in its own paragraphs: a sound tag
 * wraps the words where a sound happens and names it (`[[sound: blade drawn |
 * drew his sword | high]]`), a speaker tag names who speaks, a word tag names
 * a change to what a character has. The reply carries no separate list of
 * signals; the HARNESS reads the tags, checks each on its own, and places
 * what it can. A tag it cannot use is set aside and never costs prose.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * The retired Sound Cue list. A writer that still returns one beside its
 * paragraphs is told nothing came of it: only sound tags place sounds.
 */
export const ignoredSoundCueListWarning = (reply: Record<string, unknown>): HarnessWarning | undefined =>
  reply.soundCues === undefined || reply.soundCues === null
    ? undefined
    : { code: 'sound_cue_set_aside', message: 'Ignored a separate soundCues list: sounds are placed only from the sound tags in the paragraphs.' };

/** The reply field that carries tags; every other string is read without them. */
const MARKED_FIELDS = new Set(['paragraphs']);

const unmark = (value: unknown): unknown => {
  if (typeof value === 'string') return stripMarks(value);
  if (Array.isArray(value)) return value.map(unmark);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, unmark(entry)]));
  return value;
};

/**
 * The chapter reply with marks removed from every string outside the
 * paragraphs: title, plan, recap, suggestions, evidence passages and any prose
 * fallback. A writer that copies marked prose into evidence still points at
 * the saved, mark-free chapter.
 */
export const stripReplyMarks = (reply: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(reply).map(([key, value]) => [key, MARKED_FIELDS.has(key) ? value : unmark(value)]));
