import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  deriveAppearances,
  exportHarnessStory,
  withoutLatestChapter,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationRequest,
  type HarnessGenerationResponse,
  type HarnessLookRequest,
} from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';

/**
 * Appearances, end to end: the writer tags who and what first steps onto the
 * page and each change to a look; the HARNESS saves each on its sentence and
 * gives every name the Codex entry holdings use; the look step writes each
 * look down from its passage; and the next chapter's writer reads who has
 * appeared, with their looks, in Story Information's Appeared section.
 */

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-armory', text: 'Survive the armory trial.', chapters: 30 }] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-14T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const response = (rawProviderResponse: string): HarnessGenerationResponse => ({ rawProviderResponse, providerReceipt: receipt });
const reply = (paragraphs: string[]) => JSON.stringify({
  title: 'The Armory', paragraphs,
  arcCompletion: { goalId: 'arc-1-armory', completed: false, evidence: '' },
  recap: 'Ye Chen meets the smith.', chapterFunction: 'progression',
  nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The armory\'s past.', nextConflict: 'A rival arrives.',
});

const chapterOne = reply([
  '[[appears: MC | character]] Ye Chen stepped into the cold armory. Ash streaked his black hair.',
  '[[appears: Old Wu | character]] A stooped smith waited by the forge, his forearms scarred by sparks. [[@Old Wu]] "Take one," the smith said.',
  '[[appears: Rusted Iron Sword | thing]] [[gained: MC | Rusted Iron Sword]] Ye Chen lifted an old blade, rust along its edge.',
]);
const chapterTwo = reply([
  '[[look: MC | a burn across his palm]] The hilt seared a red line across his palm.',
  '[[@Old Wu]] "Again," said Old Wu.',
]);

/** The look step answers each subject with a look named after it. */
const lookReply = (request: HarnessLookRequest) => JSON.stringify({
  looks: request.subjects.map(subject => ({ id: subject.id, summary: `How ${subject.name} looks in Chapter ${request.chapterNumber}.`, traits: subject.entity === 'thing' ? { material: 'iron' } : { build: 'lean' } })),
});

let ids = 0;
const runtime = { now: () => '2026-10-14T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` };

const setup = async ({ describeLooks }: { describeLooks?: HarnessGenerationModelAdapter['describeLooks'] | null } = {}) => {
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  for (const value of [chapterOne, chapterTwo]) generate.mockResolvedValueOnce(response(writtenChapterReply(value)));
  const looks = vi.fn(describeLooks ?? (async (request: HarnessLookRequest) => response(lookReply(request))));
  const controller = new HarnessGenerationController({
    repository: new InMemoryHarnessGenerationRepository(), runtime,
    modelAdapter: {
      getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
      generate,
      arcOperation: async () => response('{}'),
      ...(describeLooks === null ? {} : { describeLooks: looks }),
    },
  });
  await controller.hydrate();
  const story = await controller.createStory({
    premise: 'Ye Chen survives the armory trial.', destinedEnding: 'Ye Chen masters the armory.', initialArcPlan: GOAL,
    cast: [{ name: 'Ye Chen', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
    identities: [{ name: 'Ye Chen', kind: 'character', evidence: 'Age: 18 Appearance: lean, black hair, hazel eyes.' }],
  });
  return { controller, storyId: story.id, generate, looks };
};

describe('HARNESS appearances through appears and look tags', () => {
  it('saves each appearance on its sentence with the entry holdings use, and makes every name one entry', async () => {
    const { controller, storyId, generate } = await setup();
    await controller.generateNextChapter(storyId, 'fixture');
    const request = generate.mock.calls[0][0] as HarnessGenerationRequest;
    // Every chapter is written with the Appearance skill, and the first is told nobody has appeared yet.
    expect(request.capaPrompt.skills.map(skill => skill.slot)).toContain('appearance');
    expect(buildHarnessGenerationPrompt(request).userPrompt).toContain('APPEARED (every character and thing already on the page, by exact name, with its look; the main character first)\nNobody and nothing has appeared yet.');

    const state = controller.snapshot();
    const [chapter] = state.chapters;
    expect(chapter.paragraphs[0]).toBe('Ye Chen stepped into the cold armory. Ash streaked his black hair.');
    const entryOf = (name: string) => state.codexEntries.find(entry => entry.name === name)!;
    expect(chapter.appearances!.map(found => [found.payload.event, found.payload.subject, found.payload.entity, found.anchor.selectedText])).toEqual([
      ['appears', { name: 'MC', entryId: entryOf('Ye Chen').id }, 'character', 'Ye Chen stepped into the cold armory.'],
      ['appears', { name: 'Old Wu', entryId: entryOf('Old Wu').id }, 'character', 'A stooped smith waited by the forge, his forearms scarred by sparks.'],
      ['appears', { name: 'Rusted Iron Sword', entryId: entryOf('Rusted Iron Sword').id }, 'thing', 'Ye Chen lifted an old blade, rust along its edge.'],
    ]);
    // The sword its appearance and its holding change both name is one entry.
    expect(state.codexEntries.map(entry => [entry.kind, entry.name])).toEqual([['character', 'Ye Chen'], ['character', 'Old Wu'], ['thing', 'Rusted Iron Sword']]);
    expect(chapter.holdingChanges![0].payload.target!.entryId).toBe(entryOf('Rusted Iron Sword').id);
  });

  it('writes each look down after the chapter is saved, from its passage, and shows the next writer every look', async () => {
    const { controller, storyId, generate, looks } = await setup();
    await controller.generateNextChapter(storyId, 'fixture');
    expect(looks).toHaveBeenCalledTimes(1);
    const asked = looks.mock.calls[0][0];
    expect(asked).toMatchObject({ operation: 'describe-looks', chapterNumber: 1, model: 'fixture', language: 'en' });
    expect(asked.subjects.map(subject => [subject.name, subject.entity, subject.event])).toEqual([
      ['Ye Chen', 'character', 'appears'], ['Old Wu', 'character', 'appears'], ['Rusted Iron Sword', 'thing', 'appears'],
    ]);
    // The passage runs from the tagged sentence on; a declared character carries the author's notes.
    expect(asked.subjects[0].passage.startsWith('Ye Chen stepped into the cold armory. Ash streaked his black hair.')).toBe(true);
    expect(asked.subjects[0].declared).toBe('Age: 18 Appearance: lean, black hair, hazel eyes.');
    expect(asked.subjects[1].declared).toBeUndefined();
    const [first] = controller.snapshot().chapters;
    expect(first.looks).toMatchObject({ status: 'described', model: 'fixture' });
    expect(first.looks!.looks.map(look => [look.summary, look.traits])).toEqual([
      ['How Ye Chen looks in Chapter 1.', { build: 'lean' }], ['How Old Wu looks in Chapter 1.', { build: 'lean' }], ['How Rusted Iron Sword looks in Chapter 1.', { material: 'iron' }],
    ]);

    await controller.generateNextChapter(storyId, 'fixture');
    const request = generate.mock.calls[1][0] as HarnessGenerationRequest;
    expect(request.storyInformation.appearances).toEqual({ entries: [
      { name: 'Ye Chen', entity: 'character', mainCharacter: true, look: 'How Ye Chen looks in Chapter 1.' },
      { name: 'Old Wu', entity: 'character', look: 'How Old Wu looks in Chapter 1.' },
      { name: 'Rusted Iron Sword', entity: 'thing', look: 'How Rusted Iron Sword looks in Chapter 1.' },
    ] });
    expect(buildHarnessGenerationPrompt(request).userPrompt).toContain([
      'APPEARED (every character and thing already on the page, by exact name, with its look; the main character first)',
      '- Ye Chen (main character): How Ye Chen looks in Chapter 1.',
      '- Old Wu (character): How Old Wu looks in Chapter 1.',
      '- Rusted Iron Sword (thing): How Rusted Iron Sword looks in Chapter 1.',
    ].join('\n'));
    // A change of look is described from the look before it.
    const change = looks.mock.calls[1][0].subjects[0];
    expect(change).toMatchObject({ name: 'Ye Chen', event: 'look', change: 'a burn across his palm', previous: { summary: 'How Ye Chen looks in Chapter 1.', traits: { build: 'lean' } } });
    const state = controller.snapshot();
    const appeared = deriveAppearances({ entries: state.codexEntries, chapters: state.chapters });
    expect(appeared.flags).toEqual([]);
    expect(appeared.subjects[0].look!.summary).toBe('How Ye Chen looks in Chapter 2.');
    // The export carries every appearance and look, so a test shows what was read and written.
    const exported = JSON.stringify(exportHarnessStory(state, storyId));
    expect(exported).toContain('"event":"look"');
    expect(exported).toContain('How Ye Chen looks in Chapter 2.');
  });

  it('records a look step that failed and keeps the chapter, and never asks without a look step or appearances', async () => {
    const failing = await setup({ describeLooks: async () => { throw new Error('The model was busy.'); } });
    await failing.controller.generateNextChapter(failing.storyId, 'fixture');
    const [chapter] = failing.controller.snapshot().chapters;
    expect(chapter.looks).toEqual({ status: 'failed', at: runtime.now(), model: 'fixture', looks: [], problem: 'The model was busy.' });
    expect(chapter.appearances).toHaveLength(3);

    const unreadable = await setup({ describeLooks: async () => response('not json') });
    await unreadable.controller.generateNextChapter(unreadable.storyId, 'fixture');
    expect(unreadable.controller.snapshot().chapters[0].looks).toMatchObject({ status: 'failed', problem: 'The answer held no look that could be read.' });

    const without = await setup({ describeLooks: null });
    await without.controller.generateNextChapter(without.storyId, 'fixture');
    expect(without.controller.snapshot().chapters[0].looks).toBeUndefined();
  });

  it('takes back the entries a rewritten chapter\'s appearances made, and keeps a chapter written with the skill marked so in Create mode', async () => {
    const { controller, storyId } = await setup();
    await controller.generateNextChapter(storyId, 'fixture');
    const before = withoutLatestChapter(controller.snapshot(), storyId);
    // Old Wu came in with the chapter's appearance alone; Ye Chen is declared, and comes back with the next first appearance.
    expect(before.codexEntries.map(entry => entry.name)).toEqual([]);

    const [chapter] = controller.snapshot().chapters;
    await controller.authorChapter(chapter.id, { paragraphs: chapter.paragraphs });
    expect(controller.snapshot().chapters[0].appearances).toEqual([]);
  });
});
