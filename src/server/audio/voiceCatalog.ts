/**
 * Voice catalog — server-only.
 *
 * This module owns the curated voice catalog and is the canonical source for
 * provider IDs (ElevenLabs voice_id). It must remain on the server boundary:
 * client and shared code never import the runtime API from this file. Use
 * `import type` to reference the provider-neutral public types if needed.
 *
 * No provider SDK, no API key, and no network call is made here. Resolving a
 * provider ID for an actual synthesis request is the responsibility of a later
 * server endpoint that reads its credentials from server-side env vars.
 *
 * The catalog is a static JSON list. Free-form fields (archetype, role, age
 * range, description) are kept as plain strings so future catalog additions
 * do not require a code change. Only `fixed_or_flexible` is a closed enum.
 *
 * Raw data is preserved through the loader. Validation reports issues without
 * silently dropping entries; the voice without a provider ID is a valid but
 * unavailable entry.
 */

import voiceCatalogData from './data/voice-catalog.json';

export type VoiceClassification = 'fixed' | 'flexible';

export const VOICE_CLASSIFICATIONS: readonly VoiceClassification[] = ['fixed', 'flexible'] as const;

export interface VoiceCatalogEntry {
  /** Source file name, e.g. "voice_preview_ancient master - female.mp3". */
  file_name: string;
  /**
   * Public provider voice ID (ElevenLabs). `null` when the entry is a valid
   * but currently unprovisioned voice (no TTS available).
   */
  voice_id: string | null;
  /** Free-form archetype label, e.g. "Ancient Master". */
  main_voice_type: string;
  fixed_or_flexible: VoiceClassification;
  /** Free-form compatible character roles; may be empty. */
  compatible_character_roles: string[];
  description: string;
  /** Free-form age band, e.g. "18-28", "Ageless", "Ancient (non-human)". */
  age_range: string;
}

/**
 * Provider-neutral view of a voice. Safe to pass to client/shared code; never
 * carries a provider ID.
 */
export interface PublicVoiceMeta {
  /**
   * Stable internal catalog key derived from the file name. Safe to ship in
   * client payloads and to use as a key when asking the server to resolve a
   * provider ID.
   */
  internalKey: string;
  fileName: string;
  archetype: string;
  classification: VoiceClassification;
  compatibleRoles: string[];
  description: string;
  ageRange: string;
  /** False when the entry has no provider ID and cannot be TTS-synthesized. */
  ttsAvailable: boolean;
}

export type VoiceCatalogIssue =
  | {
      kind: 'malformed_entry';
      /** The file_name of the entry, or `<index N>` when the entry had none. */
      fileName: string;
      reason: string;
    }
  | {
      kind: 'duplicate_internal_key';
      key: string;
      fileNames: string[];
    }
  | {
      kind: 'duplicate_voice_id';
      voiceId: string;
      fileNames: string[];
    };

export interface VoiceCatalogLoadResult {
  /** All raw entries that parsed successfully. */
  entries: VoiceCatalogEntry[];
  /** Provider-neutral projection of every parsed entry. */
  publicView: PublicVoiceMeta[];
  /**
   * Loader-detected issues. Does not throw on these — the catalog stays
   * loadable so problems are visible, not hidden. The hard schema errors that
   * make a load impossible are thrown via `VoiceCatalogValidationError`.
   */
  issues: VoiceCatalogIssue[];
}

export class VoiceCatalogValidationError extends Error {
  constructor(readonly fatal: string[]) {
    super(`Voice catalog validation failed: ${fatal.join('; ')}`);
    this.name = 'VoiceCatalogValidationError';
  }
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isStringOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string';
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);

/**
 * Derive the internal catalog key from a file name. Stable for the current
 * catalog and unique per entry. The transformation is:
 *  - strip the leading `voice_preview_` prefix when present
 *  - strip the file extension
 *  - collapse ` - ` and runs of spaces into single `-`
 *  - drop characters that are not [a-zA-Z0-9-]
 *  - collapse repeated `-` and trim them from the ends
 *  - lowercase
 */
export const deriveInternalKey = (fileName: string): string =>
  fileName
    .replace(/^voice_preview_/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

export const toPublicVoiceMeta = (entry: VoiceCatalogEntry): PublicVoiceMeta => ({
  internalKey: deriveInternalKey(entry.file_name),
  fileName: entry.file_name,
  archetype: entry.main_voice_type,
  classification: entry.fixed_or_flexible,
  compatibleRoles: [...entry.compatible_character_roles],
  description: entry.description,
  ageRange: entry.age_range,
  ttsAvailable: entry.voice_id !== null && entry.voice_id !== '',
});

const collectGroup = <T,>(map: Map<string, T[]>, key: string, value: T): void => {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
};

export const parseVoiceCatalog = (raw: unknown): VoiceCatalogLoadResult => {
  if (!Array.isArray(raw)) {
    throw new VoiceCatalogValidationError(['root must be an array of voice entries.']);
  }
  const entries: VoiceCatalogEntry[] = [];
  const issues: VoiceCatalogIssue[] = [];
  const keyIndex = new Map<string, string[]>();
  const idIndex = new Map<string, string[]>();

  for (let i = 0; i < raw.length; i++) {
    const candidate = raw[i];
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      issues.push({
        kind: 'malformed_entry',
        fileName: `<index ${i}>`,
        reason: 'entry must be a plain object',
      });
      continue;
    }
    const e = candidate as Record<string, unknown>;

    if (!isString(e.file_name) || !e.file_name.trim()) {
      issues.push({
        kind: 'malformed_entry',
        fileName: isString(e.file_name) ? e.file_name : `<index ${i}>`,
        reason: 'file_name is required and must be a non-empty string',
      });
      continue;
    }
    if (!isStringOrNull(e.voice_id)) {
      issues.push({
        kind: 'malformed_entry',
        fileName: e.file_name,
        reason: 'voice_id must be a string or null',
      });
      continue;
    }
    // Normalize blank / whitespace-only voice_id values to null so a voice
    // with no usable provider ID is a valid but unavailable entry, and
    // resolveProviderId returns null for it without special-casing.
    const normalizedVoiceId =
      e.voice_id === null || e.voice_id.trim() === '' ? null : e.voice_id;
    if (!isString(e.main_voice_type) || !e.main_voice_type.trim()) {
      issues.push({
        kind: 'malformed_entry',
        fileName: e.file_name,
        reason: 'main_voice_type is required and must be a non-empty string',
      });
      continue;
    }
    if (e.fixed_or_flexible !== 'fixed' && e.fixed_or_flexible !== 'flexible') {
      issues.push({
        kind: 'malformed_entry',
        fileName: e.file_name,
        reason: 'fixed_or_flexible must be either "fixed" or "flexible"',
      });
      continue;
    }
    if (!isStringArray(e.compatible_character_roles)) {
      issues.push({
        kind: 'malformed_entry',
        fileName: e.file_name,
        reason: 'compatible_character_roles must be a string array',
      });
      continue;
    }
    if (!isString(e.description)) {
      issues.push({
        kind: 'malformed_entry',
        fileName: e.file_name,
        reason: 'description must be a string',
      });
      continue;
    }
    if (!isString(e.age_range)) {
      issues.push({
        kind: 'malformed_entry',
        fileName: e.file_name,
        reason: 'age_range must be a string',
      });
      continue;
    }

    const entry: VoiceCatalogEntry = {
      file_name: e.file_name,
      voice_id: normalizedVoiceId,
      main_voice_type: e.main_voice_type,
      fixed_or_flexible: e.fixed_or_flexible,
      compatible_character_roles: e.compatible_character_roles,
      description: e.description,
      age_range: e.age_range,
    };
    entries.push(entry);

    collectGroup(keyIndex, deriveInternalKey(entry.file_name), entry.file_name);
    if (entry.voice_id !== null) {
      collectGroup(idIndex, entry.voice_id, entry.file_name);
    }
  }

  for (const [key, files] of keyIndex) {
    if (files.length > 1) {
      issues.push({ kind: 'duplicate_internal_key', key, fileNames: files });
    }
  }
  for (const [voiceId, files] of idIndex) {
    if (files.length > 1) {
      issues.push({ kind: 'duplicate_voice_id', voiceId, fileNames: files });
    }
  }

  return {
    entries,
    publicView: entries.map(toPublicVoiceMeta),
    issues,
  };
};

/**
 * Synchronous loader. The catalog is a small static JSON file; this returns
 * the parsed result with no I/O at import time. Server-only.
 */
export const loadVoiceCatalog = (): VoiceCatalogLoadResult => parseVoiceCatalog(voiceCatalogData);

// ─── Lookups (operate on the public view) ───────────────────────────────────

export const getByInternalKey = (
  publicView: PublicVoiceMeta[],
  key: string,
): PublicVoiceMeta | null =>
  publicView.find((v) => v.internalKey === key) ?? null;

export const getByArchetype = (
  publicView: PublicVoiceMeta[],
  archetype: string,
): PublicVoiceMeta[] => {
  const needle = archetype.trim().toLowerCase();
  if (!needle) return [];
  return publicView.filter((v) => v.archetype.toLowerCase() === needle);
};

export const getByRole = (
  publicView: PublicVoiceMeta[],
  role: string,
): PublicVoiceMeta[] => {
  const needle = role.trim().toLowerCase();
  if (!needle) return [];
  return publicView.filter((v) =>
    v.compatibleRoles.some((r) => r.toLowerCase() === needle),
  );
};

export const getByAgeRange = (
  publicView: PublicVoiceMeta[],
  ageRange: string,
): PublicVoiceMeta[] => {
  const needle = ageRange.trim().toLowerCase();
  if (!needle) return [];
  return publicView.filter((v) => v.ageRange.toLowerCase() === needle);
};

export const getByClassification = (
  publicView: PublicVoiceMeta[],
  classification: VoiceClassification,
): PublicVoiceMeta[] => publicView.filter((v) => v.classification === classification);

export const getTtsAvailable = (publicView: PublicVoiceMeta[]): PublicVoiceMeta[] =>
  publicView.filter((v) => v.ttsAvailable);

export const isTtsAvailable = (voice: PublicVoiceMeta): boolean => voice.ttsAvailable;

// ─── Server-internal: provider ID resolution ────────────────────────────────

/**
 * Resolve a provider voice ID for the given internal catalog key. Returns
 * `null` when the key is unknown or the entry has no provider ID. Server-only
 * — never expose the returned ID to client/shared code.
 */
export const resolveProviderId = (
  entries: VoiceCatalogEntry[],
  internalKey: string,
): string | null => {
  for (const entry of entries) {
    if (deriveInternalKey(entry.file_name) === internalKey) {
      return entry.voice_id;
    }
  }
  return null;
};
