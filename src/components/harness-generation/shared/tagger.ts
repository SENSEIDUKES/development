import { worldCardsOfKind, type WorldRecord } from '../../../narrative/worldRecord';
import type { CodexEntry, CodexEntryKind, HoldingsSection } from '../../../narrative/holdings';
import type { HarnessChapter, HarnessTagRequest, HarnessTagSubject } from '../../../narrative/generation';
import type { SoundWord } from '../../../audio/soundWords';
import type { SoundtrackVocabulary } from '../../../audio/soundtrackVocabulary';
import type { HarnessWarning } from '../../../narrative/generation';
import { readMarks } from '../../../narrative/marks';
import { normalizeIdentityLabel } from './canonicalProjection';
import { acceptChapterTags, type HarnessResponseAcceptanceOptions } from './responseAcceptance';

/**
 * The tagger in the HARNESS (SENSEI, 2026-10-24): the chapter is written
 * first, and one call afterwards reads it and writes the app's tags into it.
 *
 * This side plans that call and reads its answer. Everything it sends is
 * something a chapter has on its own: the prose, who and what the story
 * already holds, what each character was carrying, and the words the tagger
 * may name. Nothing here touches the Foundation, the arc or the Story
 * Information Packet, because a chapter an author wrote themselves has none of
 * those and must tag exactly as well.
 *
 * The answer is the same paragraphs with tags written in. That is what lets
 * the HARNESS check the tagger rather than trust it: the tags are read and
 * removed the way they always are, and the prose that comes back out is
 * compared to the prose that went in. A tagger that changed a word is refused.
 */

/** The world card kinds that are also Codex kinds: the only ones a tag can name today. */
const CARD_KIND_SUBJECTS: ReadonlyArray<CodexEntryKind> = ['character', 'thing', 'ability'];

/**
 * Who and what the story already has, for the one list that keeps a tag from
 * inventing a second identity: its Codex entries, then the world record's
 * cards for anything no chapter has tagged yet. A name the story holds twice
 * is listed once, and the Codex wins, because its entry is the identity a tag
 * actually resolves to.
 */
export function tagSubjectsOfStory({ entries, world }: {
  entries: readonly CodexEntry[];
  world?: WorldRecord;
}): HarnessTagSubject[] {
  const subjects: HarnessTagSubject[] = [];
  const taken = new Set<string>();
  const add = (subject: HarnessTagSubject) => {
    const key = `${subject.kind}:${normalizeIdentityLabel(subject.name)}`;
    if (!subject.name.trim() || taken.has(key)) return;
    taken.add(key);
    subjects.push(subject);
  };
  for (const entry of entries) {
    add({
      name: entry.name,
      kind: entry.kind,
      ...(entry.aliases?.length ? { aliases: [...entry.aliases] } : {}),
      ...(entry.mainCharacter ? { mainCharacter: true as const } : {}),
    });
  }
  for (const kind of CARD_KIND_SUBJECTS) {
    for (const card of worldCardsOfKind(world, kind)) {
      add({
        name: card.name,
        kind,
        ...(card.aliases?.length ? { aliases: [...card.aliases] } : {}),
        ...(card.mainCharacter ? { mainCharacter: true as const } : {}),
      });
    }
  }
  return subjects;
}

/**
 * The tagger's call for one chapter. The chapter's own paragraphs are sent as
 * they stand: a chapter already tagged is tagged again from its clean prose,
 * which is what makes re-tagging an existing chapter the same operation as
 * tagging a new one.
 */
export function planChapterTagging({ chapter, entries, world, holdings, soundWords, soundtrack, language, model }: {
  chapter: Pick<HarnessChapter, 'id' | 'storyId' | 'chapterNumber' | 'paragraphs'>;
  entries: readonly CodexEntry[];
  world?: WorldRecord;
  /** What each character had going into this chapter. */
  holdings?: HoldingsSection;
  soundWords?: readonly SoundWord[];
  soundtrack?: SoundtrackVocabulary;
  language: string;
  model: string;
}): HarnessTagRequest {
  return {
    operation: 'tag-chapter',
    storyId: chapter.storyId,
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    model,
    language,
    paragraphs: [...chapter.paragraphs],
    subjects: tagSubjectsOfStory({ entries, world }),
    ...(holdings?.characters.length ? { holdings } : {}),
    ...(soundWords?.length ? { soundWords: [...soundWords] } : {}),
    ...(soundtrack ? { soundtrack } : {}),
  };
}

/** What one tagging call produced, or why it produced nothing. */
export type ChapterTagging =
  | {
      status: 'tagged';
      at: string;
      model?: string;
      soundCues: ReturnType<typeof acceptChapterTags>['soundCues'];
      speakers: ReturnType<typeof acceptChapterTags>['speakers'];
      holdingChanges: ReturnType<typeof acceptChapterTags>['holdingChanges'];
      appearances: ReturnType<typeof acceptChapterTags>['appearances'];
      scene: ReturnType<typeof acceptChapterTags>['scene'];
      warnings: HarnessWarning[];
    }
  | { status: 'failed'; at: string; model?: string; problem: string; warnings: HarnessWarning[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * A paragraph as the tag reader leaves it with no tag in it: what the clean
 * text of a tagged answer is compared against, and the text every attachment's
 * offsets are measured from.
 */
const cleanForm = (paragraph: string) => readMarks(paragraph).text;

/**
 * The paragraph the tagger changed, when it changed one.
 *
 * The comparison is exact, not trimmed. Trimming either side would accept an
 * answer whose attachments no longer line up with the chapter: a paragraph sent
 * as `  "Run!"` comes back from the tag reader as `"Run!"`, so a speaker
 * anchored at offset 0 would point two characters before the speech it names,
 * and the Reader would voice or highlight the wrong span. A tag that leaves a
 * space behind is still no change, because the tag reader trims what it returns
 * and the paragraph it is compared to is read the same way.
 */
const changedParagraph = (sent: readonly string[], back: readonly string[]) => {
  if (sent.length !== back.length) {
    return `the chapter has ${sent.length} paragraph${sent.length === 1 ? '' : 's'} and ${back.length} came back`;
  }
  const at = sent.findIndex((paragraph, index) => cleanForm(paragraph) !== back[index]);
  return at === -1 ? undefined : `paragraph ${at + 1} came back with different words`;
};

/**
 * A paragraph the chapter cannot be tagged from: one the tag reader would not
 * leave as it is, such as a paragraph with space around it or nothing but
 * space. Every attachment's offsets are measured from the text the tag reader
 * returns, so tagging such a paragraph would place its tags at the wrong
 * character of the chapter the reader actually has. A committed chapter never
 * holds one (`harnessChapterBody` trims every paragraph and drops the empty
 * ones); a chapter brought in from somewhere else can, so it is refused and
 * named rather than quietly misplaced.
 */
const untaggableParagraph = (sent: readonly string[]) => {
  const at = sent.findIndex(paragraph => paragraph !== cleanForm(paragraph));
  return at === -1 ? undefined : `paragraph ${at + 1} is not the prose the reader has (space around it, or nothing but space), and a tag on it would land on the wrong words`;
};

/**
 * Reads one tagging answer. The tags are read and placed through the same path
 * the writer's own reply goes through; then the prose that falls out of it is
 * checked against the prose that was sent, and an answer that changed a word
 * of the chapter is refused whole.
 *
 * Refused whole, and not paragraph by paragraph, on purpose: a tagger that
 * rewrote a paragraph did not understand the one thing it was told, so its
 * other paragraphs' tags are not worth keeping either. The chapter is already
 * committed and keeps every word; only the tagging is lost, and it can be run
 * again.
 */
export function readChapterTagging({ raw, sent, chapterNumber, at, model, options }: {
  raw: string | undefined;
  /** The paragraphs the tagger was given, to check its answer against. */
  sent: readonly string[];
  chapterNumber: number;
  at: string;
  model?: string;
  options?: HarnessResponseAcceptanceOptions;
}): ChapterTagging {
  const failed = (problem: string, warnings: HarnessWarning[] = []): ChapterTagging =>
    ({ status: 'failed', at, ...(model ? { model } : {}), problem, warnings });
  let parsed: unknown;
  try { parsed = JSON.parse(raw ?? ''); } catch { return failed('The answer was not readable JSON.'); }
  if (!isRecord(parsed) || !Array.isArray(parsed.paragraphs)) return failed('The answer held no paragraphs.');
  const tagged = parsed.paragraphs.filter((paragraph): paragraph is string => typeof paragraph === 'string');
  if (tagged.length !== parsed.paragraphs.length) return failed('The answer held a paragraph that was not text.');
  const untaggable = untaggableParagraph(sent);
  if (untaggable) return failed(`This chapter cannot be tagged as it stands: ${untaggable}.`);
  const warnings: HarnessWarning[] = [];
  const read = acceptChapterTags(tagged, chapterNumber, warnings, options);
  const changed = changedParagraph(sent, read.paragraphs);
  if (changed) return failed(`The chapter is not the tagger's to change: ${changed}, so every tag it wrote was dropped.`, warnings);
  return {
    status: 'tagged',
    at,
    ...(model ? { model } : {}),
    soundCues: read.soundCues,
    speakers: read.speakers,
    holdingChanges: read.holdingChanges,
    appearances: read.appearances,
    scene: read.scene,
    warnings,
  };
}
