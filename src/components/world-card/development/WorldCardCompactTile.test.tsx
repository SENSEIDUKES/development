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

it('shows the cover with only the Information mark, then title, creator and one line, and opens on a tap', () => {
  const onOpen = vi.fn();
  act(() => root.render(<WorldCardCompactTile world={{ ...world(1), creatorName: 'SENSEI', format: 'Novel',
    creatorTitle: { element: 'lightning', intensity: 'rare' } }} onOpen={onOpen} />));
  const tile = container.querySelector<HTMLElement>('[data-world-card="compact-tile"]')!;
  expect(tile.querySelector('img')?.getAttribute('src')).toBe('/w1.png');
  expect(tile.querySelector('.world-card-compact-tile-title')?.textContent).toBe('World 1');
  // The creator wears their animated title lettering (its layers each repeat the name).
  const creator = tile.querySelector('.world-card-compact-tile-creator')!;
  expect(creator.textContent).toContain('SENSEI');
  expect(creator.firstElementChild).not.toBeNull();
  expect(tile.querySelector('.world-card-compact-tile-detail')?.textContent).toBe('Xianxia');
  const open = tile.querySelector<HTMLButtonElement>('.world-card-compact-tile-open')!;
  expect(open.getAttribute('aria-label')).toBe('Open World 1, creator SENSEI, Xianxia');
  // The art carries only the small Information mark: no motion, no other badges.
  const info = tile.querySelector('.world-card-compact-tile-info')!;
  expect(info.getAttribute('aria-label')).toBe('Story information for World 1, Novel');
  expect(info.querySelector('svg.lucide-info')).not.toBeNull();
  expect(tile.querySelectorAll('video, .world-card-ribbon, .world-card-feature')).toHaveLength(0);
  act(() => open.click());
  act(() => tile.querySelector<HTMLElement>('.world-card-compact-tile-title')!.click());
  expect(onOpen).toHaveBeenCalledTimes(2);

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
