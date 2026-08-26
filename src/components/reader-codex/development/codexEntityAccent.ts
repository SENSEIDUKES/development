/**
 * Compatibility surface for Codex card consumers. Color Codes owns the
 * classification and palette-aware values so cards, inline links, relation
 * maps, badges, and Reader system UI cannot drift apart.
 */
import {
  getColorCodeValue,
  resolveCodexEntityBand as resolveSharedCodexEntityBand,
  resolveCodexEntityColorCode as resolveSharedCodexEntityColorCode,
} from '../../reader-chamber/shared/colorCodes';
import type {
  CodexEntityAccentInput,
  CodexEntityBand,
  ColorCodeId,
} from '../../reader-chamber/shared/colorCodes';

export type {
  CodexEntityAccentInput,
  CodexEntityBand,
};

/** Existing exported fallback now follows the selected accessibility palette. */
export const CODEX_ENTITY_ACCENT_FALLBACK = getColorCodeValue('unknown');

export function resolveCodexEntityBand(
  type: string,
  entry?: CodexEntityAccentInput | null,
  mcName?: string,
): CodexEntityBand {
  return resolveSharedCodexEntityBand(type, entry, mcName);
}

/** The semantic code is available to any card/link surface that needs metadata. */
export function resolveCodexEntityColorCode(
  type: string,
  entry?: CodexEntityAccentInput | null,
  mcName?: string,
): ColorCodeId {
  return resolveSharedCodexEntityColorCode(type, entry, mcName);
}

/** Palette-aware accent used by LibraryCard and the Codex glass ambience. */
export function resolveCodexEntityAccent(
  type: string,
  entry?: CodexEntityAccentInput | null,
  mcName?: string,
): string {
  return getColorCodeValue(resolveCodexEntityColorCode(type, entry, mcName));
}
