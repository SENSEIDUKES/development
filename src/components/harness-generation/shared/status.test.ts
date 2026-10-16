import { describe, expect, it } from 'vitest';
import {
  STATUS_SECTION_LIMIT,
  createCodexEntryResolver,
  deriveStatus,
  placeStatusChanges,
  readStatusTag,
  resolveStatusChanges,
  statusSection,
  type AppearanceAttachment,
  type CodexEntry,
  type HoldingChangeAttachment,
  type StatusChangeAttachment,
  type StatusChapter,
} from '@seihouse/sen/harness-generation';
import type { SpeakerAttachment } from '../../../narrative/speech';
import { readMarks } from '../../../narrative/marks';
import { presentStatus } from '../../../server/harness-generation/prompt';

/**
 * Status in the tiny SEN language: the writer tags each change of state
 * (`[[status: Name | dead]]`, `[[status: MC | wounded | a broken arm]]`). The
 * HARNESS reads them apart from holdings and appearances, saves each on its
 * sentence, resolves each name to the Codex entry the other tags use, and
 * works out again, in story order, how everyone and everything now is.
 */

const tag = (text: string) => readMarks(text).wordTags[0];

const entry = (id: string, name: string, extra: Partial<CodexEntry> = {}): CodexEntry => ({
  id, storyId: 'story', kind: 'character', name, origin: { source: 'foundation' }, createdAt: 'now', ...extra,
});
const ENTRIES = [
  entry('mc', 'Han Shuo', { mainCharacter: true }),
  entry('zhao', 'Zhao Wuchen'),
  entry('sword', 'Crimson Broadsword', { kind: 'thing' }),
];

let ids = 0;
const status = (blockId: string, start: number, name: string, entryId: string | undefined, state: StatusChangeAttachment['payload']['state'], extra: Partial<StatusChangeAttachment['payload']> = {}): StatusChangeAttachment => ({
  id: `s${++ids}`, kind: 'status-change', anchor: { level: 'span', blockId, startOffset: start, endOffset: start + 11, selectedText: 'A sentence.' },
  payload: { origin: 'harness', subject: { name, ...(entryId ? { entryId } : {}) }, state, ...(entryId ? { entity: ENTRIES.find(found => found.id === entryId)?.kind === 'thing' ? 'thing' : 'character' } : {}), ...extra },
});
const speaker = (blockId: string, start: number, name: string): SpeakerAttachment => ({
  id: `sp${++ids}`, kind: 'speaker', anchor: { level: 'span', blockId, startOffset: start, endOffset: start + 5, selectedText: '"Go."' },
  payload: { speaker: name, protagonist: false, origin: 'harness' },
} as SpeakerAttachment);
const holding = (blockId: string, start: number, verb: HoldingChangeAttachment['payload']['verb'], holderId: string, targetId?: string): HoldingChangeAttachment => ({
  id: `h${++ids}`, kind: 'holding-change', anchor: { level: 'span', blockId, startOffset: start, endOffset: start + 11, selectedText: 'A sentence.' },
  payload: { origin: 'harness', verb, holder: { name: holderId, entryId: holderId }, ...(targetId ? { target: { name: targetId, entryId: targetId } } : {}) },
} as HoldingChangeAttachment);
const chapter = (chapterNumber: number, records: Partial<StatusChapter>): StatusChapter => ({ id: `c${chapterNumber}`, chapterNumber, ...records });

describe('Reading status tags', () => {
  it('reads a status tag as its own kind, with its state from the short list and how in a few words', () => {
    const reading = readMarks('[[status: Zhao Wuchen | dead | run through by a spear]] Zhao fell. [[lost: MC | Sword]] Han Shuo dropped it.');
    expect(reading.text).toBe('Zhao fell. Han Shuo dropped it.');
    expect(reading.wordTags.map(found => found.word)).toEqual(['status', 'lost']);
    expect(readStatusTag(reading.wordTags[0])).toEqual({ ok: true, change: { subject: { name: 'Zhao Wuchen' }, state: 'dead', detail: 'run through by a spear' } });
    // Other words for a state, and other spellings of the tag, read the same.
    expect(readStatusTag(tag('[[state: MC | Injured]] x'))).toEqual({ ok: true, change: { subject: { name: 'MC' }, state: 'wounded' } });
    expect(readStatusTag(tag('[[condition: Crimson Broadsword | shattered]] x'))).toMatchObject({ ok: true, change: { state: 'destroyed' } });
    expect(readStatusTag(tag('[[status: Old Wu | sealed away | in the ice]] x'))).toMatchObject({ ok: true, change: { state: 'sealed', detail: 'in the ice' } });
    // A tag written where its name belongs leaves the name in the text; MC never enters the prose.
    expect(readMarks('The spear found [[status: Zhao Wuchen | dead]].').text).toBe('The spear found Zhao Wuchen.');
  });

  it('sets aside what cannot be a status change', () => {
    expect(readStatusTag(tag('[[status: Zhao | sleepy]] x'))).toEqual({ ok: false, problem: 'a status tag for Zhao named ‘sleepy’, which is not a state the record keeps' });
    expect(readStatusTag(tag(`[[status: Zhao | wounded | ${'deeply '.repeat(17)}cut]] x`))).toMatchObject({ ok: false });
    expect(readStatusTag(tag('[[gained: MC | Sword]] x'))).toEqual({ ok: false, problem: 'a gained tag is not a status change' });
  });

  it('places each change on the sentence its tag points at, apart from the other tags beside it', () => {
    const reading = readMarks('The duel ended. [[status: Zhao Wuchen | dead]] Zhao fell. [[appears: Old Wu | character]] A smith watched.');
    const placed = placeStatusChanges({ paragraphs: [{ blockId: 'c1-p1', text: reading.text, wordTags: reading.wordTags }] });
    expect(placed).toEqual({ problems: [], changes: [{
      id: 'status:c1-p1:16-26:0', kind: 'status-change',
      anchor: { level: 'span', blockId: 'c1-p1', startOffset: 16, endOffset: 26, selectedText: 'Zhao fell.' },
      payload: { origin: 'harness', subject: { name: 'Zhao Wuchen' }, state: 'dead' },
    }] });
  });
});

describe('Resolving status changes', () => {
  it('finds the entry the record has, makes a character, or a thing for a state only a thing can be in, and leaves a faction', () => {
    const resolver = createCodexEntryResolver({
      storyId: 'story', chapter: { id: 'c3', chapterNumber: 3 }, entries: ENTRIES, declared: [{ name: 'Han Shuo', mainCharacter: true }],
      createdAt: 'now', createId: (() => { let n = 0; return () => `new${++n}`; })(),
    });
    const placed = (name: string, state: StatusChangeAttachment['payload']['state']) => status('c3-p1', 0, name, undefined, state);
    const resolved = resolveStatusChanges({
      changes: [placed('MC', 'wounded'), placed('Zhao Wuchen', 'dead'), placed('Crimson Broadsword', 'damaged'), placed('Elder Mo', 'dead'), placed('Jade Seal', 'destroyed'), placed('Azure Cloud Sect', 'destroyed')],
      resolver,
    });
    expect(resolved.map(change => [change.payload.subject.entryId, change.payload.entity])).toEqual([
      ['mc', 'character'], ['zhao', 'character'], ['sword', 'thing'], ['new1', 'character'], ['new2', 'thing'], [undefined, undefined],
    ]);
    expect(resolver.created.map(created => [created.kind, created.name])).toEqual([['character', 'Elder Mo'], ['thing', 'Jade Seal']]);
  });
});

describe('Working out how everyone is', () => {
  it('keeps each lasting state until the story ends it, and the dead dead', () => {
    const record = deriveStatus({ entries: ENTRIES, chapters: [
      chapter(1, { statusChanges: [status('c1-p2', 0, 'MC', 'mc', 'wounded', { detail: 'a cut arm' }), status('c1-p5', 0, 'Crimson Broadsword', 'sword', 'damaged')] }),
      chapter(2, { statusChanges: [status('c2-p1', 0, 'MC', 'mc', 'recovered'), status('c2-p3', 0, 'Zhao Wuchen', 'zhao', 'sealed'), status('c2-p4', 0, 'MC', 'mc', 'wounded', { detail: 'a spear wound' })] }),
      chapter(3, { statusChanges: [status('c3-p1', 0, 'Zhao Wuchen', 'zhao', 'freed'), status('c3-p9', 0, 'Zhao Wuchen', 'zhao', 'dead')] }),
    ] });
    expect(record.flags).toEqual([]);
    const of = (key: string) => record.subjects.find(subject => subject.key === key)!;
    expect(of('mc').conditions.map(condition => [condition.state, condition.detail, condition.passage.chapterNumber])).toEqual([['wounded', 'a spear wound', 2]]);
    expect(of('zhao').conditions.map(condition => condition.state)).toEqual(['dead']);
    expect(of('zhao').history.map(event => event.state)).toEqual(['sealed', 'freed', 'dead']);
    expect(of('sword').conditions.map(condition => condition.state)).toEqual(['damaged']);
  });

  it('flags and leaves out a change that cannot be true', () => {
    const record = deriveStatus({ entries: ENTRIES, chapters: [chapter(4, { statusChanges: [
      status('c4-p1', 0, 'Crimson Broadsword', 'sword', 'dead'),
      status('c4-p2', 0, 'MC', 'mc', 'recovered'),
      status('c4-p3', 0, 'Zhao Wuchen', 'zhao', 'dead'),
      status('c4-p4', 0, 'Zhao Wuchen', 'zhao', 'dead'),
      status('c4-p5', 0, 'Zhao Wuchen', 'zhao', 'wounded'),
      status('c4-p6', 0, 'Azure Cloud Sect', undefined, 'destroyed'),
      status('c4-p7', 0, 'Crimson Broadsword', 'sword', 'destroyed'),
      status('c4-p8', 0, 'Crimson Broadsword', 'sword', 'repaired'),
      status('c4-p9', 0, 'Zhao Wuchen', 'zhao', 'revived'),
    ] })] });
    expect(record.flags.map(flag => [flag.kind, flag.blockId])).toEqual([
      ['wrong-kind', 'c4-p1'], ['status-without-cause', 'c4-p2'], ['after-death', 'c4-p4'], ['after-death', 'c4-p5'],
      ['status-unknown', 'c4-p6'], ['after-destroyed', 'c4-p8'],
    ]);
    expect(record.flags[1].message).toBe('Chapter 4: ‘Han Shuo’ is recovered, but was never wounded. It is left out.');
    // Revived, Zhao is no longer dead; the sword stays destroyed.
    expect(record.subjects.find(subject => subject.key === 'zhao')!.conditions).toEqual([]);
    expect(record.subjects.find(subject => subject.key === 'sword')!.conditions.map(condition => condition.state)).toEqual(['destroyed']);
  });

  it('flags the dead who speak, act or change, and a destroyed thing used, once a chapter, but not what is taken from the dead', () => {
    const record = deriveStatus({ entries: ENTRIES, chapters: [
      chapter(5, {
        speakers: [speaker('c5-p1', 0, 'Zhao Wuchen')],
        statusChanges: [status('c5-p2', 0, 'Zhao Wuchen', 'zhao', 'dead'), status('c5-p3', 0, 'Crimson Broadsword', 'sword', 'destroyed')],
        holdingChanges: [holding('c5-p4', 0, 'lost', 'zhao', 'sword'), holding('c5-p6', 0, 'equipped', 'mc', 'sword')],
      }),
      chapter(6, {
        speakers: [speaker('c6-p1', 0, 'Zhao Wuchen'), speaker('c6-p2', 0, 'Zhao Wuchen')],
        appearances: [{ id: 'a1', kind: 'appearance', anchor: { level: 'span', blockId: 'c6-p3', startOffset: 0, endOffset: 3, selectedText: 'Ash' }, payload: { origin: 'harness', event: 'look', subject: { name: 'Zhao Wuchen', entryId: 'zhao' }, change: 'ash' } } as AppearanceAttachment],
      }),
    ] });
    // Speaking before he dies is fine; afterwards, his voice is flagged once a chapter.
    expect(record.flags.map(flag => [flag.kind, flag.blockId])).toEqual([['after-destroyed', 'c5-p6'], ['after-death', 'c6-p1']]);
  });
});

describe('The Status section', () => {
  it('lists the main character first, then the most recently changed, each with every state and since when; the well are left out', () => {
    const section = statusSection(deriveStatus({ entries: ENTRIES, chapters: [
      chapter(1, { statusChanges: [status('c1-p1', 0, 'Zhao Wuchen', 'zhao', 'dead', { detail: 'by a spear' }), status('c1-p2', 0, 'MC', 'mc', 'wounded'), status('c1-p3', 0, 'MC', 'mc', 'recovered')] }),
      chapter(2, { statusChanges: [status('c2-p1', 0, 'Crimson Broadsword', 'sword', 'damaged')] }),
    ] }));
    expect(section).toEqual({ entries: [
      { name: 'Crimson Broadsword', entity: 'thing', states: [{ state: 'damaged', since: 2 }] },
      { name: 'Zhao Wuchen', entity: 'character', states: [{ state: 'dead', detail: 'by a spear', since: 1 }] },
    ] });
    expect(presentStatus(section)).toBe('- Crimson Broadsword (thing): damaged since Chapter 2\n- Zhao Wuchen (character): dead (by a spear) since Chapter 1');
    expect(presentStatus({ entries: [] })).toBe('No one is dead, wounded, sealed away or changed, and nothing is damaged or destroyed.');
  });

  it('shows at most its own count besides the main character', () => {
    const many = Array.from({ length: STATUS_SECTION_LIMIT + 5 }, (_, index) => entry(`x${index}`, `Victim ${index}`));
    const section = statusSection(deriveStatus({ entries: [...ENTRIES, ...many], chapters: [chapter(1, {
      statusChanges: [status('c1-p1', 0, 'MC', 'mc', 'wounded'), ...many.map((victim, index) => ({ ...status(`c1-p${index + 2}`, 0, victim.name, undefined, 'dead'), payload: { origin: 'harness' as const, subject: { name: victim.name, entryId: victim.id }, state: 'dead' as const, entity: 'character' as const } }))],
    })] }));
    expect(section.entries).toHaveLength(STATUS_SECTION_LIMIT + 1);
    expect(section.entries[0]).toMatchObject({ name: 'Han Shuo', mainCharacter: true });
    expect(section.entries[1].name).toBe(`Victim ${STATUS_SECTION_LIMIT + 4}`);
  });
});
