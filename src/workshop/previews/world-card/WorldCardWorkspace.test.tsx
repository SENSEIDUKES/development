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
  activity: 'active-this-week', cardStatus: 'public-ongoing', destinations: 'all', reading: 'start', blueprint: 'creator',
};

it('opens either Compact world in the existing Info stage and returns to the cards', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="compact" state={state} reference={false} onAction={vi.fn()} />
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
    <WorldCardStage view="info" state={state} reference={false} onAction={onAction} />
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
    <WorldCardStage view="info" state={{ ...state, destinations: 'none', reading: 'chapter-7' }} reference={false} onAction={onAction} />
  </LibraryPresentationProvider>));
  expect(container.querySelector('[data-world-info-chapters="static"]')).not.toBeNull();
  expect(container.querySelector('[role="button"][data-world-info-chapters]')).toBeNull();
  expect(container.querySelector('[aria-label^="Codex"]')).toBeNull();
  expect(container.querySelector('[aria-label^="Fate Timeline"]')).toBeNull();

  // A new story with no chapters: the reading pill starts it.
  act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage view="info" state={{ ...state, reading: 'new-story' }} reference={false} onAction={onAction} />
  </LibraryPresentationProvider>));
  const start = container.querySelector<HTMLElement>('[data-world-info-chapters="action"]')!;
  expect(container.querySelector('[data-world-info-meta]')?.textContent).toContain('No chapters yet');
  expect(start.textContent).toBe('Begin Story');
  act(() => start.click());
  expect(onAction).toHaveBeenLastCalledWith('Start story The Last Lotus of the Jade Empire');

  act(() => root.unmount());
  container.remove();
});

it('opens the Blueprint from World Info in each view: creator edits, a reader views and copies only when allowed', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onAction = vi.fn();
  const render = (blueprint: WorldCardPreviewState['blueprint']) => act(() => root.render(<LibraryPresentationProvider>
    <WorldCardStage key={blueprint} view="info" state={{ ...state, blueprint }} reference={false} onAction={onAction} />
  </LibraryPresentationProvider>));
  const openBlueprint = () => act(() => container.querySelector<HTMLButtonElement>('.world-card-info-blueprint')!.click());

  render('creator');
  openBlueprint();
  const page = container.querySelector<HTMLElement>('[data-story-blueprint]')!;
  expect(page.getAttribute('data-blueprint-editable')).toBe('true');
  expect(page.querySelector('[data-testid="novel-blueprint-editor"]')?.getAttribute('data-read-only')).toBeNull();
  expect([...page.querySelectorAll('button')].some(button => button.textContent?.includes('Save Blueprint'))).toBe(true);

  render('creator-shared');
  openBlueprint();
  expect(container.querySelector('[data-story-blueprint]')?.getAttribute('data-blueprint-editable')).toBe('false');
  expect(container.querySelector('[data-testid="story-blueprint-access"]')?.textContent).toContain('no longer private');

  render('reader-view');
  openBlueprint();
  expect(container.querySelector('[data-testid="novel-blueprint-editor"]')?.getAttribute('data-read-only')).toBe('true');
  expect(container.querySelector('[data-testid="story-blueprint-access"]')?.textContent).toContain('has not allowed copying');
  expect([...container.querySelectorAll('button')].some(button => button.textContent?.includes('Copy Blueprint'))).toBe(false);

  // Sharing turned off: a reader sees no Blueprint button at all.
  render('reader-off');
  expect(container.querySelector('[data-world-card="info"]')).not.toBeNull();
  expect(container.querySelector('.world-card-info-blueprint')).toBeNull();

  render('reader-copy');
  openBlueprint();
  const copy = [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Copy Blueprint'))!;
  await act(async () => copy.click());
  expect(onAction).toHaveBeenLastCalledWith('Blueprint copied from The Last Lotus of the Jade Empire to your Story Seeds');
  expect(container.querySelector('[data-story-blueprint] [role="status"]')?.textContent).toContain('waiting in Create');
  // Back returns to World Info.
  act(() => container.querySelector<HTMLButtonElement>('[aria-label="Back to World Info"]')!.click());
  expect(container.querySelector('[data-world-card="info"]')).not.toBeNull();

  act(() => root.unmount());
  container.remove();
});
