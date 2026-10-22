// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { StoryCodex } from './StoryCodex';
import type { CodexCharacter, CodexItem, CodexPictureCard, CodexPictures, StoryCodexRecord } from '../shared/storyCodex';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Manifest on a Codex card: one picture from the look the record wrote down, worn by the card at once. */

const passage = { chapterNumber: 1, blockId: 'c1-p1', text: 'Then.' };
const look = { summary: 'A heavy black-iron broadsword veined with red.', traits: { material: 'black iron', colour: 'red veins' }, passage };
const sword: CodexItem = { key: 'sword', name: 'Crimson Broadsword', count: 1, equipped: false, events: [], firstSeen: passage, appearance: { first: passage, look, changes: [] } };
const voiceOnly: CodexCharacter = { key: 'wu', name: 'Old Wu', mainCharacter: false, firstSeen: passage, things: [], abilities: [], chronicle: [] };
const codex: StoryCodexRecord = { characters: [voiceOnly], factions: [], abilities: [], places: [], species: [], checks: [], items: [sword] };

const render = async (pictures?: CodexPictures) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<StoryCodex codex={codex} storyTitle="Blade" pictures={pictures} />));
  const click = (element: Element | null) => act(async () => (element as HTMLElement).click());
  const tab = (label: string) => click([...container.querySelectorAll('[role="tab"]')].find(entry => entry.textContent?.startsWith(label))!);
  return { container, root, click, tab, rerender: (next: CodexPictures) => act(async () => root.render(<StoryCodex codex={codex} storyTitle="Blade" pictures={next} />)) };
};

it('makes the picture from the card\'s look, shows it making, and the card wears it', async () => {
  const kept: Record<string, string> = {};
  let finish!: () => void;
  const manifest = vi.fn((card: CodexPictureCard) => new Promise<void>(resolve => { finish = () => { kept[card.key] = 'blob:sword'; resolve(); }; }));
  const pictures = (): CodexPictures => ({ pictureOf: key => kept[key], manifest });
  const view = await render(pictures());
  await view.tab('Items');
  await view.click(view.container.querySelector('[data-testid="codex-item"]'));
  const button = () => view.container.querySelector<HTMLButtonElement>('[data-testid="codex-manifest"] button')!;
  expect(button().textContent).toBe('Manifest');
  await view.click(button());
  expect(manifest).toHaveBeenCalledWith({ key: 'sword', subject: 'thing', name: 'Crimson Broadsword', look: { summary: look.summary, traits: look.traits } });
  expect(button().textContent).toBe('Manifesting…');
  expect(button().disabled).toBe(true);
  expect(view.container.querySelector('[data-testid="codex-profile"] header')!.textContent).toContain('Manifesting');
  await act(async () => finish());
  await view.rerender(pictures());
  expect(view.container.querySelector<HTMLImageElement>('[data-testid="codex-profile"] header img')!.src).toBe('blob:sword');
  expect(button().textContent).toBe('Manifest again');
  // Back in the gallery, the card wears it.
  await view.click([...view.container.querySelectorAll('button')].find(entry => entry.textContent?.includes('All items'))!);
  expect(view.container.querySelector<HTMLImageElement>('[data-testid="codex-item"] img')!.src).toBe('blob:sword');
  act(() => view.root.unmount());
});

it('says why a picture could not be made, and lets the reader try again', async () => {
  const manifest = vi.fn<CodexPictures['manifest']>().mockRejectedValueOnce(new Error('The picture could not be made. Nothing was changed; please try again.')).mockResolvedValue();
  const view = await render({ pictureOf: () => undefined, manifest });
  await view.tab('Items');
  await view.click(view.container.querySelector('[data-testid="codex-item"]'));
  await view.click(view.container.querySelector('[data-testid="codex-manifest"] button'));
  expect(view.container.querySelector('[data-testid="codex-manifest"] [role="alert"]')!.textContent).toBe('The picture could not be made. Nothing was changed; please try again.');
  await view.click(view.container.querySelector('[data-testid="codex-manifest"] button'));
  expect(manifest).toHaveBeenCalledTimes(2);
  expect(view.container.querySelector('[data-testid="codex-manifest"] [role="alert"]')).toBeNull();
  act(() => view.root.unmount());
});

it('writes the look again when the story has changed it, rather than falling back to the world\'s older line', async () => {
  const manifest = vi.fn<CodexPictures['manifest']>().mockResolvedValue();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const stale: CodexCharacter = {
    key: 'chen', name: 'Ye Chen', mainCharacter: true, firstSeen: passage, things: [], abilities: [], chronicle: [],
    atChapterZero: [{ slot: { id: 'appearance', label: 'Look', test: 'artist', changes: true, asks: 'how they look' }, value: 'Lean and wiry, unscarred.' }],
    appearance: { first: passage, look: { ...look, summary: 'Lean and wiry, unscarred.' }, lookStale: true, changes: [] },
  };
  const world: StoryCodexRecord = { ...codex, characters: [stale] };
  await act(async () => root.render(<StoryCodex codex={world} storyTitle="Ashes" pictures={{ pictureOf: () => undefined, manifest }} />));
  await act(async () => (container.querySelector('[data-testid="codex-character"]') as HTMLElement).click());
  await act(async () => (container.querySelector('[data-testid="codex-manifest"] button') as HTMLElement).click());
  // No look travels, so the host writes a current one from the story's passages.
  expect(manifest).toHaveBeenCalledWith({ key: 'chen', subject: 'character', name: 'Ye Chen' });
  act(() => root.unmount());
});

it('writes the look from the chapter that showed them, rather than the world\'s opening line', async () => {
  const manifest = vi.fn<CodexPictures['manifest']>().mockResolvedValue();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  // Shown on the page, with no look written down yet: the normal state right
  // after a first appearance. The chapter's passages are the better evidence.
  const shown: CodexCharacter = {
    key: 'chen', name: 'Ye Chen', mainCharacter: true, firstSeen: passage, things: [], abilities: [], chronicle: [],
    atChapterZero: [{ slot: { id: 'appearance', label: 'Look', test: 'artist', changes: true, asks: 'how they look' }, value: 'Lean and wiry, unscarred.' }],
    appearance: { first: passage, changes: [] },
  };
  const world: StoryCodexRecord = { ...codex, characters: [shown] };
  await act(async () => root.render(<StoryCodex codex={world} storyTitle="Ashes" pictures={{ pictureOf: () => undefined, manifest }} />));
  await act(async () => (container.querySelector('[data-testid="codex-character"]') as HTMLElement).click());
  await act(async () => (container.querySelector('[data-testid="codex-manifest"] button') as HTMLElement).click());
  expect(manifest).toHaveBeenCalledWith({ key: 'chen', subject: 'character', name: 'Ye Chen' });
  act(() => root.unmount());
});

it('manifests a card from the look the world opened with, before any chapter', async () => {
  const manifest = vi.fn<CodexPictures['manifest']>().mockResolvedValue();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const appearance = 'Lean and wiry, with a burn scar across one palm.';
  const chen: CodexCharacter = {
    key: 'chen', name: 'Ye Chen', mainCharacter: true, things: [], abilities: [], chronicle: [],
    atChapterZero: [{ slot: { id: 'appearance', label: 'Look', test: 'artist', changes: true, asks: 'how they look' }, value: appearance }],
  };
  const world: StoryCodexRecord = { ...codex, characters: [chen] };
  await act(async () => root.render(<StoryCodex codex={world} storyTitle="Ashes" pictures={{ pictureOf: () => undefined, manifest }} />));
  await act(async () => (container.querySelector('[data-testid="codex-character"]') as HTMLElement).click());
  await act(async () => (container.querySelector('[data-testid="codex-manifest"] button') as HTMLElement).click());
  expect(manifest).toHaveBeenCalledWith({ key: 'chen', subject: 'character', name: 'Ye Chen', look: { summary: appearance, traits: {} } });
  act(() => root.unmount());
});

it('waits for a look before it can manifest, and offers nothing without the host\'s pictures', async () => {
  const view = await render({ pictureOf: () => undefined, manifest: vi.fn() });
  await view.click(view.container.querySelector('[data-testid="codex-character"]'));
  expect(view.container.querySelector('[data-testid="codex-manifest"]')).toBeNull();
  expect(view.container.querySelector('[data-testid="codex-manifest-waits"]')!.textContent).toBe('Manifest waits until the story writes down how Old Wu looks.');
  act(() => view.root.unmount());

  const without = await render();
  await without.tab('Items');
  await without.click(without.container.querySelector('[data-testid="codex-item"]'));
  expect(without.container.querySelector('[data-testid="codex-manifest"], [data-testid="codex-manifest-waits"]')).toBeNull();
  expect(without.container.querySelector('[data-testid="codex-profile"] header')!.textContent).toContain('Unmanifested');
  act(() => without.root.unmount());
});
