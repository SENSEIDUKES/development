import { isPublicHttpsMediaUrl } from './mediaUrl';
import type { FrozenNarrativeMedia } from './media';

/**
 * The words a writer chooses a chapter's soundtrack with, from the story's
 * frozen media: the moods of its music and the words of its atmospheres.
 */
export interface SoundtrackVocabulary {
  /** Moods enough pieces share for one to follow another, the most shared first. */
  moods: string[];
  /** Atmosphere words, in the host catalog's order. */
  atmospheres: string[];
}

/** How many pieces a mood needs before a writer is offered it, so its music can change from piece to piece. */
export const SOUNDTRACK_MOOD_PIECES = 3;

/** A word as the soundtrack compares it: lower case, single spaces. */
export const soundtrackWord = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const compareCodePoints = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

/**
 * The soundtrack words a story may choose from: every mood at least
 * {@link SOUNDTRACK_MOOD_PIECES} playable pieces answer (all of them, when no
 * mood has that many), and every atmosphere word.
 */
export function soundtrackVocabulary(media?: Pick<FrozenNarrativeMedia, 'soundscapes' | 'atmospheres'>): SoundtrackVocabulary {
  const counts = new Map<string, number>();
  for (const { track } of media?.soundscapes ?? []) {
    if (!isPublicHttpsMediaUrl(track.url)) continue;
    for (const mood of new Set([track.mood, ...track.moods].map(soundtrackWord).filter(Boolean))) counts.set(mood, (counts.get(mood) ?? 0) + 1);
  }
  const enough = Math.max(0, ...counts.values()) >= SOUNDTRACK_MOOD_PIECES ? SOUNDTRACK_MOOD_PIECES : 1;
  const moods = [...counts]
    .filter(([, count]) => count >= enough)
    .sort((left, right) => right[1] - left[1] || compareCodePoints(left[0], right[0]))
    .map(([mood]) => mood);
  const atmospheres = [...new Set((media?.atmospheres ?? []).map(entry => soundtrackWord(entry.word)).filter(Boolean))];
  return { moods, atmospheres };
}
