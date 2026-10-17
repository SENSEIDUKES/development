import { splitSentences } from '../../highlight-engine/shared/manuscript';
import {
  CHARACTER_LOOK_TRAITS,
  THING_LOOK_TRAITS,
  type AppearanceAttachment,
  type AppearanceEntity,
  type ChapterLooks,
  type DescribedLook,
  type LookTrait,
} from '../../../narrative/appearances';
import type { CodexEntry } from '../../../narrative/holdings';
import type { CurrentStoryProjection, HarnessChapter, HarnessLookSubject } from '../../../narrative/generation';
import { normalizeIdentityLabel } from './canonicalProjection';
import { deriveAppearances, describableAppearances, type AppearanceSubject } from './appearances';

/**
 * The look step, after a chapter commits: each appearance the rules accept
 * becomes one small subject (who or what, the passage that shows it, the look
 * the story's author declared, the look the record held before), and one short
 * call writes each look down. It reads passages, never the whole chapter. Its
 * answer is read leniently and kept within limits; a failed call records why
 * and leaves the chapter as it was committed.
 */

/** The most appearances one call describes: the chapter's first, in reading order. */
export const LOOK_SUBJECT_LIMIT = 12;
/** The most characters of passage one appearance carries: its sentence and those after it. */
export const LOOK_PASSAGE_CHARACTERS = 900;
/** The most characters of the author's declared notes on one subject. */
export const LOOK_DECLARED_CHARACTERS = 700;
/** The longest look kept: its one line, and each trait, in words. */
export const LOOK_SUMMARY_WORDS = 30;
export const LOOK_TRAIT_WORDS = 14;

/** The traits a look of each kind is told by. */
export const LOOK_TRAITS: Readonly<Record<AppearanceEntity, readonly LookTrait[]>> = {
  character: CHARACTER_LOOK_TRAITS,
  thing: THING_LOOK_TRAITS,
};

const paragraphAt = (chapter: Pick<HarnessChapter, 'paragraphs'>, blockId: string) => Number(blockId.match(/-p(\d+)$/)?.[1] ?? 0) - 1;

/**
 * The passage that shows an appearance: its sentence, the rest of its
 * paragraph and the next, cut at a sentence's end within the limit.
 */
export function lookPassage(chapter: Pick<HarnessChapter, 'paragraphs'>, appearance: AppearanceAttachment, locale?: string): string {
  const index = paragraphAt(chapter, appearance.anchor.blockId);
  const paragraph = chapter.paragraphs[index];
  if (paragraph === undefined) return appearance.anchor.selectedText;
  const text = [paragraph.slice(appearance.anchor.startOffset), chapter.paragraphs[index + 1]].filter(Boolean).join('\n\n').trim();
  if (text.length <= LOOK_PASSAGE_CHARACTERS) return text;
  const fits = splitSentences(text, locale).filter(sentence => sentence.end <= LOOK_PASSAGE_CHARACTERS).at(-1);
  return fits ? text.slice(0, fits.end).trim() : `${text.slice(0, LOOK_PASSAGE_CHARACTERS).trimEnd()}…`;
}

/** What the story's author declared about a character: its identity's notes, by name or alias. */
const declaredNotes = (identities: CurrentStoryProjection['identities'], names: readonly string[]) => {
  const keys = new Set(names.map(normalizeIdentityLabel).filter(Boolean));
  const notes = identities?.find(identity => identity.kind === 'character'
    && [identity.name, ...(identity.aliases ?? [])].some(name => keys.has(normalizeIdentityLabel(name))))?.evidence.trim();
  if (!notes) return undefined;
  return notes.length <= LOOK_DECLARED_CHARACTERS ? notes : `${notes.slice(0, LOOK_DECLARED_CHARACTERS).trimEnd()}…`;
};

/**
 * The subjects one committed chapter's look step describes: every appears and
 * look tag the rules accept, in reading order, up to the limit. Each carries
 * its passage; a character, the author's declared notes; a change of look, the
 * look the record held before it.
 */
export function planLookSubjects({ chapter, chapters, entries, identities, locale }: {
  chapter: HarnessChapter;
  /** The story's committed chapters, this one included. */
  chapters: readonly HarnessChapter[];
  /** The story's Codex entries. */
  entries: readonly CodexEntry[];
  identities?: CurrentStoryProjection['identities'];
  locale?: string;
}): HarnessLookSubject[] {
  const state = deriveAppearances({ entries, chapters: chapters.filter(entry => entry.storyId === chapter.storyId) });
  return describableAppearances(state, chapter.id).slice(0, LOOK_SUBJECT_LIMIT).flatMap(({ appearanceId, subject }): HarnessLookSubject[] => {
    const appearance = chapter.appearances?.find(entry => entry.id === appearanceId);
    if (!appearance) return [];
    const entry = subject.entryId ? entries.find(candidate => candidate.id === subject.entryId) : undefined;
    const declared = subject.entity === 'character' ? declaredNotes(identities, entry ? [entry.name, ...(entry.aliases ?? [])] : [subject.name]) : undefined;
    // The look before this chapter's: written down by an earlier chapter's look step.
    const previous = appearance.payload.event === 'look'
      ? subject.looks.filter(look => look.passage.chapterNumber < chapter.chapterNumber).at(-1)
      : undefined;
    return [{
      id: appearance.id,
      name: subject.name,
      entity: subject.entity,
      event: appearance.payload.event,
      ...(appearance.payload.change ? { change: appearance.payload.change } : {}),
      passage: lookPassage(chapter, appearance, locale),
      ...(declared ? { declared } : {}),
      ...(previous ? { previous: { summary: previous.summary, traits: { ...previous.traits } } } : {}),
    }];
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * A few words of the answer, trimmed: one that runs long is cut to the limit,
 * never thrown away (Blade Chapter 17 lost every look to one long line).
 * Nothing when it is empty or holds a tag.
 */
const words = (value: unknown, limit: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || /\[\[|\]\]/.test(text)) return undefined;
  const all = text.split(' ');
  return all.length <= limit ? text : `${all.slice(0, limit).join(' ').replace(/[,;:]$/, '')}…`;
};

/**
 * The looks a reply wrote down, read leniently: only subjects that were asked
 * about, each once, with a one-line summary; only the traits its kind is told
 * by, each a few words. Anything else is no look.
 */
export function readDescribedLooks(raw: string | undefined, subjects: readonly HarnessLookSubject[]): DescribedLook[] {
  let parsed: unknown;
  try { parsed = JSON.parse(raw ?? ''); } catch { return []; }
  const looks = isRecord(parsed) && Array.isArray(parsed.looks) ? parsed.looks : [];
  const asked = new Map(subjects.map(subject => [subject.id, subject]));
  const written = new Map<string, DescribedLook>();
  for (const look of looks) {
    if (!isRecord(look)) continue;
    // One subject asked about, one look answered: it is that subject's, whatever id the model wrote.
    const subject = typeof look.id === 'string' && asked.has(look.id) ? asked.get(look.id)
      : subjects.length === 1 && looks.length === 1 ? subjects[0] : undefined;
    const summary = words(look.summary, LOOK_SUMMARY_WORDS);
    if (!subject || !summary || written.has(subject.id)) continue;
    const given = isRecord(look.traits) ? look.traits : {};
    const traits: DescribedLook['traits'] = {};
    for (const trait of LOOK_TRAITS[subject.entity]) {
      const value = words(given[trait], LOOK_TRAIT_WORDS);
      if (value) traits[trait] = value;
    }
    const conflict = words(look.conflict, LOOK_SUMMARY_WORDS);
    written.set(subject.id, { appearanceId: subject.id, summary, traits, ...(conflict ? { conflict } : {}) });
  }
  // In the order they were asked about, which is reading order.
  return subjects.flatMap(subject => written.get(subject.id) ?? []);
}

/** What the look step keeps on the chapter: the looks written down, or why none were. */
export function chapterLooks({ subjects, raw, error, model, at }: {
  subjects: readonly HarnessLookSubject[];
  raw?: string;
  error?: string;
  model?: string;
  at: string;
}): ChapterLooks {
  if (error) return { status: 'failed', at, ...(model ? { model } : {}), looks: [], problem: error };
  const looks = readDescribedLooks(raw, subjects);
  return looks.length || !subjects.length
    ? { status: 'described', at, ...(model ? { model } : {}), looks }
    : { status: 'failed', at, ...(model ? { model } : {}), looks: [], problem: 'The answer held no look that could be read.' };
}

/** The most characters of passages one on-demand look reads: the first appearance and the latest changes. */
export const CODEX_LOOK_PASSAGE_CHARACTERS = 2_400;

/**
 * The one subject an on-demand look is written from (SENSEI, 2026-10-17):
 * one character or thing, every passage that shows it in story order (its
 * first appearance, then each change of look), and, for a character, the
 * author's notes. The passages are the writer's own words, kept by code when
 * each chapter committed; this reads only them, never a chapter. The subject's
 * id is its Codex entry's.
 */
export function planCodexLook({ subject, identities, names }: {
  subject: Pick<AppearanceSubject, 'entryId' | 'key' | 'name' | 'entity' | 'first' | 'changes'>;
  identities?: CurrentStoryProjection['identities'];
  /** The entry's names, its aliases included, to find the author's notes. */
  names?: readonly string[];
}): HarnessLookSubject {
  const lines = [
    `Chapter ${subject.first.chapterNumber}, first on the page: ${subject.first.description ?? subject.first.text}`,
    ...subject.changes.map(change => `Chapter ${change.passage.chapterNumber}, look changed (${change.change}): ${change.passage.description ?? change.passage.text}`),
  ];
  // The first appearance always; then the latest changes that fit, since the look is how it stands after the last.
  const kept = [lines[0]];
  let room = CODEX_LOOK_PASSAGE_CHARACTERS - lines[0].length;
  const recent: string[] = [];
  for (const line of lines.slice(1).reverse()) {
    if (line.length > room) break;
    recent.unshift(line);
    room -= line.length;
  }
  const declared = subject.entity === 'character' ? declaredNotes(identities, names ?? [subject.name]) : undefined;
  return {
    id: subject.entryId ?? subject.key,
    name: subject.name,
    entity: subject.entity,
    event: 'appears',
    passage: [...kept, ...recent].join('\n'),
    ...(declared ? { declared } : {}),
  };
}


