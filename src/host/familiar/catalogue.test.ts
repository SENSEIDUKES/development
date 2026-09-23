import { describe, expect, it } from 'vitest';
import { allFamiliarOptions, defaultFamiliar, familiarCatalogue, familiarCatalogueEntry, familiarOptions } from './catalogue';

const expectedRarities = {
  'celestial-guardian': 'epic',
  'celestial-moon-moth': 'epic',
  'little-monkey-king': 'rare',
  phoenix: 'epic',
  'nine-tailed-fox': 'rare',
  'galaxy-octopus': 'rare',
  'judgmental-jiangshi': 'rare',
  'lucky-bake-danuki': 'common',
  'lady-bug': 'common',
  'living-grimoire': 'common',
  quill: 'common',
} as const;

const expectedNeutralColumns = {
  'celestial-guardian': 6,
  'celestial-moon-moth': 0,
  'little-monkey-king': 0,
  phoenix: 0,
  'nine-tailed-fox': 6,
  'galaxy-octopus': 6,
  'judgmental-jiangshi': 6,
  'lucky-bake-danuki': 6,
  'lady-bug': 6,
  'living-grimoire': 0,
  quill: 0,
} as const;

describe('Library Familiar catalogue', () => {
  it('has one complete renderer definition and the assigned rank for every supplied Familiar', () => {
    expect(familiarCatalogue).toHaveLength(11);
    expect(Object.fromEntries(familiarCatalogue.map(entry => [entry.definition.id, entry.definition.rarity]))).toEqual(expectedRarities);
    expect(Object.fromEntries(familiarCatalogue.map(entry => [entry.definition.id, entry.definition.animations.neutral.columns[0]]))).toEqual(expectedNeutralColumns);
    for (const entry of familiarCatalogue) {
      const familiar = entry.definition;
      expect(familiarCatalogueEntry(familiar.id)).toBe(entry);
      expect([familiar.columns, familiar.rows, familiar.cellWidth, familiar.cellHeight]).toEqual([8, 11, 192, 208]);
      expect(Object.keys(familiar.animations)).toHaveLength(26);
      if (familiar.id === 'quill') expect(entry.heroUrl).toBe('/familiars/quill/previews/waving.gif');
      else expect(entry.heroUrl).toMatch(/^https:\/\/media\.seihouse\.org\/SEN\/GIF\/.+\.gif$/);
      for (const clip of Object.values(familiar.animations)) {
        expect(clip.row).toBeLessThan(familiar.rows);
        expect(clip.columns.every(column => column >= 0 && column < familiar.columns)).toBe(true);
        expect(clip.durations).toHaveLength(clip.columns.length);
      }
    }
  });

  it('keeps Quill as the sole default without turning default into a rarity or an availability rule', () => {
    const defaults = familiarCatalogue.filter(entry => entry.definition.isDefault);
    expect(defaults).toEqual([defaultFamiliar]);
    expect(defaultFamiliar.definition.id).toBe('quill');
    expect(defaultFamiliar.definition.rarity).toBe('common');
    expect(allFamiliarOptions.find(option => option.id === 'quill')).toMatchObject({ rarity: 'common', isDefault: true, available: true });
    expect(familiarCatalogueEntry('judgmental-jiangshi')?.definition.displayName).toBe('Judgmental Jiangshi');
  });

  it('plays Quill’s complete raised-paw wave loop', () => {
    expect(familiarCatalogueEntry('quill')?.definition.animations.waving).toMatchObject({
      row: 3,
      columns: [0, 1, 2, 3],
      durations: [140, 140, 140, 280],
    });
  });

  it('leaves availability host-configurable and independent from rank or default status', () => {
    const options = familiarOptions(entry => entry.definition.id !== 'phoenix' && entry.definition.id !== 'quill');
    expect(options.find(option => option.id === 'phoenix')?.available).toBe(false);
    expect(options.find(option => option.id === 'quill')).toMatchObject({ available: false, rarity: 'common', isDefault: true });
    expect(options.find(option => option.id === 'celestial-guardian')?.available).toBe(true);
  });

  it('keeps the user-supplied hosted object spellings verbatim', () => {
    expect(familiarCatalogueEntry('living-grimoire')?.heroUrl).toBe('https://media.seihouse.org/SEN/GIF/Living%20grimore.gif');
    expect(familiarCatalogueEntry('phoenix')?.heroUrl).toBe('https://media.seihouse.org/SEN/GIF/pheonix.gif');
    expect(familiarCatalogueEntry('celestial-guardian')?.heroUrl).toBe('https://media.seihouse.org/SEN/GIF/celestial%20Guardian.gif');
    expect(familiarCatalogueEntry('quill')?.heroUrl).toBe('/familiars/quill/previews/waving.gif');
  });
});
