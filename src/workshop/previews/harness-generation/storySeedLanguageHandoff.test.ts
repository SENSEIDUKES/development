import { describe, expect, it, vi } from 'vitest';
import type { StoryFoundationInput } from '../../../components/harness-generation/shared/types';
import { buildInitialStoryGenerationPayload } from '../../../components/story-seed/shared/storySeedSchema';
import { createStoryAdministrativeMetadata } from '../../../components/story-seed/shared/storyAdministrativeMetadata';
import { createMockStorySeedRecord } from '../story-seed/previewData';

const createStory = vi.fn(async (_input: StoryFoundationInput, _originalLanguage?: string) => ({ id: 'hst_new' }));

// Only the Harness entry points the handoff constructs are replaced; the Story
// Seed contracts under test stay real.
vi.mock('@seihouse/sen/harness-generation', () => ({
  HarnessGenerationController: class {
    async hydrate() { return undefined; }
    createStory = createStory;
  },
  IndexedDbHarnessGenerationRepository: class {},
  HarnessGenerationHttpClient: class {},
}));

const { startWorkshopHarnessStory } = await import('./storySeedHandoff');

const payloadWithLanguage = (originalLanguage: 'en' | 'ja') => {
  const record = createMockStorySeedRecord();
  return buildInitialStoryGenerationPayload(
    record.seed,
    createStoryAdministrativeMetadata({
      storyId: 'story-1',
      creatorId: record.userId,
      sourceSeedId: record.id,
      originalLanguage,
    }),
    record.blueprint!,
    10,
  );
};

describe('Original Language across the Story Seed to Harness handoff', () => {
  it('hands the story-start payload language to Harness story creation', async () => {
    createStory.mockClear();
    await startWorkshopHarnessStory(payloadWithLanguage('ja'));

    expect(createStory).toHaveBeenCalledTimes(1);
    expect(createStory.mock.calls[0][1]).toBe('ja');
  });

  it('passes English through unchanged rather than dropping the value', async () => {
    createStory.mockClear();
    await startWorkshopHarnessStory(payloadWithLanguage('en'));

    expect(createStory.mock.calls[0][1]).toBe('en');
  });
});
