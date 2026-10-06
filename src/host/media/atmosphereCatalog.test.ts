import { describe, expect, it } from 'vitest';
import atmospheres from './data/sen-atmospheres-v1.json';
import { DEFAULT_ATMOSPHERE_ID, SEN_ATMOSPHERES, SEN_SCENE_ATMOSPHERES } from './atmosphereCatalog';

describe('SEN Atmospheres, Volume 1', () => {
  it('offers the pack\'s 50 beds, grouped as the pack groups them, each measured for the mixer\'s leveling', () => {
    expect(SEN_ATMOSPHERES).toHaveLength(50);
    expect(new Set(SEN_ATMOSPHERES.map(entry => entry.id)).size).toBe(50);
    expect([...new Set(SEN_ATMOSPHERES.map(entry => entry.group))]).toEqual(['Rain', 'Wind', 'Waves', 'Places', 'Crowd', 'Combat']);
    for (const entry of SEN_ATMOSPHERES) {
      expect(entry.label.trim()).not.toBe('');
      expect(entry.sources).toEqual([{ url: expect.stringMatching(/^https:\/\//) }]);
      expect(entry.loudness).toMatchObject({ kind: 'integrated' });
      expect(entry.loudness!.lufs).toBeGreaterThan(-60);
      expect(entry.loudness!.lufs).toBeLessThan(0);
      // Some files peak above full scale; the mixer's peak ceiling turns those down on playback.
      expect(Number.isFinite(entry.loudness!.peakDb)).toBe(true);
    }
  });

  it('names each bed by the word a chapter\'s writer chooses it with, its number left off', () => {
    expect(SEN_SCENE_ATMOSPHERES.map(entry => entry.id)).toEqual(SEN_ATMOSPHERES.map(entry => entry.id));
    expect(SEN_SCENE_ATMOSPHERES.find(entry => entry.label === 'Gentle Rain 2')).toMatchObject({ word: 'gentle rain', group: 'Rain' });
    expect(SEN_SCENE_ATMOSPHERES.filter(entry => entry.word === 'gentle rain')).toHaveLength(5);
    expect(new Set(SEN_SCENE_ATMOSPHERES.map(entry => entry.word)).size).toBe(20);
  });

  it('starts a new reader on a bed that exists', () => {
    expect(SEN_ATMOSPHERES.find(entry => entry.id === DEFAULT_ATMOSPHERE_ID)?.label).toBe('Gentle Rain 1');
  });

  it('records which pack it came from and that every measured file matched it', () => {
    expect(atmospheres.pack).toMatchObject({ id: 'sen-atmospheres', version: '1.0.0' });
    expect(atmospheres.pack.archiveSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(atmospheres.measurement.audioSha256Verified).toBe(true);
  });
});
