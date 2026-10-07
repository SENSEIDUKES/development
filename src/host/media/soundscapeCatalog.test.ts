import { describe, expect, it } from 'vitest';
import { validateSceneAudioCatalog } from '@seihouse/sen/audio';
import soundscapes from './data/sen-soundscapes-v1.json';
import { LIBRARY_BASE_MEDIA } from './libraryCatalog';
import { SEN_SOUNDSCAPES, TRACK_LIBRARY } from './soundscapeCatalog';

describe('SEN Soundscapes, Volume 1', () => {
  it('offers the pack\'s 43 pieces, grouped as the pack groups them, each named and measured for the mixer\'s leveling', () => {
    expect(SEN_SOUNDSCAPES).toHaveLength(43);
    expect([...new Set(SEN_SOUNDSCAPES.map(piece => piece.group))]).toEqual(['Adventure', 'Ambient', 'Emotions', 'Fighting', 'War']);
    // The SEN soundscape contract holds every record as it is.
    expect(validateSceneAudioCatalog(structuredClone([...SEN_SOUNDSCAPES]))).toEqual(SEN_SOUNDSCAPES);
    for (const piece of SEN_SOUNDSCAPES) {
      expect(piece.url).toMatch(/^https:\/\/media\.seihouse\.org\//);
      expect(piece.moods.length).toBeGreaterThan(0);
      expect(piece.loudness).toMatchObject({ kind: 'integrated' });
      expect(piece.loudness!.lufs).toBeGreaterThan(-60);
      expect(piece.loudness!.lufs).toBeLessThan(0);
    }
    // Two pieces sharing a title are told apart by number.
    expect(new Set(SEN_SOUNDSCAPES.map(piece => piece.label)).size).toBe(43);
    expect(SEN_SOUNDSCAPES.filter(piece => piece.label?.startsWith('Ancient Journey')).map(piece => piece.label)).toEqual(['Ancient Journey 1', 'Ancient Journey 2']);
  });

  it('records which pack it came from and that every measured file matched it', () => {
    expect(soundscapes.pack).toMatchObject({ id: 'sen-soundscapes-volume-1', version: '1.0.1' });
    expect(soundscapes.pack.archiveSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(soundscapes.measurement.audioSha256Verified).toBe(true);
  });

  it('is the music every new chapter is written with; the older Reader Chamber keeps its own list', () => {
    expect(LIBRARY_BASE_MEDIA.soundscapes.map(entry => entry.track)).toEqual(SEN_SOUNDSCAPES);
    expect(LIBRARY_BASE_MEDIA.soundscapes.every(entry => entry.provenance.catalogId === 'sen-soundscapes-volume-1' && entry.provenance.version === '1.0.1')).toBe(true);
    expect(TRACK_LIBRARY).toHaveLength(23);
  });
});
