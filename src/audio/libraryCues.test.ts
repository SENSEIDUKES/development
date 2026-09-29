import { describe, expect, it } from 'vitest';
import { getByAnyTag, getByCategory, getByTag, getByUrl, getByVariation, getCategories, AUDIO_CUE_CATEGORIES, parseAudioCues, soundVocabulary, type AudioCue, type AudioCuesLoadResult } from '@seihouse/sen/audio';
import { LIBRARY_BASE_MEDIA, LIBRARY_SOUND_WORDS, loadLibraryCues } from '../host/media/libraryCatalog';

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
    // Every input row is preserved in rawEntries, in order.
    expect(loaded.rawEntries.length).toBe(loaded.cues.length);
  });

  it('reports zero issues on the well-formed real catalog', () => {
    const loaded = loadLibraryCues();
    expect(loaded.issues).toEqual([]);
  });

  it('throws a validation error when the root is not an array', () => {
    expect(() => parseAudioCues({ not: 'an array' })).toThrow();
  });

  it('normalizes main_category to a closed set of seven values', () => {
    const loaded = loadLibraryCues();
    const categories = getCategories(loaded);
    for (const c of categories) {
      expect(AUDIO_CUE_CATEGORIES).toContain(c);
    }
    // Every known category is recognized.
    expect(AUDIO_CUE_CATEGORIES.length).toBe(7);
  });

  it('surfaces malformed entries while preserving every raw input', () => {
    const input = [
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
    ];
    const loaded = parseAudioCues(input);

    // All three inputs preserved verbatim, in order.
    expect(loaded.rawEntries).toEqual(input);
    // Only the well-formed cue is in the lookup view.
    expect(loaded.cues.length).toBe(1);
    expect(loaded.cues[0].file_path).toBe('DEFAULT/Weapons/Magic/Fire_Magic_1.mp3');
    // Both bad rows surface as issues, but the malformed one is also
    // excluded from the byUrl / byCategory indexes.
    expect(loaded.issues.length).toBe(2);
    const kinds = loaded.issues.map((i) => i.kind);
    expect(kinds).toContain('invalid_url');
    expect(kinds).toContain('malformed_entry');
    expect(loaded.byUrl.has('https://celestialaudio.seihouse.org/DEFAULT/Bad/MissingMetadata.mp3')).toBe(false);
  });

  it('preserves the unknown-category entry in rawEntries while keeping it out of lookup indexes', () => {
    const input = [
      makeValidCue(),
      makeValidCue({
        file_path: 'DEFAULT/Mystery/Unknown.mp3',
        public_url: 'https://celestialaudio.seihouse.org/DEFAULT/Mystery/Unknown.mp3',
        main_category: 'gibberish-category',
      }),
    ];
    const loaded = parseAudioCues(input);

    // Both raw inputs preserved.
    expect(loaded.rawEntries).toEqual(input);
    // Only the well-formed known-category cue is in the lookup view.
    expect(loaded.cues.length).toBe(1);
    const unknownIssue = loaded.issues.find((i) => i.kind === 'unknown_category');
    expect(unknownIssue).toBeDefined();
    if (unknownIssue && unknownIssue.kind === 'unknown_category') {
      expect(unknownIssue.category).toBe('gibberish-category');
    }
    // The unknown-category cue is not reachable by URL or by its raw category.
    expect(
      getByUrl(loaded, 'https://celestialaudio.seihouse.org/DEFAULT/Mystery/Unknown.mp3'),
    ).toBeNull();
  });

  it('preserves out-of-range confidence_score entries in rawEntries', () => {
    const input = [
      makeValidCue({ confidence_score: 1.5 }),
      makeValidCue({
        file_path: 'DEFAULT/Weapons/Magic/Wind_Magic_1.mp3',
        public_url: 'https://celestialaudio.seihouse.org/DEFAULT/Weapons/Magic/Wind_Magic_1.mp3',
        confidence_score: -0.1,
      }),
    ];
    const loaded = parseAudioCues(input);

    expect(loaded.rawEntries).toEqual(input);
    expect(loaded.cues.length).toBe(0);
    expect(loaded.issues.length).toBe(2);
    expect(loaded.issues.every((i) => i.kind === 'malformed_entry')).toBe(true);
  });

  it('flags duplicate public_url values without dropping the entries', () => {
    const sharedUrl = 'https://celestialaudio.seihouse.org/shared.mp3';
    const input = [
      makeValidCue({ file_path: 'DEFAULT/A/Shared.mp3', public_url: sharedUrl }),
      makeValidCue({
        file_path: 'DEFAULT/B/Shared.mp3',
        public_url: sharedUrl,
        main_category: 'factions',
      }),
    ];
    const loaded = parseAudioCues(input);

    // Both raw entries preserved.
    expect(loaded.rawEntries).toEqual(input);
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

describe('libraryCues URL validation', () => {
  it.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['scheme with no host', 'https://'],
    ['scheme with whitespace', 'https:// '],
    ['plain text', 'not-a-url'],
    ['non-http protocol', 'ftp://example.com/file.mp3'],
    ['data url', 'data:audio/mp3;base64,xyz'],
    ['file url', 'file:///etc/passwd'],
  ])('rejects %s as invalid_url', (_label, url) => {
    const loaded = parseAudioCues([
      makeValidCue({ file_path: 'DEFAULT/Bad/BadUrl.mp3', public_url: url }),
    ]);
    expect(loaded.cues.length).toBe(0);
    expect(loaded.rawEntries.length).toBe(1);
    const issue = loaded.issues.find((i) => i.kind === 'invalid_url');
    expect(issue).toBeDefined();
  });

  it('accepts a valid http URL with a port and path', () => {
    const loaded = parseAudioCues([
      makeValidCue({
        file_path: 'DEFAULT/Weapons/Magic/Fire_Magic_1.mp3',
        public_url: 'https://celestialaudio.seihouse.org:8443/path/to/cue.mp3',
      }),
    ]);
    expect(loaded.cues.length).toBe(1);
    expect(loaded.issues).toEqual([]);
  });
});

describe('libraryCues lookups', () => {
  it('looks up by URL', () => {
    const loaded = loadLibraryCues();
    const anyCue = loaded.cues[0] as AudioCue;
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
    for (const category of AUDIO_CUE_CATEGORIES) {
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
    const anyCue = loaded.cues[0] as AudioCue;
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
    const tag = (withTag as AudioCue).metadata.soft_tags[0];
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
    const anyCue = loaded.cues[0] as AudioCue;
    const tag = anyCue.metadata.soft_tags[0] ?? 'any-tag';
    const results = getByAnyTag(loaded, anyCue.category, [tag, 'no-such-tag']);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.category === anyCue.category)).toBe(true);
  });

  it('returns an empty list for an empty tag query', () => {
    const loaded: AudioCuesLoadResult = loadLibraryCues();
    expect(getByAnyTag(loaded, 'weapons', [])).toEqual([]);
  });
});

describe('default library sound words', () => {
  const SOUND_CUE_CATEGORIES = ['beasts', 'weapons', 'artifacts', 'locations', 'factions'];

  it('gives every Sound Cue recording a declared sound word, and nothing else one', () => {
    const loaded = loadLibraryCues();
    const declared = new Set(LIBRARY_SOUND_WORDS.map(sound => sound.word));
    for (const cue of loaded.cues) {
      if (SOUND_CUE_CATEGORIES.includes(cue.category)) expect(declared.has(cue.metadata.sound ?? '')).toBe(true);
      else expect(cue.metadata.sound).toBeUndefined();
    }
    expect(loaded.cues.filter(cue => cue.metadata.sound)).toHaveLength(92);
  });

  it('declares only words that recordings answer', () => {
    const answered = new Set(loadLibraryCues().cues.map(cue => cue.metadata.sound));
    expect(LIBRARY_SOUND_WORDS.filter(sound => !answered.has(sound.word))).toEqual([]);
    expect(LIBRARY_SOUND_WORDS).toHaveLength(30);
  });

  it('reads Energy only from the size a recording names', () => {
    const energy = (name: string) => loadLibraryCues().cues.find(cue => cue.file_path.endsWith(`/${name}.mp3`))?.metadata.studio_tags?.energy;
    expect(energy('Small_Beast_Roar_1')).toBe('low');
    expect(energy('Medium_Beast_Roar_1')).toBe('medium');
    expect(energy('Giant_Beast_Roar_1')).toBe('high');
    expect(energy('Heavy_Sword_Unsheathe_1')).toBe('high');
    expect(energy('Sword_Unsheathe_1')).toBeUndefined();
  });

  it('offers every default word to a story with the default library', () => {
    expect(soundVocabulary(LIBRARY_BASE_MEDIA).map(sound => sound.word)).toEqual(LIBRARY_SOUND_WORDS.map(sound => sound.word));
  });

  it('keeps sound words and Studio tags through the loader, and rejects malformed ones', () => {
    const loaded = parseAudioCues([
      { ...makeValidCue(), metadata: { ...makeValidCue().metadata, sound: 'Fire_Spell', studio_tags: { tone: 'Dark', energy: 'HIGH' } } },
      { ...makeValidCue({ file_path: 'b.mp3', public_url: 'https://celestialaudio.seihouse.org/b.mp3' }), metadata: { ...makeValidCue().metadata, sound: 'a bad sound word!' } },
      { ...makeValidCue({ file_path: 'c.mp3', public_url: 'https://celestialaudio.seihouse.org/c.mp3' }), metadata: { ...makeValidCue().metadata, studio_tags: { tone: 'urgent' } } },
    ]);
    expect(loaded.cues).toHaveLength(1);
    expect(loaded.cues[0].metadata).toMatchObject({ sound: 'fire spell', studio_tags: { tone: 'dark', energy: 'high' } });
    expect(loaded.issues.map(issue => issue.kind === 'malformed_entry' && issue.reason)).toEqual([
      expect.stringContaining('metadata.sound'),
      expect.stringContaining('Tone'),
    ]);
  });
});
