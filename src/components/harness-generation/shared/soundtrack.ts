import { isPublicHttpsMediaUrl } from '../../../audio/mediaUrl';
import { soundtrackWord } from '../../../audio/soundtrackVocabulary';
import type { FrozenNarrativeMedia } from '../../../audio/media';
import type { HarnessChapterScene } from '../../../narrative/generation';

/** What a chapter's soundtrack tags chose, and what the HARNESS could not use. */
export interface ChapterSoundtrackReading {
  /** The chapter's music mood and atmosphere bed, when its first tag named either. */
  scene?: HarnessChapterScene;
  /** Words of the first tag that are neither a mood of the story's music nor one of its atmospheres. */
  unknown: string[];
  /** Tags after the first: removed, never used. */
  extra: number;
}

/**
 * The chapter's scene, from its soundtrack tags: only the first counts,
 * wherever the writer put it, so a passing fight never changes the music.
 * Each of its words is read for what it is, in either order: a mood some
 * playable piece of the chapter's frozen soundscapes answers, or one of its
 * atmosphere words. Beds that share a word take turns by chapter ("forest"
 * is Forest 1 in Chapter 1, Forest 2 in Chapter 2), so a story that stays in
 * one place does not hear one recording on repeat.
 */
export function chapterSoundtrack(
  tags: ReadonlyArray<{ parts: readonly string[] }>,
  media: Pick<FrozenNarrativeMedia, 'soundscapes' | 'atmospheres'> | undefined,
  chapterNumber: number,
): ChapterSoundtrackReading {
  const [first, ...rest] = tags;
  if (!first) return { unknown: [], extra: 0 };
  const moods = new Set((media?.soundscapes ?? [])
    .filter(({ track }) => isPublicHttpsMediaUrl(track.url))
    .flatMap(({ track }) => [track.mood, ...track.moods].map(soundtrackWord)));
  const atmospheres = media?.atmospheres ?? [];
  let soundscape: string | undefined;
  let atmosphere: string | undefined;
  const unknown: string[] = [];
  for (const part of first.parts) {
    const word = soundtrackWord(part);
    if (!word) continue;
    const beds = atmospheres.filter(entry => soundtrackWord(entry.word) === word);
    if (!soundscape && moods.has(word)) soundscape = word;
    else if (!atmosphere && beds.length) atmosphere = beds[(Math.max(1, chapterNumber) - 1) % beds.length].id;
    else unknown.push(part.trim());
  }
  const scene = soundscape || atmosphere ? { ...(soundscape ? { soundscape } : {}), ...(atmosphere ? { atmosphere } : {}) } : undefined;
  return { ...(scene ? { scene } : {}), unknown, extra: rest.length };
}
