// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RelicsWorkspace } from './RelicsWorkspace';

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
  for (let round = 0; round < 6; round += 1) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
};
const button = (label: string) => {
  const match = [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent?.replace(/\s+/g, ' ').trim().startsWith(label));
  if (!match) throw new Error(`No button starting with "${label}"`);
  return match;
};
const click = async (element: HTMLElement) => { await act(async () => element.click()); await settle(); };
const balance = (id: string) => Number(document.querySelector(`[data-balance="${id}"]`)?.textContent?.replace(/[^\d]/g, '') ?? NaN);

it('grants a Relic only from a Fate Survival outcome, reveals it, and credits its DAO XP and Energy', async () => {
  await act(async () => { root.render(<RelicsWorkspace />); });
  await settle();
  expect(document.querySelector('[data-fate-survival-relics]')?.textContent).toContain('Relics come only from Fate Survival challenges.');
  const energyBefore = balance('energy');
  expect(balance('dao-xp')).toBe(0);

  await click(button('Fate averted → Legendary'));
  const sealed = document.querySelector<HTMLButtonElement>('[data-reward-sealed]');
  expect(sealed?.textContent).toContain('Sealed Relic');
  await click(sealed!);
  const card = document.querySelector('[data-reward-card]')!;
  expect(card.getAttribute('data-reward-rarity')).toBe('Legendary');
  expect([...card.querySelectorAll('[data-reward-grant]')].map(cell => cell.getAttribute('data-reward-grant'))).toEqual(['dao-xp', 'energy']);
  expect(balance('dao-xp')).toBe(200);
  expect(balance('energy')).toBe(energyBefore + 40);
  expect(balance('qi')).toBe(0);

  await click(button('Continue'));
  expect(document.querySelector('[data-reward-card]')).toBeNull();
  expect(document.querySelectorAll('[data-fate-survival-relic]')).toHaveLength(1);

  await click(button('Doom manifested → no Relic'));
  expect(document.querySelector('[data-relic-outcome-message]')?.textContent).toBe('DOOM MANIFESTED: this outcome earns no Relic.');
  expect(document.querySelectorAll('[data-fate-survival-relic]')).toHaveLength(1);
  expect(document.querySelector('[data-reward-sealed]')).toBeNull();
});

it('plays the Relic Reveal at any rarity in the reveal lab', async () => {
  await act(async () => { root.render(<RelicsWorkspace />); });
  await settle();
  await click(button('Reveal lab'));
  await click(button('Effects'));
  await click(button('Mythic'));
  await click(button('Open the Mythic reveal'));
  await click(document.querySelector<HTMLButtonElement>('[data-reward-sealed]')!);
  expect(document.querySelector('[data-reward-card]')?.getAttribute('data-reward-rarity')).toBe('Mythic');
  expect(document.querySelector('[data-reward-name]')?.textContent).toBe('The Unwritten Page');
  expect(button('Replay effects')).toBeDefined();
});
