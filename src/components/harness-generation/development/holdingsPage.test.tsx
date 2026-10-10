// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import { HarnessGenerationController, HarnessReaderSession, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const plan = { arcNumber: 1, goals: [{ id: 'arc-1-armory', text: 'Survive the armory trial.', chapters: 30 }] };
const receipt = { provider: 'gemini' as const, model: 'test-model', generatedAt: '2026-10-03T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const replies = [
  {
    paragraphs: [
      'The armory was cold.',
      '[[gained: MC | Rusted Iron Sword]] Ye Chen lifted the old blade from the rack. [[equipped: MC | Rusted Iron Sword]] He tested its weight.',
      '[[learning: MC | Cloud Step]] Ye Chen began to practise the footwork. [[improved: MC | Cloud Step | First Stage]] By dusk his feet found the first stage.',
    ],
    mainCharacterHoldings: ['Rusted Iron Sword', 'Cloud Step', 'Silver Bell'],
  },
  {
    paragraphs: ['Morning came.', '[[lost: MC | Jade Sword]] He dropped a jade sword he had never owned.'],
    mainCharacterHoldings: ['Rusted Iron Sword', 'Cloud Step'],
  },
];
const chapterReply = (n: number) => JSON.stringify({
  title: `Chapter ${n}`, ...replies[n - 1],
  arcCompletion: { goalId: 'arc-1-armory', completed: false, evidence: '' }, recap: `Day ${n} in the armory.`, chapterFunction: 'progression',
  nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The armory\'s past.', nextConflict: 'A rival arrives.',
});

let container: HTMLDivElement;
let root: Root;
const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const buttonBy = (predicate: (button: HTMLButtonElement) => boolean) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(predicate);
const click = async (predicate: (button: HTMLButtonElement) => boolean, label: string) => {
  const target = buttonBy(predicate);
  expect(target, `Expected ${label}`).toBeTruthy();
  await act(async () => { target!.click(); });
  await flush();
};
const byLabel = (label: string) => (button: HTMLButtonElement) => button.getAttribute('aria-label') === label;
const page = () => document.querySelector<HTMLElement>('[data-testid="holdings-page"]');

function Host({ controller, storyId }: { controller: HarnessGenerationController; storyId: string }) {
  const [state, setState] = useState(controller.snapshot());
  useEffect(() => { const stop = controller.subscribe(setState); return () => { stop(); }; }, [controller]);
  return <HarnessReaderSession state={state} storyId={storyId} controller={controller} onClose={() => undefined} />;
}

const start = async () => {
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'test-model', label: 'Test' }], defaultModel: 'test-model' }),
    generate: async request => ({ rawProviderResponse: writtenChapterReply(chapterReply(request.immediateChapterRequest.chapterNumber)), providerReceipt: receipt }),
    arcOperation: vi.fn(),
  };
  const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'Ye Chen survives the armory trial.', destinedEnding: 'Ye Chen masters the armory.', initialArcPlan: plan,
    cast: [{ name: 'Ye Chen', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }] });
  await controller.generateNextChapter(story.id, 'test-model');
  await controller.generateNextChapter(story.id, 'test-model');
  await act(async () => { root.render(renderWithDevAudio(<Host controller={controller} storyId={story.id} />)); });
  await flush();
  return { controller, storyId: story.id };
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('The Holdings page in the HARNESS Reader', { timeout: 20_000 }, () => {
  it('lists what each character has now, with the chapter behind each change and the checks worth testing', async () => {
    await start();
    await click(byLabel('Open Holdings'), 'Open Holdings');
    const holdings = page()!;
    expect(holdings).toBeTruthy();
    const card = holdings.querySelector('[data-testid="holdings-character"]')!;
    expect(card.textContent).toContain('Ye Chen');
    expect(card.textContent).toContain('Main character');
    expect(card.querySelector('[aria-label="Ye Chen: In hand"]')!.textContent).toContain('Rusted Iron Sword');
    // A stage reached while still learning is shown, and is a change, not a check.
    expect(card.querySelector('[aria-label="Ye Chen: Learning"]')!.textContent).toContain('Cloud Step · First Stage');
    expect([...card.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Ch. 1 · gained', 'Ch. 1 · took up', 'Ch. 1 · began learning', 'Ch. 1 · improved → First Stage']);
    // The jade sword was never held, so losing it is a check, not a change.
    expect(card.textContent).not.toContain('Jade Sword');
    const checks = holdings.querySelector('[data-testid="holdings-checks"]')!;
    expect(checks.querySelector('summary')!.textContent).toBe('Checks (2)');
    expect(checks.textContent).toContain('Chapter 1: the writer\'s closing list for Ye Chen includes ‘Silver Bell’, which no tag recorded.');
    expect(checks.textContent).toContain('Chapter 2: Ye Chen loses ‘Jade Sword’, which the record does not show them holding.');
  });

  it('opens the passage behind a change in the Reader, and returns to reading', async () => {
    await start();
    await click(byLabel('Open Holdings'), 'Open Holdings');
    const scrolled = vi.mocked(Element.prototype.scrollIntoView);
    scrolled.mockClear();
    await click(button => button.getAttribute('aria-label')?.startsWith('Ch. 1 · took up') ?? false, 'the took-up link');
    expect(page()).toBeNull();
    expect(document.querySelector('[data-chapter-number="1"]')).toBeTruthy();
    // The paragraph where the sword was taken up is brought into view.
    const paragraph = document.querySelector('[data-sen-text-block="c1-p2"]')!;
    expect(paragraph.textContent).toContain('He tested its weight.');
    expect(scrolled.mock.contexts).toContain(paragraph);

    await click(byLabel('Open Holdings'), 'Open Holdings');
    await click(button => button.textContent === 'Back to reading', 'Back to reading');
    expect(page()).toBeNull();
    expect(document.querySelector('[data-testid="harness-reader"]')).toBeTruthy();
  });
});
