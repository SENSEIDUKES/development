import { isPlayableMediaUrl } from '../../../audio/mediaUrl';
import { soundtrackWord } from '../../../audio/soundtrackVocabulary';
import type { FrozenNarrativeMedia } from '../../../audio/media';
import type { HarnessChapterScene } from '../../../narrative/generation';
import type { SoundtrackTagKind } from '../../../narrative/marks';

/** What a chapter's soundtrack tags chose, and what the HARNESS could not use. */
export interface ChapterSoundtrackReading {
  /** The chapter's music mood and atmosphere bed, when its first tag named either. */
  scene?: HarnessChapterScene;
  /** Words of the first tag of each kind that are not a mood of the story's music or one of its atmospheres (as the tag asks). */
  unknown: string[];
  /** Tags after the first of their kind: removed, never used. */
  extra: number;
}

/**
 * The chapter's opening scene, from its soundtrack tags: its soundscape (the
 * music) from the first soundscape tag and its atmosphere from the first
 * atmosphere tag, wherever the writer put them, so a passing fight never
 * changes the music. The earlier combined soundtrack tag still names both,
 * each of its words read for what it is, in either order. A soundscape word
 * is a mood some playable piece of the chapter's frozen soundscapes answers;
 * an atmosphere word is one of its atmosphere words. Beds that share a word
 * take turns by chapter ("forest" is Forest 1 in Chapter 1, Forest 2 in
 * Chapter 2), so a story that stays in one place does not hear one recording
 * on repeat.
 */
export function chapterSoundtrack(
  tags: ReadonlyArray<{ kind?: SoundtrackTagKind; parts: readonly string[] }>,
  media: Pick<FrozenNarrativeMedia, 'soundscapes' | 'atmospheres'> | undefined,
  chapterNumber: number,
): ChapterSoundtrackReading {
  if (!tags.length) return { unknown: [], extra: 0 };
  const moods = new Set((media?.soundscapes ?? [])
    .filter(({ track }) => isPlayableMediaUrl(track.url))
    .flatMap(({ track }) => [track.mood, ...track.moods].map(soundtrackWord)));
  const atmospheres = media?.atmospheres ?? [];
  let soundscape: string | undefined;
  let atmosphere: string | undefined;
  const unknown: string[] = [];
  const read = new Set<SoundtrackTagKind>();
  let extra = 0;
  for (const tag of tags) {
    const kind = tag.kind ?? 'soundtrack';
    if (read.has(kind)) { extra += 1; continue; }
    read.add(kind);
    for (const part of tag.parts) {
      const word = soundtrackWord(part);
      if (!word) continue;
      const beds = atmospheres.filter(entry => soundtrackWord(entry.word) === word);
      if (kind !== 'atmosphere' && !soundscape && moods.has(word)) soundscape = word;
      else if (kind !== 'soundscape' && !atmosphere && beds.length) atmosphere = beds[(Math.max(1, chapterNumber) - 1) % beds.length].id;
      else unknown.push(part.trim());
    }
  }
  const scene = soundscape || atmosphere ? { ...(soundscape ? { soundscape } : {}), ...(atmosphere ? { atmosphere } : {}) } : undefined;
  return { ...(scene ? { scene } : {}), unknown, extra };
}
