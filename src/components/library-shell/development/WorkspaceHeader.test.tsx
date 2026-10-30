// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { WorkspaceHeader, WorkspaceHeaderProfileProvider, WorkspaceHeaderSoundProvider } from '@seihouse/library/shell';
import { MainLibraryHeader } from './MainLibraryHeader';
import { STORY_SEED_HELP_ITEMS } from '@seihouse/library/story-seed';

vi.mock('../../../audio/playback', () => {
  const playback = () => ({ isPlaying: false, currentTrackId: null, stop: vi.fn() });
  return { useNarrativeAudio: playback, useOptionalNarrativeAudio: playback };
});
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

it('puts the host\'s sound control on every header beneath it, unless a header sets its own', async () => {
  const controls = () => Array.from(container.querySelector('header')!.querySelectorAll('button'))
    .map(element => element.getAttribute('aria-label') ?? element.textContent);
  const host = (header: React.ReactNode) => <WorkspaceHeaderSoundProvider sound={<button aria-label="Mute music">Note</button>}>{header}</WorkspaceHeaderSoundProvider>;
  // After Search and before the Profile Portrait, like a header's own sound.
  await render(host(<WorkspaceHeader title="Story Seed" />));
  expect(controls()).toEqual(['Search for stories', 'Mute music', 'Profile and preferences']);
  await render(host(<WorkspaceHeader title="Story Seed" sound={<button aria-label="Page sound">Page</button>} />));
  expect(controls()).toEqual(['Search for stories', 'Page sound', 'Profile and preferences']);
  await render(host(<WorkspaceHeader title="Story Seed" sound={null} />));
  expect(controls()).toEqual(['Search for stories', 'Profile and preferences']);
  await render(<WorkspaceHeader title="Story Seed" />);
  expect(controls()).toEqual(['Search for stories', 'Profile and preferences']);
});

it('keeps logo, Search, optional context and the Profile Portrait in document order without a header badge', async () => {
  await render(<WorkspaceHeader title="Long Library workspace title" emblem={{ src: '/favicon.jpg', alt: 'Library' }}
    home={{ href: '/', label: 'Home' }} contextualItem={<button>Page context</button>} />);
  const header = container.querySelector('header')!;
  expect(Array.from(header.querySelectorAll('a, button')).map(element => element.getAttribute('aria-label') ?? element.textContent)).toEqual(['Home', 'Search for stories', 'Page context', 'Profile and preferences']);
  expect(header.querySelector('[data-slot="library-header-badge-title"]')).toBeNull();
  expect(header.querySelector('[data-slot="novel-expanded-logo"]')).not.toBeNull();
  expect(header.querySelector('.workspace-header-context')).not.toBeNull();
  expect(header.querySelector('input')).toBeNull();
  // Search reads as a field, and the Portrait sits in the header's profile slot at the end.
  expect(button('Search for stories').querySelector('.workspace-search-placeholder')?.textContent).toBe('Search for stories');
  expect(button('Profile and preferences').closest('[data-slot="app-header-profile"]')).not.toBeNull();
  await render(<WorkspaceHeader title="Quiet page" contextualItem={false} />);
  expect(container.querySelector('.workspace-header-context')).toBeNull();
  expect(Array.from(container.querySelectorAll('button')).map(element => element.getAttribute('aria-label'))).toEqual(['Search for stories', 'Profile and preferences']);
});

it('opens the Profile Portrait menu with the Preferences, updates Preferred Language immediately, and calls the page Help owner', async () => {
  const onAction = vi.fn(); const onIntent = vi.fn(); const onLanguageChange = vi.fn();
  await render(<WorkspaceHeader title="Story Seed"
    preferences={{ language: 'en', onLanguageChange }}
    help={{ id: 'help', label: 'Help', onAction, onIntent, expanded: true }} />);
  await click(button('Profile and preferences'));
  expect(onIntent).toHaveBeenCalled();
  expect(button('Profile and preferences').getAttribute('aria-expanded')).toBe('true');
  const card = document.querySelector('[data-testid="workspace-profile-menu"]')!;
  expect(card).not.toBeNull();
  // Without a host profile: no identity, Sign in or profile, only the Preferences and Help.
  expect(card.querySelector('.workspace-profile-identity')).toBeNull();
  expect(card.textContent).not.toContain('Sign in');
  const select = card.querySelector<HTMLSelectElement>('#header-preferred-language')!;
  expect(select).not.toBeNull();
  expect(document.activeElement).toBe(select);
  expect(select.value).toBe('en');
  await act(async () => {
    select.value = 'ja';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(onLanguageChange).toHaveBeenCalledWith('ja');
  await click(button('Help'));
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(document.querySelector('[data-testid="workspace-profile-menu"]')).toBeNull();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it('shows the host reader, Sign in, profile and Settings in the Portrait menu', async () => {
  const onSignIn = vi.fn(); const onOpenProfile = vi.fn(); const onOpenSettings = vi.fn();
  await render(<WorkspaceHeaderProfileProvider profile={{ name: 'Ye Chen', detail: 'Mortal', onOpenProfile, onOpenSettings,
    signIn: { onSignIn, note: 'Not connected yet' } }}>
    <WorkspaceHeader title="Home" />
  </WorkspaceHeaderProfileProvider>);
  // Without a picture the Portrait shows the Profile figure, never initials.
  expect(button('Profile and preferences').querySelector('[data-sen-icon="header-profile"]')).not.toBeNull();
  expect(button('Profile and preferences').textContent).not.toContain('YC');
  await click(button('Profile and preferences'));
  const menu = () => document.querySelector<HTMLElement>('[data-testid="workspace-profile-menu"]');
  expect(menu()!.querySelector('.workspace-profile-name')?.textContent).toBe('Ye Chen');
  expect(menu()!.textContent).toContain('Mortal');
  expect(menu()!.textContent).toContain('Not connected yet');
  const entry = (label: string) => Array.from(menu()!.querySelectorAll('button')).find(element => element.textContent?.startsWith(label))!;
  await click(entry('Sign in'));
  expect(onSignIn).toHaveBeenCalledTimes(1);
  expect(menu()).toBeNull();
  expect(document.activeElement).toBe(button('Profile and preferences'));
  // Escape closes the menu and returns focus to the Portrait.
  await click(button('Profile and preferences'));
  expect(button('Profile and preferences').getAttribute('aria-expanded')).toBe('true');
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(menu()).toBeNull();
  expect(document.activeElement).toBe(button('Profile and preferences'));
  await click(button('Profile and preferences'));
  await click(entry('Your profile'));
  expect(onOpenProfile).toHaveBeenCalledTimes(1);
  await click(button('Profile and preferences'));
  await click(entry('Settings'));
  expect(onOpenSettings).toHaveBeenCalledTimes(1);
  // A picture fills the circle in place of the figure.
  await render(<WorkspaceHeaderProfileProvider profile={{ name: 'Ye Chen', avatarUrl: '/ye-chen.png' }}><WorkspaceHeader title="Home" /></WorkspaceHeaderProfileProvider>);
  expect(button('Profile and preferences').querySelector('img.workspace-profile-photo')?.getAttribute('src')).toBe('/ye-chen.png');
  expect(button('Profile and preferences').querySelector('[data-sen-icon="header-profile"]')).toBeNull();
});

const TEST_WIDTHS = [320, 375, 390, 430, 1440];
const stubViewport = (width: number) => vi.stubGlobal('matchMedia', (query: string) => {
  const max = /max-width:\s*(\d+)px/.exec(query);
  const min = /min-width:\s*(\d+)px/.exec(query);
  return { media: query, matches: (!max || width <= Number(max[1])) && (!min || width >= Number(min[1])),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() };
});

it.each(TEST_WIDTHS)('regression: keeps Search and the Profile Portrait separate at %ipx with the NovelExpanded logo', async width => {
  stubViewport(width);
  const onAction = vi.fn();
  await render(<WorkspaceHeader title="Celestial Library" emblem={{ src: '/favicon.jpg', alt: 'Library' }}
    home={{ href: '/', label: 'Home' }} help={{ id: 'help', label: 'Help', onAction }} />);
  const header = container.querySelector('header')!;
  // Never a "…" consolidation: both utilities are their own visible control.
  expect(button('Header options')).toBeNull();
  expect(header.querySelector('.header-overflow')).toBeNull();
  expect(Array.from(header.querySelectorAll('button')).map(element => element.getAttribute('aria-label')))
    .toEqual(['Search for stories', 'Profile and preferences']);
  expect(button('Search for stories').querySelector('.workspace-search-emblem')).not.toBeNull();
  expect(button('Search for stories').querySelector('[data-sen-icon="header-search"]')).not.toBeNull();
  expect(button('Profile and preferences').className).toContain('workspace-profile-portrait');
  // The header carries the logo without a page badge.
  expect(header.querySelector('[data-slot="library-header-badge-title"]')).toBeNull();
  expect(header.querySelector('[data-slot="novel-expanded-logo"]')).not.toBeNull();
  expect(header.getAttribute('data-slot')).toBe('app-header');

  await click(button('Profile and preferences'));
  await click(button('Help'));
  expect(onAction).toHaveBeenCalledTimes(1);
  await click(button('Search for stories'));
  expect(document.activeElement?.getAttribute('type')).toBe('search');
  await click(button('Close Search')); await settle();
  // Focus returns to Search itself, not to a shared overflow trigger.
  expect(document.activeElement).toBe(button('Search for stories'));
});

it('regression: keeps the Search field, Portrait touch target and menu styling in workspace-header.css', () => {
  const css = readFileSync(join(process.cwd(), 'src/components/library-shell/development/workspace-header.css'), 'utf8');
  expect(css).toContain('.workspace-search { flex: 1 1 auto; min-width: 44px; container-type: inline-size; }');
  expect(css).toMatch(/\.workspace-search-field \{[^}]*height: 44px;/);
  expect(css).toMatch(/\.workspace-profile-portrait \{[^}]*width: 44px; height: 44px;/);
  expect(css).toContain('.workspace-profile-panel');
  expect(css).toContain('.workspace-profile-select');
  expect(css).not.toContain('workspace-preferences');
  expect(css).not.toContain('app-header-center');
  expect(css).not.toContain("/icons/header/");
});

it('reuses Library Help topics and original guidance from inside the Profile Portrait menu, closes with Escape and returns focus', async () => {
  await render(<WorkspaceHeader title="Cultivator Cave" />);
  await click(button('Profile and preferences'));
  await click(button('Help'));
  await act(async () => { await import('@seihouse/library/story-seed'); });
  await settle();
  const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Library Help"]')!;
  expect(dialog).not.toBeNull();
  expect(dialog.closest('header')).toBeNull();
  const topic = Array.from(dialog.querySelectorAll('button')).find(element => element.textContent?.includes('Relics'))!;
  await click(topic);
  expect(dialog.textContent).toContain(STORY_SEED_HELP_ITEMS.find(item => item.label === 'Relics')!.translations.en!.line);
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(button('Profile and preferences'));
});

it('searches labels and descriptions, announces no results, resets on reopen, and dispatches once', async () => {
  const navigate = vi.fn(); const blocked = vi.fn();
  await render(<WorkspaceHeader title="Library" searchItems={[
    { id: 'profile', label: 'Celestial Profile', description: 'Manage spirit link settings', onAction: navigate },
    { id: 'blocked', label: 'Unavailable', disabled: true, onAction: blocked },
  ]} />);
  await click(button('Search for stories'));
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
  expect(document.activeElement).toBe(button('Search for stories'));
  await click(button('Search for stories'));
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
  await click(button('Search for stories'));
  expect(button('Celestial Profile').title).toBe('Open Celestial Tools');
  expect(button('Tome Chambers').textContent).toContain("Explore Ye Chen's world logs");
  expect(button('Chamber Reader')).not.toBeNull();
  expect(button('Shortcut Spells')).not.toBeNull();
  await click(button('Living Codex')); await settle();
  expect(setIsCodexSheetOpen).toHaveBeenCalledExactlyOnceWith(true);
  expect(setCurrentScreen).not.toHaveBeenCalled();
});
