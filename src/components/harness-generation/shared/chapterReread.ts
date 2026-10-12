import { readMarks } from '../../../narrative/marks';
import type { CodexEntry, HoldingChangeAttachment } from '../../../narrative/holdings';
import type { SpeakerAttachment } from '../../../narrative/speech';
import type { HarnessChapter } from '../../../narrative/generation';
import { harnessParagraphBlockId } from './chapterBody';
import { placeHoldingChanges, resolveHoldingChanges, type DeclaredCharacter } from './holdings';
import { placeSpeakers, type ProtagonistNames } from './speakers';

/**
 * The reread: a chapter the reader changed in Create mode is read again once,
 * when it is sealed (the next chapter is written), so what the story remembers
 * of it matches the words the reader kept. The model returns the chapter's
 * paragraphs word for word with the tags put back (speakers, holdings), the
 * main character's closing list and a fresh recap; the HARNESS puts those back
 * on the edited words. A chapter that was only read is never reread.
 */

/** A chapter is reread when the reader changed it and it has not been reread since. */
export const needsReread = (chapter: Pick<HarnessChapter, 'authoring'> | undefined): boolean =>
  Boolean(chapter?.authoring?.editedAt && !chapter.authoring.reread);

export interface ChapterRereadInput {
  chapter: HarnessChapter;
  /** The model's raw reply. */
  reply: string;
  /** Which tags the chapter was written with: only those are read back. */
  speakers: boolean;
  holdings: boolean;
  protagonist: ProtagonistNames;
  locale?: string;
  /** The story's Codex entries, which the reread's holding changes resolve to. */
  entries: readonly CodexEntry[];
  declared: readonly DeclaredCharacter[];
  createdAt: string;
  createId: () => string;
}

export interface ChapterRereadResult {
  chapter: HarnessChapter;
  /** The story's entries after the reread: an entry only this chapter's old tags made, and no longer names, is gone. */
  entries: CodexEntry[];
  warnings: string[];
}

const blockOf = (attachment: { anchor: { blockId: string } }) => attachment.anchor.blockId;

/**
 * Puts the reread's tags back on the chapter's own words. A paragraph whose
 * words the model changed is not trusted: it keeps the speakers and holding
 * changes it had. Throws when the reply cannot be read at all, or has a
 * different number of paragraphs.
 */
export function applyChapterReread(input: ChapterRereadInput): ChapterRereadResult {
  const { chapter, locale } = input;
  let parsed: { paragraphs?: unknown; mainCharacterHoldings?: unknown; recap?: unknown };
  try {
    parsed = JSON.parse(input.reply.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    throw new Error('The reread could not be read.');
  }
  const paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : undefined;
  if (!paragraphs || paragraphs.length !== chapter.paragraphs.length) {
    throw new Error(`The reread returned ${paragraphs?.length ?? 0} paragraphs; the chapter has ${chapter.paragraphs.length}.`);
  }
  const warnings: string[] = [];
  // Each paragraph's tags count only when its words are exactly the chapter's.
  const read = paragraphs.map((value, index) => {
    const blockId = harnessParagraphBlockId(chapter.chapterNumber, index);
    const reading = readMarks(typeof value === 'string' ? value : '');
    return { blockId, text: chapter.paragraphs[index], reading, same: reading.text === chapter.paragraphs[index] };
  });
  const changed = new Set(read.filter(paragraph => !paragraph.same).map(paragraph => paragraph.blockId));
  if (changed.size) warnings.push(`${changed.size} paragraph${changed.size === 1 ? '' : 's'} came back with different words, so ${changed.size === 1 ? 'it keeps' : 'they keep'} the tags ${changed.size === 1 ? 'it' : 'they'} had`);
  const trusted = read.filter(paragraph => paragraph.same);

  const next: HarnessChapter = structuredClone(chapter);
  if (input.speakers) {
    const placed = placeSpeakers({ paragraphs: trusted.map(({ blockId, text, reading }) => ({ blockId, text, speakers: reading.speakers })), protagonist: input.protagonist });
    const kept = (chapter.speakers ?? []).filter(speaker => changed.has(blockOf(speaker)));
    const speakers: SpeakerAttachment[] = [...placed.speakers, ...kept];
    if (speakers.length) next.speakers = speakers;
    else delete next.speakers;
  }

  let entries = [...input.entries];
  if (input.holdings) {
    const placed = placeHoldingChanges({ paragraphs: trusted.map(({ blockId, text, reading }) => ({ blockId, text, wordTags: reading.wordTags })), locale });
    warnings.push(...placed.problems);
    const resolved = resolveHoldingChanges({
      storyId: chapter.storyId, chapter: { id: chapter.id, chapterNumber: chapter.chapterNumber },
      changes: placed.changes, entries, declared: input.declared, createdAt: input.createdAt, createId: input.createId,
    });
    const kept = (chapter.holdingChanges ?? []).filter(change => changed.has(blockOf(change)));
    const changes: HoldingChangeAttachment[] = [...resolved.changes, ...kept];
    if (changes.length) next.holdingChanges = changes;
    else delete next.holdingChanges;
    entries = [...entries, ...resolved.created];
    // An entry only this chapter's tags made, that no change of this chapter names any more, goes with them.
    const named = new Set(changes.flatMap(change => [change.payload.holder.entryId, change.payload.target?.entryId]).filter(Boolean));
    entries = entries.filter(entry => !(entry.origin.source === 'tag' && entry.origin.chapterId === chapter.id && !named.has(entry.id)));
    const closing = parsed.mainCharacterHoldings;
    if (Array.isArray(closing) && closing.every(item => typeof item === 'string')) {
      const list = closing.map(item => readMarks(item).text).filter(Boolean);
      if (list.length) next.closingHoldings = list;
      else delete next.closingHoldings;
    }
  }

  // The recap follows the words the reader kept, unless the author wrote it themselves.
  const recap = typeof parsed.recap === 'string' ? readMarks(parsed.recap).text : '';
  if (recap && chapter.recap?.source !== 'author') next.recap = { text: recap, source: 'model', updatedAt: input.createdAt };
  return { chapter: next, entries, warnings };
}
