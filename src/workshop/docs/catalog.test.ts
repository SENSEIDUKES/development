import { describe, expect, it } from 'vitest';
import { docsCategories, docsHref, docsTopics, findDocsTopic, searchDocs } from './catalog';

describe('Docs topic catalog', () => {
  it('has one stable address per core term and valid related links', () => {
    expect(new Set(docsCategories.map(category => category.id)).size).toBe(docsCategories.length);
    expect(new Set(docsTopics.map(topic => topic.id)).size).toBe(docsTopics.length);
    for (const topic of docsTopics) {
      expect(topic.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(topic.id).not.toBe('overview');
      for (const related of topic.related ?? []) expect(findDocsTopic(related)).toBeDefined();
    }
    expect(docsCategories.map(category => category.title)).toEqual([
      'Product & people', 'Story', 'Generation', 'Models', 'Packages', 'Media', 'Reader & Codex', 'Rewards',
    ]);
  });

  it('finds titles, aliases, categories, and multiple words without case sensitivity', () => {
    expect(searchDocs('  spp ').map(topic => topic.id)).toEqual(['spp', 'spp-manifest']);
    expect(searchDocs('Expanded Novels').map(topic => topic.id)).toEqual(['sen']);
    expect(searchDocs('goal active').map(topic => topic.id)).toEqual(['arc-goal']);
    expect(searchDocs('Packages').map(topic => topic.id)).toContain('seihouse-ui');
    const cultivatorResults = searchDocs('Cultivator').map(topic => topic.id);
    expect(cultivatorResults).toContain('reader');
    expect(docsTopics.some(topic => topic.id === 'cultivator' || topic.title === 'Cultivator')).toBe(false);
    expect(searchDocs('not-a-real-term')).toEqual([]);
  });

  it('leaves product definitions unfilled and does not publish model roster snapshots', () => {
    expect(docsTopics.every(topic => !topic.definition && !topic.howItFits && !topic.related)).toBe(true);
    expect(docsTopics.map(topic => topic.id)).toContain('model-router');
    expect(docsTopics.some(topic => /gemini|gpt-|eleven|veo/i.test(topic.title))).toBe(false);
  });

  it('builds portable Workshop URLs', () => {
    expect(docsHref()).toBe('?tab=docs');
    expect(docsHref('arc-goal')).toBe('?tab=docs&doc=arc-goal');
  });
});
