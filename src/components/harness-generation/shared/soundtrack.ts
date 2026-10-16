import { AUDIO_ENERGIES, AUDIO_TENSIONS, AUDIO_TONES, type AudioTags } from '../../../audio/audioTags';
import { isPlayableMediaUrl } from '../../../audio/mediaUrl';
import { atmosphereCategory, bedsForAtmosphere, musicCategory, soundtrackWord } from '../../../audio/soundtrackVocabulary';
import type { FrozenNarrativeMedia } from '../../../audio/media';
import type { HarnessChapterScene } from '../../../narrative/generation';
import type { SoundtrackTagKind } from '../../../narrative/marks';

/** What a chapter's soundtrack tags chose, and what the HARNESS could not use. */
export interface ChapterSoundtrackReading {
  /** The chapter's music and atmosphere bed, when its first tag named either. */
  scene?: HarnessChapterScene;
  /** Words of the first tag of each kind that are not a category, a tag word, a mood or an atmosphere of the story (as the tag asks). */
  unknown: string[];
  /** Tags after the first of their kind: removed, never used. */
  extra: number;
}

const AXES = [['tone', AUDIO_TONES], ['tension', AUDIO_TENSIONS], ['energy', AUDIO_ENERGIES]] as const;

/** The SEN audio tags among a tag's words, in any order; the words that are none are returned apart. */
function readTags(parts: readonly string[]): { tags: AudioTags; rest: string[] } {
  const tags: AudioTags = {};
  const rest: string[] = [];
  for (const part of parts) {
    const word = soundtrackWord(part);
    const axis = AXES.find(([name, values]) => !tags[name] && (values as readonly string[]).includes(word));
    if (axis) Object.assign(tags, { [axis[0]]: word });
    else if (word) rest.push(part.trim());
  }
  return { tags, rest };
}

/**
 * The chapter's opening scene, from its soundtrack tags: its music from the
 * first soundscape tag and its atmosphere from the first atmosphere tag,
 * wherever the writer put them, so a passing fight never changes the music.
 *
 * Each tag names a category and its SEN audio tags
 * (`[[soundscape: Fighting | dark | urgent | high]]`, `[[atmosphere: Rain | high]]`),
 * and the HARNESS chooses the recordings: the music plays the pieces of that
 * category closest to its tags; the atmosphere is a bed of that category
 * closest to its energy. A category is a piece's or bed's SEN audio category,
 * else its group, so media without SEN audio tags is still chosen from, only
 * more loosely. Beds that tie take turns by chapter, so a story that stays in
 * one place does not hear one recording on repeat.
 *
 * Words from before categories still read: a soundscape mood and an
 * atmosphere word, and the earlier combined soundtrack tag, each of its words
 * read for what it is, in either order.
 */
export function chapterSoundtrack(
  tags: ReadonlyArray<{ kind?: SoundtrackTagKind; parts: readonly string[] }>,
  media: Pick<FrozenNarrativeMedia, 'soundscapes' | 'atmospheres'> | undefined,
  chapterNumber: number,
): ChapterSoundtrackReading {
  if (!tags.length) return { unknown: [], extra: 0 };
  const pieces = (media?.soundscapes ?? []).filter(({ track }) => isPlayableMediaUrl(track.url)).map(({ track }) => track);
  const moods = new Set(pieces.flatMap(track => [track.mood, ...track.moods].map(soundtrackWord)));
  const atmospheres = media?.atmospheres ?? [];
  const turn = <T>(list: readonly T[]) => list[(Math.max(1, chapterNumber) - 1) % list.length];
  const scene: HarnessChapterScene = {};
  const unknown: string[] = [];
  const read = new Set<SoundtrackTagKind>();
  let extra = 0;
  for (const tag of tags) {
    const kind = tag.kind ?? 'soundtrack';
    if (read.has(kind)) { extra += 1; continue; }
    read.add(kind);
    const [first = '', ...more] = tag.parts;
    const word = soundtrackWord(first);
    if (kind === 'soundscape') {
      const category = pieces.find(track => soundtrackWord(musicCategory(track)) === word);
      const { tags: asked, rest } = readTags(more);
      if (category) scene.music = { category: musicCategory(category), ...asked };
      else if (moods.has(word)) scene.soundscape = word;
      else if (word) unknown.push(first.trim());
      unknown.push(...rest);
      continue;
    }
    if (kind === 'atmosphere') {
      const { tags: asked, rest } = readTags(more);
      const beds = atmospheres.some(bed => soundtrackWord(atmosphereCategory(bed)) === word)
        ? bedsForAtmosphere({ category: word, ...asked }, atmospheres)
        : atmospheres.filter(bed => soundtrackWord(bed.word) === word);
      if (beds.length) scene.atmosphere = turn(beds).id;
      else if (word) unknown.push(first.trim());
      unknown.push(...rest);
      continue;
    }
    // The earlier combined tag: a mood and an atmosphere word, in either order.
    for (const part of tag.parts) {
      const value = soundtrackWord(part);
      if (!value) continue;
      const beds = atmospheres.filter(entry => soundtrackWord(entry.word) === value);
      if (!scene.soundscape && !scene.music && moods.has(value)) scene.soundscape = value;
      else if (!scene.atmosphere && beds.length) scene.atmosphere = turn(beds).id;
      else unknown.push(part.trim());
    }
  }
  return { ...(Object.keys(scene).length ? { scene } : {}), unknown, extra };
}
