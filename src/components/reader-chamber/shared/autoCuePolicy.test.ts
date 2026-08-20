import { describe, expect, it } from 'vitest';
import {
  collectBlockAutoCues,
  deriveStructuredAutoCue,
  normalizeAutoCue,
} from './autoCuePolicy';

describe('automatic narrative cue policy', () => {
  it('never turns Bestiary reveals or beast noun tags into automatic audio', () => {
    const beastRevealBlock = {
      metadata: {
        beastEvent: {
          type: 'reveal' as const,
          profile: {
            speciesName: 'Vermilion Debt Fox',
            threatTier: 'calamity' as const,
          },
        },
      },
    };

    expect(normalizeAutoCue('beast_reveal')).toBeNull();
    expect(normalizeAutoCue('dragon emerges')).toBeNull();
    expect(deriveStructuredAutoCue(beastRevealBlock)).toBeNull();
    expect(collectBlockAutoCues(['beast_reveal'], beastRevealBlock)).toEqual([]);
  });

  it('preserves the narrowly curated non-World-Cue automatic events', () => {
    expect(normalizeAutoCue('system alert')).toBe('system_alert');
    expect(deriveStructuredAutoCue({
      system: { promptType: 'breakthrough' } as never,
    })).toBe('breakthrough');
    expect(deriveStructuredAutoCue({
      system: { promptType: 'critical_danger' } as never,
    })).toBe('system_alert');
  });

  it('does not auto-play artifact or weapon events owned by World Cues', () => {
    expect(normalizeAutoCue('artifact_activation')).toBeNull();
    expect(normalizeAutoCue('relic activated')).toBeNull();
    expect(normalizeAutoCue('major_impact')).toBeNull();
    expect(normalizeAutoCue('earth-shattering sword impact')).toBeNull();
  });
});
