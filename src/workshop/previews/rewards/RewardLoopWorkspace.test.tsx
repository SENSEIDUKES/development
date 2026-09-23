// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RewardLoopWorkspace } from './RewardLoopWorkspace';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // Reduced motion keeps every reveal transition instant.
  vi.stubGlobal('matchMedia', vi.fn((media: string) => ({ media, matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const settle = async () => {
  for (let round = 0; round < 8; round += 1) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
};
const button = (label: string, scope: ParentNode = document) => {
  const match = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.replace(/\s+/g, ' ').trim().startsWith(label));
  if (!match) throw new Error(`No button starting with "${label}"`);
  return match;
};
const step = (label: string) => button(label, document.querySelector('nav[aria-label="Reward Loop steps"]')!);
const click = async (element: HTMLElement) => { await act(async () => element.click()); await settle(); };
const balance = (id: string) => Number(document.querySelector(`[data-balance="${id}"]`)?.textContent?.replace(/[^\d]/g, '') ?? NaN);

it('carries one account from reading to an opened scroll to Familiar training, moving each balance only where it should', async () => {
  await act(async () => { root.render(<RewardLoopWorkspace />); });
  await settle();
  expect(balance('dao-xp')).toBe(0);
  expect(balance('qi')).toBe(0);
  expect(document.querySelector('[data-cultivator-rank]')?.getAttribute('data-cultivator-rank')).toBe('reader');

  await click(button('Read a chapter'));
  expect(document.querySelector('[data-activity-message]')?.textContent).toContain('First Page Turned');
  expect(balance('dao-xp')).toBe(0);

  await click(step('Rewards'));
  await click(document.querySelector<HTMLButtonElement>('[data-mystery-scroll="reading.first-chapter"]')!);
  expect(document.querySelector('[data-mystery-scroll-concealed]')).not.toBeNull();
  await click(document.querySelector<HTMLButtonElement>('[data-reward-reveal] [data-reveal-action="unseal"]')!);
  expect(document.querySelector('[data-reward-card]')?.getAttribute('data-reward-rarity')).toBe('Common');
  // The scroll's reward lands on the ledgers and the balance strip re-reads them.
  expect(balance('dao-xp')).toBe(25);
  expect(balance('qi')).toBe(100);
  await click(button('Continue'));

  await click(step('Familiar'));
  await click(document.querySelector<HTMLButtonElement>('[data-familiar-offer]:not([disabled])')!);
  expect(balance('qi')).toBe(0);
  // Training spends QI and never touches DAO XP or rank.
  expect(balance('dao-xp')).toBe(25);
});
