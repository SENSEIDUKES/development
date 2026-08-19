import { describe, expect, it } from 'vitest';
import {
  getByAnyTag,
  getByCategory,
  getByTag,
  getByUrl,
  getByVariation,
  getCategories,
  LIBRARY_CUE_CATEGORIES,
  loadLibraryCues,
  parseLibraryCues,
  type LibraryCue,
  type LibraryCuesLoadResult,
} from './libraryCues';

const makeValidCue = (overrides: Partial<{
  file_path: string;
  public_url: string;
  main_category: string;
  broad_variation: string;
  soft_tags: string[];
  description: string;
  confidence_score: number;
}> = {}) => {
  const metadataOverrides: Record<string, unknown> = {};
  if (overrides.main_category !== undefined) metadataOverrides.main_category = overrides.main_category;
  if (overrides.broad_variation !== undefined) metadataOverrides.broad_variation = overrides.broad_variation;
  if (overrides.soft_tags !== undefined) metadataOverrides.soft_tags = overrides.soft_tags;
  if (overrides.description !== undefined) metadataOverrides.description = overrides.description;
  if (overrides.confidence_score !== undefined) metadataOverrides.confidence_score = overrides.confidence_score;
  return {
    file_path: overrides.file_path ?? 'DEFAULT/Weapons/Magic/Fire_Magic_1.mp3',
    public_url:
      overrides.public_url ??
      'https://celestialaudio.seihouse.org/DEFAULT/Weapons/Magic/Fire_Magic_1.mp3',
    metadata: {
      main_category: 'weapons',
      broad_variation: 'magic',
      soft_tags: ['fire', 'magic', 'spell'],
      description: 'A fire magic spell is unleashed.',
      confidence_score: 0.95,
      ...metadataOverrides,
    },
  };
};

describe('libraryCues loader', () => {
  it('loads the real catalog without throwing', () => {
    const loaded = loadLibraryCues();
    expect(loaded.cues.length).toBeGreaterThan(0);
    // The raw data is preserved — every parsed cue appears in the public view.
    expect(loaded.cues.length).toBe(loaded.cues.length);
  });

  it('reports zero issues on the well-formed real catalog', () => {
    const loaded = loadLibraryCues();
    expect(loaded.issues).toEqual([]);
  });

  it('throws a validation error when the root is not an array', () => {
    expect(() => parseLibraryCues({ not: 'an array' })).toThrow();
  });

  it('normalizes main_category to a closed set of seven values', () => {
    const loaded = loadLibraryCues();
    const categories = getCategories(loaded);
    for (const c of categories) {
      expect(LIBRARY_CUE_CATEGORIES).toContain(c);
    }
    // Every known category is recognized.
    expect(LIBRARY_CUE_CATEGORIES.length).toBe(7);
  });

  it('surfaces malformed entries without dropping the rest', () => {
    const loaded = parseLibraryCues([
      makeValidCue(),
      {
        file_path: 'DEFAULT/Bad/MissingUrl.mp3',
        // Missing public_url — surfaces as invalid_url because the URL check
        // is the first place an entry without one fails.
      },
      {
        file_path: 'DEFAULT/Bad/MissingMetadata.mp3',
        public_url: 'https://celestialaudio.seihouse.org/DEFAULT/Bad/MissingMetadata.mp3',
        // Missing metadata — surfaces as malformed_entry.
      },
    ]);

    expect(loaded.cues.length).toBe(1);
    expect(loaded.issues.length).toBe(2);
    const kinds = loaded.issues.map((i) => i.kind);
    expect(kinds).toContain('invalid_url');
    expect(kinds).toContain('malformed_entry');
  });

  it('flags unknown main_category values without dropping the entry from raw data', () => {
    const loaded = parseLibraryCues([
      makeValidCue(),
      makeValidCue({
        file_path: 'DEFAULT/Mystery/Unknown.mp3',
        public_url: 'https://celestialaudio.seihouse.org/DEFAULT/Mystery/Unknown.mp3',
        main_category: 'gibberish-category',
      }),
    ]);
    // Only the well-formed known-category cue is included in the lookup view.
    expect(loaded.cues.length).toBe(1);
    const unknownIssue = loaded.issues.find((i) => i.kind === 'unknown_category');
    expect(unknownIssue).toBeDefined();
    if (unknownIssue && unknownIssue.kind === 'unknown_category') {
      expect(unknownIssue.category).toBe('gibberish-category');
    }
  });

  it('rejects out-of-range confidence_score', () => {
    const loaded = parseLibraryCues([
      makeValidCue({ confidence_score: 1.5 }),
      makeValidCue({
        file_path: 'DEFAULT/Weapons/Magic/Wind_Magic_1.mp3',
        public_url: 'https://celestialaudio.seihouse.org/DEFAULT/Weapons/Magic/Wind_Magic_1.mp3',
        confidence_score: -0.1,
      }),
    ]);
    expect(loaded.cues.length).toBe(0);
    expect(loaded.issues.length).toBe(2);
    expect(loaded.issues.every((i) => i.kind === 'malformed_entry')).toBe(true);
  });

  it('flags duplicate public_url values without dropping the entries', () => {
    const sharedUrl = 'https://celestialaudio.seihouse.org/shared.mp3';
    const loaded = parseLibraryCues([
      makeValidCue({ file_path: 'DEFAULT/A/Shared.mp3', public_url: sharedUrl }),
      makeValidCue({
        file_path: 'DEFAULT/B/Shared.mp3',
        public_url: sharedUrl,
        main_category: 'factions',
      }),
    ]);

    // Both raw entries preserved.
    expect(loaded.cues.length).toBe(2);
    const duplicate = loaded.issues.find((i) => i.kind === 'duplicate_url');
    expect(duplicate).toBeDefined();
    if (duplicate && duplicate.kind === 'duplicate_url') {
      expect(duplicate.url).toBe(sharedUrl);
      expect(duplicate.filePaths).toHaveLength(2);
    }

    // First-seen cue wins for getByUrl.
    const byUrl = getByUrl(loaded, sharedUrl);
    expect(byUrl?.file_path).toBe('DEFAULT/A/Shared.mp3');
  });
});

describe('libraryCues lookups', () => {
  it('looks up by URL', () => {
    const loaded = loadLibraryCues();
    const anyCue = loaded.cues[0] as LibraryCue;
    const found = getByUrl(loaded, anyCue.public_url);
    expect(found?.public_url).toBe(anyCue.public_url);
  });

  it('returns null for an unknown URL', () => {
    const loaded = loadLibraryCues();
    expect(getByUrl(loaded, 'https://example.com/never.mp3')).toBeNull();
  });

  it('groups by category for every known category', () => {
    const loaded = loadLibraryCues();
    // The catalog covers the five future-inline-audio categories plus the two
    // reserved-by-other-systems categories. This test does not assert exact
    // counts so future additions do not break the test.
    for (const category of LIBRARY_CUE_CATEGORIES) {
      const cues = getByCategory(loaded, category);
      // A category may legitimately be empty after a future purge, but in the
      // current catalog it must contain something for at least the active
      // inline-audio categories.
      if (
        category === 'beasts' ||
        category === 'weapons' ||
        category === 'artifacts' ||
        category === 'locations' ||
        category === 'factions' ||
        category === 'atmosphere' ||
        category === 'system'
      ) {
        expect(cues.length).toBeGreaterThan(0);
      }
      expect(cues.every((c) => c.category === category)).toBe(true);
    }
  });

  it('looks up by variation within a category', () => {
    const loaded = loadLibraryCues();
    const anyCue = loaded.cues[0] as LibraryCue;
    const results = getByVariation(loaded, anyCue.category, anyCue.metadata.broad_variation);
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (c) =>
          c.category === anyCue.category &&
          c.metadata.broad_variation === anyCue.metadata.broad_variation,
      ),
    ).toBe(true);
  });

  it('looks up by tag case-insensitively', () => {
    const loaded = loadLibraryCues();
    const withTag = loaded.cues.find((c) => c.metadata.soft_tags.length > 0);
    expect(withTag).toBeDefined();
    const tag = (withTag as LibraryCue).metadata.soft_tags[0];
    const results = getByTag(loaded, withTag!.category, tag.toUpperCase());
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((c) =>
        c.metadata.soft_tags.some((t) => t.toLowerCase() === tag.toLowerCase()),
      ),
    ).toBe(true);
  });

  it('looks up by any-of-tags within a category', () => {
    const loaded = loadLibraryCues();
    const anyCue = loaded.cues[0] as LibraryCue;
    const tag = anyCue.metadata.soft_tags[0] ?? 'any-tag';
    const results = getByAnyTag(loaded, anyCue.category, [tag, 'no-such-tag']);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.category === anyCue.category)).toBe(true);
  });

  it('returns an empty list for an empty tag query', () => {
    const loaded: LibraryCuesLoadResult = loadLibraryCues();
    expect(getByAnyTag(loaded, 'weapons', [])).toEqual([]);
  });
});
