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

it('uses the shared image card with only a title and the chapter/status badge', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onOpen = vi.fn();

  act(() => root.render(<WorldCard face="compact" world={world} selected onOpen={onOpen} />));
  const card = container.querySelector<HTMLElement>('[data-world-card="compact"]')!;
  expect(card.classList.contains('world-card-base')).toBe(true);
  expect(card.getAttribute('data-selected')).toBe('true');
  expect(card.getAttribute('aria-pressed')).toBeNull();
  expect(card.getAttribute('aria-label')).toContain('Ch. 24 · Draft');
  expect(card.getAttribute('aria-label')).not.toContain('creator SENSEI');
  expect(card.querySelector('.world-card-base-title')?.textContent).toBe(world.title);
  expect(card.querySelector('.world-card-base-details')?.getAttribute('data-slot')).toBe('badge');
  expect(card.querySelector('.world-card-base-details')?.textContent).toBe('Ch. 24Draft');
  expect(card.querySelectorAll('.world-card-base-details svg')).toHaveLength(2);
  expect(card.querySelector('.world-card-base-creator')).toBeNull();
  expect(card.querySelector('.world-card-base-format')).toBeNull();
  expect(card.querySelector('.motion-picture-control')).toBeNull();
  act(() => card.click());
  expect(onOpen).toHaveBeenCalledOnce();

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
  expect(container.querySelector('.world-card-base-details')?.textContent).toBe('Ch. 24Draft');
  expect(container.querySelector('.world-card-base-creator')).toBeNull();
  act(() => root.unmount());
  container.remove();
});
