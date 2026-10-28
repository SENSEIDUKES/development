import { describe, expect, it } from 'vitest';
import { backgroundTintColor, DEFAULT_BACKGROUND_TINT, normalizeBackgroundTint } from './backgroundTint';

describe('Library background tint', () => {
  it('normalizes color and rejects malformed preferences, including unsafe or nonfinite values', () => {
    expect(normalizeBackgroundTint({ color: '#FF69B4', strength: 0 })).toEqual({ color: '#ff69b4', strength: 0 });
    for (const value of [null, [], {}, { color: 'url(x)', strength: 40 }, { color: '#ff69b4', strength: NaN }, { color: '#ff69b4', strength: Infinity }, { color: '#ff69b4', strength: -1 }, { color: '#ff69b4', strength: 101 }, { color: '#ff69b4', strength: '60' }]) {
      expect(normalizeBackgroundTint(value)).toBeUndefined();
    }
  });
  it('offers black through a readable dark version of any chosen hue', () => {
    for (const color of ['#ff69b4', '#00ff00', '#ffffff', '#000000', '#04acff']) {
      expect(backgroundTintColor({ color, strength: 0 })).toBe('#000000');
      let previousMax = 0;
      for (const strength of [20, 40, 60, 80, 100]) {
        const actual = backgroundTintColor({ color, strength });
        expect(actual).toMatch(/^#[0-9a-f]{6}$/);
        const max = Math.max(...[1, 3, 5].map(i => parseInt(actual.slice(i, i + 2), 16)));
        expect(max).toBeGreaterThanOrEqual(previousMax);
        expect(max).toBeLessThanOrEqual(50);
        previousMax = max;
      }
    }
    expect(backgroundTintColor(DEFAULT_BACKGROUND_TINT)).toBe('#0b0e1e');
    const pink = backgroundTintColor({ color: '#ff69b4', strength: 100 });
    expect(parseInt(pink.slice(1, 3), 16)).toBeGreaterThan(parseInt(pink.slice(5, 7), 16));
  });
});
