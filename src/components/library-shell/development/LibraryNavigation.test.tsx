// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '../../library-presentation/LibraryPresentationProvider';
import { LibraryNavigation, LibrarySectionSidebar } from './LibraryNavigation';
import { MainLibraryNavigation } from './MainLibraryNavigation';
import { activeLibraryDestination, librarySectionItems, type LibraryLocation } from './libraryRoutes';
import { StorySeedWorkspaceChrome } from '../../story-seed/development/StorySeedWorkspaceChrome';
import { createEmptyStorySeedInput } from '../../story-seed/shared/storySeedSchema';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const render = async (node: React.ReactNode) => { await act(async () => root.render(<LibraryPresentationProvider>{node}</LibraryPresentationProvider>)); };
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 80)); }); };
const button = (name: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(button => (button.getAttribute('aria-label') ?? button.textContent) === name)!;
const click = async (button: HTMLElement) => { await act(async () => { button.focus(); button.click(); }); await settle(); };
const globalNav = () => container.querySelector('.library-global-navigation')!;

it.each<[LibraryLocation, string | undefined]>([
  [{ screen: 'home', collection: 'featured' }, 'home'],
  [{ screen: 'home', collection: 'my-library' }, 'library'],
  [{ screen: 'home', collection: 'challenges' }, 'discover'],
  [{ screen: 'sects' }, 'home'], [{ screen: 'pricing' }, 'home'],
  [{ screen: 'challenge' }, 'discover'], [{ screen: 'detail' }, 'library'],
  [{ screen: 'profile', cave: '/settings/switchboard' }, 'profile'],
  [{ screen: 'profile', cave: '/public/relics' }, 'profile'],
  [{ screen: 'reader' }, undefined], [{ screen: 'creator' }, undefined], [{ screen: 'unknown' }, undefined],
])('derives the global destination for %j', (location, destination) => {
  expect(activeLibraryDestination(location)).toBe(destination);
});

it('uses ordered global destinations, preserves host routes and updates selection from location', async () => {
  const navigate = vi.fn();
  const page = (location: LibraryLocation) => <MainLibraryNavigation location={location} onNavigate={navigate}><main>Existing content</main></MainLibraryNavigation>;
  await render(page({ screen: 'profile', cave: '/settings' }));
  expect(Array.from(globalNav().querySelectorAll('button')).map(button => button.textContent)).toEqual(['Home', 'Library', 'Discover', 'Profile']);
  expect(globalNav().querySelector('[aria-current="page"]')?.textContent).toBe('Profile');
  for (const [label, target] of [
    ['Home', { screen: 'home', collection: 'featured' }],
    ['Library', { screen: 'home', collection: 'my-library' }],
    ['Discover', { screen: 'home', collection: 'challenges' }],
    ['Profile', { screen: 'profile', cave: '/home' }],
  ] as const) {
    await click(button(label, globalNav()));
    expect(navigate).toHaveBeenLastCalledWith(target);
  }
  await render(page({ screen: 'home', collection: 'my-library' }));
  expect(globalNav().querySelector('[aria-current="page"]')?.textContent).toBe('Library');
  navigate.mockClear();
  await click(button('Library', globalNav()));
  expect(navigate).not.toHaveBeenCalled();
});

it('keeps four destinations with or without page options and preserves page state', async () => {
  function Content() { const [value, setValue] = useState(0); return <button onClick={() => setValue(value + 1)}>Page state {value}</button>; }
  const action = vi.fn();
  const page = (screen: string, options: boolean) => <LibraryNavigation location={{ screen }} onNavigate={vi.fn()}
    sectionMenu={options ? { label: 'Cave navigation', sections: [{ id: 'cave', items: [{ id: 'stories', label: 'Stories', onSelect: action }] }] } : undefined}>
    <Content /><LibrarySectionSidebar />
  </LibraryNavigation>;
  await render(page('home', false));
  await click(button('Page state 0'));
  await render(page('profile', true));
  expect(button('Page state 1')).toBeDefined();
  expect(Array.from(globalNav().querySelectorAll('button')).map(button => button.textContent)).toEqual(['Home', 'Library', 'Discover', 'Profile']);
  expect(globalNav().querySelector('[aria-haspopup], [aria-expanded], [aria-controls]')).toBeNull();
  expect(button('Section')).toBeUndefined();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await click(button('Stories'));
  expect(action).toHaveBeenCalledWith('stories');
  expect(librarySectionItems('discover', {})).toEqual([]);
});

it.each(['reader', 'codex'])('excludes immersive %s even when standard mode is requested', async screen => {
  await render(<LibraryNavigation location={{ screen }} mode="standard" onNavigate={vi.fn()}><nav aria-label="Existing immersive controls"><button>Chapter</button></nav></LibraryNavigation>);
  expect(globalNav()).toBeNull();
  expect(button('Chapter')).toBeDefined();
});

it('preserves the real Story Seed strip, sections, bank, Help and settings inside the shell exclusion', async () => {
  const bank = vi.fn(); const help = vi.fn(); const select = vi.fn();
  await render(<LibraryNavigation location={{ screen: 'creator' }} onNavigate={vi.fn()}>
    <StorySeedWorkspaceChrome seed={createEmptyStorySeedInput()} updateSeed={vi.fn()} activeSection="origin" showStoryBank={false} helpOpen={false}
      isGenerating={false} savedFeedback={false} canManifest={false} manifestLabel="Manifest" status="Ready" onSaveDraft={vi.fn()} onManifest={vi.fn()}
      onToggleStoryBank={bank} onOpenHelp={help} onSelectSection={select} layout="mobile"><p>Existing editor</p></StorySeedWorkspaceChrome>
  </LibraryNavigation>);
  expect(globalNav()).toBeNull();
  const nav = document.querySelector('nav[aria-label="Story Seed navigation"]')!;
  expect(Array.from(nav.querySelectorAll('button')).map(button => button.textContent)).toEqual(['Sections', 'Story Bank', 'Help', 'Settings']);
  await click(button('Sections', nav));
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await settle();
  await click(button('Story Bank', nav)); expect(bank).toHaveBeenCalledTimes(1);
  await click(button('Help', nav)); expect(help).toHaveBeenCalledTimes(1);
  await click(button('Settings', nav));
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Story Seed settings');
});
