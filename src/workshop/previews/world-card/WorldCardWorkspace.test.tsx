// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { WorldCardStage } from './WorldCardWorkspace';
import type { WorldCardPreviewState } from './previewData';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state: WorldCardPreviewState = {
  recentlyRead: 'no', titleLength: 'standard', cover: 'art', sash: 'hidden',
  activity: 'active-this-week', cardStatus: 'public-ongoing', destinations: 'all', reading: 'start', chapterMap: 'arcs', blueprint: 'creator', hero: 'wide', catalogue: 'sample', readerLanguage: 'en',
};

it('shows chapter and ranking menu cards in the existing workspace and opens World Info', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="menu" state={{ ...state, cover: 'missing', titleLength: 'long' }} onAction={vi.fn()} />
  </LibraryPresentationProvider>));
  const cards = container.querySelectorAll<HTMLButtonElement>('[data-world-card="menu"]');
  expect(cards).toHaveLength(2);
  expect(cards[0].textContent).toContain('Tracking');
  expect(cards[0].querySelector('time')?.dateTime).toBe('2026-10-25T12:00:00Z');
  expect(cards[1].querySelector('.world-card-menu-rank')?.textContent).toBe('1');
  act(() => cards[0].click());
  expect(container.querySelector('[data-world-card="info"]')).not.toBeNull();
  act(() => container.querySelector<HTMLButtonElement>('[aria-label="Back to cards"]')!.click());
  expect(container.querySelectorAll('[data-world-card="menu"]')).toHaveLength(2);
  act(() => root.unmount());
  container.remove();
});

it('opens either Compact world in the existing Info stage and returns to the cards', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="compact" state={state} onAction={vi.fn()} />
  </LibraryPresentationProvider>));

  act(() => container.querySelector<HTMLElement>('[data-world-card="compact"] .world-card-base-open')!.click());
  expect(container.querySelectorAll('section[aria-label="Info page"]')).toHaveLength(1);
  expect(container.querySelector('[data-world-card="info"]')).not.toBeNull();
  expect(container.querySelector('[data-world-card="info"] h1')?.textContent).toBe('The Last Lotus of the Jade Empire');
  expect(container.querySelector('[data-world-card="info"]')?.textContent).not.toContain('Views');
  expect(container.querySelector('[aria-label^="Connected media for"]')).toBeNull();
  expect(container.querySelector('[data-world-card="compact"]')).toBeNull();

  const back = container.querySelector<HTMLButtonElement>('[data-story-detail] button')!;
  expect(back.getAttribute('aria-label')).toBe('Back to cards');
  act(() => back.click());
  act(() => container.querySelectorAll<HTMLElement>('[data-world-card="compact"] .world-card-base-open')[1].click());
  expect(container.querySelectorAll('section[aria-label="Info page"]')).toHaveLength(1);
  expect(container.querySelector('[data-world-card="info"] h1')?.textContent).toBe('Ashes of the Nine Moons');
  expect(container.querySelector('[aria-label="World information"]')).toBeNull();
  expect(container.querySelector('[aria-label^="Connected media for"]')).toBeNull();

  act(() => root.unmount());
  container.remove();
});

it('keeps connected media closed in the Portal until opened and reports each supplied destination', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onAction = vi.fn();
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="info" state={state} onAction={onAction} />
  </LibraryPresentationProvider>));

  expect(container.querySelector('[aria-label^="Connected media for"]')).toBeNull();
  expect(container.querySelector('.world-expression-card')).toBeNull();
  act(() => container.querySelector<HTMLElement>('[data-world-info-chapters="action"]')!.click());
  expect(onAction).toHaveBeenLastCalledWith('Start reading The Last Lotus of the Jade Empire');
  act(() => container.querySelector<HTMLElement>('[aria-label^="Codex"]')!.click());
  expect(onAction).toHaveBeenLastCalledWith('Open Codex for The Last Lotus of the Jade Empire');
  // The Portal opens the sample world's manga and game below the cards.
  act(() => container.querySelector<HTMLButtonElement>('button.world-card-info-portal')!.click());
  expect(container.querySelectorAll('.world-expression-card')).toHaveLength(3);

  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="info" state={{ ...state, destinations: 'none', reading: 'chapter-7' }} onAction={onAction} />
  </LibraryPresentationProvider>));
  expect(container.querySelector('[data-world-info-chapters="static"]')).not.toBeNull();
  expect(container.querySelector('[role="button"][data-world-info-chapters]')).toBeNull();
  expect(container.querySelector('[aria-label^="Codex"]')).toBeNull();
  expect(container.querySelector('[aria-label^="Fate Timeline"]')).toBeNull();

  // A new story with no chapters: the reading pill starts it.
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="info" state={{ ...state, reading: 'new-story' }} onAction={onAction} />
  </LibraryPresentationProvider>));
  const start = container.querySelector<HTMLElement>('[data-world-info-chapters="action"]')!;
  expect(container.querySelector('[data-world-info-meta]')?.textContent).toContain('No chapters yet');
  expect(start.textContent).toBe('Begin Story');
  act(() => start.click());
  expect(onAction).toHaveBeenLastCalledWith('Start story The Last Lotus of the Jade Empire');

  act(() => root.unmount());
  container.remove();
});

it('offers the whole book from World Info: the chapter selector reports the chosen chapter', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onAction = vi.fn();
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="info" state={{ ...state, reading: 'chapter-7' }} onAction={onAction} />
  </LibraryPresentationProvider>));
  expect(container.querySelector('.world-card-info-blueprint')).toBeNull();
  act(() => container.querySelector<HTMLButtonElement>('button.world-card-info-chapters-button')!.click());
  // One page of ten at a time, opening on the reader's page (Chapter 7).
  let rows = [...document.querySelectorAll<HTMLButtonElement>('.world-card-chapters-row')];
  expect(rows).toHaveLength(10);
  expect(rows[6].getAttribute('aria-current')).toBe('true');
  act(() => document.querySelector<HTMLButtonElement>('button[aria-label="Next page"]')!.click());
  rows = [...document.querySelectorAll<HTMLButtonElement>('.world-card-chapters-row')];
  expect(rows[1].getAttribute('aria-label')).toMatch(/^Chapter 12/);
  act(() => rows[1].click());
  expect(onAction).toHaveBeenLastCalledWith('Open Chapter 12 of The Last Lotus of the Jade Empire');

  // With no destinations supplied, there is no selector.
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="info" state={{ ...state, destinations: 'none' }} onAction={onAction} />
  </LibraryPresentationProvider>));
  expect(container.querySelector('.world-card-info-chapters-button')).toBeNull();

  act(() => root.unmount());
  container.remove();
});
