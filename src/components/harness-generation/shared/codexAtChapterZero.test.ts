import { describe, expect, it } from 'vitest';
import type { WorldAtChapterZero } from '../../../narrative/worldRecord';
import type { CodexEntry } from '../../../narrative/holdings';
import { deriveStoryCodex, type StoryCodexChapter } from './storyCodex';
import { HOLDING_CHANGE_KIND } from '../../../narrative/holdings';

/**
 * The Codex before Chapter 1: the world a Story Seed and its World Blueprint
 * made is the record's first layer, and the chapters add to those same cards.
 */

const world: WorldAtChapterZero = {
  cards: [
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
  ],
};

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

describe('The Codex before Chapter 1', () => {
  it('shows every card the world opened with, with no chapter written', () => {
    const codex = deriveStoryCodex({ entries: [], chapters: [], world });
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

  it('gives each card its facts under the labels its card kind reads by', () => {
    const codex = deriveStoryCodex({ entries: [], chapters: [], world });
    expect(codex.characters[0].atChapterZero?.map(fact => [fact.slot.label, fact.value])).toEqual([
      ['Who they are', 'A quarry laborer the sect wrote off.'],
      ['Where they are', 'Rift Quarry'],
      ['Holds', 'Jade Token'],
      ['Status', 'Meridians destroyed'],
    ]);
    expect(codex.places[0].atChapterZero.map(fact => fact.slot.label)).toEqual(['Look', 'Condition']);
  });

  it('shows nothing of its own when a story has no world recorded', () => {
    const codex = deriveStoryCodex({ entries: [], chapters: [] });
    expect(codex.characters).toEqual([]);
    expect(codex.places).toEqual([]);
    expect(codex.worldRules).toBeUndefined();
  });

  it('adds a chapter\'s record to the card the world opened with, never a second card', () => {
    const codex = deriveStoryCodex({
      entries: [entry('qin', 'character', 'Elder Qin', { aliases: ['The Iron Brush'] }), entry('blade', 'thing', 'Frost Blade')],
      chapters: [chapterWithAGift()],
      world,
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
