import { describe, expect, it } from 'vitest';
import { buildInitialStoryGenerationPayload, createStoryAdministrativeMetadata } from '@seihouse/sen/story-seed';
import { harnessStoryStartFromSeed } from '@seihouse/library/story-seed';
import { createMockStorySeedRecord } from '../../workshop/previews/story-seed/previewData';

const payload = (options: { visibility?: 'PUBLIC' | 'SHARED' | 'PRIVATE'; language?: 'en' | 'ja' } = {}) => {
  const record = createMockStorySeedRecord();
  record.seed.story.optional.chapterWritingStyle = 'Easy Read';
  const administrative = createStoryAdministrativeMetadata({
    storyId: 'story-1', creatorId: record.userId, sourceSeedId: record.id, originalLanguage: options.language ?? 'ja',
  });
  return buildInitialStoryGenerationPayload(record.seed, { ...administrative, ...(options.visibility ? { visibility: options.visibility } : {}) }, record.blueprint!, 10);
};

describe('Starting a HARNESS story from a Story Seed', () => {
  it('gives the story its Foundation from the reviewed Blueprint, its language, tradition and Reading Mode', () => {
    const start = harnessStoryStartFromSeed(payload());
    expect(start.foundation.title).toBe(payload().blueprint.title);
    expect(start.foundation.premise).toBe(payload().storySeed.story.required.premise);
    expect(start.foundation.sourceSnapshot).toMatchObject({ kind: 'story-seed', sourceId: payload().administrative.sourceSeedId });
    expect(start.originalLanguage).toBe('ja');
    expect(start.style).toBe(payload().storySeed.story.required.style);
    expect(start.chapterWritingStyle).toBe('Easy Read');
  });

  it('maps who may read the story, keeping it private unless the Seed says otherwise', () => {
    expect(harnessStoryStartFromSeed(payload({ visibility: 'PUBLIC' })).visibility).toBe('public');
    expect(harnessStoryStartFromSeed(payload({ visibility: 'SHARED' })).visibility).toBe('shared');
    expect(harnessStoryStartFromSeed(payload({ visibility: 'PRIVATE' })).visibility).toBe('private');
  });
});
