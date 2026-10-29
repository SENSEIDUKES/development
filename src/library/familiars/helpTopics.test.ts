import { describe, expect, it } from 'vitest';
import { familiarHelpTopics } from './helpTopics';

describe('the Familiar’s Explain topics', () => {
  it('are the help menu’s topics for each place, with their System voice lines and clips', () => {
    const topics = familiarHelpTopics('library', { helpAudio: { energy: 'https://cdn.example/energy.mp3' }, helpVideos: { relics: 'https://cdn.example/relics.mp4' } });
    expect(topics.map(topic => topic.id)).toEqual(['manifest', 'energy', 'sen', 'celestial-library', 'relics']);
    expect(topics.find(topic => topic.id === 'energy')).toMatchObject({ audioUrl: 'https://cdn.example/energy.mp3', phrases: expect.arrayContaining(['energy', 'what is energy']) });
    expect(topics.find(topic => topic.id === 'energy')).not.toHaveProperty('videoUrl');
    expect(topics.find(topic => topic.id === 'relics')).toMatchObject({ videoUrl: 'https://cdn.example/relics.mp4' });
    expect(familiarHelpTopics('reader', {}).map(topic => topic.id)).toEqual(['alter-fate', 'manifest']);
  });
});
