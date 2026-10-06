import { describe, expect, it } from 'vitest';
import { LIBRARY_BASE_MEDIA } from '../host/media/libraryCatalog';
import { soundtrackVocabulary, type FrozenNarrativeMedia, type SceneAudioTrack } from '@seihouse/sen/audio';

const piece = (id: string, mood: string, moods: string[] = [], url = `https://media.example.org/${id}.mp3`): FrozenNarrativeMedia['soundscapes'][number] => ({
  track: { id, mood, moods, tags: [], url } satisfies SceneAudioTrack,
  provenance: { catalogId: 'test', version: '1' },
});

describe('The words a chapter\'s soundtrack is chosen with', () => {
  it('offers the moods at least three pieces share, the most shared first, and every atmosphere word once', () => {
    const vocabulary = soundtrackVocabulary(LIBRARY_BASE_MEDIA);
    expect(vocabulary.moods).toEqual([
      'mystical', 'adventure', 'mystery', 'serenity', 'tension', 'tragedy', 'sad', 'ambient', 'excitement', 'dread', 'triumph', 'fighting', 'serene', 'epic', 'war',
    ]);
    expect(vocabulary.atmospheres).toEqual([
      'gentle rain', 'heavy rain', 'heavy rainstorm', 'gentle wind', 'strong wind', 'gentle waves', 'strong waves',
      'cave', 'cyberpunk city', 'forest', 'horror', 'modern city', 'under water', 'village',
      'crowd chatter', 'crowd cheer', 'crowd roar', 'ancient battlefield', 'magic arts', 'martial arts',
    ]);
  });

  it('offers every mood of a small pack, never a piece it cannot play, and nothing without media', () => {
    expect(soundtrackVocabulary({ soundscapes: [piece('a', 'Storm Path', ['Calm']), piece('b', 'calm'), piece('c', 'void', [], 'http://media.example.org/c.mp3')] }).moods)
      .toEqual(['calm', 'storm path']);
    expect(soundtrackVocabulary(undefined)).toEqual({ moods: [], atmospheres: [] });
  });
});
