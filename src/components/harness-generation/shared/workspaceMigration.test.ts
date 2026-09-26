import { describe, expect, it } from 'vitest';
import { HARNESS_GENERATION_SCHEMA_VERSION, HarnessGenerationController, createEmptyHarnessWorkspaceState, migrateHarnessWorkspaceState, readHarnessWorkspaceState, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';

const reply = (body: unknown) => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } });
const modelAdapter: HarnessGenerationModelAdapter = {
  getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
  generate: async () => reply({ paragraphs: ['The courier reached the gate.'] }),
  arcOperation: async () => reply({ plan: { arcNumber: 2, goals: [{ id: 'arc-2-x', text: 'Next.', chapters: 100 }] }, destinedEnding: 'Unused.' }),
};
const plan = { arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Reach the gate.', chapters: 100 }] };

/** A workspace as schema 18 saved it: real stories, chapters and plans, none of the new fields. */
const savedAtVersion18 = async () => {
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter });
  await controller.hydrate();
  const survival = await controller.createStory({ premise: 'A courier survives the pass.', destinedEnding: 'The pass opens.', initialArcPlan: plan,
    fateSurvival: { enabled: true } });
  const regular = await controller.createStory({ premise: 'A courier carries letters.', destinedEnding: 'Every letter arrives.', initialArcPlan: plan });
  const state = controller.snapshot();
  // Chapters written before this version, in both stories.
  for (const story of [survival, regular]) {
    state.chapters.push({ id: `ch-${story.id}`, storyId: story.id, attemptId: 'a', foundationRevisionId: story.activeFoundationRevisionId,
      storyInformationPacketId: 'p', chapterNumber: 1, title: 'One', titleSource: 'model', prose: 'The courier set out.', paragraphs: ['The courier set out.'],
      metrics: { wordCount: 4, paragraphCount: 1, meetsScaleTarget: false }, mediaLoadout: { resolvedAt: 'now', packs: [], catalogs: [] } as never,
      eventIds: [], responseMode: 'json', createdAt: '2026-09-20T00:00:00Z', committedAt: '2026-09-20T00:00:01Z' });
    state.stories.find(item => item.id === story.id)!.head = { nextChapterNumber: 2, lastCommittedChapterId: `ch-${story.id}`, lastCommittedAt: '2026-09-20T00:00:01Z' };
  }
  const stored = JSON.parse(JSON.stringify({ ...state, schemaVersion: 18 })) as Record<string, unknown>;
  for (const story of stored.stories as Array<Record<string, unknown>>) { delete story.visibility; delete story.arcGoalReviews; }
  // Shapes versions 18 and 19 stored: Survival with its retired visibility and
  // mystery proposals, and persistent steering (one given since the last commit).
  const survivalFoundation = (stored.foundations as Array<{ storyId: string; input: Record<string, unknown> }>).find(entry => entry.storyId === survival.id)!;
  survivalFoundation.input.fateSurvival = { enabled: true, visibility: 'partial', majorMysteries: ['Who drowned the pass?'], unresolvedPlotThreads: ['The debt'] };
  (stored.stories as Array<Record<string, unknown>>).find(story => story.id === regular.id)!.steering = [
    { id: 'hsteer-old', direction: 'Keep every letter sealed.', mode: 'future', effectiveChapter: 1, createdAt: '2026-09-19T00:00:00Z' },
    { id: 'hsteer-new', direction: 'Deliver the red letter first.', mode: 'future', effectiveChapter: 2, createdAt: '2026-09-20T00:00:02Z' },
  ];
  return { stored, survivalId: survival.id, regularId: regular.id };
};

describe('HARNESS workspace migration', () => {
  it('upgrades a schema 18 workspace in place, keeping every story, chapter and plan', async () => {
    const { stored, survivalId, regularId } = await savedAtVersion18();
    const migrated = readHarnessWorkspaceState(stored);
    expect(HARNESS_GENERATION_SCHEMA_VERSION).toBe(21);
    expect(migrated.schemaVersion).toBe(21);
    expect(migrated.stories.map(story => story.id)).toEqual([survivalId, regularId]);
    expect(migrated.chapters).toEqual(stored.chapters);
    // Survival keeps only its switch; everything else in each Foundation is kept.
    expect(migrated.foundations.map(foundation => foundation.input.fateSurvival)).toEqual([{ enabled: true }, undefined]);
    expect(migrated.foundations.map(foundation => ({ ...foundation, input: { ...foundation.input, fateSurvival: undefined } })))
      .toEqual((stored.foundations as typeof migrated.foundations).map(foundation => ({ ...foundation, input: { ...foundation.input, fateSurvival: undefined } })));
    // Persistent steering: the direction given since the last commit directs the next chapter only; all of it stays on record.
    expect(migrated.stories[1].nextChapterDirection).toEqual({ id: 'hsteer-new', forChapter: 2, choice: { kind: 'reader', text: 'Deliver the red letter first.' }, chosenAt: '2026-09-20T00:00:02Z' });
    expect(migrated.stories[1].earlierSteering?.map(entry => entry.direction)).toEqual(['Keep every letter sealed.', 'Deliver the red letter first.']);
    expect(migrated.stories[1]).not.toHaveProperty('steering');
    expect(migrated.stories.map(story => story.arcPlans)).toEqual((stored.stories as Array<{ arcPlans: unknown }>).map(story => story.arcPlans));
    // A Survival arc that already began is locked; a Regular story gains nothing.
    expect(migrated.stories[0].arcGoalReviews).toEqual([{ arcNumber: 1, source: 'migration', lockedAt: '2026-09-20T00:00:01Z' }]);
    expect(migrated.stories[1]).not.toHaveProperty('arcGoalReviews');
    expect(migrated.stories[1].visibility).toBeUndefined();

    // The upgraded stories keep generating.
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(migrated), modelAdapter });
    await controller.hydrate();
    await controller.generateNextChapter(regularId, 'fixture');
    // Fate Survival writes a chapter only with the reader's direction.
    await expect(controller.generateNextChapter(survivalId, 'fixture')).rejects.toThrow("choose Chapter 2's direction");
    await controller.chooseChapterDirection(survivalId, { kind: 'reader', text: 'Cross the pass at night.' });
    await controller.generateNextChapter(survivalId, 'fixture');
    expect(controller.snapshot().chapters.filter(chapter => chapter.chapterNumber === 2)).toHaveLength(2);
    const regularChapter = controller.snapshot().chapters.find(chapter => chapter.storyId === regularId && chapter.chapterNumber === 2)!;
    expect(regularChapter.path).toMatchObject({ kind: 'reader', directionId: 'hsteer-new', text: 'Deliver the red letter first.' });
    expect(controller.snapshot().stories.every(story => !story.nextChapterDirection)).toBe(true);
  });

  it('never upgrades an unreadable shape or a version without a migration step', () => {
    expect(migrateHarnessWorkspaceState({ schemaVersion: 18, stories: [] })).toBeUndefined();
    expect(migrateHarnessWorkspaceState({ ...createEmptyHarnessWorkspaceState(), schemaVersion: 17 })).toBeUndefined();
    expect(readHarnessWorkspaceState({ ...createEmptyHarnessWorkspaceState(), schemaVersion: 17 })).toEqual(createEmptyHarnessWorkspaceState());
  });
});
