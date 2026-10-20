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
const releaseTitles = () => [...container.querySelectorAll('ol[aria-label="New chapters"] .discover-row-title, ol[aria-label="My updates"] .discover-row-title')].map(node => node.textContent);
const tab = (label: string) => [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(node => node.textContent === label)!;

it('lists releases newest first, skipping releases of worlds it does not have', () => {
  renderPage();
  expect(container.querySelector('h1')?.textContent).toBe('Discover');
  expect(releaseTitles()).toEqual(['Ninth Trial', 'Last Lotus', 'Drowned Moon']);
  expect(container.querySelector('.discover-row-chapter')?.textContent).toBe('Chapter 5 · The Door');
});

it('narrows the feed to tracked series in My updates', () => {
  renderPage();
  act(() => tab('My updates').click());
  expect(tab('My updates').getAttribute('aria-selected')).toBe('true');
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
  act(() => container.querySelector<HTMLButtonElement>('.discover-row')!.click());
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

it('shows a ranking board in the host\'s order, and a closed board as opening soon', () => {
  renderPage({ rankingBoards: [
    { id: 'worlds', label: 'Worlds', description: 'By activity', worldIds: ['moon', 'lotus'] },
    { id: 'familiars', label: 'Familiars', description: 'Companions' },
  ] });
  const ranked = () => [...container.querySelectorAll('ol[aria-label="Worlds ranking"] .discover-row-title')].map(node => node.textContent);
  expect(ranked()).toEqual(['Drowned Moon', 'Last Lotus']);
  act(() => tab('Familiars').click());
  expect(container.textContent).toContain('Familiars opens soon');
});

it('features the host\'s worlds first and filters Browse by genre', () => {
  renderPage({ featuredWorldIds: ['moon'] });
  expect(container.querySelector('ul[aria-label="Featured worlds"]')?.textContent).toContain('Drowned Moon');
  const genre = [...container.querySelectorAll<HTMLButtonElement>('.discover-genre')].find(node => node.textContent === 'Xianxia')!;
  act(() => genre.click());
  expect(genre.getAttribute('aria-pressed')).toBe('true');
  expect(container.querySelector('ul[aria-label="Xianxia worlds"]')?.textContent).toContain('Last Lotus');
  expect(container.querySelector('ul[aria-label="Xianxia worlds"]')?.textContent).not.toContain('Drowned Moon');
});

it('words release ages plainly', () => {
  expect(releaseAge('2026-10-20T11:59:40Z', NOW)).toBe('Just now');
  expect(releaseAge('2026-10-20T11:48:00Z', NOW)).toBe('12m ago');
  expect(releaseAge('2026-10-20T07:00:00Z', NOW)).toBe('5h ago');
  expect(releaseAge('2026-10-17T12:00:00Z', NOW)).toBe('3d ago');
});
