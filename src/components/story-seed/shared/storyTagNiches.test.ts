import { describe, expect, it } from 'vitest';
import { findStoryTagNiche, getStoryTagNiches, getTagMetadata, STORY_TAG_NICHES, storyTagNicheEntries } from '@seihouse/sen/story-seed';

describe('Story Tag niches', () => {
  it('holds only real catalog tags, each once, with its core first', () => {
    for (const niche of STORY_TAG_NICHES) {
      for (const tag of niche.tags) expect(getTagMetadata(tag), `${niche.id}: ${tag}`).toBeDefined();
      expect(new Set(niche.tags).size, niche.id).toBe(niche.tags.length);
      expect(niche.tags.slice(0, niche.core.length)).toEqual([...niche.core]);
      expect(storyTagNicheEntries(niche)).toHaveLength(niche.tags.length);
    }
    expect(new Set(STORY_TAG_NICHES.map(niche => niche.id)).size).toBe(STORY_TAG_NICHES.length);
  });

  it('opens a niche from the genre a story saved, never from a custom genre', () => {
    expect(findStoryTagNiche('LitRPG / System')?.label).toBe('System');
    expect(findStoryTagNiche('litrpg system')?.id).toBe('LitRPG / System');
    expect(findStoryTagNiche('cozy slice of life')?.id).toBe('Cozy Slice-of-Life');
    expect(findStoryTagNiche('urban xianxia mystery')).toBeUndefined();
    expect(findStoryTagNiche('')).toBeUndefined();
  });

  it('gives the LitRPG parent its game-element tags, and lets a tag sit under several parents', () => {
    const system = findStoryTagNiche('LitRPG / System')!;
    for (const tag of ['status window', 'skill trees', 'admin points', 'logistics points', 'save points']) expect(system.tags).toContain(tag);
    expect(getStoryTagNiches('Status Window').map(niche => niche.id)).toEqual(['LitRPG / System', 'Tower Climb']);
    expect(getStoryTagNiches('comedy')).toEqual([]);
  });
});
