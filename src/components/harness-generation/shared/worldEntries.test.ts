import { describe, expect, it } from 'vitest';
import { APPEARANCE_KIND, type AppearanceAttachment } from '../../../narrative/appearances';
import { HOLDING_CHANGE_KIND, type HoldingChangeAttachment } from '../../../narrative/holdings';
import { SPEAKER_KIND, type SpeakerAttachment } from '../../../narrative/speech';
import type { CodexEntry } from '../../../narrative/holdings';
import { HARNESS_GENERATION_SCHEMA_VERSION, type HarnessWorkspaceState } from '../../../narrative/generation';
import type { WorldCard, WorldRecord } from '../../../narrative/worldRecord';
import { appearancesSection, cardLookStatement, deriveAppearances, worldCardLook } from './appearances';
import { createHarnessStory, reviseStoryFoundation, storyWorldRecord } from './foundation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { HarnessGenerationController } from './controller';
import { deriveConditions } from './conditions';
import { codexEntriesWithWorldCards, codexEntriesWithoutChapter, deriveHoldings, isMinorEntry } from './holdings';
import { planCodexLook } from './lookDescriber';
import { fillPromotedCard, promoteMinorFigure, promotedCardSlots } from './promotion';
import { createEmptyHarnessWorkspaceState, migrateHarnessWorkspaceState } from './repository';
import { deriveStoryCodex, type StoryCodexChapter } from './storyCodex';

/**
 * The world state pipeline, phase 1 (SENSEI, 2026-11-08 and 2026-11-11): every
 * card of the world record is a Codex entry from the moment it is made, a
 * card's look is its card's, and whoever a chapter brings in with no card is a
 * minor figure a reader may promote.
 */

const cards: WorldCard[] = [
  { key: 'world:character:lin-qingshan', kind: 'character', name: 'Lin Qingshan', mainCharacter: true, enteredInChapter: 0,
    slots: { appearance: 'A lean young man in patched brown hunting clothes with a bow on his back.', skinTone: 'Tanned', eyeColor: 'Dark brown' } },
  { key: 'world:character:shen-mei', kind: 'character', name: 'Shen Mei', aliases: ['Herbalist Shen'], enteredInChapter: 0, slots: { role: 'ally' } },
  { key: 'world:thing:frost-bone-pendant', kind: 'thing', name: 'Frost Bone Pendant', enteredInChapter: 0, slots: { holder: 'Lin Qingshan' } },
  { key: 'world:ability:snowfall-tail-art', kind: 'ability', name: 'Snowfall Tail Art', enteredInChapter: 0, slots: {} },
  { key: 'world:place:cloudpeak-village', kind: 'place', name: 'Cloudpeak Village', enteredInChapter: 0, slots: {} },
  { key: 'world:faction:ning-clan', kind: 'faction', name: 'Ning Clan', enteredInChapter: 0, slots: {} },
  { key: 'world:species:snow-wolf', kind: 'species', name: 'Snow Wolf', enteredInChapter: 0, slots: {} },
  { key: 'world:world-rules:world-rules', kind: 'world-rules', name: 'World rules', enteredInChapter: 0, slots: { knownRanks: 'Mortal, Qi Gathering' } },
];
const world: WorldRecord = { cards };

const at = '2026-11-11T00:00:00.000Z';
const seeded = (entries: readonly CodexEntry[] = [], from: readonly WorldCard[] = cards, usedEntryIds?: ReadonlySet<string>) => {
  let next = 0;
  return codexEntriesWithWorldCards({ storyId: 'story-1', entries, cards: from, usedEntryIds, createdAt: at, createId: () => `hcx_${++next}` });
};
const tagEntry = (id: string, kind: CodexEntry['kind'], name: string, extra: Partial<CodexEntry> = {}): CodexEntry => ({
  id, storyId: 'story-1', kind, name, origin: { source: 'tag', chapterId: 'chapter-1', chapterNumber: 1 }, createdAt: at, ...extra,
});

const paragraphs = [
  'Lin Qingshan stood above the village gate, studying the smooth slope.',
  'A worried father waited at his shoulder with a lantern.',
];
const appears = (index: number, name: string, entryId: string, entity: 'character' | 'thing' | 'place' = 'character', event: 'appears' | 'look' = 'appears', change?: string): AppearanceAttachment => ({
  id: `appearance:c1-p${index + 1}:0-${paragraphs[index].length}:${name}:${event}`,
  kind: APPEARANCE_KIND,
  anchor: { level: 'span', blockId: `c1-p${index + 1}`, startOffset: 0, endOffset: paragraphs[index].length, selectedText: paragraphs[index] },
  payload: { origin: 'harness', event, subject: { name, entryId }, ...(event === 'appears' ? { entity } : { change }) },
});

describe('Every world card is a Codex entry from the start', () => {
  it('makes one entry for each card a tag can name, and none for a faction, a species or the rules', () => {
    const entries = seeded();
    expect(entries.map(entry => [entry.kind, entry.name, entry.cardKey])).toEqual([
      ['character', 'Lin Qingshan', 'world:character:lin-qingshan'],
      ['character', 'Shen Mei', 'world:character:shen-mei'],
      ['thing', 'Frost Bone Pendant', 'world:thing:frost-bone-pendant'],
      ['ability', 'Snowfall Tail Art', 'world:ability:snowfall-tail-art'],
      ['place', 'Cloudpeak Village', 'world:place:cloudpeak-village'],
    ]);
    expect(entries.every(entry => entry.origin.source === 'world')).toBe(true);
    expect(entries[0].mainCharacter).toBe(true);
    expect(entries[1].aliases).toEqual(['Herbalist Shen']);
  });

  it('gives the same entries when it runs again', () => {
    const once = seeded();
    expect(seeded(once)).toEqual(once);
  });

  it('makes the entry a chapter already made by a card\'s name that card\'s entry, keeping its ID', () => {
    const before = [tagEntry('old-mei', 'character', 'Herbalist Shen'), tagEntry('old-main', 'character', 'Qingshan', { mainCharacter: true, origin: { source: 'foundation' } })];
    const entries = seeded(before);
    const mei = entries.find(entry => entry.id === 'old-mei')!;
    expect(mei.cardKey).toBe('world:character:shen-mei');
    expect(mei.aliases).toEqual(['Shen Mei']);
    expect(entries.find(entry => entry.id === 'old-main')).toMatchObject({ cardKey: 'world:character:lin-qingshan', mainCharacter: true, aliases: ['Lin Qingshan'] });
    expect(entries.filter(entry => entry.kind === 'character')).toHaveLength(2);
  });

  it('answers to a name the author gives a card later, so a tag that uses it still finds the card', () => {
    const first = seeded();
    const renamed = cards.map(card => (card.name === 'Frost Bone Pendant' ? { ...card, aliases: ['the Pendant of Frost'] } : card));
    const again = seeded(first, renamed);
    const pendant = again.find(entry => entry.name === 'Frost Bone Pendant')!;
    expect(pendant).toMatchObject({ id: first.find(entry => entry.name === 'Frost Bone Pendant')!.id, aliases: ['the Pendant of Frost'] });
    expect(again).toHaveLength(first.length);
    // Shen Mei already answers to her alias: nothing is added twice.
    expect(again.find(entry => entry.name === 'Shen Mei')?.aliases).toEqual(['Herbalist Shen']);
  });

  it('leaves other stories\' entries alone', () => {
    const other: CodexEntry = { ...tagEntry('elsewhere', 'character', 'Shen Mei'), storyId: 'story-2' };
    expect(seeded([other])[0]).toEqual(other);
  });

  it('takes an entry away with its card when the author removes the card, unless a chapter tagged it', () => {
    const entries = seeded();
    const withoutMei = cards.filter(card => card.name !== 'Shen Mei');
    expect(seeded(entries, withoutMei).some(entry => entry.name === 'Shen Mei')).toBe(false);
    const mei = entries.find(entry => entry.name === 'Shen Mei')!;
    const kept = seeded(entries, withoutMei, new Set([mei.id])).find(entry => entry.id === mei.id)!;
    expect(kept.cardKey).toBeUndefined();
  });

  it('is done when a story is created, and follows a revision of the opening world', () => {
    const created = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A guide finds a fox cub.', worldAtChapterZero: world });
    expect(created.state.codexEntries.map(entry => entry.name)).toEqual(['Lin Qingshan', 'Shen Mei', 'Frost Bone Pendant', 'Snowfall Tail Art', 'Cloudpeak Village']);
    expect(created.state.codexEntries.every(entry => entry.storyId === created.story.id && entry.cardKey)).toBe(true);
    const revised = reviseStoryFoundation(created.state, created.story.id, {
      premise: 'A guide finds a fox cub.',
      worldAtChapterZero: { cards: [...cards.filter(card => card.name !== 'Shen Mei'), { key: '', kind: 'character', name: 'Ning Hao', enteredInChapter: 0, slots: {} }] },
    });
    const names = revised.state.codexEntries.map(entry => entry.name);
    expect(names).toContain('Ning Hao');
    expect(names).not.toContain('Shen Mei');
    // The entries the two worlds share keep their IDs.
    const idOf = (state: HarnessWorkspaceState, name: string) => state.codexEntries.find(entry => entry.name === name)?.id;
    expect(idOf(revised.state, 'Lin Qingshan')).toBe(idOf(created.state, 'Lin Qingshan'));
  });

  it('is still checked against a name a tag makes that is nearly its own, and never against another card', () => {
    // A chapter that calls the pendant by a slightly different name makes a second entry. That is flagged,
    // so the fixer can make the two one; two cards with close names are the author's, and are left alone.
    const withCards = seeded([], [...cards, { key: 'world:thing:frost-bone-charm', kind: 'thing', name: 'Frost Bone Charm', enteredInChapter: 0, slots: {} }]);
    const pendant = withCards.find(entry => entry.name === 'Frost Bone Pendant')!;
    const entries = [...withCards, tagEntry('tagged-pendant', 'thing', 'Frost Bone Pendants')];
    const duplicates = deriveHoldings({ entries, chapters: [], mainCharacterName: 'Lin Qingshan' }).flags.filter(flag => flag.kind === 'possible-duplicate');
    expect(duplicates).toEqual([{ kind: 'possible-duplicate', entryIds: [pendant.id, 'tagged-pendant'], message: '‘Frost Bone Pendant’ and ‘Frost Bone Pendants’ may be the same thing.' }]);
  });

  it('keeps two cards whose names read alike two in the Codex, each under its own entry', () => {
    // A parenthetical is dropped when names are compared, so each pair reads alike: the entry made with a card is that card's.
    const alike: WorldCard[] = [
      { key: 'world:character:phoenix-east', kind: 'character', name: 'Phoenix (East)', enteredInChapter: 0, slots: { role: 'Warden of the sunrise gate' } },
      { key: 'world:character:phoenix-west', kind: 'character', name: 'Phoenix (West)', enteredInChapter: 0, slots: { role: 'Warden of the sunset gate' } },
      { key: 'world:thing:feather-east', kind: 'thing', name: 'Phoenix Feather (East)', enteredInChapter: 0, slots: {} },
      { key: 'world:thing:feather-west', kind: 'thing', name: 'Phoenix Feather (West)', enteredInChapter: 0, slots: {} },
      { key: 'world:place:gate-east', kind: 'place', name: 'Phoenix Gate (East)', enteredInChapter: 0, slots: {} },
      { key: 'world:place:gate-west', kind: 'place', name: 'Phoenix Gate (West)', enteredInChapter: 0, slots: {} },
    ];
    const registered = seeded([], alike);
    expect(registered.map(entry => entry.cardKey)).toEqual(alike.map(card => card.key));
    const codex = deriveStoryCodex({ entries: registered, chapters: [], world: { openToTheReader: true, cards: alike } });
    expect(codex.characters.map(character => [character.name, character.atChapterZero?.[0]?.value])).toEqual([
      ['Phoenix (East)', 'Warden of the sunrise gate'], ['Phoenix (West)', 'Warden of the sunset gate'],
    ]);
    expect(codex.items.map(item => item.name)).toEqual(['Phoenix Feather (East)', 'Phoenix Feather (West)']);
    expect(codex.places.map(place => place.name)).toEqual(['Phoenix Gate (East)', 'Phoenix Gate (West)']);
    // Each is listed under its own entry's ID.
    expect([...codex.characters, ...codex.items, ...codex.places].map(card => card.key)).toEqual(registered.map(entry => entry.id));
  });

  it('is never taken away by a chapter that is rewritten or tagged again', () => {
    const entries = [...seeded(), tagEntry('neighbor', 'character', 'neighbor')];
    const chapter = { id: 'chapter-1', appearances: [appears(0, 'MC', entries[0].id), appears(1, 'neighbor', 'neighbor')] };
    const left = codexEntriesWithoutChapter({ entries, otherChapters: [], chapter, storyId: 'story-1' });
    expect(left.map(entry => entry.name)).toEqual(['Lin Qingshan', 'Shen Mei', 'Frost Bone Pendant', 'Snowfall Tail Art', 'Cloudpeak Village']);
  });

  it('upgrades a saved story: its cards get entries, and an entry a tag made by a card\'s name keeps its ID', () => {
    const stored = {
      ...createEmptyHarnessWorkspaceState(),
      schemaVersion: 47,
      stories: [{ id: 'story-1', createdAt: at }],
      worldCards: cards.map(card => ({ ...card, storyId: 'story-1' })),
      codexEntries: [tagEntry('old-mei', 'character', 'Shen Mei'), tagEntry('neighbor', 'character', 'neighbor')],
    };
    const upgraded = migrateHarnessWorkspaceState(stored)!;
    expect(upgraded.schemaVersion).toBe(HARNESS_GENERATION_SCHEMA_VERSION);
    expect(upgraded.codexEntries.find(entry => entry.id === 'old-mei')?.cardKey).toBe('world:character:shen-mei');
    expect(upgraded.codexEntries.find(entry => entry.id === 'neighbor')?.cardKey).toBeUndefined();
    expect(upgraded.codexEntries.filter(entry => entry.cardKey)).toHaveLength(5);
    // The same storage upgraded twice makes the same entries.
    expect(migrateHarnessWorkspaceState(stored)!.codexEntries).toEqual(upgraded.codexEntries);
  });
});

describe('A card\'s look is its card\'s', () => {
  const entries = seeded();
  const main = entries[0];
  const chapter = { id: 'chapter-1', chapterNumber: 1, paragraphs, appearances: [appears(0, 'MC', main.id)] };

  it('is the card\'s Look, not the sentence that first showed them', () => {
    const subject = deriveAppearances({ entries, chapters: [chapter], world }).subjects[0];
    expect(subject.look).toMatchObject({
      summary: 'A lean young man in patched brown hunting clothes with a bow on his back.',
      traits: { skin: 'Tanned', eyes: 'Dark brown' }, fromCard: true,
    });
    expect(subject.lookStale).toBeUndefined();
    // Where the story first showed them is still kept, as where they were met.
    expect(subject.first.text).toBe(paragraphs[0]);
  });

  it('is what the next chapter\'s writer reads in Appeared', () => {
    const section = appearancesSection(deriveAppearances({ entries, chapters: [chapter], world }));
    expect(section.entries[0]).toMatchObject({ name: 'Lin Qingshan', look: 'A lean young man in patched brown hunting clothes with a bow on his back.' });
  });

  it('stands over a look a model wrote from that first sentence alone', () => {
    const written = entries.map(entry => (entry.id === main.id
      ? { ...entry, look: { summary: 'Lin Qingshan; no physical appearance is described.', traits: {}, from: [chapter.appearances[0].id], at } } : entry));
    expect(deriveAppearances({ entries: written, chapters: [chapter], world }).subjects[0].look?.summary)
      .toBe('A lean young man in patched brown hunting clothes with a bow on his back.');
  });

  it('carries every change the story tagged since, and is written again from the card and those changes', () => {
    const changed = { ...chapter, appearances: [...chapter.appearances, appears(1, 'MC', main.id, 'character', 'look', 'a frost scar across his hand')] };
    const subject = deriveAppearances({ entries, chapters: [changed], world }).subjects[0];
    expect(subject.lookStale).toBe(true);
    expect(appearancesSection(deriveAppearances({ entries, chapters: [changed], world })).entries[0].look)
      .toBe('A lean young man in patched brown hunting clothes with a bow on his back. · since then: a frost scar across his hand');
    const request = planCodexLook({ subject, cardLook: { summary: subject.look!.summary, traits: subject.look!.traits } });
    expect(request.declared).toBe('A lean young man in patched brown hunting clothes with a bow on his back.; eyes: Dark brown; skin: Tanned');
    // Once that look is written and kept, it stands for the card and its changes.
    const written = { summary: 'A lean young man in patched hunting clothes, a frost scar across his hand.', traits: {}, from: changed.appearances.map(record => record.id), at };
    const keeping = (look: typeof written & { cardLook?: string }) => entries.map(entry => (entry.id === main.id ? { ...entry, look } : entry));
    const kept = keeping({ ...written, cardLook: cardLookStatement(worldCardLook(cards[0])!) });
    const after = deriveAppearances({ entries: kept, chapters: [changed], world }).subjects[0];
    expect(after.look).toMatchObject({ summary: 'A lean young man in patched hunting clothes, a frost scar across his hand.' });
    expect(after.look?.fromCard).toBeUndefined();
    expect(after.lookStale).toBeUndefined();

    // The card's look is revised afterwards: the written look no longer stands for it, so the
    // card's look is the look again and it is written anew from the card and the same changes.
    const revised: WorldRecord = { cards: cards.map(card => (card.mainCharacter ? { ...card, slots: { ...card.slots, appearance: 'A broad young man in a grey wolf-fur cloak.' } } : card)) };
    const edited = deriveAppearances({ entries: kept, chapters: [changed], world: revised }).subjects[0];
    expect(edited.look).toMatchObject({ summary: 'A broad young man in a grey wolf-fur cloak.', fromCard: true });
    expect(edited.lookStale).toBe(true);
    // A look written before a card stated one is written again the same way.
    const older = deriveAppearances({ entries: keeping(written), chapters: [changed], world }).subjects[0];
    expect(older.look).toMatchObject({ summary: 'A lean young man in patched brown hunting clothes with a bow on his back.', fromCard: true });
    expect(older.lookStale).toBe(true);
  });

  it('carries every look slot the card fills, as the trait it is, and none it leaves blank', () => {
    const look = worldCardLook({ kind: 'character', slots: {
      appearance: 'A tall young man whose green silk never creases.', build: 'Tall and slim', face: 'Fine-boned', hair: 'Black, bound high',
      skinTone: 'Pale', eyeColor: 'Black', clothing: 'Dark green silk', marks: '  ', bearing: 'Looks past people', role: 'rival',
    } });
    expect(look).toEqual({
      summary: 'A tall young man whose green silk never creases.',
      traits: { build: 'Tall and slim', face: 'Fine-boned', eyes: 'Black', hair: 'Black, bound high', skin: 'Pale', clothing: 'Dark green silk', bearing: 'Looks past people' },
    });
    // A thing or a place has its Look alone; a card with no Look has no look to state.
    expect(worldCardLook({ kind: 'thing', slots: { appearance: 'A bone pendant.', status: 'Whole' } })).toEqual({ summary: 'A bone pendant.', traits: {} });
    expect(worldCardLook({ kind: 'character', slots: { hair: 'Black' } })).toBeUndefined();
  });

  it('leaves someone with no card, or a card with no Look, to the story\'s own words', () => {
    const withNeighbor = [...entries, tagEntry('neighbor', 'character', 'neighbor')];
    const both = { ...chapter, appearances: [appears(0, 'Shen Mei', entries[1].id), appears(1, 'neighbor', 'neighbor')] };
    const subjects = deriveAppearances({ entries: withNeighbor, chapters: [both], world }).subjects;
    expect(subjects.map(subject => subject.look)).toEqual([undefined, undefined]);
  });
});

describe('Minor figures', () => {
  const entries = [...seeded(), tagEntry('neighbor', 'character', 'neighbor'), tagEntry('lantern', 'thing', 'Lantern'), tagEntry('ridge', 'place', 'North Ridge')];
  const chapter: StoryCodexChapter = {
    id: 'chapter-1', chapterNumber: 1, paragraphs,
    appearances: [appears(0, 'MC', entries[0].id), appears(1, 'neighbor', 'neighbor'), appears(1, 'Lantern', 'lantern', 'thing'), appears(1, 'North Ridge', 'ridge', 'place')],
  };

  it('are whoever and whatever a tag brought in that has no card', () => {
    expect(entries.filter(entry => isMinorEntry(entry, world)).map(entry => entry.name)).toEqual(['neighbor', 'Lantern', 'North Ridge']);
    // A story with no world record has no main cards to tell them from.
    expect(entries.filter(entry => isMinorEntry(entry, undefined))).toEqual([]);
  });

  it('leave the Codex\'s card lists for the Minor one, with their sentence and their chapters', () => {
    const codex = deriveStoryCodex({ entries, chapters: [chapter, { ...chapter, id: 'chapter-2', chapterNumber: 2, appearances: [], statuses: [{
      id: 'status:c2-p1:0-5:0', kind: 'status', anchor: { level: 'span', blockId: 'c2-p1', startOffset: 0, endOffset: 5, selectedText: 'Later' },
      payload: { origin: 'harness', subject: { name: 'neighbor', entryId: 'neighbor' }, status: 'tired' },
    }] }], world });
    expect(codex.characters.map(character => character.name)).toEqual(['Lin Qingshan']);
    expect(codex.items).toEqual([]);
    expect(codex.places).toEqual([]);
    expect(codex.minor).toEqual([
      { key: 'neighbor', name: 'neighbor', kind: 'character', introduced: { chapterNumber: 1, blockId: 'c1-p2', text: paragraphs[1] }, chapters: [1, 2], promotable: true },
      { key: 'lantern', name: 'Lantern', kind: 'thing', introduced: { chapterNumber: 1, blockId: 'c1-p2', text: paragraphs[1] }, chapters: [1], promotable: true },
      { key: 'ridge', name: 'North Ridge', kind: 'place', introduced: { chapterNumber: 1, blockId: 'c1-p2', text: paragraphs[1] }, chapters: [1], promotable: true },
    ]);
  });

  it('include someone whose card the author took away after a chapter had named them, and they can be promoted again', () => {
    const created = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A guide finds a fox cub.', worldAtChapterZero: world });
    const storyId = created.story.id;
    const shen = created.state.codexEntries.find(entry => entry.name === 'Shen Mei')!;
    // The world is revised without her card; a chapter had tagged her, so her entry is kept.
    const without = cards.filter(card => card.name !== 'Shen Mei');
    const state: HarnessWorkspaceState = {
      ...created.state,
      stories: created.state.stories.map(story => ({ ...story, head: { nextChapterNumber: 2 } })),
      worldCards: created.state.worldCards.filter(card => card.name !== 'Shen Mei'),
      codexEntries: codexEntriesWithWorldCards({ storyId, entries: created.state.codexEntries, cards: without, usedEntryIds: new Set([shen.id]), createdAt: at, createId: () => 'unused' }),
    };
    const kept = state.codexEntries.find(entry => entry.id === shen.id)!;
    expect(kept).toMatchObject({ origin: { source: 'world' } });
    expect(kept.cardKey).toBeUndefined();
    expect(isMinorEntry(kept, { cards: without })).toBe(true);
    const shown: StoryCodexChapter = { id: 'chapter-1', chapterNumber: 1, paragraphs, appearances: [appears(1, 'Shen Mei', shen.id)] };
    expect(deriveStoryCodex({ entries: state.codexEntries, chapters: [shown], world: { cards: without } }).minor)
      .toEqual([{ key: shen.id, name: 'Shen Mei', kind: 'character', introduced: { chapterNumber: 1, blockId: 'c1-p2', text: paragraphs[1] }, chapters: [1], promotable: true }]);
    expect(promoteMinorFigure(state, storyId, shen.id).card).toMatchObject({ key: 'world:character:shen-mei', enteredInChapter: 1, slots: {} });
  });

  it('reach an ability card when one of them is the only one to learn it', () => {
    const art = seeded().find(entry => entry.kind === 'ability')!;
    const learned: HoldingChangeAttachment = {
      id: 'holding:c1-p2:0', kind: HOLDING_CHANGE_KIND,
      anchor: { level: 'span', blockId: 'c1-p2', startOffset: 0, endOffset: paragraphs[1].length, selectedText: paragraphs[1] },
      payload: { origin: 'harness', verb: 'learned', holder: { name: 'neighbor', entryId: 'neighbor' }, target: { name: 'Snowfall Tail Art', entryId: art.id } },
    };
    const reached = (holdingChanges: HoldingChangeAttachment[]) =>
      deriveStoryCodex({ entries, chapters: [{ ...chapter, holdingChanges }], world }).abilities.map(ability => ability.name);
    expect(reached([])).toEqual([]);
    expect(reached([learned])).toEqual(['Snowfall Tail Art']);
  });

  it('do not exist in a story with no world record: everyone is a card, as before', () => {
    const codex = deriveStoryCodex({ entries: entries.filter(entry => !entry.cardKey || entry.mainCharacter), chapters: [chapter] });
    expect(codex.minor).toEqual([]);
    expect(codex.characters.map(character => character.name)).toEqual(['Lin Qingshan', 'neighbor']);
    expect(codex.items.map(item => item.name)).toEqual(['Lantern']);
    expect(codex.places.map(place => place.name)).toEqual(['North Ridge']);
  });
});

describe('Promote', () => {
  const started = () => {
    const created = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A guide finds a fox cub.', worldAtChapterZero: world });
    const state: HarnessWorkspaceState = {
      ...created.state,
      stories: created.state.stories.map(story => ({ ...story, head: { nextChapterNumber: 4 } })),
      codexEntries: [...created.state.codexEntries, { ...tagEntry('neighbor', 'character', 'neighbor'), storyId: created.story.id }],
    };
    return { state, storyId: created.story.id };
  };

  it('makes a minor figure a real card as of the latest chapter, blank but for its name, and keeps its entry', () => {
    const { state, storyId } = started();
    const promoted = promoteMinorFigure(state, storyId, 'neighbor');
    expect(promoted.card).toEqual({ key: 'world:character:neighbor', kind: 'character', name: 'neighbor', enteredInChapter: 3, slots: {}, storyId });
    expect(promoted.state.codexEntries.find(entry => entry.id === 'neighbor')?.cardKey).toBe('world:character:neighbor');
    expect(storyWorldRecord(promoted.state, storyId)?.cards.at(-1)?.name).toBe('neighbor');
    // The state it was given is untouched.
    expect(state.worldCards).toHaveLength(cards.length);
    // In the Codex they are a character now, with a card to fill in, and no longer minor.
    const entries = promoted.state.codexEntries;
    const chapter: StoryCodexChapter = { id: 'chapter-1', chapterNumber: 1, paragraphs, appearances: [appears(1, 'neighbor', 'neighbor')] };
    const codex = deriveStoryCodex({ entries, chapters: [chapter], world: storyWorldRecord(promoted.state, storyId) });
    expect(codex.minor).toEqual([]);
    expect(codex.characters.find(character => character.key === 'neighbor')?.promoted).toEqual({ key: 'world:character:neighbor', kind: 'character', enteredInChapter: 3, slots: {} });
  });

  it('refuses a card, someone of another story, and a second promotion', () => {
    const { state, storyId } = started();
    const main = state.codexEntries[0].id;
    expect(() => promoteMinorFigure(state, storyId, main)).toThrow('Only a minor figure');
    expect(() => promoteMinorFigure(state, 'another-story', 'neighbor')).toThrow('no longer available');
    const once = promoteMinorFigure(state, storyId, 'neighbor').state;
    expect(() => promoteMinorFigure(once, storyId, 'neighbor')).toThrow('Only a minor figure');
  });

  it('lets the reader fill the card: only its kind\'s slots, trimmed, and a blank one stays blank', () => {
    const { state, storyId } = started();
    const promoted = promoteMinorFigure(state, storyId, 'neighbor').state;
    const filled = fillPromotedCard(promoted, storyId, 'world:character:neighbor', { appearance: '  A stooped woman  in a grey shawl. ', role: '', notASlot: 'ignored', name: 'Renamed' });
    expect(filled.card.slots).toEqual({ appearance: 'A stooped woman in a grey shawl.' });
    expect(filled.card.name).toBe('neighbor');
    // Clearing a slot empties it again.
    expect(fillPromotedCard(filled.state, storyId, 'world:character:neighbor', { appearance: '' }).card.slots).toEqual({});
    // The look they filled in is the card's look from then on.
    const chapter = { id: 'chapter-1', chapterNumber: 1, paragraphs, appearances: [appears(1, 'neighbor', 'neighbor')] };
    const subject = deriveAppearances({ entries: filled.state.codexEntries, chapters: [chapter], world: storyWorldRecord(filled.state, storyId) }).subjects[0];
    expect(subject.look).toMatchObject({ summary: 'A stooped woman in a grey shawl.', fromCard: true });
  });

  it('promotes someone only speaker tags name: their entry is made with the card', () => {
    const { state, storyId } = started();
    const line = 'Mind the ice';
    const speaks: SpeakerAttachment = {
      id: 'speaker:c1-p2:0', kind: SPEAKER_KIND,
      anchor: { level: 'span', blockId: 'c1-p2', startOffset: 0, endOffset: line.length, selectedText: line },
      payload: { origin: 'harness', speaker: 'Old Ferryman', protagonist: false },
    };
    const text = [paragraphs[0], `${line}, the ferryman called.`];
    const chapter: StoryCodexChapter = { id: 'chapter-1', chapterNumber: 1, paragraphs: text, speakers: [speaks] };
    const told: HarnessWorkspaceState = { ...state, chapters: [{ id: 'chapter-1', storyId, chapterNumber: 1, paragraphs: text, speakers: [speaks] } as HarnessWorkspaceState['chapters'][number]] };
    const listed = deriveStoryCodex({ entries: told.codexEntries, chapters: [chapter], world: storyWorldRecord(told, storyId) }).minor.find(minor => minor.name === 'Old Ferryman')!;
    expect(listed).toMatchObject({ key: 'character:old ferryman', kind: 'character', promotable: true });

    const promoted = promoteMinorFigure(told, storyId, listed.key, at);
    expect(promoted.card).toMatchObject({ key: 'world:character:old-ferryman', kind: 'character', name: 'Old Ferryman', slots: {} });
    const entry = promoted.state.codexEntries.find(candidate => candidate.cardKey === 'world:character:old-ferryman')!;
    // The card is listed under its new entry from now on, which is what a host opens.
    expect(promoted.entryId).toBe(entry.id);
    expect(promoteMinorFigure(told, storyId, 'neighbor').entryId).toBe('neighbor');
    expect(entry).toMatchObject({ storyId, kind: 'character', name: 'Old Ferryman', origin: { source: 'world' }, createdAt: at });
    // In the Codex they are a character now, with their lines, and no longer minor.
    const codex = deriveStoryCodex({ entries: promoted.state.codexEntries, chapters: [chapter], world: storyWorldRecord(promoted.state, storyId) });
    expect(codex.minor.map(minor => minor.name)).not.toContain('Old Ferryman');
    expect(codex.characters.find(character => character.key === entry.id)).toMatchObject({ name: 'Old Ferryman', voice: { lines: 1 }, promoted: { key: 'world:character:old-ferryman' } });
    // Not twice, and never someone the story does not have speaking.
    expect(() => promoteMinorFigure(promoted.state, storyId, listed.key)).toThrow('Only a minor figure');
    expect(() => promoteMinorFigure(told, storyId, 'character:nobody')).toThrow('Only a minor figure');
  });

  it('leaves what the story\'s tags already record off a promoted card, so nothing is counted twice', () => {
    for (const id of ['rankLevel', 'holds', 'knows']) expect(promotedCardSlots('character').some(slot => slot.id === id)).toBe(false);
    for (const id of ['holder', 'count']) expect(promotedCardSlots('thing').some(slot => slot.id === id)).toBe(false);
    expect(promotedCardSlots('character').map(slot => slot.id)).toEqual(expect.arrayContaining(['appearance', 'role', 'bearing']));
    const { state, storyId } = started();
    const promoted = promoteMinorFigure(state, storyId, 'neighbor').state;
    expect(fillPromotedCard(promoted, storyId, 'world:character:neighbor', { holds: 'Spear', knows: 'Snowfall Tail Art', role: 'guard' }).card.slots).toEqual({ role: 'guard' });

    // A card made mid-story never states what was held before Chapter 1: the chapter that gave the spear is the record.
    const guard = tagEntry('guard', 'character', 'Gate Guard', { cardKey: 'world:character:gate-guard' });
    const spear = tagEntry('spear', 'thing', 'Spear');
    const gained: HoldingChangeAttachment = {
      id: 'holding:c2-p1:0', kind: HOLDING_CHANGE_KIND,
      anchor: { level: 'span', blockId: 'c2-p1', startOffset: 0, endOffset: 5, selectedText: 'Spear' },
      payload: { origin: 'harness', verb: 'gained', holder: { name: 'Gate Guard', entryId: 'guard' }, target: { name: 'Spear', entryId: 'spear' } },
    };
    const held = (enteredInChapter: number) => deriveHoldings({
      entries: [...seeded(), guard, spear], chapters: [{ id: 'chapter-2', chapterNumber: 2, holdingChanges: [gained] }], mainCharacterName: 'Lin Qingshan',
      worldAtChapterZero: { cards: [...cards, { key: 'world:character:gate-guard', kind: 'character', name: 'Gate Guard', enteredInChapter, slots: { holds: 'Spear' } }] },
    });
    const spears = (state: ReturnType<typeof deriveHoldings>) => state.characters.find(character => character.name === 'Gate Guard')!.things.map(thing => [thing.name, thing.count]);
    expect(spears(held(3))).toEqual([['Spear', 1]]);
    expect(held(3).flags).toEqual([]);
    // A card the world opened with still does: a chapter that gains it again is flagged.
    expect(held(0).flags.map(flag => flag.kind)).toContain('already-held');
  });

  it('keeps a promoted character\'s conditions one a line, so each runs by itself', () => {
    const { state, storyId } = started();
    const promoted = promoteMinorFigure(state, storyId, 'neighbor').state;
    const filled = fillPromotedCard(promoted, storyId, 'world:character:neighbor', {
      status: '  Arrow wound |  bleeding > festering | a stage every 3 chapters \r\n\r\n   Blind in one eye  ',
      role: 'a  guard\nat the gate',
    });
    // The conditions keep their line break; every other slot is still one line.
    expect(filled.card.slots).toEqual({ status: 'Arrow wound | bleeding > festering | a stage every 3 chapters\nBlind in one eye', role: 'a guard at the gate' });
    // They entered in Chapter 3, so their conditions begin there, two side by side.
    const carried = deriveConditions({ world: storyWorldRecord(filled.state, storyId), chapterNumber: 6 }).characters.find(character => character.name === 'neighbor')!;
    expect(carried.conditions.map(condition => [condition.name, condition.showing])).toEqual([['Arrow wound', 'festering'], ['Blind in one eye', undefined]]);
  });

  it('never changes a card the world opened with', () => {
    const { state, storyId } = started();
    expect(() => fillPromotedCard(state, storyId, 'world:character:shen-mei', { role: 'enemy' })).toThrow('Only a card you promoted');
  });

  it('keeps every card when two figures are promoted, and one filled in, before the first save finishes', async () => {
    const { state, storyId } = started();
    const repository = new InMemoryHarnessGenerationRepository({ ...state, codexEntries: [...state.codexEntries, { ...tagEntry('porter', 'character', 'porter'), storyId }] });
    const controller = new HarnessGenerationController({ repository, modelAdapter: {} as never });
    await controller.hydrate();
    // Nothing is awaited between them: each starts while the one before it is still saving.
    const results = await Promise.allSettled([
      controller.promoteCodexEntry(storyId, 'neighbor'),
      controller.promoteCodexEntry(storyId, 'porter'),
      controller.promoteCodexEntry(storyId, 'neighbor'),
      controller.fillPromotedCard(storyId, 'world:character:neighbor', { role: 'witness' }),
    ]);
    // The second promotion of the same figure is refused, and does not hold up the fill behind it.
    expect(results.map(result => result.status)).toEqual(['fulfilled', 'fulfilled', 'rejected', 'fulfilled']);
    const saved = repository.snapshot();
    const promoted = saved.worldCards.filter(card => card.storyId === storyId && card.enteredInChapter >= 1);
    expect(promoted.map(card => [card.key, card.slots])).toEqual([['world:character:neighbor', { role: 'witness' }], ['world:character:porter', {}]]);
    expect(saved.codexEntries.filter(entry => entry.id === 'neighbor' || entry.id === 'porter').map(entry => entry.cardKey)).toEqual(['world:character:neighbor', 'world:character:porter']);
    expect(controller.snapshot().worldCards).toEqual(saved.worldCards);
    expect(results[0]).toMatchObject({ value: { card: { key: 'world:character:neighbor' }, entryId: 'neighbor' } });
  });

  it('starts from what another save under way is saving, so neither is lost', async () => {
    const { state, storyId } = started();
    const repository = new InMemoryHarnessGenerationRepository(state);
    const controller = new HarnessGenerationController({ repository, modelAdapter: {} as never });
    await controller.hydrate();
    // The notes are still being saved when the promotion is asked for.
    await Promise.all([controller.setAuthorNotes(storyId, 'Keep the neighbor kind.'), controller.promoteCodexEntry(storyId, 'neighbor')]);
    const saved = repository.snapshot();
    expect(saved.stories.find(story => story.id === storyId)?.authorNotes).toBe('Keep the neighbor kind.');
    expect(saved.worldCards.some(card => card.key === 'world:character:neighbor')).toBe(true);
  });
});
