// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import { FatePage, HarnessGenerationController, HarnessReaderSession, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type StoryFoundationInput } from '@seihouse/sen/harness-generation';

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
const byLabel = (label: string) => (button: HTMLButtonElement) => button.getAttribute('aria-label') === label;
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

const createModel = () => {
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
  return { requests, failNext: () => failures.push(1), modelAdapter };
};

const start = async (foundation: Partial<StoryFoundationInput>, prepare?: (controller: HarnessGenerationController, storyId: string) => Promise<void>, { openFate = true } = {}) => {
  const model = createModel();
  const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter: model.modelAdapter });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'A courier returns to the drowned city that erased her name.',
    destinedEnding: ENDING, initialArcPlan: plan, ...foundation });
  await prepare?.(controller, story.id);
  await act(async () => { root.render(renderWithDevAudio(<Host controller={controller} storyId={story.id} />)); });
  await flush();
  if (openFate) {
    // The Reader header's Alter Fate opens the Fate page.
    await click(byLabel('Quick Actions'), 'Quick Actions');
    await click(button => button.textContent?.trim() === 'Alter Fate', 'Alter Fate');
    expect(fatePage()).toBeTruthy();
  }
  return { controller, storyId: story.id, requests: model.requests, failNext: model.failNext };
};

/** The Reader turns the page with an exit animation; wait until this chapter's prose is on screen. */
const showsChapter = async (chapterNumber: number) => {
  for (let index = 0; index < 30 && !container.querySelector(`[data-reader-anchor^="${chapterNumber}:"]`); index++) await flush(100);
  expect(container.textContent).toContain(`Mara walked the causeway on day ${chapterNumber}.`);
};

/** The bottom bar's Next. At the newest chapter it names the action it runs. */
const nextChapterButton = () => buttonBy(button => button.getAttribute('aria-label')?.startsWith('Next Chapter') ?? false)!;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('The Fate page in the HARNESS Reader', { timeout: 20_000 }, () => {
  it('Regular Reader: fate decides by default, four paths intervene for one chapter, and the choice clears once written', async () => {
    const run = await start({}, async (controller, storyId) => { await controller.generateNextChapter(storyId, 'test-model'); });
    const page = fatePage();
    expect(page.textContent).toContain('Regular Reader');
    expect(page.textContent).toContain(ENDING);
    expect(page.textContent).toContain('Guaranteed as the story\'s standing direction');
    expect(page.textContent).toContain('A missed goal puts the story off track, but never fails its fate.');
    expect(page.querySelector('[data-testid="fate-arc-goal"]')!.textContent).toContain('Ring the drowned bells again.');
    expect(page.textContent).toContain('Chapter 1 followed: Fate chose Progression');
    // "Let fate decide" is the default; the writer's three suggestions and the reader's own direction are the four ways to intervene.
    const chooser = page.querySelector('[data-testid="fate-path-chooser"]')!;
    const radios = [...chooser.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios.map(input => input.value)).toEqual(['fate', 'progression', 'worldBuilding', 'conflict', 'reader']);
    expect(radios[0].closest('label')!.textContent).toContain('Default');
    const heading = chooser.querySelector('[data-testid="fate-intervention-heading"]')!;
    expect(heading.textContent).toBe('Or intervene · four paths');
    const interventions = radios.filter(radio => heading.compareDocumentPosition(radio) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(interventions.map(input => input.value)).toEqual(['progression', 'worldBuilding', 'conflict', 'reader']);
    expect(chooser.textContent).toContain('take one of four paths');
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
    expect(page.textContent).toContain('breaks the route, and the story then closes within 5 chapters');
    // Two goals: missing one of them is half, so this goal's miss would break the route.
    expect(page.querySelector('[data-testid="fate-route"]')!.textContent).toBe('Missed in this arc: 0 of 2. One more miss breaks the route.');
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

describe('Next at the newest chapter in the HARNESS Reader', { timeout: 20_000 }, () => {
  it('Regular Reader: writes the next chapter through Rhythm and opens it; on earlier chapters Next only navigates', async () => {
    const run = await start({}, async (controller, storyId) => { await controller.generateNextChapter(storyId, 'test-model'); }, { openFate: false });
    expect(container.textContent).toContain('Mara walked the causeway on day 1.');
    expect(nextChapterButton().getAttribute('aria-label')).toBe('Next Chapter: Write Chapter 2');
    expect(nextChapterButton().disabled).toBe(false);

    await act(async () => { nextChapterButton().click(); });
    await flush();
    // Written automatically: Rhythm chose its path, and the Reader opened it.
    expect(run.requests).toHaveLength(2);
    expect(run.requests[1].immediateChapterRequest.direction).toBeUndefined();
    expect(run.requests[1].storyInformation.rhythm?.recommendedFunction).toBeDefined();
    expect(run.controller.snapshot().chapters[1].path).toMatchObject({ kind: 'automatic' });
    await showsChapter(2);
    expect(container.querySelector('[data-testid="fate-page"]')).toBeNull();
    expect(container.textContent).toContain('Write Chapter 3');

    // An existing chapter: Previous, then Next, navigates without writing.
    await click(byLabel('Previous Chapter'), 'Previous Chapter');
    await showsChapter(1);
    expect(nextChapterButton().getAttribute('aria-label')).toBe('Next Chapter');
    await click(byLabel('Next Chapter'), 'Next Chapter');
    await showsChapter(2);
    expect(run.requests).toHaveLength(2);
  });

  it('Fate Survival: goes to the direction step first, then writes that direction, retrying a failed write with it', async () => {
    const run = await start({ fateSurvival: { enabled: true } }, async (controller, storyId) => {
      await controller.acceptArcGoals(storyId, 1);
      await controller.chooseChapterDirection(storyId, { kind: 'reader', text: 'Mara wakes on the causeway.' });
      await controller.generateNextChapter(storyId, 'test-model');
    }, { openFate: false });
    expect(nextChapterButton().getAttribute('aria-label')).toBe('Next Chapter: Direct Chapter 2');
    await act(async () => { nextChapterButton().click(); });
    await flush();
    // The Fate page opens at the step the chapter waits on, ready for the reader's words.
    const textarea = fatePage().querySelector<HTMLTextAreaElement>('[data-testid="fate-path-chooser"] textarea')!;
    expect(document.activeElement).toBe(textarea);
    expect(run.requests).toHaveLength(1);
    await typeInto(textarea, 'Mara rings the first bell herself.');
    await click(byText('Set Chapter 2’s path'), 'Set path');
    await click(byText('Back to reading'), 'Back to reading');

    // With the direction given, Next writes it. A failed write keeps it for the retry.
    expect(nextChapterButton().getAttribute('aria-label')).toBe('Next Chapter: Write Chapter 2');
    run.failNext();
    await act(async () => { nextChapterButton().click(); });
    await flush();
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('Its direction is kept');
    expect(container.textContent).toContain('Mara walked the causeway on day 1.');
    expect(run.controller.snapshot().stories[0].nextChapterDirection?.choice).toEqual({ kind: 'reader', text: 'Mara rings the first bell herself.' });

    await act(async () => { nextChapterButton().click(); });
    await flush();
    expect(run.requests.slice(-2).map(request => request.immediateChapterRequest.direction?.choice))
      .toEqual([{ kind: 'reader', text: 'Mara rings the first bell herself.' }, { kind: 'reader', text: 'Mara rings the first bell herself.' }]);
    await showsChapter(2);
    expect(run.controller.snapshot().stories[0].nextChapterDirection).toBeUndefined();
    // Chapter 3 waits on a new direction.
    expect(nextChapterButton().getAttribute('aria-label')).toBe('Next Chapter: Direct Chapter 3');
  });
});

describe('Where the route stands on the Fate page', { timeout: 20_000 }, () => {
  /** Saves the story at a later chapter with its goals resolved, then shows its Fate page. */
  const showFateAt = async (foundation: Partial<StoryFoundationInput>, nextChapterNumber: number, resolved: Array<{ goalId: string; chapterNumber: number; outcome?: 'missed' }>,
    extra: (story: ReturnType<HarnessGenerationController['snapshot']>['stories'][number]) => void = () => undefined) => {
    const model = createModel();
    const repository = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository, modelAdapter: model.modelAdapter });
    await setup.hydrate();
    await setup.createStory({ premise: 'A courier returns to the drowned city that erased her name.', destinedEnding: ENDING,
      arcRoadmap: [plan], plannedArcCount: 1, ...foundation });
    const saved = setup.snapshot();
    saved.stories[0].head.nextChapterNumber = nextChapterNumber;
    saved.stories[0].goalCompletions = resolved.map(goal => ({ arcNumber: 1, goalId: goal.goalId, goalText: plan.goals.find(item => item.id === goal.goalId)!.text,
      chapterNumber: goal.chapterNumber, evidence: goal.outcome ? '' : 'evidence', ...(goal.outcome ? { outcome: goal.outcome } : {}) }));
    extra(saved.stories[0]);
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter: model.modelAdapter });
    await controller.hydrate();
    await act(async () => { root.render(<FatePage state={controller.snapshot()} storyId={saved.stories[0].id} controller={controller} onBack={() => undefined} />); });
    await flush();
    return fatePage();
  };

  it('Regular Reader past a missed final goal: off track, still pursuing the same Destined Ending', async () => {
    const page = await showFateAt({}, 101, [{ goalId: 'arc-1-bells', chapterNumber: 20 }, { goalId: 'arc-1-name', chapterNumber: 100, outcome: 'missed' }]);
    const card = page.querySelector('[data-testid="fate-arc-goal"]')!;
    expect(card.textContent).toContain('The final goal was missed in Chapter 100');
    expect(card.textContent).toContain('Reclaim her name.');
    expect(card.querySelector('[data-testid="fate-arc-goal-status"]')!.textContent).toContain('keeps pursuing its Destined Ending past the roadmap');
    expect(page.textContent).not.toContain('planned arcs are written');
    expect(page.querySelector('[data-testid="fate-path-chooser"]')!.textContent).toContain('Chapter 101 follows fate unless you choose otherwise.');
  });

  it('Fate Survival with a broken route: the closing stretch, still directed by the reader, then how it ended', async () => {
    const brokenRoute = { chapterNumber: 20, arcNumber: 1, reason: 'arc-goals-missed' as const, goalsInArc: 2, closingChapterLimit: 5, recordedAt: 'then',
      missedGoals: [{ goalId: 'arc-1-bells', text: 'Ring the drowned bells again.', chapterNumber: 20 }] };
    const page = await showFateAt({ fateSurvival: { enabled: true } }, 22, [{ goalId: 'arc-1-bells', chapterNumber: 20, outcome: 'missed' }],
      story => { story.brokenRoute = brokenRoute; });
    const card = page.querySelector('[data-testid="fate-arc-goal"]')!;
    expect(card.textContent).toContain('Route broken');
    expect(card.textContent).toContain('1 of Arc 1\'s 2 goals were missed by Chapter 20');
    expect(card.querySelector('[data-testid="fate-arc-goal-status"]')!.textContent).toBe('Chapter 22 is closing chapter 2 of 5. The story ends as soon as the prose earns it.');
    expect(page.querySelector('[data-testid="fate-path-chooser"]')!.textContent).toContain('You still direct each closing chapter');

    const closed = await showFateAt({ fateSurvival: { enabled: true } }, 26, [{ goalId: 'arc-1-bells', chapterNumber: 20, outcome: 'missed' }], story => {
      story.brokenRoute = brokenRoute;
      story.conclusion = { outcome: 'fate-failed', reason: 'closing-limit-reached', chapterNumber: 25, evidence: '', recordedAt: 'now' };
    });
    expect(closed.querySelector('[data-testid="fate-conclusion"]')!.textContent).toContain('The route had broken, and the story closed in Chapter 25, the last of its closing chapters.');
    expect(closed.querySelector('[data-testid="fate-path-chooser"]')).toBeNull();
  });
});
