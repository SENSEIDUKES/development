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
    fateSurvival: { enabled: true, visibility: 'partial', majorMysteries: [], unresolvedPlotThreads: [] } });
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
  return { stored, survivalId: survival.id, regularId: regular.id };
};

describe('HARNESS workspace migration', () => {
  it('upgrades a schema 18 workspace in place, keeping every story, chapter and plan', async () => {
    const { stored, survivalId, regularId } = await savedAtVersion18();
    const migrated = readHarnessWorkspaceState(stored);
    expect(HARNESS_GENERATION_SCHEMA_VERSION).toBe(19);
    expect(migrated.schemaVersion).toBe(19);
    expect(migrated.stories.map(story => story.id)).toEqual([survivalId, regularId]);
    expect(migrated.chapters).toEqual(stored.chapters);
    expect(migrated.foundations).toEqual(stored.foundations);
    expect(migrated.stories.map(story => story.arcPlans)).toEqual((stored.stories as Array<{ arcPlans: unknown }>).map(story => story.arcPlans));
    // A Survival arc that already began is locked; a Regular story gains nothing.
    expect(migrated.stories[0].arcGoalReviews).toEqual([{ arcNumber: 1, source: 'migration', lockedAt: '2026-09-20T00:00:01Z' }]);
    expect(migrated.stories[1]).not.toHaveProperty('arcGoalReviews');
    expect(migrated.stories[1].visibility).toBeUndefined();

    // The upgraded stories keep generating.
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(migrated), modelAdapter });
    await controller.hydrate();
    await controller.generateNextChapter(regularId, 'fixture');
    await controller.generateNextChapter(survivalId, 'fixture');
    expect(controller.snapshot().chapters.filter(chapter => chapter.chapterNumber === 2)).toHaveLength(2);
  });

  it('never upgrades an unreadable shape or a version without a migration step', () => {
    expect(migrateHarnessWorkspaceState({ schemaVersion: 18, stories: [] })).toBeUndefined();
    expect(migrateHarnessWorkspaceState({ ...createEmptyHarnessWorkspaceState(), schemaVersion: 17 })).toBeUndefined();
    expect(readHarnessWorkspaceState({ ...createEmptyHarnessWorkspaceState(), schemaVersion: 17 })).toEqual(createEmptyHarnessWorkspaceState());
  });
});
