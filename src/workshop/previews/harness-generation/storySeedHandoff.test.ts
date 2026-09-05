import { describe, expect, it } from 'vitest';
import { createMockStorySeedRecord } from '../story-seed/previewData';
import { createHarnessFoundationFromStorySeed } from './storySeedHandoff';

describe('Story Seed to Harness handoff', () => {
  it('copies the saved seed and Blueprint into a complete independent Foundation snapshot', () => {
    const record = createMockStorySeedRecord();
    const originalPremise = record.seed.story.required.premise;
    const foundation = createHarnessFoundationFromStorySeed(record);

    expect(foundation).toMatchObject({
      title: 'Ashes of the Ninth Meridian',
      premise: originalPremise,
      genre: 'Xianxia',
      sourceSnapshot: {
        kind: 'story-seed',
        sourceId: record.id,
        sourceUpdatedAt: record.updatedAt,
        schemaVersion: record.schemaVersion,
      },
    });
    expect(foundation.toneStyle).toContain('Chinese');
    expect(foundation.toneStyle).toContain('Blueprint style bible');
    expect(foundation.characters).toContain('Ye Chen');
    expect(foundation.worldFacts).toContain('Heavenly Sword Sect');
    expect(foundation.intendedDirection).toContain('First arc promise');

    record.seed.story.required.premise = 'Changed after handoff.';
    const snapshotSeed = foundation.sourceSnapshot?.seed as typeof record.seed;
    expect(snapshotSeed.story.required.premise).toBe(originalPremise);
  });

  it('accepts a saved seed without a Blueprint', () => {
    const record = createMockStorySeedRecord({ blueprint: undefined });
    const foundation = createHarnessFoundationFromStorySeed(record);

    expect(foundation.premise).toBe(record.seed.story.required.premise);
    expect(foundation.sourceSnapshot?.blueprint).toBeUndefined();
  });
});
