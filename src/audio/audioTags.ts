/**
 * SEIHouse Studio tags: how audio played in SEN is described. Every recording
 * has one parent category and at most one value on each of three shared
 * axes — Tone, Energy and Tension. Tags describe what a recording sounds like;
 * they never name a file, asset or provider.
 *
 * The parent depends on the kind of audio:
 * - a Sound Cue's parent is its cue category (`AUDIO_CUE_CATEGORIES` in
 *   `cues.ts`: artifacts, atmosphere, beasts, factions, locations, system,
 *   weapons);
 * - a Soundscape's parent is one of `SOUNDSCAPE_PARENT_TAGS`.
 */
export const SOUNDSCAPE_PARENT_TAGS = ['ADVENTURE', 'AMBIENT', 'EMOTIONS', 'FIGHTING', 'WAR', 'SPECIAL'] as const;
export type SoundscapeParentTag = (typeof SOUNDSCAPE_PARENT_TAGS)[number];

/** Tone: the overall emotional coloring. */
export const AUDIO_TONES = ['bright', 'neutral', 'dark'] as const;
/** Energy: how much intensity the recording brings. */
export const AUDIO_ENERGIES = ['low', 'medium', 'high'] as const;
/** Tension: how much anticipation or pressure it creates. */
export const AUDIO_TENSIONS = ['calm', 'suspenseful', 'urgent'] as const;

export type AudioTone = (typeof AUDIO_TONES)[number];
export type AudioEnergy = (typeof AUDIO_ENERGIES)[number];
export type AudioTension = (typeof AUDIO_TENSIONS)[number];

/**
 * The child tags every kind of audio shares. Each axis holds one value at
 * most, so a recording carries at most three child tags.
 */
export interface AudioTags {
  tone?: AudioTone;
  energy?: AudioEnergy;
  tension?: AudioTension;
}

export type AudioTagsReading = { ok: true; tags: AudioTags } | { ok: false; reason: string };

const AXES = { tone: AUDIO_TONES, energy: AUDIO_ENERGIES, tension: AUDIO_TENSIONS } as const;
const AXIS_LABELS = { tone: 'Tone', energy: 'Energy', tension: 'Tension' } as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Reads child tags from untrusted data. Values match without regard to case and are kept lower case. */
export function readAudioTags(value: unknown): AudioTagsReading {
  if (!isPlainObject(value)) return { ok: false, reason: 'Studio tags must be an object.' };
  const unknown = Object.keys(value).find(key => !(key in AXES));
  if (unknown) return { ok: false, reason: `Studio tags have no ${unknown} tag; use tone, energy or tension.` };
  const tags: AudioTags = {};
  for (const axis of Object.keys(AXES) as Array<keyof typeof AXES>) {
    const raw = value[axis];
    if (raw === undefined) continue;
    const tag = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    const allowed: readonly string[] = AXES[axis];
    if (!allowed.includes(tag)) return { ok: false, reason: `${AXIS_LABELS[axis]} must be one of ${allowed.join(', ')}.` };
    Object.assign(tags, { [axis]: tag });
  }
  return { ok: true, tags };
}

/** Reads a Soundscape's parent tag, kept upper case, or undefined when it is not one of the six. */
export const readSoundscapeParentTag = (value: unknown): SoundscapeParentTag | undefined => {
  const parent = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return (SOUNDSCAPE_PARENT_TAGS as readonly string[]).includes(parent) ? parent as SoundscapeParentTag : undefined;
};
