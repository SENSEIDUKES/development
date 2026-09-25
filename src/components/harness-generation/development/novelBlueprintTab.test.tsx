// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
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
  generate: vi.fn(async request => { requests.push(structuredClone(request)); return reply({ title: 'The Quarry', paragraphs: ['Ye Chen hauled stone in the quarry.'] }); }),
  arcOperation: vi.fn(async () => reply({})),
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
    expect(container.querySelectorAll('li[data-testid^="novel-arc-"]')).toHaveLength(3);
    expect(container.querySelector('[data-testid="novel-arc-goal-rules"]')!.textContent).toContain('while this novel is private');

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

  it('Regular Reader: edits an upcoming arc from the Blueprint as a future revision', async () => {
    const { repository } = await startNovel(false);
    await openBlueprint(repository);
    await act(async () => button('Edit Arc 2 goals')!.click());
    const goal = container.querySelector<HTMLInputElement>('[data-testid="novel-arc-2"] fieldset input')!;
    await act(async () => setValue(goal, 'Reach the inner sect through the back gate.'));
    await act(async () => button('Save goals')!.click());
    const story = repository.snapshot().stories[0];
    expect(story.arcPlans?.at(-1)).toMatchObject({ reason: 'edit', effectiveChapter: 1, plan: { arcNumber: 2, goals: [{ text: 'Reach the inner sect through the back gate.' }, {}, {}] } });
  });

  it('Fate Survival: presents the next arc for its one-time review before it begins', async () => {
    const { repository, controller, story } = await startNovel(true);
    const state = controller.snapshot();
    state.stories[0].head.nextChapterNumber = 101;
    state.stories[0].goalCompletions = state.stories[0].arcPlans![0].plan.goals.map(goal => ({ arcNumber: 1, goalId: goal.id, goalText: goal.text, chapterNumber: 100, evidence: 'done' }));
    const atArc2 = new InMemoryHarnessGenerationRepository(state);
    await openBlueprint(atArc2);
    expect(container.querySelector('[data-testid="novel-arc-goal-rules"]')!.textContent).toContain('set once, immediately before that arc begins');
    expect(container.querySelector('[data-testid="novel-arc-1"]')!.textContent).toContain('Completed');
    expect(container.querySelector('[data-testid="novel-arc-2"]')!.textContent).toContain('Awaiting your review');
    expect(container.querySelector('[data-testid="novel-arc-3"]')!.textContent).toContain('immediately before it begins');
    expect(button('Edit Arc 3 goals (one time)')).toBeUndefined();
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
