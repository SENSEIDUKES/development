import { describe, expect, it } from 'vitest';
import { inferStoryTags, recommendStoryTags } from './storyTagInference';
import { STORY_TAG_CATALOG } from './storyTagCatalog';

const labels = (premise: string, genre = '') => recommendStoryTags({ premise, genre, style: 'chinese' }).map(tag => tag.label);

describe('premise-led tag recommendations', () => {
  it('surfaces setting, mood, affection, and continuity even with a cultivation genre', () => {
    const result = labels('In a port city, two lovers run a cozy bakery while grieving their past mistakes.', 'Xianxia');
    for (const tag of ['port economy', 'cozy fantasy', 'romantic tension', 'emotional continuity', 'long-term consequences']) {
      expect(result).toContain(tag);
    }
    expect(result.indexOf('port economy')).toBeLessThan(result.indexOf('cultivation realms'));
  });

  it('changes recommendations when only the premise changes', () => {
    const romance = labels('Two lovers run a cozy bakery.', 'Xianxia');
    const mystery = labels('A detective investigates ancient ruins, collecting clues about lost history.', 'Xianxia');
    expect(mystery).toContain('ancient ruins');
    expect(mystery).toContain('mystery clues');
    expect(mystery).not.toContain('romantic tension');
    expect(romance).not.toEqual(mystery);
  });

  it('does not infer specific mechanics or relationship tropes from loose words', () => {
    const result = labels('A beloved wife returns to a town under a star. A carpet lies on the floor.');
    for (const tag of ['arranged marriage', 'kingdom building', 'cosmic cultivation', 'bonded beasts', 'dungeon/tower climb', 'regression/reincarnation']) {
      expect(result).not.toContain(tag);
    }
    expect(result).toContain('romantic tension');
  });

  it('recognizes explicit tropes, catalog aliases, and exclusions', () => {
    expect(labels('A forced wedding leads to gradual affection in ancient ruins.')).toEqual(expect.arrayContaining(['arranged marriage', 'slow-burn romance', 'ancient ruins']));
    const result = labels('No romance or cultivation, but a detective investigates clues.', 'Xianxia');
    expect(result).not.toContain('cultivation realms');
    expect(result).not.toContain('romantic tension');
    expect(result).toContain('mystery clues');
  });

  it('keeps cultivation relevant when the premise supports it', () => {
    expect(labels('A cultivator repairs his meridians and learns to level up.', 'Xianxia')).toEqual(expect.arrayContaining(['cultivation realms', 'level progression']));
  });

  it('uses the same ranked results for empty-tag generation and excludes selected tags', () => {
    const input = { premise: 'A cozy bakery brings lovers together as they remember old promises.', style: 'japanese' };
    const recommendations = recommendStoryTags(input);
    expect(inferStoryTags(input)).toEqual(recommendations.slice(0, 8).map(tag => tag.label));
    const selected = recommendations.slice(0, 2).map(tag => tag.label.toUpperCase());
    expect(recommendStoryTags(input, selected).some(tag => selected.includes(tag.label.toUpperCase()))).toBe(false);
    expect(recommendStoryTags(input)).toEqual(recommendations);
    const duplicates = labels('Companion growth and companion power up.');
    expect(new Set(duplicates).size).toBe(duplicates.length);
  });

  it('keeps all suggestions canonical and does not pad sparse premises', () => {
    expect(labels('Something happens.')).toEqual([]);
    expect(recommendStoryTags({ style: 'chinese' })).toEqual([]);
    expect(inferStoryTags({})).toHaveLength(3);
    for (const tag of labels('A detective investigates a cozy bakery where lovers mourn old promises.')) {
      expect(STORY_TAG_CATALOG.some(entry => entry.label === tag)).toBe(true);
    }
  });
});
