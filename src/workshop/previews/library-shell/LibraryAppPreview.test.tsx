// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { DevelopmentHeaderPreview } from './DevelopmentHeaderPreview';
import { libraryPreviewUrl, navigateLibraryPreview } from './libraryPreviewNavigation';
import { getPreviewScenario } from '../user-profile/previewData';

vi.mock('@seihouse/library-ui', async importOriginal => ({ ...await importOriginal<typeof import('@seihouse/library-ui')>(), ParticleEffect: () => null }));
vi.mock('../user-profile/UserProfileWorkspace', () => ({ UserProfileWorkspace: () => <section data-profile><button onClick={() => navigateLibraryPreview({ screen: 'home', collection: 'featured' })}>Return from Profile</button></section> }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  window.history.replaceState(null, '', '/library-shell.html?variant=development&source=main-library');
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const render = async (state = 'linked') => { await act(async () => root.render(<LibraryPresentationProvider><DevelopmentHeaderPreview source="main-library" state={state} /></LibraryPresentationProvider>)); };
const button = (label: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim() === label || b.getAttribute('aria-label') === label)!;
const click = async (label: string) => { await act(async () => button(label).click()); };
const current = () => container.querySelector('.library-global-navigation [aria-current="page"]')?.textContent;
const homeVisible = () => !container.querySelector('[data-light-novels-home]')?.closest('[hidden]');
const createVisible = () => Boolean(container.querySelector('[data-creator-space]')) && !container.querySelector('[data-creator-space]')!.closest('[hidden]');

it('opens standalone Home by default and preserves filters across Create, Discover, Profile and history', async () => {
  await render();
  // The companion starts minimized to the header; summon it through the recall.
  expect(document.querySelector('.familiar-companion')).toBeNull();
  await act(async () => container.querySelector<HTMLButtonElement>('header .familiar-recall')!.click());
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Expand Familiar"]')!.click());
  const companion = document.querySelector<HTMLButtonElement>('.familiar-companion button')!;
  expect(companion).not.toBeNull();
  await act(async () => companion.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
  const companionLeft = companion.parentElement!.style.left;
  expect(homeVisible()).toBe(true);
  expect(current()).toBe('Home');
  expect(container.textContent).toContain('Defying the Heavens');
  const sort = container.querySelector<HTMLSelectElement>('[aria-label="Ascension Order"]')!;
  await act(async () => { sort.value = 'newest'; sort.dispatchEvent(new Event('change', { bubbles: true })); });
  await click('Create');
  expect(current()).toBe('Create'); expect(homeVisible()).toBe(false);
  expect(new URLSearchParams(location.search).get('screen')).toBe('creator-space');
  expect(createVisible()).toBe(true);
  await click('Discover');
  expect(current()).toBe('Discover');
  expect(new URLSearchParams(location.search).get('collection')).toBe('challenges');
  await click('Profile');
  expect(container.querySelector('[data-profile]')?.closest('[hidden]')).toBeNull();
  await click('Return from Profile');
  expect(current()).toBe('Home'); expect(homeVisible()).toBe(true);
  expect(container.querySelector('[aria-label="Ascension Order"]')).toBe(sort);
  expect(sort.value).toBe('newest');
  await act(async () => { window.history.replaceState(null, '', libraryPreviewUrl({ screen: 'creator-space' })); window.dispatchEvent(new PopStateEvent('popstate')); });
  expect(current()).toBe('Create'); expect(homeVisible()).toBe(false); expect(createVisible()).toBe(true);
  expect(document.querySelectorAll('.familiar-companion')).toHaveLength(1);
  expect(document.querySelector('.familiar-companion button')).toBe(companion);
  expect(companion.parentElement!.style.left).toBe(companionLeft);
});

it('does not place a companion on the guest surface', async () => {
  await render('guest');
  expect(document.querySelector('.familiar-companion')).toBeNull();
});

// My Library is a Home collection: its fixture keeps Home selected in the strip.
it.each([['create', 'Create'], ['library', 'Home'], ['discover', 'Discover']])('keeps the %s fixture directly addressable', async (state, label) => {
  await render(state);
  expect(current()).toBe(label); expect(homeVisible()).toBe(false);
  expect(container.querySelectorAll('header')).toHaveLength(1);
  expect(container.querySelectorAll('.library-global-navigation')).toHaveLength(1);
  await click('Home'); expect(homeVisible()).toBe(true);
});

it('keeps the source hero action and directs header Library search separately from Home', async () => {
  await render();
  const listener = vi.fn((event: Event) => event.preventDefault());
  window.addEventListener('library-preview-navigate', listener);
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Carve New Destiny"]')!.click());
  expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ screen: 'creator' });
  window.removeEventListener('library-preview-navigate', listener);
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Search for stories"]')!.click());
  const search = document.querySelector<HTMLInputElement>('input[type="search"]')!;
  expect(search).not.toBeNull();
  const libraryResult = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(b => b.textContent?.includes('Browse your accumulated scroll logs'))!;
  await act(async () => { libraryResult.click(); await new Promise(resolve => setTimeout(resolve, 100)); });
  expect(current()).toBe('Home'); expect(homeVisible()).toBe(false);
  expect(new URLSearchParams(location.search).get('collection')).toBe('my-library');
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Search for stories"]')!.click());
  const createResult = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(b => b.textContent?.includes('Your worlds, Energy and creator toolkit'))!;
  await act(async () => { createResult.click(); await new Promise(resolve => setTimeout(resolve, 100)); });
  expect(current()).toBe('Create'); expect(createVisible()).toBe(true);
});

it('restores a Create fixture entry when browser history returns to its original URL', async () => {
  const original = '/library-shell.html?variant=development&source=main-library&state=create';
  window.history.replaceState(null, '', original);
  await render('create');
  await click('Home'); expect(current()).toBe('Home'); expect(createVisible()).toBe(false);
  await act(async () => { window.history.replaceState(null, '', original); window.dispatchEvent(new PopStateEvent('popstate')); });
  expect(current()).toBe('Create'); expect(homeVisible()).toBe(false); expect(createVisible()).toBe(true);
});

it('opens the clicked Full and Compact worlds on their Info pages', async () => {
  window.history.replaceState(null, '', '/library-shell.html?variant=development&source=main-library&worlds=sample');
  await render();
  const full = container.querySelector<HTMLButtonElement>('[data-world-card="full"] .world-card-base-open')!;
  await act(async () => full.click());
  expect(new URLSearchParams(location.search).get('screen')).toBe('detail');
  expect(container.querySelector('[data-story-detail] h1')?.textContent).toContain('The Last Lotus');
  await click('Back to novels');
  await click('Create');

  await act(async () => container.querySelector<HTMLElement>('#creator-world-mock-lotus-empire .world-card-base-open')!.click());
  expect(container.querySelector('[data-story-detail] h1')?.textContent).toContain('The Last Lotus');
  expect(container.querySelector('[data-story-detail] [data-world-info-meta]')?.textContent).toContain('24 Chapters');
  await click('Back to novels');

  const compact = container.querySelector<HTMLElement>('#creator-world-sample-nine-moons .world-card-base-open')!;
  await act(async () => compact.click());
  expect(new URLSearchParams(location.search).get('screen')).toBe('detail');
  expect(container.querySelector('[data-story-detail] h1')?.textContent).toBe('Ashes of the Nine Moons');
  expect(container.querySelector('[data-story-detail] [data-world-info-meta]')?.textContent).toContain('12 Chapters');
  expect(container.querySelector('[data-story-detail] [aria-label="World information"]')).toBeNull();
  const detailUrl = window.location.href;
  const detailState = window.history.state;
  await act(async () => { await new Promise<void>(resolve => { window.addEventListener('popstate', () => resolve(), { once: true }); window.history.back(); }); });
  expect(createVisible()).toBe(true);
  await act(async () => { await new Promise<void>(resolve => { window.addEventListener('popstate', () => resolve(), { once: true }); window.history.forward(); }); });
  expect(window.location.href).toBe(detailUrl);
  expect(container.querySelector('[data-story-detail] h1')?.textContent).toBe('Ashes of the Nine Moons');
  await act(async () => root.unmount());
  root = createRoot(container);
  window.history.replaceState(detailState, '', detailUrl);
  await render();
  expect(container.querySelector('[data-story-detail] h1')?.textContent).toBe('Ashes of the Nine Moons');
  expect(container.querySelector('[data-story-detail] [data-world-info-meta]')?.textContent).toContain('12 Chapters');
  await click('Back to novels');
  expect(createVisible()).toBe(true);
});

it('gives the Development header the app\'s Profile Portrait menu: the reader, Sign in not connected, Your profile and Settings', async () => {
  await render();
  await act(async () => container.querySelector<HTMLButtonElement>('header button[aria-label="Profile and preferences"]')!.click());
  const menu = () => document.querySelector<HTMLElement>('[data-testid="workspace-profile-menu"]');
  const entry = (label: string) => [...menu()!.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.startsWith(label))!;
  expect(menu()!.querySelector('.workspace-profile-name')?.textContent).toBe(getPreviewScenario('developed-cultivator').profile!.displayName);
  expect(menu()!.textContent).toContain('Not connected yet');
  expect(entry('Your profile')).toBeTruthy();
  expect(entry('Settings')).toBeTruthy();
  await act(async () => entry('Sign in').click());
  const signIn = document.querySelector<HTMLElement>('[data-testid="library-shell-sign-in"]')!;
  expect(signIn.querySelector('[data-sign-in-unavailable]')).not.toBeNull();
  expect([...signIn.querySelectorAll<HTMLButtonElement>('button')].filter(item => /^Continue with/.test(item.textContent ?? '')).every(item => item.disabled)).toBe(true);
  await act(async () => signIn.querySelector<HTMLButtonElement>('button[aria-label="Close sign in"]')!.click());
  expect(document.querySelector('[data-testid="library-shell-sign-in"]')).toBeNull();
  // Your profile opens the preview's Cave, as the app opens its Profile page.
  await act(async () => container.querySelector<HTMLButtonElement>('header button[aria-label="Profile and preferences"]')!.click());
  await act(async () => entry('Your profile').click());
  expect(new URLSearchParams(window.location.search).get('screen') ?? window.location.search).toMatch(/profile/);
  expect(container.querySelector('[data-profile]')?.closest('[hidden]')).toBeNull();
});
