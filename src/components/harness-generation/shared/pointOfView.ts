import { findSpokenLines } from '../../../narrative/speech';
import type { NarrativePointOfView } from '../../../narrative/generation';
import type { ProtagonistNames } from './speakers';

/**
 * The story's point of view: whether its narration tells the main character's
 * story as "I" or by their name. The Style skill chooses it when the story
 * opens (the Japanese Style allows first person or close third), and later
 * chapters must keep it. The writer sees only recaps of earlier chapters,
 * never their prose, so it cannot see which one the story opened in; the
 * HARNESS reads it from the earliest committed chapter that shows it clearly
 * and tells every later chapter (`CurrentStoryProjection.pointOfView`).
 *
 * It reads English narration only, with spoken lines left out: first person
 * when "I", "me", "my" and "myself" come at least 8 times and at least twice
 * as often as the main character's names; third person when the names come at
 * least 8 times and at least twice as often as those words. Anything less
 * clear, another language, or no main character to count reads as nothing,
 * and the Style alone decides, as before.
 */

/** Fewer than this many signals never decide a point of view. */
const MIN_SIGNALS = 8;
/** How many times more often the deciding signal must come than the other. */
const MARGIN = 2;
const FIRST_PERSON = /^(?:I|I['’](?:m|ve|ll|d)|[Mm]e|[Mm]y|[Mm]yself)$/u;
const WORD = /[\p{L}\p{M}][\p{L}\p{M}\p{N}'’-]*/gu;

/** One paragraph's narration: its spoken lines replaced by spaces, so the words around them stay apart. */
const narrationOf = (paragraph: string) => {
  let narration = '';
  let from = 0;
  for (const line of findSpokenLines(paragraph)) {
    narration += `${paragraph.slice(from, line.start)} `;
    from = line.end;
  }
  return narration + paragraph.slice(from);
};

/**
 * The capitalised words of the main character's names that no other declared
 * name uses ("Jiuyan" and "Shen" for "Shen Jiuyan", unless someone else is a
 * Shen), so "the" in "the Iron Sect" or a shared family name is never them.
 */
const mainCharacterWords = (cast: ProtagonistNames) => {
  const partsOf = (name: string) => name.split(/\s+/u).filter(part => part.length > 1 && /^\p{Lu}/u.test(part));
  const others = new Set(cast.others.flatMap(partsOf));
  return new Set(cast.names.flatMap(partsOf).filter(part => !others.has(part)));
};

/** The point of view one chapter's narration shows clearly, if it shows one. */
export function chapterPointOfView(paragraphs: readonly string[], cast: ProtagonistNames): NarrativePointOfView | undefined {
  const named = mainCharacterWords(cast);
  let firstPerson = 0;
  let names = 0;
  for (const paragraph of paragraphs) {
    // A full name counts once: "Shen Jiuyan" is one mention, not two.
    let previousWasName = false;
    let previousEnd = -1;
    const narration = narrationOf(paragraph);
    for (const match of narration.matchAll(WORD)) {
      const word = match[0];
      const bare = word.replace(/['’]s$/u, '');
      const isName = named.has(bare);
      if (FIRST_PERSON.test(word)) firstPerson += 1;
      else if (isName && !(previousWasName && /^\s+$/u.test(narration.slice(previousEnd, match.index)))) names += 1;
      previousWasName = isName;
      previousEnd = match.index + word.length;
    }
  }
  if (firstPerson >= MIN_SIGNALS && firstPerson >= MARGIN * names) return 'first-person';
  if (names >= MIN_SIGNALS && names >= MARGIN * firstPerson) return 'third-person';
  return undefined;
}

/**
 * The point of view a story opened in: the earliest committed chapter, in
 * chapter order, whose narration shows one clearly. English stories only.
 */
export function storyPointOfView(
  chapters: ReadonlyArray<{ chapterNumber: number; paragraphs: readonly string[] }>,
  cast: ProtagonistNames,
  language: string,
): NarrativePointOfView | undefined {
  if (language !== 'en') return undefined;
  for (const chapter of [...chapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) {
    const pointOfView = chapterPointOfView(chapter.paragraphs, cast);
    if (pointOfView) return pointOfView;
  }
  return undefined;
}
