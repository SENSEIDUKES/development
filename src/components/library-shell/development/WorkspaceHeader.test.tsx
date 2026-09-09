// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '../../library-presentation/LibraryPresentationProvider';
import { WorkspaceHeader } from './WorkspaceHeader';
import { MainLibraryHeader } from './MainLibraryHeader';
import { STORY_SEED_HELP_ITEMS } from '../../story-seed/development/storySeedHelp';

vi.mock('../../../audio/DevAudioPlayback', () => ({ useDevAudioPlayback: () => ({
  isPlaying: false, currentTrackId: null, stop: vi.fn(),
}) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: !query.includes('479px'), addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const render = async (node: React.ReactNode) => { await act(async () => root.render(<LibraryPresentationProvider>{node}</LibraryPresentationProvider>)); };
const button = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const click = async (element: HTMLElement) => { await act(async () => { element.focus(); element.click(); }); };
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); }); };
const fill = async (input: HTMLInputElement, value: string) => { await act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}); };

it('keeps logo, canonical badge, optional context, Help and Search in document order', async () => {
  await render(<WorkspaceHeader title="Long Library workspace title" emblem={{ src: '/favicon.jpg', alt: 'Library' }}
    home={{ href: '/', label: 'Home' }} contextualItem={<button>Page context</button>} />);
  const header = container.querySelector('header')!;
  expect(Array.from(header.querySelectorAll('a, button')).map(element => element.getAttribute('aria-label') ?? element.textContent)).toEqual(['Home', 'Page context', 'Help', 'Search']);
  expect(header.querySelector('[data-slot="library-header-badge-title"]')?.textContent).toBe('Long Library workspace title');
  expect(header.querySelector('.workspace-header-context')).not.toBeNull();
  expect(header.querySelector('input')).toBeNull();
  await render(<WorkspaceHeader title="Quiet page" contextualItem={false} />);
  expect(container.querySelector('.workspace-header-context')).toBeNull();
  expect(Array.from(container.querySelectorAll('button')).map(element => element.getAttribute('aria-label'))).toEqual(['Help', 'Search']);
});

it('calls the existing page Help owner and preserves preload and expanded state', async () => {
  const onAction = vi.fn(); const onIntent = vi.fn();
  await render(<WorkspaceHeader title="Story Seed" help={{ id: 'help', label: 'Help', onAction, onIntent, expanded: true }} />);
  await click(button('Help'));
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(onIntent).toHaveBeenCalled();
  expect(button('Help').getAttribute('aria-expanded')).toBe('true');
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

// Regression: Help and Search were consolidated into a "…" menu below 480px.
// They are two separate, individually visible controls again, at every width,
// and the badge title stays whole beside them.
const TEST_WIDTHS = [320, 375, 390, 430, 1440];
const stubViewport = (width: number) => vi.stubGlobal('matchMedia', (query: string) => {
  const max = /max-width:\s*(\d+)px/.exec(query);
  const min = /min-width:\s*(\d+)px/.exec(query);
  return { media: query, matches: (!max || width <= Number(max[1])) && (!min || width >= Number(min[1])),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() };
});

it.each(TEST_WIDTHS)('regression: keeps Help and Search separate at %ipx with a readable full title', async width => {
  stubViewport(width);
  const onAction = vi.fn();
  await render(<WorkspaceHeader title="Celestial Library" emblem={{ src: '/favicon.jpg', alt: 'Library' }}
    home={{ href: '/', label: 'Home' }} help={{ id: 'help', label: 'Help', onAction }} />);
  const header = container.querySelector('header')!;
  // Never a "…" consolidation: both utilities are their own visible control.
  expect(button('Header options')).toBeNull();
  expect(header.querySelector('.header-overflow')).toBeNull();
  const utilities = header.querySelector('.workspace-header-utilities')!;
  expect(Array.from(utilities.querySelectorAll('button')).map(element => element.getAttribute('aria-label')))
    .toEqual(['Help', 'Search']);
  expect(button('Help')).not.toBe(button('Search'));
  // Each keeps its own touch target rather than sharing one trigger.
  for (const control of [button('Help'), button('Search')]) expect(control.className).toContain('min-h-11');
  // Full titles stay whole: no ellipsis, no truncation of the badge plaque.
  const title = header.querySelector('[data-slot="library-header-badge-title"]')!;
  expect(title.textContent).toBe('Celestial Library');
  expect(title.textContent).not.toContain('…');
  expect(header.querySelector('[data-mode="app-header"]')).not.toBeNull();

  await click(button('Help'));
  expect(onAction).toHaveBeenCalledTimes(1);
  await click(button('Search'));
  expect(document.activeElement?.getAttribute('type')).toBe('search');
  await click(button('Close Search')); await settle();
  // Focus returns to Search itself, not to a shared overflow trigger.
  expect(document.activeElement).toBe(button('Search'));
});

it('regression: keeps the badge legibility rules that let long titles wrap instead of clipping', () => {
  const css = readFileSync(join(process.cwd(), 'src/components/library-shell/development/workspace-header.css'), 'utf8');
  const badgeTitle = css.slice(css.indexOf('[data-slot="library-header-badge-title"]'));
  expect(badgeTitle).toContain('overflow: visible');
  expect(badgeTitle).toContain('text-overflow: clip');
  expect(badgeTitle).toContain('white-space: normal');
  expect(badgeTitle).toContain('overflow-wrap: anywhere');
  // The phone type adjustment that keeps the plaque height is unchanged.
  expect(css).toContain('font-size: 13px; line-height: 14px; letter-spacing: 0.02em;');
  // Help and Search hold their own 44px targets; the pair never shrinks.
  expect(css).toContain('.workspace-header-utilities > :is(button, [role="button"]) { min-width: 44px; min-height: 44px; }');
  expect(css).not.toContain('workspace-header-utilities .header-overflow');
});

it('reuses Library Help topics and original guidance, closes with Escape and returns focus', async () => {
  await render(<WorkspaceHeader title="Cultivator Cave" />);
  await click(button('Help'));
  await act(async () => { await import('../../story-seed/development/StorySeedHelpMenu'); });
  await settle();
  const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Library Help"]')!;
  expect(dialog).not.toBeNull();
  expect(dialog.closest('header')).toBeNull();
  const topic = Array.from(dialog.querySelectorAll('button')).find(element => element.textContent?.includes('Relics'))!;
  await click(topic);
  expect(dialog.textContent).toContain(STORY_SEED_HELP_ITEMS.find(item => item.label === 'Relics')!.translations.en!.line);
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(button('Help'));
});

it('searches labels and descriptions, announces no results, resets on reopen, and dispatches once', async () => {
  const navigate = vi.fn(); const blocked = vi.fn();
  await render(<WorkspaceHeader title="Library" searchItems={[
    { id: 'profile', label: 'Celestial Profile', description: 'Manage spirit link settings', onAction: navigate },
    { id: 'blocked', label: 'Unavailable', disabled: true, onAction: blocked },
  ]} />);
  await click(button('Search'));
  const input = document.querySelector<HTMLInputElement>('input[type="search"]')!;
  expect(document.activeElement).toBe(input);
  expect(button('Unavailable').disabled).toBe(true);
  await click(button('Unavailable'));
  expect(blocked).not.toHaveBeenCalled();
  await fill(input, '  SPIRIT  ');
  expect(document.querySelector('[role="dialog"] [role="status"]')?.textContent).toBe('1 result');
  expect(button('Celestial Profile')).not.toBeNull();
  await fill(input, 'no such result');
  expect(document.querySelector('[role="dialog"] [role="status"]')?.textContent).toBe('No results');
  await click(button('Close Search')); await settle();
  expect(document.activeElement).toBe(button('Search'));
  await click(button('Search'));
  expect(document.querySelector<HTMLInputElement>('input[type="search"]')!.value).toBe('');
  await click(button('Celestial Profile')); await settle();
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it('retains Home commands, active story destinations and host effects in Search', async () => {
  const setCurrentScreen = vi.fn(); const setIsCodexSheetOpen = vi.fn();
  await render(<MainLibraryHeader adapter={{
    currentScreen: 'detail', setCurrentScreen, activeStoryId: 'story', setActiveStoryId: vi.fn(),
    syncStatus: 'idle', lastSavedTime: null, currentUser: { email: '' }, userProfile: null,
    stories: [{ id: 'story', mcName: 'Ye Chen', genre: 'Xianxia' }],
    setIsSettingsOpen: vi.fn(), setIsCodexSheetOpen, setIsShortcutsOpen: vi.fn(), copyText: vi.fn(),
    requestDao: vi.fn(),
  }} />);
  expect(container.querySelector('.workspace-header-context')).toBeNull();
  await click(button('Search'));
  expect(button('Celestial Profile').title).toBe('Open Celestial Tools');
  expect(button('Tome Chambers').textContent).toContain("Explore Ye Chen's world logs");
  expect(button('Chamber Reader')).not.toBeNull();
  expect(button('Shortcut Spells')).not.toBeNull();
  await click(button('Living Codex')); await settle();
  expect(setIsCodexSheetOpen).toHaveBeenCalledExactlyOnceWith(true);
  expect(setCurrentScreen).not.toHaveBeenCalled();
});
