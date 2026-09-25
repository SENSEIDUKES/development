// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import { HarnessGenerationController, HarnessReaderSession, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type StoryFoundationInput } from '@seihouse/sen/harness-generation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ENDING = 'Mara reclaims her name from the drowned city.';
const plan = { arcNumber: 1, goals: [
  { id: 'arc-1-bells', text: 'Ring the drowned bells again.', chapters: 20 },
  { id: 'arc-1-name', text: 'Reclaim her name.', chapters: 80 },
] };
const receipt = { provider: 'gemini' as const, model: 'test-model', generatedAt: '2026-09-25T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const chapterReply = (n: number) => JSON.stringify({
  title: `Chapter ${n}`, paragraphs: [`Mara walked the causeway on day ${n}.`, 'The bells stayed silent.'],
  arcCompletion: { goalId: 'arc-1-bells', completed: false, evidence: '' }, recap: `Day ${n} on the causeway.`, chapterFunction: 'progression',
  nextProgression: 'Mara climbs the bell tower.', nextWorldBuilding: 'The keeper explains the drowned law.', nextConflict: 'The tide wardens seize the causeway.',
});

let container: HTMLDivElement;
let root: Root;
const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const buttonBy = (predicate: (button: HTMLButtonElement) => boolean) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(predicate);
const click = async (predicate: (button: HTMLButtonElement) => boolean, label: string) => {
  const target = buttonBy(predicate);
  expect(target, `Expected ${label}`).toBeTruthy();
  await act(async () => { target!.click(); });
  await flush();
};
const byText = (text: string) => (button: HTMLButtonElement) => button.textContent?.trim() === text;
const typeInto = async (element: HTMLTextAreaElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const fatePage = () => container.querySelector<HTMLElement>('[data-testid="fate-page"]')!;

/** A host like the Library workspace: it follows the controller and writes chapters with its model. */
function Host({ controller, storyId }: { controller: HarnessGenerationController; storyId: string }) {
  const [state, setState] = useState(controller.snapshot());
  useEffect(() => { const stop = controller.subscribe(setState); return () => { stop(); }; }, [controller]);
  return <HarnessReaderSession state={state} storyId={storyId} controller={controller} onClose={() => undefined}
    onGenerateNextChapter={async () => { await controller.generateNextChapter(storyId, 'test-model'); }} />;
}

const start = async (foundation: Partial<StoryFoundationInput>, prepare?: (controller: HarnessGenerationController, storyId: string) => Promise<void>) => {
  const requests: HarnessGenerationRequest[] = [];
  const failures: number[] = [];
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'test-model', label: 'Test' }], defaultModel: 'test-model' }),
    generate: async request => {
      requests.push(structuredClone(request));
      if (failures.shift()) throw new Error('The provider timed out.');
      return { rawProviderResponse: chapterReply(request.immediateChapterRequest.chapterNumber), providerReceipt: receipt };
    },
    recoverMemory: async () => ({ rawProviderResponse: JSON.stringify({ events: [] }), providerReceipt: receipt }),
    arcOperation: vi.fn(),
  };
  const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'A courier returns to the drowned city that erased her name.',
    destinedEnding: ENDING, initialArcPlan: plan, ...foundation });
  await prepare?.(controller, story.id);
  await act(async () => { root.render(renderWithDevAudio(<Host controller={controller} storyId={story.id} />)); });
  await flush();
  // The Reader header's Alter Fate opens the Fate page.
  await click(button => button.getAttribute('aria-label') === 'Quick Actions', 'Quick Actions');
  await click(button => button.textContent?.trim() === 'Alter Fate', 'Alter Fate');
  expect(fatePage()).toBeTruthy();
  return { controller, storyId: story.id, requests, failNext: () => failures.push(1) };
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('The Fate page in the HARNESS Reader', { timeout: 20_000 }, () => {
  it('Regular Reader: shows the paths, takes the reader\'s pick for one chapter, writes it, and clears it', async () => {
    const run = await start({}, async (controller, storyId) => { await controller.generateNextChapter(storyId, 'test-model'); });
    const page = fatePage();
    expect(page.textContent).toContain('Regular Reader');
    expect(page.textContent).toContain(ENDING);
    expect(page.textContent).toContain('Guaranteed.');
    expect(page.querySelector('[data-testid="fate-arc-goal"]')!.textContent).toContain('Ring the drowned bells again.');
    expect(page.textContent).toContain('Chapter 1 followed: Fate chose Progression');
    // Rhythm's automatic pick, the writer's three ideas, and the reader's own direction are the four paths.
    const chooser = page.querySelector('[data-testid="fate-path-chooser"]')!;
    expect([...chooser.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map(input => input.value))
      .toEqual(['fate', 'progression', 'worldBuilding', 'conflict', 'reader']);
    for (const idea of ['Mara climbs the bell tower.', 'The keeper explains the drowned law.', 'The tide wardens seize the causeway.']) expect(chooser.textContent).toContain(idea);
    expect(chooser.textContent).toContain('Chapter 2 follows fate unless you choose otherwise.');

    await act(async () => chooser.querySelector<HTMLInputElement>('input[value="conflict"]')!.click());
    await click(byText('Set Chapter 2’s path'), 'Set path');
    expect(fatePage().textContent).toContain('Set for Chapter 2: You chose Conflict — The tide wardens seize the causeway.');

    await click(byText('Write Chapter 2'), 'Write Chapter 2');
    await flush();
    expect(run.requests.at(-1)!.immediateChapterRequest.direction?.choice).toEqual({ kind: 'chapter-function', chapterFunction: 'conflict', suggestion: 'The tide wardens seize the causeway.' });
    expect(run.requests.at(-1)!.storyInformation.arc?.activeGoal.text).toBe('Ring the drowned bells again.');
    expect(run.requests.at(-1)!.storyInformation.storyDirection.destinedEnding).toBe(ENDING);
    expect(fatePage().textContent).toContain('Chapter 2 is written. Its direction was used and cleared.');
    expect(fatePage().textContent).toContain('Chapter 3 follows fate unless you choose otherwise.');
    expect(run.controller.snapshot().stories[0].nextChapterDirection).toBeUndefined();
    expect(run.controller.snapshot().chapters[1].path).toMatchObject({ kind: 'chapter-function', chapterFunction: 'conflict' });

    await click(byText('Read Chapter 2'), 'Read Chapter 2');
    expect(container.querySelector('[data-testid="fate-page"]')).toBeNull();
    expect(container.textContent).toContain('Mara walked the causeway on day 2.');
  });

  it('Fate Survival: asks only for the reader\'s own direction, keeps it through a failed write, and clears it once written', async () => {
    const run = await start({ fateSurvival: { enabled: true } }, async (controller, storyId) => {
      await controller.acceptArcGoals(storyId, 1);
      await controller.chooseChapterDirection(storyId, { kind: 'reader', text: 'Mara wakes on the causeway.' });
      await controller.generateNextChapter(storyId, 'test-model');
    });
    const page = fatePage();
    expect(page.textContent).toContain('Fate Survival');
    expect(page.textContent).toContain('Not guaranteed.');
    const chooser = page.querySelector('[data-testid="fate-path-chooser"]')!;
    // No generated paths: no ideas, no automatic Rhythm, only the reader's own words.
    expect(chooser.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(chooser.textContent).not.toContain('Mara climbs the bell tower.');
    expect(chooser.textContent).toContain('It cannot be written until you give one.');
    expect(buttonBy(byText('Write Chapter 2'))!.disabled).toBe(true);

    await typeInto(chooser.querySelector<HTMLTextAreaElement>('textarea')!, 'Mara cuts the bell rope and climbs.');
    await click(byText('Set Chapter 2’s path'), 'Set path');
    expect(fatePage().textContent).toContain('Set for Chapter 2: Your direction: Mara cuts the bell rope and climbs.');

    run.failNext();
    await click(byText('Write Chapter 2'), 'Write Chapter 2');
    await flush();
    expect(fatePage().querySelector('[role="alert"]')!.textContent).toContain('Its direction is kept');
    expect(run.controller.snapshot().stories[0].nextChapterDirection?.choice).toEqual({ kind: 'reader', text: 'Mara cuts the bell rope and climbs.' });

    await click(byText('Write Chapter 2'), 'Retry Chapter 2');
    await flush();
    expect(run.requests.slice(-2).map(request => request.immediateChapterRequest.direction?.choice.kind === 'reader' && request.immediateChapterRequest.direction.choice.text))
      .toEqual(['Mara cuts the bell rope and climbs.', 'Mara cuts the bell rope and climbs.']);
    expect(run.requests.at(-1)!.storyInformation.rhythm).toBeUndefined();
    expect(fatePage().textContent).toContain('Chapter 2 is written. Its direction was used and cleared.');
    expect(fatePage().textContent).toContain('Chapter 3 has no direction yet.');
    expect(run.controller.snapshot().stories[0].nextChapterDirection).toBeUndefined();
  });
});
