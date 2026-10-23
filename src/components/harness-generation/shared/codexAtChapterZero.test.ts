import { describe, expect, it } from 'vitest';
import type { WorldAtChapterZero } from '../../../narrative/worldRecord';
import type { CodexEntry } from '../../../narrative/holdings';
import { deriveStoryCodex, type StoryCodexChapter } from './storyCodex';
import { HOLDING_CHANGE_KIND } from '../../../narrative/holdings';

/**
 * The world at Chapter 0 in the Codex: the record's first layer, and the rule
 * that a reader meets a card only when the story reaches it (SENSEI,
 * 2026-10-22), unless the world is open to its reader.
 */

const cards: WorldAtChapterZero['cards'] = [
  {
    key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true,
    slots: { bio: 'A quarry laborer the sect wrote off.', location: 'Rift Quarry', holds: 'Jade Token', status: 'Meridians destroyed' },
  },
  {
    key: 'chapter-0:character:elder-qin', kind: 'character', name: 'Elder Qin', aliases: ['The Iron Brush'],
    slots: { role: 'Sect Elder', location: 'Azure Hall' },
  },
  { key: 'chapter-0:thing:jade-token', kind: 'thing', name: 'Jade Token', slots: { holder: 'Ye Chen', appearance: 'A cracked nine-petal jade token.' } },
  { key: 'chapter-0:ability:frostbrush-edict', kind: 'ability', name: 'Frostbrush Edict', slots: { appearance: 'Frost strokes hang, then fall as blades.' } },
  { key: 'chapter-0:place:rift-quarry', kind: 'place', name: 'Rift Quarry', slots: { appearance: 'A volcanic rift floored with black glass.', condition: 'Working' } },
  { key: 'chapter-0:faction:heavenly-sword-sect', kind: 'faction', name: 'Heavenly Sword Sect', slots: { factionKind: 'Sect', seat: 'Azure Hall' } },
  { key: 'chapter-0:species:cinder-serpent', kind: 'species', name: 'Cinder Serpent', slots: { habitat: 'Rift Quarry' } },
  { key: 'chapter-0:world-rules:world-rules', kind: 'world-rules', name: 'World rules', slots: { knownRanks: 'Qi Condensation → Nascent Soul', laws: 'No killing inside the sect gates.' } },
];

/** The world a Story Seed makes: its reader is the story's own reader. */
const world: WorldAtChapterZero = { cards };
/** A novel whose author already knows its world and brought it in to expand. */
const openWorld: WorldAtChapterZero = { cards, openToTheReader: true };

const entry = (id: string, kind: CodexEntry['kind'], name: string, extra: Partial<CodexEntry> = {}): CodexEntry => ({
  id, storyId: 'story-1', kind, name, origin: { source: 'foundation' }, createdAt: '2026-10-22T00:00:00.000Z', ...extra,
});

/** One chapter whose tag gives Elder Qin a sword. */
const chapterWithAGift = (): StoryCodexChapter => ({
  id: 'chapter-1', chapterNumber: 1,
  paragraphs: ['The elder took up the frost blade.'],
  holdingChanges: [{
    kind: HOLDING_CHANGE_KIND,
    id: 'holding:c1-p1:0-32:0',
    anchor: { level: 'span', blockId: 'c1-p1', startOffset: 0, endOffset: 32, selectedText: 'The elder took up the frost blade.' },
    payload: { origin: 'harness', verb: 'gained', holder: { name: 'Elder Qin', entryId: 'qin' }, target: { name: 'Frost Blade', entryId: 'blade' } },
  }],
});

describe('A world open to its reader', () => {
  it('shows every card it opened with, with no chapter written', () => {
    const codex = deriveStoryCodex({ entries: [], chapters: [], world: openWorld });
    expect(codex.characters.map(character => character.name)).toEqual(['Ye Chen', 'Elder Qin']);
    expect(codex.characters[0].mainCharacter).toBe(true);
    expect(codex.characters[0].firstSeen).toBeUndefined();
    expect(codex.items.map(item => item.name)).toEqual(['Jade Token']);
    expect(codex.abilities.map(ability => ability.name)).toEqual(['Frostbrush Edict']);
    expect(codex.places.map(place => place.name)).toEqual(['Rift Quarry']);
    expect(codex.factions.map(faction => faction.name)).toEqual(['Heavenly Sword Sect']);
    expect(codex.species.map(species => species.name)).toEqual(['Cinder Serpent']);
    expect(codex.worldRules?.map(fact => fact.slot.id)).toEqual(['knownRanks', 'laws']);
  });

  it('keeps a card whose name is all the world knows, whatever its kind', () => {
    const bare: WorldAtChapterZero = {
      openToTheReader: true,
      cards: [
        { key: 'chapter-0:character:mute-monk', kind: 'character', name: 'The Mute Monk', slots: {} },
        { key: 'chapter-0:faction:silent-hall', kind: 'faction', name: 'Silent Hall', slots: {} },
        { key: 'chapter-0:thing:grey-bell', kind: 'thing', name: 'Grey Bell', slots: {} },
      ],
    };
    const codex = deriveStoryCodex({ entries: [], chapters: [], world: bare });
    expect(codex.characters.map(character => character.name)).toEqual(['The Mute Monk']);
    expect(codex.factions.map(faction => faction.name)).toEqual(['Silent Hall']);
    expect(codex.items.map(item => item.name)).toEqual(['Grey Bell']);
  });

  it('keeps two cards whose names read alike once normalized, rather than one', () => {
    // A parenthetical is stripped when names are compared, so both of these
    // read as "phoenix": the world's own keys are what tells them apart.
    const alike: WorldAtChapterZero = {
      openToTheReader: true,
      cards: [
        { key: 'chapter-0:character:phoenix-east', kind: 'character', name: 'Phoenix (East)', slots: { role: 'Warden of the sunrise gate' } },
        { key: 'chapter-0:character:phoenix-west', kind: 'character', name: 'Phoenix (West)', slots: { role: 'Warden of the sunset gate' } },
        { key: 'chapter-0:thing:phoenix-east-feather', kind: 'thing', name: 'Phoenix Feather (East)', slots: { appearance: 'A feather of sunrise gold.' } },
        { key: 'chapter-0:thing:phoenix-west-feather', kind: 'thing', name: 'Phoenix Feather (West)', slots: { appearance: 'A feather of sunset red.' } },
        { key: 'chapter-0:faction:phoenix-east-court', kind: 'faction', name: 'Phoenix Court (East)', slots: { seat: 'Sunrise Gate' } },
        { key: 'chapter-0:faction:phoenix-west-court', kind: 'faction', name: 'Phoenix Court (West)', slots: { seat: 'Sunset Gate' } },
        { key: 'chapter-0:ability:phoenix-east-cry', kind: 'ability', name: 'Phoenix Cry (East)', slots: { appearance: 'Dawn breaks where it lands.' } },
        { key: 'chapter-0:ability:phoenix-west-cry', kind: 'ability', name: 'Phoenix Cry (West)', slots: { appearance: 'Dusk falls where it lands.' } },
      ],
    };
    const codex = deriveStoryCodex({ entries: [], chapters: [], world: alike });
    expect(codex.characters.map(character => character.name)).toEqual(['Phoenix (East)', 'Phoenix (West)']);
    expect(codex.items.map(item => item.name)).toEqual(['Phoenix Feather (East)', 'Phoenix Feather (West)']);
    expect(codex.factions.map(faction => faction.name)).toEqual(['Phoenix Court (East)', 'Phoenix Court (West)']);
    expect(codex.abilities.map(ability => ability.name)).toEqual(['Phoenix Cry (East)', 'Phoenix Cry (West)']);
    // Each card is addressable on its own: a picture made of one is not the other's.
    const keys = [...codex.characters, ...codex.items, ...codex.factions, ...codex.abilities].map(card => card.key);
    expect(new Set(keys).size).toBe(keys.length);
    // The second of a pair keeps its own facts rather than the first's.
    expect(codex.characters[1].atChapterZero?.[0].value).toBe('Warden of the sunset gate');
    expect(codex.items[1].atChapterZero?.[0].value).toBe('A feather of sunset red.');
  });

  it('gives each card its facts under the labels its card kind reads by', () => {
    const codex = deriveStoryCodex({ entries: [], chapters: [], world: openWorld });
    expect(codex.characters[0].atChapterZero?.map(fact => [fact.slot.label, fact.value])).toEqual([
      ['Who they are', 'A quarry laborer the sect wrote off.'],
      ['Where they are', 'Rift Quarry'],
      ['Holds', 'Jade Token'],
      ['Status', 'Meridians destroyed'],
    ]);
    expect(codex.places[0].atChapterZero.map(fact => fact.slot.label)).toEqual(['Look', 'Condition']);
  });
});

describe('The reader meets a card when the story reaches it', () => {
  it('shows no card at all before the first chapter', () => {
    const codex = deriveStoryCodex({ entries: [], chapters: [], world });
    expect(codex.characters).toEqual([]);
    expect(codex.items).toEqual([]);
    expect(codex.abilities).toEqual([]);
    expect(codex.places).toEqual([]);
    expect(codex.factions).toEqual([]);
    expect(codex.species).toEqual([]);
  });

  it('keeps the World rules, which are the world\'s frame and not a card the story reaches', () => {
    const codex = deriveStoryCodex({ entries: [], chapters: [], world });
    expect(codex.worldRules?.map(fact => fact.slot.id)).toEqual(['knownRanks', 'laws']);
  });

  it('shows a card once a chapter reaches it, with everything the world already knew', () => {
    const codex = deriveStoryCodex({
      entries: [entry('qin', 'character', 'Elder Qin', { aliases: ['The Iron Brush'] }), entry('blade', 'thing', 'Frost Blade')],
      chapters: [chapterWithAGift()],
      world,
    });
    // Elder Qin took up a blade; Ye Chen has not been on the page yet.
    expect(codex.characters.map(character => character.name)).toEqual(['Elder Qin']);
    expect(codex.characters[0].atChapterZero?.map(fact => fact.slot.id)).toEqual(['role', 'location']);
    expect(codex.characters[0].things.map(thing => thing.name)).toEqual(['Frost Blade']);
    // The Jade Token is in the world, but no chapter has shown it.
    expect(codex.items.map(item => item.name)).toEqual(['Frost Blade']);
  });

  it('opens an ability\'s own card once a chapter reaches it, and still waits on places and the Bestiary', () => {
    const learned = (): StoryCodexChapter => ({
      id: 'chapter-1', chapterNumber: 1,
      paragraphs: ['Ye Chen set the frost strokes down.'],
      holdingChanges: [{
        kind: HOLDING_CHANGE_KIND,
        id: 'holding:c1-p1:0-35:0',
        anchor: { level: 'span', blockId: 'c1-p1', startOffset: 0, endOffset: 35, selectedText: 'Ye Chen set the frost strokes down.' },
        payload: { origin: 'harness', verb: 'learned', holder: { name: 'Ye Chen', entryId: 'chen' }, target: { name: 'Frostbrush Edict', entryId: 'edict' } },
      }],
    });
    const codex = deriveStoryCodex({
      entries: [entry('chen', 'character', 'Ye Chen', { mainCharacter: true }), entry('edict', 'ability', 'Frostbrush Edict')],
      chapters: [learned()],
      world,
    });
    expect(codex.characters[0].abilities.map(ability => ability.name)).toEqual(['Frostbrush Edict']);
    expect(codex.abilities.map(ability => ability.name)).toEqual(['Frostbrush Edict']);
    expect(codex.abilities[0].firstSeen?.chapterNumber).toBe(1);
    expect(codex.abilities[0].atChapterZero.map(fact => fact.slot.id)).toEqual(['appearance']);
    // Nothing in a chapter can name a place or a species yet.
    expect(codex.places).toEqual([]);
    expect(codex.species).toEqual([]);
  });

  /**
   * A chapter names an ability in words, and reading a tag drops a trailing
   * parenthetical (`holdingName`), so what reaches the Codex for a tag written
   * "Phoenix Cry (East)" is the name "Phoenix Cry". Two cards those words
   * cannot tell apart must open neither, or the reader meets a card the story
   * never reached.
   */
  const learned = (taught: string): StoryCodexChapter => ({
    id: 'chapter-1', chapterNumber: 1,
    paragraphs: ['Ye Chen took the sunrise cry.'],
    holdingChanges: [{
      kind: HOLDING_CHANGE_KIND,
      id: 'holding:c1-p1:0-29:0',
      anchor: { level: 'span', blockId: 'c1-p1', startOffset: 0, endOffset: 29, selectedText: 'Ye Chen took the sunrise cry.' },
      payload: { origin: 'harness', verb: 'learned', holder: { name: 'Ye Chen', entryId: 'chen' }, target: { name: taught, entryId: 'taught' } },
    }],
  });
  const whoLearned = (taught: string, cards: WorldAtChapterZero['cards']) => deriveStoryCodex({
    entries: [entry('chen', 'character', 'Ye Chen', { mainCharacter: true }), entry('taught', 'ability', taught)],
    chapters: [learned(taught)],
    world: { cards },
  });

  it('opens neither of two abilities the chapter\'s words cannot tell apart', () => {
    const codex = whoLearned('Phoenix Cry', [
      { key: 'chapter-0:ability:phoenix-cry-east', kind: 'ability', name: 'Phoenix Cry (East)', slots: { appearance: 'Dawn breaks where it lands.' } },
      { key: 'chapter-0:ability:phoenix-cry-west', kind: 'ability', name: 'Phoenix Cry (West)', slots: { appearance: 'Dusk falls where it lands.' } },
    ]);
    expect(codex.abilities).toEqual([]);
    // The ability the chapter did teach still reads on the character's own card.
    expect(codex.characters[0].abilities.map(ability => ability.name)).toEqual(['Phoenix Cry']);
  });

  it('opens neither when two cards reach the same key', () => {
    // "Phoenix Cry (East)" and "Phoenix Cry East" both reach
    // chapter-0:ability:phoenix-cry-east, so the words name both or neither.
    const codex = whoLearned('Phoenix Cry East', [
      { key: 'chapter-0:ability:phoenix-cry-east', kind: 'ability', name: 'Phoenix Cry (East)', slots: { appearance: 'Dawn breaks where it lands.' } },
      { key: 'chapter-0:ability:phoenix-cry-east-2', kind: 'ability', name: 'Phoenix Cry East', slots: { appearance: 'A plainer name for a plainer art.' } },
    ]);
    expect(codex.abilities).toEqual([]);
  });

  it('opens the one card a chapter\'s words do name', () => {
    const codex = whoLearned('Phoenix Cry', [
      { key: 'chapter-0:ability:phoenix-cry', kind: 'ability', name: 'Phoenix Cry', slots: { appearance: 'Dawn breaks where it lands.' } },
      { key: 'chapter-0:ability:frostbrush-edict', kind: 'ability', name: 'Frostbrush Edict', slots: { appearance: 'Frost strokes hang, then fall.' } },
    ]);
    expect(codex.abilities.map(ability => ability.name)).toEqual(['Phoenix Cry']);
    expect(codex.abilities[0].firstSeen?.chapterNumber).toBe(1);
  });

  it('shows nothing of its own when a story has no world recorded', () => {
    const codex = deriveStoryCodex({ entries: [], chapters: [] });
    expect(codex.characters).toEqual([]);
    expect(codex.places).toEqual([]);
    expect(codex.worldRules).toBeUndefined();
  });
});

describe('A card the world opened with and a chapter reaches is one card', () => {
  it('adds a chapter\'s record to it, never a second card', () => {
    const codex = deriveStoryCodex({
      entries: [entry('qin', 'character', 'Elder Qin', { aliases: ['The Iron Brush'] }), entry('blade', 'thing', 'Frost Blade')],
      chapters: [chapterWithAGift()],
      world: openWorld,
    });
    const qin = codex.characters.filter(character => character.name === 'Elder Qin');
    expect(qin).toHaveLength(1);
    expect(qin[0].key).toBe('qin');
    expect(qin[0].atChapterZero?.map(fact => fact.slot.id)).toEqual(['role', 'location']);
    expect(qin[0].things.map(thing => thing.name)).toEqual(['Frost Blade']);
    expect(qin[0].firstSeen?.chapterNumber).toBe(1);
    // The story's own order comes first: Elder Qin is met, Ye Chen is not yet.
    expect(codex.characters.map(character => character.name)).toEqual(['Ye Chen', 'Elder Qin']);
    expect(codex.items.map(item => item.name)).toEqual(['Frost Blade', 'Jade Token']);
  });

  it('keeps one card for a thing the world opened with when a chapter names it', () => {
    const token = (): StoryCodexChapter => ({
      ...chapterWithAGift(),
      paragraphs: ['Ye Chen turned the jade token over.'],
      holdingChanges: [{
        kind: HOLDING_CHANGE_KIND,
        id: 'holding:c1-p1:0-34:0',
        anchor: { level: 'span', blockId: 'c1-p1', startOffset: 0, endOffset: 34, selectedText: 'Ye Chen turned the jade token over.' },
        payload: { origin: 'harness', verb: 'has', holder: { name: 'MC', entryId: 'chen' }, target: { name: 'Jade Token', entryId: 'token' } },
      }],
    });
    const codex = deriveStoryCodex({
      entries: [entry('chen', 'character', 'Ye Chen', { mainCharacter: true }), entry('token', 'thing', 'Jade Token')],
      chapters: [token()],
      world,
      mainCharacterName: 'Ye Chen',
    });
    expect(codex.items.filter(item => item.name === 'Jade Token')).toHaveLength(1);
    const jade = codex.items.find(item => item.name === 'Jade Token')!;
    expect(jade.holder?.name).toBe('Ye Chen');
    expect(jade.atChapterZero?.map(fact => fact.slot.id)).toEqual(['appearance', 'holder']);
  });
});
