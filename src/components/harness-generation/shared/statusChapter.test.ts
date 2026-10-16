import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  deriveStoryCodex,
  withoutLatestChapter,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationRequest,
  type HarnessGenerationResponse,
} from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';

/**
 * Status, end to end: the writer tags each change of state; the HARNESS saves
 * each on its sentence and gives every name the Codex entry the other tags
 * use; the next chapter's writer reads who is dead, wounded or sealed away in
 * Story Information's Status section; and the Codex shows each, with a check
 * when the dead speak.
 */

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-duel', text: 'Win the duel.', chapters: 30 }] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-16T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const response = (rawProviderResponse: string): HarnessGenerationResponse => ({ rawProviderResponse, providerReceipt: receipt });
const reply = (paragraphs: string[]) => JSON.stringify({
  title: 'The Duel', paragraphs,
  arcCompletion: { goalId: 'arc-1-duel', completed: false, evidence: '' },
  recap: 'Ye Chen wins the duel.', chapterFunction: 'progression',
  nextProgression: 'Ye Chen heals.', nextWorldBuilding: 'The sect mourns.', nextConflict: 'Revenge comes.',
});

const chapterOne = reply([
  '[[appears: MC | character]] Ye Chen faced the arena. [[appears: Zhao Wuchen | character]] Zhao Wuchen raised his spear.',
  '[[status: MC | wounded | a spear through the shoulder]] The spear bit deep. [[status: Zhao Wuchen | dead | his own spear turned on him]] Zhao fell and did not rise.',
  '[[status: Elder Mo | dead]] Word came that Elder Mo had died in the night.',
]);
const chapterTwo = reply([
  '[[@Zhao Wuchen]] "You will pay," said Zhao Wuchen.',
  '[[status: MC | recovered]] By dusk the shoulder had healed.',
]);

let ids = 0;
const runtime = { now: () => '2026-10-16T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` };

const setup = async () => {
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  for (const value of [chapterOne, chapterTwo]) generate.mockResolvedValueOnce(response(writtenChapterReply(value)));
  const controller = new HarnessGenerationController({
    repository: new InMemoryHarnessGenerationRepository(), runtime,
    modelAdapter: {
      getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
      generate,
      arcOperation: async () => response('{}'),
    },
  });
  await controller.hydrate();
  const story = await controller.createStory({
    premise: 'Ye Chen wins the sect duel.', destinedEnding: 'Ye Chen leads the sect.', initialArcPlan: GOAL,
    cast: [{ name: 'Ye Chen', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
  });
  return { controller, storyId: story.id, generate };
};

const codexOf = (controller: HarnessGenerationController) => {
  const state = controller.snapshot();
  return deriveStoryCodex({ entries: state.codexEntries, chapters: state.chapters, mainCharacterName: 'Ye Chen' });
};

describe('HARNESS status through status tags', () => {
  it('saves each change on its sentence with the entry the other tags use, and shows the next writer who is not as they were', async () => {
    const { controller, storyId, generate } = await setup();
    await controller.generateNextChapter(storyId, 'fixture');
    const first = generate.mock.calls[0][0] as HarnessGenerationRequest;
    // Every chapter is written with the Status skill, and the first is told no one has changed yet.
    expect(first.capaPrompt.skills.map(skill => skill.slot)).toContain('status');
    expect(buildHarnessGenerationPrompt(first).userPrompt).toContain('STATUS (every character and thing not as they were, by exact name, and since which chapter; the main character first)\nNo one is dead, wounded, sealed away or changed, and nothing is damaged or destroyed.');

    const state = controller.snapshot();
    const [chapter] = state.chapters;
    expect(chapter.paragraphs[1]).toBe('The spear bit deep. Zhao fell and did not rise.');
    const entryOf = (name: string) => state.codexEntries.find(found => found.name === name)!;
    expect(chapter.statusChanges!.map(change => [change.payload.subject.entryId, change.payload.state, change.payload.detail, change.anchor.selectedText])).toEqual([
      [entryOf('Ye Chen').id, 'wounded', 'a spear through the shoulder', 'The spear bit deep.'],
      [entryOf('Zhao Wuchen').id, 'dead', 'his own spear turned on him', 'Zhao fell and did not rise.'],
      [entryOf('Elder Mo').id, 'dead', undefined, 'Word came that Elder Mo had died in the night.'],
    ]);
    // Zhao, tagged by an appearance and a status, is one entry; Elder Mo, only reported dead, has his own.
    expect(state.codexEntries.map(found => found.name)).toEqual(['Ye Chen', 'Zhao Wuchen', 'Elder Mo']);

    await controller.generateNextChapter(storyId, 'fixture');
    const second = generate.mock.calls[1][0] as HarnessGenerationRequest;
    expect(buildHarnessGenerationPrompt(second).userPrompt).toContain([
      'STATUS (every character and thing not as they were, by exact name, and since which chapter; the main character first)',
      '- Ye Chen (main character): wounded (a spear through the shoulder) since Chapter 1',
      '- Elder Mo (character): dead since Chapter 1',
      '- Zhao Wuchen (character): dead (his own spear turned on him) since Chapter 1',
    ].join('\n'));
  });

  it('shows each in the Codex, and checks the dead who speak', async () => {
    const { controller, storyId } = await setup();
    await controller.generateNextChapter(storyId, 'fixture');
    await controller.generateNextChapter(storyId, 'fixture');
    const codex = codexOf(controller);
    const card = (name: string) => codex.characters.find(found => found.name === name)!;
    expect(card('Ye Chen').status).toMatchObject({ conditions: [], history: [{ state: 'wounded' }, { state: 'recovered' }] });
    expect(card('Zhao Wuchen').status!.conditions).toEqual([{ state: 'dead', detail: 'his own spear turned on him', passage: { chapterNumber: 1, blockId: 'c1-p2', text: 'Zhao fell and did not rise.' } }]);
    // Met only by the news of his death.
    expect(card('Elder Mo')).toMatchObject({ firstSeen: { chapterNumber: 1 }, status: { conditions: [{ state: 'dead' }] } });
    expect(codex.checks.map(check => [check.kind, check.chapterNumber])).toContainEqual(['after-death', 2]);
  });

  it('takes back the entries a rewritten chapter\'s status changes made, and keeps a chapter written with the skill marked so in Create mode', async () => {
    const { controller, storyId } = await setup();
    await controller.generateNextChapter(storyId, 'fixture');
    // Elder Mo came in with the chapter's status change alone.
    expect(withoutLatestChapter(controller.snapshot(), storyId).codexEntries.map(found => found.name)).not.toContain('Elder Mo');

    const [chapter] = controller.snapshot().chapters;
    await controller.authorChapter(chapter.id, { paragraphs: chapter.paragraphs });
    expect(controller.snapshot().chapters[0].statusChanges).toEqual([]);
  });
});
