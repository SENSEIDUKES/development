import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  deriveHoldings,
  exportHarnessStory,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationResponse,
  type HarnessWorkspaceState,
} from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { acceptHarnessModelResponse } from './responseAcceptance';

/**
 * Holdings, end to end, in the tiny SEN language: the writer tags every change
 * where it happens; the HARNESS strips every tag, saves each change on the
 * sentence it points at, gives every name a Codex entry when the chapter
 * commits, and shows the next chapter what each character has now.
 */

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-armory', text: 'Survive the armory trial.', chapters: 100 }] };
const response = (rawProviderResponse: string): HarnessGenerationResponse => ({
  rawProviderResponse,
  providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-03T12:00:00.000Z', usage: { source: 'unavailable' } },
});
const adapter = (...replies: string[]) => {
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  for (const reply of replies) generate.mockResolvedValueOnce(response(reply));
  const value: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
    generate,
    arcOperation: async () => response(JSON.stringify({ plan: GOAL, destinedEnding: 'Ye Chen masters the armory.' })),
  };
  return { value, generate };
};
const reply = (paragraphs: string[], extra: Record<string, unknown> = {}) => JSON.stringify({
  title: 'The Armory',
  paragraphs,
  arcCompletion: { goalId: 'arc-1-armory', completed: false, evidence: '' },
  recap: '[[gained: MC | Rusted Iron Sword]] Ye Chen took a sword.',
  chapterFunction: 'progression',
  nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The armory\'s past.', nextConflict: 'A rival arrives.',
  ...extra,
});

const chapterOne = () => reply([
  'The armory was cold.',
  '[[gained: MC | Rusted Iron Sword]] Ye Chen lifted the old blade from the rack. [[equipped: MC | Rusted Iron Sword]] He tested its weight.',
  '[[gained: Elder Qin | Jade Gourd]]',
  'Elder Qin raised a jade gourd and drank.',
  '[[learning: MC | Cloud Step]] Ye Chen began to practise the footwork. [[obtainedd: MC | Ghost]]',
  'He slept. [[gained: MC | Spirit Pill | 3]]',
], { mainCharacterHoldings: ['Rusted Iron Sword', 'Cloud Step', 'Spirit Pill ×3', 'Silver Bell'] });

const chapterTwo = () => reply([
  '[[lost: MC | Spirit Pill | 1 | used up]] Ye Chen swallowed a pill. [[learned: MC | Cloud Step]] His feet found the rhythm at last.',
  '[[gained: MC | Rusted Iron Sword]] He picked up the rusted sword again.',
], { mainCharacterHoldings: ['Rusted Iron Sword', 'Cloud Step', 'Spirit Pill'] });

let ids = 0;
const runtime = { now: () => '2026-10-03T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` };

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
  mainCharacterName: 'Ye Chen',
});

describe('HARNESS holdings through change tags', () => {
  it('saves every change on its sentence, gives every name a Codex entry, strips every tag, and survives reload', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const controller = new HarnessGenerationController({ repository, modelAdapter: adapter(chapterOne()).value, runtime });
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'fixture');

    const state = controller.snapshot();
    const chapter = state.chapters[0];
    expect(JSON.stringify(state.chapters)).not.toContain('[[');
    expect(chapter.recap?.text).toBe('Ye Chen took a sword.');
    // A tag alone in its paragraph moved to the next one; that empty paragraph is gone.
    expect(chapter.paragraphs).toEqual([
      'The armory was cold.',
      'Ye Chen lifted the old blade from the rack. He tested its weight.',
      'Elder Qin raised a jade gourd and drank.',
      'Ye Chen began to practise the footwork.',
      'He slept.',
    ]);
    const entryName = (id?: string) => state.codexEntries.find(entry => entry.id === id)?.name;
    expect(chapter.holdingChanges?.map(change => [change.anchor.blockId, change.anchor.selectedText, change.payload.verb, entryName(change.payload.holder.entryId), entryName(change.payload.target?.entryId), change.payload.count])).toEqual([
      ['c1-p2', 'Ye Chen lifted the old blade from the rack.', 'gained', 'Ye Chen', 'Rusted Iron Sword', undefined],
      ['c1-p2', 'He tested its weight.', 'equipped', 'Ye Chen', 'Rusted Iron Sword', undefined],
      ['c1-p3', 'Elder Qin raised a jade gourd and drank.', 'gained', 'Elder Qin', 'Jade Gourd', undefined],
      ['c1-p4', 'Ye Chen began to practise the footwork.', 'learning', 'Ye Chen', 'Cloud Step', undefined],
      ['c1-p5', 'He slept.', 'gained', 'Ye Chen', 'Spirit Pill', 3],
    ]);
    expect(chapter.closingHoldings).toEqual(['Rusted Iron Sword', 'Cloud Step', 'Spirit Pill ×3', 'Silver Bell']);
    expect(state.codexEntries.map(entry => [entry.kind, entry.name, entry.mainCharacter ?? false, entry.origin.source])).toEqual([
      ['character', 'Ye Chen', true, 'foundation'], ['thing', 'Rusted Iron Sword', false, 'tag'], ['character', 'Elder Qin', false, 'foundation'],
      ['thing', 'Jade Gourd', false, 'tag'], ['ability', 'Cloud Step', false, 'tag'], ['thing', 'Spirit Pill', false, 'tag'],
    ]);
    expect(state.codexEntries.every(entry => entry.id.startsWith('hcx-') && entry.storyId === story.id)).toBe(true);
    expect(state.attempts[0].warnings.filter(warning => warning.code === 'holding_tags_incomplete').map(warning => warning.message))
      .toEqual(['1 tag was unreadable and removed.']);

    const holdings = holdingsOf(state, story.id);
    expect(holdings.characters.map(character => [character.name, character.things.map(thing => [thing.name, thing.count, thing.equipped]), character.abilities.map(ability => [ability.name, ability.stage])])).toEqual([
      ['Ye Chen', [['Rusted Iron Sword', 1, true], ['Spirit Pill', 3, false]], [['Cloud Step', 'learning']]],
      ['Elder Qin', [['Jade Gourd', 1, false]], []],
    ]);
    expect(holdings.flags.map(flag => flag.message)).toEqual(['Chapter 1: the writer\'s closing list for Ye Chen includes ‘Silver Bell’, which no tag recorded.']);

    const reloaded = new HarnessGenerationController({ repository, modelAdapter: adapter().value, runtime });
    await reloaded.hydrate();
    expect(reloaded.snapshot().chapters[0].holdingChanges).toEqual(chapter.holdingChanges);
    expect(reloaded.snapshot().codexEntries).toEqual(state.codexEntries);
    expect(exportHarnessStory(reloaded.snapshot(), story.id).codexEntries).toEqual(state.codexEntries);
  });

  it('shows the next chapter what everyone has, reuses entries by exact name, and checks every change', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const writer = adapter(chapterOne(), chapterTwo());
    const controller = new HarnessGenerationController({ repository, modelAdapter: writer.value, runtime });
    const story = await createStory(controller);
    // Before anything is recorded, the main character still travels.
    await controller.generateNextChapter(story.id, 'fixture');
    expect(controller.snapshot().attempts[0].storyInformation.holdings).toEqual({ characters: [{ name: 'Ye Chen', mainCharacter: true }] });

    await controller.generateNextChapter(story.id, 'fixture');
    const state = controller.snapshot();
    expect(state.attempts[1].storyInformation.holdings).toEqual({
      characters: [
        { name: 'Ye Chen', mainCharacter: true, inHand: ['Rusted Iron Sword'], carries: ['Spirit Pill ×3'], learning: ['Cloud Step'] },
        { name: 'Elder Qin', carries: ['Jade Gourd'] },
      ],
    });
    expect(state.attempts[1].storyInformation.diagnostics.sections.find(section => section.section === 'holdings')).toMatchObject({ protected: true, overBudget: false });
    // Chapter 2 named nothing new.
    expect(state.codexEntries).toHaveLength(6);
    // What the writer actually receives: the Holdings skill, the section, and the closing list it must return.
    const prompt = buildHarnessGenerationPrompt(writer.generate.mock.calls[1][0]);
    expect(prompt.systemInstruction).toContain('CAPA SKILL [Holdings] — SEN Holdings v1.0.0');
    expect(prompt.userPrompt).toContain('HOLDINGS (what each character has now, by exact name; the main character first)\nYe Chen (main character)\n- in hand: Rusted Iron Sword\n- carries: Spirit Pill ×3\n- learning: Cloud Step\n\nElder Qin\n- carries: Jade Gourd');
    expect(prompt.responseJsonSchema.required).toContain('mainCharacterHoldings');

    const holdings = holdingsOf(state, story.id);
    const main = holdings.characters[0];
    expect(main.things.map(thing => [thing.name, thing.count, thing.equipped])).toEqual([['Rusted Iron Sword', 1, true], ['Spirit Pill', 2, false]]);
    expect(main.abilities.map(ability => [ability.name, ability.stage, ability.usable])).toEqual([['Cloud Step', 'learned', true]]);
    expect(holdings.flags.map(flag => [flag.kind, flag.chapterNumber])).toEqual([
      ['closing-untagged', 1],
      // The sword picked up again in chapter 2 is the one already held: flagged, never counted twice.
      ['already-held', 2],
    ]);
  });

  it('places the same changes on every re-acceptance, and none from plain-prose recovery', () => {
    const raw = chapterOne();
    expect(acceptHarnessModelResponse(raw, 1)).toEqual(acceptHarnessModelResponse(raw, 1));
    const recovered = acceptHarnessModelResponse('He slept.\n\n[[gained: MC | Spirit Pill | 3]] He woke.', 1);
    expect(recovered.accepted && recovered.draft).toMatchObject({ responseMode: 'plain-prose-recovery', paragraphs: ['He slept.', 'He woke.'] });
    expect(recovered.accepted && recovered.draft.holdingChanges).toBeUndefined();
  });

  it('flags a missing or malformed closing list only when the writer was asked for one', () => {
    const plain = reply(['He slept.']);
    const accepted = acceptHarnessModelResponse(plain, 1, {});
    expect(accepted.accepted && accepted.warnings.map(warning => warning.code)).not.toContain('holding_tags_incomplete');
    const expected = acceptHarnessModelResponse(plain, 1, { holdingsExpected: true });
    expect(expected.accepted && expected.warnings.find(warning => warning.code === 'holding_tags_incomplete')?.message)
      .toBe('The writer returned no closing list of the main character\'s holdings, so this chapter is not checked against one.');
    const malformed = acceptHarnessModelResponse(reply(['He slept.'], { mainCharacterHoldings: 'Rusted Iron Sword' }), 1, {});
    expect(malformed.accepted && malformed.warnings.find(warning => warning.code === 'holding_tags_incomplete')?.message)
      .toBe('The closing list of the main character\'s holdings was not a list and was set aside.');
    // An empty list is an answer: the main character holds nothing.
    const empty = acceptHarnessModelResponse(reply(['He slept.'], { mainCharacterHoldings: [] }), 1, { holdingsExpected: true });
    expect(empty.accepted && empty.draft.closingHoldings).toEqual([]);
  });
});
