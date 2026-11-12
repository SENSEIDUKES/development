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
import { placeAppearancesFromPlaces, resolveAppearances } from './appearances';
import { isMainCharacterTag } from './speakers';
import { readStatusTag, resolveStatuses } from './statuses';
import { deriveConditions } from './conditions';
import { factionNamed } from './factions';
import { PLACE_KIND, placeId, type PlaceAttachment, type PlacePayload } from '../../../narrative/places';
import { derivePlaces, readPlaceTag, resolvePlaces } from './places';

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
 * - someone whose status is dead who speaks or acts in this chapter;
 * - with Place, someone the record has in one place who first speaks or acts
 *   in this chapter after it names another (Shen Yuan in the Summit Hall
 *   since Chapter 5, speaking in Chapter 6 once it has moved to the Lower
 *   Stacks, with no place tag to take him there).
 *
 * A fix stands only when the same rule no longer finds the problem.
 */

/** One problem a record check found, keyed so the same rule can say it is gone. */
export interface RecordFlag {
  kind: HarnessRecordCheckKind;
  message: string;
  key: string;
}

/** A sentence a case offers, with its words, so its answer lands on them even after another fix moved them. */
type Mention = { id: string; blockId: string; start: number; end: number; text: string };

/** A record case the fixer is asked about, with where its answer applies. */
export type RecordFixPlanCase =
  | { kind: 'appearance'; case: HarnessHoldingsFixCase; flags: RecordFlag[]; name: string; mentions: Mention[] }
  | { kind: 'name'; case: HarnessHoldingsFixCase; flags: RecordFlag[]; entryId: string; name: string }
  | { kind: 'status'; case: HarnessHoldingsFixCase; flags: RecordFlag[]; name: string; blockId: string; start: number; end: number; text: string }
  | { kind: 'place'; case: HarnessHoldingsFixCase; flags: RecordFlag[]; name: string; blockId: string; start: number; end: number; text: string };

/** The kinds of case the record checks plan, so the fixer can tell them from its holdings cases. */
const RECORD_CASE_KINDS: ReadonlySet<string> = new Set<RecordFixPlanCase['kind']>(['appearance', 'name', 'status', 'place']);
export const isRecordCase = <T extends { kind: string }>(planned: T): planned is Extract<T, RecordFixPlanCase> => RECORD_CASE_KINDS.has(planned.kind);

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
  // A group speaking as one ("the Iron Crane Sect") is a faction, never a character missing an appearance.
  const factions = (input.worldAtChapterZero?.cards ?? []).filter(card => card.kind === 'faction');
  const cases: RecordFixPlanCase[] = [];
  const asked = new Set<string>();
  for (const speaker of chapter.speakers ?? []) {
    const name = speaker.payload.speaker.trim();
    if (!name || speaker.payload.protagonist || isMainCharacterTag(name) || factionNamed(name, factions)) continue;
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
      mentions: mentions.map(({ id, blockId, start, end, text }) => ({ id, blockId, start, end, text })),
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

// ─── Where someone first speaks or acts ───────────────────────────────────

/** Where a span attachment of a chapter sits, as a sentence place. */
const spanPlace = (chapter: HarnessChapter, anchor: { blockId: string; startOffset: number; endOffset: number }): Place => ({
  blockId: anchor.blockId, start: anchor.startOffset, end: anchor.endOffset,
  paragraph: chapter.paragraphs.findIndex((_, index) => harnessParagraphBlockId(chapter.chapterNumber, index) === anchor.blockId),
});

/** The sentence where someone first speaks or acts in a chapter: a line, a holding change, a new look. */
function firstAct(chapter: HarnessChapter, { entry, known, isThem }: {
  entry?: CodexEntry; known: readonly string[]; isThem: (subject: { name: string; entryId?: string }) => boolean | undefined;
}, locale?: string) {
  const acts: Array<NonNullable<ReturnType<typeof sentenceAt>> & { what: string }> = [];
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
  return acts.sort((left, right) => (before(left, right) ? -1 : before(right, left) ? 1 : 0)).at(0);
}

// ─── Someone dead who speaks or acts ──────────────────────────────────────

function statusContradictions(input: RecordChecksInput, locale?: string): RecordFixPlanCase[] {
  const { chapter } = input;
  const entries = storyEntries(input);
  const earlier = earlierChapters(input);
  const cases: RecordFixPlanCase[] = [];
  const carried = deriveConditions({ world: input.worldAtChapterZero, entries, chapters: earlier, chapterNumber: chapter.chapterNumber }).characters;
  for (const character of carried) {
    // Dead is asked about only while it is the last thing the page said of them: someone the story has
    // since changed (a ghost, a puppet) or brought back carries a later condition, and is as that says.
    const said = character.conditions.filter(condition => condition.began);
    const last = said.at(-1) ?? character.conditions.find(condition => DEAD_STATUS.test(condition.name));
    const dead = last && DEAD_STATUS.test(last.name) ? last : undefined;
    if (!dead) continue;
    const statusKey = character.key;
    const entry = entries.find(candidate => candidate.id === statusKey);
    const known = entry ? namesOf(entry) : [character.name];
    const isThem = (subject: { name: string; entryId?: string }) => (entry && subject.entryId ? subject.entryId === entry.id : answersTo(known, subject.name));
    const first = firstAct(chapter, { entry, known, isThem }, locale);
    if (!first) continue;
    // A status this chapter gives them at or before that sentence already says how they are now.
    const changed = (chapter.statuses ?? []).some(status => isThem(status.payload.subject) && !before(first, spanPlace(chapter, status.anchor)));
    if (changed) continue;
    const sentence = sentenceAt(chapter, first.blockId, first.start, locale)!;
    const name = entry?.name ?? character.name;
    const since = dead.began ? `since Chapter ${dead.began.chapterNumber}` : 'since the story opened';
    const message = `‘${name}’ is ${dead.name} ${since}, but ${first.what} in this chapter.`;
    const tags = (chapter.statuses ?? []).filter(status => status.anchor.blockId === first.blockId && status.anchor.startOffset === first.start && status.anchor.endOffset === first.end).map(statusTagText).join(' ');
    cases.push({
      kind: 'status', name, blockId: first.blockId, start: first.start, end: first.end, text: sentence.text,
      flags: [{ kind: 'status-contradiction', message, key: `status-contradiction:${statusKey}` }],
      case: {
        id: '', problems: [message], passage: passageOf(sentence), tags,
        record: [dead.began ? `${name}, Chapter ${dead.began.chapterNumber}: ${dead.name}: “${dead.began.text}”` : `${name}: ${dead.name}, on their card`],
        answers: ['record', 'fine', 'major'],
      },
    });
  }
  return cases;
}

/** A saved status written back as the tag the tagger writes. */
export const statusTagText = ({ payload }: Pick<StatusAttachment, 'payload'>) => `[[status: ${payload.subject.name} | ${payload.status}${payload.ended ? ' | ended' : ''}]]`;

// ─── Someone who acts somewhere the record does not have them ─────────────

/**
 * The place a sentence names, of the places the story knows (its place cards
 * and the places its tags brought in): the one named last in it, so "from the
 * Summit Hall down to the Lower Stacks" is the Lower Stacks.
 */
function placeNamed(text: string, places: ReadonlyArray<{ name: string; names: readonly string[] }>) {
  const padded = ` ${key(text)} `;
  let found: { name: string; names: readonly string[]; at: number } | undefined;
  for (const place of places) {
    for (const name of place.names) {
      const at = key(name) ? padded.lastIndexOf(` ${key(name)} `) : -1;
      if (at >= 0 && (!found || at > found.at)) found = { ...place, at };
    }
  }
  return found;
}

function placeContradictions(input: RecordChecksInput, locale?: string): RecordFixPlanCase[] {
  const { chapter, worldAtChapterZero } = input;
  const entries = storyEntries(input);
  const earlier = earlierChapters(input);
  // The places the story knows by name: one per place, a card and the entry a tag made for it counted once.
  const places: Array<{ name: string; names: readonly string[]; entryId?: string }> = [];
  for (const place of [
    ...entries.filter(entry => entry.kind === 'place').map(entry => ({ name: entry.name, names: namesOf(entry), entryId: entry.id })),
    ...(worldAtChapterZero?.cards ?? []).filter(card => card.kind === 'place').map(card => ({ name: card.name, names: [card.name, ...(card.aliases ?? [])] })),
  ]) {
    if (!places.some(other => other.names.some(name => answersTo(place.names, name)))) places.push(place);
  }
  if (!places.length) return [];
  const sentences = sentencesOf(chapter, locale);
  const cases: RecordFixPlanCase[] = [];
  for (const [whoKey, current] of derivePlaces(earlier, entries)) {
    const entry = entries.find(candidate => candidate.id === whoKey);
    const known = entry ? namesOf(entry) : [current.name];
    const isThem = (subject: { name: string; entryId?: string }) => (entry && subject.entryId ? subject.entryId === entry.id : answersTo(known, subject.name));
    const first = firstAct(chapter, { entry, known, isThem }, locale);
    if (!first) continue;
    const here = places.find(place => (current.placeEntryId && place.entryId === current.placeEntryId) || answersTo(place.names, current.place));
    // The last place the chapter names up to that sentence: where the prose has taken the scene by then.
    const named = sentences.filter(sentence => !before(first, sentence))
      .map(sentence => ({ sentence, place: placeNamed(sentence.text, places) }))
      .filter(found => found.place).at(-1);
    if (!named?.place || (here && named.place.names.some(name => answersTo(here.names, name))) || answersTo(named.place.names, current.place)) continue;
    // A place tag this chapter gives them at or before that sentence settles it, when it names the place the prose reached.
    const reached = named.place;
    if ((chapter.places ?? []).some(record => isThem(record.payload.subject) && !before(first, spanPlace(chapter, record.anchor))
      && answersTo(reached.names, record.payload.place.name))) continue;
    const around = sentenceAt(chapter, named.sentence.blockId, named.sentence.start, locale)!;
    const name = entry?.name ?? current.name;
    const message = `‘${name}’ is at ${current.place} since Chapter ${current.passage.chapterNumber}, but ${first.what} in this chapter after it names ${named.place.name}, with no place tag to take them there: “${first.text}”`;
    const tags = (chapter.places ?? []).filter(record => record.anchor.blockId === around.blockId && record.anchor.startOffset === around.start && record.anchor.endOffset === around.end).map(placeTagText).join(' ');
    cases.push({
      kind: 'place', name, blockId: around.blockId, start: around.start, end: around.end, text: around.text,
      flags: [{ kind: 'place-contradiction', message, key: `place-contradiction:${whoKey}` }],
      case: {
        id: '', problems: [message], passage: passageOf(around), tags,
        record: [`${name}, Chapter ${current.passage.chapterNumber}: at ${current.place}: “${current.passage.text}”`],
        answers: ['record', 'fine'],
      },
    });
  }
  return cases;
}

/** A saved place tag written back as the tag the tagger writes. */
export const placeTagText = ({ payload }: Pick<PlaceAttachment, 'payload'>) => `[[place: ${payload.subject.name} | ${payload.place.name}]]`;

/** Every record case of a committed chapter: missed appearances, possible names, status contradictions, then place contradictions. */
export function planRecordChecks(input: RecordChecksInput): RecordFixPlanCase[] {
  return [
    ...missedAppearances(input, input.locale), ...possibleNames(input, input.locale),
    ...statusContradictions(input, input.locale), ...placeContradictions(input, input.locale),
  ];
}

/** The keys of every problem the record checks find in a chapter: a fix stands only when its own key is gone. */
export const recordFlagKeys = (input: RecordChecksInput) => new Set(planRecordChecks(input).flatMap(planned => planned.flags.map(flag => flag.key)));

// ─── Applying an answer ───────────────────────────────────────────────────

export interface RecordFixAnswer { outcome: string; sentence?: string; tags?: string; name?: string }

export interface RecordFixContext {
  chapter: HarnessChapter;
  /** The story's chapters before this one, so a place the fix names for the first time steps onto the page. */
  earlier?: readonly HarnessChapter[];
  entries: CodexEntry[];
  declared: readonly DeclaredCharacter[];
  createdAt: string;
  createId: () => string;
  locale?: string;
}

export type RecordFixAttempt =
  | { chapter: HarnessChapter; entries: CodexEntry[]; fix: Pick<HarnessHoldingsFix, 'outcome' | 'blockId' | 'before' | 'after' | 'named'> }
  | { problem: string };

/**
 * The tags of one kind a fixer answer wrote, for one character: status tags,
 * or place tags. Nothing else may be in it.
 */
function readFixTagsFor<T extends { subject: { name: string } }>(text: string, known: readonly string[], what: string,
  read: (tag: ReturnType<typeof readMarks>['wordTags'][number]) => { ok: true; value: T } | { ok: false; problem: string }): { ok: true; values: T[] } | { ok: false; problem: string } {
  const reading = readMarks(text);
  if (reading.text.trim() || reading.sounds.length || reading.speakers.length || reading.marks.length || reading.soundtracks.length || reading.wordTagIssues.length || reading.soundIssues.length) {
    return { ok: false, problem: `the answer held more than a ${what} tag` };
  }
  const values: T[] = [];
  for (const tag of reading.wordTags) {
    const one = read(tag);
    if (!one.ok) return { ok: false, problem: one.problem };
    if (!answersTo(known, one.value.subject.name) && !isMainCharacterTag(one.value.subject.name)) return { ok: false, problem: `the ${what} tag named ${one.value.subject.name}` };
    values.push(one.value);
  }
  if (!values.length) return { ok: false, problem: `no ${what} tag was given` };
  return { ok: true, values };
}
const readStatusFixTags = (text: string, known: readonly string[]) => readFixTagsFor<Omit<StatusPayload, 'origin'>>(text, known, 'status', tag => {
  const read = readStatusTag(tag);
  return read.ok ? { ok: true, value: read.status } : read;
});
const readPlaceFixTags = (text: string, known: readonly string[]) => readFixTagsFor<Omit<PlacePayload, 'origin'>>(text, known, 'place', tag => {
  const read = readPlaceTag(tag);
  return read.ok ? { ok: true, value: read.place } : read;
});

/**
 * The sentence a case offered, where it stands now: an earlier fix in the same
 * call may have corrected a sentence before it in its paragraph and moved it.
 * Found by its words, once; a sentence that changed or is there twice is none.
 */
const spanAnchor = (chapter: HarnessChapter, { blockId, start, end, text }: { blockId: string; start: number; end: number; text: string }) => {
  const paragraph = chapter.paragraphs.find((_, index) => harnessParagraphBlockId(chapter.chapterNumber, index) === blockId) ?? '';
  const at = paragraph.slice(start, end) === text ? start
    : paragraph.indexOf(text) >= 0 && paragraph.indexOf(text) === paragraph.lastIndexOf(text) ? paragraph.indexOf(text) : -1;
  return at < 0 || !text ? undefined : { level: 'span' as const, blockId, startOffset: at, endOffset: at + text.length, selectedText: text };
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
    const anchor = spanAnchor(chapter, mention);
    if (!anchor) return { problem: 'its sentence changed' };
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

  const entry = entries.find(candidate => candidate.kind === 'character' && answersTo(namesOf(candidate), planned.name));
  const known = entry ? namesOf(entry) : [planned.name];
  const anchor = spanAnchor(chapter, planned);

  if (planned.kind === 'place') {
    const read = readPlaceFixTags(answer.tags ?? '', known);
    if (!read.ok) return { problem: read.problem };
    if (!anchor) return { problem: 'its sentence changed' };
    const taken = new Set((chapter.places ?? []).map(place => place.id));
    let index = taken.size;
    const fresh: PlaceAttachment[] = read.values.map(place => {
      let id = placeId(anchor.blockId, anchor.startOffset, anchor.endOffset, index);
      while (taken.has(id)) id = placeId(anchor.blockId, anchor.startOffset, anchor.endOffset, ++index);
      taken.add(id);
      index += 1;
      return { id, kind: PLACE_KIND, anchor: { ...anchor }, payload: { origin: 'harness', ...place } };
    });
    const resolver = createCodexEntryResolver(resolving);
    const resolved = resolvePlaces(fresh, resolver);
    const places = [...(chapter.places ?? []), ...resolved];
    const appearances = [...(chapter.appearances ?? [])];
    // A place it names for the first time steps onto the page there, as a tagged one does.
    appearances.push(...placeAppearancesFromPlaces({
      chapter: { ...chapter, appearances, places }, chapters: context.earlier ?? [], entries: [...entries, ...resolver.created],
    }));
    return {
      chapter: { ...chapter, places, appearances },
      entries: [...entries, ...resolver.created],
      fix: { outcome: 'fixed-tags', blockId: anchor.blockId, before: anchor.selectedText, after: resolved.map(placeTagText).join(' ') },
    };
  }

  const read = readStatusFixTags(answer.tags ?? '', known);
  if (!read.ok) return { problem: read.problem };
  if (!anchor) return { problem: 'its sentence changed' };
  const taken = new Set((chapter.statuses ?? []).map(status => status.id));
  let index = taken.size;
  const fresh: StatusAttachment[] = read.values.map(status => {
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
