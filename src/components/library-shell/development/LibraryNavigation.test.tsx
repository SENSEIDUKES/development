// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '../../library-presentation/LibraryPresentationProvider';
import { LibraryNavigation } from './LibraryNavigation';
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
  expect(Array.from(globalNav().querySelectorAll('button')).map(button => button.textContent)).toEqual(['Section', 'Home', 'Library', 'Discover', 'Profile']);
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

it('opens page sections as a disclosure, returns focus on Escape and dispatches after dismissal', async () => {
  const action = vi.fn(() => {
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    document.querySelector<HTMLElement>('h2')!.focus();
  });
  await render(<LibraryNavigation location={{ screen: 'profile' }} onNavigate={vi.fn()} sectionMenu={{ label: 'Cave sections', sections: [{ id: 'cave', items: [{ id: 'stories', label: 'Stories', active: true, onSelect: action }] }] }}>
    <h2 tabIndex={-1}>Existing page</h2>
  </LibraryNavigation>);
  const section = button('Section');
  expect(section.getAttribute('aria-haspopup')).toBe('dialog');
  expect(section.getAttribute('aria-current')).toBeNull();
  await click(section);
  expect(section.getAttribute('aria-expanded')).toBe('true');
  expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await settle();
  expect(document.activeElement).toBe(section);
  await click(section);
  await click(button('Stories'));
  expect(action).toHaveBeenCalledTimes(1);
  expect(document.activeElement?.tagName).toBe('H2');
});

it('keeps empty sections usable, omits unfinished links, and closes menus on host route changes without remounting page state', async () => {
  function Content() { const [value, setValue] = useState(0); return <button onClick={() => setValue(value + 1)}>Page state {value}</button>; }
  const page = (screen: string) => <LibraryNavigation location={{ screen }} onNavigate={vi.fn()}><Content /></LibraryNavigation>;
  await render(page('home'));
  await click(button('Page state 0'));
  await click(button('Section'));
  expect(document.body.textContent).toContain('There are no sections on this page.');
  await render(page('pricing'));
  await settle();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(button('Page state 1')).toBeDefined();
  expect(librarySectionItems('discover', {})).toEqual([]);
  expect(librarySectionItems('library', { 'my-library': vi.fn() }).map(item => item.label)).toEqual(['My Library']);
});

it('uses only available Home/Library/Discover sections and reuses the existing seed screen', async () => {
  const navigate = vi.fn();
  await render(<MainLibraryNavigation location={{ screen: 'home', collection: 'my-library' }} onNavigate={navigate}><main /></MainLibraryNavigation>);
  await click(button('Section'));
  expect(document.querySelector('.library-section-menu')?.textContent).toBe('Seed BankMy Library');
  await click(button('Seed Bank'));
  expect(navigate).toHaveBeenCalledWith({ screen: 'profile', cave: '/stories' });
});

it('restores focus for the current section and gives a history destination focus when its menu was open', async () => {
  const page = (cave: string) => <LibraryNavigation location={{ screen: 'profile', cave }} onNavigate={vi.fn()} sectionMenu={{ label: 'Cave sections', sections: [{ id: 'cave', items: [{ id: 'home', label: 'Cave Home', active: true, onSelect: () => {} }] }] }}>
    <main><h2 tabIndex={-1}>{cave}</h2></main>
  </LibraryNavigation>;
  await render(page('/home'));
  await click(button('Section'));
  await click(button('Cave Home'));
  expect(document.activeElement).toBe(button('Section'));
  await click(button('Section'));
  await render(page('/stories'));
  await settle();
  expect(document.activeElement?.textContent).toBe('/stories');
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
  await click(button('Story Bank', nav)); expect(bank).toHaveBeenCalledTimes(1);
  await click(button('Help', nav)); expect(help).toHaveBeenCalledTimes(1);
  await click(button('Settings', nav));
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Story Seed settings');
});
