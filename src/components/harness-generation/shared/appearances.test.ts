import { describe, expect, it } from 'vitest';
import {
  APPEARED_SECTION_CHARACTERS,
  appearancesSection,
  createCodexEntryResolver,
  deriveAppearances,
  describableAppearances,
  placeAppearances,
  readAppearanceTag,
  resolveAppearances,
  resolveHoldingChanges,
  thingAppearancesFromHoldings,
  type AppearanceAttachment,
  type AppearancesChapter,
  type CodexEntry,
  type HoldingChangeAttachment,
} from '@seihouse/sen/harness-generation';
import type { SpeakerAttachment } from '../../../narrative/speech';
import { readMarks } from '../../../narrative/marks';
import { acceptHarnessModelResponse } from './responseAcceptance';
import { REST_OF_CHAPTER } from '../../../test-utils/writtenChapter';

/**
 * Appearances in the tiny SEN language: the writer tags who and what first
 * steps onto the page (`[[appears: Name | character]]`) and each change to a
 * look (`[[look: Name | what changed]]`). The HARNESS reads them apart from
 * holdings, saves each on its sentence, resolves each name to the Codex entry
 * holdings use, and works out again, in story order, who is on the page.
 */

const tagsOf = (text: string) => readMarks(text).wordTags;
const tag = (text: string) => tagsOf(text)[0];

const entry = (id: string, name: string, extra: Partial<CodexEntry> = {}): CodexEntry => ({
  id, storyId: 'story', kind: 'character', name, origin: { source: 'foundation' }, createdAt: 'now', ...extra,
});

const appearance = (id: string, blockId: string, start: number, payload: AppearanceAttachment['payload'], text = 'A sentence.'): AppearanceAttachment => ({
  id, kind: 'appearance', anchor: { level: 'span', blockId, startOffset: start, endOffset: start + text.length, selectedText: text }, payload,
});
const speaker = (id: string, blockId: string, start: number, name: string, protagonist = false): SpeakerAttachment => ({
  id, kind: 'speaker', anchor: { level: 'span', blockId, startOffset: start, endOffset: start + 5, selectedText: '"Go."' },
  payload: { speaker: name, protagonist, origin: 'harness' },
} as SpeakerAttachment);

describe('Reading appearance tags', () => {
  it('reads appears and look tags as their own kind, never as holdings, and keeps the name where a tag stood in its place', () => {
    const reading = readMarks('[[appears: Old Wu | character]] A stooped smith waited. [[look: MC | a burn on his palm]] Ye Chen winced.');
    expect(reading.text).toBe('A stooped smith waited. Ye Chen winced.');
    expect(reading.wordTags.map(found => [found.word, found.parts])).toEqual([
      ['appears', ['Old Wu', 'character']],
      ['look', ['MC', 'a burn on his palm']],
    ]);
    // A tag written where its name belongs leaves the name in the text; the main character's MC never enters the prose.
    expect(readMarks('The door swung open for [[appears: Old Wu | character]].').text).toBe('The door swung open for Old Wu.');
    expect(readMarks('The door swung open for [[appears: MC | character]].').text).not.toContain('MC');
    // Other spellings a writer slips into read the same.
    expect(tag('[[first appearance: Old Wu | person]] He waited.').word).toBe('appears');
    expect(tag('[[new look: Old Wu | a fresh scar]] He waited.').word).toBe('look');
  });

  it('reads who or what, its kind or its change, and sets aside what cannot be an appearance', () => {
    expect(readAppearanceTag(tag('[[appears: Old Wu | character]] x'))).toEqual({ ok: true, appearance: { event: 'appears', subject: { name: 'Old Wu' }, entity: 'character' } });
    expect(readAppearanceTag(tag('[[appears: Crimson Broadsword | weapon]] x'))).toEqual({ ok: true, appearance: { event: 'appears', subject: { name: 'Crimson Broadsword' }, entity: 'thing' } });
    expect(readAppearanceTag(tag('[[appears: Silver Lotus | beast]] x'))).toMatchObject({ ok: true, appearance: { entity: 'character' } });
    expect(readAppearanceTag(tag('[[look: MC | a scar | across the cheek]] x'))).toEqual({ ok: true, appearance: { event: 'look', subject: { name: 'MC' }, change: 'a scar; across the cheek' } });
    expect(readAppearanceTag(tag('[[appears: Iron Gate | place]] x'))).toEqual({ ok: false, problem: 'an appears tag for Iron Gate named ‘place’, neither a character nor a thing' });
    expect(readAppearanceTag(tag(`[[look: Old Wu | ${'very '.repeat(16)}tired]] x`))).toMatchObject({ ok: false });
    expect(readAppearanceTag(tag('[[gained: MC | Sword]] x'))).toEqual({ ok: false, problem: 'a gained tag is not an appearance' });
    expect(readAppearanceTag(tag('[[appears: MC | thing]] x'))).toEqual({ ok: false, problem: 'an appears tag named the main character as a thing' });
  });

  it('places each appearance on the sentence its tag points at, apart from the holding tags beside it', () => {
    const text = 'The armory was cold. [[appears: Old Wu | character]] A stooped smith waited. [[gained: MC | Sword]] Ye Chen took a sword.';
    const reading = readMarks(text);
    const placed = placeAppearances({ paragraphs: [{ blockId: 'c1-p1', text: reading.text, wordTags: reading.wordTags }] });
    expect(placed.problems).toEqual([]);
    expect(placed.appearances).toEqual([{
      id: 'appearance:c1-p1:21-44:0', kind: 'appearance',
      anchor: { level: 'span', blockId: 'c1-p1', startOffset: 21, endOffset: 44, selectedText: 'A stooped smith waited.' },
      payload: { origin: 'harness', event: 'appears', subject: { name: 'Old Wu' }, entity: 'character' },
    }]);
  });
});

describe('Accepting a chapter with appearance tags', () => {
  const accept = (paragraphs: string[], options: Parameters<typeof acceptHarnessModelResponse>[2] = {}, extra: Record<string, unknown> = {}) =>
    acceptHarnessModelResponse(JSON.stringify({ title: 'The Armory', paragraphs: [...paragraphs, REST_OF_CHAPTER], ...extra }), 1, options);

  it('keeps every appearance on the draft, and holdings read only holding tags', () => {
    const result = accept([
      '[[appears: MC | character]] Ye Chen stepped into the armory. [[appears: Rusted Iron Sword | thing]] [[gained: MC | Rusted Iron Sword]] He lifted an old blade.',
    ], { holdingsExpected: true }, { mainCharacterHoldings: ['Rusted Iron Sword', '[[appears: Silver Bell | thing]]'] });
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.draft.paragraphs[0]).toBe('Ye Chen stepped into the armory. He lifted an old blade.');
    expect(result.draft.appearances?.map(found => [found.payload.event, found.payload.subject.name, found.payload.entity, found.anchor.selectedText])).toEqual([
      ['appears', 'MC', 'character', 'Ye Chen stepped into the armory.'],
      ['appears', 'Rusted Iron Sword', 'thing', 'He lifted an old blade.'],
    ]);
    expect(result.draft.holdingChanges?.map(change => [change.payload.verb, change.payload.target?.name])).toEqual([['gained', 'Rusted Iron Sword']]);
    // An appearance tag in the closing list is neither a holding change nor a name the list holds.
    expect(result.draft.closingHoldings).toEqual(['Rusted Iron Sword']);
    expect(result.warnings.map(warning => warning.code)).not.toContain('holding_tags_incomplete');
  });

  it('flags unreadable appearance tags apart from holdings, and keeps an empty list when the writer was asked for them', () => {
    const flagged = accept(['[[appears: Old Wu]] He waited. [[appears: Iron Gate | place]] The gate stood open.'], { appearancesExpected: true });
    expect(flagged.accepted).toBe(true);
    if (!flagged.accepted) return;
    expect(flagged.draft.appearances).toEqual([]);
    expect(flagged.warnings).toContainEqual({
      code: 'appearance_tags_incomplete',
      message: '1 appearance tag was unreadable and removed; an appears tag for Iron Gate named ‘place’, neither a character nor a thing.',
    });
    expect(flagged.warnings.map(warning => warning.code)).not.toContain('holding_tags_incomplete');
    // Without the skill and without tags, the chapter carries no appearances at all.
    const plain = accept(['Ye Chen waited.']);
    expect(plain.accepted && plain.draft.appearances).toBeUndefined();
  });
});

describe('Resolving appearances to Codex entries', () => {
  const chapter = { id: 'ch1', chapterNumber: 1 };
  const declared = [{ name: 'Ye Chen', mainCharacter: true as const }, { name: 'Elder Qin', aliases: ['Qin'] }];
  let next = 0;
  const createId = () => `hcx_${++next}`;

  it('gives a name tagged by an appearance and a holding change one entry, made once', () => {
    next = 0;
    const appearances = [
      appearance('a1', 'c1-p1', 0, { origin: 'harness', event: 'appears', subject: { name: 'MC' }, entity: 'character' }),
      appearance('a2', 'c1-p1', 20, { origin: 'harness', event: 'appears', subject: { name: 'Jade Slip' }, entity: 'thing' }),
      appearance('a3', 'c1-p2', 0, { origin: 'harness', event: 'appears', subject: { name: 'Qin' }, entity: 'character' }),
    ];
    const changes: HoldingChangeAttachment[] = [{
      id: 'h1', kind: 'holding-change', anchor: { level: 'span', blockId: 'c1-p1', startOffset: 20, endOffset: 31, selectedText: 'A sentence.' },
      payload: { origin: 'harness', verb: 'gained', holder: { name: 'MC' }, target: { name: 'Jade Slip' } },
    }];
    const resolving = { storyId: 'story', chapter, entries: [], declared, createdAt: 'now', createId };
    const resolver = createCodexEntryResolver(resolving);
    const resolved = resolveAppearances({ ...resolving, appearances, resolver });
    const holdings = resolveHoldingChanges({ ...resolving, changes, resolver });
    expect(resolver.created.map(made => [made.kind, made.name, made.mainCharacter ?? false, made.origin.source])).toEqual([
      ['character', 'Ye Chen', true, 'foundation'],
      ['thing', 'Jade Slip', false, 'tag'],
      ['character', 'Elder Qin', false, 'foundation'],
    ]);
    expect(resolved.appearances.map(found => found.payload.subject.entryId)).toEqual(['hcx_1', 'hcx_2', 'hcx_3']);
    expect(holdings.changes[0].payload).toMatchObject({ holder: { entryId: 'hcx_1' }, target: { entryId: 'hcx_2' } });
  });

  it('finds a look\'s entry among those already made, takes its kind from it, and never makes one', () => {
    next = 0;
    const entries = [entry('e1', 'Ye Chen', { mainCharacter: true }), entry('e2', 'Jade Slip', { kind: 'thing' })];
    const resolved = resolveAppearances({
      storyId: 'story', chapter, entries, declared, createdAt: 'now', createId,
      appearances: [
        appearance('a1', 'c1-p1', 0, { origin: 'harness', event: 'look', subject: { name: 'MC' }, change: 'a scar' }),
        appearance('a2', 'c1-p1', 20, { origin: 'harness', event: 'look', subject: { name: 'jade slip' }, change: 'cracked' }),
        appearance('a3', 'c1-p2', 0, { origin: 'harness', event: 'look', subject: { name: 'Nobody Yet' }, change: 'a hat' }),
      ],
    });
    expect(resolved.created).toEqual([]);
    expect(resolved.appearances.map(found => [found.payload.subject.entryId, found.payload.entity])).toEqual([['e1', 'character'], ['e2', 'thing'], [undefined, undefined]]);
  });
});

describe('Who is on the page', () => {
  const entries = [entry('mc', 'Ye Chen', { mainCharacter: true }), entry('wu', 'Old Wu'), entry('sword', 'Rusted Iron Sword', { kind: 'thing' })];
  const appears = (id: string, blockId: string, start: number, entryId: string | undefined, name: string, entity: 'character' | 'thing' = 'character') =>
    appearance(id, blockId, start, { origin: 'harness', event: 'appears', subject: { name, ...(entryId ? { entryId } : {}) }, entity });
  const looks = (id: string, blockId: string, start: number, entryId: string | undefined, name: string, change: string) =>
    appearance(id, blockId, start, { origin: 'harness', event: 'look', subject: { name, ...(entryId ? { entryId } : {}) }, change });

  it('works out, in story order, who appeared, every change to a look, and the latest look written down', () => {
    const chapters: AppearancesChapter[] = [
      {
        id: 'ch1', chapterNumber: 1,
        appearances: [appears('a1', 'c1-p1', 0, 'mc', 'MC'), appears('a2', 'c1-p2', 0, 'sword', 'Rusted Iron Sword', 'thing')],
        looks: { status: 'described', at: 'now', looks: [{ appearanceId: 'a1', summary: 'A lean youth.', traits: { build: 'lean' } }] },
      },
      {
        id: 'ch2', chapterNumber: 2,
        appearances: [looks('a3', 'c2-p3', 0, 'mc', 'MC', 'a scar across his cheek'), appears('a4', 'c2-p1', 0, 'wu', 'Old Wu')],
        looks: { status: 'described', at: 'now', looks: [{ appearanceId: 'a3', summary: 'A lean youth with a scarred cheek.', traits: { build: 'lean', marks: 'scar across the cheek' }, conflict: 'The author gave him no scar.' }] },
      },
    ];
    const state = deriveAppearances({ entries, chapters });
    expect(state.flags).toEqual([]);
    expect(state.subjects.map(subject => [subject.name, subject.entity, subject.mainCharacter, subject.first.chapterNumber])).toEqual([
      ['Ye Chen', 'character', true, 1], ['Rusted Iron Sword', 'thing', false, 1], ['Old Wu', 'character', false, 2],
    ]);
    const mc = state.subjects[0];
    expect(mc.changes).toEqual([{ change: 'a scar across his cheek', passage: expect.objectContaining({ chapterNumber: 2, blockId: 'c2-p3', recordId: 'a3' }) }]);
    expect(mc.looks.map(look => look.summary)).toEqual(['A lean youth.', 'A lean youth with a scarred cheek.']);
    expect(mc.look).toMatchObject({ summary: 'A lean youth with a scarred cheek.', conflict: 'The author gave him no scar.', passage: { chapterNumber: 2 } });
    // The look step describes a chapter's accepted appearances in reading order.
    expect(describableAppearances(state, 'ch2').map(found => found.appearanceId)).toEqual(['a4', 'a3']);
  });

  it('describes a chapter\'s appearances in reading order, within a paragraph too', () => {
    const state = deriveAppearances({ entries, chapters: [{
      id: 'ch1', chapterNumber: 1,
      appearances: [
        appears('a1', 'c1-p1', 0, 'mc', 'MC'),
        appears('a2', 'c1-p3', 0, 'wu', 'Old Wu'),
        looks('a3', 'c1-p3', 50, 'mc', 'MC', 'a burn on his palm'),
      ],
    }] });
    expect(describableAppearances(state, 'ch1').map(found => found.appearanceId)).toEqual(['a1', 'a2', 'a3']);
  });

  it('reads a look tag in the paragraph that first shows someone as that first look, not a change', () => {
    const state = deriveAppearances({ entries, chapters: [{
      id: 'ch1', chapterNumber: 1,
      appearances: [appears('a1', 'c1-p2', 0, 'wu', 'Old Wu'), looks('a2', 'c1-p2', 80, 'wu', 'Old Wu', 'an oily grin'), looks('a3', 'c1-p9', 0, 'wu', 'Old Wu', 'a fresh burn')],
    }] });
    expect(state.subjects[0].changes.map(change => change.change)).toEqual(['a fresh burn']);
    expect(state.flags).toEqual([]);
    expect(describableAppearances(state, 'ch1').map(found => found.appearanceId)).toEqual(['a1', 'a3']);
  });

  it('gives a thing its first appearance on the holding tag that first shows it, once', () => {
    const tongs = entry('tongs', 'Iron Tongs', { kind: 'thing' });
    const change = (id: string, blockId: string, verb: 'gained' | 'equipped' | 'lost', target: CodexEntry): HoldingChangeAttachment => ({
      id, kind: 'holding-change', anchor: { level: 'span', blockId, startOffset: 0, endOffset: 11, selectedText: 'A sentence.' },
      payload: { origin: 'harness', verb, holder: { name: 'MC', entryId: 'mc' }, target: { name: target.name, entryId: target.id } },
    });
    const earlier: AppearancesChapter = { id: 'ch1', chapterNumber: 1, holdingChanges: [change('h0', 'c1-p1', 'gained', tongs)] };
    const chapter: AppearancesChapter = {
      id: 'ch2', chapterNumber: 2,
      appearances: [appears('a1', 'c2-p1', 0, 'mc', 'MC')],
      holdingChanges: [change('h1', 'c2-p2', 'lost', entries[2]), change('h2', 'c2-p3', 'equipped', tongs), change('h3', 'c2-p4', 'equipped', tongs), change('h4', 'c2-p5', 'gained', entries[2])],
    };
    const found = thingAppearancesFromHoldings({ chapter, chapters: [earlier, chapter], entries: [...entries, tongs] });
    // Tongs held before the tag existed appear now, once; the sword appears where it is gained, not where it is lost.
    expect(found.map(appearance => [appearance.payload.subject.name, appearance.anchor.blockId, appearance.payload.entity, appearance.id])).toEqual([
      ['Iron Tongs', 'c2-p3', 'thing', 'appearance:c2-p3:0-11:1'],
      ['Rusted Iron Sword', 'c2-p5', 'thing', 'appearance:c2-p5:0-11:2'],
    ]);
    // A thing already on the page never appears again.
    expect(thingAppearancesFromHoldings({ chapter: { ...chapter, appearances: [...chapter.appearances!, ...found] }, chapters: [earlier], entries: [...entries, tongs] })).toEqual([]);
  });

  it('flags an appearance that cannot be true and leaves it out, and someone who speaks before appearing once a chapter', () => {
    const chapters: AppearancesChapter[] = [
      // Written before the Appearance skill: speech there is never flagged.
      { id: 'ch1', chapterNumber: 1, speakers: [speaker('s1', 'c1-p1', 0, 'Old Wu')] },
      {
        id: 'ch2', chapterNumber: 2,
        appearances: [
          appears('a1', 'c2-p1', 10, 'mc', 'MC'),
          appears('a2', 'c2-p2', 0, 'mc', 'Ye Chen'),
          looks('a3', 'c2-p3', 0, undefined, 'Elder Qin', 'a new robe'),
          appearance('a4', 'c2-p4', 0, { origin: 'harness', event: 'appears', subject: { name: 'Mist' } }),
        ],
        speakers: [
          // The main character speaks at the start of the paragraph that shows him appearing: the appearance comes first.
          speaker('s2', 'c2-p1', 10, 'MC', true),
          speaker('s3', 'c2-p5', 0, 'Old Wu'), speaker('s4', 'c2-p6', 0, 'Old Wu'),
          // A group that speaks is never a character who should have appeared.
          speaker('s5', 'c2-p7', 0, 'Iron Bastion Sect'),
        ],
        looks: { status: 'described', at: 'now', looks: [{ appearanceId: 'a2', summary: 'Never kept.', traits: {} }] },
      },
    ];
    const state = deriveAppearances({ entries, chapters });
    expect(state.flags.map(flag => [flag.kind, flag.chapterNumber, flag.message])).toEqual([
      ['already-appeared', 2, 'Chapter 2: ‘Ye Chen’ appears again, but is already on the page. It is not counted twice.'],
      ['look-unseen', 2, 'Chapter 2: the look of ‘Elder Qin’ changes, but no tag shows them appearing. The change is left out.'],
      ['unknown-kind', 2, 'Chapter 2: the appears tag for ‘Mist’ names no kind of entry.'],
      ['speaks-unseen', 2, 'Chapter 2: ‘Old Wu’ speaks before any tag shows them appearing.'],
    ]);
    expect(state.flags[3]).toMatchObject({ recordId: 's3', blockId: 'c2-p5', name: 'Old Wu' });
    // The look of an appearance the rules left out is never kept.
    expect(state.subjects.map(subject => [subject.name, subject.look])).toEqual([['Ye Chen', undefined]]);
  });

  it('shows the writer the main character first, then the characters and the things seen most recently, each with its look', () => {
    const many = Array.from({ length: APPEARED_SECTION_CHARACTERS + 2 }, (_, index) => entry(`c${index}`, `Disciple ${index}`));
    const chapters: AppearancesChapter[] = [{
      id: 'ch1', chapterNumber: 1,
      appearances: [
        appears('t1', 'c1-p1', 0, 'sword', 'Rusted Iron Sword', 'thing'),
        ...many.map((made, index) => appears(`x${index}`, `c1-p${index + 2}`, 0, made.id, made.name)),
        appears('m1', 'c1-p40', 0, 'mc', 'MC'),
      ],
      looks: { status: 'described', at: 'now', looks: [{ appearanceId: 'm1', summary: 'A lean youth.', traits: {} }] },
    }];
    const section = appearancesSection(deriveAppearances({ entries: [...entries, ...many], chapters }));
    expect(section.entries[0]).toEqual({ name: 'Ye Chen', entity: 'character', mainCharacter: true, look: 'A lean youth.' });
    // The characters seen most recently first, as many as the section holds; then the things.
    expect(section.entries.slice(1, 3).map(found => found.name)).toEqual([`Disciple ${many.length - 1}`, `Disciple ${many.length - 2}`]);
    expect(section.entries.filter(found => found.entity === 'character' && !found.mainCharacter)).toHaveLength(APPEARED_SECTION_CHARACTERS);
    // Without a written look, the writer's own description stands in.
    expect(section.entries.at(-1)).toEqual({ name: 'Rusted Iron Sword', entity: 'thing', look: 'A sentence.' });
    expect(appearancesSection(deriveAppearances({ entries, chapters: [] }))).toEqual({ entries: [] });
  });
});
