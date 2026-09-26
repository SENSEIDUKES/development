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
    expect(searchDocs('  spp ').map(topic => topic.id)).toEqual(['spp']);
    expect(searchDocs('SPP Manifest').map(topic => topic.id)).toContain('spp');
    expect(searchDocs('Media Pack').map(topic => topic.id)).toContain('media-loadout');
    expect(searchDocs('Expanded Novels').map(topic => topic.id)).toContain('sen');
    expect(searchDocs('goal active').map(topic => topic.id)).toContain('arc-goal');
    expect(searchDocs('Packages').map(topic => topic.id)).toContain('seihouse-ui');
    const cultivatorResults = searchDocs('Cultivator').map(topic => topic.id);
    expect(cultivatorResults).toContain('reader');
    expect(docsTopics.some(topic => topic.id === 'cultivator' || topic.title === 'Cultivator')).toBe(false);
    const fateOutcomeResults = searchDocs('Fate Outcome').map(topic => topic.id);
    expect(fateOutcomeResults).toContain('fate-survival');
    expect(docsTopics.some(topic => topic.id === 'fate-outcome' || topic.title === 'Fate Outcome')).toBe(false);
    expect(searchDocs('not-a-real-term')).toEqual([]);
  });

  it('defines Product & people, Story, and Packages terms while leaving later categories for their own phase', () => {
    const productTopics = docsCategories.find(category => category.id === 'product')!.topics;
    expect(productTopics.map(topic => topic.id)).toEqual(['seihouse', 'sen', 'library', 'workshop', 'creator', 'reader']);
    expect(findDocsTopic('sensei')).toBeUndefined();
    const storyTopics = docsCategories.find(category => category.id === 'story')!.topics;
    expect(storyTopics).toHaveLength(19);
    const packageTopics = docsCategories.find(category => category.id === 'packages')!.topics;
    expect(packageTopics.map(topic => topic.id)).toEqual(['seihouse-ui', 'seihouse-library-ui', 'seihouse-sen', 'seihouse-library', 'spp']);
    for (const topic of [...productTopics, ...storyTopics, ...packageTopics, findDocsTopic('media-loadout')!]) {
      expect(topic.definition?.trim()).toBeTruthy();
      expect(topic.definition!.length).toBeLessThanOrEqual(140);
      expect(topic.howItFits?.trim()).toBeTruthy();
    }
    const laterTopics = docsCategories.filter(category => !['product', 'story', 'packages'].includes(category.id))
      .flatMap(category => category.topics).filter(topic => topic.id !== 'media-loadout');
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
    expect(searchDocs('SEA').map(entry => entry.id)).toContain('seihouse');
  });

  it('keeps Fate Outcome nested under Fate Survival and reflects the current Fate modes', () => {
    expect(findDocsTopic('fate-outcome')).toBeUndefined();
    expect(findDocsTopic('fate-survival')?.aliases).toContain('Fate Outcome');
    expect(findDocsTopic('alter-fate')?.howItFits).toContain('does not rewrite chapters');
    expect(findDocsTopic('fate-survival')?.definition).toContain('reader directs every chapter');
  });

  it('keeps supporting package details within their parent topics', () => {
    expect(findDocsTopic('software-package')).toBeUndefined();
    expect(findDocsTopic('spp-manifest')).toBeUndefined();
    expect(findDocsTopic('media-pack')).toBeUndefined();
    expect(findDocsTopic('spp')?.aliases).toContain('SPP Manifest');
    expect(findDocsTopic('media-loadout')?.aliases).toContain('Media Pack');
    expect(findDocsTopic('spp')?.howItFits).toContain('manifest.json');
    expect(findDocsTopic('media-loadout')?.howItFits).toContain('A Media Pack');
  });

  it('builds portable Workshop URLs', () => {
    expect(docsHref()).toBe('?tab=docs');
    expect(docsHref('arc-goal')).toBe('?tab=docs&doc=arc-goal');
  });
});
