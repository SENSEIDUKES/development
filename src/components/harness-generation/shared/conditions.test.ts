import { describe, expect, it } from 'vitest';
import type { WorldCard, WorldRecord } from '../../../narrative/worldRecord';
import { CONDITIONS_HEADING, presentConditions } from '../../../server/harness-generation/prompt';
import { presentTagSubjects } from '../../../server/harness-generation/tagger';
import { conditionsSection, deriveConditions } from './conditions';
import { codexEntriesWithWorldCards } from './holdings';
import { tagSubjectsOfStory } from './tagger';
import { deriveStoryCodex } from './storyCodex';

/**
 * Conditions in the HARNESS (SENSEI, 2026-11-11): the card states the whole
 * course, code runs it as the chapters pass, the writer is told where each
 * stands before every chapter, and the Codex shows what each character
 * carries now. No model decides how a condition goes.
 */

const card = (name: string, status: string | undefined, extra: Partial<WorldCard> = {}): WorldCard => ({
  key: `world:character:${name.toLowerCase().replace(/\s+/g, '-')}`, kind: 'character', name, enteredInChapter: 0,
  slots: { ...(status ? { status } : {}) }, ...extra,
});
const world: WorldRecord = { cards: [
  card('Shen Mei', 'Blind in one eye'),
  card('Lin Qingshan', 'Frost-burned hand | numb fingers > blackened skin > the hand is lost | a stage every 5 chapters | ends if a healer treats it\nWinter cough | dry > wet > gone | a stage every 2 chapters', { mainCharacter: true }),
  card('Ning Hao', 'Well'),
  card('Elder Bai', undefined),
  { key: 'world:thing:pendant', kind: 'thing', name: 'Frost Bone Pendant', enteredInChapter: 0, slots: { status: 'Cracked' } },
] };

const carried = (record: WorldRecord | undefined, chapterNumber: number) => deriveConditions({ world: record, chapterNumber }).characters;

describe('What each character carries at a chapter', () => {
  it('lists only those who carry something, the main character first, each condition at its stage', () => {
    expect(carried(world, 1)).toEqual([
      { key: 'character:lin qingshan', cardKey: 'world:character:lin-qingshan', name: 'Lin Qingshan', mainCharacter: true, conditions: [
        { name: 'Frost-burned hand', showing: 'numb fingers', stage: 1, stages: 3, movesIn: 5, then: 'next', endsIf: ['a healer treats it'] },
        { name: 'Winter cough', showing: 'dry', stage: 1, stages: 2, movesIn: 2, then: 'next', endsIf: [] },
      ] },
      { key: 'character:shen mei', cardKey: 'world:character:shen-mei', name: 'Shen Mei', mainCharacter: false, conditions: [{ name: 'Blind in one eye', endsIf: [] }] },
    ]);
  });

  it('moves each by the chapter count alone: Chapter 1 is its first, and nothing in between has to be read', () => {
    const stages = (chapter: number) => carried(world, chapter)[0].conditions.map(condition => [condition.name, condition.showing, condition.movesIn]);
    expect(stages(4)).toEqual([['Frost-burned hand', 'numb fingers', 2], ['Winter cough', 'wet', 1]]);
    // The cough has run its two stages and passed; the hand is in its last numb chapter.
    expect(stages(5)).toEqual([['Frost-burned hand', 'numb fingers', 1]]);
    expect(stages(6)).toEqual([['Frost-burned hand', 'blackened skin', 5]]);
    expect(stages(11)).toEqual([['Frost-burned hand', 'the hand is lost', undefined]]);
    expect(stages(300)).toEqual([['Frost-burned hand', 'the hand is lost', undefined]]);
    // A chapter number below one is the opening.
    expect(carried(world, 0)).toEqual(carried(world, 1));
  });

  it('starts a later card\'s conditions in the chapter that card entered, and not before', () => {
    const later: WorldRecord = { cards: [card('Gate Guard', 'Arrow wound | bleeding > festering | a stage every 3 chapters', { enteredInChapter: 8 })] };
    expect(carried(later, 7)).toEqual([]);
    expect(carried(later, 8)[0].conditions[0]).toMatchObject({ showing: 'bleeding', movesIn: 3 });
    expect(carried(later, 11)[0].conditions[0]).toMatchObject({ showing: 'festering', stage: 2 });
  });

  it('is nothing at all for a world with no cards, or one where everyone is well', () => {
    expect(carried(undefined, 4)).toEqual([]);
    expect(conditionsSection({ world: { cards: [card('Ning Hao', 'Well')] }, chapterNumber: 4 })).toBeUndefined();
  });
});

describe('What the writer is told', () => {
  it('says what the section is and that its course is not the writer\'s to move', () => {
    expect(CONDITIONS_HEADING).toBe('CONDITIONS (what each character carries now; each runs its own course as the chapters pass. Write each at the stage given, and do not move it on or end it unless the chapter shows what ends it)');
  });

  it('gives one line a condition: who, what, how it shows now, where its course stands and what would end it', () => {
    expect(presentConditions(conditionsSection({ world, chapterNumber: 9 })!)).toBe([
      '- Lin Qingshan (main character): Frost-burned hand, blackened skin (stage 2 of 3; reaches the next stage in 2 chapters; ends if a healer treats it)',
      '- Shen Mei: Blind in one eye',
    ].join('\n'));
    expect(presentConditions(conditionsSection({ world, chapterNumber: 4 })!).split('\n')).toEqual([
      '- Lin Qingshan (main character): Frost-burned hand, numb fingers (stage 1 of 3; reaches the next stage in 2 chapters; ends if a healer treats it)',
      '- Lin Qingshan (main character): Winter cough, wet (stage 2 of 2; passes in 1 chapter)',
      '- Shen Mei: Blind in one eye',
    ]);
    // At its last stage it says so, and promises nothing further.
    expect(presentConditions(conditionsSection({ world, chapterNumber: 40 })!).split('\n')[0])
      .toBe('- Lin Qingshan (main character): Frost-burned hand, the hand is lost (stage 3 of 3, its last; ends if a healer treats it)');
  });
});

describe('What the tagger is told', () => {
  it('lists what each character carries beside their name, from their card and from the page, so an end can name it', () => {
    const entries = codexEntriesWithWorldCards({ storyId: 'story-1', entries: [], cards: world.cards, createdAt: '2026-11-11T00:00:00.000Z', createId: card => `entry:${card.key}` });
    const lin = entries.find(entry => entry.name === 'Lin Qingshan')!;
    const sentence = 'A branch tore his shoulder open.';
    const chapters = [{ id: 'chapter-2', chapterNumber: 2, statuses: [{
      id: 'status:c2-p1:0', kind: 'status' as const, anchor: { level: 'span' as const, blockId: 'c2-p1', startOffset: 0, endOffset: sentence.length, selectedText: sentence },
      payload: { origin: 'harness' as const, subject: { name: 'MC', entryId: lin.id }, status: 'shoulder injured' },
    }] }];
    const conditions = deriveConditions({ world, entries, chapters, chapterNumber: 6 }).characters;
    const subjects = tagSubjectsOfStory({ entries, world, conditions });
    expect(subjects.find(subject => subject.name === 'Lin Qingshan')?.conditions).toEqual(['Frost-burned hand (blackened skin)', 'shoulder injured']);
    expect(subjects.find(subject => subject.name === 'Shen Mei')?.conditions).toEqual(['Blind in one eye']);
    expect(subjects.find(subject => subject.name === 'Ning Hao')?.conditions).toBeUndefined();
    expect(presentTagSubjects(subjects)).toContain('- Lin Qingshan (the main character) — conditions: Frost-burned hand (blackened skin); shoulder injured');
    // A thing carries none.
    expect(subjects.find(subject => subject.kind === 'thing')?.conditions).toBeUndefined();
  });
});

describe('Two cards whose names read alike', () => {
  it('each carry their own conditions, in the record and in the Codex', () => {
    const alike: WorldRecord = { openToTheReader: true, cards: [
      { key: 'world:character:phoenix-east', kind: 'character', name: 'Phoenix (East)', enteredInChapter: 0, slots: { status: 'Clipped wing' } },
      { key: 'world:character:phoenix-west', kind: 'character', name: 'Phoenix (West)', enteredInChapter: 0, slots: {} },
      { key: 'world:character:phoenix-north', kind: 'character', name: 'Phoenix (North)', enteredInChapter: 0, slots: { status: 'Blind' } },
    ] };
    expect(carried(alike, 1).map(character => [character.cardKey, character.conditions.map(condition => condition.name)])).toEqual([
      ['world:character:phoenix-east', ['Clipped wing']], ['world:character:phoenix-north', ['Blind']],
    ]);
    const codex = deriveStoryCodex({ entries: [], chapters: [], world: alike });
    expect(codex.characters.map(character => [character.name, character.conditions?.map(condition => condition.name)])).toEqual([
      ['Phoenix (East)', ['Clipped wing']], ['Phoenix (West)', undefined], ['Phoenix (North)', ['Blind']],
    ]);
  });
});

describe('What the Codex shows', () => {
  it('lists a condition the page began with the sentence that began it, and reports an end that ended nothing', () => {
    const entries = codexEntriesWithWorldCards({ storyId: 'story-1', entries: [], cards: world.cards, createdAt: '2026-11-11T00:00:00.000Z', createId: card => `entry:${card.key}` });
    const lin = entries.find(entry => entry.name === 'Lin Qingshan')!;
    const text = ['A branch tore his shoulder open.', 'The fever never came.'];
    const tag = (index: number, status: string, ended = false) => ({
      id: `status:c1-p${index + 1}:0`, kind: 'status' as const, anchor: { level: 'span' as const, blockId: `c1-p${index + 1}`, startOffset: 0, endOffset: text[index].length, selectedText: text[index] },
      payload: { origin: 'harness' as const, subject: { name: 'MC', entryId: lin.id }, status, ...(ended ? { ended: true as const } : {}) },
    });
    const codex = deriveStoryCodex({ entries, world: { ...world, openToTheReader: true }, chapters: [{ id: 'chapter-1', chapterNumber: 1, paragraphs: text, statuses: [tag(0, 'shoulder injured'), tag(1, 'fever', true)] }] });
    expect(codex.characters.find(character => character.name === 'Lin Qingshan')?.conditions).toEqual([
      { name: 'Frost-burned hand', showing: 'numb fingers' },
      { name: 'Winter cough', showing: 'dry' },
      { name: 'shoulder injured', passage: { chapterNumber: 1, blockId: 'c1-p1', text: text[0] } },
    ]);
    expect(codex.checks).toEqual([expect.objectContaining({
      kind: 'condition-not-carried', chapterNumber: 1, blockId: 'c1-p2',
      message: 'Chapter 1: a tag says ‘fever’ ended for Lin Qingshan, but they carried no such condition. It is left out.',
    })]);
  });


  it('shows each character what they carry as of the latest chapter, and never where the course goes next', () => {
    const chapter = (chapterNumber: number) => ({ id: `chapter-${chapterNumber}`, chapterNumber, paragraphs: ['Snow fell.'] });
    const open: WorldRecord = { ...world, openToTheReader: true };
    const lin = (chapters: number[]) => deriveStoryCodex({ entries: [], chapters: chapters.map(chapter), world: open }).characters.find(character => character.name === 'Lin Qingshan')!;
    expect(lin([]).conditions).toEqual([{ name: 'Frost-burned hand', showing: 'numb fingers' }, { name: 'Winter cough', showing: 'dry' }]);
    expect(lin([1, 2, 3, 4, 5, 6]).conditions).toEqual([{ name: 'Frost-burned hand', showing: 'blackened skin' }]);
    // The line the card wrote is never shown as a fact; someone who is well carries nothing.
    expect(lin([]).atChapterZero?.map(fact => fact.slot.id)).not.toContain('status');
    const codex = deriveStoryCodex({ entries: [], chapters: [], world: open });
    expect(codex.characters.find(character => character.name === 'Ning Hao')?.conditions).toBeUndefined();
    // A thing's status is still a fact on its card.
    expect(codex.items.find(item => item.name === 'Frost Bone Pendant')?.atChapterZero?.map(fact => [fact.slot.label, fact.value])).toContainEqual(['Status', 'Cracked']);
  });
});
