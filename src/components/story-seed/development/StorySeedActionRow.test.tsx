// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createEmptyStorySeedInput } from '../shared/storySeedSchema';
import { StorySeedWorkspaceChrome } from './StorySeedWorkspaceChrome';

vi.mock('../../../audio/DevAudioPlayback', () => ({ useDevAudioPlayback: () => ({
  isPlaying: false, currentTrackId: null, stop: vi.fn(),
}) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true,
    value: vi.fn().mockImplementation((query: string) => ({ matches: false, media: query,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })) });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

const chrome = (overrides: Partial<React.ComponentProps<typeof StorySeedWorkspaceChrome>> = {}) => (
  <LibraryPresentationProvider>
    <StorySeedWorkspaceChrome onNavigateHome={vi.fn()}
      seed={createEmptyStorySeedInput()} updateSeed={vi.fn()} activeSection="origin" onSelectSection={vi.fn()}
      showStoryBank={false} helpOpen={false} isGenerating={false} savedFeedback={false}
      canManifest manifestLabel="Manifest World Blueprint" status="All required Story inputs complete"
      onSaveDraft={vi.fn()} onManifest={vi.fn()} onToggleStoryBank={vi.fn()} onOpenHelp={vi.fn()}
      {...overrides}
    ><form data-story-seed-form><input aria-label="Premise" /></form></StorySeedWorkspaceChrome>
  </LibraryPresentationProvider>
);
const render = async (overrides?: Partial<React.ComponentProps<typeof StorySeedWorkspaceChrome>>) => {
  await act(async () => root.render(chrome(overrides)));
};
const button = (name: string) => Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
  .find(element => (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().startsWith(name));
const click = async (element: Element) => { await act(async () => { (element as HTMLElement).click(); }); };

// Regression: a second header — the shared action toolbar — sat directly under
// the top header. Story Seed owns that row now, inside its own content.
it('regression: renders exactly one header and no toolbar row beneath it', async () => {
  await render();
  expect(container.querySelectorAll('header')).toHaveLength(1);
  expect(container.querySelectorAll('[data-slot="app-shell-header"]')).toHaveLength(1);
  expect(container.querySelector('.workspace-header-toolbar')).toBeNull();
  expect(container.querySelector('.workspace-primary-action')).toBeNull();
  expect(container.querySelector('.workspace-secondary-actions')).toBeNull();
  expect(container.querySelector('.workspace-header-status')).toBeNull();
  // The header keeps only the Library identity, Help and Search.
  const header = container.querySelector('header')!;
  expect(header.querySelector('[data-story-seed-action-row]')).toBeNull();
  expect(Array.from(header.querySelectorAll('.workspace-header-utilities button'))
    .map(element => element.getAttribute('aria-label'))).toEqual(['Help', 'Search']);
  expect(header.textContent).not.toContain('Save Draft');
  expect(header.textContent).not.toContain('Manifest');
});

it('regression: puts Save Draft, Manifest and the status in a page action row above the form', async () => {
  await render();
  const row = container.querySelector('[data-story-seed-action-row]')!;
  expect(row).not.toBeNull();
  // Content, not chrome: no banner landmark and no header element of its own.
  expect(row.closest('header')).toBeNull();
  expect(row.getAttribute('role')).toBeNull();
  expect(row.querySelector('h1, h2')).toBeNull();
  expect(row.closest('main')).not.toBeNull();
  const form = container.querySelector('[data-story-seed-form]')!;
  expect(row.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(row.querySelector('[role="status"]')?.textContent).toContain('All required Story inputs complete');
  expect(Array.from(row.querySelectorAll('button')).map(element => element.textContent?.trim()))
    .toEqual(['Save Draft', 'Manifest World Blueprint']);
  expect(button('Manifest World Blueprint')?.querySelector('[data-sen-global-icon="manifesting"]')).not.toBeNull();
});

it('regression: Save Draft and Manifest still call the page callbacks', async () => {
  const onSaveDraft = vi.fn(); const onManifest = vi.fn();
  await render({ onSaveDraft, onManifest });
  await click(button('Save Draft')!);
  expect(onSaveDraft).toHaveBeenCalledTimes(1);
  await click(button('Manifest World Blueprint')!);
  expect(onManifest).toHaveBeenCalledTimes(1);
});

it('preserves eligibility, disabled reasons, loading indicators and saved feedback', async () => {
  await render({ canManifest: false, manifestDisabledReason: 'Manifest disabled — missing: Origin' });
  const manifest = button('Manifest World Blueprint')!;
  expect(manifest.disabled).toBe(true);
  expect(manifest.getAttribute('aria-label')).toBe('Manifest World Blueprint — Manifest disabled — missing: Origin');
  expect(manifest.getAttribute('title')).toBe('Manifest disabled — missing: Origin');

  await render({ isGenerating: true, status: 'Creating your World Blueprint',
    manifestIndicator: <span data-versa-mark /> });
  expect(button('Save Draft')!.disabled).toBe(true);
  expect(container.querySelector('[data-versa-mark]')).not.toBeNull();
  const busy = container.querySelector('[data-story-seed-action-row] [role="status"]')!;
  expect(busy.getAttribute('data-tone')).toBe('busy');
  expect(busy.textContent).toContain('Creating your World Blueprint');

  await render({ savedFeedback: true, status: 'Draft saved' });
  expect(button('Saved')).not.toBeUndefined();
  expect(container.querySelector('[data-story-seed-action-row] [role="status"]')?.getAttribute('data-tone')).toBe('success');

  await render({ error: 'The seed could not be saved.' });
  const failed = container.querySelector('[data-story-seed-action-row] [role="status"]')!;
  expect(failed.getAttribute('data-tone')).toBe('error');
  expect(failed.textContent).toContain('The seed could not be saved.');
});

it('keeps ordered navigation and Help in the top header', async () => {
  const onToggleStoryBank = vi.fn(); const onOpenHelp = vi.fn();
  await render({ onToggleStoryBank, onOpenHelp });
  const bottom = container.querySelector('nav[aria-label="Story Seed navigation"]')!;
  expect(Array.from(bottom.querySelectorAll('button')).map(element => element.textContent?.trim()))
    .toEqual(['Sections', 'Story Bank', 'Settings', 'Back']);
  // The section drawer lists them too, so the desktop rail built from the same
  // definition offers them without any header command row.
  await click(Array.from(bottom.querySelectorAll('button')).find(element => element.textContent?.trim() === 'Sections')!);
  const drawer = document.querySelector('[aria-label="Story Seed sections"]')!;
  expect(drawer).not.toBeNull();
  expect(drawer.textContent).toContain('Story Bank');
  expect(drawer.textContent).toContain('Settings');
  await click(Array.from(bottom.querySelectorAll('button')).find(element => element.textContent?.trim() === 'Story Bank')!);
  expect(onToggleStoryBank).toHaveBeenCalledTimes(1);
  await click(container.querySelector('header button[aria-label="Help"]')!);
  expect(onOpenHelp).toHaveBeenCalledTimes(1);
});

it('keeps Save Draft available while the Story Bank replaces the form, without offering Manifest', async () => {
  const onSaveDraft = vi.fn();
  await render({ showStoryBank: true, onSaveDraft });
  const row = container.querySelector('[data-story-seed-action-row]')!;
  expect(Array.from(row.querySelectorAll('button')).map(element => element.textContent?.trim())).toEqual(['Save Draft']);
  await click(button('Save Draft')!);
  expect(onSaveDraft).toHaveBeenCalledTimes(1);
});


it('returns through the host Home callback with the official SEN Exit icon', async () => {
  const onNavigateHome = vi.fn();
  const historyBack = vi.spyOn(window.history, 'back');
  await render({ onNavigateHome });
  const nav = container.querySelector('nav[aria-label="Story Seed navigation"]')!;
  const back = Array.from(nav.querySelectorAll('button')).find(item => item.textContent === 'Back')!;
  expect(back.querySelector('[data-sen-global-icon="exit"]')).not.toBeNull();
  expect(back.querySelector('[data-sen-icon="header-exit"]')).not.toBeNull();
  expect(back.querySelector('img')).toBeNull();
  expect(nav.querySelector('.lucide-circle-help')).toBeNull();
  expect(container.querySelector('header .workspace-help-emblem')).not.toBeNull();
  await click(back);
  expect(onNavigateHome).toHaveBeenCalledTimes(1);
  expect(historyBack).not.toHaveBeenCalled();
});
