import type { SpeakerTag } from '../../../narrative/marks';
import { findSpokenLines, MAIN_CHARACTER_SPEAKER_TAG, SPEAKER_KIND, speakerAttachmentId, type SpeakerAttachment } from '../../../narrative/speech';
import type { CanonicalEntityState, CurrentStoryProjection } from '../../../narrative/generation';
import { normalizeIdentityLabel } from './canonicalProjection';

/**
 * Speakers: who speaks each spoken line of a chapter, in the tiny SEN
 * language. The writer puts a speaker tag before the speech it names: the
 * main character's own, `[[@MC]]`, or `[[@Name]]` for anyone else. The HARNESS
 * finds the spoken lines (`findSpokenLines`), gives each the nearest tag
 * before it in its paragraph, and saves one speaker record per line; a name
 * tag is also checked against the attempt's frozen Story Information, in case
 * it names the main character. Nothing here ever rejects a chapter.
 */

/** The names the main character answers to, and every other declared name, as the writer was given them. */
export interface ProtagonistNames {
  names: string[];
  others: string[];
}

/** The main character's own tag, `[[@MC]]`, and the plain words a writer may spell it with. */
const MAIN_CHARACTER_LABELS = new Set([MAIN_CHARACTER_SPEAKER_TAG.toLowerCase(), 'main character']);
/** Who an `[[@MC]]` line is said by when the Story Information names no main character. */
const UNNAMED_MAIN_CHARACTER = 'Main character';

/** Whether a speaker tag is the main character's own, `[[@MC]]`. */
export const isMainCharacterTag = (speaker: string) => MAIN_CHARACTER_LABELS.has(normalizeIdentityLabel(speaker));

const unique = (values: Iterable<string>) => [...new Set([...values].map(value => value.trim()).filter(Boolean))];
const words = (label: string) => label.split(' ').filter(Boolean);
/** Whether `part` appears, word for word and in order, inside `name`. */
const holdsPart = (name: readonly string[], part: readonly string[]) =>
  part.length > 0 && name.some((_, start) => part.every((word, offset) => name[start + offset] === word));

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
 * Whether a tag names the main character: their own tag, `[[@MC]]`; one of
 * their names exactly (letter case, accents and punctuation aside); or a part
 * of one of their names, word for word, that no other declared name shares
 * ("Wei" for "Wei Lin", "Jin-Woo" for "Sung Jin-Woo").
 */
export function isProtagonist(speaker: string, protagonist: ProtagonistNames): boolean {
  if (isMainCharacterTag(speaker)) return true;
  const label = normalizeIdentityLabel(speaker);
  if (!label) return false;
  const keys = protagonist.names.map(normalizeIdentityLabel).filter(Boolean);
  if (keys.includes(label)) return true;
  const part = words(label);
  const holds = (name: string) => holdsPart(words(name), part);
  return keys.some(holds) && !protagonist.others.some(other => holds(normalizeIdentityLabel(other)));
}

/** Words from the instructions' tag forms, never a speaker: a writer that copies one has named nobody. */
const PLACEHOLDER_SPEAKERS = new Set(['name', 'speaker', 'character', 'someone', 'their name', 'character name', 'speaker name']);

/**
 * Whether a tag names nobody: a placeholder copied from a tag form
 * (`[[@Name]]`), unless the story really has someone by that name.
 */
export const isPlaceholderSpeaker = (speaker: string, protagonist: ProtagonistNames) => {
  const label = normalizeIdentityLabel(speaker);
  return PLACEHOLDER_SPEAKERS.has(label)
    && ![...protagonist.names, ...protagonist.others].some(name => normalizeIdentityLabel(name) === label);
};

export interface SpeakerPlacement {
  speakers: SpeakerAttachment[];
  /** Spoken lines no tag named. */
  untagged: number;
  /** Tags that named no spoken line. */
  unused: number;
  /** Placeholder tags (`[[@Name]]`) read as no tag: their lines take the speaker from the narration. */
  placeholders: number;
}

/** Who a tag says is speaking: the main character's own tag is saved under the name the story gives them. */
const speakerOf = (tag: string, protagonist: ProtagonistNames) => ({
  speaker: isMainCharacterTag(tag) ? protagonist.names[0] ?? UNNAMED_MAIN_CHARACTER : tag,
  protagonist: isProtagonist(tag, protagonist),
});

/**
 * Places one speaker record on every spoken line a tag names. Each line takes
 * the nearest tag before it in its paragraph, or the paragraph's first tag
 * when none comes before it; a paragraph that opens by continuing a speech
 * the paragraph before never closed keeps that speaker. A placeholder copied
 * from a tag form (`[[@Name]]`) counts as no tag.
 */
export function placeSpeakers({ paragraphs, protagonist }: {
  paragraphs: ReadonlyArray<{ blockId: string; text: string; speakers: readonly SpeakerTag[] }>;
  protagonist: ProtagonistNames;
}): SpeakerPlacement {
  const placed: SpeakerAttachment[] = [];
  let untagged = 0;
  let unused = 0;
  let placeholders = 0;
  /** The speaker of a speech that ran on past the end of the paragraph before. */
  let continuing: ReturnType<typeof speakerOf> | undefined;
  for (const { blockId, text, speakers } of paragraphs) {
    const named = speakers.filter(tag => !isPlaceholderSpeaker(tag.name, protagonist));
    placeholders += speakers.length - named.length;
    const tags = [...named].sort((left, right) => left.offset - right.offset);
    const lines = findSpokenLines(text);
    const used = new Set<number>();
    const opening = text.length - text.trimStart().length;
    let carried: ReturnType<typeof speakerOf> | undefined;
    lines.forEach((line, index) => {
      let tag = -1;
      tags.forEach((candidate, position) => { if (candidate.offset <= line.start) tag = position; });
      if (tag < 0 && tags.length) tag = 0;
      if (tag >= 0) used.add(tag);
      const who = tag >= 0 ? speakerOf(tags[tag].name, protagonist) : index === 0 && line.start === opening ? continuing : undefined;
      if (!who) { untagged += 1; carried = undefined; return; }
      placed.push({
        id: speakerAttachmentId(blockId, line.start, line.end),
        kind: SPEAKER_KIND,
        anchor: { level: 'span', blockId, startOffset: line.start, endOffset: line.end, selectedText: text.slice(line.start, line.end) },
        payload: { origin: 'harness', speaker: who.speaker, protagonist: who.protagonist },
      });
      carried = line.closed ? undefined : who;
    });
    continuing = lines.length ? carried : undefined;
    unused += tags.length - used.size;
  }
  return { speakers: placed, untagged, unused, placeholders };
}
