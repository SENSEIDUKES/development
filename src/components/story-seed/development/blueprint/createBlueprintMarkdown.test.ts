import { describe, expect, it } from 'vitest';
import { createBlueprintDraftFromSeed, createEmptyStorySeedInput } from '@seihouse/sen/story-seed';
import { createBlueprintMarkdown } from './createBlueprintMarkdown';

describe('The copied Blueprint', () => {
  it('carries the World card, now that the world lives on it (SENSEI, 2026-11-06)', () => {
    const seed = createEmptyStorySeedInput();
    const blueprint = createBlueprintDraftFromSeed(seed);
    const markdown = createBlueprintMarkdown(blueprint, seed.story.required,
      { name: 'Ye Chen', age: '17', personality: 'Guarded', appearance: 'Grey robes', backgroundProfile: 'Exiled heir' },
      { kindOfWorld: 'A shattered celestial court', whoRules: 'Nine sects', laws: 'No killing inside the gates' });
    expect(markdown).toContain('## World');
    expect(markdown).toContain('### Kind of world\nA shattered celestial court');
    expect(markdown).toContain('### Who rules\nNine sects');
    expect(markdown).toContain('No killing inside the gates');
    // The order follows the card's own definition: the world first, then its rules.
    expect(markdown.indexOf('Kind of world')).toBeLessThan(markdown.indexOf('Laws and customs'));
  });
});
