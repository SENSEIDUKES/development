// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { CreatorWorld } from '../../creator-space/shared/creatorSpaceContracts';
import { WorldCard } from './WorldCard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const world: CreatorWorld = {
  id: 'lotus', title: 'The Last Lotus', chapterCount: 24,
  status: 'draft', updatedAt: '2026-09-29', imageUrl: '/lotus.png',
  creatorName: 'SENSEI', creatorTitle: { element: 'lightning', intensity: 'rare' },
};

it('keeps its art clean and names the creator, alive, in its line: genre | creator | status with the branch mark', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onOpen = vi.fn();

  act(() => root.render(<WorldCard face="compact" world={{ ...world, genre: 'Xianxia', format: 'Novel', branchingEnabled: true }}
    selected senSash onOpen={onOpen} />));
  const card = container.querySelector<HTMLElement>('[data-world-card="compact"]')!;
  expect(card.classList.contains('world-card-base')).toBe(true);
  expect(card.getAttribute('data-selected')).toBe('true');
  const open = card.querySelector<HTMLButtonElement>('.world-card-base-open')!;
  expect(open.getAttribute('aria-label')).toBe('Open The Last Lotus, 24 chapters, creator SENSEI, format Novel, Draft. Press and hold for story information');
  expect(open.getAttribute('aria-pressed')).toBe('true');
  expect(card.querySelector('.world-card-ribbon')?.textContent).toBe('SEN');
  // On the art: only the sash; no name on a small cover. The story information is the keyboard's control (and a hold).
  expect(card.querySelector('.world-card-base-format')?.getAttribute('aria-label')).toBe('Story information for The Last Lotus, Novel');
  expect(card.querySelector('.world-card-cover-name')).toBeNull();
  expect(card.querySelector('.motion-picture-control')).toBeNull();
  const tile = container.querySelector('[data-world-card-tile="compact"]')!;
  expect(tile.getAttribute('data-cover-shape')).toBe('square');
  expect(tile.querySelector('.world-card-caption h3')?.textContent).toBe(world.title);
  // The creator takes the chapter count's place: a reader may begin a world at any chapter.
  expect(tile.querySelector('.world-card-caption-details .world-card-caption-creator [data-element="lightning"]')?.textContent).toContain('SENSEI');
  expect(tile.querySelector('.world-card-caption-details')?.textContent).not.toContain('Ch.');
  act(() => open.click());
  act(() => tile.querySelector<HTMLElement>('.world-card-caption')!.click());
  expect(onOpen).toHaveBeenCalledTimes(2);

  act(() => root.unmount());
  container.remove();
});

it('keeps a missing compact cover as the existing celestial wash', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<WorldCard face="compact" world={{ ...world, imageUrl: undefined, creatorName: undefined, creatorTitle: undefined }} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-compact-media img')).toBeNull();
  expect(container.textContent).not.toContain('Cover unavailable');
  expect(container.querySelector('.world-card-caption-details')?.textContent).toBe('Draft');
  expect(container.querySelector('.world-card-cover-name')).toBeNull();
  act(() => root.unmount());
  container.remove();
});
