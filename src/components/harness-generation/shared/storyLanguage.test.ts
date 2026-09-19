import { describe, expect, it } from 'vitest';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { compileStoryInformationPacket } from './context';
import { createHarnessStory, reviseStoryFoundation } from './foundation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { createEmptyHarnessWorkspaceState, readHarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { HARNESS_GENERATION_SCHEMA_VERSION } from '@seihouse/sen/harness-generation';

const foundationInput = { title: 'Ninth Meridian', premise: 'A courier outruns a falling dynasty.' };

const hydratedController = async (repository = new InMemoryHarnessGenerationRepository()) => {
  const controller = new HarnessGenerationController({
    repository,
    modelAdapter: {
      getServerInfo: async () => ({ provider: 'gemini' as const, configured: false, models: [], defaultModel: 'm' }),
      generate: async () => { throw new Error('not used'); },
    },
  });
  await controller.hydrate();
  return controller;
};

describe('Original Language as permanent HARNESS story identity', () => {
  it('stores the language supplied at creation rather than defaulting every story to English', async () => {
    const controller = await hydratedController();
    const story = await controller.createStory(foundationInput, 'ja');
    expect(story.originalLanguage).toBe('ja');
  });

  it('falls back to English only when no language is supplied', async () => {
    const controller = await hydratedController();
    const story = await controller.createStory(foundationInput);
    expect(story.originalLanguage).toBe('en');
  });

  it('persists and reloads Original Language across a repository reload', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const created = await (await hydratedController(repository)).createStory(foundationInput, 'ko');

    const reloaded = await hydratedController(repository);
    const story = reloaded.snapshot().stories.find(candidate => candidate.id === created.id);
    expect(story?.originalLanguage).toBe('ko');
  });

  it('carries Original Language into the Story Information Packet as explicit story information', () => {
    const created = createHarnessStory(createEmptyHarnessWorkspaceState(), foundationInput, 'zh-CN');
    const packet = compileStoryInformationPacket(
      created.state,
      created.story,
      created.foundation,
      'hga_fixture',
    );
    expect(packet.originalLanguage).toBe('zh-CN');
  });

  it('keeps Original Language unchanged when the Story Foundation is revised', () => {
    const created = createHarnessStory(createEmptyHarnessWorkspaceState(), foundationInput, 'vi');
    const revised = reviseStoryFoundation(created.state, created.story.id, {
      ...foundationInput,
      premise: 'A revised premise that rewrites the opening entirely.',
      title: 'A Different Title',
    });

    expect(revised.foundation.revision).toBe(2);
    expect(revised.story.title).toBe('A Different Title');
    expect(revised.story.originalLanguage).toBe('vi');
    // The Foundation contract cannot express a language at all, so a revision
    // has no channel through which to reach story identity.
    expect(revised.foundation.input).not.toHaveProperty('originalLanguage');
  });

  it('resets stale workspace state through the schema version boundary instead of migrating it', () => {
    const stale = {
      ...createEmptyHarnessWorkspaceState(),
      schemaVersion: HARNESS_GENERATION_SCHEMA_VERSION - 1,
      stories: [{ id: 'hst_stale', title: 'Stale', createdAt: 'a', updatedAt: 'a',
        activeFoundationRevisionId: 'f', foundationRevisionIds: ['f'], head: { nextChapterNumber: 1 } }],
    };

    expect(readHarnessWorkspaceState(stale)).toEqual(createEmptyHarnessWorkspaceState());
  });
});
