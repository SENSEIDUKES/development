// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { WorldCardStage } from './WorldCardWorkspace';
import type { WorldCardPreviewState } from './previewData';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state: WorldCardPreviewState = {
  acquisition: 'sealed', titleLength: 'standard', cover: 'art', branches: 'sample',
  activity: 'active-this-week', cardStatus: 'public-ongoing',
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
  expect(container.querySelector('[aria-label="World information"]')?.textContent).toContain('Views1,280');
  expect(container.querySelector('[aria-label="Connected media for The Last Lotus of the Jade Empire"]')).not.toBeNull();
  expect(container.querySelector('[data-world-card="compact"]')).toBeNull();

  act(() => container.querySelector<HTMLButtonElement>('section[aria-label="Info page"] > button')!.click());
  act(() => container.querySelectorAll<HTMLElement>('[data-world-card="compact"]')[1].click());
  expect(container.querySelectorAll('section[aria-label="Info page"]')).toHaveLength(1);
  expect(container.querySelector('[data-world-card="info"] h1')?.textContent).toBe('Ashes of the Nine Moons');
  expect(container.querySelector('[aria-label="World information"]')?.textContent).toContain('Views—');
  expect(container.querySelector('[aria-label^="Connected media for"]')).toBeNull();

  act(() => root.unmount());
  container.remove();
});

it('includes connected media beneath the default featured Info page', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="info" state={state} reference={false} onAction={vi.fn()} />
  </LibraryPresentationProvider>));

  const info = container.querySelector('[data-world-card="info"]')!;
  const media = container.querySelector('[aria-label="Connected media for The Last Lotus of the Jade Empire"]')!;
  expect(info.compareDocumentPosition(media) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(media.querySelectorAll('.world-expression-card')).toHaveLength(3);

  act(() => root.unmount());
  container.remove();
});
