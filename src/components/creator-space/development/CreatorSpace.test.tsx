// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import type { EnergyAccountState } from '../../energy/shared/useEnergyAccount';
import type { CreatorSpaceProps, CreatorWorld } from '../shared/creatorSpaceContracts';
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
    toolkit: [{ id: 'style', kind: 'style', title: 'Style Packs', description: 'Writing styles.' }],
    onCreate: vi.fn(), onOpenEnergy: vi.fn(), onContinueWorld: vi.fn(), onOpenStudio: vi.fn(),
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
  const cards = Array.from(container.querySelectorAll<HTMLElement>('.creator-space-world'));
  expect(cards.map(card => card.getAttribute('aria-label'))).toEqual([
    'The Last Lotus of the Jade Empire, Ch. 24 · Draft',
    'Ashes of the Nine Moons, Ch. 12 · Draft',
    'The Pavilion Beneath the Lake, Ch. 40 · Complete',
  ]);
  expect(cards[0].getAttribute('aria-pressed')).toBe('true');
  expect(selected()?.querySelector('h3')?.textContent).toBe('The Last Lotus of the Jade Empire');
  expect(Array.from(selected()!.querySelectorAll('button')).map(item => item.textContent?.trim())).toEqual(['Continue', 'Studio']);

  click(cards[1]);
  expect(cards[1].getAttribute('aria-pressed')).toBe('true');
  expect(cards[0].getAttribute('aria-pressed')).toBe('false');
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
  click(container.querySelectorAll<HTMLElement>('.creator-space-world')[2]);
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
  expect(browse).toHaveBeenCalledTimes(2);
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
