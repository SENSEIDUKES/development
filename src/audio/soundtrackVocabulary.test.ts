import { describe, expect, it } from 'vitest';
import { LIBRARY_BASE_MEDIA } from '../host/media/libraryCatalog';
import { bedsForAtmosphere, piecesForMusic, soundtrackVocabulary, type FrozenNarrativeMedia, type SceneAtmosphere, type SceneAudioTrack } from '@seihouse/sen/audio';

const piece = (id: string, mood: string, moods: string[] = [], url = `https://media.example.org/${id}.mp3`, more: Partial<SceneAudioTrack> = {}): FrozenNarrativeMedia['soundscapes'][number] => ({
  track: { id, mood, moods, tags: [], url, ...more } satisfies SceneAudioTrack,
  provenance: { catalogId: 'test', version: '1' },
});

describe('The words a chapter\'s soundtrack is chosen with', () => {
  it('offers categories, never recordings: today\'s groups stand in until the packs carry SEN audio tags', () => {
    expect(soundtrackVocabulary(LIBRARY_BASE_MEDIA)).toEqual({
      music: ['Adventure', 'Ambient', 'Emotions', 'Fighting', 'War'],
      atmospheres: ['Rain', 'Wind', 'Waves', 'Places', 'Crowd', 'Combat'],
    });
  });

  it('prefers a piece\'s own category to its group, offers a category three pieces share, never one it cannot play, and nothing without media', () => {
    const media = { soundscapes: [
      piece('a', 'calm', [], undefined, { group: 'Ambient', category: 'Night' }), piece('b', 'calm', [], undefined, { category: 'night' }),
      piece('c', 'calm', [], undefined, { category: 'Night' }), piece('d', 'storm', [], undefined, { group: 'Weather' }),
      piece('e', 'void', [], 'http://media.example.org/e.mp3', { category: 'Night' }),
    ] };
    expect(soundtrackVocabulary(media).music).toEqual(['Night']);
    // A small pack offers every category; a piece with neither category nor group is chosen by its mood.
    expect(soundtrackVocabulary({ soundscapes: [piece('a', 'Storm Path'), piece('b', 'calm', [], undefined, { group: 'Ambient' })] }).music).toEqual(['Storm Path', 'Ambient']);
    expect(soundtrackVocabulary(undefined)).toEqual({ music: [], atmospheres: [] });
  });

  it('plays the pieces of a category closest to the asked tags, with the next closest beside a lone best match', () => {
    const pieces = [
      piece('dark', 'x', [], undefined, { category: 'Fighting', studioTags: { tone: 'dark', tension: 'urgent', energy: 'high' } }),
      piece('half', 'x', [], undefined, { category: 'Fighting', studioTags: { tone: 'dark', energy: 'low' } }),
      piece('bright', 'x', [], undefined, { category: 'Fighting', studioTags: { tone: 'bright', energy: 'low' } }),
      piece('untagged', 'x', [], undefined, { group: 'Fighting' }),
      piece('calm', 'x', [], undefined, { category: 'Ambient', studioTags: { tone: 'dark', tension: 'urgent', energy: 'high' } }),
    ].map(entry => entry.track);
    expect(piecesForMusic({ category: 'fighting', tone: 'dark', tension: 'urgent', energy: 'high' }, pieces).map(track => track.id)).toEqual(['dark', 'half']);
    // Without tags anywhere, every piece of the category plays: worse picks, never silence.
    expect(piecesForMusic({ category: 'Fighting' }, pieces).map(track => track.id)).toEqual(['dark', 'half', 'bright', 'untagged']);
    expect(piecesForMusic({ category: 'War', tone: 'dark' }, pieces)).toEqual([]);
  });

  it('chooses an atmosphere bed of the category with the closest energy, and any of the category when none carries it', () => {
    const rain = LIBRARY_BASE_MEDIA.atmospheres!.filter(bed => bed.group === 'Rain');
    const high = bedsForAtmosphere({ category: 'rain', energy: 'high' }, LIBRARY_BASE_MEDIA.atmospheres!);
    expect(high.length).toBeGreaterThan(0);
    expect(high.every(bed => bed.group === 'Rain' && bed.studioTags?.energy === 'high')).toBe(true);
    const untagged: SceneAtmosphere[] = rain.map(({ studioTags: _tags, ...bed }) => bed);
    expect(bedsForAtmosphere({ category: 'Rain', energy: 'high' }, untagged)).toEqual(untagged);
  });
});
