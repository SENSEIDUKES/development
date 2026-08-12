import { describe, expect, it } from 'vitest';
import type { StoryMemory } from './types';
import {
  collectCodexTerms,
  createCodexHighlighter,
  escapeRegExp,
  splitByCodexTerms,
} from './codexHighlighting';

function memory(overrides: Partial<StoryMemory> = {}): StoryMemory {
  return {
    powerSystem: 'Qi',
    currentPowerStage: 'Mortal',
    worldRules: [],
    characters: [],
    factions: [],
    locations: [],
    artifacts: [],
    abilities: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
    memoryWarnings: [],
    ...overrides,
  } as StoryMemory;
}

function highlightedFragments(text: string, regex: RegExp | null): string[] {
  if (!regex) return [];
  return text.split(regex).filter((_, index) => index % 2 !== 0);
}

describe('Reader Codex highlighting', () => {
  it('escapes RegExp metacharacters and preserves every mapped mention', () => {
    expect(escapeRegExp('Ye Mo (Reborn) [v2].')).toBe('Ye Mo \\(Reborn\\) \\[v2\\]\\.');
    const highlighter = createCodexHighlighter(collectCodexTerms(memory({
      characters: [{ id: 'c1', name: 'Ye Mo (Reborn)' }] as never,
      locations: [{ id: 'l1', name: 'Sky Terrace' }] as never,
    })));

    const segments = splitByCodexTerms(
      'Ye Mo (Reborn) climbed the Sky Terrace at dawn.',
      highlighter,
    );
    expect(segments.filter(segment => segment.match).map(segment => segment.text))
      .toEqual(['Ye Mo (Reborn)', 'Sky Terrace']);
    expect(segments.filter(segment => segment.match).map(segment => segment.match?.type))
      .toEqual(['character', 'location']);
  });

  it('includes aliases, with canonical names winning collisions', () => {
    const shadow = { id: 'c1', name: 'Shadow', aliases: [] };
    const rival = {
      id: 'c2',
      name: 'Ye Mo',
      aliases: ['Shadow', 'Young Master Ye'],
    };
    const terms = collectCodexTerms(memory({ characters: [shadow, rival] as never }));

    expect(terms.find(term => term.term === 'Shadow')?.entry).toBe(shadow);
    expect(terms.find(term => term.term === 'Young Master Ye')).toMatchObject({
      entry: rival,
      isCanonicalName: false,
    });
  });

  it('matches case-insensitively, prefers longest names, and respects word edges', () => {
    const highlighter = createCodexHighlighter(collectCodexTerms(memory({
      characters: [
        { id: 'c1', name: 'Lin' },
        { id: 'c2', name: 'Mo Xuan' },
        { id: 'c3', name: 'Elder Mo Xuan' },
      ] as never,
      artifacts: [{ id: 'a1', name: 'Jade Blade', tier: 'Legendary' }] as never,
    })));

    expect(highlightedFragments('Elder Mo Xuan drew the JADE BLADE.', highlighter.regex))
      .toEqual(['Elder Mo Xuan', 'JADE BLADE']);
    expect(highlightedFragments('Linus passed Lin.', highlighter.regex)).toEqual(['Lin']);
  });

  it('matches unspaced scripts and tolerates malformed hydrated memory', () => {
    const terms = collectCodexTerms(memory({
      characters: [
        { id: 'c1', name: '林风寒', aliases: null },
        { id: 'c2', name: 'Su Yan', aliases: 'Broken alias payload' },
        null,
      ] as never,
      locations: { id: 'l1', name: 'Sky Altar' } as never,
    }));
    const highlighter = createCodexHighlighter(terms);

    expect(highlightedFragments('林风寒走进了大殿。', highlighter.regex)).toEqual(['林风寒']);
    expect(terms.map(term => term.term).sort()).toEqual(['Su Yan', '林风寒']);
  });

  it('returns plain text when no Codex terms are available', () => {
    const highlighter = createCodexHighlighter([]);
    expect(highlighter.regex).toBeNull();
    expect(splitByCodexTerms('No known entities.', highlighter))
      .toEqual([{ text: 'No known entities.' }]);
  });
});
