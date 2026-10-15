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
const codex: StoryCodexRecord = { characters: [voiceOnly], factions: [], checks: [], items: [sword] };

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
