import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { HarnessGenerationController, HARNESS_GENERATION_SCHEMA_VERSION, type HarnessSkillManifest, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { createLibraryMediaPort } from '@seihouse/library/media';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { installOfficialCapaSkillsInMemory } from '../../../host/generation/capa/officialCapaSkills';
import {
  REPLAY_MODEL,
  createMemoryReaderPlace,
  createMemoryStories,
  createReplayWriter,
  loadSampleStory,
  storyExportToWorkspace,
  storyWithChapters,
} from './sampleStory';

let sample: HarnessWorkspaceState;
let storyId: string;
let officialSkills: HarnessSkillManifest[];

beforeAll(async () => {
  sample = await loadSampleStory();
  storyId = sample.stories[0].id;
  // The official CAPA skills, as the app installs them.
  officialSkills = await installOfficialCapaSkillsInMemory(async definition =>
    new Uint8Array(await readFile(path.resolve(__dirname, '../../../host/generation/capa/official-capa', definition.archiveFile))));
});

/** The app's HARNESS (as `useLibraryStories` makes it), over the scene's story and the replaying writer. */
async function openStory(state: HarnessWorkspaceState) {
  const controller = new HarnessGenerationController({
    repository: createMemoryStories(state),
    modelAdapter: createReplayWriter(sample, 0),
    media: createLibraryMediaPort({ registered: [], entitlements: [], base: LIBRARY_BASE_MEDIA }),
  });
  controller.setInstalledSkills(officialSkills);
  await controller.hydrate();
  return controller;
}

const chaptersOf = (state: HarnessWorkspaceState) =>
  state.chapters.filter(chapter => chapter.storyId === storyId).sort((left, right) => left.chapterNumber - right.chapterNumber);

describe('the Reader Chamber workspace story', () => {
  it('opens Sundered Heavens as the app holds it: eight chapters on the current schema', () => {
    expect(sample.schemaVersion).toBe(HARNESS_GENERATION_SCHEMA_VERSION);
    expect(sample.stories.map(story => story.title)).toEqual(['Sundered Heavens']);
    expect(chaptersOf(sample).map(chapter => chapter.title)).toEqual([
      'Rust and Fractures', 'Tearing the Maw', 'A Ledger of Broken Stone', 'Tempering the Rift-Bone',
      'Scales of the Void Pavilion', 'Echoes Against the Smelting Sky', 'Shadow of the Crane Skyship', 'Ambush at the North Ridge Gate',
    ]);
    // Each attempt has its foundation snapshot and frozen media back.
    for (const attempt of sample.attempts) {
      expect(attempt.foundationSnapshot.id).toBe(attempt.foundationRevisionId);
      expect(attempt.mediaLoadout).toEqual(sample.chapters.find(chapter => chapter.attemptId === attempt.id)!.mediaLoadout);
    }
  });

  it('goes back to before Chapter 8 the way the story stood then', () => {
    const before = storyWithChapters(sample, storyId, 7);
    const story = before.stories[0];
    expect(chaptersOf(before)).toHaveLength(7);
    expect(before.attempts).toHaveLength(7);
    expect(story.head).toMatchObject({ nextChapterNumber: 8, lastCommittedChapterId: chaptersOf(before)[6].id });
    // Rhythm recommends for Chapter 8 what it recommended when Chapter 8 was written.
    const written = sample.attempts.find(attempt => attempt.chapterNumber === 8)!.storyInformation.rhythm!;
    expect(story.rhythmRecommendation).toMatchObject({
      forChapterNumber: 8, recommendedFunction: written.recommendedFunction, reason: written.reason, recentFunctions: written.recentFunctions,
    });
    // The holdings Chapter 8 never brought are not there before it.
    expect(before.codexEntries.map(entry => entry.name)).toEqual(sample.codexEntries.map(entry => entry.name));
    expect(sample).toEqual(storyExportToWorkspace(JSON.parse(JSON.stringify({ ...sample, story: sample.stories[0] }))));
  });

  it('writes Chapter 8 again through the HARNESS from the reply it was written with, calling no model', async () => {
    const controller = await openStory(storyWithChapters(sample, storyId, 7));
    const written = await controller.writeNextChapter(storyId, REPLAY_MODEL);
    const original = chaptersOf(sample)[7];
    const chapter = chaptersOf(written).at(-1)!;
    expect(chapter).toMatchObject({
      chapterNumber: 8, title: original.title, prose: original.prose, paragraphs: original.paragraphs,
      scene: original.scene, closingHoldings: original.closingHoldings, path: original.path,
    });
    expect(chapter.soundCues?.map(cue => cue.anchor)).toEqual(original.soundCues?.map(cue => cue.anchor));
    expect(chapter.speakers?.map(speaker => speaker.payload.speaker)).toEqual(original.speakers?.map(speaker => speaker.payload.speaker));
    expect(chapter.holdingChanges?.map(change => change.anchor)).toEqual(original.holdingChanges?.map(change => change.anchor));
    expect(written.stories[0].head.nextChapterNumber).toBe(9);
    const attempt = written.attempts.find(entry => entry.id === chapter.attemptId)!;
    expect(attempt.model).toBe(REPLAY_MODEL);
    expect(attempt.providerReceipt?.provider).toBe('workshop-replay');
  });

  it('writes Chapter 1 from the story start', async () => {
    const start = storyWithChapters(sample, storyId, 0);
    expect(chaptersOf(start)).toEqual([]);
    expect(start.stories[0].head).toEqual({ nextChapterNumber: 1 });
    const controller = await openStory(start);
    const written = await controller.writeNextChapter(storyId, REPLAY_MODEL);
    expect(chaptersOf(written).map(chapter => [chapter.chapterNumber, chapter.title])).toEqual([[1, 'Rust and Fractures']]);
  });

  it('says plainly that a chapter the story never had cannot be replayed, and keeps the story as it was', async () => {
    const controller = await openStory(sample);
    const after = await controller.writeNextChapter(storyId, REPLAY_MODEL);
    expect(chaptersOf(after)).toHaveLength(8);
    expect(after.attempts.at(-1)).toMatchObject({ chapterNumber: 9, stage: 'generation_failed' });
    expect(after.attempts.at(-1)?.failure?.message).toBe('The Workshop has no saved Chapter 9 to replay. In the app, the writer writes it here.');
  });

  it('rewrites Chapter 8 from the same reply', async () => {
    const controller = await openStory(sample);
    const rewritten = await controller.rewriteLatestChapter(storyId, REPLAY_MODEL, 'More wind.');
    const chapters = chaptersOf(rewritten);
    expect(chapters).toHaveLength(8);
    expect(chapters[7]).toMatchObject({ title: 'Ambush at the North Ridge Gate' });
    expect(chapters[7].id).not.toBe(chaptersOf(sample)[7].id);
  });

  it('opens the Reader where the scene puts the reader', async () => {
    expect(await createMemoryReaderPlace(4).load(storyId)).toMatchObject({ storyId, lastReadChapter: 4 });
    expect((await createMemoryReaderPlace().load(storyId))?.lastReadChapter).toBeUndefined();
  });
});
