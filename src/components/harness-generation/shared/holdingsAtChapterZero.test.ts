import { describe, expect, it } from 'vitest';
import { readMarks } from '../../../narrative/marks';
import type { CodexEntry } from '../../../narrative/holdings';
import type { WorldAtChapterZero } from '../../../narrative/worldRecord';
import { harnessParagraphBlockId } from './chapterBody';
import {
  deriveHoldings,
  holdingsSection,
  placeHoldingChanges,
  resolveHoldingChanges,
  type DeclaredCharacter,
  type HoldingsChapter,
} from './holdings';

/**
 * What a character already holds when the story opens (SENSEI, 2026-10-24: the
 * Blueprint's cards have to reach the prose). Holdings is the one section that
 * says what a character has now, so it starts from the Chapter 0 world and the
 * chapters work on from there. These hold the two halves apart: the baseline
 * the world gives, and what a chapter is still free to change about it.
 */

const DECLARED: DeclaredCharacter[] = [
  { name: 'Ye Chen', aliases: ['Young Master Ye'], mainCharacter: true },
  { name: 'Elder Qin' },
];

const WORLD: WorldAtChapterZero = {
  cards: [
    {
      key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true,
      // The sword is on his own list and has a card of its own; the fan has
      // only a card, and the manual only his list.
      slots: { rankLevel: 'Qi Condensation 1', holds: 'a rusted sword; the Jade Fan', knows: 'Iron Palm, Cloud Step' },
    },
    { key: 'chapter-0:character:elder-qin', kind: 'character', name: 'Elder Qin', slots: { rankLevel: 'Core Formation 4' } },
    { key: 'chapter-0:thing:rusted-sword', kind: 'thing', name: 'Rusted Sword', slots: { holder: 'Ye Chen' } },
    { key: 'chapter-0:thing:spirit-pill', kind: 'thing', name: 'Spirit Pill', slots: { holder: 'Ye Chen', count: '3' } },
    { key: 'chapter-0:ability:iron-palm', kind: 'ability', name: 'Iron Palm', slots: { ladder: 'Minor, Major' } },
  ],
};

const story = (worldAtChapterZero?: WorldAtChapterZero) => {
  let entries: CodexEntry[] = [];
  let next = 0;
  const chapters: HoldingsChapter[] = [];
  const write = (chapterNumber: number, paragraphs: string[], closingHoldings?: string[]) => {
    const placement = placeHoldingChanges({
      paragraphs: paragraphs.map((paragraph, index) => ({ blockId: harnessParagraphBlockId(chapterNumber, index), ...readMarks(paragraph) })),
    });
    const resolved = resolveHoldingChanges({
      storyId: 'story-1', chapter: { id: `chapter-${chapterNumber}`, chapterNumber }, changes: placement.changes,
      entries, declared: DECLARED, createdAt: '2026-10-24T00:00:00.000Z', createId: () => `entry-${++next}`,
    });
    entries = [...entries, ...resolved.created];
    chapters.push({ id: `chapter-${chapterNumber}`, chapterNumber, holdingChanges: resolved.changes,
      ...(closingHoldings ? { closingHoldings } : {}) });
  };
  return { write, derive: () => deriveHoldings({ entries, chapters, mainCharacterName: 'Ye Chen', worldAtChapterZero }) };
};

const main = (state: ReturnType<typeof deriveHoldings>) => state.characters.find(character => character.mainCharacter)!;
const things = (state: ReturnType<typeof deriveHoldings>) => main(state).things.map(thing => [thing.name, thing.count]);

describe('what the world gives a character before Chapter 1', () => {
  it('starts the main character with the rank, things and abilities their card gives them', () => {
    const state = story(WORLD).derive();
    expect(main(state).rank?.text).toBe('Qi Condensation 1');
    expect(things(state)).toEqual([['Rusted Sword', 1], ['Jade Fan', 1], ['Spirit Pill', 3]]);
    expect(main(state).abilities.map(ability => [ability.name, ability.stage, ability.usable]))
      .toEqual([['Iron Palm', 'learned', true], ['Cloud Step', 'learned', true]]);
  });

  it('counts a thing named on its own card and on its holder\'s list once', () => {
    // 'a rusted sword' on his list and 'Rusted Sword' on its card are one
    // sword, under the name the story writes it by.
    const state = story(WORLD).derive();
    expect(things(state).filter(([name]) => name === 'Rusted Sword')).toEqual([['Rusted Sword', 1]]);
    expect(state.flags).toEqual([]);
  });

  it('keeps a count written into a listed name, so the first chapter to spend one does not spend them all', () => {
    const world: WorldAtChapterZero = { cards: [{
      key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true,
      slots: { holds: 'Spirit Pill ×3, 2 Jade Tokens, Rusted Sword' },
    }] };
    expect(things(story(world).derive())).toEqual([['Spirit Pill', 3], ['Jade Tokens', 2], ['Rusted Sword', 1]]);
    const run = story(world);
    run.write(1, ['He swallowed a [[lost: MC | Spirit Pill | ×1 | eaten]]pill.']);
    expect(things(run.derive())).toEqual([['Spirit Pill', 2], ['Jade Tokens', 2], ['Rusted Sword', 1]]);
    expect(holdingsSection(run.derive(), 'Ye Chen').characters[0].carries).toEqual(['Spirit Pill ×2', 'Jade Tokens ×2', 'Rusted Sword']);
  });

  it('reads a whole quantity, so a thousand is not one', () => {
    // Review finding (Codex, 2026-10-24): the first run of digits made '1,000'
    // one stone, and spending one removed the entire supply.
    const world: WorldAtChapterZero = { cards: [
      { key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true,
        slots: { holds: 'Jade Token ×2,500' } },
      { key: 'chapter-0:thing:spirit-stone', kind: 'thing', name: 'Spirit Stone', slots: { holder: 'Ye Chen', count: '1,000' } },
      // A count that is not a quantity is no count, rather than a guess at one.
      { key: 'chapter-0:thing:ember-coin', kind: 'thing', name: 'Ember Coin', slots: { holder: 'Ye Chen', count: 'a good few' } },
    ] };
    expect(things(story(world).derive())).toEqual([['Jade Token', 2500], ['Spirit Stone', 1000], ['Ember Coin', 1]]);
    const run = story(world);
    run.write(1, ['He spent one [[lost: MC | Spirit Stone | ×1 | spent]]stone.']);
    expect(things(run.derive())).toEqual([['Jade Token', 2500], ['Spirit Stone', 999], ['Ember Coin', 1]]);
  });

  it('gives a Chapter 0 holding no passage, because no chapter wrote it', () => {
    const state = story(WORLD).derive();
    expect(main(state).things.flatMap(thing => thing.events)).toEqual([]);
    expect(main(state).rank?.events).toEqual([]);
    expect(main(state).history).toEqual([]);
  });

  it('seeds every character the world names, main or not', () => {
    const state = story(WORLD).derive();
    expect(state.characters.find(character => character.name === 'Elder Qin')?.rank?.text).toBe('Core Formation 4');
  });

  it('records no character at all when the story has no Chapter 0 world', () => {
    // A story written before the world existed reads exactly as it did: the
    // section still shows the main character, with nothing under them.
    const state = story().derive();
    expect(state.characters).toEqual([]);
    expect(holdingsSection(state, 'Ye Chen').characters).toEqual([{ name: 'Ye Chen', mainCharacter: true }]);
  });

  it('keeps the article off a name only the holder\'s own list gives', () => {
    // "the Jade Fan" and a later tag's "Jade Fan" are one fan, not two.
    const state = story(WORLD).derive();
    expect(main(state).things.map(thing => thing.name)).toContain('Jade Fan');
    expect(main(state).things.map(thing => thing.entryId)).toContain('chapter-0:thing:jade-fan');
  });
});

describe('what a chapter may still do with it', () => {
  it('removes a Chapter 0 thing the story takes away', () => {
    const run = story(WORLD);
    run.write(1, ['He left the [[lost: MC | Rusted Sword | ×1 | shattered]]rusted sword in the dirt.']);
    const state = run.derive();
    expect(things(state)).toEqual([['Jade Fan', 1], ['Spirit Pill', 3]]);
    expect(state.flags).toEqual([]);
  });

  it('refuses to count a Chapter 0 thing twice when a chapter gains it again', () => {
    const run = story(WORLD);
    run.write(1, ['He took up the [[gained: MC | Rusted Sword]]rusted sword again.']);
    const state = run.derive();
    expect(things(state)).toEqual([['Rusted Sword', 1], ['Jade Fan', 1], ['Spirit Pill', 3]]);
    expect(state.flags.map(flag => flag.kind)).toEqual(['already-held']);
  });

  it('reaches a starting thing a chapter names by another of its names', () => {
    // Review finding (Codex, 2026-10-24): matching only the canonical name left
    // a valid loss under an alias flagged as a loss of something unheld, and a
    // gain under one making a second holding.
    const world: WorldAtChapterZero = { cards: [
      { key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, slots: {} },
      { key: 'chapter-0:thing:vermilion-brush', kind: 'thing', name: 'Vermilion Brush', aliases: ['Red Quill'],
        slots: { holder: 'Ye Chen' } },
    ] };
    expect(things(story(world).derive())).toEqual([['Vermilion Brush', 1]]);
    const run = story(world);
    run.write(1, ['He snapped the [[lost: MC | Red Quill | ×1 | snapped]]quill in two.']);
    expect(things(run.derive())).toEqual([]);
    expect(run.derive().flags).toEqual([]);
  });

  it('accepts a closing list that names a starting thing by another of its names', () => {
    // Review finding (Codex, 2026-10-24): the closing-list check read only the
    // canonical name, so a correct chapter read as having lost one thing and
    // gained another — with no holding tag at all, straight to the fixer.
    const world: WorldAtChapterZero = { cards: [
      { key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, slots: {} },
      { key: 'chapter-0:thing:vermilion-brush', kind: 'thing', name: 'Vermilion Brush', aliases: ['Red Quill'],
        slots: { holder: 'Ye Chen' } },
    ] };
    const run = story(world);
    run.write(1, ['He carried it east.'], ['Red Quill']);
    expect(run.derive().flags).toEqual([]);
    // The canonical name still answers, and a thing the world never gave does not.
    const byName = story(world);
    byName.write(1, ['He carried it east.'], ['Vermilion Brush']);
    expect(byName.derive().flags).toEqual([]);
    const wrong = story(world);
    wrong.write(1, ['He carried it east.'], ['Azure Fan']);
    expect(wrong.derive().flags.map(flag => flag.kind)).toEqual(['closing-unlisted', 'closing-untagged']);
  });

  it('knows a starting thing lost and regained is the same thing', () => {
    // Review finding (Codex, 2026-10-24): reading the names off what is held
    // now cannot work for a thing already lost, so the chapter that regained it
    // made a second one and the loss after that read as a loss of something
    // unheld. What the world gave outlives the holding.
    const world: WorldAtChapterZero = { cards: [
      { key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, slots: {} },
      { key: 'chapter-0:thing:vermilion-brush', kind: 'thing', name: 'Vermilion Brush', aliases: ['Red Quill'],
        slots: { holder: 'Ye Chen' } },
    ] };
    const run = story(world);
    run.write(1, ['He dropped the [[lost: MC | Vermilion Brush | ×1 | dropped]]brush down the well.']);
    expect(things(run.derive())).toEqual([]);
    run.write(2, ['A hand returned the [[gained: MC | Red Quill]]quill to him.']);
    expect(things(run.derive())).toEqual([['Red Quill', 1]]);
    run.write(3, ['He snapped the [[lost: MC | Vermilion Brush | ×1 | snapped]]brush at last.']);
    expect(things(run.derive())).toEqual([]);
    expect(run.derive().flags).toEqual([]);
  });

  it('reads a list written with the punctuation its own language lists with', () => {
    // Review finding (Codex, 2026-10-24): splitting on the ASCII comma alone
    // left a Chinese or Japanese list whole, and the full-width comma then read
    // as a note about the story — so every holding in it was dropped in
    // silence. SENSEI's own tests are not written in English.
    const world: WorldAtChapterZero = { cards: [
      { key: 'chapter-0:character:ye-chen', kind: 'character', name: '葉塵', mainCharacter: true,
        slots: { holds: '玉牌，鉄剣', knows: '铁掌，云步' } },
    ] };
    const state = story(world).derive();
    expect(things(state)).toEqual([['玉牌', 1], ['鉄剣', 1]]);
    expect(main(state).abilities.map(ability => ability.name)).toEqual(['铁掌', '云步']);
    // The enumeration comma lists them too.
    const enumerated = story({ cards: [
      { key: 'chapter-0:character:ye-chen', kind: 'character', name: '葉塵', mainCharacter: true,
        slots: { knows: '铁掌、云步' } },
    ] }).derive();
    expect(main(enumerated).abilities.map(ability => ability.name)).toEqual(['铁掌', '云步']);
  });

  it('spends a Chapter 0 count down rather than starting from nothing', () => {
    const run = story(WORLD);
    run.write(1, ['He swallowed a [[lost: MC | Spirit Pill | ×1 | eaten]]pill.']);
    expect(things(run.derive())).toEqual([['Rusted Sword', 1], ['Jade Fan', 1], ['Spirit Pill', 2]]);
  });

  it('refuses to guess between two of the world\'s characters whose names nearly match', () => {
    // 'Mu' reads as one name with both 'Elder Mu' and 'Old Mu' and is neither
    // of them, so rather than hand the fan to whichever card came first, the
    // change stays under its own key.
    const world: WorldAtChapterZero = { cards: [
      { key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, slots: {} },
      { key: 'chapter-0:character:elder-mu', kind: 'character', name: 'Elder Mu', slots: {} },
      { key: 'chapter-0:character:old-mu', kind: 'character', name: 'Old Mu', slots: {} },
    ] };
    const run = story(world);
    run.write(1, ['He handed [[gained: Mu | Jade Fan]]the fan over.']);
    const state = run.derive();
    // Neither of the world's two near names was given the fan; it stayed with
    // the character the chapter's own words made.
    expect(state.characters.filter(character => character.things.length).map(character => character.name)).toEqual(['Mu']);
    expect(state.characters.find(character => character.name === 'Elder Mu')?.things).toEqual([]);
    expect(state.characters.find(character => character.name === 'Old Mu')?.things).toEqual([]);
  });

  it('still reaches the one world character a chapter names exactly', () => {
    const world: WorldAtChapterZero = { cards: [
      { key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, slots: {} },
      { key: 'chapter-0:character:elder-mu', kind: 'character', name: 'Elder Mu', slots: {} },
      { key: 'chapter-0:character:old-mu', kind: 'character', name: 'Old Mu', slots: {} },
    ] };
    const run = story(world);
    run.write(1, ['He handed [[gained: Elder Mu | Jade Fan]]the fan over.']);
    const state = run.derive();
    // One Elder Mu, holding the fan: the world's card and the chapter's tag are
    // the same character, not two.
    expect(state.characters.filter(character => character.name === 'Elder Mu')).toHaveLength(1);
    expect(state.characters.find(character => character.name === 'Elder Mu')!.things.map(thing => thing.name)).toEqual(['Jade Fan']);
  });

  it('spends the holding the story names, not the one whose name is merely close', () => {
    const world: WorldAtChapterZero = { cards: [
      { key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true,
        slots: { holds: 'Spirit Pill; Spirit Pills' } },
    ] };
    const run = story(world);
    run.write(1, ['He swallowed a [[lost: MC | Spirit Pill | ×1]]pill.']);
    // 'Spirit Pill' and 'Spirit Pills' both read as one name to the matcher, so
    // the exact name decides and nothing is guessed.
    expect(things(run.derive())).toEqual([['Spirit Pills', 1]]);
    expect(run.derive().flags).toEqual([]);
  });

  it('refuses to guess when two Chapter 0 holdings are equally close', () => {
    const world: WorldAtChapterZero = { cards: [
      { key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true,
        slots: { holds: 'Spirit Pills; Spirit Pilled' } },
    ] };
    const run = story(world);
    run.write(1, ['He swallowed a [[lost: MC | Spirit Pill | ×1]]pill.']);
    // Neither is spent on a guess: the loss is reported against a holding the
    // record does not show, rather than against the wrong one.
    expect(run.derive().flags.map(flag => flag.kind)).toEqual(['not-held']);
    expect(things(run.derive())).toEqual([['Spirit Pills', 1], ['Spirit Pilled', 1]]);
  });

  it('raises a Chapter 0 rank by the story, not from the bottom', () => {
    const run = story(WORLD);
    run.write(1, ['He broke through to [[rank: Ye Chen | Qi Condensation | 2]]the second level.']);
    expect(main(run.derive()).rank?.text).toBe('Qi Condensation 2');
  });
});

describe('the one card a written name means', () => {
  // Review finding (Codex, 2026-10-24): a first fuzzy match would read 'Sword'
  // as 'Iron Sword' and give a thing held by 'Qin' to 'Elder Qin'.
  const world: WorldAtChapterZero = { cards: [
    { key: 'chapter-0:character:qin', kind: 'character', name: 'Qin', slots: {} },
    { key: 'chapter-0:character:elder-qin', kind: 'character', name: 'Elder Qin', slots: {} },
    { key: 'chapter-0:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true,
      slots: { holds: 'Sword', knows: 'Palm' } },
    { key: 'chapter-0:thing:iron-sword', kind: 'thing', name: 'Iron Sword', slots: {} },
    { key: 'chapter-0:thing:sword', kind: 'thing', name: 'Sword', slots: {} },
    { key: 'chapter-0:thing:jade-token', kind: 'thing', name: 'Jade Token', slots: { holder: 'Qin' } },
    { key: 'chapter-0:ability:iron-palm', kind: 'ability', name: 'Iron Palm', slots: {} },
    { key: 'chapter-0:ability:palm', kind: 'ability', name: 'Palm', slots: {} },
  ] };
  const state = story(world).derive();
  const held = (name: string) => state.characters.find(character => character.name === name);

  it('takes the thing and ability whose name is the one written, not the one merely close', () => {
    expect(held('Ye Chen')!.things.map(thing => thing.name)).toEqual(['Sword']);
    expect(held('Ye Chen')!.abilities.map(ability => ability.name)).toEqual(['Palm']);
  });

  it('gives a thing to the holder its card names, not to a longer name containing it', () => {
    expect(held('Qin')!.things.map(thing => thing.name)).toEqual(['Jade Token']);
    expect(held('Elder Qin')!.things).toEqual([]);
  });

  it('refuses a holder no single card can be matched to', () => {
    const ambiguous = story({ cards: [
      { key: 'chapter-0:character:qin-a', kind: 'character', name: 'Qin Shi', slots: {} },
      { key: 'chapter-0:character:qin-b', kind: 'character', name: 'Shi Qin', slots: {} },
      { key: 'chapter-0:thing:token', kind: 'thing', name: 'Token', slots: { holder: 'Qin' } },
    ] }).derive();
    // 'Qin' names neither one more than the other, so the token is left unheld
    // rather than handed to whichever card came first.
    expect(ambiguous.characters.flatMap(character => character.things)).toEqual([]);
  });

  it('finds a card by any name the world knows it by', () => {
    const byAlias = story({ cards: [
      { key: 'chapter-0:character:qin', kind: 'character', name: 'Elder Qin', aliases: ['The Iron Brush'], slots: {} },
      { key: 'chapter-0:thing:brush', kind: 'thing', name: 'Vermilion Brush', slots: { holder: 'The Iron Brush' } },
    ] }).derive();
    expect(byAlias.characters[0].things.map(thing => thing.name)).toEqual(['Vermilion Brush']);
  });
});

describe('the Holdings section the writer reads', () => {
  it('shows what the world gave the main character, before any chapter is written', () => {
    const section = holdingsSection(story(WORLD).derive(), 'Ye Chen');
    expect(section.characters[0]).toEqual({
      name: 'Ye Chen', mainCharacter: true, rank: 'Qi Condensation 1',
      carries: ['Rusted Sword', 'Jade Fan', 'Spirit Pill ×3'],
      knows: ['Iron Palm', 'Cloud Step'],
    });
  });
});
