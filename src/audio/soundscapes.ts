/**
 * Client-safe SEN soundscape catalog and deterministic resolver. The built-in
 * tracks remain the base experience; an authorized Media Loadout may append
 * validated candidates before calling the same resolver.
 */

export const SOUNDSCAPE_REGIONS = ['chinese', 'japanese', 'korean', 'western'] as const;
export type SoundscapeRegion = (typeof SOUNDSCAPE_REGIONS)[number];

export const isSoundscapeRegion = (value: unknown): value is SoundscapeRegion => (
  typeof value === 'string' && (SOUNDSCAPE_REGIONS as readonly string[]).includes(value)
);

export interface SceneAudioTrack {
  id: string;
  mood: string;
  moods: string[];
  tags: string[];
  /** Cultural scoring region. Regionless built-in tracks remain neutral fallbacks. */
  region?: SoundscapeRegion;
  url: string;
  /** Optional host-supplied display grouping, independent of URL layout. */
  group?: string;
}

export interface SoundscapeIntent {
  blockId: string;
  mood?: string;
  region?: SoundscapeRegion;
  semanticTags: string[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isPublicHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && Boolean(url.hostname)
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
};

/** Validate the existing soundscape track contract without inventing a second audio shape. */
export function validateSceneAudioTrack(value: unknown): SceneAudioTrack {
  if (!isPlainObject(value)) throw new Error('Soundscape catalog entries must be plain objects.');
  const allowed = new Set(['id', 'mood', 'moods', 'tags', 'region', 'url', 'group']);
  const unexpected = Object.keys(value).find(key => !allowed.has(key));
  if (unexpected) throw new Error(`Soundscape catalog entry contains unsupported field ${unexpected}.`);
  if (typeof value.id !== 'string' || !value.id.trim()) throw new Error('Soundscape track id is required.');
  if (typeof value.mood !== 'string' || !value.mood.trim()) throw new Error(`Soundscape track ${value.id} needs a mood.`);
  if (!Array.isArray(value.moods) || value.moods.some(item => typeof item !== 'string' || !item.trim())) {
    throw new Error(`Soundscape track ${value.id} moods must be readable strings.`);
  }
  if (!Array.isArray(value.tags) || value.tags.some(item => typeof item !== 'string' || !item.trim())) {
    throw new Error(`Soundscape track ${value.id} tags must be readable strings.`);
  }
  if (value.region !== undefined && !isSoundscapeRegion(value.region)) {
    throw new Error(`Soundscape track ${value.id} has an unsupported cultural region.`);
  }
  if (typeof value.url !== 'string' || !isPublicHttpsUrl(value.url)) {
    throw new Error(`Soundscape track ${value.id} needs a public HTTPS playback URL.`);
  }
  return {
    id: value.id.trim(),
    mood: value.mood.trim(),
    moods: [...new Set(value.moods.map(item => item.trim()))],
    tags: [...new Set(value.tags.map(item => item.trim()))],
    ...(value.region ? { region: value.region } : {}),
    url: value.url,
  };
}

export function validateSceneAudioCatalog(value: unknown): SceneAudioTrack[] {
  if (!Array.isArray(value)) throw new Error('Soundscape catalog must be an array.');
  const tracks = value.map(validateSceneAudioTrack);
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const track of tracks) {
    if (ids.has(track.id)) throw new Error(`Duplicate soundscape track id ${track.id}.`);
    if (urls.has(track.url)) throw new Error(`Duplicate soundscape playback URL ${track.url}.`);
    ids.add(track.id);
    urls.add(track.url);
  }
  return tracks;
}

const normalized = (value: string) => value.trim().toLowerCase();
const compareCodePoints = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

/**
 * Resolve semantic soundscape intent against the catalog supplied by the host.
 * Exact mood matching gates candidates. Cultural region rejects explicit
 * mismatches and ranks an exact regional track ahead of neutral base tracks;
 * tag overlap and stable identity finish deterministic selection. The model
 * never sees or chooses any catalog value.
 */
export function resolveSoundscapeTrack(
  intent: SoundscapeIntent,
  catalog: readonly SceneAudioTrack[],
): SceneAudioTrack | null {
  const mood = intent.mood ? normalized(intent.mood) : '';
  const region = intent.region ? normalized(intent.region) : '';
  const tags = new Set(intent.semanticTags.map(normalized).filter(Boolean));
  const candidates = catalog.filter(track => {
    const moods = new Set([track.mood, ...track.moods].map(normalized));
    const tagMatch = track.tags.some(tag => tags.has(normalized(tag)));
    const trackRegion = track.region ? normalized(track.region) : '';
    if (trackRegion && (!region || trackRegion !== region)) return false;
    return mood ? moods.has(mood) : tagMatch;
  });
  const score = (track: SceneAudioTrack) => {
    const trackTags = new Set(track.tags.map(normalized));
    let total = 0;
    if (region && track.region && normalized(track.region) === region) total += 1_000;
    for (const tag of tags) if (trackTags.has(tag)) total += 1;
    return total;
  };
  return [...candidates].sort((left, right) => (
    score(right) - score(left)
    || compareCodePoints(left.id, right.id)
    || compareCodePoints(left.url, right.url)
  ))[0] ?? null;
}

