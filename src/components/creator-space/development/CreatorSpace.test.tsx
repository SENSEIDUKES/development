// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import type { EnergyAccountState } from '../../energy/shared/useEnergyAccount';
import type { CreatorPluginCatalog, CreatorSpaceProps, CreatorWorld } from '../shared/creatorSpaceContracts';
import { CreatorPlugins } from './CreatorPlugins';
import { CreatorSpace } from './CreatorSpace';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const WORLDS: CreatorWorld[] = [
  { id: 'older', title: 'Ashes of the Nine Moons', chapterCount: 12, status: 'draft', updatedAt: '2026-09-20T00:00:00Z', imageUrl: '/a.png' },
  { id: 'newest', title: 'The Last Lotus of the Jade Empire', chapterCount: 24, status: 'draft', updatedAt: '2026-09-26T00:00:00Z', imageUrl: '/b.png' },
  { id: 'ended', title: 'The Pavilion Beneath the Lake', chapterCount: 40, status: 'complete', updatedAt: '2026-09-10T00:00:00Z' },
];
const readyEnergy = (available: number): Pick<EnergyAccountState, 'status' | 'snapshot'> => ({
  status: 'ready',
  snapshot: { uid: 'u', balance: available, held: 0, available, prices: [], activity: [], developmentControls: null, updatedAt: '2026-09-26T00:00:00Z' },
});

function renderPage(overrides: Partial<CreatorSpaceProps> = {}) {
  const props: CreatorSpaceProps = {
    worlds: { status: 'ready', items: WORLDS },
    energy: readyEnergy(320),
    toolkit: [
      { id: 'style', kind: 'style', title: 'Style Packs', description: 'Writing styles.' },
      { id: 'soundscape', kind: 'soundscape', title: 'Soundscapes', description: 'Ambient scores.' },
      { id: 'cue', kind: 'cue', title: 'Cues', description: 'Sound effects.' },
      { id: 'atmosphere', kind: 'atmosphere', title: 'Atmospheres', description: 'Place sounds.' },
    ],
    onCreate: vi.fn(), onOpenEnergy: vi.fn(), onContinueWorld: vi.fn(), onOpenWorld: vi.fn(), onOpenStudio: vi.fn(),
    ...overrides,
  };
  act(() => root.render(<LibraryPresentationProvider><CreatorSpace {...props} /></LibraryPresentationProvider>));
  return props;
}
const button = (name: string | RegExp) => Array.from(container.querySelectorAll<HTMLElement>('button, [role="button"]'))
  .find(element => {
    const label = (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();
    return typeof name === 'string' ? label === name : name.test(label);
  });
const click = (element: HTMLElement | undefined) => act(() => { element!.click(); });
const selected = () => container.querySelector('.creator-space-selected');

it('shows the creator workspace, its two readings and the world count', () => {
  const props = renderPage();
  expect(container.querySelector('h1')?.textContent).toBe('Creator Space');
  expect(container.textContent).toContain('3 worlds');
  const energy = container.querySelector<HTMLButtonElement>('button.creator-space-stat')!;
  expect(energy.textContent).toContain('Energy');
  expect(energy.textContent).toContain('320');
  expect(container.querySelectorAll('.creator-space-stat')).toHaveLength(2);
  // In progress counts every world that has not reached its ending, and goes nowhere.
  const progress = container.querySelectorAll('.creator-space-stat')[1];
  expect(progress.tagName).toBe('DIV');
  expect(progress.textContent).toContain('In progress2');
  click(energy);
  expect(props.onOpenEnergy).toHaveBeenCalledTimes(1);
  click(button('Create'));
  expect(props.onCreate).toHaveBeenCalledTimes(1);
});

it('selects the most recent world first and retargets exactly two actions to the tapped world', () => {
  const props = renderPage();
  const cards = Array.from(container.querySelectorAll<HTMLElement>('.world-card-compact'));
  const opens = cards.map(card => card.querySelector<HTMLElement>('.world-card-base-open')!);
  expect(opens.map(open => open.getAttribute('aria-label'))).toEqual([
    'Open The Last Lotus of the Jade Empire, 24 chapters, Draft',
    'Open Ashes of the Nine Moons, 12 chapters, Draft',
    'Open The Pavilion Beneath the Lake, 40 chapters, Complete',
  ]);
  expect(cards[0].getAttribute('data-selected')).toBe('true');
  expect(selected()?.querySelector('h3')?.textContent).toBe('The Last Lotus of the Jade Empire');
  expect(Array.from(selected()!.querySelectorAll('button')).map(item => item.textContent?.trim())).toEqual(['Continue', 'Studio']);

  click(opens[1]);
  expect(cards[1].getAttribute('data-selected')).toBe('true');
  expect(cards[0].getAttribute('data-selected')).toBeNull();
  expect(props.onOpenWorld).toHaveBeenCalledWith(WORLDS[0]);
  expect(selected()?.querySelector('h3')?.textContent).toBe('Ashes of the Nine Moons');
  click(button('Continue'));
  expect(props.onContinueWorld).toHaveBeenCalledWith('older');
  click(button('Studio'));
  expect(props.onOpenStudio).toHaveBeenCalledWith('older');
  // Both actions name the world they act on.
  const description = button('Continue')!.getAttribute('aria-describedby')!.split(' ')[0];
  expect(document.getElementById(description)?.textContent).toBe('Ashes of the Nine Moons');
});

it('keeps Studio open but stops Continue for a world that reached its ending', () => {
  const props = renderPage();
  click(container.querySelectorAll<HTMLElement>('.world-card-compact .world-card-base-open')[2]);
  expect((button('Continue') as HTMLButtonElement).disabled).toBe(true);
  expect(selected()?.textContent).toContain('This story has reached its ending.');
  click(button('Studio'));
  expect(props.onOpenStudio).toHaveBeenCalledWith('ended');
});

it('says honestly that the plugin browser is not open yet, unless the host supplies one', () => {
  renderPage();
  const status = container.querySelector('#creator-toolkit-title')!.closest('section')!.querySelector('[role="status"]')!;
  expect(status.textContent).toBe('');
  expect(container.textContent).toContain('Preview');
  click(button(/^Browse plugins/));
  expect(status.textContent).toContain('The plugin browser is still being built');

  const browse = vi.fn();
  renderPage({ onBrowseToolkit: browse });
  click(button(/^Browse plugins/));
  click(button(/^Style Packs/));
  click(button(/^Cues/));
  click(button(/^Atmospheres/));
  expect(browse.mock.calls).toEqual([[undefined], ['style'], ['cue'], ['atmosphere']]);
});

it('lists parent .spp packs first and reveals individual files only when a parent .spp is clicked', () => {
  const catalog: CreatorPluginCatalog = {
    packages: [
      {
        id: 'ne-style-chinese',
        kind: 'style',
        title: 'NovelExpanded Chinese Style',
        description: 'Cultivation prose.',
        version: '1.0.0',
        builtIn: true,
        unitSingular: 'guide',
        unitPlural: 'guides',
        groups: [{ id: 'chinese', label: 'Xianxia · Xuanhuan', files: [{ id: 'g1', title: 'Chinese Prose Guide' }] }],
      },
      {
        id: 'ne-soundscapes-vol-1',
        kind: 'soundscape',
        title: 'NovelExpanded Soundscapes Vol. 1',
        description: 'Composed ambient scores.',
        version: '1.0.0',
        builtIn: true,
        unitSingular: 'score',
        unitPlural: 'scores',
        groups: [
          {
            id: 'adventure',
            label: 'Adventure',
            files: [
              { id: 't1', title: 'Adventure 4 Banished' },
              { id: 't2', title: 'Adventure Leveling Up' },
              { id: 't3', title: 'Adventure Market' },
            ],
          },
          {
            id: 'ambient',
            label: 'Ambient',
            files: [
              { id: 't4', title: 'Ambient Night' },
              { id: 't5', title: 'Ambient Starter' },
            ],
          },
        ],
      },
      {
        id: 'ne-cues-vol-1',
        kind: 'cue',
        title: 'NovelExpanded Cues Vol. 1',
        description: 'Inline sound effects.',
        version: '1.0.0',
        builtIn: true,
        unitSingular: 'effect',
        unitPlural: 'effects',
        groups: [{ id: 'weapons', label: 'Weapons', files: [{ id: 'c1', title: 'Blade Unsheathe 1', badge: 'blade drawn' }] }],
      },
      {
        id: 'ne-atmospheres-vol-1',
        kind: 'atmosphere',
        title: 'NovelExpanded Atmospheres Vol. 1',
        description: 'Weather beds.',
        version: '1.0.0',
        builtIn: true,
        unitSingular: 'bed',
        unitPlural: 'beds',
        groups: [{ id: 'rain', label: 'Rain', files: [{ id: 'a1', title: 'Gentle Rain 1', badge: 'gentle rain' }] }],
      },
    ],
  };
  const onBack = vi.fn();
  const onFilterChange = vi.fn();
  act(() => root.render(
    <LibraryPresentationProvider>
      <CreatorPlugins catalog={catalog} initialFilter="all" onFilterChange={onFilterChange} onBack={onBack} />
    </LibraryPresentationProvider>,
  ));

  // Top level shows parent .spp packages and group counts, NOT individual files.
  expect(container.querySelector('h1')?.textContent).toBe('Creator Plugins');
  expect(container.textContent).toContain('NovelExpanded Soundscapes Vol. 1');
  expect(container.textContent).toContain('Adventure (3)');
  expect(container.textContent).toContain('Ambient (2)');
  expect(container.textContent).not.toContain('Adventure 4 Banished');
  expect(container.textContent).not.toContain('Blade Unsheathe 1');

  // Clicking the parent .spp opens it and reveals its groups and individual files.
  click(container.querySelector<HTMLElement>('[data-testid="plugin-spp-ne-soundscapes-vol-1"]') ?? undefined);
  expect(container.querySelector('h1')?.textContent).toBe('NovelExpanded Soundscapes Vol. 1');
  expect(container.textContent).toContain('Adventure 4 Banished');
  expect(container.textContent).toContain('Ambient Night');

  // Filtering by a group inside the .spp narrows to that group's files.
  click(button('Ambient (2)'));
  expect(container.textContent).toContain('Ambient Night');
  expect(container.textContent).not.toContain('Adventure 4 Banished');

  // Back returns to the parent .spp list, and Back again returns to Create.
  click(button('Back to Creator Plugins'));
  expect(container.querySelector('h1')?.textContent).toBe('Creator Plugins');
  expect(container.textContent).not.toContain('Ambient Night');

  click(button('Cues'));
  expect(onFilterChange).toHaveBeenCalledWith('cue');
  expect(container.textContent).toContain('NovelExpanded Cues Vol. 1');
  expect(container.textContent).not.toContain('NovelExpanded Chinese Style');

  click(button('Back to Create'));
  expect(onBack).toHaveBeenCalledTimes(1);
});

it('distinguishes loading, empty and failed worlds without inventing numbers', () => {
  renderPage({ worlds: { status: 'loading' }, energy: { status: 'loading', snapshot: null } });
  expect(container.querySelector('[aria-label="Loading your worlds"]')).not.toBeNull();
  expect(container.textContent).not.toMatch(/\d+ worlds?/);
  expect(container.querySelector('button.creator-space-stat')?.textContent).toContain('—');

  renderPage({ worlds: { status: 'ready', items: [] }, energy: { status: 'unavailable', snapshot: null } });
  expect(container.textContent).toContain('0 worlds');
  expect(container.textContent).toContain('No worlds yet');
  expect(container.textContent).toContain('Not connected');
  expect(selected()).toBeNull();

  const retry = vi.fn();
  renderPage({ worlds: { status: 'error', error: 'Storage is blocked.' }, onRetryWorlds: retry });
  expect(container.textContent).toContain('Storage is blocked.');
  click(button('Try again'));
  expect(retry).toHaveBeenCalledTimes(1);
});

it('reads Energy without a destination when the host offers none', () => {
  renderPage({ onOpenEnergy: undefined, energy: readyEnergy(1250) });
  expect(container.querySelector('button.creator-space-stat')).toBeNull();
  expect(container.querySelector('.creator-space-stat')?.textContent).toContain('1,250');
});
