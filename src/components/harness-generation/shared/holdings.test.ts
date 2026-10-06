import { describe, expect, it } from 'vitest';
import { readMarks } from '../../../narrative/marks';
import type { CodexEntry } from '../../../narrative/holdings';
import { harnessParagraphBlockId } from './chapterBody';
import {
  deriveHoldings,
  holdingName,
  holdingsSection,
  namesNearlyMatch,
  placeHoldingChanges,
  readHoldingTag,
  resolveHoldingChanges,
  type DeclaredCharacter,
  type HoldingsChapter,
} from './holdings';

const DECLARED: DeclaredCharacter[] = [
  { name: 'Ye Chen', aliases: ['Young Master Ye'], mainCharacter: true },
  { name: 'Elder Qin', aliases: ['Old Qin'] },
];

/** Commits chapters through the real path: tags read out of prose, placed on sentences, resolved to entries. */
const story = () => {
  let entries: CodexEntry[] = [];
  let next = 0;
  const chapters: HoldingsChapter[] = [];
  const write = (chapterNumber: number, paragraphs: string[], closingHoldings?: string[]) => {
    const placement = placeHoldingChanges({
      paragraphs: paragraphs.map((paragraph, index) => ({ blockId: harnessParagraphBlockId(chapterNumber, index), ...readMarks(paragraph) })),
    });
    const resolved = resolveHoldingChanges({
      storyId: 'story-1', chapter: { id: `chapter-${chapterNumber}`, chapterNumber }, changes: placement.changes,
      entries, declared: DECLARED, createdAt: '2026-10-03T00:00:00.000Z', createId: () => `entry-${++next}`,
    });
    entries = [...entries, ...resolved.created];
    const chapter = { id: `chapter-${chapterNumber}`, chapterNumber, holdingChanges: resolved.changes, ...(closingHoldings ? { closingHoldings } : {}) };
    chapters.push(chapter);
    return { placement, resolved, chapter };
  };
  return { write, chapters, entries: () => entries, derive: () => deriveHoldings({ entries, chapters, mainCharacterName: 'Ye Chen' }) };
};

const main = (state: ReturnType<typeof deriveHoldings>) => state.characters.find(character => character.mainCharacter)!;
const things = (state: ReturnType<typeof deriveHoldings>) => main(state).things.map(thing => [thing.name, thing.count, thing.equipped]);
const abilities = (state: ReturnType<typeof deriveHoldings>) => main(state).abilities.map(ability => [ability.name, ability.stage, ability.level, ability.sealed, ability.usable]);
const flagKinds = (state: ReturnType<typeof deriveHoldings>) => state.flags.map(flag => flag.kind);

describe('reading a holding tag', () => {
  const tag = (source: string) => readMarks(source).wordTags[0];

  it('reads who, then what, then a count, a level or a reason', () => {
    expect(readHoldingTag(tag('[[gained: MC | Spirit Pill | 3]]'))).toEqual({ ok: true, change: { verb: 'gained', holder: { name: 'MC' }, target: { name: 'Spirit Pill' }, count: 3 } });
    expect(readHoldingTag(tag('[[lost: MC | Spirit Pill | ×1 | used up]]'))).toEqual({ ok: true, change: { verb: 'lost', holder: { name: 'MC' }, target: { name: 'Spirit Pill' }, count: 1, reason: 'used up' } });
    expect(readHoldingTag(tag('[[improved: MC | Iron Palm | Minor Success]]'))).toEqual({ ok: true, change: { verb: 'improved', holder: { name: 'MC' }, target: { name: 'Iron Palm' }, level: 'Minor Success' } });
    expect(readHoldingTag(tag('[[rank: Ye Chen | Qi Condensation | 3]]'))).toEqual({ ok: true, change: { verb: 'rank', holder: { name: 'Ye Chen' }, level: 'Qi Condensation 3' } });
  });

  it('keeps another spelling of lost as its reason', () => {
    expect(readHoldingTag(tag('[[consumed: MC | Spirit Pill | 1]]'))).toMatchObject({ ok: true, change: { verb: 'lost', count: 1, reason: 'consumed' } });
  });

  it('refuses an improvement with no new level', () => {
    expect(readHoldingTag(tag('[[improved: MC | Iron Palm]]'))).toEqual({ ok: false, problem: 'an improved tag for Iron Palm gave no new level' });
  });
});

describe('placing holding changes on sentences', () => {
  const place = (paragraph: string) => {
    const reading = readMarks(paragraph);
    return placeHoldingChanges({ paragraphs: [{ blockId: 'c1-p0', ...reading }] }).changes.map(change => [change.payload.verb, change.anchor.selectedText]);
  };

  it('puts each change on the sentence its tag starts, sits in, or ends', () => {
    expect(place('He searched the rack. [[gained: MC | Rusted Iron Sword]] He took the old blade. It was heavy.')).toEqual([['gained', 'He took the old blade.']]);
    expect(place('He reached [[gained: MC | Sword]] out and took it. Done.')).toEqual([['gained', 'He reached out and took it.']]);
    expect(place('He took the blade.[[gained: MC | Sword]] Then he left.')).toEqual([['gained', 'He took the blade.']]);
    expect(place('He took the blade. [[gained: MC | Sword]]')).toEqual([['gained', 'He took the blade.']]);
  });

  it('gives every change its own id, even on one sentence', () => {
    const reading = readMarks('[[gained: MC | Sword]] [[equipped: MC | Sword]] He drew it.');
    const { changes } = placeHoldingChanges({ paragraphs: [{ blockId: 'c1-p0', ...reading }] });
    expect(changes.map(change => change.id)).toEqual(['holding:c1-p0:0-11:0', 'holding:c1-p0:0-11:1']);
    expect(changes[0]).toMatchObject({ kind: 'holding-change', anchor: { level: 'span', blockId: 'c1-p0', startOffset: 0, endOffset: 11, selectedText: 'He drew it.' }, payload: { origin: 'harness' } });
  });

  it('reports a tag it cannot use, and places the rest', () => {
    const reading = readMarks('[[improved: MC | Iron Palm]] [[learned: MC | Iron Palm]] He learned it.');
    const placement = placeHoldingChanges({ paragraphs: [{ blockId: 'c1-p0', ...reading }] });
    expect(placement.changes.map(change => change.payload.verb)).toEqual(['learned']);
    expect(placement.problems).toEqual(['an improved tag for Iron Palm gave no new level']);
  });
});

describe('Codex entries for holdings', () => {
  it('resolves MC and the main character\'s names to one entry the app makes, with their declared aliases', () => {
    const run = story();
    run.write(1, ['[[gained: MC | Rusted Iron Sword]] He took it.', '[[equipped: Ye Chen | Rusted Iron Sword]] He drew it.', '[[knows: young master ye | Iron Palm]] He knew it.']);
    const characters = run.entries().filter(entry => entry.kind === 'character');
    expect(characters).toEqual([{ id: 'entry-1', storyId: 'story-1', kind: 'character', name: 'Ye Chen', aliases: ['Young Master Ye'], mainCharacter: true, origin: { source: 'foundation' }, createdAt: '2026-10-03T00:00:00.000Z' }]);
    expect(run.chapters[0].holdingChanges!.map(change => change.payload.holder.entryId)).toEqual(['entry-1', 'entry-1', 'entry-1']);
  });

  it('makes one entry per new name, reused by its exact name in later chapters', () => {
    const run = story();
    run.write(1, ['[[gained: MC | Rusted Iron Sword]] [[gained: Elder Qin | Jade Gourd]] [[gained: Lin | Ember Bell]] They took them.']);
    run.write(2, ['[[equipped: MC | rusted iron sword!]] He drew it. [[equipped: Old Qin | Jade Gourd]] Qin raised the gourd.']);
    expect(run.entries().map(entry => [entry.kind, entry.name, entry.origin.source])).toEqual([
      ['character', 'Ye Chen', 'foundation'], ['thing', 'Rusted Iron Sword', 'tag'], ['character', 'Elder Qin', 'foundation'],
      ['thing', 'Jade Gourd', 'tag'], ['character', 'Lin', 'tag'], ['thing', 'Ember Bell', 'tag'],
    ]);
    expect(run.entries().find(entry => entry.name === 'Lin')!.origin).toEqual({ source: 'tag', chapterId: 'chapter-1', chapterNumber: 1 });
    // Chapter 2 found every name it used; it made nothing new.
    expect(run.entries()).toHaveLength(6);
    expect(things(run.derive())).toEqual([['Rusted Iron Sword', 1, true]]);
  });

  it('keeps things and abilities apart even under one name', () => {
    const run = story();
    run.write(1, ['[[gained: MC | Fireball]] A scroll. [[learned: MC | Fireball]] He learned it.']);
    expect(run.entries().filter(entry => entry.name === 'Fireball').map(entry => entry.kind)).toEqual(['thing', 'ability']);
  });
});

describe('working out holdings', () => {
  it('keeps possession and equipment apart: putting a sword away keeps it owned', () => {
    const run = story();
    run.write(1, ['[[gained: MC | Rusted Iron Sword]] He took the sword. [[equipped: MC | Rusted Iron Sword]] He drew it.']);
    run.write(2, ['[[unequipped: MC | Rusted Iron Sword]] He sheathed it. [[gained: MC | Spirit Pill | 3]] Three pills.']);
    run.write(3, ['[[lost: MC | Spirit Pill | 1 | used up]] He swallowed one.']);
    const state = run.derive();
    expect(things(state)).toEqual([['Rusted Iron Sword', 1, false], ['Spirit Pill', 2, false]]);
    expect(main(state).history.map(event => [event.passage.chapterNumber, event.verb, event.target])).toEqual([
      [1, 'gained', 'Rusted Iron Sword'], [1, 'equipped', 'Rusted Iron Sword'], [2, 'unequipped', 'Rusted Iron Sword'], [2, 'gained', 'Spirit Pill'], [3, 'lost', 'Spirit Pill'],
    ]);
    expect(main(state).things[1].events.at(-1)).toMatchObject({ verb: 'lost', count: 1, reason: 'used up', passage: { chapterNumber: 3, text: 'He swallowed one.' } });
    expect(state.flags).toEqual([]);
  });

  it('keeps learning, learning finished, mastery and sealing apart: sealing keeps an ability known', () => {
    const run = story();
    run.write(1, ['[[gained: MC | Cloud Manual]] He found the manual. [[learning: MC | Cloud Step]] He began to practise.']);
    run.write(2, ['[[learned: MC | Cloud Step]] It finally clicked. [[improved: MC | Cloud Step | Minor Success]] His feet blurred.']);
    run.write(3, ['[[sealed: MC | Cloud Step]] The curse bit down.']);
    let state = run.derive();
    expect(abilities(state)).toEqual([['Cloud Step', 'learned', 'Minor Success', true, false]]);
    // Finding the manual was possession, never learning.
    expect(things(state)).toEqual([['Cloud Manual', 1, false]]);
    run.write(4, ['[[unsealed: MC | Cloud Step]] The curse broke.']);
    state = run.derive();
    expect(abilities(state)).toEqual([['Cloud Step', 'learned', 'Minor Success', false, true]]);
  });

  it('sets rank, and reads a starting kit the story only reveals', () => {
    const run = story();
    run.write(1, ['[[rank: MC | Qi Condensation 3]] He sat to cultivate. [[has: MC | Jade Pendant]] His mother\'s pendant was warm. [[knows: MC | Iron Palm | Initial]] His palm struck.']);
    run.write(5, ['[[rank: MC | Qi Condensation 4]] A breakthrough.']);
    const state = run.derive();
    expect(main(state).rank).toMatchObject({ text: 'Qi Condensation 4' });
    expect(main(state).rank!.events.map(event => event.passage.chapterNumber)).toEqual([1, 5]);
    expect(things(state)).toEqual([['Jade Pendant', 1, false]]);
    expect(abilities(state)).toEqual([['Iron Palm', 'learned', 'Initial', false, true]]);
  });

  it('flags a change that cannot be true and leaves it out', () => {
    const run = story();
    run.write(1, [
      '[[gained: MC | Rusted Iron Sword]] He took it. [[gained: MC | Rusted Iron Sword]] He took it again.',
      '[[improved: MC | Iron Palm | Major Success]] His palm burned. [[learning: MC | Wind Step]] He tried.',
      '[[unsealed: MC | Wind Step]] Nothing was sealed. [[lost: MC | Spirit Pill | 2]] Two pills fell.',
    ]);
    const state = run.derive();
    expect(flagKinds(state)).toEqual(['already-held', 'not-learned', 'sealed-state', 'not-held']);
    expect(state.flags.at(-1)).toMatchObject({ chapterNumber: 1, message: 'Chapter 1: Ye Chen loses ‘Spirit Pill’, which the record does not show them holding.' });
    expect(things(state)).toEqual([['Rusted Iron Sword', 1, false]]);
    expect(abilities(state)).toEqual([['Wind Step', 'learning', undefined, false, false]]);
  });

  it('records a thing as held the first time the story shows it taken in hand or put away', () => {
    // The owner's Goblin story, Chapter 1: Grit pulled a slate from under a stone, tagged only as equipped.
    const run = story();
    run.write(1, ['[[equipped: MC | Slate tally board]] He pulled a flat piece of slate from beneath a loose stone.',
      '[[unequipped: MC | Jade Sword]] He hung the jade sword on the wall.'], ['Slate tally board', 'Jade Sword']);
    const state = run.derive();
    expect(things(state)).toEqual([['Slate tally board', 1, true], ['Jade Sword', 1, false]]);
    // Nothing is flagged: the closing list and the record agree.
    expect(state.flags).toEqual([]);
  });

  it('flags losing more than held, and removes them all', () => {
    const run = story();
    run.write(1, ['[[gained: MC | Spirit Pill | 2]] Two pills. [[lost: MC | Spirit Pill | 5]] He spent five.']);
    const state = run.derive();
    expect(things(state)).toEqual([]);
    expect(flagKinds(state)).toEqual(['count-mismatch']);
  });

  it('is worked out the same every time, and follows a chapter\'s current version', () => {
    const run = story();
    run.write(5, ['[[gained: MC | Spirit Pill | 3]] He claimed three pills.']);
    run.write(7, ['[[lost: MC | Spirit Pill | 1]] He swallowed one.']);
    expect(run.derive()).toEqual(run.derive());
    expect(things(run.derive())).toEqual([['Spirit Pill', 2, false]]);
    // Chapter 5 rewritten without the gain: the pills are gone, and chapter 7 is flagged.
    run.chapters[0] = { ...run.chapters[0], holdingChanges: [] };
    const state = run.derive();
    expect(things(state)).toEqual([]);
    expect(state.flags.map(flag => [flag.kind, flag.chapterNumber])).toEqual([['not-held', 7]]);
  });

  it('reads chapters in story order and changes in reading order', () => {
    const run = story();
    run.write(2, ['[[equipped: MC | Sword]] He drew it.']);
    run.write(1, ['[[gained: MC | Sword]] He found it.']);
    expect(run.derive().flags).toEqual([]);
    expect(things(run.derive())).toEqual([['Sword', 1, true]]);
  });
});

describe('the writer\'s closing list', () => {
  it('flags what the list leaves out and what no tag recorded, tolerating counts and short names', () => {
    const run = story();
    run.write(1, ['[[gained: MC | Rusted Iron Sword]] He took it. [[gained: MC | Spirit Pill | 3]] Pills. [[knows: MC | Iron Palm | Initial]] A palm.'],
      ['Iron Sword', 'Spirit Pill ×3', 'Iron Palm (Initial)']);
    expect(run.derive().flags).toEqual([]);
    run.write(2, ['He rested.'], ['Rusted Iron Sword', 'Spirit Pill', 'Silver Bell']);
    expect(run.derive().flags.map(flag => flag.message)).toEqual([
      'Chapter 2: the writer\'s closing list for Ye Chen leaves out ‘Iron Palm’. It may have been lost without a tag.',
      'Chapter 2: the writer\'s closing list for Ye Chen includes ‘Silver Bell’, which no tag recorded.',
    ]);
  });

  it('flags a starting kit the writer listed but never tagged', () => {
    const run = story();
    run.write(1, ['He woke.'], ['Jade Pendant']);
    expect(run.derive().flags.map(flag => flag.kind)).toEqual(['closing-untagged']);
    expect(run.derive().flags[0].message).toContain('for Ye Chen includes ‘Jade Pendant’');
  });
});

describe('possible duplicates', () => {
  it('matches forms of one name, not different names', () => {
    expect(namesNearlyMatch('Rusty Sword', 'Rusted Iron Sword')).toBe(true);
    expect(namesNearlyMatch('the Sword', 'Sword of Dawn')).toBe(true);
    expect(namesNearlyMatch('Cloud Steps', 'Cloud Step')).toBe(true);
    expect(namesNearlyMatch('Iron Palm', 'Iron Fist')).toBe(false);
    expect(namesNearlyMatch('Spirit Pill', 'Spirit Stone')).toBe(false);
    expect(namesNearlyMatch('Azure Dragon Fist', 'Azure Dragon Palm')).toBe(false);
  });

  it('flags two tagged entries of one kind whose names are that close', () => {
    const run = story();
    run.write(1, ['[[gained: MC | Rusted Iron Sword]] He took it.']);
    run.write(2, ['[[gained: MC | Rusty Sword]] He took a rusty sword.']);
    const duplicates = run.derive().flags.filter(flag => flag.kind === 'possible-duplicate');
    expect(duplicates.map(flag => flag.message)).toEqual(['‘Rusted Iron Sword’ and ‘Rusty Sword’ may be the same thing.']);
  });
});

describe('the Holdings section', () => {
  it('shows the main character first even with nothing recorded', () => {
    expect(holdingsSection(story().derive(), 'Ye Chen')).toEqual({ characters: [{ name: 'Ye Chen', mainCharacter: true }] });
  });

  it('lists what is in hand, carried, known and being learned, then the most recently changed others', () => {
    const run = story();
    run.write(1, [
      '[[rank: MC | Qi Condensation 3]] [[gained: MC | Rusted Iron Sword]] [[equipped: MC | Rusted Iron Sword]] He drew it.',
      '[[gained: MC | Spirit Pill | 3]] [[knows: MC | Iron Palm | Minor Success]] [[knows: MC | Cloud Step]] [[sealed: MC | Cloud Step]] [[learning: MC | Wind Step]] Done.',
      '[[gained: Elder Qin | Jade Gourd]] Qin drank. [[gained: Lin | Ember Bell]] Lin rang it.',
    ]);
    expect(holdingsSection(run.derive(), 'Ye Chen')).toEqual({
      characters: [
        { name: 'Ye Chen', mainCharacter: true, rank: 'Qi Condensation 3', inHand: ['Rusted Iron Sword'], carries: ['Spirit Pill ×3'], knows: ['Iron Palm (Minor Success)', 'Cloud Step (sealed)'], learning: ['Wind Step'] },
        { name: 'Lin', carries: ['Ember Bell'] },
        { name: 'Elder Qin', carries: ['Jade Gourd'] },
      ],
    });
  });
});

describe('Holdings keep things and abilities, not notes', () => {
  const tag = (source: string) => readMarks(source).wordTags[0];
  it('takes a count or a description out of a name, and sets aside a note about the story', () => {
    expect(holdingName('Neural Swarm-Sync (nine hundred drones linked)')).toEqual({ name: 'Neural Swarm-Sync' });
    expect(holdingName('Spirit Pill ×3')).toEqual({ name: 'Spirit Pill', count: 3 });
    expect(holdingName('3 Spirit Pills')).toEqual({ name: 'Spirit Pills', count: 3 });
    expect(holdingName('Broodmother Core — still cracked')).toEqual({ name: 'Broodmother Core' });
    expect(holdingName('Nine Heavens Thunder Tribulation Body Refining Art')).toEqual({ name: 'Nine Heavens Thunder Tribulation Body Refining Art' });
    expect(holdingName("Elder Han's banner sighted, three riders descending early")).toEqual({ note: "Elder Han's banner sighted, three riders descending early" });
    expect(holdingName('Caravan arrives in nine days')).toEqual({ note: 'Caravan arrives in nine days' });
    expect(holdingName('Ninefold Day Sutra')).toEqual({ name: 'Ninefold Day Sutra' });
    expect(readHoldingTag(tag('[[gained: MC | Spirit Pill ×3]]'))).toEqual({ ok: true, change: { verb: 'gained', holder: { name: 'MC' }, target: { name: 'Spirit Pill' }, count: 3 } });
    expect(readHoldingTag(tag("[[knows: MC | Elder Han's banner sighted, three riders descending early]]"))).toMatchObject({ ok: false });
  });
});
