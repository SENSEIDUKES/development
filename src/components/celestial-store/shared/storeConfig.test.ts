import { describe, expect, it } from 'vitest';
import { familiarCatalogue } from '../../../host/familiar/catalogue';
import {
  CELESTIAL_STORE_CONFIG,
  ENERGY_ELIGIBLE_FAMILIAR_IDS,
  ENERGY_FAMILIAR_PRICES,
  QI_FAMILIAR_PRICES,
  QI_ELIGIBLE_FAMILIAR_IDS,
} from './storeConfig';
import { offerPrice } from './rotation';

/**
 * The Store configuration references the host catalogue by ID only. These
 * tests pin that boundary: every configured offer must resolve against the
 * real catalogue, and the catalogue's default Familiar stays out of commerce.
 */
describe('Celestial Store configuration', () => {
  const catalogueIds = new Set(familiarCatalogue.map(entry => entry.definition.id));

  it('references only Familiars that exist in the host catalogue', () => {
    for (const offer of CELESTIAL_STORE_CONFIG.offers) {
      expect(catalogueIds, `unknown familiar ${offer.familiarId}`).toContain(offer.familiarId);
    }
  });

  it('keeps the default Familiar (Quill) out of every eligible pool', () => {
    const defaults = familiarCatalogue.filter(entry => entry.definition.isDefault).map(entry => entry.definition.id);
    expect(defaults).toEqual(['quill']);
    for (const offer of CELESTIAL_STORE_CONFIG.offers) {
      expect(defaults).not.toContain(offer.familiarId);
    }
  });

  it('shows two Energy slots and four QI slots per rotation', () => {
    expect(CELESTIAL_STORE_CONFIG.energySlots).toBe(2);
    expect(CELESTIAL_STORE_CONFIG.qiSlots).toBe(4);
  });

  it('pools the approved first rotation Familiars', () => {
    expect([...ENERGY_ELIGIBLE_FAMILIAR_IDS]).toEqual([
      'celestial-guardian', 'little-monkey-king', 'phoenix', 'nine-tailed-fox',
    ]);
    expect([...QI_ELIGIBLE_FAMILIAR_IDS]).toEqual([
      'celestial-moon-moth', 'galaxy-octopus', 'judgmental-jiangshi',
      'lucky-bake-danuki', 'lady-bug', 'living-grimoire',
    ]);
  });

  it('keeps the current Energy rank pricing', () => {
    expect(ENERGY_FAMILIAR_PRICES).toEqual({ rare: 300, epic: 600, legendary: 1_000 });
  });

  it('uses the shared spendable-QI item pricing', () => {
    expect(QI_FAMILIAR_PRICES).toEqual({ common: 500, rare: 2_000, epic: 8_000, legendary: 25_000 });
  });

  it('resolves a price for every configured offer against the real catalogue ranks', () => {
    for (const offer of CELESTIAL_STORE_CONFIG.offers) {
      const entry = familiarCatalogue.find(candidate => candidate.definition.id === offer.familiarId)!;
      const price = offerPrice(offer, {
        id: entry.definition.id,
        name: entry.definition.displayName,
        description: entry.definition.description,
        rarity: entry.definition.rarity,
        isDefault: entry.definition.isDefault,
        heroUrl: entry.heroUrl,
        stillUrl: entry.definition.placeholderUrl!,
        available: true,
      });
      expect(price, `unpriceable offer ${offer.familiarId}`).toBeGreaterThan(0);
      if (offer.currency === 'qi') expect(price).toBe(QI_FAMILIAR_PRICES[entry.definition.rarity]);
    }
  });
});
