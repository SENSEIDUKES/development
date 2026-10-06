import { rebaseSpan, splitSentences } from '../../text-highlight-engine/shared/manuscript';
import { readMarks } from '../../../narrative/marks';
import { HOLDING_CHANGE_KIND, holdingChangeId, type CodexEntry, type HoldingChangeAnchor, type HoldingChangeAttachment, type HoldingChangePayload } from '../../../narrative/holdings';
import type {
  HarnessChapter,
  HarnessHoldingsFix,
  HarnessHoldingsFixAnswer,
  HarnessHoldingsFixCase,
  HarnessHoldingsFixerPolicy,
} from '../../../narrative/generation';
import { readArcReply } from './arcState';
import { normalizeIdentityLabel } from './canonicalProjection';
import { harnessChapterBody, harnessParagraphBlockId } from './chapterBody';
import {
  deriveHoldings,
  namesNearlyMatch,
  readHoldingTag,
  resolveHoldingChanges,
  type CharacterHoldings,
  type DeclaredCharacter,
  type HoldingFlag,
  type HoldingFlagKind,
  type HoldingsState,
} from './holdings';

/**
 * The Holdings fixer: after a chapter commits, the HARNESS checks the holdings
 * it changed (the same checks the Holdings page shows) and settles the small
 * problems quietly, keeping a record on the chapter. It never reads or sends
 * the whole chapter: each problem becomes a small case (the sentence it is on,
 * the tags there, what the record shows) and one short call answers them all.
 * Closing-list problems about an item the chapter never names are settled
 * without asking. A fix stands only when it leaves the chapter with fewer
 * problems; a contradiction too big for one sentence is recorded, never
 * forced. How far it may go (records only, or a sentence too) is the host's
 * choice: in the Library, the Familiar's.
 */

/** At most this many cases go in one call; the rest stay as they are, recorded. */
export const HOLDINGS_FIXER_CASE_LIMIT = 12;
/** Sentences that name an item, at most, for a closing-list case. */
const MENTION_LIMIT = 3;
/** History lines per item, the most recent. */
const HISTORY_LIMIT = 3;

type SpanAnchor = HoldingChangeAnchor;

/** A case the fixer is asked about, with where its answer applies. */
export type HoldingsFixPlanCase =
  | { kind: 'sentence'; case: HarnessHoldingsFixCase; flags: HoldingFlag[]; blockId: string; start: number; end: number }
  | { kind: 'closing'; case: HarnessHoldingsFixCase; flags: HoldingFlag[]; mentions: Array<{ id: string; blockId: string; start: number; end: number }> }
  | { kind: 'duplicate'; case: HarnessHoldingsFixCase; flags: HoldingFlag[]; entryIds: [string, string] };

export interface HoldingsFixPlan {
  /** What the fixer is asked about. */
  cases: HoldingsFixPlanCase[];
  /** Problems settled without asking. */
  settled: HarnessHoldingsFix[];
}

export interface HoldingsFixInput {
  chapter: HarnessChapter;
  /** Every committed chapter of the story, this one included. */
  chapters: readonly HarnessChapter[];
  /** The story's Codex entries. */
  entries: readonly CodexEntry[];
  mainCharacterName?: string;
  locale?: string;
  policy: HarnessHoldingsFixerPolicy;
}

const withoutChapterLabel = (message: string) => message.replace(/^Chapter \d+: /, '');
const unique = <T>(values: readonly T[]) => [...new Set(values)];

/** A saved change written back as the tag a writer writes. */
export function holdingTagText({ payload }: Pick<HoldingChangeAttachment, 'payload'>): string {
  const { verb, holder, target, count, level, reason } = payload;
  if (verb === 'rank') return `[[rank: ${holder.name} | ${level ?? ''}]]`;
  const parts = [holder.name, target?.name, count ? String(count) : undefined, level, reason].filter((part): part is string => Boolean(part));
  return `[[${verb}: ${parts.join(' | ')}]]`;
}

/** The entries a chapter's own tags created. */
const createdIn = (entries: readonly CodexEntry[], chapterId: string) =>
  new Set(entries.filter(entry => entry.origin.source === 'tag' && entry.origin.chapterId === chapterId).map(entry => entry.id));

/** A chapter's own problems: its flags, and two names that may be one where it made at least one of them. */
export function chapterHoldingFlags(state: HoldingsState, chapterId: string, created: ReadonlySet<string>): HoldingFlag[] {
  return state.flags.filter(flag => flag.chapterId === chapterId
    || (flag.kind === 'possible-duplicate' && Boolean(flag.entryIds?.some(id => created.has(id)))));
}

const paragraphIndexOf = (chapter: Pick<HarnessChapter, 'chapterNumber' | 'paragraphs'>, blockId: string) =>
  chapter.paragraphs.findIndex((_, index) => harnessParagraphBlockId(chapter.chapterNumber, index) === blockId);

const overlaps = (anchor: { blockId: string; startOffset: number; endOffset: number }, blockId: string, start: number, end: number) =>
  anchor.blockId === blockId && anchor.startOffset < end && anchor.endOffset > start;

/** Whether a Sound Cue or a speaker record sits on a sentence: such a sentence is never rewritten. */
const carriesSpans = (chapter: HarnessChapter, blockId: string, start: number, end: number) =>
  [...(chapter.soundCues ?? []), ...(chapter.speakers ?? [])].some(span => overlaps(span.anchor, blockId, start, end));

const thingLabel = (thing: CharacterHoldings['things'][number]) =>
  `${thing.name}${thing.count > 1 ? ` ×${thing.count}` : ''}${thing.equipped ? ' (in hand)' : ''}`;
const abilityLabel = (ability: CharacterHoldings['abilities'][number]) => {
  const notes = [ability.stage === 'learning' ? 'learning' : undefined, ability.level, ability.sealed ? 'sealed' : undefined].filter(Boolean);
  return `${ability.name}${notes.length ? ` (${notes.join('; ')})` : ''}`;
};
/** What one character holds, in one line. */
const holdingsLine = (character: CharacterHoldings | undefined, name: string, when: string) => {
  if (!character || (!character.things.length && !character.abilities.length)) return `${name} ${when}: nothing recorded.`;
  return [
    `${character.name} ${when}:`,
    character.things.length ? ` has ${character.things.map(thingLabel).join(', ')}` : '',
    character.things.length && character.abilities.length ? ';' : '',
    character.abilities.length ? ` knows ${character.abilities.map(abilityLabel).join(', ')}` : '',
    '.',
  ].join('');
};

/** Sentences of a chapter that name one of these names. */
function sentencesNaming(chapter: HarnessChapter, names: readonly string[], locale?: string) {
  const found: Array<{ blockId: string; start: number; end: number; text: string }> = [];
  const wordCount = (text: string) => normalizeIdentityLabel(text).split(' ').filter(Boolean).length;
  chapter.paragraphs.forEach((paragraph, index) => {
    const blockId = harnessParagraphBlockId(chapter.chapterNumber, index);
    for (const sentence of splitSentences(paragraph, locale)) {
      const text = paragraph.slice(sentence.start, sentence.end);
      if (names.some(name => name.trim() && wordCount(name) <= wordCount(text) && namesNearlyMatch(name, text))) found.push({ blockId, ...sentence, text });
    }
  });
  return found;
}

/**
 * Turns a committed chapter's holdings problems into small cases for the
 * fixer, and settles without asking the ones nothing in the chapter can fix.
 */
export function planHoldingsFix({ chapter, chapters, entries, mainCharacterName, locale, policy }: HoldingsFixInput): HoldingsFixPlan {
  const settled: HarnessHoldingsFix[] = [];
  if (policy === 'off') return { cases: [], settled };
  const storyChapters = chapters.filter(entry => entry.storyId === chapter.storyId);
  const now = deriveHoldings({ entries, chapters: storyChapters, mainCharacterName });
  const before = deriveHoldings({ entries, chapters: storyChapters.filter(entry => entry.chapterNumber < chapter.chapterNumber), mainCharacterName });
  const flags = chapterHoldingFlags(now, chapter.id, createdIn(entries, chapter.id));
  const entryName = (id: string | undefined, fallback: string) => (id ? entries.find(entry => entry.id === id)?.name : undefined) ?? fallback;
  const cases: HoldingsFixPlanCase[] = [];

  // Problems on a sentence: one case per sentence, with every problem found there.
  const changes = chapter.holdingChanges ?? [];
  const bySentence = new Map<string, { change: HoldingChangeAttachment; flags: HoldingFlag[] }>();
  for (const flag of flags.filter(item => item.recordId)) {
    const change = changes.find(entry => entry.id === flag.recordId);
    if (!change) continue;
    const key = `${change.anchor.blockId}:${change.anchor.startOffset}-${change.anchor.endOffset}`;
    const group = bySentence.get(key) ?? { change, flags: [] };
    group.flags.push(flag);
    bySentence.set(key, group);
  }
  for (const { change, flags: found } of bySentence.values()) {
    const { blockId, startOffset: start, endOffset: end } = change.anchor;
    const index = paragraphIndexOf(chapter, blockId);
    const paragraph = chapter.paragraphs[index] ?? '';
    const sentences = splitSentences(paragraph, locale);
    const at = sentences.findIndex(sentence => sentence.start === start && sentence.end === end);
    const textOf = (position: number) => (position >= 0 && position < sentences.length ? paragraph.slice(sentences[position].start, sentences[position].end) : undefined);
    const onSentence = changes.filter(entry => entry.anchor.blockId === blockId && entry.anchor.startOffset === start && entry.anchor.endOffset === end);
    const record: string[] = [];
    for (const holder of unique(onSentence.map(entry => entry.payload.holder.entryId ?? entry.payload.holder.name))) {
      const name = entryName(holder, holder);
      record.push(holdingsLine(before.characters.find(character => character.entryId === holder), name, 'before this chapter'));
    }
    for (const entry of onSentence) {
      if (!entry.payload.target) continue;
      const target = entryName(entry.payload.target.entryId, entry.payload.target.name);
      const history = before.characters.find(character => character.entryId === entry.payload.holder.entryId)?.history
        .filter(event => event.target === target).slice(-HISTORY_LIMIT) ?? [];
      for (const event of history) {
        record.push(`${target}: Chapter ${event.passage.chapterNumber}, ${event.verb}${event.count ? ` ${event.count}` : ''}: “${event.passage.text}”`);
      }
    }
    const answers: HarnessHoldingsFixAnswer[] = ['record',
      ...(policy === 'records-and-sentences' && !carriesSpans(chapter, blockId, start, end) ? ['prose' as const] : []),
      'fine', 'major'];
    cases.push({
      kind: 'sentence', blockId, start, end, flags: found,
      case: {
        id: '', problems: unique(found.map(flag => withoutChapterLabel(flag.message))),
        passage: { ...(textOf(at - 1) ? { before: textOf(at - 1) } : {}), sentence: paragraph.slice(start, end), ...(textOf(at + 1) ? { after: textOf(at + 1) } : {}) },
        tags: onSentence.map(holdingTagText).join(' '),
        ...(record.length ? { record } : {}),
        answers,
      },
    });
  }

  // The closing list against the record: only an item the chapter names can be fixed in it.
  const main = now.characters.find(character => character.mainCharacter);
  for (const flag of flags.filter(item => item.kind === 'closing-unlisted' || item.kind === 'closing-untagged')) {
    const entry = flag.entryIds?.[0] ? entries.find(candidate => candidate.id === flag.entryIds![0]) : undefined;
    const names = entry ? [entry.name, ...(entry.aliases ?? [])] : flag.name ? [flag.name] : [];
    const mentions = sentencesNaming(chapter, names, locale).slice(0, MENTION_LIMIT);
    const problem = withoutChapterLabel(flag.message);
    if (!mentions.length) {
      settled.push({ checks: [flag.kind], problems: [problem], outcome: 'fine',
        reason: 'The chapter never names it, so only the closing list is off; nothing in the chapter needs fixing.' });
      continue;
    }
    cases.push({
      kind: 'closing', flags: [flag],
      mentions: mentions.map((mention, position) => ({ id: `m${position + 1}`, blockId: mention.blockId, start: mention.start, end: mention.end })),
      case: {
        id: '', problems: [problem],
        record: [holdingsLine(main, main?.name ?? mainCharacterName ?? 'The main character', 'after this chapter')],
        mentions: mentions.map((mention, position) => ({ id: `m${position + 1}`, sentence: mention.text })),
        answers: ['record', 'fine'],
      },
    });
  }

  // Two names that may be one entry, where this chapter made at least one of them.
  const firstNamed = (entryId: string) => {
    for (const saved of [...storyChapters].sort((left, right) => left.chapterNumber - right.chapterNumber)) {
      const change = saved.holdingChanges?.find(entry => entry.payload.target?.entryId === entryId || entry.payload.holder.entryId === entryId);
      if (change) return `Chapter ${saved.chapterNumber}: “${change.anchor.selectedText}”`;
    }
    return 'not yet in any chapter';
  };
  for (const flag of flags.filter(item => item.kind === 'possible-duplicate' && item.entryIds?.length === 2)) {
    const [left, right] = flag.entryIds! as [string, string];
    cases.push({
      kind: 'duplicate', entryIds: [left, right], flags: [flag],
      case: {
        id: '', problems: [flag.message],
        record: [left, right].map(id => `‘${entryName(id, id)}’ first named in ${firstNamed(id)}`),
        answers: ['record', 'fine'],
      },
    });
  }

  const asked = cases.slice(0, HOLDINGS_FIXER_CASE_LIMIT);
  for (const left of cases.slice(HOLDINGS_FIXER_CASE_LIMIT)) {
    settled.push({ checks: unique(left.flags.map(flag => flag.kind)), problems: left.case.problems, outcome: 'skipped',
      reason: 'More problems than one check looks at; this one is left as it is.' });
  }
  asked.forEach((planned, position) => { planned.case.id = `c${position + 1}`; });
  return { cases: asked, settled };
}

/** The holding tags a fixer answer wrote, read as the writer's are. Nothing else may be in it. */
export function readFixTags(text: string): { ok: true; changes: Array<Omit<HoldingChangePayload, 'origin'>> } | { ok: false; problem: string } {
  const reading = readMarks(text);
  if (reading.text.trim()) return { ok: false, problem: 'the corrected tags held words that are not tags' };
  if (reading.sounds.length || reading.speakers.length || reading.marks.length || reading.wordTagIssues.length || reading.soundIssues.length) {
    return { ok: false, problem: 'the corrected tags could not all be read as holdings' };
  }
  const changes: Array<Omit<HoldingChangePayload, 'origin'>> = [];
  for (const tag of reading.wordTags) {
    const read = readHoldingTag(tag);
    if (!read.ok) return { ok: false, problem: read.problem };
    changes.push(read.change);
  }
  return { ok: true, changes };
}

interface FixAnswer { case: string; outcome: string; sentence?: string; tags?: string; replacement?: string; reason?: string }

/** The fixer's answers, read leniently: anything malformed is no answer. */
export function readHoldingsFixReply(raw: string | undefined): FixAnswer[] {
  const fixes = raw ? readArcReply(raw).fixes : undefined;
  if (!Array.isArray(fixes)) return [];
  const text = (value: unknown) => (typeof value === 'string' ? value : undefined);
  return fixes.flatMap(value => {
    const answer = value as Record<string, unknown> | null;
    if (!answer || typeof answer !== 'object' || typeof answer.case !== 'string' || typeof answer.outcome !== 'string') return [];
    return [{ case: answer.case, outcome: answer.outcome, sentence: text(answer.sentence), tags: text(answer.tags), replacement: text(answer.replacement), reason: text(answer.reason)?.trim() || undefined }];
  });
}

export interface HoldingsFixApplyInput extends HoldingsFixInput {
  plan: HoldingsFixPlan;
  /** The fixer's reply, when the call returned one. */
  reply?: string;
  /** Why the call failed, when it did. */
  error?: string;
  /** The characters the chapter's writer was told about: names resolve to them as the chapter's own did. */
  declared: readonly DeclaredCharacter[];
  createdAt: string;
  createId: () => string;
}

export interface HoldingsFixResult {
  chapter: HarnessChapter;
  /** The story's Codex entries after the fixes. */
  entries: CodexEntry[];
  fixes: HarnessHoldingsFix[];
}

type Attempted = { chapter: HarnessChapter; entries: CodexEntry[]; fix: Pick<HarnessHoldingsFix, 'outcome' | 'blockId' | 'before' | 'after' | 'merged'> } | { problem: string };

const withChanges = (chapter: HarnessChapter, changes: HoldingChangeAttachment[]): HarnessChapter => {
  const next: HarnessChapter = { ...chapter };
  if (changes.length) next.holdingChanges = changes;
  else delete next.holdingChanges;
  return next;
};

/**
 * Applies the fixer's answers to a committed chapter, one case at a time. A
 * fix stands only when it leaves the chapter with fewer holdings problems (a
 * merge: without the pair, and no more problems); otherwise nothing changes
 * and the case is recorded as skipped. Returns the chapter, the story's Codex
 * entries and the record of every case.
 */
export function applyHoldingsFixes(input: HoldingsFixApplyInput): HoldingsFixResult {
  const { plan, policy, locale, declared, createdAt, createId, mainCharacterName } = input;
  let chapter: HarnessChapter = structuredClone(input.chapter);
  let entries: CodexEntry[] = structuredClone([...input.entries]);
  const others = input.chapters.filter(entry => entry.storyId === chapter.storyId && entry.id !== chapter.id);
  const problemsOf = (draft: HarnessChapter, draftEntries: readonly CodexEntry[]) => chapterHoldingFlags(
    deriveHoldings({ entries: draftEntries, chapters: [...others, draft], mainCharacterName }), draft.id, createdIn(draftEntries, draft.id));
  const answers = readHoldingsFixReply(input.reply);
  const fixes: HarnessHoldingsFix[] = [...plan.settled];

  /** New changes from corrected tags, each on the given sentence, with ids the chapter has not used, resolved to entries. */
  const placed = (draft: HarnessChapter, draftEntries: CodexEntry[], anchor: SpanAnchor, payloads: Array<Omit<HoldingChangePayload, 'origin'>>) => {
    const taken = new Set((draft.holdingChanges ?? []).map(change => change.id));
    let index = taken.size;
    const fresh: HoldingChangeAttachment[] = payloads.map(payload => {
      let id = holdingChangeId(anchor.blockId, anchor.startOffset, anchor.endOffset, index);
      while (taken.has(id)) id = holdingChangeId(anchor.blockId, anchor.startOffset, anchor.endOffset, ++index);
      taken.add(id);
      index += 1;
      return { id, kind: HOLDING_CHANGE_KIND, anchor: { ...anchor }, payload: { origin: 'harness', ...payload } };
    });
    return resolveHoldingChanges({
      storyId: draft.storyId, chapter: { id: draft.id, chapterNumber: draft.chapterNumber },
      changes: fresh, entries: draftEntries, declared, createdAt, createId,
    });
  };

  const attempt = (planned: HoldingsFixPlanCase, answer: FixAnswer): Attempted => {
    if (planned.kind === 'duplicate') {
      const created = createdIn(entries, chapter.id);
      const pair = planned.entryIds.map(id => entries.find(entry => entry.id === id));
      if (pair.some(entry => !entry)) return { problem: 'one of the two entries is gone' };
      // The entry this chapter made joins the one already there; with two new ones, the later joins the earlier.
      const [first, second] = pair as [CodexEntry, CodexEntry];
      const removed = created.has(second.id) ? second : created.has(first.id) ? first : undefined;
      if (!removed) return { problem: 'neither name was made by this chapter' };
      const kept = removed === second ? first : second;
      const answersTo = [kept.name, ...(kept.aliases ?? [])].some(name => normalizeIdentityLabel(name) === normalizeIdentityLabel(removed.name));
      const repoint = (ref: HoldingChangePayload['holder'] | undefined) => (ref && ref.entryId === removed.id ? { ...ref, entryId: kept.id } : ref);
      const changes = (chapter.holdingChanges ?? []).map(change => ({
        ...change, payload: { ...change.payload, holder: repoint(change.payload.holder)!, ...(change.payload.target ? { target: repoint(change.payload.target) } : {}) },
      }));
      return {
        chapter: withChanges(chapter, changes),
        entries: entries.filter(entry => entry.id !== removed.id)
          .map(entry => (entry.id === kept.id && !answersTo ? { ...entry, aliases: [...(entry.aliases ?? []), removed.name] } : entry)),
        fix: { outcome: 'merged', before: `‘${removed.name}’ and ‘${kept.name}’`, after: `‘${kept.name}’`,
          merged: { keptEntryId: kept.id, ...(answersTo ? {} : { alias: removed.name }) } },
      };
    }

    const tags = readFixTags(answer.tags ?? '');
    if (!tags.ok) return { problem: tags.problem };
    const changes = chapter.holdingChanges ?? [];

    if (planned.kind === 'closing') {
      const mention = planned.mentions.find(candidate => candidate.id === answer.sentence) ?? (planned.mentions.length === 1 ? planned.mentions[0] : undefined);
      if (!mention) return { problem: 'no sentence was chosen for the tag' };
      if (!tags.changes.length) return { problem: 'no tag was given' };
      const paragraph = chapter.paragraphs[paragraphIndexOf(chapter, mention.blockId)] ?? '';
      const anchor: SpanAnchor = { level: 'span', blockId: mention.blockId, startOffset: mention.start, endOffset: mention.end, selectedText: paragraph.slice(mention.start, mention.end) };
      const resolved = placed(chapter, entries, anchor, tags.changes);
      return {
        chapter: withChanges(chapter, [...changes, ...resolved.changes]),
        entries: [...entries, ...resolved.created],
        fix: { outcome: 'fixed-tags', blockId: mention.blockId, before: anchor.selectedText, after: resolved.changes.map(holdingTagText).join(' ') },
      };
    }

    const { blockId, start, end } = planned;
    const onSentence = (change: HoldingChangeAttachment) => change.anchor.blockId === blockId && change.anchor.startOffset === start && change.anchor.endOffset === end;
    const replaced = changes.filter(onSentence);
    if (!replaced.length) return { problem: 'its sentence no longer carries the tags it was asked about' };
    const at = changes.findIndex(onSentence);
    const kept = changes.filter(change => !onSentence(change));
    const tagText = (list: readonly HoldingChangeAttachment[]) => list.map(holdingTagText).join(' ') || 'no tag';

    if (answer.outcome === 'record') {
      const resolved = placed(chapter, entries, replaced[0].anchor, tags.changes);
      return {
        chapter: withChanges(chapter, [...kept.slice(0, at), ...resolved.changes, ...kept.slice(at)]),
        entries: [...entries, ...resolved.created],
        fix: { outcome: 'fixed-tags', blockId, before: tagText(replaced), after: tagText(resolved.changes) },
      };
    }

    // One sentence of prose, corrected in place: the spans after it in its paragraph move with the text.
    if (policy !== 'records-and-sentences') return { problem: 'sentence fixes are off' };
    const index = paragraphIndexOf(chapter, blockId);
    const paragraph = chapter.paragraphs[index];
    const sentence = paragraph?.slice(start, end);
    const replacement = answer.replacement?.trim() ?? '';
    if (!paragraph || sentence !== replaced[0].anchor.selectedText) return { problem: 'its sentence changed' };
    if (!replacement || /\[\[|\]\]/.test(replacement)) return { problem: 'no corrected sentence was given' };
    if (splitSentences(replacement, locale).length !== 1) return { problem: 'the correction was more than one sentence' };
    if (replacement.length > Math.max(sentence.length * 2, sentence.length + 120)) return { problem: 'the correction rewrote far more than the sentence' };
    if (carriesSpans(chapter, blockId, start, end)) return { problem: 'a Sound Cue or a speaker sits on the sentence' };
    const text = `${paragraph.slice(0, start)}${replacement}${paragraph.slice(end)}`;
    const move = <A extends { anchor: SpanAnchor }>(attachment: A): A => (attachment.anchor.blockId === blockId
      ? { ...attachment, anchor: rebaseSpan(attachment.anchor, start, end - start, replacement.length, text, locale ?? 'en') as SpanAnchor }
      : attachment);
    const soundCues = chapter.soundCues?.map(move);
    const speakers = chapter.speakers?.map(move);
    const movedChanges = kept.map(move);
    if ([...(soundCues ?? []), ...(speakers ?? []), ...movedChanges].some(span => span.anchor.detached)) {
      return { problem: 'something else sits across the sentence' };
    }
    const anchor: SpanAnchor = { level: 'span', blockId, startOffset: start, endOffset: start + replacement.length, selectedText: replacement };
    const paragraphs = chapter.paragraphs.map((value, position) => (position === index ? text : value));
    const body = harnessChapterBody(paragraphs, chapter.metrics.paragraphTarget);
    const draft: HarnessChapter = {
      ...chapter, paragraphs: body.paragraphs, prose: body.prose, metrics: body.metrics,
      ...(soundCues ? { soundCues } : {}), ...(speakers ? { speakers } : {}),
    };
    const resolved = placed(withChanges(draft, movedChanges), entries, anchor, tags.changes);
    return {
      chapter: withChanges(draft, [...movedChanges.slice(0, at), ...resolved.changes, ...movedChanges.slice(at)]),
      entries: [...entries, ...resolved.created],
      fix: { outcome: 'fixed-sentence', blockId, before: sentence, after: replacement },
    };
  };

  for (const planned of plan.cases) {
    const base = { checks: unique(planned.flags.map(flag => flag.kind)) as HoldingFlagKind[], problems: planned.case.problems };
    const answer = answers.find(candidate => candidate.case === planned.case.id);
    if (!answer) {
      fixes.push({ ...base, outcome: 'skipped', reason: input.error ? `The fixer could not be reached: ${input.error}` : 'The fixer gave no answer for it.' });
      continue;
    }
    if (!planned.case.answers.includes(answer.outcome as HarnessHoldingsFixAnswer)) {
      fixes.push({ ...base, outcome: 'skipped', reason: `The fixer answered ${answer.outcome}, which this problem does not allow.` });
      continue;
    }
    if (answer.outcome === 'fine' || answer.outcome === 'major') {
      fixes.push({ ...base, outcome: answer.outcome, ...(answer.reason ? { reason: answer.reason } : {}) });
      continue;
    }
    const before = problemsOf(chapter, entries);
    const tried = attempt(planned, answer);
    if ('problem' in tried) {
      fixes.push({ ...base, outcome: 'skipped', reason: `Nothing was changed: ${tried.problem}.` });
      continue;
    }
    const after = problemsOf(tried.chapter, tried.entries);
    const settles = planned.kind === 'duplicate'
      ? after.length <= before.length && !after.some(flag => flag.kind === 'possible-duplicate' && planned.entryIds.every(id => flag.entryIds?.includes(id)))
      : after.length < before.length;
    if (!settles) {
      fixes.push({ ...base, outcome: 'skipped', reason: 'Nothing was changed: the fix would not have settled it.' });
      continue;
    }
    chapter = tried.chapter;
    entries = tried.entries;
    fixes.push({ ...base, ...tried.fix, ...(answer.reason ? { reason: answer.reason } : {}) });
  }
  return { chapter, entries, fixes };
}
