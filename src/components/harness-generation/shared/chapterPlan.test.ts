import { describe, expect, it } from 'vitest';
import type { ChapterPlan } from '../../../narrative/chapterPlan';
import type { CodexEntry } from '../../../narrative/holdings';
import type { CodexSection, HarnessArcContext } from '../../../narrative/generation';
import { checkChapterPlan, readChapterPlan, resolveChapterPlan, unresolvedPlan, writerChapterPlan } from './chapterPlan';
import { createCodexEntryResolver, type DeclaredCharacter } from './holdings';
import type { RecordChapter } from './planRecord';

/**
 * The Chapter Plan in the HARNESS (SENSEI, 2026-10-20): read leniently from
 * the planner's reply, checked by plain rules against the record, and given to
 * the writer with its cast as the record had them.
 */

const DECLARED: DeclaredCharacter[] = [{ name: 'Lin', mainCharacter: true }, { name: 'Elder Qin' }];

describe('reading the planner\'s reply', () => {
  it('reads every piece from its menu, letter case, hyphens and other forms aside', () => {
    const reading = readChapterPlan(JSON.stringify({
      cast: [
        { name: 'Lin', kind: 'character' },
        { name: 'Kael Varn', kind: 'character', who: 'A ferryman who owes the river cult.', gender: 'Male', age: 'ELDER',
          look: { summary: 'A gaunt ferryman.', build: 'gaunt', hair: 'grey', wings: 'none' }, alreadyHas: [{ kind: 'thing', name: 'Bone Oar' }, 'Ferry Token'] },
        { name: 'Bone Oar', kind: 'thing', gender: 'female' },
      ],
      events: [
        { kind: 'Confrontation', actor: 'MC', targets: ['Kael Varn', 'unnamed: a cult guard'], attempt: 'to force the ferry across', outcome: 'success_at_a_cost',
          presses: [{ who: 'MC', level: 'Heavy' }, { who: 'Kael Varn', level: 'unbearable' }],
          how: 'Lin seizes the oar and forces the ferry across.', facts: [
            { type: 'holding', who: 'MC', change: 'gained', what: 'Bone Oar' },
            { type: 'status', who: 'unnamed: a cult guard', state: 'Dead', how: 'drowned' },
            { type: 'commitment', who: 'Kael Varn', toWhom: 'MC', change: 'entered', what: 'passage back' },
            { type: 'stance', who: 'Kael Varn', towardWhom: 'MC', mode: 'said', polarity: 'hostile' },
          ] },
      ],
      arcGoalReached: { reached: true, event: 1 },
      chapterFunction: 'conflict',
    }));
    if (!reading.ok) throw new Error(reading.problem);
    expect(reading.checks).toEqual([]);
    expect(reading.plan).toEqual({
      cast: [
        // The checks, which know the record, make the main character's name MC.
        { name: 'Lin', kind: 'character' },
        { name: 'Kael Varn', kind: 'character', who: 'A ferryman who owes the river cult.', gender: 'male', age: 'elder',
          look: { summary: 'A gaunt ferryman.', traits: { build: 'gaunt', hair: 'grey' } }, alreadyHas: [{ kind: 'thing', name: 'Bone Oar' }, { kind: 'thing', name: 'Ferry Token' }] },
        // A thing has no gender or age.
        { name: 'Bone Oar', kind: 'thing' },
      ],
      events: [{
        kind: 'confrontation', actor: { name: 'MC' }, targets: [{ name: 'Kael Varn' }, { name: 'a cult guard', unnamed: true }], attempt: 'to force the ferry across',
        outcome: 'success at a cost', presses: [{ who: { name: 'MC' }, level: 'heavy' }], how: 'Lin seizes the oar and forces the ferry across.',
        facts: [
          { type: 'holding', who: { name: 'MC' }, change: 'gains', what: { name: 'Bone Oar' } },
          { type: 'status', who: { name: 'a cult guard', unnamed: true }, state: 'dead', how: 'drowned' },
          { type: 'commitment', who: { name: 'Kael Varn' }, toWhom: { name: 'MC' }, change: 'entered', what: 'passage back' },
          { type: 'stance', who: { name: 'Kael Varn' }, towardWhom: { name: 'MC' }, mode: 'said', polarity: 'hostile' },
        ],
      }],
      arcGoalReached: { event: 1 },
      chapterFunction: 'conflict',
    });
  });

  it('sets aside a piece it cannot read with a plain reason, never the plan', () => {
    const reading = readChapterPlan('```json\n' + JSON.stringify({
      cast: [{ name: 'MC', kind: 'character' }, { kind: 'character' }],
      events: [
        { kind: 'heist', actor: 'MC', targets: [], attempt: 'to slip past the gate', outcome: 'meh', presses: [], facts: [
          { type: 'holding', who: 'MC', change: 'borrows', what: 'Lantern' },
          { type: 'rumor', who: 'MC' },
          { type: 'goal', who: 'MC', change: 'set' },
          'not a fact',
        ] },
      ],
      arcGoalReached: { reached: true, event: 4 },
      storyEnds: { ends: true },
    }) + '\n```');
    if (!reading.ok) throw new Error(reading.problem);
    expect(reading.plan).toEqual({
      cast: [{ name: 'MC', kind: 'character' }],
      // Without words for how it happens, the attempt stands in.
      events: [{ actor: { name: 'MC' }, targets: [], attempt: 'to slip past the gate', presses: [], how: 'to slip past the gate', facts: [] }],
    });
    expect(reading.checks.map(check => check.message)).toEqual([
      'Event 1\'s kind ‘heist’ is not on the menu, so it has none.',
      'Event 1\'s outcome ‘meh’ is not on the menu, so it has none.',
      'Event 1: a holding fact for MC with no change from the menu could not be read and was set aside.',
      'Event 1: a fact of unknown type ‘rumor’ could not be read and was set aside.',
      'Event 1: a goal fact for MC without its change or its goal could not be read and was set aside.',
      'Event 1: a fact that was not an object could not be read and was set aside.',
      'Event 1 says nothing of how it happens.',
      'The plan says the Active Arc Goal is reached but names no event of this chapter, so it is not recorded.',
      'The plan says the story ends but names no event of this chapter, so it is not recorded.',
      'The plan returned no chapter function from the menu, so the rhythm history skips this chapter.',
    ]);
  });

  it('holds no plan only when the reply is not one, or has no event to narrate', () => {
    expect(readChapterPlan('The chapter opens at dawn.')).toEqual({ ok: false, problem: 'The planner\'s reply was not a plan the HARNESS could read.' });
    expect(readChapterPlan(JSON.stringify({ cast: [{ name: 'MC', kind: 'character' }], events: [] })))
      .toEqual({ ok: false, problem: 'The planner\'s reply held no event to narrate.' });
  });
});

/** A story's record so far: entries, and committed chapters with their plans resolved. */
const recordOf = (plans: ChapterPlan[]) => {
  let entries: CodexEntry[] = [];
  let next = 0;
  const chapters: RecordChapter[] = plans.map((plan, index) => {
    const chapter = { id: `c${index + 1}`, chapterNumber: index + 1 };
    const resolver = createCodexEntryResolver({ storyId: 's', chapter, entries, declared: DECLARED, createdAt: '', createId: () => `e${++next}` });
    const resolved = resolveChapterPlan(plan, resolver);
    entries = [...entries, ...resolver.created];
    return { ...chapter, plan: resolved };
  });
  return { entries, chapters };
};
const check = (plan: ChapterPlan, before: ChapterPlan[] = [], extra: { mode?: 'regular' | 'survival'; arc?: HarnessArcContext } = {}) =>
  checkChapterPlan({ plan, storyId: 's', ...recordOf(before), declared: DECLARED, mode: extra.mode ?? 'regular', ...(extra.arc ? { arc: extra.arc } : {}) });
const event = (how: string, facts: ChapterPlan['events'][number]['facts'] = [], actor = 'MC'): ChapterPlan['events'][number] =>
  ({ actor: { name: actor }, targets: [], presses: [], how, facts });

describe('the plain checks', () => {
  it('names the main character MC everywhere and puts them first in the cast, one member per name', () => {
    const checked = check({
      cast: [{ name: 'Elder Qin', kind: 'character' }, { name: 'Lin', kind: 'thing' }, { name: 'elder qin', kind: 'character', who: 'The archive\'s keeper.' }],
      events: [event('Lin bows to Elder Qin.', [{ type: 'stance', who: { name: 'Lin' }, towardWhom: { name: 'Elder Qin' }, mode: 'acted', polarity: 'warm' }], 'Lin')],
    }, [{ cast: [{ name: 'MC', kind: 'character' }], events: [event('Lin wakes.')] }]);
    expect(checked.plan.cast).toEqual([{ name: 'MC', kind: 'character' }, { name: 'Elder Qin', kind: 'character', who: 'The archive\'s keeper.' }]);
    expect(checked.plan.events[0].actor).toEqual({ name: 'MC' });
    expect(checked.plan.events[0].facts[0]).toMatchObject({ who: { name: 'MC' } });
    expect(checked.checks).toEqual([]);
  });

  it('drops a fact about someone neither the cast nor the Codex knows, and keeps one about someone unnamed', () => {
    const checked = check({ cast: [{ name: 'MC', kind: 'character' }], events: [event('A stranger falls, and a guard is hurt.', [
      { type: 'status', who: { name: 'Mysterious Stranger' }, state: 'wounded' },
      { type: 'status', who: { name: 'a guard', unnamed: true }, state: 'wounded' },
    ])] });
    expect(checked.plan.events[0].facts).toEqual([{ type: 'status', who: { name: 'a guard', unnamed: true }, state: 'wounded' }]);
    expect(checked.checks).toEqual([{ event: 1, fact: { type: 'status', who: { name: 'Mysterious Stranger' }, state: 'wounded' },
      message: 'Event 1: ‘Mysterious Stranger’ is not in the cast or the Codex, so this fact was dropped.' }]);
  });

  it('drops what cannot be true where it stands, in event order, and keeps the rest', () => {
    const before: ChapterPlan[] = [{ cast: [{ name: 'MC', kind: 'character' }, { name: 'Elder Qin', kind: 'character' }], events: [
      event('Elder Qin falls in the flood.', [{ type: 'status', who: { name: 'Elder Qin' }, state: 'dead' }]),
    ] }];
    const checked = check({ cast: [{ name: 'MC', kind: 'character' }], events: [
      event('Lin takes a lantern and lights it.', [{ type: 'holding', who: { name: 'MC' }, change: 'gains', what: { name: 'Lantern' } }, { type: 'holding', who: { name: 'MC' }, change: 'equips', what: { name: 'Lantern' } }]),
      event('Lin mourns Elder Qin, who will not wake, and bandages a wound she does not have.', [
        { type: 'status', who: { name: 'Elder Qin' }, state: 'wounded' },
        { type: 'status', who: { name: 'MC' }, state: 'recovered' },
        { type: 'holding', who: { name: 'MC' }, change: 'loses', what: { name: 'Map' } },
      ]),
    ] }, before);
    expect(checked.plan.events.map(planned => planned.facts.length)).toEqual([2, 0]);
    expect(checked.checks.map(found => found.message)).toEqual([
      'Event 2: Elder Qin is dead in the record, so they cannot be wounded. The fact was dropped.',
      'Event 2: Lin recovers, but the record does not show them wounded. The fact was dropped.',
      'Event 2: Lin loses ‘Map’, which the record does not show them holding, so the fact was dropped.',
    ]);
    expect(checked.checks.every(found => found.fact)).toBe(true);
  });

  it('notes and keeps what is only worth a second look: a goal never set, a commitment never made, an actor the record shows dead', () => {
    const before: ChapterPlan[] = [{ cast: [{ name: 'MC', kind: 'character' }, { name: 'Elder Qin', kind: 'character' }], events: [
      event('Elder Qin falls in the flood.', [{ type: 'status', who: { name: 'Elder Qin' }, state: 'dead' }]),
    ] }];
    const checked = check({ cast: [{ name: 'MC', kind: 'character' }, { name: 'Elder Qin', kind: 'character' }], events: [
      event('Lin reaches the tower, and keeps her word to no one.', [
        { type: 'goal', who: { name: 'MC' }, change: 'achieved', what: 'reach the tower' },
        { type: 'commitment', who: { name: 'MC' }, toWhom: { name: 'Elder Qin' }, change: 'kept', what: 'guard the archive' },
      ]),
      event('Elder Qin speaks from the water.', [], 'Elder Qin'),
    ] }, before);
    expect(checked.plan.events[0].facts).toHaveLength(2);
    expect(checked.checks.map(found => [found.event, found.fact, found.message])).toEqual([
      [1, undefined, 'Event 1: Lin\'s goal ‘reach the tower’ is achieved, but the record does not show it as their goal.'],
      [1, undefined, 'Event 1: Lin\'s commitment to Elder Qin is kept, but the record shows none open.'],
      [2, undefined, 'Event 2: Elder Qin acts, but the record shows them dead.'],
    ]);
  });

  it('sets aside a new look for someone who has one, an arc goal it cannot reach, and an ending outside Fate Survival', () => {
    const before: ChapterPlan[] = [{ cast: [{ name: 'MC', kind: 'character', look: { summary: 'A thin archivist.', traits: {} } }], events: [event('Lin wakes.')] }];
    const plan: ChapterPlan = {
      cast: [{ name: 'MC', kind: 'character', look: { summary: 'A tall warrior.', traits: {} } }],
      events: [event('Lin opens the archive.'), event('The river takes her.', [{ type: 'status', who: { name: 'MC' }, state: 'dead' }])],
      arcGoalReached: { event: 1 }, storyEnds: { event: 2 },
    };
    const reached = check(plan, before, { arc: { completionConfirmed: true } as HarnessArcContext });
    expect(reached.plan.cast[0].look).toBeUndefined();
    expect(reached.plan.arcGoalReached).toBeUndefined();
    expect(reached.plan.storyEnds).toBeUndefined();
    expect(reached.checks.map(found => found.message)).toEqual([
      'the main character already has a look, so the plan\'s new one was set aside; a change to a look is a look fact.',
      'The plan says event 1 reaches the Active Arc Goal, but the Active Arc Goal was already reached; it was set aside.',
      'The plan says event 2 ends the story, but only Fate Survival can end in failure; it was set aside.',
    ]);
    // A broken route has no goal left to reach; in Fate Survival the ending stands.
    const broken = check(plan, before, { mode: 'survival', arc: { route: { status: 'broken' } } as HarnessArcContext });
    expect(broken.plan.storyEnds).toEqual({ event: 2 });
    expect(broken.checks.map(found => found.message)).toContain('The plan says event 1 reaches the Active Arc Goal, but the route to the Destined Ending is broken, so no goal is left to reach; it was set aside.');
  });
});

describe('the plan as the writer reads it', () => {
  it('gives each cast member as the record had them, someone new in full, with what they already had', () => {
    const codex: CodexSection = { entries: [
      { name: 'Lin', kind: 'character', mainCharacter: true, gender: 'female', look: { summary: 'A thin archivist.', traits: {} }, status: 'wounded (a cut arm)',
        inHand: ['Lantern'], goals: ['reach the tower'], stances: [{ toward: 'Elder Qin', said: 'warm' }], lastOnPage: 3 },
      { name: 'Elder Qin', kind: 'character', fromStorySeed: true, notes: 'Keeper of the drowned archive.' },
    ] };
    const plan: ChapterPlan = {
      cast: [
        { name: 'MC', kind: 'character' },
        { name: 'Elder Qin', kind: 'character', who: 'The archive\'s keeper.', gender: 'male', age: 'elder', look: { summary: 'A stooped old man.', traits: { build: 'stooped' } },
          alreadyHas: [{ kind: 'thing', name: 'Archive Key' }, { kind: 'ability', name: 'Water Reading', level: 'Master' }] },
      ],
      events: [event('Lin finds Elder Qin at the tower door.')],
    };
    expect(writerChapterPlan(plan, codex)).toEqual({
      cast: [
        // What drives the planner (goals, stances, when last seen) is the planner's; the writer gets how they look, are and hold.
        { name: 'Lin', kind: 'character', mainCharacter: true, gender: 'female', look: { summary: 'A thin archivist.', traits: {} }, status: 'wounded (a cut arm)', inHand: ['Lantern'] },
        { name: 'Elder Qin', kind: 'character', new: true, who: 'The archive\'s keeper.', gender: 'male', age: 'elder', look: { summary: 'A stooped old man.', traits: { build: 'stooped' } },
          carries: ['Archive Key'], knows: ['Water Reading (Master)'] },
      ],
      events: plan.events,
    });
  });

  it('starts a kept plan from the names alone, so a rewrite resolves them again', () => {
    const resolved: ChapterPlan = {
      cast: [{ name: 'MC', entryId: 'e1', kind: 'character', alreadyHas: [{ kind: 'thing', name: 'Lantern', entryId: 'e3' }] }],
      events: [{ actor: { name: 'MC', entryId: 'e1' }, targets: [{ name: 'a guard', unnamed: true }], presses: [{ who: { name: 'MC', entryId: 'e1' }, level: 'light' }], how: 'Lin lights the lantern.',
        facts: [{ type: 'holding', who: { name: 'MC', entryId: 'e1' }, change: 'equips', what: { name: 'Lantern', entryId: 'e3' } }] }],
      chapterFunction: 'progression',
    };
    expect(unresolvedPlan(resolved)).toEqual({
      cast: [{ name: 'MC', kind: 'character', alreadyHas: [{ kind: 'thing', name: 'Lantern' }] }],
      events: [{ actor: { name: 'MC' }, targets: [{ name: 'a guard', unnamed: true }], presses: [{ who: { name: 'MC' }, level: 'light' }], how: 'Lin lights the lantern.',
        facts: [{ type: 'holding', who: { name: 'MC' }, change: 'equips', what: { name: 'Lantern' } }] }],
      chapterFunction: 'progression',
    });
  });
});
