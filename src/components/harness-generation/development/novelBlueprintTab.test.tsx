// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { asWrittenChapter } from '../../../test-utils/writtenChapter';
import { HarnessGenerationController, type HarnessGenerationModelAdapter, type HarnessGenerationRequest } from '@seihouse/sen/harness-generation';
import { HarnessGenerationWorkspace } from '@seihouse/library/generation';
import { createMockStorySeedRecord } from '../../../workshop/previews/story-seed/previewData';
import { createHarnessFoundationFromStorySeed } from '@seihouse/library/story-seed';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const requests: HarnessGenerationRequest[] = [];
const reply = (body: unknown) => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } });
const modelAdapter: HarnessGenerationModelAdapter = {
  getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [{ id: 'fixture', label: 'Fixture' }] }),
  generate: vi.fn(async request => { requests.push(structuredClone(request)); return asWrittenChapter(reply({ title: 'The Quarry', paragraphs: ['Ye Chen hauled stone in the quarry.'] })); }),
  // The arc planner's draft for the arc being begun; the HARNESS assigns its identities.
  arcOperation: vi.fn(async () => reply({ plan: { goals: [
    { text: 'Climb to the inner sect.', chapters: 18 }, { text: 'Win the sect trial.', chapters: 12 },
  ] }, lookahead: [{ arcNumber: 3, direction: 'LOOKAHEAD_A3 Ye Chen faces the sect master.' }], destinedEnding: 'unused' })),
};

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  requests.length = 0;
  window.matchMedia = vi.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

const button = (text: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === text);
const setValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

const startNovel = async (survival: boolean) => {
  const record = createMockStorySeedRecord();
  record.seed.story.optional.fateSurvival.enabled = survival;
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter });
  await controller.hydrate();
  const story = await controller.createStory(createHarnessFoundationFromStorySeed(record), 'en');
  return { repository, controller, story, record };
};

/** The story moved to Chapter 31 with Arc 1's goals all achieved, as the boundary tests do instead of writing thirty chapters. */
const arcOneFinished = (state: ReturnType<HarnessGenerationController['snapshot']>) => {
  state.stories[0].head.nextChapterNumber = 31;
  state.stories[0].goalCompletions = state.stories[0].arcPlans![0].plan.goals.map(goal => ({ arcNumber: 1, goalId: goal.id, goalText: goal.text, chapterNumber: 30, evidence: 'done' }));
  return state;
};

const openBlueprint = async (repository: InMemoryHarnessGenerationRepository) => {
  await act(async () => root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter} />));
  const story = repository.snapshot().stories[0];
  await act(async () => [...container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find(item => item.textContent?.includes(story.title))!.click());
  await act(async () => button('Blueprint')!.click());
};

describe('The novel page Blueprint tab', () => {
  it('reopens the saved Blueprint, keeps the ending fixed, and saves edits that the next chapter receives', async () => {
    const { repository, controller, story, record } = await startNovel(false);
    await controller.generateNextChapter(story.id, 'fixture');
    await openBlueprint(repository);

    expect(container.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Blueprint');
    const ending = container.querySelector('[data-testid="novel-blueprint-destined-ending"]')!;
    expect(ending.textContent).toContain(record.blueprint!.destinedEnding!);
    expect(container.querySelector('[data-testid="novel-blueprint"] #destined-ending-input')).toBeNull();
    // Only Arc 1 is planned; the rest are planned when each begins.
    expect(container.querySelectorAll('li[data-testid^="novel-arc-"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="novel-arc-unplanned"]')!.textContent).toContain('Arcs 2–3 are planned when each begins');
    expect(container.querySelector('[data-testid="novel-arc-goal-rules"]')!.textContent).toContain('While this novel is private');

    const outline = container.querySelector<HTMLTextAreaElement>('#blueprint-power-outline')!;
    await act(async () => setValue(outline, 'EDITED_OUTLINE Meridians burn brighter under starlight.'));
    await act(async () => button('Save Blueprint')!.click());
    const saved = repository.snapshot();
    expect(saved.foundations).toHaveLength(2);
    const revision = saved.foundations.at(-1)!.input;
    expect(revision.worldFacts).toContain('EDITED_OUTLINE');
    expect((revision.sourceSnapshot!.blueprint as { powerSystemOutline: string }).powerSystemOutline).toContain('EDITED_OUTLINE');
    expect(revision.destinedEnding).toBe(saved.foundations[0].input.destinedEnding);
    expect(revision.plannedArcCount).toBe(3);
    expect(saved.chapters).toHaveLength(1);
    expect(saved.chapters[0].foundationRevisionId).toBe(saved.foundations[0].id);

    await controller.hydrate();
    await controller.generateNextChapter(story.id, 'fixture');
    expect(buildHarnessGenerationPrompt(requests.at(-1)!).userPrompt).toContain('EDITED_OUTLINE');
  });

  it('Regular Reader: plans the next arc when it begins, then the reader edits it as its review', async () => {
    const { controller } = await startNovel(false);
    const atArc2 = new InMemoryHarnessGenerationRepository(arcOneFinished(controller.snapshot()));
    await openBlueprint(atArc2);
    expect(container.querySelector('[data-testid="novel-arc-plan-step"]')!.textContent).toContain('Arc 2 begins with Chapter 31');
    await act(async () => button('Plan Arc 2')!.click());
    expect(container.querySelector('[data-testid="novel-arc-plan-step"]')).toBeNull();
    expect(container.querySelector('[data-testid="novel-arc-2"]')!.textContent).toContain('Awaiting your review');
    await act(async () => button('Edit Arc 2 goals')!.click());
    const goal = container.querySelector<HTMLInputElement>('[data-testid="novel-arc-2"] fieldset input')!;
    await act(async () => setValue(goal, 'Reach the inner sect through the back gate.'));
    await act(async () => button('Save goals')!.click());
    const story = atArc2.snapshot().stories[0];
    expect(story.arcPlans?.at(-1)).toMatchObject({ reason: 'edit', effectiveChapter: 31, plan: { arcNumber: 2, goals: [{ id: 'arc-2-1', text: 'Reach the inner sect through the back gate.' }, { id: 'arc-2-2' }] } });
    expect(story.arcGoalReviews?.find(review => review.arcNumber === 2)).toMatchObject({ edited: true });
    expect(container.querySelector('[data-testid="novel-arc-2"]')!.textContent).toContain('Reviewed');
    // The planner's look-ahead is never on the reader's page.
    expect(container.textContent).not.toContain('LOOKAHEAD_A3');
  });

  it('Fate Survival: plans the next arc and presents it for its one-time review before it begins', async () => {
    const { repository, controller, story } = await startNovel(true);
    const atArc2 = new InMemoryHarnessGenerationRepository(arcOneFinished(controller.snapshot()));
    await openBlueprint(atArc2);
    expect(container.querySelector('[data-testid="novel-arc-goal-rules"]')!.textContent).toContain('set once, immediately before its first chapter');
    expect(container.querySelector('[data-testid="novel-arc-1"]')!.textContent).toContain('Completed');
    await act(async () => button('Plan Arc 2')!.click());
    expect(container.querySelector('[data-testid="novel-arc-2"]')!.textContent).toContain('Awaiting your review');
    expect(container.querySelector('[data-testid="novel-arc-unplanned"]')!.textContent).toContain('Arc 3 is planned when it begins');
    await act(async () => button('Accept Arc 2 goals as written')!.click());
    expect(atArc2.snapshot().stories[0].arcGoalReviews?.find(review => review.arcNumber === 2)).toMatchObject({ edited: false, source: 'novel-blueprint' });
    expect(container.querySelector('[data-testid="novel-arc-2"]')!.textContent).toContain('Set · locks when generation begins');
    expect(button('Edit Arc 2 goals (one time)')).toBeUndefined();
    expect(repository.snapshot().stories[0].id).toBe(story.id);
  });
});

describe('The novel Blueprint editor', () => {
  it('keeps unsaved edits when the page re-renders', async () => {
    const { repository } = await startNovel(false);
    await openBlueprint(repository);
    await act(async () => setValue(container.querySelector<HTMLTextAreaElement>('#blueprint-power-outline')!, 'UNSAVED_OUTLINE'));
    // The page re-renders (as it does on any workspace update) while the edit is unsaved.
    await act(async () => root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter} />));
    expect(container.querySelector<HTMLTextAreaElement>('#blueprint-power-outline')!.value).toBe('UNSAVED_OUTLINE');
    expect(button('Save Blueprint')!.disabled).toBe(false);
    expect(repository.snapshot().foundations).toHaveLength(1);
  });
});
