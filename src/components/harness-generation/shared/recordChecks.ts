import { splitSentences } from '../../highlight-engine/shared/manuscript';
import { APPEARANCE_KIND, appearanceId, type AppearanceAttachment } from '../../../narrative/appearances';
import type { CodexEntry } from '../../../narrative/holdings';
import type { HarnessChapter, HarnessHoldingsFix, HarnessHoldingsFixCase, HarnessRecordCheckKind } from '../../../narrative/generation';
import { readMarks } from '../../../narrative/marks';
import { STATUS_KIND, statusId, type StatusAttachment, type StatusPayload } from '../../../narrative/statuses';
import type { WorldRecord } from '../../../narrative/worldRecord';
import { normalizeIdentityLabel } from './canonicalProjection';
import { harnessParagraphBlockId } from './chapterBody';
import { createCodexEntryResolver, pointedSentence, type DeclaredCharacter } from './holdings';
import { resolveAppearances } from './appearances';
import { isMainCharacterTag } from './speakers';
import { deriveStatuses, readStatusTag, resolveStatuses } from './statuses';

/**
 * The fixer's record checks (SENSEI, 2026-11-04): the same one fixer, with
 * three more plain rules besides the holdings ones. Each finds a problem with
 * no model, and only a problem found becomes a small case for the same one
 * short call:
 *
 * - someone who speaks for the first time in this chapter but has never
 *   appeared (the Dean who speaks eight lines and is on no card);
 * - a name in this chapter's prose that no card has, sharing a word with one
 *   character's name (Inspector Wei, while his card still says Summit
 *   Inspector);
 * - someone whose status is dead who speaks or acts in this chapter.
 *
 * A fix stands only when the same rule no longer finds the problem.
 */

/** One problem a record check found, keyed so the same rule can say it is gone. */
export interface RecordFlag {
  kind: HarnessRecordCheckKind;
  message: string;
  key: string;
}

type Mention = { id: string; blockId: string; start: number; end: number };

/** A record case the fixer is asked about, with where its answer applies. */
export type RecordFixPlanCase =
  | { kind: 'appearance'; case: HarnessHoldingsFixCase; flags: RecordFlag[]; name: string; mentions: Mention[] }
  | { kind: 'name'; case: HarnessHoldingsFixCase; flags: RecordFlag[]; entryId: string; name: string }
  | { kind: 'status'; case: HarnessHoldingsFixCase; flags: RecordFlag[]; name: string; blockId: string; start: number; end: number };

/** At most this many name cases in one chapter: the names it uses most. */
const NAME_CASE_LIMIT = 3;
/** Sentences, at most, a missed-appearance case offers. */
const APPEARANCE_MENTION_LIMIT = 3;

/** A status that means the character is dead. */
const DEAD_STATUS = /\b(dead|died|deceased|killed|slain|perished|executed|murdered|lifeless)\b/i;

/** Words that start a sentence or a phrase, never a name. */
const LEADING_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'even', 'for', 'from', 'her', 'here', 'his', 'if', 'in', 'into', 'its', 'my', 'now', 'of',
  'on', 'only', 'or', 'our', 'so', 'still', 'that', 'the', 'their', 'then', 'there', 'these', 'this', 'those', 'though', 'to', 'when',
  'where', 'while', 'with', 'yet', 'your', 'no', 'not', 'yes', 'what', 'who', 'why', 'how',
]);

const key = normalizeIdentityLabel;
const namesOf = (entry: Pick<CodexEntry, 'name' | 'aliases'>) => [entry.name, ...(entry.aliases ?? [])];
const answersTo = (names: readonly string[], name: string) => Boolean(key(name)) && names.some(candidate => key(candidate) === key(name));
/** Whether a sentence names one of these names, as whole words. */
const names = (text: string, list: readonly string[]) => {
  const padded = ` ${key(text)} `;
  return list.some(name => key(name) && padded.includes(` ${key(name)} `));
};

interface Place { blockId: string; paragraph: number; start: number; end: number }
const before = (left: Place, right: Place) => left.paragraph < right.paragraph || (left.paragraph === right.paragraph && left.start < right.start);

/** The sentence at an offset of a chapter's paragraph, with the sentences around it. */
function sentenceAt(chapter: HarnessChapter, blockId: string, offset: number, locale?: string) {
  const paragraph = chapter.paragraphs.findIndex((_, index) => harnessParagraphBlockId(chapter.chapterNumber, index) === blockId);
  const text = chapter.paragraphs[paragraph];
  if (text === undefined) return undefined;
  const sentences = splitSentences(text, locale);
  const sentence = pointedSentence(sentences, offset);
  if (!sentence) return undefined;
  const at = sentences.indexOf(sentence);
  const slice = (position: number) => (position >= 0 && position < sentences.length ? text.slice(sentences[position].start, sentences[position].end) : undefined);
  return { blockId, paragraph, start: sentence.start, end: sentence.end, text: text.slice(sentence.start, sentence.end), before: slice(at - 1), after: slice(at + 1) };
}

/** Every sentence of a chapter, in reading order. */
function sentencesOf(chapter: HarnessChapter, locale?: string) {
  return chapter.paragraphs.flatMap((text, paragraph) => {
    const blockId = harnessParagraphBlockId(chapter.chapterNumber, paragraph);
    return splitSentences(text, locale).map(sentence => ({ blockId, paragraph, start: sentence.start, end: sentence.end, text: text.slice(sentence.start, sentence.end) }));
  });
}

const passageOf = (found: { text: string; before?: string; after?: string }) =>
  ({ ...(found.before ? { before: found.before } : {}), sentence: found.text, ...(found.after ? { after: found.after } : {}) });

export interface RecordChecksInput {
  chapter: HarnessChapter;
  /** Every committed chapter of the story, this one included. */
  chapters: readonly HarnessChapter[];
  entries: readonly CodexEntry[];
  worldAtChapterZero?: WorldRecord;
  locale?: string;
}

const storyEntries = (input: RecordChecksInput) => input.entries.filter(entry => entry.storyId === input.chapter.storyId);
const earlierChapters = (input: RecordChecksInput) => input.chapters
  .filter(entry => entry.storyId === input.chapter.storyId && entry.chapterNumber < input.chapter.chapterNumber);

// ─── Someone who speaks but never appeared ────────────────────────────────

function missedAppearances(input: RecordChecksInput, locale?: string): RecordFixPlanCase[] {
  const { chapter } = input;
  const entries = storyEntries(input);
  const earlier = earlierChapters(input);
  const entryOf = (name: string) => entries.find(entry => entry.kind === 'character' && answersTo(namesOf(entry), name));
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const appeared = new Set([...earlier, chapter].flatMap(saved => (saved.appearances ?? [])
    .filter(appearance => appearance.payload.event === 'appears')
    .flatMap(appearance => {
      const entry = appearance.payload.subject.entryId ? byId.get(appearance.payload.subject.entryId) : undefined;
      return [appearance.payload.subject.name, ...(entry ? namesOf(entry) : [])];
    })).map(key));
  const spokeBefore = new Set(earlier.flatMap(saved => (saved.speakers ?? []).map(speaker => key(speaker.payload.speaker))));
  const cases: RecordFixPlanCase[] = [];
  const asked = new Set<string>();
  for (const speaker of chapter.speakers ?? []) {
    const name = speaker.payload.speaker.trim();
    if (!name || speaker.payload.protagonist || isMainCharacterTag(name)) continue;
    const entry = entryOf(name);
    if (entry?.mainCharacter) continue;
    const known = entry ? namesOf(entry) : [name];
    if (known.some(other => appeared.has(key(other)) || spokeBefore.has(key(other))) || asked.has(key(name))) continue;
    asked.add(key(name));
    const line = sentenceAt(chapter, speaker.anchor.blockId, speaker.anchor.startOffset, locale);
    if (!line) continue;
    // The sentences that name them before their first line, and the line itself: where they are first on the page.
    const named = sentencesOf(chapter, locale).filter(sentence => before(sentence, line) && names(sentence.text, known)).slice(0, APPEARANCE_MENTION_LIMIT - 1);
    const mentions = [...named, line].map((sentence, position) => ({ id: `m${position + 1}`, blockId: sentence.blockId, start: sentence.start, end: sentence.end, text: sentence.text }));
    const message = `‘${name}’ speaks for the first time in this chapter, but the record never shows them appear.`;
    cases.push({
      kind: 'appearance', name,
      flags: [{ kind: 'missed-appearance', message, key: `missed-appearance:${key(name)}` }],
      mentions: mentions.map(({ id, blockId, start, end }) => ({ id, blockId, start, end })),
      case: { id: '', problems: [message], mentions: mentions.map(({ id, text }) => ({ id, sentence: text })), answers: ['record', 'fine'] },
    });
  }
  return cases;
}

// ─── A name the prose uses that may be a character's ──────────────────────

/** Runs of capitalized words in a sentence, without the words that only start it. */
function capitalizedNames(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*)+/gu)) {
    const words = match[0].split(/\s+/).map(word => word.replace(/['’]s$/u, ''));
    while (words.length && LEADING_WORDS.has(words[0].toLowerCase())) words.shift();
    if (words.length >= 2) found.push(words.join(' '));
  }
  return found;
}

function possibleNames(input: RecordChecksInput, locale?: string): RecordFixPlanCase[] {
  const { chapter, worldAtChapterZero } = input;
  const entries = storyEntries(input);
  const characters = entries.filter(entry => entry.kind === 'character');
  const known = [
    ...entries.flatMap(namesOf),
    ...(worldAtChapterZero?.cards ?? []).flatMap(card => [card.name, ...(card.aliases ?? [])]),
    ...(chapter.speakers ?? []).map(speaker => speaker.payload.speaker),
  ].map(key).filter(Boolean);
  // A name an earlier chapter's fixer already found to be someone else is not asked about again.
  const dismissed = new Set(earlierChapters(input).flatMap(saved => (saved.fixer?.fixes ?? [])
    .filter(fix => fix.checks.includes('possible-name') && fix.outcome === 'fine' && fix.before)
    .map(fix => key(fix.before!))));
  const wordsOf = (value: string) => key(value).split(' ').filter(word => word.length >= 3);
  const found = new Map<string, { name: string; entry: CodexEntry; count: number; first: ReturnType<typeof sentencesOf>[number] }>();
  for (const sentence of sentencesOf(chapter, locale)) {
    for (const name of capitalizedNames(sentence.text)) {
      const label = key(name);
      if (!label || dismissed.has(label)) continue;
      if (known.some(other => ` ${other} `.includes(` ${label} `) || ` ${label} `.includes(` ${other} `))) continue;
      const words = wordsOf(name);
      const sharing = characters.filter(entry => namesOf(entry).some(other => wordsOf(other).some(word => words.includes(word))));
      if (sharing.length !== 1) continue;
      const seen = found.get(label);
      if (seen) seen.count += 1;
      else found.set(label, { name, entry: sharing[0], count: 1, first: sentence });
    }
  }
  return [...found.values()].sort((left, right) => right.count - left.count).slice(0, NAME_CASE_LIMIT).map(({ name, entry, first }) => {
    const around = sentenceAt(chapter, first.blockId, first.start, locale);
    const also = entry.aliases?.length ? `, also called ${entry.aliases.map(alias => `‘${alias}’`).join(', ')}` : '';
    const message = `The chapter calls someone ‘${name}’, a name no card has; it shares a word with the character ‘${entry.name}’.`;
    return {
      kind: 'name' as const, name, entryId: entry.id,
      flags: [{ kind: 'possible-name' as const, message, key: `possible-name:${key(name)}` }],
      case: {
        id: '', problems: [message], passage: passageOf(around ?? first),
        record: [`‘${entry.name}’ is a character${also}.`],
        answers: ['record', 'fine'],
      },
    };
  });
}

// ─── Someone dead who speaks or acts ──────────────────────────────────────

function statusContradictions(input: RecordChecksInput, locale?: string): RecordFixPlanCase[] {
  const { chapter } = input;
  const entries = storyEntries(input);
  const earlier = earlierChapters(input);
  const cases: RecordFixPlanCase[] = [];
  for (const [statusKey, current] of deriveStatuses(earlier)) {
    if (!DEAD_STATUS.test(current.status)) continue;
    const entry = entries.find(candidate => candidate.id === statusKey);
    const known = entry ? namesOf(entry) : [current.name];
    const isThem = (subject: { name: string; entryId?: string }) => (entry && subject.entryId === entry.id) || answersTo(known, subject.name);
    const acts: Array<Place & { what: string }> = [];
    for (const speaker of chapter.speakers ?? []) {
      if ((entry?.mainCharacter && speaker.payload.protagonist) || answersTo(known, speaker.payload.speaker)) {
        const line = sentenceAt(chapter, speaker.anchor.blockId, speaker.anchor.startOffset, locale);
        if (line) acts.push({ ...line, what: 'speaks' });
      }
    }
    for (const change of chapter.holdingChanges ?? []) {
      if (isThem(change.payload.holder)) {
        const at = sentenceAt(chapter, change.anchor.blockId, change.anchor.startOffset, locale);
        if (at) acts.push({ ...at, what: 'acts' });
      }
    }
    for (const appearance of chapter.appearances ?? []) {
      if (appearance.payload.event === 'look' && isThem(appearance.payload.subject)) {
        const at = sentenceAt(chapter, appearance.anchor.blockId, appearance.anchor.startOffset, locale);
        if (at) acts.push({ ...at, what: 'is shown with a new look' });
      }
    }
    const first = acts.sort((left, right) => (before(left, right) ? -1 : before(right, left) ? 1 : 0))[0];
    if (!first) continue;
    // A status this chapter gives them at or before that sentence already says how they are now.
    const changed = (chapter.statuses ?? []).some(status => isThem(status.payload.subject) && !before(first, {
      blockId: status.anchor.blockId, start: status.anchor.startOffset, end: status.anchor.endOffset,
      paragraph: chapter.paragraphs.findIndex((_, index) => harnessParagraphBlockId(chapter.chapterNumber, index) === status.anchor.blockId),
    }));
    if (changed) continue;
    const sentence = sentenceAt(chapter, first.blockId, first.start, locale)!;
    const name = entry?.name ?? current.name;
    const message = `‘${name}’ is ${current.status} since Chapter ${current.passage.chapterNumber}, but ${first.what} in this chapter.`;
    const tags = (chapter.statuses ?? []).filter(status => status.anchor.blockId === first.blockId && status.anchor.startOffset === first.start && status.anchor.endOffset === first.end).map(statusTagText).join(' ');
    cases.push({
      kind: 'status', name, blockId: first.blockId, start: first.start, end: first.end,
      flags: [{ kind: 'status-contradiction', message, key: `status-contradiction:${statusKey}` }],
      case: {
        id: '', problems: [message], passage: passageOf(sentence), tags,
        record: [`${name}, Chapter ${current.passage.chapterNumber}: ${current.status}: “${current.passage.text}”`],
        answers: ['record', 'fine', 'major'],
      },
    });
  }
  return cases;
}

/** A saved status written back as the tag the tagger writes. */
export const statusTagText = ({ payload }: Pick<StatusAttachment, 'payload'>) => `[[status: ${payload.subject.name} | ${payload.status}]]`;

/** Every record case of a committed chapter: missed appearances, possible names, then status contradictions. */
export function planRecordChecks(input: RecordChecksInput): RecordFixPlanCase[] {
  return [...missedAppearances(input, input.locale), ...possibleNames(input, input.locale), ...statusContradictions(input, input.locale)];
}

/** The keys of every problem the record checks find in a chapter: a fix stands only when its own key is gone. */
export const recordFlagKeys = (input: RecordChecksInput) => new Set(planRecordChecks(input).flatMap(planned => planned.flags.map(flag => flag.key)));

// ─── Applying an answer ───────────────────────────────────────────────────

export interface RecordFixAnswer { outcome: string; sentence?: string; tags?: string; name?: string }

export interface RecordFixContext {
  chapter: HarnessChapter;
  entries: CodexEntry[];
  declared: readonly DeclaredCharacter[];
  createdAt: string;
  createId: () => string;
  locale?: string;
}

export type RecordFixAttempt =
  | { chapter: HarnessChapter; entries: CodexEntry[]; fix: Pick<HarnessHoldingsFix, 'outcome' | 'blockId' | 'before' | 'after' | 'named'> }
  | { problem: string };

/** The status tags a fixer answer wrote, for one character. Nothing else may be in it. */
function readStatusFixTags(text: string, known: readonly string[]): { ok: true; statuses: Array<Omit<StatusPayload, 'origin'>> } | { ok: false; problem: string } {
  const reading = readMarks(text);
  if (reading.text.trim() || reading.sounds.length || reading.speakers.length || reading.marks.length || reading.wordTagIssues.length || reading.soundIssues.length) {
    return { ok: false, problem: 'the answer held more than a status tag' };
  }
  const statuses: Array<Omit<StatusPayload, 'origin'>> = [];
  for (const tag of reading.wordTags) {
    const read = readStatusTag(tag);
    if (!read.ok) return { ok: false, problem: read.problem };
    if (!answersTo(known, read.status.subject.name) && !isMainCharacterTag(read.status.subject.name)) return { ok: false, problem: `the status tag named ${read.status.subject.name}` };
    statuses.push(read.status);
  }
  if (!statuses.length) return { ok: false, problem: 'no status tag was given' };
  return { ok: true, statuses };
}

const spanAnchor = (chapter: HarnessChapter, blockId: string, start: number, end: number) => {
  const paragraph = chapter.paragraphs.find((_, index) => harnessParagraphBlockId(chapter.chapterNumber, index) === blockId) ?? '';
  return { level: 'span' as const, blockId, startOffset: start, endOffset: end, selectedText: paragraph.slice(start, end) };
};

/** Applies one answer to a record case. The caller keeps it only when the case's own check no longer finds it. */
export function attemptRecordFix(planned: RecordFixPlanCase, answer: RecordFixAnswer, context: RecordFixContext): RecordFixAttempt {
  const { chapter, entries, declared, createdAt, createId } = context;
  const resolving = { storyId: chapter.storyId, chapter: { id: chapter.id, chapterNumber: chapter.chapterNumber }, entries, declared, createdAt, createId };

  if (planned.kind === 'name') {
    const entry = entries.find(candidate => candidate.id === planned.entryId);
    if (!entry) return { problem: 'its character is gone' };
    // The card goes by the new name only when the answer says so; otherwise the new name is one it also answers to.
    const renamed = Boolean(answer.name) && key(answer.name!) === key(planned.name);
    const next: CodexEntry = renamed
      ? { ...entry, name: planned.name, aliases: [...(entry.aliases ?? []).filter(alias => key(alias) !== key(planned.name)), entry.name] }
      : { ...entry, aliases: [...(entry.aliases ?? []), planned.name] };
    return {
      chapter,
      entries: entries.map(candidate => (candidate.id === entry.id ? next : candidate)),
      fix: { outcome: 'named', before: planned.name, after: next.name,
        named: { entryId: entry.id, name: planned.name, ...(renamed ? { previousName: entry.name } : {}) } },
    };
  }

  if (planned.kind === 'appearance') {
    const mention = planned.mentions.find(candidate => candidate.id === answer.sentence) ?? (planned.mentions.length === 1 ? planned.mentions[0] : undefined);
    if (!mention) return { problem: 'no sentence was chosen for the appearance' };
    const anchor = spanAnchor(chapter, mention.blockId, mention.start, mention.end);
    const taken = new Set((chapter.appearances ?? []).map(appearance => appearance.id));
    let index = taken.size;
    let id = appearanceId(anchor.blockId, anchor.startOffset, anchor.endOffset, index);
    while (taken.has(id)) id = appearanceId(anchor.blockId, anchor.startOffset, anchor.endOffset, ++index);
    const appearance: AppearanceAttachment = {
      id, kind: APPEARANCE_KIND, anchor,
      payload: { origin: 'harness', event: 'appears', subject: { name: planned.name }, entity: 'character' },
    };
    const resolved = resolveAppearances({ ...resolving, appearances: [appearance] });
    return {
      chapter: { ...chapter, appearances: [...(chapter.appearances ?? []), ...resolved.appearances] },
      entries: [...entries, ...resolved.created],
      fix: { outcome: 'fixed-tags', blockId: anchor.blockId, before: anchor.selectedText, after: `[[appears: ${planned.name} | character]]` },
    };
  }

  const entry = entries.find(candidate => answersTo(namesOf(candidate), planned.name));
  const read = readStatusFixTags(answer.tags ?? '', entry ? namesOf(entry) : [planned.name]);
  if (!read.ok) return { problem: read.problem };
  const anchor = spanAnchor(chapter, planned.blockId, planned.start, planned.end);
  const taken = new Set((chapter.statuses ?? []).map(status => status.id));
  let index = taken.size;
  const fresh: StatusAttachment[] = read.statuses.map(status => {
    let id = statusId(anchor.blockId, anchor.startOffset, anchor.endOffset, index);
    while (taken.has(id)) id = statusId(anchor.blockId, anchor.startOffset, anchor.endOffset, ++index);
    taken.add(id);
    index += 1;
    return { id, kind: STATUS_KIND, anchor: { ...anchor }, payload: { origin: 'harness', ...status } };
  });
  const resolver = createCodexEntryResolver(resolving);
  const resolved = resolveStatuses(fresh, resolver);
  return {
    chapter: { ...chapter, statuses: [...(chapter.statuses ?? []), ...resolved] },
    entries: [...entries, ...resolver.created],
    fix: { outcome: 'fixed-tags', blockId: anchor.blockId, before: anchor.selectedText, after: resolved.map(statusTagText).join(' ') },
  };
}
