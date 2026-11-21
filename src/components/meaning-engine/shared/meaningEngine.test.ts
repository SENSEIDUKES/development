import { describe, expect, it } from 'vitest';
import { decodeFingerprint, encodeFingerprint, meaningSimilarity, packFingerprint, textStamp } from './fingerprint';
import { meaningFit, pickSpread } from './rank';

const print = (...values: number[]) => packFingerprint(values, values.length);

describe('meaning fingerprints', () => {
  it('keeps direction when packed, shortened and sent through text', () => {
    const long = Array.from({ length: 1200 }, (_, index) => Math.sin(index) / 10);
    const packed = packFingerprint(long);
    expect(packed).toHaveLength(768);
    expect(meaningSimilarity(packed, packFingerprint(long.map(value => value * 40)))).toBeCloseTo(1, 5);
    for (const size of [1, 2, 3, 768]) {
      const short = packFingerprint(long, size);
      expect([...decodeFingerprint(encodeFingerprint(short))]).toEqual([...short]);
    }
    expect(decodeFingerprint('not a fingerprint!')).toHaveLength(0);
  });

  it('compares by direction and never across different sizes', () => {
    expect(meaningSimilarity(print(1, 0), print(1, 0))).toBeCloseTo(1);
    expect(meaningSimilarity(print(1, 0), print(0, 1))).toBeCloseTo(0);
    expect(meaningSimilarity(print(1, 0), print(1, 0, 0))).toBe(0);
    expect(meaningSimilarity(print(0, 0), print(1, 0))).toBe(0);
  });

  it('stamps a text so a change shows', () => {
    expect(textStamp('a sect')).toBe(textStamp('a sect'));
    expect(textStamp('a sect')).not.toBe(textStamp('a clan'));
  });
});

describe('ranking by meaning', () => {
  it('scores the clear match high and the middle of the field at nothing', () => {
    const candidates: [string, Int8Array][] = [
      ['match', print(1, 0.05)], ...Array.from({ length: 12 }, (_, index) => [`other${index}`, print(0.1 + index / 100, 1)] as [string, Int8Array]),
    ];
    const fit = meaningFit(print(1, 0), candidates);
    expect(fit.get('match')).toBeGreaterThan(0.9);
    expect(fit.get('other0')).toBe(0);
    expect(meaningFit(print(1, 0), []).size).toBe(0);
  });

  it('never picks two candidates that mean the same thing, or one that repeats what is taken', () => {
    const picked = pickSpread([
      { key: 'city building', score: 1, fingerprint: print(1, 0.02) },
      { key: 'settlement upgrades', score: 0.95, fingerprint: print(1, 0.03) },
      { key: 'slow-burn romance', score: 0.6, fingerprint: print(0, 1) },
      { key: 'trade routes', score: 0.5, fingerprint: print(0.6, 0.6) },
      { key: 'kingdom economy', score: 0.9, fingerprint: print(0.2, -1) },
      { key: 'nothing to say', score: 0 },
    ], { limit: 5, sameMeaning: 0.95, taken: [{ key: 'tax reform', fingerprint: print(0.21, -1) }] });
    expect(picked).toEqual(['city building', 'slow-burn romance', 'trade routes']);
  });

  it('lets each further pick from one group count for less', () => {
    const picked = pickSpread([
      { key: 'a', score: 1, group: 'war' }, { key: 'b', score: 0.9, group: 'war' }, { key: 'c', score: 0.8, group: 'love' },
    ], { limit: 3, sameMeaning: 0.9 });
    expect(picked).toEqual(['a', 'c', 'b']);
  });
});
