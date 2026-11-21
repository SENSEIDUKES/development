import { describe, expect, it } from 'vitest';
import { FINGERPRINT_DIMENSIONS, meaningSimilarity, textStamp } from '../../meaning-engine/shared/fingerprint';
import stored from './storyTagFingerprints.json';
import { STORY_TAG_CATALOG, normalizeStoryTagIdentity } from './storyTagCatalog';
import { readStoryTagFingerprints, SAME_TAG_MEANING, suggestStoryTags } from './storyTagEngine';
import { STORY_TAG_MEANINGS, storyTagMeaningText } from './storyTagMeanings';

const tags = readStoryTagFingerprints(stored as never);
const labels = (entries: { label: string }[]) => entries.map(entry => entry.label);
/** A stored tag fingerprint stands in for a synopsis that means the same thing. */
const about = (tag: string) => ({ tags, synopsis: tags.get(tag)! });

describe('Story Tag meanings and fingerprints', () => {
  it('gives every catalog tag one meaning, and no meaning to anything else', () => {
    expect(Object.keys(STORY_TAG_MEANINGS).sort()).toEqual(STORY_TAG_CATALOG.map(tag => tag.label).sort());
  });

  it('stores a current fingerprint for every tag (run `npm run build:tag-fingerprints` after changing one)', () => {
    const file = stored as unknown as { dimensions: number; tags: Record<string, [string, string]> };
    expect(file.dimensions).toBe(FINGERPRINT_DIMENSIONS);
    expect(Object.keys(file.tags)).toEqual(STORY_TAG_CATALOG.map(tag => tag.label));
    const stale = STORY_TAG_CATALOG.map(tag => tag.label)
      .filter(label => file.tags[label][0] !== textStamp(storyTagMeaningText(label, STORY_TAG_MEANINGS[label])));
    expect(stale).toEqual([]);
    for (const fingerprint of tags.values()) expect(fingerprint).toHaveLength(FINGERPRINT_DIMENSIONS);
  });
});

describe('Story Tag suggestions', () => {
  it('suggests nothing for a story that says nothing', () => {
    expect(suggestStoryTags({})).toEqual([]);
    expect(suggestStoryTags({ style: 'chinese', meaning: { tags } })).toEqual([]);
  });

  it('starts from the genre before any synopsis exists, its defining tags first', () => {
    const suggested = labels(suggestStoryTags({ genre: 'Kingdom Building' }));
    expect(suggested[0]).toBe('kingdom building');
    expect(suggested).toEqual(expect.arrayContaining(['territory control', 'resource management', 'law reform']));
    expect(suggested).toHaveLength(8);
  });

  it('finds a tag the synopsis names, with or without fingerprints, and honours what it rules out', () => {
    expect(labels(suggestStoryTags({ synopsis: 'A quiet story of found family in a port town.' }))).toContain('found family');
    const ruledOut = labels(suggestStoryTags({ genre: 'Xianxia', synopsis: 'A sect disciple rises with no romance and no harem.', meaning: { tags } }));
    expect(ruledOut).not.toContain('romance');
    expect(ruledOut).not.toContain('harem');
    expect(labels(suggestStoryTags({ synopsis: 'A chef story without any fighting or magic.' }))).not.toContain('magic');
    // Only what is named right after the negation is ruled out.
    expect(labels(suggestStoryTags({ synopsis: 'A hero with no money studies magic.' }))).toContain('magic');
    expect(labels(suggestStoryTags({ synopsis: 'A hero with no money studies magic and romance.' }))).toEqual(expect.arrayContaining(['magic', 'romance']));
  });

  it('ranks by what the synopsis means, ahead of the genre', () => {
    const suggested = labels(suggestStoryTags({ genre: 'Xianxia', limit: 20, meaning: about('infrastructure growth') }));
    expect(suggested.slice(0, 3)).toContain('infrastructure growth');
    expect(suggested).toEqual(expect.arrayContaining(['economic recovery', 'cultivation realms']));
    expect(labels(suggestStoryTags({ genre: 'Xianxia' }))).not.toContain('infrastructure growth');
  });

  it('never offers two tags that say the same thing, or one that repeats a picked tag', () => {
    const picked = ['returner'];
    const suggested = suggestStoryTags({ genre: 'Hunter', picked, limit: 12, meaning: about('regression') });
    expect(labels(suggested)).not.toContain('returner');
    expect(labels(suggested)).not.toContain('revenge returner');
    const prints = [...picked, ...labels(suggested)].map(label => tags.get(normalizeStoryTagIdentity(label))!);
    for (let a = 0; a < prints.length; a += 1) {
      for (let b = a + 1; b < prints.length; b += 1) expect(meaningSimilarity(prints[a], prints[b])).toBeLessThan(SAME_TAG_MEANING);
    }
  });

  it('gives a fresh batch when asked for more, until every tag with a case has been shown', () => {
    const input = { genre: 'Villainess', meaning: about('death flags') };
    const first = labels(suggestStoryTags(input));
    const second = labels(suggestStoryTags({ ...input, skip: first }));
    expect(second.length).toBeGreaterThan(0);
    expect(second.filter(label => first.includes(label))).toEqual([]);
    expect(suggestStoryTags({ ...input, skip: STORY_TAG_CATALOG.map(tag => tag.label) })).toEqual([]);
  });

  it('lets tags already picked pull in their company, and understands a custom tag by its fingerprint', () => {
    const custom = new Map([[normalizeStoryTagIdentity('My Own Tag'), tags.get('alchemy')!]]);
    const suggested = labels(suggestStoryTags({ picked: ['My Own Tag'], limit: 12, meaning: { tags, custom } }));
    expect(suggested.length).toBeGreaterThan(0);
    expect(suggested).not.toContain('alchemy');
    expect(suggested).toContain('crafting systems');
  });
});
