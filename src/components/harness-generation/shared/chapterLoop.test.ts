import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  deriveHoldings,
  exportHarnessStory,
  type HarnessChapterPlanRequest,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationResponse,
  type HarnessWorkspaceState,
} from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { REST_OF_CHAPTER, writtenChapterReply } from '../../../test-utils/writtenChapter';
import { plannedChapter } from '../../../test-utils/chapterPlan';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { buildChapterPlannerPrompt } from '../../../server/harness-generation/chapterPlanner';
import { acceptHarnessModelResponse } from './responseAcceptance';

/**
 * The chapter loop, end to end (SENSEI, 2026-10-20; `docs/chapter-loop.md`):
 * the planner decides what happens, the plain checks drop what cannot be true
 * against the record, the writer narrates the plan and never changes it, and
 * when the chapter commits its plan's names become Codex entries and the
 * record (what everyone holds, their state, goals and the rest) is worked out
 * again from every plan.
 */

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-armory', text: 'Survive the armory trial.', chapters: 30 }] };
const response = (rawProviderResponse: string): HarnessGenerationResponse => ({
  rawProviderResponse,
  providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-20T12:00:00.000Z', usage: { source: 'unavailable' } },
});

const chapterOnePlan = {
  cast: [
    { name: 'MC', kind: 'character', gender: 'male', age: 'young', look: { summary: 'A lean young man with dark hair.', traits: { build: 'lean', hair: 'dark' } } },
    { name: 'Elder Qin', kind: 'character', who: 'The armory\'s keeper.', gender: 'male', age: 'elder', look: { summary: 'A stooped old keeper.', traits: { build: 'stooped' } } },
    { name: 'Rusted Iron Sword', kind: 'thing', look: { summary: 'An old iron blade, rusted along its edge.', traits: { material: 'iron' } } },
  ],
  events: [
    { kind: 'gain', actor: 'MC', targets: ['Rusted Iron Sword'], presses: [], how: 'Ye Chen lifts the old blade from the rack and tests its weight.', facts: [
      { type: 'holding', who: 'MC', change: 'gains', what: 'Rusted Iron Sword' },
      { type: 'holding', who: 'MC', change: 'equips', what: 'Rusted Iron Sword' },
    ] },
    { kind: 'gain', actor: 'Elder Qin', targets: [], presses: [], how: 'Elder Qin raises a jade gourd and drinks.', facts: [
      { type: 'holding', who: 'Elder Qin', change: 'gains', what: 'Jade Gourd' },
    ] },
    { kind: 'training', actor: 'MC', targets: [], presses: [{ who: 'MC', level: 'light' }], how: 'Ye Chen practises the footwork until dark, and Elder Qin leaves him three pills.', facts: [
      { type: 'holding', who: 'MC', change: 'learning', what: 'Cloud Step' },
      { type: 'holding', who: 'MC', change: 'gains', what: 'Spirit Pill', count: 3 },
      { type: 'goal', who: 'MC', change: 'set', what: 'pass the armory trial' },
    ] },
  ],
  arcGoalReached: { reached: false }, chapterFunction: 'progression',
};
const chapterTwoPlan = {
  cast: [{ name: 'MC', kind: 'character' }, { name: 'Elder Qin', kind: 'character' }],
  events: [
    { kind: 'training', actor: 'MC', targets: [], presses: [], how: 'Ye Chen swallows a pill, and his feet find the rhythm at last.', facts: [
      { type: 'holding', who: 'MC', change: 'loses', what: 'Spirit Pill', count: 1 },
      { type: 'holding', who: 'MC', change: 'learns', what: 'Cloud Step' },
    ] },
    { kind: 'gain', actor: 'MC', targets: [], presses: [], how: 'Ye Chen picks up the rusted sword again.', facts: [
      { type: 'holding', who: 'MC', change: 'gains', what: 'Rusted Iron Sword' },
    ] },
    { kind: 'confrontation', actor: 'MC', targets: ['Elder Qin'], attempt: 'test the keeper', outcome: 'success at a cost', presses: [{ who: 'Elder Qin', level: 'heavy' }],
      how: 'Ye Chen spars with Elder Qin and cuts his hand.', facts: [{ type: 'status', who: 'Elder Qin', state: 'wounded', how: 'a cut hand' }] },
  ],
  arcGoalReached: { reached: false }, chapterFunction: 'conflict',
};
const reply = (paragraphs: string[]) => JSON.stringify({
  title: 'The Armory', paragraphs, recap: 'Ye Chen took a sword.',
  nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The armory\'s past.', nextConflict: 'A rival arrives.',
});
const chapterOne = () => reply([
  'The armory was cold.',
  'Ye Chen lifted the old blade from the rack. He tested its weight.',
  'Elder Qin raised a jade gourd and drank.',
  // A tag the language does not have, slipped in: removed, never read.
  'Ye Chen began to practise the footwork. [[gained: MC | Ghost]]',
]);
const chapterTwo = () => reply(['Ye Chen swallowed a pill. His feet found the rhythm at last.', 'Steel met the keeper\'s hand.']);

const adapter = (plans: object[], replies: string[]) => {
  const planChapter = vi.fn(async (_request: HarnessChapterPlanRequest) => plannedChapter(plans.shift()!));
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  for (const raw of replies) generate.mockResolvedValueOnce(response(writtenChapterReply(raw)));
  const value: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
    generate, planChapter,
    arcOperation: async () => response(JSON.stringify({ plan: GOAL, destinedEnding: 'Ye Chen masters the armory.' })),
  };
  return { value, generate, planChapter };
};

let ids = 0;
const runtime = { now: () => '2026-10-20T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` };

const createStory = async (controller: HarnessGenerationController) => {
  await controller.hydrate();
  return controller.createStory({
    premise: 'Ye Chen survives the armory trial.',
    destinedEnding: 'Ye Chen masters the armory.',
    initialArcPlan: GOAL,
    cast: [{ name: 'Ye Chen', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }, { name: 'Elder Qin', role: 'Mentor' }],
  });
};

const holdingsOf = (state: HarnessWorkspaceState, storyId: string) => deriveHoldings({
  entries: state.codexEntries.filter(entry => entry.storyId === storyId),
  chapters: state.chapters.filter(chapter => chapter.storyId === storyId),
});

describe('The chapter loop', () => {
  it('saves the plan with every name resolved to a Codex entry, keeps the writer\'s words free of tags, and survives reload', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const controller = new HarnessGenerationController({ repository, modelAdapter: adapter([chapterOnePlan], [chapterOne()]).value, runtime });
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'fixture');

    const state = controller.snapshot();
    const chapter = state.chapters[0];
    expect(JSON.stringify(state.chapters)).not.toContain('[[');
    expect(chapter.paragraphs).toEqual([
      'The armory was cold.',
      'Ye Chen lifted the old blade from the rack. He tested its weight.',
      'Elder Qin raised a jade gourd and drank.',
      'Ye Chen began to practise the footwork.',
      REST_OF_CHAPTER,
    ]);
    expect(state.attempts[0].warnings.find(warning => warning.code === 'prose_marks_removed')?.message)
      .toBe('Removed 1 tag of a kind the SEN language does not have, and kept the prose.');
    // Every name the plan used is an entry: the main character and a declared character from the Foundation, the rest made by the plan.
    expect(state.codexEntries.map(entry => [entry.kind, entry.name, entry.mainCharacter ?? false, entry.origin.source])).toEqual([
      ['character', 'Ye Chen', true, 'foundation'], ['character', 'Elder Qin', false, 'foundation'], ['thing', 'Rusted Iron Sword', false, 'plan'],
      ['thing', 'Jade Gourd', false, 'plan'], ['ability', 'Cloud Step', false, 'plan'], ['thing', 'Spirit Pill', false, 'plan'],
    ]);
    expect(state.codexEntries.every(entry => entry.id.startsWith('hcx-') && entry.storyId === story.id)).toBe(true);
    const entryName = (id?: string) => state.codexEntries.find(entry => entry.id === id)?.name;
    expect(chapter.plan.cast.map(member => [member.name, entryName(member.entryId)])).toEqual([['MC', 'Ye Chen'], ['Elder Qin', 'Elder Qin'], ['Rusted Iron Sword', 'Rusted Iron Sword']]);
    expect(chapter.plan.events[2].facts.map(fact => [fact.type, entryName(fact.who.entryId)])).toEqual([['holding', 'Ye Chen'], ['holding', 'Ye Chen'], ['goal', 'Ye Chen']]);
    // The chapter's function is its plan's.
    expect(chapter.rhythm?.chapterFunction).toBe('progression');

    const holdings = holdingsOf(state, story.id);
    expect(holdings.characters.map(character => [character.name, character.things.map(thing => [thing.name, thing.count, thing.equipped]), character.abilities.map(ability => [ability.name, ability.stage])])).toEqual([
      ['Ye Chen', [['Rusted Iron Sword', 1, true], ['Spirit Pill', 3, false]], [['Cloud Step', 'learning']]],
      ['Elder Qin', [['Jade Gourd', 1, false]], []],
    ]);
    expect(holdings.flags).toEqual([]);

    const reloaded = new HarnessGenerationController({ repository, modelAdapter: adapter([], []).value, runtime });
    await reloaded.hydrate();
    expect(reloaded.snapshot().chapters[0].plan).toEqual(chapter.plan);
    expect(reloaded.snapshot().codexEntries).toEqual(state.codexEntries);
    expect(exportHarnessStory(reloaded.snapshot(), story.id).codexEntries).toEqual(state.codexEntries);
  });

  it('shows the planner the Codex as the last chapter left it, drops what cannot be true, and gives the writer its cast as the record had them', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const calls = adapter([chapterOnePlan, chapterTwoPlan], [chapterOne(), chapterTwo()]);
    const controller = new HarnessGenerationController({ repository, modelAdapter: calls.value, runtime });
    const story = await createStory(controller);
    // Before any chapter, the main character still leads the Codex, from the Story Seed.
    await controller.generateNextChapter(story.id, 'fixture');
    expect(calls.planChapter.mock.calls[0][0].storyInformation.codex.entries).toEqual([
      { name: 'Ye Chen', kind: 'character', mainCharacter: true, fromStorySeed: true },
      { name: 'Elder Qin', kind: 'character', fromStorySeed: true },
    ]);

    await controller.generateNextChapter(story.id, 'fixture');
    const planned = calls.planChapter.mock.calls[1][0];
    expect(planned.storyInformation.codex.entries).toEqual([
      { name: 'Ye Chen', kind: 'character', mainCharacter: true, gender: 'male', age: 'young', look: { summary: 'A lean young man with dark hair.', traits: { build: 'lean', hair: 'dark' } },
        inHand: ['Rusted Iron Sword'], carries: ['Spirit Pill ×3'], learning: ['Cloud Step'], goals: ['pass the armory trial'], lastOnPage: 1 },
      { name: 'Elder Qin', kind: 'character', who: 'The armory\'s keeper.', gender: 'male', age: 'elder', look: { summary: 'A stooped old keeper.', traits: { build: 'stooped' } },
        carries: ['Jade Gourd'], lastOnPage: 1 },
      { name: 'Rusted Iron Sword', kind: 'thing', look: { summary: 'An old iron blade, rusted along its edge.', traits: { material: 'iron' } }, heldBy: 'Ye Chen', lastOnPage: 1 },
      { name: 'Jade Gourd', kind: 'thing', heldBy: 'Elder Qin' },
      { name: 'Spirit Pill', kind: 'thing', heldBy: 'Ye Chen' },
    ]);
    expect(buildChapterPlannerPrompt(planned).userPrompt).toContain([
      'THE CODEX (everyone and everything the story knows, as the last chapter left them; the main character first)',
      '- MC: Ye Chen (main character) · male, young · look: A lean young man with dark hair. · in hand: Rusted Iron Sword · carries: Spirit Pill ×3 · learning: Cloud Step · goals: pass the armory trial · last on the page: Chapter 1',
    ].join('\n'));

    // Gaining the sword again cannot be true: the checks drop that fact before the writer, and keep why.
    const attempt = controller.snapshot().attempts[1];
    expect(attempt.chapterPlan!.checks).toEqual([expect.objectContaining({
      event: 2, message: 'Event 2: Ye Chen gains ‘Rusted Iron Sword’ again, but already holds it. It is not counted twice, so the fact was dropped.',
    })]);
    expect(attempt.warnings.find(warning => warning.code === 'plan_checked')?.message)
      .toBe('The checks dropped 1 fact that could not be true in the chapter\'s plan. Each is kept with the plan.');
    // The writer reads the plan as the checks left it, its cast as the record had them when the chapter began.
    const sent = calls.generate.mock.calls[1][0];
    expect(sent.chapterPlan.events.map(event => event.facts.length)).toEqual([2, 0, 1]);
    expect(sent.chapterPlan.cast[0]).toMatchObject({ name: 'Ye Chen', mainCharacter: true, inHand: ['Rusted Iron Sword'], carries: ['Spirit Pill ×3'], learning: ['Cloud Step'] });
    const prompt = buildHarnessGenerationPrompt(sent);
    expect(prompt.userPrompt).toContain('- MC: Ye Chen (main character) · look: A lean young man with dark hair.; build: lean; hair: dark · in hand: Rusted Iron Sword · carries: Spirit Pill ×3 · learning: Cloud Step');
    expect(prompt.userPrompt).toContain('3. Confrontation. MC tries to test the keeper. Outcome: success at a cost.\n   How: Ye Chen spars with Elder Qin and cuts his hand.\n   Pressure: Elder Qin, heavy.\n   Changes: Elder Qin is wounded (a cut hand).');
    // The speaker menu is MC, the plan's cast, someone else and none.
    expect(prompt.responseJsonSchema.properties.paragraphs.items.properties.speaker.enum).toEqual(['MC', 'Elder Qin', 'someone else', 'none']);

    // Committed: the record follows the plan as the checks left it, with nothing counted twice.
    const state = controller.snapshot();
    expect(state.codexEntries).toHaveLength(6);
    expect(state.chapters[1].planChecks).toEqual(attempt.chapterPlan!.checks);
    const holdings = holdingsOf(state, story.id);
    const main = holdings.characters[0];
    expect(main.things.map(thing => [thing.name, thing.count, thing.equipped])).toEqual([['Rusted Iron Sword', 1, true], ['Spirit Pill', 2, false]]);
    expect(main.abilities.map(ability => [ability.name, ability.stage, ability.usable])).toEqual([['Cloud Step', 'learned', true]]);
    expect(holdings.flags).toEqual([]);
  });

  it('takes the chapter\'s function from its plan, never the writer\'s reply, and places nothing from plain-prose recovery', () => {
    const raw = JSON.stringify({ ...JSON.parse(chapterOne()), chapterFunction: 'conflict', arcCompletion: { goalId: 'arc-1-armory', completed: true, evidence: 'The armory was cold.' } });
    const accepted = acceptHarnessModelResponse(raw, 1);
    if (!accepted.accepted) throw new Error(accepted.reason);
    expect(accepted.draft.rhythm).toEqual({ nextChapterSuggestions: { progression: 'Ye Chen trains.', worldBuilding: 'The armory\'s past.', conflict: 'A rival arrives.' } });
    expect(acceptHarnessModelResponse(raw, 1)).toEqual(accepted);
    const recovered = acceptHarnessModelResponse('He slept.\n\n[[gained: MC | Spirit Pill | 3]] He woke.', 1);
    expect(recovered.accepted && recovered.draft).toMatchObject({ responseMode: 'plain-prose-recovery', paragraphs: ['He slept.', 'He woke.'] });
  });
});
