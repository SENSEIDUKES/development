// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import { HarnessGenerationController, HarnessReaderSession, type HarnessArcRequest, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ARC_ONE = { arcNumber: 1, goals: [{ id: 'arc-1-name', text: 'Reclaim her name.', chapters: 30 }] };
const LOOKAHEAD = 'LOOKAHEAD_HIDDEN Mara walks the drowned law to its source.';
const receipt = { provider: 'gemini' as const, model: 'test-model', generatedAt: '2026-10-01T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const chapter = (title: string) => JSON.stringify({
  title, paragraphs: [`${title} opens on the causeway.`],
  arcCompletion: { goalId: 'none', completed: false, evidence: '' }, recap: `${title}.`, chapterFunction: 'progression',
  nextProgression: 'Mara climbs.', nextWorldBuilding: 'The law is old.', nextConflict: 'The wardens close in.',
});

/** A story whose Arc 1 is written to its end, so its next chapter, 31, begins Arc 2. */
const atArcTwo = async (survival = false) => {
  const arcOperation = vi.fn(async (_request: HarnessArcRequest) => ({ providerReceipt: receipt, rawProviderResponse: JSON.stringify({
    plan: { goals: [{ text: 'Find the keeper of the drowned law.', chapters: 18 }, { text: 'Reclaim her name before the tide court.', chapters: 12 }] },
    lookahead: [], destinedEnding: 'Mara reclaims her name.',
  }) }));
  const generate = vi.fn(async () => ({ rawProviderResponse: writtenChapterReply(chapter(`Chapter ${generate.mock.calls.length}`)), providerReceipt: receipt }));
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'test-model', label: 'Test' }], defaultModel: 'test-model' }),
    generate, arcOperation,
  };
  const first = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter: adapter });
  await first.hydrate();
  const created = await first.createStory({ premise: 'A courier returns to the drowned city that erased her name.', destinedEnding: 'Mara reclaims her name.',
    initialArcPlan: ARC_ONE, plannedArcCount: 2, initialArcLookahead: [{ arcNumber: 2, direction: LOOKAHEAD }],
    ...(survival ? { fateSurvival: { enabled: true } } : {}) });
  if (survival) await first.chooseChapterDirection(created.id, { kind: 'reader', text: 'Mara rows in.' });
  await first.generateNextChapter(created.id, 'test-model');
  const saved = first.snapshot();
  saved.stories[0].head.nextChapterNumber = 31;
  saved.stories[0].goalCompletions = [{ arcNumber: 1, goalId: 'arc-1-name', goalText: 'Reclaim her name.', chapterNumber: 30, evidence: '', outcome: 'missed' }];
  const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter: adapter });
  await controller.hydrate();
  return { controller, storyId: created.id, arcOperation, generate };
};

/** A host like the Library: it follows the controller and plans and writes with its model. */
function Host({ controller, storyId }: { controller: HarnessGenerationController; storyId: string }) {
  const [state, setState] = useState(controller.snapshot());
  useEffect(() => { const stop = controller.subscribe(setState); return () => { stop(); }; }, [controller]);
  return <HarnessReaderSession state={state} storyId={storyId} controller={controller} onClose={() => undefined}
    onGenerateNextChapter={async () => { await controller.generateNextChapter(storyId, 'test-model'); }}
    onPlanArc={async () => { await controller.planNextArc(storyId, 'test-model'); }} />;
}

let container: HTMLDivElement;
let root: Root;
const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const buttonNamed = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')]
  .find(button => button.textContent?.trim() === text || button.getAttribute('aria-label') === text);
const click = async (text: string) => {
  const target = buttonNamed(text);
  expect(target, `Expected the “${text}” button`).toBeTruthy();
  await act(async () => { target!.click(); });
  await flush();
};
const page = () => document.querySelector<HTMLElement>('[data-testid="blueprint-arc-page"]');

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('The World Blueprint reappears when a new arc begins', { timeout: 20_000 }, () => {
  it('Regular Reader: Next opens Arc 2 in the Blueprint, plans it, and accepting it writes Chapter 31', async () => {
    const run = await atArcTwo();
    await act(async () => { root.render(renderWithDevAudio(<Host controller={run.controller} storyId={run.storyId} />)); });
    await flush();
    // Nothing is planned until the reader begins the arc.
    expect(run.arcOperation).not.toHaveBeenCalled();
    await click('Next Chapter: Arc 2 begins');
    expect(page()!.textContent).toContain('World Blueprint');
    expect(page()!.textContent).toContain('Arc 2 of 2 · the final arc');
    expect(run.arcOperation).toHaveBeenCalledTimes(1);
    expect(run.arcOperation.mock.calls[0][0].planning?.previousArcs).toEqual([{ arcNumber: 1, goals: [{ text: 'Reclaim her name.', outcome: 'missed' }] }]);
    const goals = document.querySelector('[data-testid="blueprint-arc-goals"]')!;
    expect(goals.textContent).toContain('Find the keeper of the drowned law.');
    expect(goals.textContent).toContain('Chapters 31–48');
    // The look-ahead is the planner's alone.
    expect(container.textContent).not.toContain('LOOKAHEAD_HIDDEN');

    await click('Accept and write Chapter 31');
    await flush();
    expect(page()).toBeNull();
    expect(run.controller.snapshot().stories[0].arcGoalReviews?.find(review => review.arcNumber === 2)).toMatchObject({ edited: false });
    expect(document.querySelector('[data-chapter-number="31"]')).toBeTruthy();
    expect(run.generate).toHaveBeenCalledTimes(2);
  });

  it('Regular Reader: an edit is the review, and the next button writes the chapter', async () => {
    const run = await atArcTwo();
    await act(async () => { root.render(renderWithDevAudio(<Host controller={run.controller} storyId={run.storyId} />)); });
    await flush();
    await click('Next Chapter: Arc 2 begins');
    await click('Edit Arc 2 goals');
    const input = document.querySelector<HTMLInputElement>('[data-testid="blueprint-arc-goals"] fieldset input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Find the ferryman who keeps the law.');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click('Save goals');
    expect(run.controller.snapshot().stories[0].arcGoalReviews?.find(review => review.arcNumber === 2)).toMatchObject({ edited: true });
    await click('Write Chapter 31');
    await flush();
    expect(document.querySelector('[data-chapter-number="31"]')).toBeTruthy();
  });

  it('Fate Survival: accepting the arc opens the direction for its first chapter', async () => {
    const run = await atArcTwo(true);
    await act(async () => { root.render(renderWithDevAudio(<Host controller={run.controller} storyId={run.storyId} />)); });
    await flush();
    await click('Next Chapter: Arc 2 begins');
    expect(buttonNamed('Edit Arc 2 goals (one time)')).toBeTruthy();
    await click('Accept and direct Chapter 31');
    expect(document.querySelector('[data-testid="fate-page"]')).toBeTruthy();
    expect(run.generate).toHaveBeenCalledTimes(1);
    expect(run.controller.snapshot().stories[0].arcGoalReviews?.find(review => review.arcNumber === 2)).toMatchObject({ edited: false });
  });

  it('says so when planning fails and plans again on request; the Fate page leads to the same step', async () => {
    const run = await atArcTwo();
    run.arcOperation.mockRejectedValueOnce(new Error('The planner is resting.'));
    await act(async () => { root.render(renderWithDevAudio(<Host controller={run.controller} storyId={run.storyId} />)); });
    await flush();
    await click('Open Fate');
    expect(document.querySelector('[data-testid="fate-arc-goal"]')!.textContent).toContain("Arc 2's goals are planned when it begins");
    await click('Begin Arc 2');
    expect(document.querySelector('[role="alert"]')!.textContent).toContain('The planner is resting.');
    await click('Plan Arc 2 again');
    expect(document.querySelector('[data-testid="blueprint-arc-goals"]')!.textContent).toContain('Find the keeper of the drowned law.');
    expect(run.arcOperation).toHaveBeenCalledTimes(2);
  });
});
