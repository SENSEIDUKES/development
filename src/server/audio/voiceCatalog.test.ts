import { describe, expect, it } from 'vitest';
import {
  deriveInternalKey,
  getByAgeRange,
  getByArchetype,
  getByClassification,
  getByInternalKey,
  getByRole,
  getTtsAvailable,
  isTtsAvailable,
  loadVoiceCatalog,
  parseVoiceCatalog,
  resolveProviderId,
  toPublicVoiceMeta,
  VoiceCatalogValidationError,
  type PublicVoiceMeta,
  type VoiceCatalogEntry,
} from './voiceCatalog';

describe('voiceCatalog loader', () => {
  it('loads the real catalog without throwing and reports zero fatal issues', () => {
    const loaded = loadVoiceCatalog();
    expect(loaded.entries.length).toBeGreaterThan(0);
    // The raw data is preserved — both arrays cover every parseable entry.
    expect(loaded.publicView.length).toBe(loaded.entries.length);
  });

  it('preserves the entry with a null voice_id as a valid but unavailable voice', () => {
    const loaded = loadVoiceCatalog();
    const unavailable = loaded.entries.find((e) => e.voice_id === null);
    expect(unavailable).toBeDefined();
    expect(unavailable?.main_voice_type).toBeTruthy();
    expect(unavailable?.file_name).toBeTruthy();

    const publicMatch = loaded.publicView.find(
      (v) => v.fileName === unavailable?.file_name,
    );
    expect(publicMatch).toBeDefined();
    expect(publicMatch?.ttsAvailable).toBe(false);
    expect(isTtsAvailable(publicMatch as PublicVoiceMeta)).toBe(false);
  });

  it('strips the provider voice_id from the public view', () => {
    const loaded = loadVoiceCatalog();
    const withId = loaded.entries.find((e) => e.voice_id !== null);
    expect(withId).toBeDefined();

    const publicEntry = toPublicVoiceMeta(withId as VoiceCatalogEntry);
    expect(publicEntry).not.toHaveProperty('voice_id');
    expect(publicEntry).not.toHaveProperty('voiceId');
    expect(Object.keys(publicEntry)).toEqual(
      expect.arrayContaining([
        'internalKey',
        'fileName',
        'archetype',
        'classification',
        'compatibleRoles',
        'description',
        'ageRange',
        'ttsAvailable',
      ]),
    );
  });

  it('derives a unique internal key for every real entry', () => {
    const loaded = loadVoiceCatalog();
    const keys = new Set<string>();
    for (const entry of loaded.publicView) {
      expect(keys.has(entry.internalKey)).toBe(false);
      keys.add(entry.internalKey);
    }
    expect(keys.size).toBe(loaded.publicView.length);
  });

  it('reports zero issues on the well-formed real catalog', () => {
    const loaded = loadVoiceCatalog();
    // No duplicate internal keys, no duplicate voice IDs, no malformed rows.
    expect(loaded.issues).toEqual([]);
  });

  it('throws a validation error when the root is not an array', () => {
    expect(() => parseVoiceCatalog({ not: 'an array' })).toThrow(
      VoiceCatalogValidationError,
    );
  });

  it('surfaces malformed entries without dropping the rest', () => {
    const loaded = parseVoiceCatalog([
      {
        file_name: 'voice_preview_good - male.mp3',
        voice_id: 'goodId0000000000000000',
        main_voice_type: 'Good Voice',
        fixed_or_flexible: 'flexible',
        compatible_character_roles: ['Test Role'],
        description: 'A good entry.',
        age_range: '18-28',
      },
      {
        // Missing several required fields.
        file_name: 'voice_preview_bad - male.mp3',
        voice_id: 12345, // wrong type
      },
      {
        file_name: 'voice_preview_another - male.mp3',
        voice_id: 'another00000000000000000',
        main_voice_type: 'Another Voice',
        fixed_or_flexible: 'invalid-classification',
        compatible_character_roles: 'not-an-array',
        description: 'Another bad entry.',
        age_range: 'Adult',
      },
    ]);

    // Only the well-formed entry should make it through.
    expect(loaded.entries.length).toBe(1);
    expect(loaded.entries[0].file_name).toBe('voice_preview_good - male.mp3');
    expect(loaded.issues.length).toBe(2);
    expect(loaded.issues.every((issue) => issue.kind === 'malformed_entry')).toBe(
      true,
    );
  });

  it('flags duplicate voice_id values without dropping the entries', () => {
    const sharedId = 'duplicate0000000000000000';
    const loaded = parseVoiceCatalog([
      {
        file_name: 'voice_preview_first - male.mp3',
        voice_id: sharedId,
        main_voice_type: 'First',
        fixed_or_flexible: 'flexible',
        compatible_character_roles: [],
        description: 'first',
        age_range: 'Adult',
      },
      {
        file_name: 'voice_preview_second - female.mp3',
        voice_id: sharedId,
        main_voice_type: 'Second',
        fixed_or_flexible: 'fixed',
        compatible_character_roles: [],
        description: 'second',
        age_range: 'Adult',
      },
    ]);

    expect(loaded.entries.length).toBe(2);
    const duplicateIssue = loaded.issues.find((i) => i.kind === 'duplicate_voice_id');
    expect(duplicateIssue).toBeDefined();
    if (duplicateIssue && duplicateIssue.kind === 'duplicate_voice_id') {
      expect(duplicateIssue.voiceId).toBe(sharedId);
      expect(duplicateIssue.fileNames).toHaveLength(2);
    }
  });

  it('normalizes blank and whitespace-only voice_id values to null', () => {
    const loaded = parseVoiceCatalog([
      {
        file_name: 'voice_preview_blank - male.mp3',
        voice_id: '',
        main_voice_type: 'Blank',
        fixed_or_flexible: 'flexible',
        compatible_character_roles: [],
        description: 'blank id',
        age_range: 'Adult',
      },
      {
        file_name: 'voice_preview_whitespace - male.mp3',
        voice_id: '   ',
        main_voice_type: 'Whitespace',
        fixed_or_flexible: 'fixed',
        compatible_character_roles: [],
        description: 'whitespace id',
        age_range: 'Adult',
      },
      {
        file_name: 'voice_preview_mixed - male.mp3',
        voice_id: '\n\t  ',
        main_voice_type: 'Mixed',
        fixed_or_flexible: 'flexible',
        compatible_character_roles: [],
        description: 'mixed whitespace',
        age_range: 'Adult',
      },
    ]);

    // All three rows parsed; no malformed_entry issue for blank/whitespace IDs.
    expect(loaded.entries.length).toBe(3);
    expect(loaded.entries.every((e) => e.voice_id === null)).toBe(true);
    expect(loaded.issues.filter((i) => i.kind === 'malformed_entry')).toHaveLength(0);

    // The public view flags them all as unavailable.
    expect(loaded.publicView.every((v) => v.ttsAvailable === false)).toBe(true);
  });

  it('flags duplicate internal keys (file-name collision) without dropping the entries', () => {
    // Both file names slug to the same internal key ("test-male") because the
    // derivation lowercases the result. The raw file names are distinct.
    const loaded = parseVoiceCatalog([
      {
        file_name: 'voice_preview_test - male.mp3',
        voice_id: 'first000000000000000000',
        main_voice_type: 'First',
        fixed_or_flexible: 'flexible',
        compatible_character_roles: [],
        description: 'first',
        age_range: 'Adult',
      },
      {
        file_name: 'voice_preview_TEST - MALE.mp3',
        voice_id: 'second000000000000000000',
        main_voice_type: 'Second',
        fixed_or_flexible: 'fixed',
        compatible_character_roles: [],
        description: 'second',
        age_range: 'Adult',
      },
    ]);

    // Both raw entries preserved.
    expect(loaded.entries.length).toBe(2);
    const issue = loaded.issues.find((i) => i.kind === 'duplicate_internal_key');
    expect(issue).toBeDefined();
  });
});

describe('voiceCatalog lookups', () => {
  it('looks up by internal key', () => {
    const loaded = loadVoiceCatalog();
    const first = loaded.publicView[0];
    const found = getByInternalKey(loaded.publicView, first.internalKey);
    expect(found?.fileName).toBe(first.fileName);
  });

  it('returns null for an unknown internal key', () => {
    const loaded = loadVoiceCatalog();
    expect(getByInternalKey(loaded.publicView, 'no-such-key')).toBeNull();
  });

  it('looks up by archetype case-insensitively', () => {
    const loaded = loadVoiceCatalog();
    const anyArchetype = loaded.publicView[0].archetype;
    const results = getByArchetype(loaded.publicView, anyArchetype.toUpperCase());
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((v) => v.archetype.toLowerCase() === anyArchetype.toLowerCase())).toBe(
      true,
    );
  });

  it('looks up by compatible role case-insensitively', () => {
    const loaded = loadVoiceCatalog();
    const withRole = loaded.publicView.find((v) => v.compatibleRoles.length > 0);
    expect(withRole).toBeDefined();
    const firstRole = (withRole as PublicVoiceMeta).compatibleRoles[0];
    const results = getByRole(loaded.publicView, firstRole.toUpperCase());
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((v) =>
        v.compatibleRoles.some((r) => r.toLowerCase() === firstRole.toLowerCase()),
      ),
    ).toBe(true);
  });

  it('looks up by age range case-insensitively', () => {
    const loaded = loadVoiceCatalog();
    const anyRange = loaded.publicView[0].ageRange;
    const results = getByAgeRange(loaded.publicView, anyRange.toUpperCase());
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((v) => v.ageRange.toLowerCase() === anyRange.toLowerCase())).toBe(
      true,
    );
  });

  it('looks up by classification for both closed values', () => {
    const loaded = loadVoiceCatalog();
    const fixed = getByClassification(loaded.publicView, 'fixed');
    const flexible = getByClassification(loaded.publicView, 'flexible');
    expect(fixed.length + flexible.length).toBe(loaded.publicView.length);
    expect(fixed.every((v) => v.classification === 'fixed')).toBe(true);
    expect(flexible.every((v) => v.classification === 'flexible')).toBe(true);
  });

  it('isolates the TTS-available subset', () => {
    const loaded = loadVoiceCatalog();
    const available = getTtsAvailable(loaded.publicView);
    expect(available.every((v) => v.ttsAvailable)).toBe(true);
    expect(available.length).toBeLessThanOrEqual(loaded.publicView.length);
  });
});

describe('voiceCatalog provider ID resolution (server-internal)', () => {
  it('returns the provider ID for a known internal key', () => {
    const loaded = loadVoiceCatalog();
    const withId = loaded.entries.find((e) => e.voice_id !== null);
    expect(withId).toBeDefined();
    const key = deriveInternalKey((withId as VoiceCatalogEntry).file_name);
    const providerId = resolveProviderId(loaded.entries, key);
    expect(providerId).toBe((withId as VoiceCatalogEntry).voice_id);
  });

  it('returns null for a voice without a provider ID', () => {
    const loaded = loadVoiceCatalog();
    const withoutId = loaded.entries.find((e) => e.voice_id === null);
    expect(withoutId).toBeDefined();
    const key = deriveInternalKey((withoutId as VoiceCatalogEntry).file_name);
    expect(resolveProviderId(loaded.entries, key)).toBeNull();
  });

  it('returns null for a voice whose provider ID was blank or whitespace in the source', () => {
    const loaded = parseVoiceCatalog([
      {
        file_name: 'voice_preview_blank - male.mp3',
        voice_id: '',
        main_voice_type: 'Blank',
        fixed_or_flexible: 'flexible',
        compatible_character_roles: [],
        description: 'blank id',
        age_range: 'Adult',
      },
      {
        file_name: 'voice_preview_whitespace - female.mp3',
        voice_id: '   ',
        main_voice_type: 'Whitespace',
        fixed_or_flexible: 'fixed',
        compatible_character_roles: [],
        description: 'whitespace id',
        age_range: 'Adult',
      },
    ]);

    expect(resolveProviderId(loaded.entries, 'blank-male')).toBeNull();
    expect(resolveProviderId(loaded.entries, 'whitespace-female')).toBeNull();
  });

  it('returns null for an unknown internal key', () => {
    const loaded = loadVoiceCatalog();
    expect(resolveProviderId(loaded.entries, 'no-such-key')).toBeNull();
  });
});

describe('voiceCatalog internal key derivation', () => {
  it('strips the voice_preview_ prefix and the file extension', () => {
    expect(deriveInternalKey('voice_preview_ancient master - female.mp3')).toBe(
      'ancient-master-female',
    );
  });

  it('lowercases and collapses runs of separators', () => {
    expect(
      deriveInternalKey('voice_preview_SENSEI - Pragmatic Narrator - male.mp3'),
    ).toBe('sensei-pragmatic-narrator-male');
  });

  it('handles file names without the voice_preview_ prefix', () => {
    expect(deriveInternalKey('sensei-pragmatic-narrator.wav')).toBe(
      'sensei-pragmatic-narrator',
    );
  });
});
