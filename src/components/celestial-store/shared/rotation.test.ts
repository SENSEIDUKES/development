import { describe, expect, it } from 'vitest';
import type { FamiliarOption } from '../../familiar/shared/familiar';
import { dailyStoreRotation, offerPrice, rotationDayKey } from './rotation';
import {
  CELESTIAL_STORE_CONFIG,
  ENERGY_ELIGIBLE_FAMILIAR_IDS,
  ENERGY_FAMILIAR_PRICES,
  PROVISIONAL_QI_PRICES,
  QI_ELIGIBLE_FAMILIAR_IDS,
  type CelestialStoreConfig,
} from './storeConfig';

const option = (id: string, rarity: FamiliarOption['rarity'], isDefault = false): FamiliarOption => ({
  id,
  name: id,
  description: `${id} description`,
  rarity,
  isDefault,
  heroUrl: `https://example.test/${id}.gif`,
  stillUrl: `/familiars/${id}/neutral.png`,
  available: true,
});

/** Catalogue-shaped projections for every configured Familiar plus the default. */
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

describe('rotationDayKey', () => {
  it('names the local calendar day', () => {
    expect(rotationDayKey(new Date(2026, 8, 22, 23, 59))).toBe('2026-09-22');
    expect(rotationDayKey(new Date(2026, 0, 3, 0, 0))).toBe('2026-01-03');
  });
});

describe('dailyStoreRotation', () => {
  it('always produces two Energy offers and four QI offers from the eligible pools', () => {
    for (let day = 1; day <= 28; day += 1) {
      const rotation = dailyStoreRotation(OPTIONS, new Date(2026, 9, day));
      expect(rotation.energy).toHaveLength(2);
      expect(rotation.qi).toHaveLength(4);
      for (const offer of rotation.energy) {
        expect(offer.currency).toBe('energy');
        expect(ENERGY_ELIGIBLE_FAMILIAR_IDS).toContain(offer.familiarId);
      }
      for (const offer of rotation.qi) {
        expect(offer.currency).toBe('qi');
        expect(QI_ELIGIBLE_FAMILIAR_IDS).toContain(offer.familiarId);
      }
    }
  });

  it('never mixes currencies or repeats a Familiar within a shelf', () => {
    const rotation = dailyStoreRotation(OPTIONS, new Date(2026, 8, 22));
    const ids = [...rotation.energy, ...rotation.qi].map(offer => offer.familiarId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is stable for every render of the same day', () => {
    const morning = dailyStoreRotation(OPTIONS, new Date(2026, 8, 22, 0, 1));
    const night = dailyStoreRotation(OPTIONS, new Date(2026, 8, 22, 23, 58));
    expect(night).toEqual(morning);
  });

  it('reshuffles across days rather than pinning one selection forever', () => {
    const selections = new Set<string>();
    for (let day = 1; day <= 28; day += 1) {
      const rotation = dailyStoreRotation(OPTIONS, new Date(2026, 9, day));
      selections.add([...rotation.energy, ...rotation.qi].map(offer => offer.familiarId).join(','));
    }
    expect(selections.size).toBeGreaterThan(1);
  });

  it('prices Energy offers from the rank table and QI offers from the provisional configuration', () => {
    const rotation = dailyStoreRotation(OPTIONS, new Date(2026, 8, 22));
    for (const offer of rotation.energy) {
      expect(offer.price).toBe(ENERGY_FAMILIAR_PRICES[offer.option.rarity]);
      expect(offer.salePrice).toBeUndefined();
    }
    for (const offer of rotation.qi) {
      expect(offer.price).toBe(PROVISIONAL_QI_PRICES[offer.familiarId]);
      expect(offer.salePrice).toBeUndefined();
    }
  });

  it('never sells the default Familiar even when configured by mistake', () => {
    const config: CelestialStoreConfig = {
      energySlots: 2,
      qiSlots: 4,
      offers: [...CELESTIAL_STORE_CONFIG.offers, { familiarId: 'quill', currency: 'qi', price: 1 }],
    };
    for (let day = 1; day <= 28; day += 1) {
      const rotation = dailyStoreRotation(OPTIONS, new Date(2026, 9, day), config);
      expect([...rotation.energy, ...rotation.qi].some(offer => offer.familiarId === 'quill')).toBe(false);
    }
  });

  it('drops offers whose Familiar is missing from the catalogue projection instead of rendering broken cards', () => {
    const withoutPhoenix = OPTIONS.filter(candidate => candidate.id !== 'phoenix');
    for (let day = 1; day <= 28; day += 1) {
      const rotation = dailyStoreRotation(withoutPhoenix, new Date(2026, 9, day));
      expect(rotation.energy).toHaveLength(2);
      expect(rotation.energy.some(offer => offer.familiarId === 'phoenix')).toBe(false);
    }
  });

  it('honors an availability window without disturbing the rest of the pool', () => {
    const config: CelestialStoreConfig = {
      energySlots: 2,
      qiSlots: 4,
      offers: CELESTIAL_STORE_CONFIG.offers.map(offer => offer.familiarId === 'phoenix'
        ? { ...offer, availableFrom: '2026-10-01', availableUntil: '2026-10-31' }
        : offer),
    };
    for (let day = 1; day <= 28; day += 1) {
      const before = dailyStoreRotation(OPTIONS, new Date(2026, 8, day), config);
      expect(before.energy.some(offer => offer.familiarId === 'phoenix')).toBe(false);
      expect(before.energy).toHaveLength(2);
    }
  });

  it('applies a configured genuine discount and rejects a fake one', () => {
    const config: CelestialStoreConfig = {
      energySlots: 2,
      qiSlots: 4,
      offers: [
        { familiarId: 'phoenix', currency: 'energy', salePrice: 450 },
        { familiarId: 'nine-tailed-fox', currency: 'energy', salePrice: 300 },
        ...CELESTIAL_STORE_CONFIG.offers.filter(offer => offer.currency === 'qi'),
      ],
    };
    const rotation = dailyStoreRotation(OPTIONS, new Date(2026, 8, 22), config);
    const phoenix = rotation.energy.find(offer => offer.familiarId === 'phoenix')!;
    expect(phoenix.price).toBe(600);
    expect(phoenix.salePrice).toBe(450);
    // A "sale" at or above the normal price is not a discount and never renders as one.
    const fox = rotation.energy.find(offer => offer.familiarId === 'nine-tailed-fox')!;
    expect(fox.salePrice).toBeUndefined();
  });
});

describe('offerPrice', () => {
  it('has no Energy price for a common-rank Familiar', () => {
    expect(offerPrice({ familiarId: 'lady-bug', currency: 'energy' }, option('lady-bug', 'common'))).toBeUndefined();
  });

  it('prices a legendary Energy offer at 1,000', () => {
    expect(offerPrice({ familiarId: 'someday', currency: 'energy' }, option('someday', 'legendary'))).toBe(1_000);
  });
});
