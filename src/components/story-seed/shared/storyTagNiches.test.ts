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
    expect(findStoryTagNiche('System')?.label).toBe('System');
    expect(findStoryTagNiche('gates & dungeons')?.id).toBe('Gates & Dungeons');
    expect(findStoryTagNiche('sect building')?.id).toBe('Sect Building');
    // A genre that became a tag no longer opens a niche.
    expect(findStoryTagNiche('Regression')).toBeUndefined();
    expect(findStoryTagNiche('urban xianxia mystery')).toBeUndefined();
    expect(findStoryTagNiche('')).toBeUndefined();
  });

  it('gives the LitRPG parent its game-element tags, and lets a tag sit under several parents', () => {
    const system = findStoryTagNiche('System')!;
    for (const tag of ['status window', 'skill trees', 'admin points', 'logistics points', 'save points']) expect(system.tags).toContain(tag);
    expect(getStoryTagNiches('Status Window').map(niche => niche.id)).toEqual(['Isekai', 'Monster Reincarnation', 'System', 'LitRPG', 'Tower Climb', 'Gates & Dungeons', 'Hunter']);
    expect(getStoryTagNiches('comedy')).toEqual([]);
  });
});
