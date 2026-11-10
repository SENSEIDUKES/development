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

const keyDown = async (element: Element | null | undefined, key: string) => {
  expect(element, 'expected element for keydown').not.toBeNull();
  await act(async () => {
    (element as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
};

const option = (
  id: string,
  rarity: FamiliarOption['rarity'],
  isDefault = false,
  portraitUrl?: string,
): FamiliarOption => ({
  id,
  name: id.replace(/-/g, ' '),
  description: `${id} watches over the Library.`,
  rarity,
  isDefault,
  heroUrl: `https://example.test/${id}.gif`,
  stillUrl: `/familiars/${id}/neutral.png`,
  portraitUrl,
  available: true,
});

const OPTIONS: readonly FamiliarOption[] = [
  option('celestial-guardian', 'epic', false, '/familiars/celestial-guardian/portrait.png'),
  option('little-monkey-king', 'rare'),
  option('phoenix', 'epic', false, '/familiars/phoenix/portrait.png'),
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

const activeHud = () => {
  const activeTab = container.querySelector('.celestial-store')?.getAttribute('data-store-tab') ?? 'home';
  return container.querySelector<HTMLElement>(`[data-store-hud="${activeTab}"]`)!;
};

describe('CelestialStorePanel', () => {
  it('renders live balances from the QI ledger and Energy account, never static amounts', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} cultivation={qiReady(28_400)} energy={energyReady(1_250)} />);
    expect(container.querySelector('[aria-label="28,400 QI available"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="1,250 Energy available"]')).not.toBeNull();
  });

  it('shows unavailable balances as unknown rather than inventing numbers', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} />);
    expect(container.querySelector('[aria-label="QI balance unavailable"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Energy balance unavailable"]')).not.toBeNull();
  });

  it('exposes only Home and Familiar tabs with keyboard tablist navigation and no popup dialog', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} />);
    const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tabs.map(tab => tab.textContent)).toEqual(['Home', 'Familiar']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-controls')).toBeNull();

    const tablist = container.querySelector('[role="tablist"]')!;
    await keyDown(tablist, 'ArrowRight');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('.celestial-store')?.getAttribute('data-store-tab')).toBe('familiar');

    await keyDown(tablist, 'Home');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('.celestial-store-detail')).toBeNull();
  });

  it('spotlights any configured discount on Home and jumps straight into the Familiar showcase', async () => {
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    const discountedTarget = rotation.energy[1];
    const config = {
      energySlots: 2,
      qiSlots: 4,
      offers: [
        { familiarId: rotation.energy[0].familiarId, currency: 'energy' as const },
        { familiarId: discountedTarget.familiarId, currency: 'energy' as const, salePrice: 200 },
        ...rotation.qi.map(item => ({ familiarId: item.familiarId, currency: 'qi' as const })),
      ],
    };
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} config={config}
      ownedFamiliarIds={[rotation.qi[0].familiarId]} />);

    const homeHud = container.querySelector('[data-store-hud="home"]')!;
    expect(homeHud.getAttribute('data-store-featured')).toBe(discountedTarget.familiarId);
    expect(container.querySelector('.celestial-store-ribbon')?.textContent).toBe('Special Offer');
    expect(homeHud.textContent).toContain('5 of 6 available to buy');
    expect(homeHud.querySelector('[data-store-owned-count="1/6"]')).not.toBeNull();
    expect(homeHud.querySelector('[data-store-price="200"]')).not.toBeNull();

    await click(container.querySelector('[data-store-browse-familiars]'));
    expect(container.querySelector('.celestial-store')?.getAttribute('data-store-tab')).toBe('familiar');
    expect(container.querySelector(`[data-store-active-offer="${discountedTarget.familiarId}"]`)).not.toBeNull();
  });

  it('spotlights an unowned offer for sale on Home ahead of an already-owned lead offer', async () => {
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    const [firstOffer, secondOffer] = [...rotation.energy, ...rotation.qi];
    await render(<CelestialStorePanel options={OPTIONS} date={DAY}
      ownedFamiliarIds={[firstOffer.familiarId]}
      cultivation={qiReady(100_000)} energy={energyReady(2_000)} onPurchase={vi.fn()} />);

    const homeHud = container.querySelector('[data-store-hud="home"]')!;
    expect(homeHud.getAttribute('data-store-featured')).toBe(secondOffer.familiarId);
    expect(homeHud.querySelector('[data-store-action="buy"]')).not.toBeNull();
  });

  it('gathers every daily Familiar offer into the Familiar picker strip, Energy first, and never sells Quill', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} defaultTab="familiar" />);
    const shelves = container.querySelectorAll('[data-store-shelf]');
    expect(shelves).toHaveLength(1);
    const shelf = shelves[0];
    expect(shelf.getAttribute('data-store-shelf')).toBe('familiars');

    const items = shelf.querySelectorAll('[data-store-offer]');
    expect(items).toHaveLength(6);
    expect(container.querySelector('[data-store-offer="quill"]')).toBeNull();
    const currencies = [...items].map(item => item.getAttribute('data-store-currency'));
    expect(currencies.filter(currency => currency === 'energy')).toHaveLength(2);
    expect(currencies.filter(currency => currency === 'qi')).toHaveLength(4);
    expect(currencies.slice(0, 2)).toEqual(['energy', 'energy']);
  });

  it('displays catalogue rank and one price per selected offer, with portrait fallback to FamiliarHero', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} defaultTab="familiar" />);
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    for (const offer of [...rotation.energy, ...rotation.qi]) {
      await click(container.querySelector(`[data-store-offer="${offer.familiarId}"]`));
      const hud = container.querySelector('[data-store-hud="familiar"]')!;
      expect(hud.querySelector('.celestial-store-rank-value')?.getAttribute('data-rarity')).toBe(offer.option.rarity);
      expect(hud.querySelector('[data-store-price]')?.getAttribute('data-store-price')).toBe(String(offer.price));
      expect(hud.querySelectorAll('[data-store-price]')).toHaveLength(1);

      const slide = container.querySelector(`[data-store-active-offer="${offer.familiarId}"]`)!;
      if (offer.option.portraitUrl) {
        expect(slide.querySelector('img[data-store-portrait]')?.getAttribute('src')).toBe(offer.option.portraitUrl);
      } else {
        expect(slide.querySelector('source[media="(prefers-reduced-motion: reduce)"]')?.getAttribute('srcset')).toBe(offer.option.stillUrl);
      }
    }
  });

  it('steps through Familiar offers via Next/Previous controls and keyboard arrows', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} defaultTab="familiar" />);
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    const ordered = [...rotation.energy, ...rotation.qi];
    expect(container.querySelector(`[data-store-active-offer="${ordered[0].familiarId}"]`)).not.toBeNull();

    await click(container.querySelector('[aria-label="Next Familiar offer"]'));
    expect(container.querySelector(`[data-store-active-offer="${ordered[1].familiarId}"]`)).not.toBeNull();

    const carousel = container.querySelector('.celestial-store-carousel')!;
    await keyDown(carousel, 'ArrowLeft');
    expect(container.querySelector(`[data-store-active-offer="${ordered[0].familiarId}"]`)).not.toBeNull();
  });

  it('marks owned and equipped offers instead of pricing them', async () => {
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    const [first, second] = rotation.qi;
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} defaultTab="familiar"
      ownedFamiliarIds={[first.familiarId, second.familiarId]} equippedFamiliarId={second.familiarId} />);

    await click(container.querySelector(`[data-store-offer="${first.familiarId}"]`));
    const hud = container.querySelector('[data-store-hud="familiar"]')!;
    expect(hud.textContent).toContain('Owned');
    expect(hud.querySelector('[data-store-price]')).toBeNull();

    await click(container.querySelector(`[data-store-offer="${second.familiarId}"]`));
    expect(hud.textContent).toContain('Equipped');
    expect(hud.querySelector('[data-store-price]')).toBeNull();
  });

  it('purchases in-place through the account port with the shown price', async () => {
    const onPurchase = vi.fn().mockResolvedValue({ outcome: 'purchased', message: 'It joins your cave.' });
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} defaultTab="familiar"
      cultivation={qiReady(100_000)} energy={energyReady(2_000)} onPurchase={onPurchase} />);
    const offer = dailyStoreRotation(OPTIONS, DAY).energy[0];
    await click(container.querySelector(`[data-store-offer="${offer.familiarId}"]`));
    const hud = activeHud();
    const buy = hud.querySelector<HTMLButtonElement>('[data-store-action="buy"]')!;
    expect(buy.textContent).toBe(`Buy for ${offer.price.toLocaleString('en-US')} Energy`);
    await click(buy);
    expect(onPurchase).toHaveBeenCalledWith({ familiarId: offer.familiarId, currency: 'energy', price: offer.price });
    expect(hud.querySelector('[role="status"]')?.textContent).toBe('It joins your cave.');
  });

  it('disables Buy when the balance cannot cover the price', async () => {
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} defaultTab="familiar"
      cultivation={qiReady(10)} energy={energyReady(10)} onPurchase={vi.fn()} />);
    const rotation = dailyStoreRotation(OPTIONS, DAY);
    await click(container.querySelector(`[data-store-offer="${rotation.qi[0].familiarId}"]`));
    const buy = activeHud().querySelector<HTMLButtonElement>('[data-store-action="buy"]')!;
    expect(buy.textContent).toBe('Not enough QI');
    expect(buy.disabled).toBe(true);
  });

  it('equips an owned Familiar through the controller action and shows Equipped afterwards', async () => {
    const onEquip = vi.fn();
    const offer = dailyStoreRotation(OPTIONS, DAY).energy[0];
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} defaultTab="familiar"
      ownedFamiliarIds={[offer.familiarId]} onEquip={onEquip} />);
    await click(container.querySelector(`[data-store-offer="${offer.familiarId}"]`));
    const equip = activeHud().querySelector<HTMLButtonElement>('[data-store-action="equip"]')!;
    await click(equip);
    expect(onEquip).toHaveBeenCalledWith(offer.familiarId);

    await render(<CelestialStorePanel options={OPTIONS} date={DAY} defaultTab="familiar"
      ownedFamiliarIds={[offer.familiarId]} equippedFamiliarId={offer.familiarId} onEquip={onEquip} />);
    const equipped = activeHud().querySelector<HTMLButtonElement>('[data-store-action="equip"]')!;
    expect(equipped.textContent).toBe('Equipped');
    expect(equipped.disabled).toBe(true);
  });

  it('sends one purchase for one offer even when Buy is activated twice before the host reports pending', async () => {
    let settle: (result: { outcome: 'purchased'; message: string }) => void = () => {};
    const onPurchase = vi.fn().mockImplementation(() => new Promise(resolve => { settle = resolve; }));
    await render(<CelestialStorePanel options={OPTIONS} date={DAY}
      cultivation={qiReady(100_000)} energy={energyReady(2_000)} onPurchase={onPurchase} />);
    const hud = activeHud();
    const buy = hud.querySelector<HTMLButtonElement>('[data-store-action="buy"]')!;
    await click(buy);
    await click(buy);
    expect(onPurchase).toHaveBeenCalledTimes(1);
    expect(buy.textContent).toBe('Purchasing…');
    expect(buy.disabled).toBe(true);
    await act(async () => { settle({ outcome: 'purchased', message: 'Bought once.' }); });
    expect(onPurchase).toHaveBeenCalledTimes(1);
    expect(hud.querySelector('[role="status"]')?.textContent).toBe('Bought once.');
  });

  it('rotates at local midnight and replaces any retired offer from the previous day', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 8, 22, 23, 59, 30));
      await render(<CelestialStorePanel options={OPTIONS} defaultTab="familiar"
        cultivation={qiReady(100_000)} energy={energyReady(2_000)} onPurchase={vi.fn()} />);
      expect(container.querySelector('.celestial-store')?.getAttribute('data-store-day')).toBe('2026-09-22');

      const yesterdayOffers = dailyStoreRotation(OPTIONS, new Date(2026, 8, 22));
      const tomorrowOffers = dailyStoreRotation(OPTIONS, new Date(2026, 8, 23));
      const tomorrowIds = new Set([...tomorrowOffers.energy, ...tomorrowOffers.qi].map(item => item.familiarId));
      const retiring = [...yesterdayOffers.energy, ...yesterdayOffers.qi].find(item => !tomorrowIds.has(item.familiarId))!;
      await click(container.querySelector(`[data-store-offer="${retiring.familiarId}"]`));
      expect(container.querySelector(`[data-store-active-offer="${retiring.familiarId}"]`)).not.toBeNull();

      vi.setSystemTime(new Date(2026, 8, 23, 0, 0, 1));
      await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
      expect(container.querySelector('.celestial-store')?.getAttribute('data-store-day')).toBe('2026-09-23');
      expect(container.querySelector(`[data-store-active-offer="${retiring.familiarId}"]`)).toBeNull();
      expect(container.querySelector(`[data-store-offer="${retiring.familiarId}"]`)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('never offers an equipped Familiar for sale, even when the owned list has not caught up', async () => {
    const onPurchase = vi.fn();
    const offer = dailyStoreRotation(OPTIONS, DAY).energy[0];
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} defaultTab="familiar"
      equippedFamiliarId={offer.familiarId} ownedFamiliarIds={[]}
      cultivation={qiReady(100_000)} energy={energyReady(5_000)}
      onPurchase={onPurchase} onEquip={vi.fn()} />);
    const stripItem = container.querySelector(`[data-store-offer="${offer.familiarId}"]`)!;
    expect(stripItem.getAttribute('data-store-state')).toBe('equipped');
    const hud = activeHud();
    expect(hud.querySelector('[data-store-action="buy"]')).toBeNull();
    const equip = hud.querySelector<HTMLButtonElement>('[data-store-action="equip"]')!;
    expect(equip.textContent).toBe('Equipped');
    expect(equip.disabled).toBe(true);
    expect(onPurchase).not.toHaveBeenCalled();
  });

  it('switches away from a focused offer that a same-day configuration change retires', async () => {
    const soleOffer = { energySlots: 1, qiSlots: 0, offers: [{ familiarId: 'phoenix', currency: 'energy' as const }] };
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} config={soleOffer} defaultTab="familiar"
      cultivation={qiReady(100_000)} energy={energyReady(5_000)} onPurchase={vi.fn()} />);
    expect(container.querySelector('[data-store-active-offer="phoenix"]')).not.toBeNull();

    await render(<CelestialStorePanel options={OPTIONS} date={DAY} defaultTab="familiar"
      config={{ energySlots: 1, qiSlots: 0, offers: [{ familiarId: 'nine-tailed-fox', currency: 'energy' as const }] }}
      cultivation={qiReady(100_000)} energy={energyReady(5_000)} onPurchase={vi.fn()} />);
    expect(container.querySelector('[data-store-active-offer="phoenix"]')).toBeNull();
    expect(container.querySelector('[data-store-active-offer="nine-tailed-fox"]')).not.toBeNull();
  });

  it('updates the in-place Buy button immediately when a configured sale ends, never charging the stale sale price', async () => {
    const onPurchase = vi.fn().mockResolvedValue({ outcome: 'purchased', message: 'Bought.' });
    const at = (salePrice?: number) => ({
      energySlots: 1, qiSlots: 0,
      offers: [{ familiarId: 'phoenix', currency: 'energy' as const, salePrice }],
    });
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} config={at(450)} defaultTab="familiar"
      cultivation={qiReady(100_000)} energy={energyReady(5_000)} onPurchase={onPurchase} />);
    expect(activeHud().querySelector('[data-store-action="buy"]')?.textContent).toBe('Buy for 450 Energy');

    // The sale ends while the user is viewing the offer: the button immediately reflects 600 Energy.
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} config={at(undefined)} defaultTab="familiar"
      cultivation={qiReady(100_000)} energy={energyReady(5_000)} onPurchase={onPurchase} />);
    const updatedBuy = activeHud().querySelector<HTMLButtonElement>('[data-store-action="buy"]')!;
    expect(updatedBuy.textContent).toBe('Buy for 600 Energy');
    await click(updatedBuy);
    expect(onPurchase).toHaveBeenCalledWith({ familiarId: 'phoenix', currency: 'energy', price: 600 });
  });

  it('keeps the focused offer and purchase terms stable across identical host re-renders', async () => {
    const config = { energySlots: 1, qiSlots: 0, offers: [{ familiarId: 'phoenix', currency: 'energy' as const }] };
    await render(<CelestialStorePanel options={OPTIONS} date={DAY} config={config} defaultTab="familiar"
      cultivation={qiReady(100_000)} energy={energyReady(5_000)} onPurchase={vi.fn()} />);
    await render(<CelestialStorePanel options={[...OPTIONS]} date={DAY} config={{ ...config }} defaultTab="familiar"
      cultivation={qiReady(100_000)} energy={energyReady(5_000)} onPurchase={vi.fn()} />);
    expect(activeHud().querySelector('[data-store-action="buy"]')?.textContent).toBe('Buy for 600 Energy');
  });

  it('keeps an explicitly supplied date fixed rather than following the clock, and wires onBack when hosted', async () => {
    const onBack = vi.fn();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 8, 22, 23, 59, 30));
      await render(<CelestialStorePanel options={OPTIONS} date={DAY} onBack={onBack} />);
      vi.setSystemTime(new Date(2026, 8, 24, 12, 0, 0));
      await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
      expect(container.querySelector('.celestial-store')?.getAttribute('data-store-day')).toBe('2026-09-22');
      await click(container.querySelector('[aria-label="Return to cave"]'));
      expect(onBack).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
