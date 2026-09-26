import { describe, expect, it, vi } from 'vitest';
import { type StoryFoundationInput } from '@seihouse/sen/harness-generation';
import { buildInitialStoryGenerationPayload } from '@seihouse/sen/story-seed';
import { createStoryAdministrativeMetadata } from '@seihouse/sen/story-seed';
import { createMockStorySeedRecord } from '../story-seed/previewData';
import type { ChapterWritingStyle } from '@seihouse/sen/contracts';

const createStory = vi.fn(async (_input: StoryFoundationInput, _originalLanguage?: string, _loadout?: unknown, _options?: Record<string, unknown>) => ({ id: 'hst_new' }));

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

vi.mock('./officialCapaSkills', () => ({
  installOfficialCapaSkills: async () => ({ installed: [], official: [] }),
  OFFICIAL_CAPA_DEFAULT_REFERENCES: {
    author: { id: 'official.author', version: '1.0.1' },
    pacing: { id: 'official.pacing', version: '1.0.1' },
    continuity: { id: 'official.continuity', version: '1.0.1' },
  },
  OFFICIAL_STYLE_REFERENCES: {
    chinese: { id: 'official.style.chinese', version: '1.0.0' },
    japanese: { id: 'official.style.japanese', version: '1.0.0' },
    korean: { id: 'official.style.korean', version: '1.0.0' },
  },
}));

vi.stubGlobal('localStorage', {});

const { startWorkshopHarnessStory } = await import('./storySeedHandoff');

const payloadWithLanguage = (originalLanguage: 'en' | 'ja', readingMode?: ChapterWritingStyle) => {
  const record = createMockStorySeedRecord();
  if (readingMode) record.seed.story.optional.chapterWritingStyle = readingMode;
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

describe('Reading Mode across the Story Seed to Harness handoff', () => {
  it('hands the seed\'s Reading Mode to story creation as a Story Setting, beside the Foundation', async () => {
    createStory.mockClear();
    await startWorkshopHarnessStory(payloadWithLanguage('ja', 'Easy Read'));

    expect(createStory.mock.calls[0][3]).toMatchObject({ chapterWritingStyle: 'Easy Read' });
    // Only the verbatim source snapshot, which never reaches the writer, still records it.
    expect(JSON.stringify({ ...createStory.mock.calls[0][0], sourceSnapshot: undefined })).not.toContain('Easy Read');
  });

  it('starts a story from a seed saved without one on Standard', async () => {
    createStory.mockClear();
    await startWorkshopHarnessStory(payloadWithLanguage('en'));

    expect(createStory.mock.calls[0][3]).toMatchObject({ chapterWritingStyle: 'Standard' });
  });
});
