import type { LoudnessMeasurement, ReaderAtmosphereOption } from '@seihouse/audio-player';
import atmospheres from './data/sen-atmospheres-v1.json';

/**
 * SEN Atmospheres, Volume 1: the 50 beds the reader chooses from in Reader
 * Settings › Audio. The records come from the `sen-atmospheres` SPP (1.0.0);
 * the loudness beside each was measured from the exact file (its SHA-256
 * matched the pack), so the mixer plays every bed at one reference level.
 * The pack's sound identities and intensity are AI proposals the owner can
 * edit; the Reader shows only each bed's name and group.
 */
export const SEN_ATMOSPHERES: readonly ReaderAtmosphereOption[] = Object.freeze(atmospheres.entries.map(entry => ({
  id: entry.id,
  label: entry.label,
  group: entry.group,
  sources: [{ url: entry.url }],
  loudness: { kind: 'integrated', lufs: entry.loudness.lufs, peakDb: entry.loudness.peakDb } satisfies LoudnessMeasurement,
})));

/** A new reader starts on gentle rain, as the mixer's own default mix does. */
export const DEFAULT_ATMOSPHERE_ID = 'sen-atmosphere-rain-gentle-rain-1';
