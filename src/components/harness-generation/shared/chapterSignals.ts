import { AUDIO_ENERGIES, type AudioEnergy } from '../../../audio/audioTags';
import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import type { SoundCueSignal } from '../../../audio/soundCuePlacement';
import type { HarnessWarning } from '../../../narrative/generation';
import { stripMarks } from '../../../narrative/marks';

/**
 * The chapter signals of the Generation Model Call, in the tiny SEN language.
 *
 * The writer marks where something happens in its own paragraphs
 * (`[[n|words]]`) and names what happened in a flat list keyed by the mark
 * number. Only narration and Sound Cues exist in this language so far: each
 * Sound Cue signal is `{mark, sound, energy?}`. The HARNESS reads the marks,
 * checks every signal on its own, and places the finished cue; a signal it
 * cannot use is set aside and never costs prose.
 */

/** How many Sound Cue signals the HARNESS reads from one chapter reply. */
export const HARNESS_SOUND_CUE_SIGNAL_LIMIT = SOUND_CUE_RULES.maxPerChapter;

const MAX_SOUND_LENGTH = 48;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** A mark number the writer gave as a whole number or as digits. */
const markNumber = (value: unknown): number | undefined => {
  const number = typeof value === 'string' && /^\s*\d{1,3}\s*$/.test(value) ? Number(value) : value;
  return typeof number === 'number' && Number.isInteger(number) && number >= 1 && number <= 999 ? number : undefined;
};

const energyOf = (value: unknown): AudioEnergy | undefined => {
  const energy = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (AUDIO_ENERGIES as readonly string[]).includes(energy) ? energy as AudioEnergy : undefined;
};

export interface HarnessSoundCueSignalRead {
  signals: SoundCueSignal[];
  warnings: HarnessWarning[];
}

/**
 * Reads the reply's Sound Cue signals. Malformed entries are dropped with one
 * warning; an unreadable Energy is simply absent. The words are checked
 * against the story's sound words later, when the cues are placed.
 */
export const readHarnessSoundCueSignals = (reply: Record<string, unknown>): HarnessSoundCueSignalRead => {
  const raw = reply.soundCues;
  if (raw === undefined || raw === null) return { signals: [], warnings: [] };
  if (!Array.isArray(raw)) {
    return { signals: [], warnings: [{ code: 'sound_cue_set_aside', message: 'The Sound Cue signals were not a list and were set aside.' }] };
  }
  const signals: SoundCueSignal[] = [];
  let dropped = 0;
  for (const item of raw) {
    const mark = isRecord(item) ? markNumber(item.mark) : undefined;
    const sound = isRecord(item) && typeof item.sound === 'string' ? item.sound.trim() : '';
    if (mark === undefined || !sound || sound.length > MAX_SOUND_LENGTH) { dropped += 1; continue; }
    const energy = energyOf((item as Record<string, unknown>).energy);
    signals.push({ mark, sound, ...(energy ? { energy } : {}) });
  }
  // Every readable signal is kept here; the chapter's cap applies to placed
  // cues in reading order, so an early malformed entry never costs a later one.
  return {
    signals,
    warnings: dropped
      ? [{ code: 'sound_cue_set_aside', message: `Set aside ${dropped} malformed Sound Cue signal${dropped === 1 ? '' : 's'} without affecting the chapter prose.` }]
      : [],
  };
};

/** The reply fields that carry marks or read them; every other string is read without marks. */
const MARKED_FIELDS = new Set(['paragraphs', 'soundCues']);

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
