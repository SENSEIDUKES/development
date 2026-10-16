import type { AudioTags } from './audioTags';
import { isPlayableMediaUrl } from './mediaUrl';
import type { FrozenNarrativeMedia, SceneAtmosphere } from './media';
import type { SceneAudioTrack } from './soundscapes';

/**
 * The words a writer chooses a chapter's soundtrack with, from the story's
 * frozen media: the categories of its music and of its atmospheres, never the
 * names of their recordings. The writer names a category and its tags; the
 * HARNESS chooses the recording (SENSEI: "wind, high energy").
 */
export interface SoundtrackVocabulary {
  /** Music categories enough pieces share for one to follow another, in the catalog's order. */
  music: string[];
  /** Atmosphere categories, in the catalog's order. */
  atmospheres: string[];
}

/** How many pieces a category needs before a writer is offered it, so its music can change from piece to piece. */
export const SOUNDTRACK_MOOD_PIECES = 3;

/** A word as the soundtrack compares it: lower case, single spaces. */
export const soundtrackWord = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * The category a piece of music is chosen by: its SEN audio category, else
 * its group, else its mood. A pack without SEN audio tags still plays; its
 * pieces are only chosen more loosely.
 */
export const musicCategory = (track: Pick<SceneAudioTrack, 'category' | 'group' | 'mood'>) =>
  (track.category ?? track.group ?? track.mood).trim();

/** The category an atmosphere bed is chosen by: its SEN audio category, else its group, else its word. */
export const atmosphereCategory = (bed: Pick<SceneAtmosphere, 'category' | 'group' | 'word'>) =>
  (bed.category ?? bed.group ?? bed.word).trim();

/** Each category once, letter case aside, in its first spelling and in order. */
const categories = (values: readonly string[]) => {
  const seen = new Map<string, string>();
  for (const value of values) if (value && !seen.has(soundtrackWord(value))) seen.set(soundtrackWord(value), value);
  return [...seen.values()];
};

/**
 * The soundtrack categories a story may choose from: every music category at
 * least {@link SOUNDTRACK_MOOD_PIECES} playable pieces share (all of them,
 * when none has that many), and every atmosphere category.
 */
export function soundtrackVocabulary(media?: Pick<FrozenNarrativeMedia, 'soundscapes' | 'atmospheres'>): SoundtrackVocabulary {
  const pieces = (media?.soundscapes ?? []).filter(({ track }) => isPlayableMediaUrl(track.url)).map(({ track }) => musicCategory(track));
  const counts = new Map<string, number>();
  for (const category of pieces) counts.set(soundtrackWord(category), (counts.get(soundtrackWord(category)) ?? 0) + 1);
  const enough = Math.max(0, ...counts.values()) >= SOUNDTRACK_MOOD_PIECES ? SOUNDTRACK_MOOD_PIECES : 1;
  return {
    music: categories(pieces).filter(category => (counts.get(soundtrackWord(category)) ?? 0) >= enough),
    atmospheres: categories((media?.atmospheres ?? []).map(atmosphereCategory)),
  };
}

/** How many of the asked tags a recording carries. A recording without tags matches none. */
export const tagCloseness = (asked: AudioTags, has: AudioTags | undefined) =>
  (['tone', 'tension', 'energy'] as const).filter(axis => asked[axis] && has?.[axis] === asked[axis]).length;

/**
 * The recordings closest to the asked tags, in their own order: those that
 * match the most of them, together with the next closest when the closest
 * are alone, so music can still change from piece to piece.
 */
export function closestByTags<T>(recordings: readonly T[], asked: AudioTags, tagsOf: (recording: T) => AudioTags | undefined): T[] {
  const scored = recordings.map(recording => ({ recording, score: tagCloseness(asked, tagsOf(recording)) }));
  const tiers = [...new Set(scored.map(entry => entry.score))].sort((left, right) => right - left);
  const best = scored.filter(entry => entry.score === tiers[0]);
  const kept = best.length > 1 || tiers.length < 2 ? best : scored.filter(entry => entry.score >= tiers[1]);
  return kept.map(entry => entry.recording);
}

/** The pieces of a music category, the closest to the asked tags. */
export function piecesForMusic(music: { category: string } & AudioTags, pieces: readonly SceneAudioTrack[]): SceneAudioTrack[] {
  const wanted = soundtrackWord(music.category);
  return closestByTags(pieces.filter(piece => soundtrackWord(musicCategory(piece)) === wanted), music, piece => piece.studioTags);
}

/** The beds of an atmosphere category, the closest to the asked tags. */
export function bedsForAtmosphere(atmosphere: { category: string } & AudioTags, beds: readonly SceneAtmosphere[]): SceneAtmosphere[] {
  const wanted = soundtrackWord(atmosphere.category);
  const inCategory = beds.filter(bed => soundtrackWord(atmosphereCategory(bed)) === wanted);
  // A bed is one recording, so only the closest are kept: a gentle rain never stands in for a storm.
  const scored = inCategory.map(bed => ({ bed, score: tagCloseness(atmosphere, bed.studioTags) }));
  const best = Math.max(0, ...scored.map(entry => entry.score));
  return scored.filter(entry => entry.score === best).map(entry => entry.bed);
}
