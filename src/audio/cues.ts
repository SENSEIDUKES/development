/**
 * Library cues — client-safe.
 *
 * Static curated SEN audio cues. Each entry has a stable `public_url` on the
 * existing `celestialaudio.seihouse.org` CDN that the playback layer can load
 * directly. No credentials or provider lookups are required to consume a cue.
 *
 * Category ownership is documented in `src/audio/README.md`. In short:
 *   - beasts, weapons, artifacts, locations, factions — resolved by the
 *     Phase 3 inline Worldcue system after model-safe intent validation.
 *   - atmosphere — owned by scene audio (the `atmosphereCategory` field on
 *     `StoryCuePayload` / `StoryBlock.metadata` and the `TRACK_LIBRARY` in
 *     `src/audio/soundscapes.ts`).
 *   - system — owned by System Panels (`SystemBlock.tsx`).
 *
 * Free-form fields (`broad_variation`, `soft_tags`, `description`,
 * `file_path`) are kept as plain strings/arrays so future catalog additions
 * do not require a code change. Only `main_category` is normalized to a
 * closed enum of the seven known categories.
 *
 * Raw data is preserved through the loader. Validation reports issues
 * without silently dropping entries; invalid or unknown-category entries
 * are surfaced in `issues` and excluded from the lookup indexes.
 */



export const AUDIO_CUE_CATEGORIES = [
  'beasts',
  'weapons',
  'artifacts',
  'locations',
  'factions',
  'atmosphere',
  'system',
] as const;

export type AudioCueCategory = (typeof AUDIO_CUE_CATEGORIES)[number];

export interface AudioCueMetadata {
  /** Source `main_category`, preserved verbatim from the catalog. */
  main_category: string;
  /** Free-form variation within the category, e.g. "unsheathe", "magic". */
  broad_variation: string;
  /** Free-form soft tags for tag-based lookups. */
  soft_tags: string[];
  description: string;
  /** Confidence in [0, 1]. */
  confidence_score: number;
}

export interface AudioCue {
  file_path: string;
  public_url: string;
  metadata: AudioCueMetadata;
  /** Normalized category. Always one of `AUDIO_CUE_CATEGORIES`. */
  category: AudioCueCategory;
}

export type AudioCueIssue =
  | {
      kind: 'malformed_entry';
      filePath: string;
      reason: string;
    }
  | {
      kind: 'unknown_category';
      filePath: string;
      category: string;
    }
  | {
      kind: 'invalid_url';
      filePath: string;
      reason: string;
    }
  | {
      kind: 'duplicate_url';
      url: string;
      filePaths: string[];
    };

export interface AudioCuesLoadResult {
  /**
   * Every input entry from the raw array, in order, untrusted. Preserved so
   * that a malformed or unknown-category entry can still be inspected at its
   * original index after load — the loader never silently drops a row.
   * `rawEntries.length` always equals the length of the input array.
   */
  rawEntries: unknown[];
  /** Entries that parsed and passed validation. */
  cues: AudioCue[];
  /** First-seen cue per public URL. Duplicates are surfaced in `issues`. */
  byUrl: Map<string, AudioCue>;
  byCategory: Map<AudioCueCategory, AudioCue[]>;
  /** Keyed by `${category}/${broad_variation}`. */
  byVariation: Map<string, AudioCue[]>;
  /** Loader-detected issues. */
  issues: AudioCueIssue[];
}

export class LibraryCueValidationError extends Error {
  constructor(readonly fatal: string[]) {
    super(`Library cues validation failed: ${fatal.join('; ')}`);
    this.name = 'LibraryCueValidationError';
  }
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);
const isFiniteNumberInUnitInterval = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

const isValidUrl = (url: string): boolean => {
  if (!url.trim()) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  // A URL like "https://" parses in some environments without throwing but
  // has no hostname; require one so empty-scheme strings are rejected.
  if (!parsed.hostname) return false;
  return true;
};

const normalizeCategory = (raw: string): AudioCueCategory | null => {
  const lower = raw.toLowerCase();
  return (AUDIO_CUE_CATEGORIES as readonly string[]).find((c) => c === lower) as
    | AudioCueCategory
    | undefined ?? null;
};

export const parseAudioCues = (raw: unknown): AudioCuesLoadResult => {
  if (!Array.isArray(raw)) {
    throw new LibraryCueValidationError(['root must be an array of cue entries.']);
  }
  // Preserve every input entry so a malformed row can still be inspected by
  // index after load. Lookup indexes are built only from valid rows.
  const rawEntries: unknown[] = [...raw];
  const cues: AudioCue[] = [];
  const issues: AudioCueIssue[] = [];
  const urlIndex = new Map<string, string[]>();
  const byCategory = new Map<AudioCueCategory, AudioCue[]>();
  const byVariation = new Map<string, AudioCue[]>();
  const byUrl = new Map<string, AudioCue>();

  for (let i = 0; i < raw.length; i++) {
    const candidate = raw[i];
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      issues.push({
        kind: 'malformed_entry',
        filePath: `<index ${i}>`,
        reason: 'entry must be a plain object',
      });
      continue;
    }
    const e = candidate as Record<string, unknown>;

    if (!isString(e.file_path) || !e.file_path.trim()) {
      issues.push({
        kind: 'malformed_entry',
        filePath: isString(e.file_path) ? e.file_path : `<index ${i}>`,
        reason: 'file_path is required and must be a non-empty string',
      });
      continue;
    }
    if (!isString(e.public_url) || !isValidUrl(e.public_url)) {
      issues.push({
        kind: 'invalid_url',
        filePath: e.file_path,
        reason: 'public_url must be a parseable http(s) URL with a hostname',
      });
      continue;
    }
    if (!e.metadata || typeof e.metadata !== 'object' || Array.isArray(e.metadata)) {
      issues.push({
        kind: 'malformed_entry',
        filePath: e.file_path,
        reason: 'metadata is required and must be a plain object',
      });
      continue;
    }
    const m = e.metadata as Record<string, unknown>;
    if (!isString(m.main_category)) {
      issues.push({
        kind: 'malformed_entry',
        filePath: e.file_path,
        reason: 'metadata.main_category must be a string',
      });
      continue;
    }
    const category = normalizeCategory(m.main_category);
    if (!category) {
      issues.push({
        kind: 'unknown_category',
        filePath: e.file_path,
        category: m.main_category,
      });
      continue;
    }
    if (!isString(m.broad_variation)) {
      issues.push({
        kind: 'malformed_entry',
        filePath: e.file_path,
        reason: 'metadata.broad_variation must be a string',
      });
      continue;
    }
    if (!isStringArray(m.soft_tags)) {
      issues.push({
        kind: 'malformed_entry',
        filePath: e.file_path,
        reason: 'metadata.soft_tags must be a string array',
      });
      continue;
    }
    if (!isString(m.description)) {
      issues.push({
        kind: 'malformed_entry',
        filePath: e.file_path,
        reason: 'metadata.description must be a string',
      });
      continue;
    }
    if (!isFiniteNumberInUnitInterval(m.confidence_score)) {
      issues.push({
        kind: 'malformed_entry',
        filePath: e.file_path,
        reason: 'metadata.confidence_score must be a finite number in [0, 1]',
      });
      continue;
    }

    const cue: AudioCue = {
      file_path: e.file_path,
      public_url: e.public_url,
      metadata: {
        main_category: m.main_category,
        broad_variation: m.broad_variation,
        soft_tags: [...m.soft_tags],
        description: m.description,
        confidence_score: m.confidence_score,
      },
      category,
    };
    cues.push(cue);

    // URL index — first-seen wins for lookup, duplicates surface in issues.
    if (!byUrl.has(cue.public_url)) {
      byUrl.set(cue.public_url, cue);
    }
    const urlList = urlIndex.get(cue.public_url) ?? [];
    urlList.push(cue.file_path);
    urlIndex.set(cue.public_url, urlList);

    // Category index.
    const catList = byCategory.get(category) ?? [];
    catList.push(cue);
    byCategory.set(category, catList);

    // Variation index — `${category}/${variation}` is unique per (category, variation).
    const variationKey = `${category}/${cue.metadata.broad_variation}`;
    const varList = byVariation.get(variationKey) ?? [];
    varList.push(cue);
    byVariation.set(variationKey, varList);
  }

  for (const [url, files] of urlIndex) {
    if (files.length > 1) {
      issues.push({ kind: 'duplicate_url', url, filePaths: files });
    }
  }

  return { rawEntries, cues, byUrl, byCategory, byVariation, issues };
};

/**
 * Synchronous loader. The cue file is a small static JSON list; this returns
 * the parsed result with no I/O at import time. Client-safe.
 */

// ─── Lookups ───────────────────────────────────────────────────────────────

export const getByUrl = (loaded: AudioCuesLoadResult, url: string): AudioCue | null =>
  loaded.byUrl.get(url) ?? null;

export const getByCategory = (
  loaded: AudioCuesLoadResult,
  category: AudioCueCategory,
): AudioCue[] => loaded.byCategory.get(category) ?? [];

export const getByVariation = (
  loaded: AudioCuesLoadResult,
  category: AudioCueCategory,
  variation: string,
): AudioCue[] => loaded.byVariation.get(`${category}/${variation}`) ?? [];

export const getByTag = (
  loaded: AudioCuesLoadResult,
  category: AudioCueCategory,
  tag: string,
): AudioCue[] => {
  const needle = tag.trim().toLowerCase();
  if (!needle) return [];
  return getByCategory(loaded, category).filter((c) =>
    c.metadata.soft_tags.some((t) => t.toLowerCase() === needle),
  );
};

export const getByAnyTag = (
  loaded: AudioCuesLoadResult,
  category: AudioCueCategory,
  tags: string[],
): AudioCue[] => {
  const needles = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (needles.length === 0) return [];
  const needleSet = new Set(needles);
  return getByCategory(loaded, category).filter((c) =>
    c.metadata.soft_tags.some((t) => needleSet.has(t.toLowerCase())),
  );
};

export const getCategories = (loaded: AudioCuesLoadResult): AudioCueCategory[] =>
  Array.from(loaded.byCategory.keys());
