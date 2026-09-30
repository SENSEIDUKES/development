// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { WorldCardStage } from './WorldCardWorkspace';
import type { WorldCardPreviewState } from './previewData';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state: WorldCardPreviewState = {
  acquisition: 'sealed', titleLength: 'standard', cover: 'art',
  activity: 'active-this-week', cardStatus: 'public-ongoing', destinations: 'all', reading: 'start',
};

it('opens either Compact world in the existing Info stage and returns to the cards', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="compact" state={state} reference={false} onAction={vi.fn()} />
  </LibraryPresentationProvider>));

  act(() => container.querySelector<HTMLElement>('[data-world-card="compact"]')!.click());
  expect(container.querySelectorAll('section[aria-label="Info page"]')).toHaveLength(1);
  expect(container.querySelector('[data-world-card="info"]')).not.toBeNull();
  expect(container.querySelector('[data-world-card="info"] h1')?.textContent).toBe('The Last Lotus of the Jade Empire');
  expect(container.querySelector('[data-world-card="info"]')?.textContent).not.toContain('Views');
  expect(container.querySelector('[aria-label^="Connected media for"]')).toBeNull();
  expect(container.querySelector('[data-world-card="compact"]')).toBeNull();

  const back = container.querySelector<HTMLButtonElement>('[data-story-detail] button')!;
  expect(back.getAttribute('aria-label')).toBe('Back to cards');
  act(() => back.click());
  act(() => container.querySelectorAll<HTMLElement>('[data-world-card="compact"]')[1].click());
  expect(container.querySelectorAll('section[aria-label="Info page"]')).toHaveLength(1);
  expect(container.querySelector('[data-world-card="info"] h1')?.textContent).toBe('Ashes of the Nine Moons');
  expect(container.querySelector('[aria-label="World information"]')).toBeNull();
  expect(container.querySelector('[aria-label^="Connected media for"]')).toBeNull();

  act(() => root.unmount());
  container.remove();
});

it('keeps connected media off the Info page and reports each supplied destination', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onAction = vi.fn();
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="info" state={state} reference={false} onAction={onAction} />
  </LibraryPresentationProvider>));

  expect(container.querySelector('[aria-label^="Connected media for"]')).toBeNull();
  expect(container.querySelector('.world-expression-card')).toBeNull();
  act(() => container.querySelector<HTMLElement>('[data-world-info-chapters="action"]')!.click());
  expect(onAction).toHaveBeenLastCalledWith('Start reading The Last Lotus of the Jade Empire');
  act(() => container.querySelector<HTMLElement>('[aria-label^="Open Codex"]')!.click());
  expect(onAction).toHaveBeenLastCalledWith('Open Codex for The Last Lotus of the Jade Empire');

  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="info" state={{ ...state, destinations: 'none', reading: 'chapter-7' }} reference={false} onAction={onAction} />
  </LibraryPresentationProvider>));
  expect(container.querySelector('[data-world-info-chapters="static"]')).not.toBeNull();
  expect(container.querySelector('[role="button"][data-world-info-chapters]')).toBeNull();
  expect(container.querySelector('[aria-label^="Open Codex"]')).toBeNull();
  expect(container.querySelector('[aria-label^="Fate Timeline"]')).toBeNull();

  act(() => root.unmount());
  container.remove();
});
