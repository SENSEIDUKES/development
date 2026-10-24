import { describe, expect, it } from 'vitest';
import { loadVoiceCatalog, VOICE_GENDERS } from './voiceCatalog';

/**
 * The catalog's own data, held to what matching a character needs (SENSEI,
 * 2026-10-24: "we got to get the foundation here correct"). A voice that
 * cannot be matched is worse than a missing voice, because the match is
 * silent: these guard the fields a match reads, on every entry.
 */
describe('Every voice can be matched', () => {
  const { entries, issues } = loadVoiceCatalog();

  it('loads the whole catalog with nothing malformed', () => {
    expect(entries.length).toBe(31);
    expect(issues).toEqual([]);
  });

  it('gives every voice its own sex, rather than leaving it in the file name', () => {
    for (const entry of entries) {
      expect(VOICE_GENDERS, entry.file_name).toContain(entry.gender);
    }
    // The name is not the source: five of these use an en dash or a double
    // space, so a reading of the name would have to be lenient to be right.
    const strictlyNamed = entries.filter(entry => / - (female|male|unisex)\.mp3$/.test(entry.file_name));
    expect(strictlyNamed.length).toBeLessThan(entries.length);
  });

  it('reads an age as years wherever the label gives years', () => {
    for (const entry of entries) {
      const label = entry.age_range.match(/^(\d{1,3})\s*-\s*(\d{1,3})$/);
      if (label) expect(entry.age_years, entry.file_name).toEqual([Number(label[1]), Number(label[2])]);
      // An age that is not a human span says so in words and carries no years.
      else expect(entry.age_years, `${entry.file_name} (${entry.age_range})`).toBeNull();
    }
  });

  it('names every archetype and role the way the Codex would show it', () => {
    for (const entry of entries) {
      expect(entry.main_voice_type.trim(), entry.file_name).toBe(entry.main_voice_type);
      // A lower-case first letter reads as a typo beside the rest of the list.
      expect(entry.main_voice_type[0], entry.file_name).toBe(entry.main_voice_type[0].toUpperCase());
      for (const role of entry.compatible_character_roles) {
        expect(role.trim(), entry.file_name).toBe(role);
        expect(role[0], `${entry.file_name}: ${role}`).toBe(role[0].toUpperCase());
      }
    }
  });

  it('keeps a voice with no provider ID loadable but unsynthesizable', () => {
    const unprovisioned = entries.filter(entry => entry.voice_id === null);
    // One today: the Pragmatic Narrator. SENSEI provisions it; nothing here invents an ID.
    expect(unprovisioned.map(entry => entry.main_voice_type)).toEqual(['Pragmatic Narrator']);
  });

  it('leaves a fixed voice no roles to be cast into, and a flexible one some', () => {
    for (const entry of entries) {
      if (entry.fixed_or_flexible === 'fixed') expect(entry.compatible_character_roles, entry.file_name).toEqual([]);
      else expect(entry.compatible_character_roles.length, entry.file_name).toBeGreaterThan(0);
    }
  });
});
