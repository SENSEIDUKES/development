import { describe, expect, it } from 'vitest';
import { AUDIO_ENERGIES, AUDIO_TENSIONS, AUDIO_TONES, SOUNDSCAPE_PARENT_TAGS, readAudioTags, readSoundscapeParentTag } from './audioTags';
import { AUDIO_CUE_CATEGORIES } from './cues';

describe('Studio tags', () => {
  it('gives Sound Cues their cue categories as parents and Soundscapes six parent tags', () => {
    expect([...AUDIO_CUE_CATEGORIES].sort()).toEqual(['artifacts', 'atmosphere', 'beasts', 'factions', 'locations', 'system', 'weapons']);
    expect(SOUNDSCAPE_PARENT_TAGS).toEqual(['ADVENTURE', 'AMBIENT', 'EMOTIONS', 'FIGHTING', 'WAR', 'SPECIAL']);
    expect(readSoundscapeParentTag(' war ')).toBe('WAR');
    expect(readSoundscapeParentTag('beasts')).toBeUndefined();
  });

  it('shares three child axes of three values', () => {
    expect(AUDIO_TONES).toEqual(['bright', 'neutral', 'dark']);
    expect(AUDIO_ENERGIES).toEqual(['low', 'medium', 'high']);
    expect(AUDIO_TENSIONS).toEqual(['calm', 'suspenseful', 'urgent']);
  });

  it('reads one value per axis in a single spelling', () => {
    expect(readAudioTags({ tone: 'Dark', energy: ' HIGH ', tension: 'Urgent' })).toEqual({
      ok: true, tags: { tone: 'dark', energy: 'high', tension: 'urgent' },
    });
    expect(readAudioTags({ energy: 'low' })).toEqual({ ok: true, tags: { energy: 'low' } });
    expect(readAudioTags({})).toEqual({ ok: true, tags: {} });
  });

  it('rejects unknown tags, values from another axis, and more than one value on an axis', () => {
    expect(readAudioTags({ tone: 'urgent' })).toMatchObject({ ok: false, reason: expect.stringContaining('Tone') });
    expect(readAudioTags({ energy: ['low', 'high'] })).toMatchObject({ ok: false, reason: expect.stringContaining('Energy') });
    expect(readAudioTags({ parent: 'WAR' })).toMatchObject({ ok: false, reason: expect.stringContaining('parent') });
    expect(readAudioTags(['dark'])).toMatchObject({ ok: false });
  });
});
