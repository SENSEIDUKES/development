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

it('matches the Full card: format mark on the art, then title, creator, genre | chapters | status and Branching beneath', () => {
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
  expect(open.getAttribute('aria-label')).toBe('Open The Last Lotus, 24 chapters, creator SENSEI, format Novel, Draft');
  expect(open.getAttribute('aria-pressed')).toBe('true');
  expect(card.querySelector('.world-card-ribbon')?.textContent).toBe('SEN');
  // On the art: the format mark (opening the story information) and the sash; no lettering.
  expect(card.querySelector('.world-card-base-format')?.getAttribute('aria-label')).toBe('Story information for The Last Lotus, Novel');
  expect(card.querySelector('.world-card-base-media')?.textContent).not.toContain('SENSEI');
  expect(card.querySelector('.motion-picture-control')).toBeNull();
  const tile = container.querySelector('[data-world-card-tile="compact"]')!;
  expect(tile.getAttribute('data-cover-shape')).toBe('square');
  expect(tile.querySelector('.world-card-caption h3')?.textContent).toBe(world.title);
  expect(tile.querySelector('.world-card-caption-creator [data-element="lightning"]')?.textContent).toContain('SENSEI');
  expect(tile.querySelector('.world-card-caption-details')?.textContent).toBe('Xianxia | Ch. 24 | Draft');
  expect(tile.querySelector('.world-card-caption-features')?.textContent).toBe('Branching');
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
  expect(container.querySelector('.world-card-caption-details')?.textContent).toBe('Ch. 24 | Draft');
  expect(container.querySelector('.world-card-caption-creator')).toBeNull();
  act(() => root.unmount());
  container.remove();
});
