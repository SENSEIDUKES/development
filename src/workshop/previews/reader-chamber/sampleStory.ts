import {
  buildRhythmRecommendation,
  findStory,
  latestStoryChapter,
  readHarnessWorkspaceState,
  withoutLatestChapter,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationRepository,
  type HarnessGenerationResponse,
  type HarnessWorkspaceState,
} from '@seihouse/sen/harness-generation';
import { createReaderStoryState, type ReaderStateRepository, type ReaderStoryState } from '@seihouse/sen/reader-runtime';

/**
 * The Reader Chamber workspace's story: SENSEI's Sundered Heavens test (eight
 * chapters written in the app on 2026-10-06), as the app's Export story saved
 * it. `sampleStory.json` is trimmed for size: each attempt's accepted draft,
 * foundation snapshot and frozen media are left out (the chapter and the
 * story's foundation hold the same records, restored below), and so is the
 * recordings catalog inside each chapter's frozen media (placed Sound Cues
 * carry their own recordings, and a new write freezes its own media).
 */
export const SAMPLE_STORY_TITLE = 'Sundered Heavens';

type Stored = Record<string, unknown>;
const records = (value: unknown): Stored[] => (Array.isArray(value) ? value.filter((item): item is Stored => Boolean(item) && typeof item === 'object') : []);

/**
 * A story export (the app's Export story file) as the stories this workspace
 * opens: the one story, with everything written for it. An attempt trimmed of
 * its foundation snapshot or frozen media gets them back from the story's
 * foundation and the attempt's own chapter, which hold the same records.
 */
export function storyExportToWorkspace(value: unknown): HarnessWorkspaceState {
  const exported = value && typeof value === 'object' ? value as Stored : {};
  const foundations = records(exported.foundations);
  const chapters = records(exported.chapters);
  const attempts = records(exported.attempts).map(attempt => ({
    ...attempt,
    foundationSnapshot: attempt.foundationSnapshot ?? foundations.find(foundation => foundation.id === attempt.foundationRevisionId),
    mediaLoadout: attempt.mediaLoadout ?? chapters.find(chapter => chapter.attemptId === attempt.id)?.mediaLoadout,
  }));
  const state = readHarnessWorkspaceState({
    schemaVersion: exported.schemaVersion,
    stories: exported.story ? [exported.story] : [],
    foundations,
    attempts,
    chapters,
    events: records(exported.events),
    capabilityReceipts: records(exported.capabilityReceipts),
    canonicalRecords: records(exported.canonicalRecords),
    projections: records(exported.projections),
    corrections: records(exported.corrections),
    batches: records(exported.batches),
    arcPlanOperations: [],
    memoryRecoveries: records(exported.memoryRecoveries),
    codexEntries: records(exported.codexEntries),
  });
  if (state.stories.length !== 1) throw new Error('This file is not a story saved with Export story, or it was saved by a version this Workshop cannot open.');
  return state;
}

/** Sundered Heavens, opened as the app would open it. Loaded only when the workspace asks for it. */
export async function loadSampleStory(): Promise<HarnessWorkspaceState> {
  const { default: text } = await import('./sampleStory.json?raw');
  return storyExportToWorkspace(JSON.parse(text));
}

const storyChapters = (state: HarnessWorkspaceState, storyId: string) =>
  state.chapters.filter(chapter => chapter.storyId === storyId).sort((left, right) => left.chapterNumber - right.chapterNumber);

/**
 * The story as it stood before its latest chapter was written: SEN's own
 * rewind (the chapter, the Codex entries and goals it brought, the head), with
 * the attempts for that chapter and later gone too and Rhythm's recommendation
 * worked out again for that chapter, as the HARNESS does before it writes a
 * chapter again.
 */
export function beforeLatestChapter(state: HarnessWorkspaceState, storyId: string): HarnessWorkspaceState {
  const latest = latestStoryChapter(state, storyId);
  if (!latest) throw new Error('This story has no chapter to go back before.');
  const rewound = withoutLatestChapter(state, storyId);
  rewound.attempts = rewound.attempts.filter(attempt => attempt.storyId !== storyId || attempt.chapterNumber < latest.chapterNumber);
  const story = findStory(rewound, storyId)!;
  const foundation = rewound.foundations.find(entry => entry.id === story.activeFoundationRevisionId);
  const earlier = storyChapters(rewound, storyId);
  const at = earlier.at(-1)?.committedAt ?? story.createdAt;
  story.rhythmRecommendation = buildRhythmRecommendation({
    fatePressure: foundation?.input.fatePressure,
    forChapterNumber: story.head.nextChapterNumber,
    history: earlier.flatMap(chapter => chapter.rhythm?.chapterFunction
      ? [{ chapterNumber: chapter.chapterNumber, chapterFunction: chapter.rhythm.chapterFunction }] : []),
    computedAt: at,
  });
  story.updatedAt = at;
  return rewound;
}

/** The story with only its first `chapterCount` chapters written. */
export function storyWithChapters(state: HarnessWorkspaceState, storyId: string, chapterCount: number): HarnessWorkspaceState {
  let current = state;
  while (storyChapters(current, storyId).length > chapterCount) current = beforeLatestChapter(current, storyId);
  return current;
}

/** The model the replaying writer names: no Generation Model Call is made. */
export const REPLAY_MODEL = 'workshop/saved-chapters';

/** How long the replaying writer takes, so the writing screen shows as it does in the app. */
export const REPLAY_WRITING_MS = 5_000;

/**
 * The Workshop's writer: it makes no Generation Model Call. Asked for a
 * chapter, it waits a moment and returns the Generated Chapter the model
 * returned for it when the story was written (the attempt's saved raw
 * response), so the HARNESS validates, checkpoints and commits it exactly as
 * it did then. A chapter the story never had has none, and the write fails
 * with that reason, as it does when the writer cannot be reached. It plans no
 * arcs and runs no Holdings fixer.
 */
export function createReplayWriter(saved: HarnessWorkspaceState, writingMs = REPLAY_WRITING_MS): HarnessGenerationModelAdapter {
  const replies = new Map<number, HarnessGenerationResponse>();
  for (const attempt of saved.attempts) {
    if (attempt.stage !== 'committed' || !attempt.rawProviderResponse || !attempt.providerReceipt) continue;
    replies.set(attempt.chapterNumber, { rawProviderResponse: attempt.rawProviderResponse, providerReceipt: attempt.providerReceipt });
  }
  return {
    getServerInfo: async () => ({
      provider: 'workshop-replay',
      configured: true,
      models: [{ id: REPLAY_MODEL, label: 'Saved chapters (no model call)' }],
      defaultModel: REPLAY_MODEL,
    }),
    generate: async request => {
      const chapterNumber = request.immediateChapterRequest.chapterNumber;
      const reply = replies.get(chapterNumber);
      if (!reply) throw new Error(`The Workshop has no saved Chapter ${chapterNumber} to replay. In the app, the writer writes it here.`);
      const started = Date.now();
      await new Promise(resolve => setTimeout(resolve, writingMs));
      return {
        rawProviderResponse: reply.rawProviderResponse,
        providerReceipt: { ...reply.providerReceipt, provider: 'workshop-replay', generatedAt: new Date().toISOString(), durationMs: Date.now() - started },
      };
    },
    arcOperation: async () => {
      throw new Error('The Workshop replays saved chapters only; it plans no arcs.');
    },
  };
}

/** The workspace's story storage: in memory, so every scene starts from the same story. */
export function createMemoryStories(initial: HarnessWorkspaceState): HarnessGenerationRepository {
  let state = structuredClone(initial);
  return {
    load: async () => structuredClone(state),
    save: async next => { state = structuredClone(next); },
  };
}

/** The reader's place in the story, in memory: the scene's chapter is where the Reader opens. */
export function createMemoryReaderPlace(lastReadChapter?: number): ReaderStateRepository {
  const places = new Map<string, ReaderStoryState>();
  return {
    load: async storyId => places.get(storyId) ?? { ...createReaderStoryState(storyId), ...(lastReadChapter ? { lastReadChapter } : {}) },
    save: async state => { places.set(state.storyId, state); },
  };
}

/**
 * One run of a scene: its copy of the story with only the scene's chapters
 * written, the reader's place, and the replaying writer. It outlives the
 * Reader on screen, so what happens in the scene (a chapter written, a page
 * turned) stays until another scene starts.
 */
export interface ReaderSceneRun {
  storyId: string;
  stories: HarnessGenerationRepository;
  readerPlace: ReaderStateRepository;
  writer: HarnessGenerationModelAdapter;
}

export function startSceneRun(story: HarnessWorkspaceState, scene: { chapters: number; reading?: number }, writingMs = REPLAY_WRITING_MS): ReaderSceneRun {
  const storyId = story.stories[0].id;
  return {
    storyId,
    stories: createMemoryStories(storyWithChapters(story, storyId, scene.chapters)),
    readerPlace: createMemoryReaderPlace(scene.reading),
    writer: createReplayWriter(story, writingMs),
  };
}
