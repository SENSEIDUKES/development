// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { DevelopmentHeaderPreview } from './DevelopmentHeaderPreview';
import { libraryPreviewUrl, navigateLibraryPreview } from './libraryPreviewNavigation';

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
const button = (label: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === label)!;
const click = async (label: string) => { await act(async () => button(label).click()); };
const current = () => container.querySelector('.library-global-navigation [aria-current="page"]')?.textContent;
const homeVisible = () => !container.querySelector('[data-light-novels-home]')?.closest('[hidden]');

it('opens standalone Home by default and preserves filters across Library, Discover, Profile and history', async () => {
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
  await click('Library');
  expect(current()).toBe('Library'); expect(homeVisible()).toBe(false);
  expect(new URLSearchParams(location.search).get('collection')).toBe('my-library');
  await click('Discover');
  expect(current()).toBe('Discover');
  expect(new URLSearchParams(location.search).get('collection')).toBe('challenges');
  await click('Profile');
  expect(container.querySelector('[data-profile]')?.closest('[hidden]')).toBeNull();
  await click('Return from Profile');
  expect(current()).toBe('Home'); expect(homeVisible()).toBe(true);
  expect(container.querySelector('[aria-label="Ascension Order"]')).toBe(sort);
  expect(sort.value).toBe('newest');
  await act(async () => { window.history.replaceState(null, '', libraryPreviewUrl({ screen: 'home', collection: 'my-library' })); window.dispatchEvent(new PopStateEvent('popstate')); });
  expect(current()).toBe('Library'); expect(homeVisible()).toBe(false);
  expect(document.querySelectorAll('.familiar-companion')).toHaveLength(1);
  expect(document.querySelector('.familiar-companion button')).toBe(companion);
  expect(companion.parentElement!.style.left).toBe(companionLeft);
});

it.each(['guest', 'reference'])('does not place a companion on the %s surface', async state => {
  if (state === 'reference') window.history.replaceState(null, '', '/library-shell.html?homeReference=1');
  await render(state === 'guest' ? 'guest' : 'linked');
  expect(document.querySelector('.familiar-companion')).toBeNull();
});

it.each([['library', 'Library'], ['discover', 'Discover']])('keeps the %s fixture directly addressable', async (state, label) => {
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
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Search"]')!.click());
  const search = document.querySelector<HTMLInputElement>('input[type="search"]')!;
  expect(search).not.toBeNull();
  const libraryResult = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(b => b.textContent?.includes('Browse your accumulated scroll logs'))!;
  await act(async () => { libraryResult.click(); await new Promise(resolve => setTimeout(resolve, 100)); });
  expect(current()).toBe('Library');
});

it('restores a Library fixture entry when browser history returns to its original URL', async () => {
  const original = '/library-shell.html?variant=development&source=main-library&state=library';
  window.history.replaceState(null, '', original);
  await render('library');
  await click('Home'); expect(current()).toBe('Home');
  await act(async () => { window.history.replaceState(null, '', original); window.dispatchEvent(new PopStateEvent('popstate')); });
  expect(current()).toBe('Library'); expect(homeVisible()).toBe(false);
});
