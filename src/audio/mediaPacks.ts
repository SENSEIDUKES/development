import type { InlineAudioCueCategory } from './inlineAudio';
import {
  loadLibraryCues,
  parseLibraryCues,
  type LibraryCue,
  type LibraryCuesLoadResult,
} from './libraryCues';
import {
  TRACK_LIBRARY,
  resolveSoundscapeTrack,
  validateSceneAudioCatalog,
  type SceneAudioTrack,
  type SoundscapeIntent,
} from './soundscapes';

export const MEDIA_PACK_TYPES = ['soundscape', 'sound-cue'] as const;
export type MediaPackType = (typeof MEDIA_PACK_TYPES)[number];

export interface MediaPackReference {
  id: string;
  version: string;
}

export interface MediaPackSource {
  /** Explicitly selected catalog resource; never inferred from a filename. */
  path: string;
  /** Lowercase SHA-256 digest of the selected catalog bytes. */
  digest: string;
}

interface MediaPackBase extends MediaPackReference {
  type: MediaPackType;
  displayName: string;
  description: string;
  source: MediaPackSource;
}

export interface SoundscapePack extends MediaPackBase {
  type: 'soundscape';
  entries: SceneAudioTrack[];
}

export interface SoundCuePack extends MediaPackBase {
  type: 'sound-cue';
  entries: Array<LibraryCue & { category: InlineAudioCueCategory }>;
}

export type MediaPack = SoundscapePack | SoundCuePack;

export type StoryMediaLoadoutSlot = 'soundscapes' | 'soundCues';

export interface StoryMediaLoadout {
  soundscapes?: MediaPackReference;
  soundCues?: MediaPackReference;
}

export interface MediaPackEntitlement {
  pack: MediaPackReference;
  unlockedAt: string;
  grant: {
    kind: 'reward' | 'development-test-reward';
    id: string;
  };
}

/** Full validated catalogs are frozen locally so retries cannot drift to a newer pack version. */
export interface FrozenMediaLoadout {
  capturedAt: string;
  soundscapes?: SoundscapePack;
  soundCues?: SoundCuePack;
}

export interface FrozenMediaPackRecord extends MediaPackReference {
  type: MediaPackType;
  source: MediaPackSource;
}

export interface FrozenMediaLoadoutRecord {
  capturedAt: string;
  soundscapes?: FrozenMediaPackRecord & { type: 'soundscape' };
  soundCues?: FrozenMediaPackRecord & { type: 'sound-cue' };
}

export type MediaResourceProvenance =
  | { kind: 'base'; catalogId: 'sen-soundscapes' | 'library-cues'; version: '1' }
  | ({ kind: 'media-pack' } & FrozenMediaPackRecord);

export interface ResolvedSoundscape {
  id: string;
  blockId: string;
  intent: SoundscapeIntent;
  resource: {
    track: SceneAudioTrack;
    provenance: MediaResourceProvenance;
  };
}

export interface AuthorizedMediaCatalog {
  soundscapes: Array<{ track: SceneAudioTrack; provenance: MediaResourceProvenance }>;
  soundCues: LibraryCuesLoadResult;
  soundCueProvenanceByUrl: ReadonlyMap<string, MediaResourceProvenance>;
}

const PACK_FIELDS = new Set(['id', 'version', 'type', 'displayName', 'description', 'source', 'entries']);
const SOURCE_FIELDS = new Set(['path', 'digest']);
const SHA256 = /^[a-f0-9]{64}$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PACK_ID = /^[a-z0-9][a-z0-9._-]{2,127}$/i;
const SOUND_CUE_PACK_CATEGORIES = ['beasts', 'weapons', 'artifacts', 'locations', 'factions'] as const;
const SUPPORTED_AUDIO_FILE = /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav)$/i;

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const assertExactFields = (value: Record<string, unknown>, allowed: ReadonlySet<string>, label: string) => {
  const unexpected = Object.keys(value).find(key => !allowed.has(key));
  if (unexpected) throw new Error(`${label} contains unsupported field ${unexpected}.`);
};

const assertNoForbiddenContent = (value: unknown, path = 'pack') => {
  if (typeof value === 'function') throw new Error(`${path} cannot contain executable code.`);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenContent(entry, `${path}[${index}]`));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    const segmentedKey = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
    const forbidden = /(?:^|[_-])(?:api[_-]?key|authorization|credentials?|password|private[_-]?key|provider[_-]?secret|secret|access[_-]?token|refresh[_-]?token|bearer[_-]?token|executable|script|instructions?)(?:$|[_-])/i;
    if (forbidden.test(segmentedKey)) throw new Error(`${path}.${key} is forbidden in a data-only Media Pack.`);
    assertNoForbiddenContent(entry, `${path}.${key}`);
  }
};

export const isPublicHttpsMediaUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) return false;
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '::1') return false;
    const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)?.slice(1).map(Number);
    if (ipv4) {
      if (ipv4.some(part => part > 255)) return false;
      const [first, second] = ipv4;
      if (
        first === 0
        || first === 10
        || first === 127
        || (first === 169 && second === 254)
        || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && second === 168)
      ) return false;
    }
    if (/^(?:fc|fd|fe8|fe9|fea|feb)/i.test(hostname)) return false;
    return !parsed.search && !parsed.hash && SUPPORTED_AUDIO_FILE.test(parsed.pathname);
  } catch {
    return false;
  }
};

const validateSource = (value: unknown): MediaPackSource => {
  if (!isPlainObject(value)) throw new Error('Media Pack source must be a plain object.');
  assertExactFields(value, SOURCE_FIELDS, 'Media Pack source');
  if (typeof value.path !== 'string' || !value.path.trim()) throw new Error('Media Pack source path is required.');
  const path = value.path.trim();
  if (
    path.includes('\\')
    || path.startsWith('/')
    || /^[A-Za-z]:/.test(path)
    || path.split('/').some(segment => !segment || segment === '.' || segment === '..')
    || !path.toLowerCase().endsWith('.json')
  ) throw new Error('Media Pack source must be an explicitly selected relative JSON catalog path.');
  if (typeof value.digest !== 'string' || !SHA256.test(value.digest)) {
    throw new Error('Media Pack source digest must be a lowercase SHA-256 value.');
  }
  return { path, digest: value.digest };
};

const validateBase = (value: Record<string, unknown>) => {
  assertExactFields(value, PACK_FIELDS, 'Media Pack');
  if (typeof value.id !== 'string' || !PACK_ID.test(value.id)) {
    throw new Error('Media Pack id must be a stable identifier.');
  }
  if (typeof value.version !== 'string' || !VERSION.test(value.version)) {
    throw new Error('Media Pack version must be a semantic version.');
  }
  if (typeof value.displayName !== 'string' || !value.displayName.trim()) throw new Error('Media Pack display name is required.');
  if (typeof value.description !== 'string' || !value.description.trim()) throw new Error('Media Pack description is required.');
  return {
    id: value.id,
    version: value.version,
    displayName: value.displayName.trim(),
    description: value.description.trim(),
    source: validateSource(value.source),
  };
};

const validateSoundCueEntries = (value: unknown): SoundCuePack['entries'] => {
  if (!Array.isArray(value)) throw new Error('Sound Cue catalog must be an array.');
  value.forEach((entry, index) => {
    if (!isPlainObject(entry)) return;
    assertExactFields(entry, new Set(['file_path', 'public_url', 'metadata', 'category']), `Sound Cue entry ${index}`);
    if (isPlainObject(entry.metadata)) {
      assertExactFields(
        entry.metadata,
        new Set(['main_category', 'broad_variation', 'soft_tags', 'description', 'confidence_score']),
        `Sound Cue entry ${index} metadata`,
      );
    }
  });
  const loaded = parseLibraryCues(value);
  if (loaded.issues.length > 0 || loaded.cues.length !== loaded.rawEntries.length) {
    throw new Error(`Sound Cue catalog validation failed: ${loaded.issues.map(issue => issue.kind).join(', ') || 'invalid entry'}.`);
  }
  const allowed = new Set<string>(SOUND_CUE_PACK_CATEGORIES);
  for (const [index, cue] of loaded.cues.entries()) {
    const declaredCategory = isPlainObject(value[index]) ? value[index].category : undefined;
    if (declaredCategory !== undefined && declaredCategory !== cue.category) {
      throw new Error(`Sound Cue ${cue.file_path} has incompatible category data.`);
    }
    if (!allowed.has(cue.category)) {
      throw new Error(`Sound Cue Packs cannot contain ${cue.category} catalog entries.`);
    }
    if (!isPublicHttpsMediaUrl(cue.public_url)) throw new Error(`Sound Cue ${cue.file_path} needs a public HTTPS playback URL.`);
    if (!SUPPORTED_AUDIO_FILE.test(cue.file_path)) throw new Error(`Sound Cue ${cue.file_path} uses an unsupported file type.`);
  }
  const filePaths = new Set<string>();
  for (const cue of loaded.cues) {
    if (filePaths.has(cue.file_path)) throw new Error(`Duplicate Sound Cue identity ${cue.file_path}.`);
    filePaths.add(cue.file_path);
  }
  return loaded.cues as SoundCuePack['entries'];
};

export function validateMediaPack(value: unknown): MediaPack {
  if (!isPlainObject(value)) throw new Error('Media Pack must be a plain data object.');
  assertNoForbiddenContent(value);
  const base = validateBase(value);
  if (value.type === 'soundscape') {
    const entries = validateSceneAudioCatalog(value.entries);
    entries.forEach(entry => {
      if (!isPublicHttpsMediaUrl(entry.url)) throw new Error(`Soundscape ${entry.id} needs a public HTTPS playback URL.`);
    });
    return { ...base, type: 'soundscape', entries };
  }
  if (value.type === 'sound-cue') {
    return { ...base, type: 'sound-cue', entries: validateSoundCueEntries(value.entries) };
  }
  throw new Error('Media Pack type must be soundscape or sound-cue.');
}

export const mediaPackKey = (value: MediaPackReference) => `${value.id}@${value.version}`;

export function createRegisteredMediaPackCatalog(values: readonly unknown[]): ReadonlyMap<string, MediaPack> {
  const packs = values.map(validateMediaPack);
  const catalog = new Map<string, MediaPack>();
  const soundscapeIdentities = new Map<string, string>();
  const soundCueIdentities = new Map<string, string>();
  const baseTrackIds = new Set(TRACK_LIBRARY.map(track => track.id));
  const baseTrackUrls = new Set(TRACK_LIBRARY.map(track => track.url));
  const baseCues = loadLibraryCues();
  const baseCuePaths = new Set(baseCues.cues.map(cue => cue.file_path));
  const baseCueUrls = new Set(baseCues.cues.map(cue => cue.public_url));

  for (const pack of packs) {
    const key = mediaPackKey(pack);
    if (catalog.has(key)) throw new Error(`Duplicate registered Media Pack ${key}.`);
    catalog.set(key, pack);
    if (pack.type === 'soundscape') {
      for (const track of pack.entries) {
        if (baseTrackIds.has(track.id) || baseTrackUrls.has(track.url)) {
          throw new Error(`Media Pack ${key} duplicates a built-in soundscape identity.`);
        }
        for (const identity of [`id:${track.id}`, `url:${track.url}`]) {
          const owner = soundscapeIdentities.get(identity);
          if (owner && !owner.startsWith(`${pack.id}@`)) throw new Error(`Media Pack ${key} duplicates soundscape identity ${identity}.`);
          soundscapeIdentities.set(identity, key);
        }
      }
    } else {
      for (const cue of pack.entries) {
        if (baseCuePaths.has(cue.file_path) || baseCueUrls.has(cue.public_url)) {
          throw new Error(`Media Pack ${key} duplicates a built-in Sound Cue identity.`);
        }
        for (const identity of [`path:${cue.file_path}`, `url:${cue.public_url}`]) {
          const owner = soundCueIdentities.get(identity);
          if (owner && !owner.startsWith(`${pack.id}@`)) throw new Error(`Media Pack ${key} duplicates Sound Cue identity ${identity}.`);
          soundCueIdentities.set(identity, key);
        }
      }
    }
  }
  return catalog;
}

export function resolveRegisteredMediaPack(
  catalog: ReadonlyMap<string, MediaPack>,
  reference: MediaPackReference,
): MediaPack | undefined {
  return catalog.get(mediaPackKey(reference));
}

export function freezeMediaLoadout(input: {
  loadout?: StoryMediaLoadout;
  entitlements: readonly MediaPackEntitlement[];
  registered: ReadonlyMap<string, MediaPack>;
  capturedAt: string;
}): FrozenMediaLoadout {
  const entitled = new Set(input.entitlements.map(entitlement => mediaPackKey(entitlement.pack)));
  const snapshot: FrozenMediaLoadout = { capturedAt: input.capturedAt };
  const soundscapes = input.loadout?.soundscapes && resolveRegisteredMediaPack(input.registered, input.loadout.soundscapes);
  if (soundscapes?.type === 'soundscape' && entitled.has(mediaPackKey(soundscapes))) {
    snapshot.soundscapes = validateMediaPack(soundscapes) as SoundscapePack;
  }
  const soundCues = input.loadout?.soundCues && resolveRegisteredMediaPack(input.registered, input.loadout.soundCues);
  if (soundCues?.type === 'sound-cue' && entitled.has(mediaPackKey(soundCues))) {
    snapshot.soundCues = validateMediaPack(soundCues) as SoundCuePack;
  }
  return snapshot;
}

const packRecord = (pack: MediaPack): FrozenMediaPackRecord => ({
  id: pack.id,
  version: pack.version,
  type: pack.type,
  source: { ...pack.source },
});

export function recordFrozenMediaLoadout(snapshot: FrozenMediaLoadout): FrozenMediaLoadoutRecord {
  return {
    capturedAt: snapshot.capturedAt,
    ...(snapshot.soundscapes ? { soundscapes: packRecord(snapshot.soundscapes) as FrozenMediaLoadoutRecord['soundscapes'] } : {}),
    ...(snapshot.soundCues ? { soundCues: packRecord(snapshot.soundCues) as FrozenMediaLoadoutRecord['soundCues'] } : {}),
  };
}

const baseSoundscapeProvenance: MediaResourceProvenance = {
  kind: 'base', catalogId: 'sen-soundscapes', version: '1',
};
const baseSoundCueProvenance: MediaResourceProvenance = {
  kind: 'base', catalogId: 'library-cues', version: '1',
};

const packProvenance = (pack: MediaPack): MediaResourceProvenance => ({
  kind: 'media-pack',
  ...packRecord(pack),
});

/** Base catalogs always remain present; a validated frozen pack can only add candidates. */
export function createAuthorizedMediaCatalog(snapshot?: FrozenMediaLoadout): AuthorizedMediaCatalog {
  const soundscapes = TRACK_LIBRARY.map(track => ({ track, provenance: baseSoundscapeProvenance }));
  const soundCueProvenanceByUrl = new Map<string, MediaResourceProvenance>();
  const baseCues = loadLibraryCues();
  baseCues.cues.forEach(cue => soundCueProvenanceByUrl.set(cue.public_url, baseSoundCueProvenance));
  const cueEntries: LibraryCue[] = [...baseCues.cues];

  if (snapshot?.soundscapes) {
    try {
      const pack = validateMediaPack(snapshot.soundscapes);
      if (pack.type === 'soundscape') {
        const provenance = packProvenance(pack);
        pack.entries.forEach(track => soundscapes.push({ track, provenance }));
      }
    } catch {
      // A malformed frozen pack contributes nothing; the base experience remains intact.
    }
  }
  if (snapshot?.soundCues) {
    try {
      const pack = validateMediaPack(snapshot.soundCues);
      if (pack.type === 'sound-cue') {
        const provenance = packProvenance(pack);
        pack.entries.forEach(cue => {
          cueEntries.push(cue);
          soundCueProvenanceByUrl.set(cue.public_url, provenance);
        });
      }
    } catch {
      // A malformed frozen pack contributes nothing; the base experience remains intact.
    }
  }
  return {
    soundscapes,
    soundCues: parseLibraryCues(cueEntries),
    soundCueProvenanceByUrl,
  };
}

export function resolveAuthorizedSoundscape(
  intent: SoundscapeIntent,
  catalog: AuthorizedMediaCatalog,
): ResolvedSoundscape | null {
  const track = resolveSoundscapeTrack(intent, catalog.soundscapes.map(entry => entry.track));
  if (!track) return null;
  const authorized = catalog.soundscapes.find(entry => entry.track.id === track.id && entry.track.url === track.url);
  if (!authorized) return null;
  return {
    id: `soundscape:${intent.blockId}:${track.id}`,
    blockId: intent.blockId,
    intent: { ...intent, semanticTags: [...intent.semanticTags] },
    resource: { track: { ...track, moods: [...track.moods], tags: [...track.tags] }, provenance: authorized.provenance },
  };
}

export function isMediaResourceProvenance(value: unknown): value is MediaResourceProvenance {
  if (!isPlainObject(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'base') {
    return Object.keys(value).every(key => ['kind', 'catalogId', 'version'].includes(key))
      && value.version === '1'
      && (value.catalogId === 'sen-soundscapes' || value.catalogId === 'library-cues');
  }
  if (value.kind !== 'media-pack') return false;
  if (!Object.keys(value).every(key => ['kind', 'id', 'version', 'type', 'source'].includes(key))) return false;
  let source: MediaPackSource;
  try {
    source = validateSource(value.source);
  } catch {
    return false;
  }
  return typeof value.id === 'string'
    && PACK_ID.test(value.id)
    && typeof value.version === 'string'
    && VERSION.test(value.version)
    && (value.type === 'soundscape' || value.type === 'sound-cue')
    && source.path.length > 0;
}
