// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import {
  LIBRARY_EMBLEM, LibraryDesktopNavigationProvider, LibraryDestinationsProvider, LibraryNavigation, LibrarySectionSidebar, WorkspaceHeader,
  WorkspaceHeaderSoundProvider, useLibraryBottomClearance, useLibraryWorkspace, type LibraryWorkspaceDefinition,
} from '@seihouse/library/shell';
import { MainLibraryNavigation } from './MainLibraryNavigation';
import { activeLibraryDestination, librarySectionItems, type LibraryDestination, type LibraryLocation } from '@seihouse/library/shell';
import { StorySeedWorkspaceChrome } from '../../story-seed/development/StorySeedWorkspaceChrome';
import { createEmptyStorySeedInput } from '@seihouse/sen/story-seed';

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
const globalNav = () => container.querySelector('nav[aria-label="Library global navigation"]')!;

it.each<[LibraryLocation, string | undefined]>([
  [{ screen: 'home', collection: 'featured' }, 'home'],
  // My Library is a Home collection; Create is its own page.
  [{ screen: 'home', collection: 'my-library' }, 'home'],
  [{ screen: 'creator-space' }, 'create'],
  [{ screen: 'home', collection: 'challenges' }, 'discover'],
  [{ screen: 'sects' }, 'home'], [{ screen: 'pricing' }, 'home'],
  [{ screen: 'challenge' }, 'discover'], [{ screen: 'detail' }, 'home'],
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
  expect(Array.from(globalNav().querySelectorAll('button')).map(button => button.textContent)).toEqual(['Home', 'Create', 'Discover', 'Profile']);
  expect(globalNav().querySelector('[data-sen-navigation-icon="home"]')).not.toBeNull();
  expect(globalNav().querySelector('[data-sen-navigation-icon="book"]')).not.toBeNull();
  expect(globalNav().querySelector('[data-sen-navigation-icon="discovery"]')).not.toBeNull();
  expect(globalNav().querySelector('[data-sen-global-icon="profile"]')).not.toBeNull();
  expect(globalNav().querySelector('[aria-current="page"]')?.textContent).toBe('Profile');
  for (const [label, target] of [
    ['Home', { screen: 'home', collection: 'featured' }],
    ['Create', { screen: 'creator-space' }],
    ['Discover', { screen: 'home', collection: 'challenges' }],
    ['Profile', { screen: 'profile', cave: '/home' }],
  ] as const) {
    await click(button(label, globalNav()));
    expect(navigate).toHaveBeenLastCalledWith(target);
  }
  await render(page({ screen: 'creator-space' }));
  expect(globalNav().querySelector('[aria-current="page"]')?.textContent).toBe('Create');
  navigate.mockClear();
  await click(button('Create', globalNav()));
  expect(navigate).not.toHaveBeenCalled();
  // Home's My Library collection keeps Home selected now that its tab is Create.
  await render(page({ screen: 'home', collection: 'my-library' }));
  expect(globalNav().querySelector('[aria-current="page"]')?.textContent).toBe('Home');
});

it('shows only the places a host has built, with Settings only beside Profile', async () => {
  const navigate = vi.fn();
  const page = (location: LibraryLocation, destinations?: readonly LibraryDestination[]) => <LibraryNavigation location={location}
    onNavigate={navigate} destinations={destinations}><LibrarySectionSidebar /></LibraryNavigation>;
  const pathways = () => container.querySelector('nav[aria-label="Library pathways"]')!;
  await render(page({ screen: 'detail' }, ['home', 'create']));
  expect(Array.from(globalNav().querySelectorAll('button')).map(button => button.textContent)).toEqual(['Home', 'Create']);
  // A story's own page belongs to Home.
  expect(globalNav().querySelector('[aria-current="page"]')?.textContent).toBe('Home');
  // Nowhere: not in the strip, the sidebar's pathways, or its footer.
  for (const absent of ['Discover', 'Profile', 'Settings']) expect(container.textContent).not.toContain(absent);
  expect(button('Create', pathways())).toBeDefined();
  await click(button('Create', globalNav()));
  expect(navigate).toHaveBeenLastCalledWith({ screen: 'creator-space' });
  await click(button('Home', pathways()));
  expect(navigate).toHaveBeenLastCalledWith({ screen: 'home', collection: 'featured' });
  // Without a list, every place shows, and Settings sits with Profile.
  await render(page({ screen: 'home', collection: 'featured' }));
  expect(Array.from(globalNav().querySelectorAll('button')).map(button => button.textContent)).toEqual(['Home', 'Create', 'Discover', 'Profile']);
  expect(button('Settings', container)).toBeDefined();
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
  expect(Array.from(globalNav().querySelectorAll('button')).map(button => button.textContent)).toEqual(['Home', 'Create', 'Discover', 'Profile']);
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

it('runs Story Seed in the Library Shell workspace mode instead of a navigation system of its own', async () => {
  const bank = vi.fn(); const help = vi.fn(); const select = vi.fn(); const home = vi.fn();
  await render(<LibraryNavigation location={{ screen: 'creator' }} onNavigate={vi.fn()}>
    <StorySeedWorkspaceChrome onNavigateHome={home} seed={createEmptyStorySeedInput()} updateSeed={vi.fn()} activeSection="origin" showStoryBank={false} helpOpen={false}
      isGenerating={false} savedFeedback={false} canManifest={false} manifestLabel="Manifest" status="Ready" onSaveDraft={vi.fn()} onManifest={vi.fn()}
      onToggleStoryBank={bank} onOpenHelp={help} onSelectSection={select}><p>Existing editor</p></StorySeedWorkspaceChrome>
  </LibraryNavigation>);
  // The workspace route never shows the global strip; the shell draws Story Seed's task bar instead.
  expect(globalNav()).toBeNull();
  expect(container.querySelector('[data-library-mode="workspace"]')).not.toBeNull();
  const nav = document.querySelector<HTMLElement>('nav[aria-label="Story Seed navigation"]')!;
  expect(nav.classList.contains('library-global-navigation')).toBe(true);
  expect(nav.classList.contains('library-workspace-navigation')).toBe(true);
  expect(Array.from(nav.querySelectorAll('button')).map(button => button.textContent)).toEqual(['Sections', 'Story Bank', 'Settings', 'Back']);
  // The desktop rail is the same LibrarySectionSidebar every Library page uses.
  const rail = container.querySelector('[data-slot="app-shell-sidebar"]')!;
  expect(rail.querySelector('nav[aria-label="Story Seed sections"]')?.textContent).toContain('Story Bank');
  await click(button('Sections', nav));
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await settle();
  await click(button('Story Bank', nav)); expect(bank).toHaveBeenCalledTimes(1);
  expect(button('Help', nav)).toBeUndefined();
  await click(button('Settings', nav));
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Story Seed settings');
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await settle();
  // Story Seed's header matches every Library page: the Celestial Library emblem, home through the host.
  const emblem = container.querySelector<HTMLImageElement>('header a img')!;
  expect(emblem.getAttribute('src')).toBe(LIBRARY_EMBLEM.src);
  expect(emblem.closest('a')!.getAttribute('aria-label')).toBe('Return to Library');
  await click(emblem.closest('a')!);
  expect(home).toHaveBeenCalledTimes(1);
  await click(button('Back', nav));
  expect(home).toHaveBeenCalledTimes(2);
});

it('draws any workspace from its definition: Sections only with sections, tools in order, Back last', async () => {
  const onBack = vi.fn(); const tool = vi.fn(); const pick = vi.fn();
  const definition = (sections: LibraryWorkspaceDefinition['sections']): LibraryWorkspaceDefinition => ({
    label: 'Studio sections', closeLabel: 'Close studio sections', barLabel: 'Studio navigation', sections,
    tools: [{ id: 'panels', label: 'Panels', icon: null, onSelect: tool }], back: { label: 'Leave', onBack },
  });
  function DrawerState() { const { drawerOpen } = useLibraryWorkspace(); return <p data-drawer-open={drawerOpen} />; }
  await render(<LibraryNavigation mode="workspace" workspace={definition([])}><p>Studio</p></LibraryNavigation>);
  const bar = () => document.querySelector<HTMLElement>('nav[aria-label="Studio navigation"]')!;
  expect(Array.from(bar().querySelectorAll('button')).map(button => button.textContent)).toEqual(['Panels', 'Leave']);
  await render(<LibraryNavigation mode="workspace" workspace={definition([{ id: 'pages', items: [{ id: 'cover', label: 'Cover', onSelect: pick }] }])}>
    <DrawerState /><LibrarySectionSidebar />
  </LibraryNavigation>);
  expect(Array.from(bar().querySelectorAll('button')).map(button => button.textContent)).toEqual(['Sections', 'Panels', 'Leave']);
  await click(button('Sections', bar()));
  expect(container.querySelector('[data-drawer-open="true"]')).not.toBeNull();
  // Choosing a destination in the drawer closes it before the page acts.
  const drawer = document.querySelector('[role="dialog"]')!;
  await click(button('Cover', drawer));
  expect(pick).toHaveBeenCalledWith('cover');
  expect(container.querySelector('[data-drawer-open="false"]')).not.toBeNull();
  await click(button('Panels', bar())); expect(tool).toHaveBeenCalledTimes(1);
  await click(button('Leave', bar())); expect(onBack).toHaveBeenCalledTimes(1);
  expect(globalNav()).toBeNull();
});

it('gives every Library navigation beneath it the host\'s places, and a navigation\'s own list still wins', async () => {
  const navigate = vi.fn();
  const strip = () => Array.from(globalNav().querySelectorAll('button')).map(button => button.textContent);
  // A page that draws its own navigation (the Cave) names no places: the host's apply.
  await render(<LibraryDestinationsProvider destinations={['home', 'create', 'profile']}>
    <LibraryNavigation location={{ screen: 'profile', cave: '/home' }} onNavigate={navigate}><p>Cave</p></LibraryNavigation>
  </LibraryDestinationsProvider>);
  expect(strip()).toEqual(['Home', 'Create', 'Profile']);
  expect(globalNav().querySelector('[aria-current="page"]')?.textContent).toBe('Profile');
  await render(<LibraryDestinationsProvider destinations={['home', 'create', 'profile']}>
    <LibraryNavigation location={{ screen: 'detail' }} onNavigate={navigate} destinations={['home']}><p>Story</p></LibraryNavigation>
  </LibraryDestinationsProvider>);
  expect(strip()).toEqual(['Home']);
});

it('floats a header\'s music note just above the bottom bar while the bar is on screen, and keeps it in the header on laptops', async () => {
  const media = (desktop: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({
    matches: desktop && query === '(min-width: 1024px)', addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
  }));
  const notes = () => Array.from(container.querySelectorAll<HTMLElement>('button[aria-label="Mute sound"]'));
  const spot = () => container.querySelector<HTMLElement>('[data-library-sound-slot]')!;
  const home = (header: React.ReactNode) => <LibraryNavigation location={{ screen: 'home', collection: 'featured' }} onNavigate={vi.fn()}>{header}</LibraryNavigation>;
  const studio: LibraryWorkspaceDefinition = { label: 'Studio sections', closeLabel: 'Close studio sections', barLabel: 'Studio navigation', sections: [], back: { onBack: vi.fn() } };

  // Phones and tablets: above the strip's right end, never in the header too; the spot follows the bar's height.
  await render(home(<WorkspaceHeader title="Home" landmark="none" sound={<button aria-label="Mute sound">Note</button>} />));
  expect(notes()).toHaveLength(1);
  expect(notes()[0].closest('[data-library-sound-slot]')).toBe(spot());
  expect(notes()[0].closest('.workspace-header')).toBeNull();
  expect(spot().style.getPropertyValue('--library-bar-height')).toMatch(/px$/);
  // The host's note (its provider) floats the same way, here over a workspace's own bar.
  await render(<WorkspaceHeaderSoundProvider sound={<button aria-label="Mute sound">Note</button>}>
    <LibraryNavigation mode="workspace" workspace={studio}><WorkspaceHeader title="Studio" landmark="none" /></LibraryNavigation>
  </WorkspaceHeaderSoundProvider>);
  expect(notes()).toHaveLength(1);
  expect(notes()[0].closest('[data-library-sound-slot]')).not.toBeNull();

  // Laptops: the sidebar and the rail replace the bars, so it sits in the header and the spot is empty.
  media(true);
  await render(home(<WorkspaceHeader title="Home" landmark="none" sound={<button aria-label="Mute sound">Note</button>} />));
  expect(notes()).toHaveLength(1);
  expect(notes()[0].closest('.workspace-header')).not.toBeNull();
  expect(spot().childElementCount).toBe(0);
  // A host that keeps the strip on laptops keeps the note floating above it.
  await render(<LibraryDesktopNavigationProvider value="strip">
    {home(<WorkspaceHeader title="Home" landmark="none" sound={<button aria-label="Mute sound">Note</button>} />)}
  </LibraryDesktopNavigationProvider>);
  expect(notes()).toHaveLength(1);
  expect(notes()[0].closest('[data-library-sound-slot]')).not.toBeNull();
  // Without Library navigation (no bar at all) a header keeps its own note.
  media(false);
  await render(<WorkspaceHeader title="Alone" landmark="none" sound={<button aria-label="Mute sound">Note</button>} />);
  expect(notes()).toHaveLength(1);
  expect(notes()[0].closest('.workspace-header')).not.toBeNull();
});

it('tells a host how much of the screen\'s bottom the bar and the floating note cover, so its own floating pieces stay above them', async () => {
  // A phone 844px tall: the bar is 82px; the note floats 8px above it and is 44px tall.
  const tall = 844;
  vi.stubGlobal('innerHeight', tall);
  const heights = new Map([['library-global-navigation', 82], ['library-sound-slot', 44]]);
  const height = (element: Element) => [...heights].find(([name]) => element.classList.contains(name))?.[1] ?? 0;
  const offsetHeight = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('library-sound-slot') && !this.childElementCount ? 0 : height(this);
  });
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const top = this.classList.contains('library-sound-slot') ? tall - 82 - 8 - 44 : tall - height(this);
    return { top, bottom: top + height(this), left: 0, right: 390, width: 390, height: height(this), x: 0, y: top, toJSON: () => ({}) } as DOMRect;
  });
  let seen = -1;
  function Probe() { seen = useLibraryBottomClearance(); return null; }
  const home = (sound?: React.ReactNode) => <LibraryNavigation location={{ screen: 'home', collection: 'featured' }} onNavigate={vi.fn()}>
    <WorkspaceHeader title="Home" landmark="none" sound={sound ?? null} />
  </LibraryNavigation>;

  // The bar alone, then the bar with the note floating above it.
  await render(<><Probe />{home()}</>);
  expect(seen).toBe(82);
  await render(<><Probe />{home(<button aria-label="Mute sound">Note</button>)}</>);
  await act(async () => { window.dispatchEvent(new Event('resize')); });
  expect(seen).toBe(82 + 8 + 44);
  // No Library bar on screen: nothing is covered.
  await render(<Probe />);
  expect(seen).toBe(0);
  offsetHeight.mockRestore();
  rect.mockRestore();
});
