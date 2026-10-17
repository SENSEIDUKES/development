import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  appearancesSection,
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

  it('asks no model after a chapter: it keeps the writer\'s own description by code and shows the next writer it, and every change since', async () => {
    const { controller, storyId, generate, looks } = await setup();
    await controller.generateNextChapter(storyId, 'fixture');
    // SENSEI, 2026-10-17: no look step after a chapter.
    expect(looks).not.toHaveBeenCalled();
    expect(controller.snapshot().chapters[0].looks).toBeUndefined();

    await controller.generateNextChapter(storyId, 'fixture');
    expect(looks).not.toHaveBeenCalled();
    const request = generate.mock.calls[1][0] as HarnessGenerationRequest;
    expect(request.storyInformation.appearances).toEqual({ entries: [
      { name: 'Ye Chen', entity: 'character', mainCharacter: true, look: 'Ye Chen stepped into the cold armory. Ash streaked his black hair.' },
      { name: 'Old Wu', entity: 'character', look: 'A stooped smith waited by the forge, his forearms scarred by sparks. "Take one," the smith said.' },
      { name: 'Rusted Iron Sword', entity: 'thing', look: 'Ye Chen lifted an old blade, rust along its edge.' },
    ] });
    const state = controller.snapshot();
    const appeared = deriveAppearances({ entries: state.codexEntries, chapters: state.chapters });
    expect(appeared.flags).toEqual([]);
    expect(appearancesSection(appeared).entries[0].look).toBe('Ye Chen stepped into the cold armory. Ash streaked his black hair. · since then: a burn across his palm');
    expect(appeared.subjects[0].changes[0].passage.description).toBe('The hilt seared a red line across his palm.');
  });

  it('writes a look only when something asks for it, from every passage of that one entry, keeps it, and writes it again only after a tag changes it', async () => {
    const { controller, storyId, generate, looks } = await setup();
    await controller.generateNextChapter(storyId, 'fixture');
    const yeChen = controller.snapshot().codexEntries.find(entry => entry.name === 'Ye Chen')!;
    expect(await controller.describeCodexLook(storyId, yeChen.id)).toEqual({ summary: 'How Ye Chen looks in Chapter 1.', traits: { build: 'lean' } });
    expect(looks).toHaveBeenCalledTimes(1);
    const [asked] = looks.mock.calls[0][0].subjects;
    expect(looks.mock.calls[0][0]).toMatchObject({ operation: 'describe-looks', chapterNumber: 1, model: 'fixture', language: 'en' });
    expect(asked).toMatchObject({ id: yeChen.id, name: 'Ye Chen', entity: 'character', declared: 'Age: 18 Appearance: lean, black hair, hazel eyes.' });
    expect(asked.passage).toBe('Chapter 1, first on the page: Ye Chen stepped into the cold armory. Ash streaked his black hair.');
    // Kept on the entry: asked again, it answers with no call.
    expect(controller.snapshot().codexEntries.find(entry => entry.id === yeChen.id)!.look).toMatchObject({ summary: 'How Ye Chen looks in Chapter 1.', model: 'fixture' });
    await controller.describeCodexLook(storyId, yeChen.id);
    expect(looks).toHaveBeenCalledTimes(1);

    // A look tag in the next chapter: the next writer reads the kept look and the change since; the look is stale.
    await controller.generateNextChapter(storyId, 'fixture');
    const stale = deriveAppearances({ entries: controller.snapshot().codexEntries, chapters: controller.snapshot().chapters });
    expect(stale.subjects[0].lookStale).toBe(true);
    expect(appearancesSection(stale).entries[0].look).toBe('How Ye Chen looks in Chapter 1. · since then: a burn across his palm');
    expect(await controller.describeCodexLook(storyId, yeChen.id)).toEqual({ summary: 'How Ye Chen looks in Chapter 2.', traits: { build: 'lean' } });
    expect(looks).toHaveBeenCalledTimes(2);
    expect(looks.mock.calls[1][0].subjects[0].passage).toBe([
      'Chapter 1, first on the page: Ye Chen stepped into the cold armory. Ash streaked his black hair.',
      'Chapter 2, look changed (a burn across his palm): The hilt seared a red line across his palm.',
    ].join('\n'));
    const state = controller.snapshot();
    const appeared = deriveAppearances({ entries: state.codexEntries, chapters: state.chapters });
    expect(appeared.subjects[0]).toMatchObject({ look: { summary: 'How Ye Chen looks in Chapter 2.' } });
    expect(appeared.subjects[0].lookStale).toBeUndefined();
    // The export carries every kept look.
    expect(JSON.stringify(exportHarnessStory(state, storyId))).toContain('How Ye Chen looks in Chapter 2.');
  });

  it('keeps a failed look with the model\'s own answer, and rejects with a reason', async () => {
    const failing = await setup({ describeLooks: async () => { throw new Error('The model was busy.'); } });
    await failing.controller.generateNextChapter(failing.storyId, 'fixture');
    const wu = failing.controller.snapshot().codexEntries.find(entry => entry.name === 'Old Wu')!;
    await expect(failing.controller.describeCodexLook(failing.storyId, wu.id)).rejects.toThrow('The model was busy.');
    expect(failing.controller.snapshot().codexEntries.find(entry => entry.id === wu.id)!.lookFailure).toEqual({ at: runtime.now(), model: 'fixture', problem: 'The model was busy.' });

    const unreadable = await setup({ describeLooks: async () => response('not json') });
    await unreadable.controller.generateNextChapter(unreadable.storyId, 'fixture');
    const sword = unreadable.controller.snapshot().codexEntries.find(entry => entry.name === 'Rusted Iron Sword')!;
    await expect(unreadable.controller.describeCodexLook(unreadable.storyId, sword.id)).rejects.toThrow('The answer held no look that could be read.');
    expect(unreadable.controller.snapshot().codexEntries.find(entry => entry.id === sword.id)!.lookFailure).toMatchObject({ raw: 'not json' });

    const without = await setup({ describeLooks: null });
    await without.controller.generateNextChapter(without.storyId, 'fixture');
    const entry = without.controller.snapshot().codexEntries[0];
    await expect(without.controller.describeCodexLook(without.storyId, entry.id)).rejects.toThrow('This host cannot write a look yet.');
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
