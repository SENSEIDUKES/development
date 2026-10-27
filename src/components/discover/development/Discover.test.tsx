// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import type { DiscoverProps } from '../shared/discoverContracts';
import { Discover, releaseAge } from './Discover';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const NOW = new Date('2026-10-20T12:00:00Z');
const world = (id: string, title: string, genre: string, tags: string[] = []): HomeWorld => ({
  id, title, genre, tags, format: 'Novel', createdAt: '2026-10-01T00:00:00Z', reads: 0, imageUrl: '', chapterCount: 3, mcName: '', powerStage: '',
});
const WORLDS = [world('lotus', 'Last Lotus', 'Xianxia', ['sect politics']), world('trial', 'Ninth Trial', 'Fate Survival'), world('moon', 'Drowned Moon', 'Dark Fantasy')];

function renderPage(overrides: Partial<DiscoverProps> = {}) {
  const props: DiscoverProps = {
    medium: 'novel', onMediumChange: vi.fn(),
    section: 'stories', sectionHref: section => `?section=${section}`, onSectionChange: vi.fn(), renderLore: () => <p>Encyclopedia</p>,
    worlds: WORLDS, now: NOW, onOpenWorld: vi.fn(),
    releases: [
      { id: 'a', worldId: 'lotus', chapterNumber: 2, releasedAt: '2026-10-20T09:00:00Z' },
      { id: 'b', worldId: 'trial', chapterNumber: 5, chapterTitle: 'The Door', releasedAt: '2026-10-20T11:55:00Z' },
      { id: 'c', worldId: 'moon', chapterNumber: 9, releasedAt: '2026-10-18T12:00:00Z' },
      { id: 'gone', worldId: 'missing', chapterNumber: 1, releasedAt: '2026-10-20T11:59:00Z' },
    ],
    trackedWorldIds: ['lotus'], fateSurvivalWorldIds: ['trial'],
    ...overrides,
  };
  act(() => root.render(<LibraryPresentationProvider><Discover {...props} /></LibraryPresentationProvider>));
  return props;
}
const releaseTitles = () => [...container.querySelectorAll('ol[aria-label="New chapters"] .world-card-menu-title, ol[aria-label="My updates"] .world-card-menu-title')].map(node => node.textContent);
const tab = (label: string) => [...container.querySelectorAll<HTMLButtonElement>('.discover-segmented button')].find(node => node.textContent === label)!;
const chooseView = (label: string) => act(() => [...container.querySelectorAll<HTMLButtonElement>('.discover-view-rail button')].find(node => node.textContent === label)!.click());

it('lists releases newest first, skipping releases of worlds it does not have', () => {
  renderPage();
  expect(container.querySelector('h1')?.textContent).toBe('Discover');
  expect(releaseTitles()).toEqual(['Ninth Trial', 'Last Lotus', 'Drowned Moon']);
  expect(container.querySelector('.world-card-menu-chapter')?.textContent).toBe('Chapter 5 · The Door');
});

it('narrows the feed to tracked series in My updates', () => {
  renderPage();
  act(() => tab('My updates').click());
  expect(tab('My updates').getAttribute('aria-pressed')).toBe('true');
  expect(releaseTitles()).toEqual(['Last Lotus']);
});

it('says the Tracker is not here yet when the host supplies no tracked series', () => {
  renderPage({ trackedWorldIds: undefined });
  act(() => tab('My updates').click());
  expect(container.textContent).toContain('My updates arrives with the Tracker');
  expect(container.textContent).not.toContain('Track a series');
});

it('names a search, not the tracked series, when a search empties My updates', () => {
  renderPage();
  act(() => tab('My updates').click());
  const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'moon');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(container.textContent).toContain('No tracked chapters match');
});

it('gives Fate Survival its own spotlight and opens worlds through the host', () => {
  const props = renderPage();
  const fate = container.querySelector('.discover-fate')!;
  expect(fate.textContent).toContain('Fate Survival');
  expect(fate.textContent).toContain('chapter by chapter');
  expect(fate.textContent).toContain('Ninth Trial');
  act(() => container.querySelector<HTMLButtonElement>('.world-card-menu')!.click());
  expect(props.onOpenWorld).toHaveBeenCalledWith('trial');
});

it('searches titles, creators, genres and tags across the page', () => {
  renderPage();
  const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'politics');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(releaseTitles()).toEqual(['Last Lotus']);
  expect(container.querySelector('.discover-fate')).toBeNull();
});

it('shows only the section\'s board, in the host\'s order, and retains ranks while filtering', () => {
  renderPage({ rankingBoards: [
    { id: 'worlds', kind: 'stories', label: 'Worlds', description: 'By activity', worldIds: ['moon', 'lotus'] },
    { id: 'creators', kind: 'creators', label: 'Creators', description: 'People' },
  ] });
  const ranked = () => [...container.querySelectorAll('ol[aria-label="Worlds ranking"] .world-card-menu-title')].map(node => node.textContent);
  expect(ranked()).toEqual([]);
  act(() => tab('My updates').click());
  chooseView('Rankings');
  expect(ranked()).toEqual(['Drowned Moon', 'Last Lotus']);
  expect(container.querySelector('ul[aria-label="Stories"]')).toBeNull();
  expect(container.querySelector('[aria-label="Stories feed"]')).toBeNull();
  expect(container.querySelector('ol[aria-label="Creators ranking"]')).toBeNull();
  chooseGenre('Xianxia');
  expect(ranked()).toEqual(['Last Lotus']);
  expect(container.querySelector('ol[aria-label="Worlds ranking"]')?.textContent).toContain('2');
  chooseView('Browse');
  expect(tab('My updates').getAttribute('aria-pressed')).toBe('true');
  expect(container.querySelector('ol[aria-label="Worlds ranking"]')).toBeNull();
});

it('puts the catalogue before features and filters Browse by genre', () => {
  renderPage({ featuredWorldIds: ['moon'] });
  const featured = container.querySelector('ul[aria-label="Featured worlds"]')!;
  const catalogue = container.querySelector('ul[aria-label="Stories"]')!;
  expect(featured.textContent).toContain('Drowned Moon');
  expect(catalogue.compareDocumentPosition(featured) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  chooseGenre('Xianxia');
  expect(container.querySelector('ul[aria-label="Stories"]')?.textContent).toContain('Last Lotus');
  expect(container.querySelector('ul[aria-label="Stories"]')?.textContent).not.toContain('Drowned Moon');
  expect(releaseTitles()).toEqual(['Last Lotus']);
});

function chooseGenre(value: string) {
  const select = container.querySelector<HTMLSelectElement>('.discover-genre-select select')!;
  act(() => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
}

const CREATORS = [
  { id: 'one', name: 'First Author', description: 'Cultivation', worldIds: ['lotus'] },
  { id: 'two', name: 'Second Author', description: 'Choices', worldIds: ['trial'] },
];
const ENTRIES = [
  { id: 'hero', kind: 'characters' as const, name: 'Lotus Keeper', description: 'A cultivator', worldId: 'lotus' },
  { id: 'wanderer', kind: 'characters' as const, name: 'Wanderer', description: 'An explorer', worldId: 'trial' },
  { id: 'sword', kind: 'items' as const, name: 'Jade Sword', description: 'A weapon', worldId: 'lotus' },
  { id: 'orphan', kind: 'characters' as const, name: 'Missing world', description: 'Invalid projection', worldId: 'gone' },
];

it('links Stories, Creators, Codex and Lore in order and keeps native modified link clicks', () => {
  const props = renderPage();
  const links = [...container.querySelectorAll<HTMLAnchorElement>('.discover-navigation a')];
  expect(links.map(link => link.textContent)).toEqual(['Stories', 'Creators', 'Codex', 'Lore']);
  act(() => links[3].click());
  expect(props.onSectionChange).toHaveBeenCalledWith('lore');
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
  act(() => links[1].dispatchEvent(event));
  expect(event.defaultPrevented).toBe(false);
  expect(props.onSectionChange).toHaveBeenCalledTimes(1);
});

it('starts a changed destination at the surface so sticky navigation does not hide its controls', () => {
  renderPage();
  const surface = container.querySelector<HTMLDivElement>('.discover-hub')!;
  const scroll = vi.fn();
  surface.scrollIntoView = scroll;
  renderPage({ section: 'creators', creators: CREATORS });
  expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
  renderPage({ section: 'lore', loreArticle: true });
  scroll.mockClear();
  renderPage({ section: 'lore', loreArticle: false });
  expect(scroll).toHaveBeenCalledOnce();
});

it('lists every creator once, scopes follows to creators, and filters by their stories\' genres', () => {
  renderPage({ section: 'creators', creators: CREATORS, followedCreatorIds: ['two'], rankingBoards: [
    { id: 'creators', kind: 'creators', label: 'Creators', description: 'Sample order', creatorIds: ['one', 'two'] },
  ] });
  const people = () => container.querySelector('ul[aria-label="Creators"]');
  expect(people()?.querySelectorAll('summary')).toHaveLength(2);
  act(() => tab('My updates').click());
  expect(people()?.textContent).toContain('Second Author');
  expect(people()?.textContent).not.toContain('First Author');
  chooseGenre('Xianxia');
  expect(people()).toBeNull();
  expect(container.textContent).toContain('No creators match');
  act(() => tab('All').click());
  expect(people()?.textContent).toContain('First Author');
  expect(people()?.textContent).not.toContain('Second Author');
  chooseView('Rankings');
  expect(container.querySelector('ol[aria-label="Creators ranking"]')?.textContent).toContain('First Author');
});

it('splits Codex into characters and items with scoped follows, genres and boards', () => {
  const props = renderPage({ section: 'codex', codexEntries: ENTRIES, trackedCodexIds: ['wanderer', 'sword'], rankingBoards: [
    { id: 'characters', kind: 'characters', label: 'Characters', description: 'Sample', entryIds: ['hero', 'wanderer', 'orphan'] },
    { id: 'items', kind: 'items', label: 'Items', description: 'Sample', entryIds: ['sword'] },
  ] });
  expect(container.querySelector('ul[aria-label="Codex characters"]')?.textContent).toContain('Lotus Keeper');
  expect(container.textContent).not.toContain('Missing world');
  act(() => tab('My updates').click());
  expect(container.querySelector('ul[aria-label="Codex characters"]')?.textContent).not.toContain('Lotus Keeper');
  chooseView('Items');
  expect(container.querySelector('ul[aria-label="Codex items"]')?.textContent).toContain('Jade Sword');
  act(() => container.querySelector<HTMLButtonElement>('ul[aria-label="Codex items"] .world-card-menu')!.click());
  expect(props.onOpenWorld).toHaveBeenCalledWith('lotus');
  chooseView('Rankings');
  expect(container.querySelector('ol[aria-label="Items ranking"]')?.textContent).toContain('Jade Sword');
  expect(container.querySelector('ol[aria-label="Characters ranking"]')).toBeNull();
  act(() => tab('Characters').click());
  expect(container.querySelector('ol[aria-label="Characters ranking"]')?.textContent).toContain('Lotus Keeper');
  expect(container.querySelector('ol[aria-label="Items ranking"]')).toBeNull();
  chooseView('Items');
  chooseGenre('Fate Survival');
  expect(container.textContent).toContain('No items match');
});

it('uses genre tiles to return to the matching catalogue, respecting the section feed', () => {
  renderPage();
  chooseView('Genres');
  const genres = () => container.querySelector('.discover-genre-grid')!;
  expect(genres().textContent).toContain('Xianxia');
  expect(genres().textContent).toContain('Dark Fantasy');
  act(() => tab('My updates').click());
  expect(genres().textContent).toContain('Xianxia');
  expect(genres().textContent).not.toContain('Dark Fantasy');
  act(() => [...genres().querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.startsWith('Xianxia'))!.click());
  expect(container.querySelector<HTMLSelectElement>('.discover-genre-select select')!.value).toBe('Xianxia');
  expect(container.querySelector('ul[aria-label="Stories"]')?.textContent).toContain('Last Lotus');
  expect(container.querySelector('.discover-genre-grid')).toBeNull();
});

it('counts creators once per genre and clears temporary views on section navigation', () => {
  renderPage({ section: 'creators', creators: [{ ...CREATORS[0], worldIds: ['lotus', 'moon'] }, CREATORS[1]], followedCreatorIds: ['one'] });
  act(() => tab('My updates').click());
  chooseView('Genres');
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('.discover-genre-grid button')];
  expect(buttons.map(button => button.textContent)).toEqual(['All genres', 'Dark Fantasy1 creator', 'Xianxia1 creator']);
  act(() => buttons[1].click());
  expect(container.querySelector('ul[aria-label="Creators"]')?.textContent).toContain('First Author');
  expect(container.querySelector('ul[aria-label="Creators"]')?.textContent).not.toContain('Second Author');
  renderPage({ section: 'stories' });
  expect(tab('All').getAttribute('aria-pressed')).toBe('true');
  expect(container.querySelector<HTMLSelectElement>('.discover-genre-select select')!.value).toBe('');
  expect(container.querySelector('ul[aria-label="Stories"]')).toBeTruthy();
});

it('opens the encyclopedia under Lore without genre filters or leaderboards', () => {
  const renderLore = vi.fn((updatesOnly: boolean) => <p>{updatesOnly ? 'Lore updates' : 'Encyclopedia'}</p>);
  renderPage({ section: 'lore', renderLore });
  expect(container.textContent).toContain('Encyclopedia');
  expect(container.querySelector('.discover-genre-select')).toBeNull();
  expect(container.textContent).not.toContain('Heavenly Rankings');
  act(() => tab('My updates').click());
  expect(container.textContent).toContain('Lore updates');
});

it('places the medium switcher above the section feed and displays unavailable following honestly', () => {
  const props = renderPage({ section: 'creators', creators: CREATORS });
  const switcher = container.querySelector('.discover-medium-switcher')!;
  const content = container.querySelector('.discover-content')!;
  expect(switcher.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect([...switcher.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Novel', 'Manga', 'Game', 'Video']);
  act(() => switcher.querySelectorAll<HTMLButtonElement>('button')[1].click());
  expect(props.onMediumChange).toHaveBeenCalledWith('manga');
  act(() => tab('My updates').click());
  expect(container.textContent).toContain('Creators updates are not available yet');
});

it('uses the selected medium for stories, creator sources, Codex and rankings', () => {
  const manga = { ...world('manga', 'Lotus Illustrated', 'Xianxia'), format: 'Manga' };
  const props = { medium: 'manga' as const, worlds: [...WORLDS, manga], creators: [{ ...CREATORS[0], worldIds: ['lotus', 'manga'] }, CREATORS[1]], codexEntries: [...ENTRIES, { ...ENTRIES[0], id: 'drawn-hero', worldId: 'manga', name: 'Drawn Keeper' }], rankingBoards: [{ id: 'stories', kind: 'stories' as const, label: 'Worlds', description: 'Sample', worldIds: ['lotus', 'manga'] }] };
  renderPage(props);
  expect(container.querySelector('ul[aria-label="Stories"]')?.textContent).toContain('Lotus Illustrated');
  expect(container.textContent).not.toContain('Last Lotus');
  chooseView('Rankings');
  expect(container.querySelector('ol[aria-label="Worlds ranking"]')?.textContent).toContain('Lotus Illustrated');
  expect(container.textContent).not.toContain('Last Lotus');
  renderPage({ ...props, section: 'creators' });
  expect(container.querySelector('ul[aria-label="Creators"]')?.textContent).toContain('First Author');
  expect(container.textContent).not.toContain('Second Author');
  expect(container.textContent).not.toContain('Last Lotus');
  renderPage({ ...props, section: 'codex' });
  expect(container.querySelector('ul[aria-label="Codex characters"]')?.textContent).toContain('Drawn Keeper');
  expect(container.textContent).not.toContain('Lotus Keeper');
});

it('keeps the same browsing controls for upcoming mediums and keeps Lore shared', () => {
  for (const medium of ['manga', 'game', 'video'] as const) {
    renderPage({ medium });
    expect(container.textContent).toContain('catalogue coming soon');
    expect(container.querySelector('[aria-label="Stories views"]')).toBeTruthy();
    expect(container.querySelector('.discover-genre-select')).toBeTruthy();
    expect(container.querySelector('ul[aria-label="Stories"]')).toBeNull();
    chooseView('Rankings');
    expect(container.textContent).toContain('Heavenly Rankings');
    renderPage({ medium, section: 'lore' });
    expect(container.textContent).toContain('Encyclopedia');
    expect(container.textContent).toContain('Lore is shared across all mediums');
    expect(container.textContent).not.toContain('catalogue coming soon');
  }
});

it('words release ages plainly', () => {
  expect(releaseAge('2026-10-20T11:59:40Z', NOW)).toBe('Just now');
  expect(releaseAge('2026-10-20T11:48:00Z', NOW)).toBe('12m ago');
  expect(releaseAge('2026-10-20T07:00:00Z', NOW)).toBe('5h ago');
  expect(releaseAge('2026-10-17T12:00:00Z', NOW)).toBe('3d ago');
});
