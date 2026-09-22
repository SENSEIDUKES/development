import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { celestialGuardian } from './celestialGuardian';
import { familiarCatalogue } from './catalogue';

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
    const metadataRoot = new URL('./package-metadata/celestial-guardian/', import.meta.url);
    const publicRoot = new URL('../../../public/familiars/celestial-guardian/', import.meta.url);
    const hashes = JSON.parse(readFileSync(new URL('source-hashes.json', metadataRoot), 'utf8')) as Record<string, string>;
    for (const [file, expected] of Object.entries(hashes)) {
      if (file === 'pet-request.json') continue;
      const root = ['pet.json', 'animation-timing.json'].includes(file) ? metadataRoot : publicRoot;
      expect(createHash('sha256').update(readFileSync(new URL(file, root))).digest('hex')).toBe(expected);
    }
  });

  it('keeps every imported renderer asset present, public-safe, and source-verified where unchanged', () => {
    const metadataAssets = ['pet.json', 'animation-timing.json'] as const;
    const publicAssets = ['spritesheet.webp', 'neutral.png'] as const;
    const previewAssets = ['idle.gif', 'running-right.gif', 'running-left.gif', 'waving.gif', 'jumping.gif', 'failed.gif', 'waiting.gif', 'running.gif', 'review.gif'] as const;
    for (const entry of familiarCatalogue) {
      const metadataRoot = new URL(`./package-metadata/${entry.definition.id}/`, import.meta.url);
      const publicRoot = new URL(`../../../public/familiars/${entry.definition.id}/`, import.meta.url);
      const hashes = JSON.parse(readFileSync(new URL('source-hashes.json', metadataRoot), 'utf8')) as Record<string, string>;
      const rendererManifest = JSON.parse(readFileSync(new URL('pet-request.json', metadataRoot), 'utf8')) as {
        atlas: { columns: number; rows: number; cell_width: number; cell_height: number };
        rows: readonly { state: string; row: number; frames: number; directions?: readonly string[] }[];
      };

      // Raw package manifests contain intake-only prompts and, in some cases,
      // local file provenance. The host copy is deliberately a renderer-only
      // projection, while source-hashes.json keeps the supplied manifest hash
      // as intake evidence without publishing the raw manifest contents.
      expect(Object.keys(rendererManifest).sort()).toEqual(['atlas', 'rows']);
      expect(rendererManifest.atlas).toEqual({
        columns: entry.definition.columns,
        rows: entry.definition.rows,
        cell_width: entry.definition.cellWidth,
        cell_height: entry.definition.cellHeight,
      });
      expect(rendererManifest.rows).toHaveLength(11);
      expect(rendererManifest.rows.every(row => Object.keys(row).every(key => ['state', 'row', 'frames', 'directions'].includes(key)))).toBe(true);
      expect(JSON.stringify(rendererManifest)).not.toMatch(/(?:[A-Za-z]:[\\/]|\\.hatch-runs)/);

      for (const file of metadataAssets) {
        const contents = readFileSync(new URL(file, metadataRoot));
        // Celestial Guardian predates the neutral/timing intake manifest. Its
        // existing recorded assets remain authenticated above; newer packages
        // record every runtime file in their package manifests.
        if (entry.definition.id !== 'celestial-guardian') {
          expect(hashes[file], `${entry.definition.id} is missing a hash for ${file}`).toBeTruthy();
        }
        if (hashes[file]) {
          expect(createHash('sha256').update(contents).digest('hex')).toBe(hashes[file].toLowerCase());
        }
      }
      for (const file of [...publicAssets, ...previewAssets.map(file => `previews/${file}`)]) {
        const contents = readFileSync(new URL(file, publicRoot));
        // Celestial Guardian predates the neutral/timing intake manifest. Its
        // existing recorded assets remain authenticated above; newer packages
        // record every runtime file in their package manifests.
        if (entry.definition.id !== 'celestial-guardian') {
          expect(hashes[file], `${entry.definition.id} is missing a hash for ${file}`).toBeTruthy();
        }
        if (hashes[file]) {
          expect(createHash('sha256').update(contents).digest('hex')).toBe(hashes[file].toLowerCase());
        }
      }
    }
  });
});
