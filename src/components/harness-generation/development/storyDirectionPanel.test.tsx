// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { HarnessGenerationController, harnessArcContext, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import { HarnessGenerationWorkspace } from '@seihouse/library/generation';
import { type ArcPlan } from '@seihouse/sen/arc-goals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const plan: ArcPlan = { arcNumber: 1, goals: [
  { id: 'arc-1-gate', text: 'Reach the mountain gate.', chapters: 10 },
  { id: 'arc-1-trial', text: 'Pass the sect trial.', chapters: 90 },
] };

const reply = (body: unknown) => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } } });

const modelAdapter: HarnessGenerationModelAdapter = {
  getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'fixture', label: 'Fixture' }], defaultModel: 'fixture' }),
  generate: vi.fn(async () => reply({
    title: 'Ashes', paragraphs: ['Yi Chen climbed toward the Azure Sect gate.'], arcCompletion: { goalId: 'arc-1-gate', completed: false, evidence: '' },
    recap: 'Yi Chen reached the gate at dusk.', chapterFunction: 'worldBuilding',
    nextProgression: 'Yi Chen enters the outer court.', nextWorldBuilding: 'The archives reveal the founder’s oath.', nextConflict: 'A rival disciple challenges Yi Chen.',
  })),
  arcOperation: vi.fn(async () => reply({ plan, destinedEnding: 'Yi Chen leads the Azure Sect to glory.' })),
};

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const setInput = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
};
const button = (text: string) => [...container.querySelectorAll('button')]
  .find(item => item.textContent?.trim() === text || item.getAttribute('aria-label') === text)!;

describe('HARNESS story-direction sources', () => {
  it('shows the Active Arc Goal from the Arc Plan authority, the Destined Ending, Fate Pressure, rhythm, suggestions, recaps, and the Mission Reminder', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository, modelAdapter });
    await setup.hydrate();
    const story = await setup.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Yi Chen leads the Azure Sect to glory.', initialArcPlan: plan, fatePressure: 'heaven' });
    await setup.generateNextChapter(story.id, 'fixture');
    const state = setup.snapshot();
    const context = harnessArcContext(state.stories[0], state.foundations[0].input, state.stories[0].head.nextChapterNumber)!;

    await act(async () => root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter} />));

    const goal = container.querySelector('[data-testid="fate-arc-goal"]')!;
    expect(goal.textContent).toContain(`Active Arc Goal · Arc ${context.arcNumber}`);
    expect(goal.textContent).toContain('Goal 1 of 2');
    expect(goal.textContent).toContain(context.activeGoal.text);
    expect(goal.textContent).toContain(`${context.activeGoal.startChapter}–${context.activeGoal.endChapter}`);
    expect(goal.textContent).toContain('Chapter 2 · Arc 1 — Chapter 2/100');
    expect(goal.textContent).toContain(`Deadline · Chapter ${context.completionDeadline}`);
    expect(goal.textContent).toContain('8 chapters left before the deadline');
    await act(async () => button('Show the arc\'s goals').click());
    expect(goal.textContent).toContain('Pass the sect trial.');
    expect(goal.textContent).toContain('Chapters 11–100');

    const panel = container.querySelector('[data-testid="harness-story-direction"]')!;
    expect(panel.textContent).toContain('Yi Chen leads the Azure Sect to glory.');
    const fate = container.querySelector('[data-testid="harness-fate-pressure"]')!;
    expect(fate.textContent).toContain('Heaven · story value');
    expect(fate.textContent).toContain('Ch 1 · World Building');
    expect(fate.textContent).toContain('Recommended for Chapter 2');
    expect(fate.textContent).toContain(state.stories[0].rhythmRecommendation!.reason);
    // The next chapter's path: fate's pick and the writer's three ideas, and the reader's own direction.
    const paths = container.querySelector('[data-testid="fate-path-chooser"]')!;
    expect(paths.textContent).toContain('Chapter 2’s path');
    expect(paths.textContent).toContain('Let fate decide');
    expect(paths.textContent).toContain('Fate’s pick');
    expect(paths.textContent).toContain('A rival disciple challenges Yi Chen.');
    expect(paths.textContent).toContain('The archives reveal the founder’s oath.');
    expect(paths.textContent).toContain('Yi Chen enters the outer court.');
    expect(paths.textContent).toContain('Your own direction');

    expect(container.querySelector('[data-testid="harness-recap-1"]')!.textContent).toContain('Yi Chen reached the gate at dusk.');
    expect(container.textContent).toContain('Chapter function: World Building');
    expect(container.textContent).toContain('Path: Fate chose');
    expect(container.querySelector('[data-testid="harness-mission-reminder"]')!.textContent).toContain('MISSION REMINDER: You are the author of this novel');
    expect(container.textContent).toContain('Frozen Mission Reminder · not in the provider request');
  });

  it('lets the user add, save, and cap Hard Pins, and edit a saved recap', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const setup = new HarnessGenerationController({ repository, modelAdapter });
    await setup.hydrate();
    const story = await setup.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Glory.', initialArcPlan: plan });
    await setup.generateNextChapter(story.id, 'fixture');

    await act(async () => root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter} />));
    const pins = () => container.querySelector('[data-testid="harness-hard-pins"]')!;
    expect(pins().textContent).toContain('0/3 saved');
    for (let index = 0; index < 3; index += 1) await act(async () => button('Add Hard Pin').click());
    expect(button('Add Hard Pin').disabled).toBe(true);
    const inputs = pins().querySelectorAll<HTMLInputElement>('input');
    expect(inputs).toHaveLength(3);
    await act(async () => {
      setInput(inputs[0], 'Make Yi Chen take the Azure Sect to glory throughout the entire story.');
      setInput(inputs[1], 'Never kill Yi Chen’s master.');
      setInput(inputs[2], 'The Azure Sect never bows to the Empire.');
    });
    await act(async () => button('Save Hard Pins').click());
    expect(repository.snapshot().stories[0].hardPins?.map(pin => pin.text)).toEqual([
      'Make Yi Chen take the Azure Sect to glory throughout the entire story.',
      'Never kill Yi Chen’s master.',
      'The Azure Sect never bows to the Empire.',
    ]);
    expect(pins().textContent).toContain('3/3 saved');
    await act(async () => button('Remove Hard Pin 2').click());
    await act(async () => button('Save Hard Pins').click());
    expect(repository.snapshot().stories[0].hardPins?.map(pin => pin.text)).toEqual([
      'Make Yi Chen take the Azure Sect to glory throughout the entire story.',
      'The Azure Sect never bows to the Empire.',
    ]);

    await act(async () => button('Edit recap').click());
    const recap = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chapter 1 recap"]')!;
    await act(async () => setInput(recap, 'Author recap: the gate opened.'));
    await act(async () => button('Save recap').click());
    const saved = repository.snapshot().chapters[0];
    expect(saved.recap).toMatchObject({ text: 'Author recap: the gate opened.', source: 'author' });
    expect(saved.prose).toBe('Yi Chen climbed toward the Azure Sect gate.');
    expect(container.querySelector('[data-testid="harness-recap-1"]')!.textContent).toContain('edited by author');
  });
});
