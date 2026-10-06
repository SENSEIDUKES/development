import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  chapterRewriteGap,
  exportHarnessStory,
  withoutLatestChapter,
  type HarnessArcRequest,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationRequest,
  type HarnessWorkspaceState,
  type StoryFoundationInput,
} from '@seihouse/sen/harness-generation';
import type { ArcPlan } from '@seihouse/sen/arc-goals';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../../test-utils/writtenChapter';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';

/**
 * Rewrite this chapter: the reader may have the latest chapter written again,
 * with an optional note. The new version is written from the story as it
 * stood before that chapter, replaces it only when it commits, and leaves the
 * story exactly as it was whenever it fails.
 */

const plan: ArcPlan = { arcNumber: 1, goals: [
  { id: 'arc-1-flood', text: 'Survive the first flood.', chapters: 3 },
  { id: 'arc-1-bridge', text: 'Rebuild the rope bridge.', chapters: 3 },
  { id: 'arc-1-tower', text: 'Climb the archive tower.', chapters: 3 },
  { id: 'arc-1-ending', text: 'Reopen the drowned archive to the valley.', chapters: 21 },
] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } };
const chapter = (title: string, paragraphs: string[], extra: Record<string, unknown> = {}) => ({
  title, paragraphs, recap: `${title}: ${paragraphs[0]}`, chapterFunction: 'progression',
  nextProgression: 'Lin climbs the archive tower.', nextWorldBuilding: 'The flood reveals the old canals.', nextConflict: 'A river cult blocks the stair.',
  arcCompletion: { goalId: 'none', completed: false, evidence: '' }, ...extra,
});
const SURVIVAL = { fateSurvival: { enabled: true } } as const;
const direct = (text: string) => ({ kind: 'reader' as const, text });

let ids = 0;
const runtime = { now: () => '2026-10-06T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` };

const setup = async (overrides: Partial<StoryFoundationInput> = {}) => {
  const requests: HarnessGenerationRequest[] = [];
  const outputs: Array<Record<string, unknown> | Error> = [];
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
    generate: vi.fn(async (request: HarnessGenerationRequest) => {
      requests.push(structuredClone(request));
      const next = outputs.shift() ?? chapter('Onward', ['Lin waded on.']);
      if (next instanceof Error) throw next;
      return { rawProviderResponse: JSON.stringify(writtenChapter(next)), providerReceipt: receipt };
    }),
    arcOperation: async (_request: HarnessArcRequest) => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter, runtime });
  await controller.hydrate();
  const story = await controller.createStory({
    premise: 'An archivist races the rising river.', destinedEnding: 'Lin reopens the drowned archive to the valley.',
    initialArcPlan: plan, plannedArcCount: 1,
    cast: [{ name: 'Lin', role: 'Archivist', isMainCharacter: true, relationshipToMC: 'Self' }, { name: 'Elder Qin', role: 'Keeper' }],
    ...overrides,
  });
  const write = async (...replies: Array<Record<string, unknown> | Error>) => {
    outputs.push(...replies);
    await controller.generateNextChapter(story.id, 'fixture');
  };
  return { controller, repository, storyId: story.id, requests, outputs, write };
};

const storyChapters = (state: HarnessWorkspaceState) => [...state.chapters].sort((left, right) => left.chapterNumber - right.chapterNumber);

describe('Rewrite this chapter', () => {
  it('writes the latest chapter again from the story before it, and the new version takes its place', async () => {
    const run = await setup();
    await run.write(chapter('The Flood', ['[[gained: MC | Rope Coil]] Lin tied the rope to the rail.']));
    await run.write(chapter('The Keeper', ['[[gained: Elder Qin | Jade Gourd]] Elder Qin lifted a jade gourd.', '[[gained: MC | Lantern]] Lin took the lantern.']));
    const before = run.controller.snapshot();
    const [first, replaced] = storyChapters(before);

    run.outputs.push(chapter('The Keeper Waits', ['[[gained: MC | Silver Bell]] Lin found a silver bell in the mud.']));
    await run.controller.rewriteLatestChapter(run.storyId, 'fixture', '  Let Elder Qin keep his secrets.  ');

    // What the writer was given: the story as it stood after Chapter 1, and the reader's request.
    const sent = run.requests.at(-1)!;
    expect(sent.immediateChapterRequest).toMatchObject({
      chapterNumber: 2,
      continuation: true,
      rewrite: { replacesChapterId: replaced.id, note: 'Let Elder Qin keep his secrets.', previous: { title: 'The Keeper', recap: replaced.recap!.text } },
    });
    expect(sent.immediateChapterRequest.chapterScale.paragraphs).toBe(run.requests[1].immediateChapterRequest.chapterScale.paragraphs);
    expect(sent.storyInformation.storyHead).toMatchObject({ nextChapterNumber: 2, lastCommittedChapterId: first.id });
    expect(sent.storyInformation.previouslyOn.map(entry => entry.chapterNumber)).toEqual([1]);
    expect(JSON.stringify(sent.storyInformation.holdings)).not.toMatch(/Jade Gourd|Lantern/);
    const prompt = buildHarnessGenerationPrompt(sent).userPrompt;
    expect(prompt).toContain('REWRITE: the reader asked for Chapter 2 to be written again. The version they set aside:');
    expect(prompt).toContain(`"The Keeper" — ${replaced.recap!.text}`);
    expect(prompt).toContain('THE READER\'S NOTE: Let Elder Qin keep his secrets.');
    expect(prompt).toContain('Write Chapter 2 again now. Return only the requested JSON object.');

    const after = run.controller.snapshot();
    const [keptFirst, rewritten] = storyChapters(after);
    expect(after.chapters).toHaveLength(2);
    expect(keptFirst).toEqual(first);
    expect(rewritten).toMatchObject({ chapterNumber: 2, title: 'The Keeper Waits' });
    expect(rewritten.id).not.toBe(replaced.id);
    expect(rewritten.paragraphs[0]).toBe('Lin found a silver bell in the mud.');
    expect(after.stories[0].head).toMatchObject({ nextChapterNumber: 3, lastCommittedChapterId: rewritten.id });
    // The replaced version stays on its attempt, so an export still shows it.
    const replacedAttempt = after.attempts.find(attempt => attempt.id === replaced.attemptId)!;
    expect(replacedAttempt).toMatchObject({ stage: 'committed', replacedByChapterId: rewritten.id });
    expect(replacedAttempt.acceptedDraft!.title).toBe('The Keeper');
    expect(exportHarnessStory(after, run.storyId).attempts.map(attempt => attempt.id)).toContain(replaced.attemptId);
    // The entries the replaced version brought in are gone: its Jade Gourd and Lantern, and Elder Qin, first named there.
    expect(after.codexEntries.map(entry => entry.name).sort()).toEqual(['Lin', 'Rope Coil', 'Silver Bell']);
    expect(after.codexEntries.find(entry => entry.name === 'Silver Bell')!.origin).toEqual({ source: 'tag', chapterId: rewritten.id, chapterNumber: 2 });

    // The story goes on from the new version.
    await run.write(chapter('The Tower', ['Lin climbed.']));
    const third = run.requests.at(-1)!;
    expect(third.immediateChapterRequest.chapterNumber).toBe(3);
    expect(third.immediateChapterRequest.rewrite).toBeUndefined();
    expect(third.storyInformation.previouslyOn.map(entry => entry.recap)).toEqual([first.recap!.text, rewritten.recap!.text]);
  });

  it('without a note, asks for a fresh take on the same chapter', async () => {
    const run = await setup();
    await run.write(chapter('The Flood', ['The river rose.']));
    const replacedId = run.controller.snapshot().chapters[0].id;
    await run.controller.rewriteLatestChapter(run.storyId, 'fixture', '   ');
    const sent = run.requests.at(-1)!;
    // A blank note is no note.
    expect(sent.immediateChapterRequest.rewrite).toEqual({ replacesChapterId: replacedId, previous: { title: 'The Flood', recap: 'The Flood: The river rose.' } });
    expect(sent.immediateChapterRequest.continuation).toBe(false);
    const prompt = buildHarnessGenerationPrompt(sent).userPrompt;
    expect(prompt).toContain('The reader left no note. Write a new version of Chapter 1 from the same point in the story with the same direction');
    expect(prompt).not.toContain('THE READER\'S NOTE');
  });

  it('leaves the story exactly as it was when the rewrite fails, and the story can still go on or try again', async () => {
    const run = await setup();
    await run.write(chapter('The Flood', ['The river rose.']));
    await run.write(chapter('The Keeper', ['[[gained: MC | Lantern]] Lin took the lantern.']));
    const before = run.controller.snapshot();

    run.outputs.push(new Error('Provider unavailable'));
    await run.controller.rewriteLatestChapter(run.storyId, 'fixture', 'Make it darker.');
    const failed = run.controller.snapshot();
    expect(failed.chapters).toEqual(before.chapters);
    expect(failed.codexEntries).toEqual(before.codexEntries);
    expect(failed.stories[0].head).toEqual(before.stories[0].head);
    const attempt = failed.attempts.at(-1)!;
    expect(attempt).toMatchObject({ stage: 'generation_failed', chapterNumber: 2 });
    expect(attempt.failure?.message).toBe('Provider unavailable');
    expect(chapterRewriteGap(failed, run.storyId)).toBeUndefined();

    // Trying the failed request again writes Chapter 2 again, with the same note, never Chapter 3.
    run.outputs.push(chapter('The Keeper, Darker', ['The lantern guttered.']));
    await run.controller.retryModelRequest(attempt.id);
    expect(run.requests.at(-1)!.immediateChapterRequest).toMatchObject({ chapterNumber: 2, rewrite: { note: 'Make it darker.' } });
    const retried = run.controller.snapshot();
    expect(storyChapters(retried).map(entry => [entry.chapterNumber, entry.title])).toEqual([[1, 'The Flood'], [2, 'The Keeper, Darker']]);
    expect(retried.stories[0].head.nextChapterNumber).toBe(3);
  });

  it('records the goals, the ending and the route again from the new version', async () => {
    const run = await setup(SURVIVAL);
    await run.controller.chooseChapterDirection(run.storyId, direct('Lin fights the flood.'));
    // Chapter 1 achieves the first goal and ends the story: fate failed.
    await run.write(chapter('The Flood', ['Lin held the sluice until the water fell.', 'The river took Lin and the archive with her.'], {
      arcCompletion: { goalId: 'arc-1-flood', completed: true, evidence: 'Lin held the sluice until the water fell.' },
      storyEnded: { ended: true, evidence: 'The river took Lin and the archive with her.' },
    }));
    const ended = run.controller.snapshot().stories[0];
    expect(ended.goalCompletions?.map(done => done.goalId)).toEqual(['arc-1-flood']);
    expect(ended.conclusion).toMatchObject({ outcome: 'fate-failed', chapterNumber: 1 });

    // The story ended, but its latest chapter can still be written again, with the same direction.
    expect(chapterRewriteGap(run.controller.snapshot(), run.storyId)).toBeUndefined();
    run.outputs.push(chapter('The Flood Recedes', ['Lin waited out the flood on the roof.']));
    await run.controller.rewriteLatestChapter(run.storyId, 'fixture');
    expect(run.requests.at(-1)!.immediateChapterRequest.direction?.choice).toEqual(direct('Lin fights the flood.'));
    const rewritten = run.controller.snapshot().stories[0];
    expect(rewritten.goalCompletions ?? []).toEqual([]);
    expect(rewritten.conclusion).toBeUndefined();
    expect(rewritten.head.nextChapterNumber).toBe(2);
    expect(storyChapters(run.controller.snapshot())[0].path).toMatchObject({ kind: 'reader', text: 'Lin fights the flood.' });
  });

  it('Fate Survival: a direction already chosen for the next chapter goes with the version it was chosen after', async () => {
    const run = await setup(SURVIVAL);
    await run.controller.chooseChapterDirection(run.storyId, direct('Lin fights the flood.'));
    await run.write(chapter('The Flood', ['The river rose.']));
    await run.controller.chooseChapterDirection(run.storyId, direct('Lin follows the keeper.'));
    expect(run.controller.snapshot().stories[0].nextChapterDirection?.forChapter).toBe(2);

    await run.controller.rewriteLatestChapter(run.storyId, 'fixture', 'No keeper yet.');
    const after = run.controller.snapshot().stories[0];
    expect(after.head.nextChapterNumber).toBe(2);
    expect(after.nextChapterDirection).toBeUndefined();
  });

  it('is refused while something is built on the latest chapter, and never touches an earlier one', async () => {
    const run = await setup();
    expect(chapterRewriteGap(run.controller.snapshot(), run.storyId)).toBe('This story has no chapter to rewrite yet.');
    await expect(run.controller.rewriteLatestChapter(run.storyId, 'fixture')).rejects.toThrow('This story has no chapter to rewrite yet.');
    await run.write(chapter('The Flood', ['The river rose.']));
    const state = run.controller.snapshot();
    const latest = state.chapters[0];
    const gap = (change: (draft: HarnessWorkspaceState) => void) => {
      const draft = structuredClone(state);
      change(draft);
      return chapterRewriteGap(draft, run.storyId);
    };

    expect(gap(() => undefined)).toBeUndefined();
    expect(gap(draft => { draft.attempts[0].stage = 'raw_received'; })).toBe('Wait for the chapter being written before rewriting Chapter 1.');
    expect(gap(draft => { draft.batches.push({ id: 'b', storyId: run.storyId, model: 'fixture', requestedChapterCount: 3, startChapterNumber: 1, completedChapterIds: [], status: 'running', createdAt: 'now', updatedAt: 'now', usage: { reportedCalls: 0, estimatedCalls: 0, unavailableCalls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 } }); }))
      .toBe('Pause the batch writing this story before rewriting Chapter 1.');
    expect(gap(draft => { draft.chapters[0].eventIds = ['legacy-event']; })).toBe('Chapter 1 carries story memory, so it cannot be rewritten.');
    expect(gap(draft => { draft.corrections.push({ id: 'c', storyId: run.storyId, kind: 'reader-edit', reason: 'edit', createdAt: 'now', targetRecordIds: [], readerEdit: { chapterNumber: 1, changes: [] } }); }))
      .toBe('Chapter 1 has your corrections, so it cannot be rewritten.');
    // The last chapter of an arc, once the next arc is planned from it.
    expect(gap(draft => {
      draft.chapters[0].chapterNumber = 30;
      draft.stories[0].head.nextChapterNumber = 31;
      draft.stories[0].arcPlans!.push({ plan: { arcNumber: 2, goals: [{ id: 'arc-2', text: 'Carry the archive on.', chapters: 30 }] }, effectiveChapter: 31, reason: 'initial' });
    })).toBe('Arc 2 is already planned from Chapter 30, so Chapter 30 can no longer be rewritten.');
    expect(latest.id).toBeTruthy();
  });

  it('a rewrite left mid-request when the page closed fails quietly instead of holding the story', async () => {
    const run = await setup();
    await run.write(chapter('The Flood', ['The river rose.']));
    const saved = run.controller.snapshot();
    const interrupted = structuredClone(saved);
    // As saved the moment the rewrite's request left: the old chapter is still the latest.
    interrupted.attempts.push({ ...structuredClone(saved.attempts[0]), id: 'hga-interrupted', stage: 'request_started',
      immediateChapterRequest: { ...saved.attempts[0].immediateChapterRequest, rewrite: { replacesChapterId: saved.chapters[0].id, previous: { title: 'The Flood' } } },
      rawProviderResponse: undefined, acceptedDraft: undefined, committedChapterId: undefined, pendingChapterId: undefined });
    const reopened = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(interrupted), modelAdapter: {
      getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
      generate: async () => ({ rawProviderResponse: JSON.stringify(writtenChapter(chapter('Again', ['Again.']))), providerReceipt: receipt }),
      arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
    }, runtime });
    const state = await reopened.hydrate();
    expect(state.attempts.at(-1)).toMatchObject({ stage: 'generation_failed', failure: { message: 'The browser closed while Chapter 1 was being rewritten, so it was kept as it was.' } });
    expect(state.chapters).toEqual(saved.chapters);
    expect(chapterRewriteGap(state, run.storyId)).toBeUndefined();
    await reopened.generateNextChapter(run.storyId, 'fixture');
    expect(reopened.snapshot().stories[0].head.nextChapterNumber).toBe(3);
  });

  it('takes the story back to just before its latest chapter without changing the saved state', async () => {
    const run = await setup();
    await run.write(chapter('The Flood', ['[[gained: MC | Rope Coil]] Lin tied the rope to the rail.']));
    const afterOne = run.controller.snapshot();
    await run.write(chapter('The Keeper', ['[[gained: Elder Qin | Jade Gourd]] Elder Qin lifted a jade gourd.'], {
      arcCompletion: { goalId: 'arc-1-flood', completed: true, evidence: 'Elder Qin lifted a jade gourd.' },
    }));
    const afterTwo = run.controller.snapshot();
    const frozen = structuredClone(afterTwo);
    const back = withoutLatestChapter(afterTwo, run.storyId);
    expect(afterTwo).toEqual(frozen);
    expect(back.chapters).toEqual(afterOne.chapters);
    expect(back.codexEntries).toEqual(afterOne.codexEntries);
    expect(back.stories[0].head).toEqual(afterOne.stories[0].head);
    expect(back.stories[0].goalCompletions).toEqual(afterOne.stories[0].goalCompletions ?? []);
  });
});
