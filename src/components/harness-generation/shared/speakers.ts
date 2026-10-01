import type { SpeakerTag } from '../../../narrative/marks';
import { findSpokenLines, SPEAKER_KIND, speakerAttachmentId, type SpeakerAttachment } from '../../../narrative/speech';
import type { CanonicalEntityState, CurrentStoryProjection } from '../../../narrative/generation';
import { normalizeIdentityLabel } from './canonicalProjection';

/**
 * Speakers: who speaks each spoken line of a chapter, in the tiny SEN
 * language. The writer puts a speaker tag (`[[@Name]]`) before the speech it
 * names; the HARNESS finds the spoken lines (`findSpokenLines`), gives each
 * the nearest tag before it in its paragraph, decides from the attempt's
 * frozen Story Information whether that speaker is the main character, and
 * saves one speaker record per line. Nothing here ever rejects a chapter.
 */

/** The names the main character answers to, and every other declared name, as the writer was given them. */
export interface ProtagonistNames {
  names: string[];
  others: string[];
}

const unique = (values: Iterable<string>) => [...new Set([...values].map(value => value.trim()).filter(Boolean))];
const words = (label: string) => label.split(' ').filter(Boolean);

/**
 * The main character's names from the frozen Story Information: the cast entry
 * marked as the main character, with the aliases its identity and its current
 * canonical state carry. Without a main character, nobody is the protagonist.
 */
export function protagonistNames(
  story: Pick<CurrentStoryProjection, 'cast' | 'identities'>,
  characters: readonly CanonicalEntityState[] = [],
): ProtagonistNames {
  const main = unique((story.cast ?? []).filter(member => member.isMainCharacter).map(member => member.name));
  const mainKeys = new Set(main.map(normalizeIdentityLabel));
  const declared = [
    ...(story.identities ?? []).map(identity => ({ name: identity.name, aliases: identity.aliases ?? [] })),
    ...characters.map(character => ({ name: character.name, aliases: character.aliases ?? [] })),
  ];
  const names = unique([...main, ...declared.filter(entry => mainKeys.has(normalizeIdentityLabel(entry.name))).flatMap(entry => entry.aliases)]);
  const nameKeys = new Set(names.map(normalizeIdentityLabel));
  const others = unique([
    ...(story.cast ?? []).map(member => member.name),
    ...declared.flatMap(entry => [entry.name, ...entry.aliases]),
  ]).filter(name => !nameKeys.has(normalizeIdentityLabel(name)));
  return { names, others };
}

/**
 * Whether a tag names the main character: one of their names exactly (letter
 * case, accents and punctuation aside), or a single word of their name that
 * no other declared name shares ("Wei" for "Wei Lin").
 */
export function isProtagonist(speaker: string, protagonist: ProtagonistNames): boolean {
  const label = normalizeIdentityLabel(speaker);
  if (!label) return false;
  const keys = protagonist.names.map(normalizeIdentityLabel).filter(Boolean);
  if (keys.includes(label)) return true;
  if (words(label).length !== 1) return false;
  return keys.some(key => words(key).includes(label))
    && !protagonist.others.some(other => words(normalizeIdentityLabel(other)).includes(label));
}

export interface SpeakerPlacement {
  speakers: SpeakerAttachment[];
  /** Spoken lines no tag named. */
  untagged: number;
  /** Tags that named no spoken line. */
  unused: number;
}

/**
 * Places one speaker record on every spoken line a tag names. Each line takes
 * the nearest tag before it in its paragraph, or the paragraph's first tag
 * when none comes before it; a paragraph that opens by continuing a speech
 * the paragraph before never closed keeps that speaker.
 */
export function placeSpeakers({ paragraphs, protagonist }: {
  paragraphs: ReadonlyArray<{ blockId: string; text: string; speakers: readonly SpeakerTag[] }>;
  protagonist: ProtagonistNames;
}): SpeakerPlacement {
  const placed: SpeakerAttachment[] = [];
  let untagged = 0;
  let unused = 0;
  /** The speaker of a speech that ran on past the end of the paragraph before. */
  let continuing: string | undefined;
  for (const { blockId, text, speakers } of paragraphs) {
    const tags = [...speakers].sort((left, right) => left.offset - right.offset);
    const lines = findSpokenLines(text);
    const used = new Set<number>();
    const opening = text.length - text.trimStart().length;
    let carried: string | undefined;
    lines.forEach((line, index) => {
      let tag = -1;
      tags.forEach((candidate, position) => { if (candidate.offset <= line.start) tag = position; });
      if (tag < 0 && tags.length) tag = 0;
      if (tag >= 0) used.add(tag);
      const speaker = tag >= 0 ? tags[tag].name : index === 0 && line.start === opening ? continuing : undefined;
      if (!speaker) { untagged += 1; carried = undefined; return; }
      placed.push({
        id: speakerAttachmentId(blockId, line.start, line.end),
        kind: SPEAKER_KIND,
        anchor: { level: 'span', blockId, startOffset: line.start, endOffset: line.end, selectedText: text.slice(line.start, line.end) },
        payload: { origin: 'harness', speaker, protagonist: isProtagonist(speaker, protagonist) },
      });
      carried = line.closed ? undefined : speaker;
    });
    continuing = lines.length ? carried : undefined;
    unused += tags.length - used.size;
  }
  return { speakers: placed, untagged, unused };
}
