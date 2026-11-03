// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorldCardCompactPicks, WorldCardCompactTile, type WorldCardCompactWorld } from './WorldCardCompactTile';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const world = (index: number): WorldCardCompactWorld => ({ id: `w${index}`, title: `World ${index}`, genre: 'Xianxia', imageUrl: `/w${index}.png` });

it('shows the cover, title and one line with nothing on the art, and opens on one tap', () => {
  const onOpen = vi.fn();
  act(() => root.render(<WorldCardCompactTile world={world(1)} onOpen={onOpen} />));
  const tile = container.querySelector<HTMLButtonElement>('[data-world-card="compact-tile"]')!;
  expect(tile.querySelector('img')?.getAttribute('src')).toBe('/w1.png');
  expect(tile.querySelector('.world-card-compact-tile-title')?.textContent).toBe('World 1');
  expect(tile.querySelector('.world-card-compact-tile-detail')?.textContent).toBe('Xianxia');
  expect(tile.getAttribute('aria-label')).toBe('Open World 1, Xianxia');
  // No badges, buttons or motion on the art: the tile is a single door.
  expect(tile.querySelectorAll('button, video, .world-card-base-format')).toHaveLength(0);
  act(() => tile.click());
  expect(onOpen).toHaveBeenCalledOnce();

  // The host can say something else on that line, or nothing.
  act(() => root.render(<WorldCardCompactTile world={world(1)} detail="442 / 1373" onOpen={() => {}} />));
  expect(container.querySelector('.world-card-compact-tile-detail')?.textContent).toBe('442 / 1373');
  act(() => root.render(<WorldCardCompactTile world={world(1)} detail={null} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-compact-tile-detail')).toBeNull();
});

it('deals a fixed set of eight and switches to the next set, wrapping around', () => {
  const worlds = Array.from({ length: 10 }, (_, index) => world(index));
  act(() => root.render(<WorldCardCompactPicks title="Cheering Reads" worlds={worlds} onOpenWorld={() => {}} />));
  const titles = () => [...container.querySelectorAll('.world-card-compact-tile-title')].map(title => title.textContent);
  expect(titles()).toEqual(['World 0', 'World 1', 'World 2', 'World 3', 'World 4', 'World 5', 'World 6', 'World 7']);
  act(() => container.querySelector<HTMLButtonElement>('.world-card-compact-picks-switch')!.click());
  expect(titles()).toEqual(['World 8', 'World 9', 'World 0', 'World 1', 'World 2', 'World 3', 'World 4', 'World 5']);

  // With no more than a set, there is nothing to switch to.
  act(() => root.render(<WorldCardCompactPicks title="Cheering Reads" worlds={worlds.slice(0, 8)} onOpenWorld={() => {}} />));
  expect(container.querySelector('.world-card-compact-picks-switch')).toBeNull();
});
