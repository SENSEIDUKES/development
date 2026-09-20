import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { celestialGuardian } from './celestialGuardian';

describe('supplied Celestial Guardian package', () => {
  it('keeps every playback cell within the original atlas and preserves all 26 states', () => {
    expect(Object.keys(celestialGuardian.animations)).toHaveLength(26);
    expect([celestialGuardian.columns, celestialGuardian.rows, celestialGuardian.cellWidth, celestialGuardian.cellHeight]).toEqual([8, 11, 192, 208]);
    for (const clip of Object.values(celestialGuardian.animations)) {
      expect(clip.row).toBeLessThan(11);
      expect(clip.durations).toHaveLength(clip.columns.length);
      expect(clip.columns.every(column => column >= 0 && column < 8)).toBe(true);
      if (clip.columns.length > 1) expect(clip.durations.every(duration => duration > 0)).toBe(true);
    }
  });

  it('preserves the source assets byte-for-byte against the recorded intake hashes', () => {
    const root = new URL('../../../public/familiars/celestial-guardian/', import.meta.url);
    const hashes = JSON.parse(readFileSync(new URL('source-hashes.json', root), 'utf8')) as Record<string, string>;
    for (const [file, expected] of Object.entries(hashes)) {
      expect(createHash('sha256').update(readFileSync(new URL(file, root))).digest('hex')).toBe(expected);
    }
  });
});
