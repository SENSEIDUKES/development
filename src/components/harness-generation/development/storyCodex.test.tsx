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
      'The armory was cold. [[appears: Old Wu | character]] A stooped smith stood by the forge. [[@Old Wu]] "Take what you can carry," the smith said.',
      '[[appears: MC | character]] Ye Chen, lean and dark-haired, came to the racks. [[appears: Rusted Iron Sword | thing]] [[gained: MC | Rusted Iron Sword]] Ye Chen lifted the old blade from the rack. [[equipped: MC | Rusted Iron Sword]] He tested its weight.',
      '[[learning: MC | Cloud Step]] Ye Chen began to practise the footwork. [[improved: MC | Cloud Step | First Stage]] By dusk his feet found the first stage.',
    ],
    mainCharacterHoldings: ['Rusted Iron Sword', 'Cloud Step', 'Silver Bell'],
  },
  {
    paragraphs: ['Morning came. [[@MC]] "Again," Ye Chen said.', '[[lost: MC | Jade Sword]] He dropped a jade sword he had never owned.'],
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
    arcOperation: vi.fn(),
    // The look step writes each look down from its passage.
    describeLooks: async request => ({ providerReceipt: receipt, rawProviderResponse: JSON.stringify({ looks: request.subjects.map(subject => (
      subject.name === 'Ye Chen' ? { id: subject.id, summary: 'A lean young man with dark hair.', traits: { build: 'lean', hair: 'dark' } }
        : subject.entity === 'thing' ? { id: subject.id, summary: 'An old iron blade, rusted along its edge.', traits: { material: 'iron', condition: 'rusted' } }
          : { id: subject.id, summary: 'A stooped old smith.', traits: { build: 'stooped' } })) }) }),
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
  it('shows who the story has met, what they carry and can do, and their first words', async () => {
    const { controller, storyId } = await start();
    const entryOf = (name: string) => controller.snapshot().codexEntries.find(entry => entry.name === name)!.id;
    await openCodex();
    const roster = [...codex()!.querySelectorAll<HTMLElement>('[data-testid="codex-character"]')];
    // The main character leads; everyone who stepped onto the page is met.
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
    expect(sheet.querySelector('[aria-label="Ye Chen: Equipped"]')!.textContent).toContain('Rusted Iron Sword');
    // A stage reached while still learning is shown, and is a change, not a check.
    expect(sheet.querySelector('[aria-label="Ye Chen: Abilities"]')!.textContent).toContain('Learning · First Stage');
    expect(sheet.querySelector('[data-testid="codex-voice"] blockquote')!.textContent).toBe('"Again,"');
    // Before anything asks for a look, the Codex shows the story's own words for it.
    expect(sheet.querySelector('[data-testid="codex-look-description"]')!.textContent).toContain('Ye Chen');
    // A look written on demand, kept on the entry.
    await act(async () => { await controller.describeCodexLook(storyId, entryOf('Ye Chen')); });
    await flush();
    const look = codex()!.querySelector<HTMLElement>('[data-testid="codex-look"]')!;
    expect(look.textContent).toContain('A lean young man with dark hair.');
    expect(codex()!.querySelector('[data-testid="codex-look-description"]')).toBeNull();
    expect(look.textContent).toContain('Buildlean');
    expect(look.querySelector('button')!.textContent).toBe('Look · Ch. 1');
    // The jade sword was never held, so losing it is a check, not a change.
    expect(codex()!.querySelector('[data-testid="codex-profile"]')!.textContent).not.toContain('Jade Sword');
    expect(codex()!.querySelector('[data-testid="codex-chronicle"] summary')!.textContent).toBe('Chronicle (4)');

    await click(button => button.textContent?.trim() === 'All characters', 'All characters');
    expect(codex()!.querySelector('[data-testid="codex-profile"]')).toBeNull();

    await act(async () => { await controller.describeCodexLook(storyId, entryOf('Rusted Iron Sword')); });
    await tab('Items');
    const item = codex()!.querySelector<HTMLElement>('[data-testid="codex-item"]')!;
    expect(item.textContent).toContain('Rusted Iron Sword');
    expect(item.textContent).toContain('Ye Chen · in hand');
    await act(async () => { item.click(); });
    expect(codex()!.querySelector('[data-testid="codex-look"]')!.textContent).toContain('An old iron blade, rusted along its edge.');
    await click(button => button.textContent?.trim() === 'All items', 'All items');
    const checks = codex()!.querySelector<HTMLElement>('[data-testid="codex-checks"]')!;
    expect(checks.querySelector('summary')!.textContent).toBe('Record checks (2)');
    expect(checks.textContent).toContain('Chapter 1: the writer\'s closing list for Ye Chen includes ‘Silver Bell’, which no tag recorded.');
    expect(checks.textContent).toContain('Chapter 2: Ye Chen loses ‘Jade Sword’, which the record does not show them holding.');
  });

  it('moves the chapter behind it to a fact\'s passage and lights it, with the Codex still open', async () => {
    await start();
    await openCodex();
    await act(async () => { codex()!.querySelector<HTMLElement>('[data-testid="codex-character"]')!.click(); });
    expect(panel()!.getAttribute('data-stop')).toBe('full');
    const scrolled = vi.mocked(Element.prototype.scrollIntoView);
    scrolled.mockClear();
    await click(button => button.getAttribute('aria-label')?.startsWith('Ch. 1 · took up') ?? false, 'the took-up link');
    // It asks first: Stay keeps the reader's place, Go moves the chapter.
    expect(codex()!.querySelector('[data-testid="codex-go-confirm"]')!.textContent).toContain('Go to Chapter 1?');
    expect(scrolled).not.toHaveBeenCalled();
    await click(button => button.textContent?.trim() === 'Stay', 'Stay');
    expect(codex()!.querySelector('[data-testid="codex-go-confirm"]')).toBeNull();
    expect(scrolled).not.toHaveBeenCalled();
    await click(button => button.getAttribute('aria-label')?.startsWith('Ch. 1 · took up') ?? false, 'the took-up link');
    await click(button => button.textContent?.trim() === 'Go', 'Go');
    // The Codex stays, lowered so the chapter shows above it.
    expect(codex()).toBeTruthy();
    expect(panel()!.getAttribute('data-stop')).toBe('half');
    expect(document.querySelector('[data-chapter-number="1"]')).toBeTruthy();
    // The paragraph where the sword was taken up is brought into view, and lit.
    const paragraph = document.querySelector<HTMLElement>('[data-sen-text-block="c1-p2"]')!;
    expect(paragraph.textContent).toContain('He tested its weight.');
    expect(scrolled.mock.contexts).toContain(paragraph);
    expect(paragraph.hasAttribute('data-codex-lit')).toBe(true);
  });
});
