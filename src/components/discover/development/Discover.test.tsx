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
  id, title, genre, tags, createdAt: '2026-10-01T00:00:00Z', reads: 0, imageUrl: '', chapterCount: 3, mcName: '', powerStage: '',
});
const WORLDS = [world('lotus', 'Last Lotus', 'Xianxia', ['sect politics']), world('trial', 'Ninth Trial', 'Fate Survival'), world('moon', 'Drowned Moon', 'Dark Fantasy')];

function renderPage(overrides: Partial<DiscoverProps> = {}) {
  const props: DiscoverProps = {
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
  expect(ranked()).toEqual(['Drowned Moon', 'Last Lotus']);
  expect(container.querySelector('ol[aria-label="Creators ranking"]')).toBeNull();
  chooseGenre('Xianxia');
  expect(ranked()).toEqual(['Last Lotus']);
  expect(container.querySelector('ol[aria-label="Worlds ranking"]')?.textContent).toContain('2');
});

it('features the host\'s worlds first and filters Browse by genre', () => {
  renderPage({ featuredWorldIds: ['moon'] });
  expect(container.querySelector('ul[aria-label="Featured worlds"]')?.textContent).toContain('Drowned Moon');
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
  act(() => container.querySelectorAll<HTMLButtonElement>('.discover-codex-categories button')[1].click());
  expect(container.querySelector('ul[aria-label="Codex items"]')?.textContent).toContain('Jade Sword');
  expect(container.querySelector('ol[aria-label="Items ranking"]')?.textContent).toContain('Jade Sword');
  expect(container.querySelector('ol[aria-label="Characters ranking"]')).toBeNull();
  act(() => container.querySelector<HTMLButtonElement>('ul[aria-label="Codex items"] .world-card-menu')!.click());
  expect(props.onOpenWorld).toHaveBeenCalledWith('lotus');
  chooseGenre('Fate Survival');
  expect(container.textContent).toContain('No items match');
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

it('places Events above the section feed and displays unavailable following honestly', () => {
  renderPage({ section: 'creators', creators: CREATORS, events: [{ id: 'week', title: 'Mystery Week', description: 'Sample event', when: 'Coming soon' }] });
  const events = container.querySelector('.discover-events-strip')!;
  const content = container.querySelector('.discover-content')!;
  expect(events.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  act(() => tab('My updates').click());
  expect(container.textContent).toContain('Creators updates are not available yet');
});

it('words release ages plainly', () => {
  expect(releaseAge('2026-10-20T11:59:40Z', NOW)).toBe('Just now');
  expect(releaseAge('2026-10-20T11:48:00Z', NOW)).toBe('12m ago');
  expect(releaseAge('2026-10-20T07:00:00Z', NOW)).toBe('5h ago');
  expect(releaseAge('2026-10-17T12:00:00Z', NOW)).toBe('3d ago');
});
