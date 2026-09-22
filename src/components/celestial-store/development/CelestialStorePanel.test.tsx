// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QiAccountState } from '../../../library/cultivation/contracts';
import type { EnergyAccountState } from '../../energy/shared/useEnergyAccount';
import type { FamiliarOption } from '../../familiar/shared/familiar';
import { dailyStoreRotation } from '../shared/rotation';
import { CelestialStorePanel } from './CelestialStorePanel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const render = async (node: React.ReactNode) => {
  await act(async () => { root.render(node); });
};

const click = async (element: Element | null | undefined) => {
  expect(element, 'expected element to click').not.toBeNull();
  await act(async () => {
    (element as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};

const option = (id: string, rarity: FamiliarOption['rarity'], isDefault = false): FamiliarOption => ({
  id,
  name: id.replace(/-/g, ' '),
  description: `${id} watches over the Library.`,
  rarity,
  isDefault,
  heroUrl: `https://example.test/${id}.gif`,
  stillUrl: `/familiars/${id}/neutral.png`,
  available: true,
});

const OPTIONS: readonly FamiliarOption[] = [
  option('celestial-guardian', 'epic'),
  option('little-monkey-king', 'rare'),
  option('phoenix', 'epic'),
  option('nine-tailed-fox', 'rare'),
  option('celestial-moon-moth', 'epic'),
  option('galaxy-octopus', 'rare'),
  option('judgmental-jiangshi', 'rare'),
  option('lucky-bake-danuki', 'common'),
  option('lady-bug', 'common'),
  option('living-grimoire', 'common'),
  option('quill', 'common', true),
];

const DAY = new Date(2026, 8, 22, 12, 0);

const qiReady = (balance: number): QiAccountState => ({
  status: 'ready',
  snapshot: { uid: 'cultivator', balance, transactions: [] },
  error: null,
});

const energyReady = (available: number): EnergyAccountState => ({
  status: 'ready',
  snapshot: {
    uid: 'cultivator', balance: available, held: 0, available,
    prices: [], activity: [], developmentControls: null, updatedAt: '2026-09-22T00:00:00.000Z',
  },
  error: null,
  pending: false,
  refresh: async () => {},
  grantDevelopment: async () => {},
  resetDevelopment: async () => {},
});

describe('CelestialStorePanel', () => {
  it('renders live balances from the QI ledger and Energy account, never static amounts', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} cultivation={qiReady(28_400)} energy={energyReady(1_250)} />);
    expect(container.querySelector('[aria-label="QI balance 28,400"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Energy balance 1250"]')).not.toBeNull();
  });

  it('shows unavailable balances as unknown rather than inventing numbers', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} />);
    expect(container.querySelector('[aria-label="QI balance unavailable"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Energy balance unavailable"]')).not.toBeNull();
  });

  it('separates two Energy offers and four QI offers into their own framed shelves', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} />);
    const energyShelf = container.querySelector('[data-store-shelf="energy"]')!;
    const qiShelf = container.querySelector('[data-store-shelf="qi"]')!;
    expect(energyShelf.textContent).toContain('Energy Familiars');
    expect(qiShelf.textContent).toContain('QI Familiars');
    const energyCards = energyShelf.querySelectorAll('[data-store-offer]');
    const qiCards = qiShelf.querySelectorAll('[data-store-offer]');
    expect(energyCards).toHaveLength(2);
    expect(qiCards).toHaveLength(4);
    for (const card of energyCards) expect(card.getAttribute('data-store-currency')).toBe('energy');
    for (const card of qiCards) expect(card.getAttribute('data-store-currency')).toBe('qi');
  });

  it('displays catalogue rank and one price per card, and reduced-motion still sources', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} />);
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    for (const offer of [...rotation.energy, ...rotation.qi]) {
      const card = container.querySelector(`[data-store-offer="${offer.familiarId}"]`)!;
      expect(card.querySelector('.familiar-option-rarity')?.textContent).toBe(offer.option.rarity);
      expect(card.querySelector('[data-store-price]')?.getAttribute('data-store-price')).toBe(String(offer.price));
      expect(card.querySelectorAll('[data-store-price]')).toHaveLength(1);
      expect(card.querySelector('source[media="(prefers-reduced-motion: reduce)"]')?.getAttribute('srcset')).toBe(offer.option.stillUrl);
      expect(card.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    }
  });

  it('marks owned and equipped offers instead of pricing them', async () => {
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    const [first, second] = rotation.qi;
    await render(<CelestialStorePanel options={OPTIONS} date={DAY}
      ownedFamiliarIds={[first.familiarId, second.familiarId]} equippedFamiliarId={second.familiarId} />);
    const ownedCard = container.querySelector(`[data-store-offer="${first.familiarId}"]`)!;
    const equippedCard = container.querySelector(`[data-store-offer="${second.familiarId}"]`)!;
    expect(ownedCard.textContent).toContain('Owned');
    expect(ownedCard.querySelector('[data-store-price]')).toBeNull();
    expect(equippedCard.textContent).toContain('Equipped');
    expect(equippedCard.querySelector('[data-store-price]')).toBeNull();
  });

  it('opens a detail dialog that purchases through the account port with the shown price', async () => {
    const onPurchase = vi.fn().mockResolvedValue({ outcome: 'purchased', message: 'It joins your cave.' });
    await render(<CelestialStorePanel options={OPTIONS} date={DAY}
      cultivation={qiReady(100_000)} energy={energyReady(2_000)} onPurchase={onPurchase} />);
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    const offer = rotation.energy[0];
    await click(container.querySelector(`[data-store-offer="${offer.familiarId}"] button`));
    const dialog = document.querySelector('.celestial-store-detail')!;
    expect(dialog.textContent).toContain(offer.option.name);
    expect(dialog.textContent).toContain(offer.option.description);
    const buy = [...dialog.querySelectorAll('button')].find(candidate => candidate.textContent?.startsWith('Buy for'))!;
    expect(buy.textContent).toBe(`Buy for ${offer.price.toLocaleString('en-US')} Energy`);
    await click(buy);
    expect(onPurchase).toHaveBeenCalledWith({ familiarId: offer.familiarId, currency: 'energy', price: offer.price });
    expect(dialog.querySelector('[role="status"]')?.textContent).toBe('It joins your cave.');
  });

  it('disables Buy when the balance cannot cover the price', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY}
      cultivation={qiReady(10)} energy={energyReady(10)} onPurchase={vi.fn()} />);
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    await click(container.querySelector(`[data-store-offer="${rotation.qi[0].familiarId}"] button`));
    const dialog = document.querySelector('.celestial-store-detail')!;
    const buy = [...dialog.querySelectorAll('button')].find(candidate => candidate.textContent?.includes('Not enough'))!;
    expect(buy.textContent).toBe('Not enough QI');
    expect(buy).toHaveProperty('disabled', true);
  });

  it('equips an owned Familiar through the controller action and shows Equipped afterwards', async () => {
    const onEquip = vi.fn();
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    const offer = rotation.energy[0];
    await render(<CelestialStorePanel options={OPTIONS} date={DAY}
      ownedFamiliarIds={[offer.familiarId]} onEquip={onEquip} />);
    await click(container.querySelector(`[data-store-offer="${offer.familiarId}"] button`));
    const dialog = document.querySelector('.celestial-store-detail')!;
    const equip = [...dialog.querySelectorAll('button')].find(candidate => candidate.textContent?.startsWith('Equip'))!;
    await click(equip);
    expect(onEquip).toHaveBeenCalledWith(offer.familiarId);
    await render(<CelestialStorePanel options={OPTIONS} date={DAY}
      ownedFamiliarIds={[offer.familiarId]} equippedFamiliarId={offer.familiarId} onEquip={onEquip} />);
    const equipped = [...document.querySelectorAll('.celestial-store-detail button')].find(candidate => candidate.textContent === 'Equipped')!;
    expect(equipped).toHaveProperty('disabled', true);
  });

  it('sends one purchase for one offer even when Buy is activated twice before the host reports pending', async () => {
    // A host may not supply `purchasePending` at all, so the panel must serialize on its own.
    let settle: (result: { outcome: 'purchased'; message: string }) => void = () => {};
    const onPurchase = vi.fn().mockImplementation(() => new Promise(resolve => { settle = resolve; }));
    await render(<CelestialStorePanel options={OPTIONS} date={DAY}
      cultivation={qiReady(100_000)} energy={energyReady(2_000)} onPurchase={onPurchase} />);
    const offer = dailyStoreRotation(OPTIONS, DAY).energy[0];
    await click(container.querySelector(`[data-store-offer="${offer.familiarId}"] button`));
    const dialog = document.querySelector('.celestial-store-detail')!;
    const buy = [...dialog.querySelectorAll('button')].find(candidate => candidate.textContent?.startsWith('Buy for'))!;
    await click(buy);
    await click(buy);
    expect(onPurchase).toHaveBeenCalledTimes(1);
    // The control stays disabled and honest until the request settles.
    const inFlight = [...dialog.querySelectorAll('button')].find(candidate => candidate.textContent === 'Purchasing…')!;
    expect(inFlight).toHaveProperty('disabled', true);
    await act(async () => { settle({ outcome: 'purchased', message: 'Bought once.' }); });
    expect(onPurchase).toHaveBeenCalledTimes(1);
    expect(dialog.querySelector('[role="status"]')?.textContent).toBe('Bought once.');
  });

  it('rotates at local midnight and closes an offer opened the previous day', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 8, 22, 23, 59, 30));
      await render(<CelestialStorePanel options={OPTIONS}
        cultivation={qiReady(100_000)} energy={energyReady(2_000)} onPurchase={vi.fn()} />);
      const yesterday = container.querySelector('.celestial-store')?.getAttribute('data-store-day');
      expect(yesterday).toBe('2026-09-22');
      const offer = dailyStoreRotation(OPTIONS, new Date(2026, 8, 22)).qi[0];
      await click(container.querySelector(`[data-store-offer="${offer.familiarId}"] button`));
      expect(document.querySelector('.celestial-store-detail')).not.toBeNull();
      // Cross midnight: the shelves become the new day's, and yesterday's offer
      // can no longer be submitted from a dialog left open.
      vi.setSystemTime(new Date(2026, 8, 23, 0, 0, 1));
      await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
      expect(container.querySelector('.celestial-store')?.getAttribute('data-store-day')).toBe('2026-09-23');
      expect([...document.querySelectorAll('.celestial-store-detail button')]
        .some(button => button.textContent?.startsWith('Buy for'))).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps an explicitly supplied date fixed rather than following the clock', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 8, 22, 23, 59, 30));
      await render(<CelestialStorePanel options={OPTIONS} date={DAY} />);
      vi.setSystemTime(new Date(2026, 8, 24, 12, 0, 0));
      await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
      expect(container.querySelector('.celestial-store')?.getAttribute('data-store-day')).toBe('2026-09-22');
    } finally {
      vi.useRealTimers();
    }
  });

  it('never sells the default Familiar and renders only Familiar shelves', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} />);
    expect(container.querySelector('[data-store-offer="quill"]')).toBeNull();
    expect(container.querySelectorAll('[data-store-shelf]')).toHaveLength(2);
  });
});
