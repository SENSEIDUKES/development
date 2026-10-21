// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import { HarnessGenerationController, HarnessReaderSession, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import { plannedChapter } from '../../../test-utils/chapterPlan';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const plan = { arcNumber: 1, goals: [{ id: 'arc-1-armory', text: 'Survive the armory trial.', chapters: 30 }] };
const receipt = { provider: 'gemini' as const, model: 'test-model', generatedAt: '2026-10-03T12:00:00.000Z', usage: { source: 'unavailable' as const } };
// Each chapter's plan: who is on the page, with a look for someone new, and what happens, with the facts it changes.
const plans = [
  {
    cast: [
      { name: 'MC', kind: 'character', gender: 'male', age: 'young', look: { summary: 'A lean young man with dark hair.', traits: { build: 'lean', hair: 'dark' } } },
      { name: 'Old Wu', kind: 'character', who: 'The armory\'s smith.', gender: 'male', age: 'elder', look: { summary: 'A stooped old smith.', traits: { build: 'stooped' } } },
      { name: 'Rusted Iron Sword', kind: 'thing', look: { summary: 'An old iron blade, rusted along its edge.', traits: { material: 'iron', condition: 'rusted' } } },
    ],
    events: [
      { kind: 'gain', actor: 'MC', targets: ['Rusted Iron Sword'], presses: [], how: 'Ye Chen lifts the old blade from the rack and tests its weight.', facts: [
        { type: 'holding', who: 'MC', change: 'gains', what: 'Rusted Iron Sword' },
        { type: 'holding', who: 'MC', change: 'equips', what: 'Rusted Iron Sword' },
      ] },
      { kind: 'training', actor: 'MC', targets: [], presses: [{ who: 'MC', level: 'light' }], how: 'Ye Chen practises the footwork until his feet find its first stage.', facts: [
        { type: 'holding', who: 'MC', change: 'learning', what: 'Cloud Step' },
        { type: 'holding', who: 'MC', change: 'improves', what: 'Cloud Step', level: 'First Stage' },
      ] },
    ],
    arcGoalReached: { reached: false }, chapterFunction: 'progression',
  },
  {
    cast: [{ name: 'MC', kind: 'character' }],
    events: [{ kind: 'loss', actor: 'MC', targets: [], presses: [], how: 'Ye Chen drops a jade sword.', facts: [{ type: 'holding', who: 'MC', change: 'loses', what: 'Jade Sword' }] }],
    arcGoalReached: { reached: false }, chapterFunction: 'progression',
  },
];
const replies = [
  [
    'The armory was cold. [[@Old Wu]] "Take what you can carry," the smith said.',
    'Ye Chen came to the racks and lifted the old blade from the rack. He tested its weight.',
    'Ye Chen began to practise the footwork. By dusk his feet found the first stage.',
  ],
  ['Morning came. [[@MC]] "Again," Ye Chen said.', 'He went back to the racks.'],
];
const chapterReply = (n: number) => JSON.stringify({
  title: `Chapter ${n}`, paragraphs: replies[n - 1], recap: `Day ${n} in the armory.`,
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
const codex = () => document.querySelector<HTMLElement>('[data-testid="story-codex"]');
const panel = () => document.querySelector<HTMLElement>('[data-testid="reader-panel-codex"]');
const openCodex = () => click(byLabel('Open Codex'), 'Open Codex');
const tab = (label: string) => click(button => button.getAttribute('role') === 'tab' && Boolean(button.textContent?.startsWith(label)), `the ${label} tab`);

function Host({ controller, storyId }: { controller: HarnessGenerationController; storyId: string }) {
  const [state, setState] = useState(controller.snapshot());
  useEffect(() => { const stop = controller.subscribe(setState); return () => { stop(); }; }, [controller]);
  return <HarnessReaderSession state={state} storyId={storyId} controller={controller} onClose={() => undefined} />;
}

const start = async () => {
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'test-model', label: 'Test' }], defaultModel: 'test-model' }),
    generate: async request => ({ rawProviderResponse: writtenChapterReply(chapterReply(request.immediateChapterRequest.chapterNumber)), providerReceipt: receipt }),
    planChapter: async request => plannedChapter(plans[request.immediateChapterRequest.chapterNumber - 1]),
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

describe('The Codex in the HARNESS Reader', { timeout: 20_000 }, () => {
  it('shows who the story has met, from its plans: their looks, what they carry and can do, and their first words', async () => {
    const { controller } = await start();
    const entryOf = (name: string) => controller.snapshot().codexEntries.find(entry => entry.name === name)!.id;
    await openCodex();
    const roster = [...codex()!.querySelectorAll<HTMLElement>('[data-testid="codex-character"]')];
    // The main character leads; everyone a plan put on the page is met.
    expect(roster.map(tile => tile.textContent)).toEqual([
      expect.stringContaining('Ye Chen'),
      expect.stringContaining('Old Wu'),
    ]);
    expect(roster[1].textContent).toContain('Met in Chapter 1');

    await act(async () => { roster[0].click(); });
    const sheet = codex()!.querySelector<HTMLElement>('[data-testid="codex-profile"]')!;
    expect(sheet.querySelector('h3')!.textContent).toBe('Ye Chen');
    expect(sheet.querySelector('header')!.textContent).toContain('Unmanifested');
    expect(sheet.textContent).toContain('Main character');
    expect(sheet.querySelector('[data-testid="codex-who"]')!.textContent).toBe('Male, young');
    expect(sheet.querySelector('[aria-label="Ye Chen: Equipped"]')!.textContent).toContain('Rusted Iron Sword');
    // A stage reached while still learning is shown, and is a change, not a check.
    expect(sheet.querySelector('[aria-label="Ye Chen: Abilities"]')!.textContent).toContain('Learning · First Stage');
    expect(sheet.querySelector('[data-testid="codex-voice"] blockquote')!.textContent).toBe('"Again,"');
    // His voice, from the SEIHouse cast: given when he first spoke (his plan says he is a young man), and the reader's to change.
    const pick = sheet.querySelector<HTMLSelectElement>('select[aria-label="Voice for Ye Chen"]')!;
    expect(pick.value).toMatch(/protagonist-male$/);
    await act(async () => {
      pick.value = 'old-grandmaster-male';
      pick.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush();
    expect(controller.snapshot().codexEntries.find(entry => entry.id === entryOf('Ye Chen'))!.voice).toMatchObject({ key: 'old-grandmaster-male', chosen: 'reader' });
    expect(codex()!.querySelector('[data-testid="codex-voice-cast"]')!.textContent).toContain('Wise Old Grandmaster');
    // The look the plan that first cast him gave, with its chapter.
    const look = codex()!.querySelector<HTMLElement>('[data-testid="codex-look"]')!;
    expect(look.textContent).toContain('A lean young man with dark hair.');
    expect(look.textContent).toContain('Buildlean');
    expect(look.querySelector('button')!.textContent).toBe('Look · Ch. 1');
    // The jade sword was never held, so the checks dropped its loss before the chapter was written.
    expect(codex()!.querySelector('[data-testid="codex-profile"]')!.textContent).not.toContain('Jade Sword');
    expect(codex()!.querySelector('[data-testid="codex-chronicle"] summary')!.textContent).toBe('Chronicle (4)');

    await click(button => button.textContent?.trim() === 'All characters', 'All characters');
    expect(codex()!.querySelector('[data-testid="codex-profile"]')).toBeNull();
    await act(async () => { codex()!.querySelectorAll<HTMLElement>('[data-testid="codex-character"]')[1].click(); });
    expect(codex()!.querySelector('[data-testid="codex-who"]')!.textContent).toBe('The armory\'s smith. · Male, elder');
    await click(button => button.textContent?.trim() === 'All characters', 'All characters');

    await tab('Items');
    const item = codex()!.querySelector<HTMLElement>('[data-testid="codex-item"]')!;
    expect(item.textContent).toContain('Rusted Iron Sword');
    expect(item.textContent).toContain('Ye Chen · in hand');
    await act(async () => { item.click(); });
    expect(codex()!.querySelector('[data-testid="codex-look"]')!.textContent).toContain('An old iron blade, rusted along its edge.');
    await click(button => button.textContent?.trim() === 'All items', 'All items');
    const checks = codex()!.querySelector<HTMLElement>('[data-testid="codex-checks"]')!;
    expect(checks.querySelector('summary')!.textContent).toBe('Record checks (1)');
    expect(checks.textContent).toContain('Chapter 2: Event 1: Ye Chen loses ‘Jade Sword’, which the record does not show them holding, so the fact was dropped.');
  });

  it('moves the chapter behind it to a fact\'s chapter, or to spoken words and lights them, with the Codex still open', async () => {
    await start();
    await openCodex();
    await act(async () => { codex()!.querySelector<HTMLElement>('[data-testid="codex-character"]')!.click(); });
    expect(panel()!.getAttribute('data-stop')).toBe('full');
    const scrolled = vi.mocked(Element.prototype.scrollIntoView);
    scrolled.mockClear();
    // A fact of a plan opens its chapter. It asks first: Stay keeps the reader's place, Go moves the chapter.
    await click(button => button.getAttribute('aria-label')?.startsWith('Ch. 1 · took up') ?? false, 'the took-up link');
    expect(codex()!.querySelector('[data-testid="codex-go-confirm"]')!.textContent).toContain('Go to Chapter 1?');
    await click(button => button.textContent?.trim() === 'Stay', 'Stay');
    expect(codex()!.querySelector('[data-testid="codex-go-confirm"]')).toBeNull();
    expect(scrolled).not.toHaveBeenCalled();
    await click(button => button.getAttribute('aria-label')?.startsWith('Ch. 1 · took up') ?? false, 'the took-up link');
    await click(button => button.textContent?.trim() === 'Go', 'Go');
    // The Codex stays, lowered so the chapter shows above it.
    expect(codex()).toBeTruthy();
    expect(panel()!.getAttribute('data-stop')).toBe('half');
    expect(document.querySelector('[data-chapter-number="1"]')).toBeTruthy();
    expect(document.querySelector('[data-codex-lit]')).toBeNull();

    // Spoken words sit on their paragraph: it is brought into view, and lit.
    await click(button => button.textContent?.trim() === 'All characters', 'All characters');
    await act(async () => { codex()!.querySelectorAll<HTMLElement>('[data-testid="codex-character"]')[1].click(); });
    await click(button => button.getAttribute('aria-label')?.startsWith('Ch. 1. Read the passage: "Take what you can carry,"') ?? false, 'Old Wu\'s first words');
    await click(button => button.textContent?.trim() === 'Go', 'Go');
    const paragraph = document.querySelector<HTMLElement>('[data-sen-text-block="c1-p1"]')!;
    expect(paragraph.textContent).toContain('Take what you can carry');
    expect(scrolled.mock.contexts).toContain(paragraph);
    expect(paragraph.hasAttribute('data-codex-lit')).toBe(true);
  });
});
