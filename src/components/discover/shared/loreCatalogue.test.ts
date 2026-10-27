import { describe, expect, it } from 'vitest';
import { SEN_LANGUAGES } from '@seihouse/sen/contracts';
import { findLoreTerm, LORE_CATEGORIES, LORE_TERMS, normalizeLoreSearch, searchLore } from './loreCatalogue';
import { ENGLISH_LORE, LORE_ACCESSIBLE_ENGLISH } from './loreEnglish';
import { loadLoreLocale } from './loreLocales';

describe('Eastern fantasy reference', () => {
  it.each(['Yuanying', 'Origin Infant', 'Nascent Soul', '元婴', '元嬰', 'YUÁN-YĪNG', ' yuan ying ', 'Nguyên Anh'])('finds one canonical entry for %s', query => {
    expect(searchLore(query).map(term => term.id)).toEqual(['nascent-soul']);
  });
  it('keeps ambiguous romanization and related traditions separate', () => {
    expect(searchLore('dao').slice(0, 2).map(term => term.id)).toEqual(['dao', 'dao-saber']);
    expect(findLoreTerm('nine-tailed-fox')?.aliases).not.toContain('Kitsune');
    expect(searchLore('Qi').map(term => term.id)).toContain('qi');
    expect(searchLore('Qi')[0].id).toBe('qi');
    expect(searchLore('Origin Infant', 'weapons')).toEqual([]);
    expect(searchLore('not-a-real-term')).toEqual([]);
  });
  it('has complete, unique records and valid related links in every category', () => {
    const ids = LORE_TERMS.map(term => term.id);
    expect(ids).toHaveLength(36);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(ENGLISH_LORE.terms).sort()).toEqual([...ids].sort());
    expect(Object.keys(LORE_ACCESSIBLE_ENGLISH).sort()).toEqual([...ids].sort());
    for (const category of LORE_CATEGORIES) expect(LORE_TERMS.filter(term => term.category === category).length).toBeGreaterThanOrEqual(4);
    for (const term of LORE_TERMS) {
      expect(term.aliases.length).toBeGreaterThan(0);
      for (const id of term.related) { expect(ids).toContain(id); expect(id).not.toBe(term.id); }
      if (term.id !== 'progression-fantasy') { expect(term.script).toBeTruthy(); expect(term.pronunciation).toBeTruthy(); }
    }
  });
  it.each(SEN_LANGUAGES)('provides real definitions and search in $label', async language => {
    const locale = await loadLoreLocale(language.code);
    expect(Object.keys(locale.terms).sort()).toEqual(Object.keys(ENGLISH_LORE.terms).sort());
    expect(Object.keys(locale.labels).sort()).toEqual(Object.keys(ENGLISH_LORE.labels).sort());
    expect(Object.keys(locale.categories).sort()).toEqual([...LORE_CATEGORIES].sort());
    const translations = Object.fromEntries(Object.entries(locale.terms).map(([id, [name, meaning]]) => [id, { name, meaning }]));
    for (const [id, [name, meaning]] of Object.entries(locale.terms)) {
      expect(name.trim()).not.toBe('');
      expect(meaning.length).toBeGreaterThan(25);
      expect(searchLore(name, undefined, translations).map(term => term.id)).toContain(id);
      if (language.code !== 'en') expect(meaning).not.toBe(ENGLISH_LORE.terms[id as keyof typeof ENGLISH_LORE.terms][1]);
    }
  });
  it('normalizes punctuation, tone marks and composed scripts', () => {
    expect(normalizeLoreSearch('YUÁN—YĪNG')).toBe('yuanying');
    expect(normalizeLoreSearch('무림')).toBe(normalizeLoreSearch('무림'.normalize('NFD')));
    expect(searchLore('  ')).toHaveLength(36);
  });
});
