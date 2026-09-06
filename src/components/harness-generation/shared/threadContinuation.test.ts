import { describe, expect, it, vi } from 'vitest';
import { appendHarnessCorrection, buildCanonicalStoryView } from './canonicalState';
import { compileHarnessContext } from './context';
import { HarnessGenerationController } from './controller';
import { InMemoryHarnessGenerationRepository } from './repository';
import type { HarnessGenerationRequest, HarnessGenerationResponse } from './types';

const chapterReply = (state: 'open' | 'resolved', supported = true): HarnessGenerationResponse => {
  const prose = state === 'open' ? 'The gate remained sealed. Opening it remained their task.'
    : 'They opened the gate. Their task was resolved.';
  return { rawProviderResponse: JSON.stringify({ prose, title: 'The gate', memory: { threads: [{
    description: state === 'open' ? 'Opening the gate remains unresolved.' : 'The gate task is resolved.',
    subjects: [{ name: 'Open the gate', kind: 'plot-thread' }], significance: 'major',
    evidence: supported ? prose : 'This passage does not exist.', facts: { state },
  }] } }), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-06', usage: { source: 'unavailable' } } };
};

const setup = async (...replies: HarnessGenerationResponse[]) => {
  let tick = 0;
  const repository = new InMemoryHarnessGenerationRepository();
  const generate = vi.fn(async (_request: HarnessGenerationRequest) => {
    const reply = replies.shift();
    if (!reply) throw new Error('Unexpected model call.');
    return reply;
  });
  const modelAdapter = { generate,
    getServerInfo: async () => ({ provider: 'gemini' as const, configured: true, models: [], defaultModel: 'fixture' }) };
  const controller = new HarnessGenerationController({ repository, modelAdapter, runtime: {
    createId: prefix => `${prefix}_${++tick}`,
    now: () => new Date(Date.UTC(2026, 8, 6, 0, 0, tick++)).toISOString(),
  } });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'Open the gate.' });
  return { controller, repository, modelAdapter, generate, story };
};

describe('Current thread state and continuation', () => {
  it('keeps history but stops handing a resolved task forward, including after replay and reload', async () => {
    const { controller, repository, modelAdapter, generate, story } = await setup(chapterReply('open'), chapterReply('resolved'), chapterReply('open'));
    await controller.generateNextChapter(story.id, 'fixture');
    await controller.generateNextChapter(story.id, 'fixture');
    const beforeReplay = controller.snapshot();
    await controller.replayStory(story.id, beforeReplay.chapters[0].id);
    const reloaded = new HarnessGenerationController({ repository, modelAdapter });
    await reloaded.hydrate();
    const state = reloaded.snapshot();
    const view = buildCanonicalStoryView(state, story.id);
    expect(view.threads.map(thread => thread.facts.state)).toEqual(['open', 'resolved']);
    expect(view.currentThreads.map(thread => thread.facts.state)).toEqual(['resolved']);
    expect(state.events).toEqual(beforeReplay.events);
    expect(state.chapters).toEqual(beforeReplay.chapters);
    const context = compileHarnessContext(state, state.stories[0], state.foundations[0], 'next');
    expect(context.canonicalContext!.records.filter(record => record.kind === 'plot-thread').map(record => record.facts.state)).toEqual(['resolved']);
    expect(context.canonicalContext!.handoff).toEqual([]);
    expect(context.selectionAudit!.omitted.some(item => item.reason.startsWith('Historical or unsupported thread state'))).toBe(true);
    await reloaded.generateNextChapter(story.id, 'fixture');
    expect(generate.mock.calls[2][0].context.canonicalContext!.handoff).toEqual([]);
    // A later, evidenced reopening is legitimate; closure is not permanent deletion.
    expect(buildCanonicalStoryView(reloaded.snapshot(), story.id).currentThreads[0].facts.state).toBe('open');
  });

  it('does not let an unsupported closure override an established open thread', async () => {
    const { controller, story } = await setup(chapterReply('open'), chapterReply('resolved', false));
    await controller.generateNextChapter(story.id, 'fixture');
    await controller.generateNextChapter(story.id, 'fixture');
    const state = controller.snapshot();
    const view = buildCanonicalStoryView(state, story.id);
    expect(view.threads.some(record => record.confidence === 'unresolved')).toBe(true);
    expect(view.currentThreads.map(record => record.facts.state)).toEqual(['open']);
    const context = compileHarnessContext(state, state.stories[0], state.foundations[0], 'next');
    expect(context.canonicalContext!.handoff.map(item => item.description)).toEqual(['Opening the gate remains unresolved.']);
  });

  it('handles legacy exact labels, explicit corrections, and separate identities without deleting evidence', async () => {
    const { controller, story } = await setup(chapterReply('open'), chapterReply('resolved'));
    await controller.generateNextChapter(story.id, 'fixture');
    await controller.generateNextChapter(story.id, 'fixture');
    const state = controller.snapshot();
    const history = buildCanonicalStoryView(state, story.id).threads;
    history[0].entityId = undefined;
    expect(buildCanonicalStoryView(state, story.id).currentThreads.map(record => record.facts.state)).toEqual(['resolved']);
    const corrected = appendHarnessCorrection(state, story.id, { kind: 'correct-fact',
      reason: 'The gate is still sealed.', targetRecordIds: [history[1].id],
      replacement: { kind: 'plot-thread', label: 'Open the gate', evidence: 'The author confirms the gate remains sealed.', facts: { state: 'open' } } });
    expect(buildCanonicalStoryView(corrected.state, story.id).currentThreads[0].sourceCorrectionId).toBe(corrected.correction.id);
    state.canonicalRecords.push({ ...history[1], id: 'different-thread', entityId: 'different-entity', facts: { state: 'open' } });
    const current = buildCanonicalStoryView(state, story.id).currentThreads;
    expect(current.some(record => record.entityId === 'different-entity')).toBe(true);
    expect(current.some(record => record.entityId === history[1].entityId)).toBe(true);
  });
});
