import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveInternalKey } from '../server/audio/voiceCatalog';
import { CHARACTER_VOICE_CAST, SEIHOUSE_VOICE_CAST, castVoice, chooseCastVoice } from './voiceCast';

const catalog = JSON.parse(readFileSync(new URL('../server/audio/data/voice-catalog.json', import.meta.url), 'utf8')) as Array<{
  file_name: string; voice_id: string | null; main_voice_type: string; fixed_or_flexible: string; description: string;
}>;

describe('The SEIHouse voice cast', () => {
  it('names every catalog voice by the key the server answers, with no provider id', () => {
    expect(SEIHOUSE_VOICE_CAST.map(member => member.key)).toEqual(catalog.map(entry => deriveInternalKey(entry.file_name)));
    for (const [index, entry] of catalog.entries()) {
      const member = SEIHOUSE_VOICE_CAST[index];
      expect(member).toMatchObject({ archetype: entry.main_voice_type, description: entry.description });
      expect(Boolean(member.fixed)).toBe(entry.fixed_or_flexible === 'fixed');
      expect(member.recorded !== false).toBe(Boolean(entry.voice_id));
      if (entry.voice_id) expect(JSON.stringify(member)).not.toContain(entry.voice_id);
    }
    expect(castVoice('dark-protagonist-male')?.archetype).toBe('Stoic Protagonist');
    expect(castVoice('nobody')).toBeUndefined();
  });

  it('never gives a fixed or unrecorded voice by itself', () => {
    expect(CHARACTER_VOICE_CAST.some(member => member.fixed || member.recorded === false)).toBe(false);
    expect(CHARACTER_VOICE_CAST.length).toBe(25);
  });

  it('chooses the same voice for the same character, of their gender, a protagonist\'s for the main character, and a free one while any is left', () => {
    const first = chooseCastVoice({ seed: 'hcx-1' });
    expect(chooseCastVoice({ seed: 'hcx-1' })).toBe(first);
    expect(castVoice(chooseCastVoice({ seed: 'hcx-2', gender: 'female' }))?.gender).toBe('female');
    expect(castVoice(chooseCastVoice({ seed: 'hcx-3', gender: 'male' }))?.gender).toBe('male');
    expect(chooseCastVoice({ seed: 'hcx-4', gender: 'male', mainCharacter: true })).toMatch(/protagonist-male$/);
    const women = CHARACTER_VOICE_CAST.filter(member => member.gender === 'female').map(member => member.key);
    const left = women.at(-1)!;
    expect(chooseCastVoice({ seed: 'hcx-5', gender: 'female', taken: women.slice(0, -1) })).toBe(left);
    // With every voice of a gender taken, one is shared rather than none given.
    expect(women).toContain(chooseCastVoice({ seed: 'hcx-6', gender: 'female', taken: women }));
  });
});
