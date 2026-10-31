import { describe, expect, it } from 'vitest';
import { SEN_LANGUAGES } from '@seihouse/sen/contracts';
import { loadLoreCatalogue, LORE_CATEGORIES, LORE_TERMS, loreCopyLine, normalizeLoreSearch, searchLore } from './loreCatalogue';
import { ENGLISH_LORE, LORE_ACCESSIBLE_ENGLISH } from './loreEnglish';
import { loadLoreLocale, loadLoreRenderings } from './loreLocales';

const localNames = (terms: Record<string, readonly [string, string]>) =>
  Object.fromEntries(Object.entries(terms).map(([id, [name]]) => [id, [name]]));

describe('Eastern fantasy reference', () => {
  it.each(['Yuanying', 'Origin Infant', 'Nascent Soul', '元婴', '元嬰', 'YUÁN-YĪNG', ' yuan ying ', 'Nguyên Anh'])('finds one canonical entry for %s', async query => {
    expect(searchLore(query).map(term => term.id)).toEqual(['nascent-soul']);
    expect(searchLore(query, undefined, undefined, await loadLoreCatalogue())[0].id).toBe('nascent-soul');
  });
  it('keeps ambiguous romanization and related traditions separate', () => {
    expect(searchLore('dao').slice(0, 2).map(term => term.id)).toEqual(['dao', 'dao-saber']);
    expect(LORE_TERMS.find(term => term.id === 'nine-tailed-fox')?.aliases).not.toContain('Kitsune');
    expect(searchLore('Qi').map(term => term.id)).toContain('qi');
    expect(searchLore('Qi')[0].id).toBe('qi');
    expect(searchLore('Origin Infant', 'treasures')).toEqual([]);
    expect(searchLore('not-a-real-term')).toEqual([]);
  });
  it('has complete, unique curated records with valid related links', () => {
    const ids = LORE_TERMS.map(term => term.id);
    expect(ids).toHaveLength(36);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(ENGLISH_LORE.terms).sort()).toEqual([...ids].sort());
    expect(Object.keys(LORE_ACCESSIBLE_ENGLISH).sort()).toEqual([...ids].sort());
    for (const term of LORE_TERMS) {
      expect(term.aliases.length).toBeGreaterThan(0);
      for (const id of term.related) { expect(ids).toContain(id); expect(id).not.toBe(term.id); }
      if (term.id !== 'progression-fantasy') { expect(term.script).toBeTruthy(); expect(term.pronunciation).toBeTruthy(); }
    }
  });
  it('adds the master glossary with permanent, unique ids in every category', async () => {
    const terms = await loadLoreCatalogue();
    const ids = terms.map(term => term.id);
    expect(terms.length).toBe(398);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const category of LORE_CATEGORIES) expect(terms.filter(term => term.category === category).length).toBeGreaterThanOrEqual(4);
    for (const term of terms) {
      expect(term.name.trim()).not.toBe('');
      expect(term.meaning ?? ENGLISH_LORE.terms[term.id as keyof typeof ENGLISH_LORE.terms][1]).toBeTruthy();
      for (const id of term.related) { expect(ids).toContain(id); expect(id).not.toBe(term.id); }
    }
    // Platform vocabulary is not genre lore.
    expect(ids).not.toContain('fate-scar');
    expect(searchLore('Status Window', undefined, undefined, terms)[0].id).toBe('status-window');
  });
  it.each(SEN_LANGUAGES)('provides real definitions, renderings and search in $label', async language => {
    const locale = await loadLoreLocale(language.code);
    const renderings = await loadLoreRenderings(language.code);
    const terms = await loadLoreCatalogue();
    expect(Object.keys(locale.terms).sort()).toEqual(Object.keys(ENGLISH_LORE.terms).sort());
    expect(Object.keys(locale.labels).sort()).toEqual(Object.keys(ENGLISH_LORE.labels).sort());
    expect(Object.keys(locale.categories).sort()).toEqual([...LORE_CATEGORIES].sort());
    for (const [id, [name, meaning]] of Object.entries(locale.terms)) {
      expect(name.trim()).not.toBe('');
      expect(meaning.length).toBeGreaterThan(25);
      expect(searchLore(name, undefined, localNames(locale.terms)).map(term => term.id)).toContain(id);
      if (language.code !== 'en') expect(meaning).not.toBe(ENGLISH_LORE.terms[id as keyof typeof ENGLISH_LORE.terms][1]);
    }
    const known = new Set(terms.map(term => term.id));
    for (const [id, [rendering]] of Object.entries(renderings)) {
      expect(known.has(id)).toBe(true);
      expect(rendering.trim()).not.toBe('');
    }
    if (language.code !== 'he') expect(Object.keys(renderings).length).toBeGreaterThan(50);
  });
  it('writes how Qi reads in each language with the reason when the glossary has one', async () => {
    expect((await loadLoreRenderings('vi')).qi).toEqual(['Khí', 'Giữ nguyên Hán Việt.']);
    expect((await loadLoreRenderings('zh-CN')).qi).toEqual(['气']);
    expect((await loadLoreRenderings('en')).qi[0]).toBe('Qi');
    expect(loreCopyLine('Qi', 'Khí', 'Giữ nguyên Hán Việt.')).toBe('Qi → Khí — Giữ nguyên Hán Việt.');
    expect(loreCopyLine('Qi', 'Qi', 'Preserve as Qi.')).toBe('Qi — Preserve as Qi.');
    expect(loreCopyLine('Dantian', '丹田')).toBe('Dantian → 丹田');
  });
  it('normalizes punctuation, tone marks and composed scripts', () => {
    expect(normalizeLoreSearch('YUÁN—YĪNG')).toBe('yuanying');
    expect(normalizeLoreSearch('무림')).toBe(normalizeLoreSearch('무림'.normalize('NFD')));
    expect(searchLore('  ')).toHaveLength(36);
  });
});
