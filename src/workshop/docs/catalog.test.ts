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
    expect(searchDocs('Expanded Novels').map(topic => topic.id)).toContain('sen');
    expect(searchDocs('goal active').map(topic => topic.id)).toEqual(['arc-goal']);
    expect(searchDocs('Packages').map(topic => topic.id)).toContain('seihouse-ui');
    const cultivatorResults = searchDocs('Cultivator').map(topic => topic.id);
    expect(cultivatorResults).toContain('reader');
    expect(docsTopics.some(topic => topic.id === 'cultivator' || topic.title === 'Cultivator')).toBe(false);
    const fateOutcomeResults = searchDocs('Fate Outcome').map(topic => topic.id);
    expect(fateOutcomeResults).toContain('fate-survival');
    expect(docsTopics.some(topic => topic.id === 'fate-outcome' || topic.title === 'Fate Outcome')).toBe(false);
    expect(searchDocs('not-a-real-term')).toEqual([]);
  });

  it('defines Product & people terms while leaving later categories for their own phase', () => {
    const productTopics = docsCategories.find(category => category.id === 'product')!.topics;
    expect(productTopics.map(topic => topic.id)).toEqual(['seihouse', 'sen', 'library', 'workshop', 'creator', 'reader']);
    expect(findDocsTopic('sensei')).toBeUndefined();
    for (const topic of productTopics) {
      expect(topic.definition?.trim()).toBeTruthy();
      expect(topic.definition!.length).toBeLessThanOrEqual(140);
      expect(topic.howItFits?.trim()).toBeTruthy();
    }
    const laterTopics = docsCategories.filter(category => category.id !== 'product').flatMap(category => category.topics);
    expect(laterTopics.every(topic => !topic.definition && !topic.howItFits && !topic.related)).toBe(true);
    expect(docsTopics.map(topic => topic.id)).toContain('model-router');
    expect(docsTopics.some(topic => /gemini|gpt-|eleven|veo/i.test(topic.title))).toBe(false);
  });

  it('keeps SEA and album information only in the SEIHouse entry', () => {
    for (const entry of docsTopics) {
      if (entry.id === 'seihouse') continue;
      expect([entry.title, ...entry.aliases, entry.definition, entry.howItFits].join(' ')).not.toMatch(/\bSEA\b|\balbums?\b/i);
    }
    expect(findDocsTopic('seihouse')?.howItFits).toMatch(/\bSEA\b/);
    expect(searchDocs('SEA').map(entry => entry.id)).toEqual(['seihouse']);
  });

  it('builds portable Workshop URLs', () => {
    expect(docsHref()).toBe('?tab=docs');
    expect(docsHref('arc-goal')).toBe('?tab=docs&doc=arc-goal');
  });
});
