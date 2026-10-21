import { describe, expect, it } from 'vitest';
import type { ChapterPlan, PlanCastMember, PlanEvent, PlanFact, PlanHoldingChange } from '../../../narrative/chapterPlan';
import type { CodexEntry } from '../../../narrative/holdings';
import { resolveChapterPlan } from './chapterPlan';
import {
  abilityLabel,
  createCodexEntryResolver,
  deriveHoldings,
  namesNearlyMatch,
  thingLabel,
  type DeclaredCharacter,
  type HoldingsChapter,
} from './holdings';

/**
 * Holdings from plans (SENSEI, 2026-10-20: the chapter loop): each chapter's
 * plan says what changes, its names resolve to Codex entries when it commits,
 * and what everyone holds is worked out again from every plan, in story order.
 */

const DECLARED: DeclaredCharacter[] = [
  { name: 'Ye Chen', aliases: ['Young Master Ye'], mainCharacter: true },
  { name: 'Elder Qin', aliases: ['Old Qin'] },
];

const holding = (who: string, change: PlanHoldingChange, what: string, extra: { count?: number; level?: string } = {}): PlanFact =>
  ({ type: 'holding', who: { name: who }, change, what: { name: what }, ...extra });
const event = (how: string, facts: PlanFact[]): PlanEvent => ({ actor: { name: 'MC' }, targets: [], presses: [], how, facts });
const MC: PlanCastMember = { name: 'MC', kind: 'character' };

/** Commits chapters through the real path: each plan's names resolved to entries, as a chapter's commit does. */
const story = () => {
  let entries: CodexEntry[] = [];
  let next = 0;
  const chapters: HoldingsChapter[] = [];
  const write = (chapterNumber: number, events: PlanEvent[], cast: PlanCastMember[] = [MC]) => {
    const resolver = createCodexEntryResolver({
      storyId: 'story-1', chapter: { id: `chapter-${chapterNumber}`, chapterNumber }, entries, declared: DECLARED,
      createdAt: '2026-10-20T00:00:00.000Z', createId: () => `entry-${++next}`,
    });
    const plan: ChapterPlan = resolveChapterPlan({ cast, events }, resolver);
    entries = [...entries, ...resolver.created];
    const chapter = { id: `chapter-${chapterNumber}`, chapterNumber, plan };
    chapters.push(chapter);
    return chapter;
  };
  return { write, chapters, entries: () => entries, derive: () => deriveHoldings({ entries, chapters }) };
};

const main = (state: ReturnType<typeof deriveHoldings>) => state.characters.find(character => character.mainCharacter)!;
const things = (state: ReturnType<typeof deriveHoldings>) => main(state).things.map(thing => [thing.name, thing.count, thing.equipped]);
const abilities = (state: ReturnType<typeof deriveHoldings>) => main(state).abilities.map(ability => [ability.name, ability.stage, ability.level, ability.sealed, ability.usable]);
const flagKinds = (state: ReturnType<typeof deriveHoldings>) => state.flags.map(flag => flag.kind);

describe('Codex entries for what plans name', () => {
  it('resolves MC and the main character\'s names to one entry the app makes, with their declared aliases', () => {
    const run = story();
    const chapter = run.write(1, [event('He takes the sword, draws it, and strikes with the palm he knows.', [
      holding('MC', 'gains', 'Rusted Iron Sword'), holding('Ye Chen', 'equips', 'Rusted Iron Sword'), holding('young master ye', 'learns', 'Iron Palm'),
    ])]);
    const characters = run.entries().filter(entry => entry.kind === 'character');
    expect(characters).toEqual([{ id: 'entry-1', storyId: 'story-1', kind: 'character', name: 'Ye Chen', aliases: ['Young Master Ye'], mainCharacter: true, origin: { source: 'foundation' }, createdAt: '2026-10-20T00:00:00.000Z' }]);
    expect(chapter.plan.cast[0].entryId).toBe('entry-1');
    expect(chapter.plan.events[0].facts.map(fact => fact.who.entryId)).toEqual(['entry-1', 'entry-1', 'entry-1']);
  });

  it('makes one entry per new name, reused by its exact name in later chapters', () => {
    const run = story();
    run.write(1, [event('They each take something from the stall.', [
      holding('MC', 'gains', 'Rusted Iron Sword'), holding('Elder Qin', 'gains', 'Jade Gourd'), holding('Lin', 'gains', 'Ember Bell'),
    ])], [MC, { name: 'Elder Qin', kind: 'character' }, { name: 'Lin', kind: 'character', who: 'A bell-ringer of the river town.' }]);
    run.write(2, [event('He draws the sword, and Qin raises the gourd.', [holding('MC', 'equips', 'rusted iron sword!'), holding('Old Qin', 'equips', 'Jade Gourd')])],
      [MC, { name: 'Old Qin', kind: 'character' }]);
    expect(run.entries().map(entry => [entry.kind, entry.name, entry.origin.source])).toEqual([
      ['character', 'Ye Chen', 'foundation'], ['character', 'Elder Qin', 'foundation'], ['character', 'Lin', 'plan'],
      ['thing', 'Rusted Iron Sword', 'plan'], ['thing', 'Jade Gourd', 'plan'], ['thing', 'Ember Bell', 'plan'],
    ]);
    expect(run.entries().find(entry => entry.name === 'Lin')!.origin).toEqual({ source: 'plan', chapterId: 'chapter-1', chapterNumber: 1 });
    // Chapter 2 found every name it used; it made nothing new.
    expect(run.entries()).toHaveLength(6);
    expect(things(run.derive())).toEqual([['Rusted Iron Sword', 1, true]]);
  });

  it('keeps things and abilities apart even under one name', () => {
    const run = story();
    run.write(1, [event('He finds the Fireball scroll and learns it.', [holding('MC', 'gains', 'Fireball'), holding('MC', 'learns', 'Fireball')])]);
    expect(run.entries().filter(entry => entry.name === 'Fireball').map(entry => entry.kind)).toEqual(['thing', 'ability']);
  });
});

describe('working out holdings', () => {
  it('keeps possession and equipment apart: putting a sword away keeps it owned', () => {
    const run = story();
    run.write(1, [event('He takes the sword from the rack and draws it.', [holding('MC', 'gains', 'Rusted Iron Sword'), holding('MC', 'equips', 'Rusted Iron Sword')])]);
    run.write(2, [event('He sheathes the sword.', [holding('MC', 'unequips', 'Rusted Iron Sword')]), event('He claims three pills.', [holding('MC', 'gains', 'Spirit Pill', { count: 3 })])]);
    run.write(3, [event('He swallows one pill.', [holding('MC', 'loses', 'Spirit Pill', { count: 1 })])]);
    const state = run.derive();
    expect(things(state)).toEqual([['Rusted Iron Sword', 1, false], ['Spirit Pill', 2, false]]);
    expect(main(state).history.map(change => [change.passage.chapterNumber, change.passage.event, change.verb, change.target])).toEqual([
      [1, 1, 'gained', 'Rusted Iron Sword'], [1, 1, 'equipped', 'Rusted Iron Sword'], [2, 1, 'unequipped', 'Rusted Iron Sword'], [2, 2, 'gained', 'Spirit Pill'], [3, 1, 'lost', 'Spirit Pill'],
    ]);
    // Each change keeps the event that made it: how it happens, as the plan tells it.
    expect(main(state).things[1].events.at(-1)).toMatchObject({ verb: 'lost', count: 1, passage: { chapterNumber: 3, event: 1, recordId: 'holding:c3-e1-f0', text: 'He swallows one pill.' } });
    expect(state.flags).toEqual([]);
  });

  it('keeps learning, learning finished, mastery and sealing apart: sealing keeps an ability known', () => {
    const run = story();
    run.write(1, [event('He finds the manual and begins to practise.', [holding('MC', 'gains', 'Cloud Manual'), holding('MC', 'learning', 'Cloud Step')])]);
    run.write(2, [event('It finally clicks, and his feet blur.', [holding('MC', 'learns', 'Cloud Step'), holding('MC', 'improves', 'Cloud Step', { level: 'Minor Success' })])]);
    run.write(3, [event('The curse bites down.', [holding('MC', 'seals', 'Cloud Step')])]);
    let state = run.derive();
    expect(abilities(state)).toEqual([['Cloud Step', 'learned', 'Minor Success', true, false]]);
    // Finding the manual was possession, never learning.
    expect(things(state)).toEqual([['Cloud Manual', 1, false]]);
    run.write(4, [event('The curse breaks.', [holding('MC', 'unseals', 'Cloud Step')])]);
    state = run.derive();
    expect(abilities(state)).toEqual([['Cloud Step', 'learned', 'Minor Success', false, true]]);
  });

  it('records a stage reached while still learning, and keeps it when the ability is learned', () => {
    // The owner's Sundered Heavens story, Chapter 4: the body art begun, then its first stage reached.
    const run = story();
    run.write(4, [event('He abandons all orthodox notions of qi circulation, and the ache subsides into a cold, dense solidity.', [
      holding('MC', 'learning', 'Heaven-Shattering Body Cultivation'), holding('MC', 'improves', 'Heaven-Shattering Body Cultivation', { level: 'Stage 1' }),
    ])]);
    let state = run.derive();
    expect(state.flags).toEqual([]);
    expect(abilities(state)).toEqual([['Heaven-Shattering Body Cultivation', 'learning', 'Stage 1', false, false]]);
    expect(main(state).abilities[0].events.map(change => change.verb)).toEqual(['learning', 'improved']);
    run.write(6, [event('The art holds at last.', [holding('MC', 'learns', 'Heaven-Shattering Body Cultivation')])]);
    state = run.derive();
    expect(abilities(state)).toEqual([['Heaven-Shattering Body Cultivation', 'learned', 'Stage 1', false, true]]);
  });

  it('sets rank, and records what someone already had before the chapter, never as a gain', () => {
    const run = story();
    run.write(1, [event('He sits to cultivate and reaches Qi Condensation 3.', [{ type: 'holding', who: { name: 'MC' }, change: 'rank', what: { name: 'Qi Condensation 3' } }])],
      [{ ...MC, alreadyHas: [{ kind: 'thing', name: 'Jade Pendant' }, { kind: 'ability', name: 'Iron Palm', level: 'Initial' }] }]);
    run.write(5, [event('A breakthrough.', [{ type: 'holding', who: { name: 'MC' }, change: 'rank', what: { name: 'Qi Condensation 4' } }])]);
    const state = run.derive();
    expect(main(state).rank).toMatchObject({ text: 'Qi Condensation 4' });
    expect(main(state).rank!.events.map(change => change.passage.chapterNumber)).toEqual([1, 5]);
    expect(things(state)).toEqual([['Jade Pendant', 1, false]]);
    expect(abilities(state)).toEqual([['Iron Palm', 'learned', 'Initial', false, true]]);
    expect(main(state).history.slice(0, 2).map(change => [change.verb, change.passage.recordId, change.passage.event, change.passage.text])).toEqual([
      ['has', 'holding:c1-cast1-h1', undefined, 'Already theirs when Chapter 1 began.'],
      ['knows', 'holding:c1-cast1-h2', undefined, 'Already theirs when Chapter 1 began.'],
    ]);
  });

  it('flags a change that cannot be true and leaves it out, naming its event and fact', () => {
    const run = story();
    run.write(1, [
      event('He takes the sword, then takes it again.', [holding('MC', 'gains', 'Rusted Iron Sword'), holding('MC', 'gains', 'Rusted Iron Sword')]),
      event('His palm burns as he tries a step.', [holding('MC', 'improves', 'Iron Palm', { level: 'Major Success' }), holding('MC', 'learning', 'Wind Step')]),
      event('Nothing was sealed, and two pills fall.', [holding('MC', 'unseals', 'Wind Step'), holding('MC', 'loses', 'Spirit Pill', { count: 2 })]),
    ]);
    const state = run.derive();
    expect(flagKinds(state)).toEqual(['already-held', 'not-learned', 'sealed-state', 'not-held']);
    expect(state.flags.at(-1)).toMatchObject({ chapterNumber: 1, event: 3, fact: 1, message: 'Chapter 1: Ye Chen loses ‘Spirit Pill’, which the record does not show them holding.' });
    expect(things(state)).toEqual([['Rusted Iron Sword', 1, false]]);
    expect(abilities(state)).toEqual([['Wind Step', 'learning', undefined, false, false]]);
  });

  it('takes up only what is held: something someone already had, or gained before', () => {
    // The owner's Goblin story, Chapter 1: Grit pulled a slate from under a stone. A plan gives it as already his.
    const run = story();
    run.write(1, [event('He pulls the slate from beneath a loose stone and hangs a jade sword on the wall.', [holding('MC', 'equips', 'Slate tally board'), holding('MC', 'unequips', 'Jade Sword')])],
      [{ ...MC, alreadyHas: [{ kind: 'thing', name: 'Slate tally board' }] }]);
    const state = run.derive();
    expect(things(state)).toEqual([['Slate tally board', 1, true]]);
    expect(state.flags.map(flag => flag.message)).toEqual(['Chapter 1: Ye Chen puts away ‘Jade Sword’, which the record does not show them holding.']);
  });

  it('flags losing more than held, and removes them all', () => {
    const run = story();
    run.write(1, [event('He claims two pills and spends five.', [holding('MC', 'gains', 'Spirit Pill', { count: 2 }), holding('MC', 'loses', 'Spirit Pill', { count: 5 })])]);
    const state = run.derive();
    expect(things(state)).toEqual([]);
    expect(flagKinds(state)).toEqual(['count-mismatch']);
  });

  it('keeps the record\'s count and level when what someone already had disagrees', () => {
    const run = story();
    run.write(1, [event('He claims three pills and learns the palm to Minor Success.', [holding('MC', 'gains', 'Spirit Pill', { count: 3 }), holding('MC', 'learns', 'Iron Palm', { level: 'Minor Success' })])]);
    run.write(2, [event('He rests.', [])], [{ ...MC, alreadyHas: [{ kind: 'thing', name: 'Spirit Pill', count: 5 }, { kind: 'ability', name: 'Iron Palm', level: 'Great Success' }] }]);
    const state = run.derive();
    expect(things(state)).toEqual([['Spirit Pill', 3, false]]);
    expect(abilities(state)).toEqual([['Iron Palm', 'learned', 'Minor Success', false, true]]);
    expect(flagKinds(state)).toEqual(['count-mismatch', 'level-differs']);
  });

  it('is worked out the same every time, and follows a chapter\'s current plan', () => {
    const run = story();
    run.write(5, [event('He claims three pills.', [holding('MC', 'gains', 'Spirit Pill', { count: 3 })])]);
    run.write(7, [event('He swallows one.', [holding('MC', 'loses', 'Spirit Pill', { count: 1 })])]);
    expect(run.derive()).toEqual(run.derive());
    expect(things(run.derive())).toEqual([['Spirit Pill', 2, false]]);
    // Chapter 5 rewritten without the gain: the pills are gone, and Chapter 7 is flagged.
    run.chapters[0] = { ...run.chapters[0], plan: { cast: run.chapters[0].plan.cast, events: [event('He leaves the pills.', [])] } };
    const state = run.derive();
    expect(things(state)).toEqual([]);
    expect(state.flags.map(flag => [flag.kind, flag.chapterNumber])).toEqual([['not-held', 7]]);
  });

  it('reads chapters in story order and changes in event order', () => {
    const run = story();
    run.write(2, [event('He draws it.', [holding('MC', 'equips', 'Sword')])]);
    run.write(1, [event('He finds it.', [holding('MC', 'gains', 'Sword')])]);
    expect(run.derive().flags).toEqual([]);
    expect(things(run.derive())).toEqual([['Sword', 1, true]]);
  });

  it('labels a thing with its count and an ability with its level and seal', () => {
    const run = story();
    run.write(1, [event('He claims pills and learns two arts, one sealed.', [
      holding('MC', 'gains', 'Spirit Pill', { count: 3 }), holding('MC', 'learns', 'Iron Palm', { level: 'Minor Success' }),
      holding('MC', 'learns', 'Cloud Step'), holding('MC', 'seals', 'Cloud Step'),
    ])]);
    const state = run.derive();
    expect(main(state).things.map(thingLabel)).toEqual(['Spirit Pill ×3']);
    expect(main(state).abilities.map(abilityLabel)).toEqual(['Iron Palm (Minor Success)', 'Cloud Step (sealed)']);
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

  it('flags two entries of one kind, made by plans, whose names are that close', () => {
    const run = story();
    run.write(1, [event('He takes it.', [holding('MC', 'gains', 'Rusted Iron Sword')])]);
    run.write(2, [event('He takes a rusty sword.', [holding('MC', 'gains', 'Rusty Sword')])]);
    const duplicates = run.derive().flags.filter(flag => flag.kind === 'possible-duplicate');
    expect(duplicates.map(flag => flag.message)).toEqual(['‘Rusted Iron Sword’ and ‘Rusty Sword’ may be the same thing.']);
  });
});
