import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HarnessReaderSession } from '../development/HarnessReaderSession';
import { HarnessGenerationController } from './controller';
import { InMemoryHarnessGenerationRepository } from './repository';
import { createHarnessSenStory } from './senAdapter';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import type { HarnessArcRequest, HarnessGenerationRequest, HarnessGenerationModelAdapter } from './types';
import type { ArcPlan } from '../../arc-goals/shared/arcGoals';

const plan: ArcPlan = { arcNumber: 1, goals: [{ id: 'arc-1-first', text: 'Meet the invader.', chapters: 1 }, { id: 'arc-1-second', text: 'Defeat the invader.', chapters: 99 }] };
const response = (body: unknown) => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } });
const setup = async (sameTimestamp = false) => {
  const requests: HarnessGenerationRequest[] = [];
  let output: Record<string, unknown> = { prose: 'She met the invader at the gate.', arcCompletion: { goalId: plan.goals[0].id, completed: true, evidence: 'She met the invader at the gate.' } };
  const arcOperation = vi.fn(async (request: HarnessArcRequest) => request.operation === 'check-alter-fate'
    ? response({ conflict: true, reason: 'Killing him before the meeting makes meeting him impossible.' })
    : response({ plan: { ...plan, arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: plan.goals.map(goal => ({ ...goal, id: request.storyInformation.chapterNumber + goal.id })) }, destinedEnding: 'Unite the kingdoms.' }));
  const adapter: HarnessGenerationModelAdapter = { getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
    generate: async request => { requests.push(request); return response(output); }, arcOperation };
  const repository = new InMemoryHarnessGenerationRepository();
  let identity = 0;
  const controller = new HarnessGenerationController({ repository, modelAdapter: adapter,
    ...(sameTimestamp ? { runtime: { now: () => '2026-09-13T00:00:00.000Z', createId: (prefix: string) => `${prefix}_${++identity}` } } : {}) });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'A courier confronts an invader.', destinedEnding: 'Unite the kingdoms.', initialArcPlan: plan });
  return { controller, repository, story, requests, arcOperation, setOutput: (value: typeof output) => { output = value; } };
};
describe('HARNESS canonical arc integration', () => {
  it('renders a saved branch safely before its replacement opening chapter exists', async () => {
    const run = await setup(); await run.controller.generateNextChapter(run.story.id, 'fixture');
    const branch = await run.controller.alterFate(run.story.id, 1, 'Change the meeting.', async () => undefined);
    const html = renderToStaticMarkup(createElement(HarnessReaderSession, { state: run.controller.snapshot(), storyId: branch.id,
      controller: run.controller, model: 'fixture', onBranch: () => undefined, onClose: () => undefined, authorizeWorld: async () => undefined }));
    expect(html).toContain('awaits its first chapter');
    expect(html).toContain('Return to generation');
  });
  it('automatically plans a premise-only story through the provider before freezing its first request', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'An archivist reunites a divided kingdom.' });
    await run.controller.generateNextChapter(story.id, 'fixture');
    expect(run.arcOperation).toHaveBeenCalledTimes(1);
    expect(run.requests[0].storyInformation.arc).toMatchObject({ destinedEnding: 'Unite the kingdoms.', chapterInArc: 1, positionInSegment: 1 });
    expect(run.requests[0].storyInformation.arc!.plan.goals.map(goal => goal.chapters)).toEqual([1, 99]);
    expect(run.repository.snapshot().stories.find(item => item.id === story.id)?.arcPlans).toHaveLength(1);
  });
  it('preserves historical wording and frozen context through direct edits and reload', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    await run.controller.editArcGoals(run.story.id, { ...plan, goals: [plan.goals[0], { ...plan.goals[1], text: 'Negotiate peace with the invader.' }] });
    await expect(run.controller.editArcGoals(run.story.id, { ...plan, goals: [...plan.goals].reverse() })).rejects.toThrow('Already-generated');
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests[1].storyInformation.arc!.activeGoal.text).toBe('Negotiate peace with the invader.');
    expect(run.requests[0].storyInformation.arc!.plan).toEqual(plan);
    await run.controller.hydrate();
    expect(run.controller.snapshot().stories[0].arcPlans).toHaveLength(2);
    const branch = await run.controller.alterFate(run.story.id, 1, 'An earlier change.', async () => undefined);
    expect(branch.arcPlans?.at(-1)?.plan.goals[1].text).toBe('Defeat the invader.');
  });
  it('fills an absent novel ending without overwriting an author-adjusted initial plan', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'An exile returns.', initialArcPlan: plan });
    await run.controller.generateNextChapter(story.id, 'fixture');
    expect(run.requests[0].storyInformation.arc?.destinedEnding).toBe('Unite the kingdoms.');
    expect(run.requests[0].storyInformation.arc?.plan).toEqual(plan);
  });
  it('retries an atomic chapter/completion write without another provider call or duplicate completion', async () => {
    const run = await setup();
    const save = run.repository.save.bind(run.repository);
    let failCommit = true;
    vi.spyOn(run.repository, 'save').mockImplementation(async state => {
      if (failCommit && state.chapters.length) { failCommit = false; throw new Error('Disk unavailable'); }
      await save(state);
    });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.repository.snapshot().stories[0].goalCompletions).toEqual([]);
    await run.controller.retryAppropriateStage(run.controller.snapshot().attempts[0].id);
    expect(run.requests).toHaveLength(1);
    expect(run.repository.snapshot().chapters).toHaveLength(1);
    expect(run.repository.snapshot().stories[0].goalCompletions).toHaveLength(1);
  });
  it('freezes exact pacing, persists evidenced completion, and does not advance on unconfirmed prose', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const context = run.requests[0].storyInformation.arc!;
    expect(context).toMatchObject({ destinedEnding: 'Unite the kingdoms.', arcNumber: 1, chapterInArc: 1, activeGoal: { id: 'arc-1-first', startChapter: 1, endChapter: 1 }, completionDeadline: 1, positionInSegment: 1 });
    expect(buildHarnessGenerationPrompt(run.requests[0]).userPrompt).toContain('ARC GOAL REQUIREMENT');
    expect(run.repository.snapshot().stories[0].goalCompletions).toHaveLength(1);
    run.setOutput({ prose: 'The invader escaped.' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(run.requests[1].storyInformation.arc?.activeGoal.id).toBe('arc-1-second');
    const saved = run.controller.snapshot();
    saved.stories[0].head.nextChapterNumber = 101;
    const adapter: HarnessGenerationModelAdapter = { getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }), arcOperation: run.arcOperation,
      generate: async request => { expect(request.storyInformation.arc?.activeGoal.id).toBe('arc-1-second'); expect(request.storyInformation.arc?.completionDeadline).toBe(100); return response({ prose: 'The chase continues.' }); } };
    const reloaded = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter: adapter });
    await reloaded.hydrate(); await reloaded.generateNextChapter(run.story.id, 'fixture');
    expect(run.arcOperation).not.toHaveBeenCalled();
  });
  it('automatically prepares the next plan after the boundary commit, with current canon and ending', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const saved = run.controller.snapshot(); saved.stories[0].head.nextChapterNumber = 100;
    const reloaded = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter: {
      getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }), arcOperation: run.arcOperation,
      generate: async () => response({ prose: 'She defeated the invader.', arcCompletion: { goalId: 'arc-1-second', completed: true, evidence: 'She defeated the invader.' } }),
    } });
    await reloaded.hydrate(); await reloaded.generateNextChapter(run.story.id, 'fixture');
    expect(run.arcOperation).toHaveBeenCalledTimes(1);
    expect(run.arcOperation.mock.calls[0][0].storyInformation.committedChapters.at(-1)?.chapterNumber).toBe(100);
    expect(run.arcOperation.mock.calls[0][0].storyInformation.foundationRevision.input.destinedEnding).toBe('Unite the kingdoms.');
    expect(reloaded.snapshot().stories[0].arcPlans?.at(-1)?.plan.arcNumber).toBe(2);
    expect(createHarnessSenStory(reloaded.snapshot(), run.story.id).arcs).toHaveLength(2);
  });
  it('checks the historical goal and isolates canonical rerouting to the alternate world', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const original = run.controller.snapshot();
    const review = await run.controller.checkAlterFate(run.story.id, 1, 'The invader dies before we meet.', 'fixture');
    expect(review.goal).toBe('Meet the invader.');
    expect(run.arcOperation.mock.calls[0][0].storyInformation.arc?.activeGoal.id).toBe('arc-1-first');
    const capacity = vi.fn(async () => undefined);
    const branch = await run.controller.alterFate(run.story.id, 1, 'The invader dies before we meet.', capacity);
    expect(capacity).toHaveBeenCalledTimes(1);
    run.setOutput({ prose: 'The invader died before she reached the gate.', arcReconciliation: { goalId: 'arc-1-first', impossible: true, evidence: 'The invader died before she reached the gate.', replacement: 'Discover who killed the invader.' } });
    await run.controller.generateNextChapter(branch.id, 'fixture');
    const after = run.controller.snapshot();
    expect(after.stories.find(story => story.id === branch.id)?.arcPlans?.at(-1)?.plan.goals[0].text).toBe('Discover who killed the invader.');
    expect(after.stories.find(story => story.id === run.story.id)).toEqual(original.stories[0]);
    expect(after.chapters.filter(chapter => chapter.storyId === run.story.id)).toEqual(original.chapters);
  });
  it('preserves the goal when a requested event is noncanonical and keeps copied history readable', async () => {
    const run = await setup(); await run.controller.generateNextChapter(run.story.id, 'fixture'); await run.controller.generateNextChapter(run.story.id, 'fixture');
    const branch = await run.controller.alterFate(run.story.id, 2, 'Make him an ally.', async () => undefined);
    run.setOutput({ prose: 'He refused her offer.', arcReconciliation: { goalId: 'arc-1-second', impossible: true, evidence: 'He became her ally.', replacement: 'Protect the alliance.' } });
    await run.controller.generateNextChapter(branch.id, 'fixture');
    expect(run.controller.snapshot().stories.find(story => story.id === branch.id)?.arcPlans?.at(-1)?.plan.goals[1].text).toBe('Defeat the invader.');
    expect(createHarnessSenStory(run.controller.snapshot(), branch.id).arcs[0].chapters).toHaveLength(2);
  });
  it('preserves pre-branch corrections when copied evidence is replayed', async () => {
    const run = await setup(true);
    run.setOutput({ prose: 'Mara entered the courtyard.', events: [{ description: 'Mara entered the courtyard.', category: 'location', subjects: ['Courtyard'], evidence: 'Mara entered the courtyard.' }] });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const records = run.controller.snapshot().canonicalRecords;
    expect(records.length).toBeGreaterThan(0);
    await run.controller.addCorrection(run.story.id, { kind: 'mark-incorrect', reason: 'Reject the interpretation.', targetRecordIds: records.map(record => record.id) });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const branch = await run.controller.alterFate(run.story.id, 2, 'Meet a friend.', async () => undefined);
    await run.controller.replayStory(branch.id);
    const branchRecords = run.controller.snapshot().canonicalRecords.filter(record => record.storyId === branch.id && record.sourceEventId);
    expect(branchRecords.length).toBeGreaterThan(0);
    expect(branchRecords.every(record => !!record.supersededAt)).toBe(true);
  });
});
