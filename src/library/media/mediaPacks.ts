import { isPlayableMediaUrl, createMediaCatalog, type MediaCatalog, type MediaResourceProvenance, type NarrativeMediaPort, type StoryMediaSelection, type FrozenNarrativeMedia } from '@seihouse/sen/audio';
import { parseAudioCues, type AudioCue } from '@seihouse/sen/audio';
import { validateSceneAudioCatalog, type SceneAudioTrack } from '@seihouse/sen/audio';
import { validateSoundWords, type SoundWord } from '@seihouse/sen/audio';
import { readAudioTags, type SceneAtmosphere } from '@seihouse/sen/audio';

export const MEDIA_PACK_TYPES = ['soundscape', 'sound-cue', 'atmosphere'] as const;
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
  /**
   * The pack's sound words, each with an example of what a writer wraps. Every
   * recording names one of them and every word has a recording. An equipped
   * pack is the story's whole Sound Cue set: its words and recordings replace
   * the default library's.
   */
  sounds: SoundWord[];
  /** Each recording's cue category is its Studio parent tag. */
  entries: AudioCue[];
}

/**
 * The looping beds a chapter's atmosphere is chosen from, made in the Library's
 * studios like music and Sound Cues. An equipped pack is the story's whole set
 * of atmospheres: its beds replace the Library's own.
 */
export interface AtmospherePack extends MediaPackBase {
  type: 'atmosphere';
  entries: Array<SceneAtmosphere & { url: string; label: string }>;
}

export type MediaPack = SoundscapePack | SoundCuePack | AtmospherePack;

export type StoryMediaLoadoutSlot = 'soundscapes' | 'soundCues' | 'atmospheres';

/** The pack type each Media Loadout slot takes. */
export const MEDIA_SLOT_PACK_TYPES: Readonly<Record<StoryMediaLoadoutSlot, MediaPackType>> = {
  soundscapes: 'soundscape', soundCues: 'sound-cue', atmospheres: 'atmosphere',
};
export const MEDIA_LOADOUT_SLOTS = Object.keys(MEDIA_SLOT_PACK_TYPES) as StoryMediaLoadoutSlot[];

export interface StoryMediaLoadout {
  soundscapes?: MediaPackReference;
  soundCues?: MediaPackReference;
  atmospheres?: MediaPackReference;
}

export interface MediaPackEntitlement {
  pack: MediaPackReference;
  unlockedAt: string;
  /** Host-account validity boundary. Omit only for a permanent entitlement. */
  expiresAt?: string;
}

/** Full validated catalogs are frozen locally so retries cannot drift to a newer pack version. */
export interface FrozenMediaLoadout {
  capturedAt: string;
  soundscapes?: SoundscapePack;
  soundCues?: SoundCuePack;
  atmospheres?: AtmospherePack;
}

export interface FrozenMediaPackRecord extends MediaPackReference {
  type: MediaPackType;
  source: MediaPackSource;
}

export interface FrozenMediaLoadoutRecord {
  capturedAt: string;
  soundscapes?: FrozenMediaPackRecord & { type: 'soundscape' };
  soundCues?: FrozenMediaPackRecord & { type: 'sound-cue' };
  atmospheres?: FrozenMediaPackRecord & { type: 'atmosphere' };
}

const PACK_FIELDS = new Set(['id', 'version', 'type', 'displayName', 'description', 'source', 'entries']);
const SOUND_CUE_PACK_FIELDS = new Set([...PACK_FIELDS, 'sounds']);
const SOURCE_FIELDS = new Set(['path', 'digest']);
const SHA256 = /^[a-f0-9]{64}$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PACK_ID = /^[a-z0-9][a-z0-9._-]{2,127}$/i;
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
  assertExactFields(value, value.type === 'sound-cue' ? SOUND_CUE_PACK_FIELDS : PACK_FIELDS, 'Media Pack');
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

const validateSoundCueEntries = (value: unknown, sounds: readonly SoundWord[]): SoundCuePack['entries'] => {
  if (!Array.isArray(value)) throw new Error('Sound Cue catalog must be an array.');
  value.forEach((entry, index) => {
    if (!isPlainObject(entry)) return;
    assertExactFields(entry, new Set(['file_path', 'public_url', 'metadata', 'category']), `Sound Cue entry ${index}`);
    if (isPlainObject(entry.metadata)) {
      assertExactFields(
        entry.metadata,
        new Set(['main_category', 'broad_variation', 'soft_tags', 'description', 'confidence_score', 'sound', 'studio_tags']),
        `Sound Cue entry ${index} metadata`,
      );
    }
  });
  const loaded = parseAudioCues(value);
  if (loaded.issues.length > 0 || loaded.cues.length !== loaded.rawEntries.length) {
    const reasons = loaded.issues.map(issue => ('reason' in issue ? `${issue.filePath}: ${issue.reason}` : issue.kind));
    throw new Error(`Sound Cue catalog validation failed: ${reasons.join('; ') || 'invalid entry'}.`);
  }
  // A recording's category is its Studio parent tag; any of the seven may
  // hold Sound Cues, because placement follows the sound word, not the category.
  for (const [index, cue] of loaded.cues.entries()) {
    const declaredCategory = isPlainObject(value[index]) ? value[index].category : undefined;
    if (declaredCategory !== undefined && declaredCategory !== cue.category) {
      throw new Error(`Sound Cue ${cue.file_path} has incompatible category data.`);
    }
    if (!isPlayableMediaUrl(cue.public_url)) throw new Error(`Sound Cue ${cue.file_path} needs a public HTTPS playback URL or a file in an installed package.`);
    if (!SUPPORTED_AUDIO_FILE.test(cue.file_path)) throw new Error(`Sound Cue ${cue.file_path} uses an unsupported file type.`);
  }
  const filePaths = new Set<string>();
  for (const cue of loaded.cues) {
    if (filePaths.has(cue.file_path)) throw new Error(`Duplicate Sound Cue identity ${cue.file_path}.`);
    filePaths.add(cue.file_path);
  }
  // Words and recordings match one to one: each recording answers a declared
  // word, and each declared word has at least one recording.
  const declared = new Set(sounds.map(sound => sound.word));
  const answered = new Set<string>();
  for (const cue of loaded.cues) {
    if (!cue.metadata.sound) throw new Error(`Sound Cue ${cue.file_path} needs a sound word.`);
    if (!declared.has(cue.metadata.sound)) throw new Error(`Sound Cue ${cue.file_path} answers "${cue.metadata.sound}", which the pack does not declare.`);
    answered.add(cue.metadata.sound);
  }
  const unused = sounds.find(sound => !answered.has(sound.word));
  if (unused) throw new Error(`The sound word "${unused.word}" has no recording in this pack.`);
  return loaded.cues as SoundCuePack['entries'];
};

const ATMOSPHERE_FIELDS = new Set(['id', 'word', 'label', 'group', 'category', 'studioTags', 'url', 'loudness']);
const ATMOSPHERE_WORD = /^[a-z]+(?: [a-z]+){0,2}$/;

const validateAtmosphereEntries = (value: unknown): AtmospherePack['entries'] => {
  if (!Array.isArray(value) || value.length === 0) throw new Error('An Atmosphere pack needs at least one bed.');
  const ids = new Set<string>();
  const urls = new Set<string>();
  return value.map((entry, index) => {
    if (!isPlainObject(entry)) throw new Error(`Atmosphere ${index + 1} must be a plain object.`);
    assertExactFields(entry, ATMOSPHERE_FIELDS, `Atmosphere ${index + 1}`);
    const { id, word, label, group, category, url, loudness } = entry;
    if (typeof id !== 'string' || !id.trim()) throw new Error(`Atmosphere ${index + 1} needs an id.`);
    if (typeof word !== 'string' || !ATMOSPHERE_WORD.test(word)) throw new Error(`Atmosphere ${id} needs a word: one to three plain lowercase words.`);
    if (typeof label !== 'string' || !label.trim()) throw new Error(`Atmosphere ${id} needs a name.`);
    if (group !== undefined && (typeof group !== 'string' || !group.trim())) throw new Error(`Atmosphere ${id} has an empty group.`);
    if (category !== undefined && (typeof category !== 'string' || !category.trim())) throw new Error(`Atmosphere ${id} has an empty category.`);
    const studioTags = entry.studioTags === undefined ? undefined : readAudioTags(entry.studioTags);
    if (studioTags && !studioTags.ok) throw new Error(`Atmosphere ${id}: ${studioTags.reason}`);
    if (typeof url !== 'string' || !isPlayableMediaUrl(url)) throw new Error(`Atmosphere ${id} needs a public HTTPS playback URL or a file in an installed package.`);
    if (!SUPPORTED_AUDIO_FILE.test(url)) throw new Error(`Atmosphere ${id} uses an unsupported file type.`);
    if (loudness !== undefined && !(isPlainObject(loudness) && typeof loudness.lufs === 'number' && Number.isFinite(loudness.lufs)
      && (loudness.peakDb === undefined || (typeof loudness.peakDb === 'number' && Number.isFinite(loudness.peakDb))))) {
      throw new Error(`Atmosphere ${id} has unreadable loudness.`);
    }
    if (ids.has(id) || urls.has(url)) throw new Error(`Atmosphere ${id} is listed twice.`);
    ids.add(id);
    urls.add(url);
    return {
      id, word, label: label.trim(), url,
      ...(group ? { group: group.trim() } : {}),
      ...(category ? { category: category.trim() } : {}),
      ...(studioTags?.ok && Object.keys(studioTags.tags).length ? { studioTags: studioTags.tags } : {}),
      ...(isPlainObject(loudness) ? { loudness: { lufs: loudness.lufs as number, ...(typeof loudness.peakDb === 'number' ? { peakDb: loudness.peakDb } : {}) } } : {}),
    };
  });
};

export function validateMediaPack(value: unknown): MediaPack {
  if (!isPlainObject(value)) throw new Error('Media Pack must be a plain data object.');
  assertNoForbiddenContent(value);
  const base = validateBase(value);
  if (value.type === 'soundscape') {
    const entries = validateSceneAudioCatalog(value.entries);
    entries.forEach(entry => {
      if (!isPlayableMediaUrl(entry.url)) throw new Error(`Soundscape ${entry.id} needs a public HTTPS playback URL or a file in an installed package.`);
    });
    return { ...base, type: 'soundscape', entries };
  }
  if (value.type === 'sound-cue') {
    const sounds = validateSoundWords(value.sounds);
    return { ...base, type: 'sound-cue', sounds, entries: validateSoundCueEntries(value.entries, sounds) };
  }
  if (value.type === 'atmosphere') return { ...base, type: 'atmosphere', entries: validateAtmosphereEntries(value.entries) };
  throw new Error('Media Pack type must be soundscape, sound-cue or atmosphere.');
}

export const mediaPackKey = (value: MediaPackReference) => `${value.id}@${value.version}`;

/** HARNESS consumes this host-owned decision but never persists or mutates it. */
export function isMediaPackEntitlementActive(entitlement: MediaPackEntitlement, at: string): boolean {
  const instant = Date.parse(at);
  const unlockedAt = Date.parse(entitlement.unlockedAt);
  if (
    !PACK_ID.test(entitlement.pack.id)
    || !VERSION.test(entitlement.pack.version)
    || !Number.isFinite(instant)
    || !Number.isFinite(unlockedAt)
    || unlockedAt > instant
  ) return false;
  if (entitlement.expiresAt === undefined) return true;
  const expiresAt = Date.parse(entitlement.expiresAt);
  return Number.isFinite(expiresAt) && instant < expiresAt;
}

export function createRegisteredMediaPackCatalog(values: readonly unknown[], base: MediaCatalog = createMediaCatalog()): ReadonlyMap<string, MediaPack> {
  const packs = values.map(validateMediaPack);
  const catalog = new Map<string, MediaPack>();
  const soundscapeIdentities = new Map<string, string>();
  const soundCueIdentities = new Map<string, string>();
  const baseTrackIds = new Set(base.soundscapes.map(({ track }) => track.id));
  const baseTrackUrls = new Set(base.soundscapes.map(({ track }) => track.url));
  const baseCues = base.soundCues;
  const baseCuePaths = new Set(baseCues.cues.map(cue => cue.file_path));
  const baseCueUrls = new Set(baseCues.cues.map(cue => cue.public_url));
  const baseAtmosphereIds = new Set(base.atmospheres.map(atmosphere => atmosphere.id));
  const atmosphereIdentities = new Map<string, string>();

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
    } else if (pack.type === 'atmosphere') {
      for (const bed of pack.entries) {
        if (baseAtmosphereIds.has(bed.id)) throw new Error(`Media Pack ${key} duplicates a built-in atmosphere identity.`);
        const owner = atmosphereIdentities.get(bed.id);
        if (owner && !owner.startsWith(`${pack.id}@`)) throw new Error(`Media Pack ${key} duplicates atmosphere identity ${bed.id}.`);
        atmosphereIdentities.set(bed.id, key);
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
  const entitled = new Set(input.entitlements
    .filter(entitlement => isMediaPackEntitlementActive(entitlement, input.capturedAt))
    .map(entitlement => mediaPackKey(entitlement.pack)));
  const snapshot: FrozenMediaLoadout = { capturedAt: input.capturedAt };
  const soundscapes = input.loadout?.soundscapes && resolveRegisteredMediaPack(input.registered, input.loadout.soundscapes);
  if (soundscapes?.type === 'soundscape' && entitled.has(mediaPackKey(soundscapes))) {
    snapshot.soundscapes = validateMediaPack(soundscapes) as SoundscapePack;
  }
  const soundCues = input.loadout?.soundCues && resolveRegisteredMediaPack(input.registered, input.loadout.soundCues);
  if (soundCues?.type === 'sound-cue' && entitled.has(mediaPackKey(soundCues))) {
    snapshot.soundCues = validateMediaPack(soundCues) as SoundCuePack;
  }
  const atmospheres = input.loadout?.atmospheres && resolveRegisteredMediaPack(input.registered, input.loadout.atmospheres);
  if (atmospheres?.type === 'atmosphere' && entitled.has(mediaPackKey(atmospheres))) {
    snapshot.atmospheres = validateMediaPack(atmospheres) as AtmospherePack;
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
    ...(snapshot.atmospheres ? { atmospheres: packRecord(snapshot.atmospheres) as FrozenMediaLoadoutRecord['atmospheres'] } : {}),
  };
}

const packProvenance = (pack: MediaPack): MediaResourceProvenance => ({
  catalogId: pack.id,
  version: pack.version,
  source: { ...pack.source },
});

/**
 * The authorized catalog for one attempt. A Soundscape Pack adds tracks to the
 * base soundscapes. A Sound Cue Pack is the story's whole Sound Cue set: its
 * words and recordings replace the default library's, while base recordings
 * that answer no sound word (atmosphere, system) stay. An Atmosphere Pack is
 * the story's whole set of atmospheres: its beds replace the base's.
 */
export function createAuthorizedMediaCatalog(snapshot?: FrozenMediaLoadout, base: MediaCatalog = createMediaCatalog()): MediaCatalog {
  const soundscapes = structuredClone(base.soundscapes);
  let soundCueProvenanceByUrl = new Map(base.soundCueProvenanceByUrl);
  const baseCues = base.soundCues;
  let cueEntries: AudioCue[] = [...baseCues.cues];
  let sounds = structuredClone(base.sounds);
  let atmospheres = structuredClone(base.atmospheres);

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
        const kept = baseCues.cues.filter(cue => !cue.metadata.sound);
        cueEntries = [...kept, ...pack.entries];
        soundCueProvenanceByUrl = new Map(kept.flatMap(cue => {
          const origin = base.soundCueProvenanceByUrl.get(cue.public_url);
          return origin ? [[cue.public_url, origin] as const] : [];
        }));
        pack.entries.forEach(cue => soundCueProvenanceByUrl.set(cue.public_url, provenance));
        sounds = structuredClone(pack.sounds);
      }
    } catch {
      // A malformed frozen pack contributes nothing; the base experience remains intact.
    }
  }
  if (snapshot?.atmospheres) {
    try {
      const pack = validateMediaPack(snapshot.atmospheres);
      if (pack.type === 'atmosphere') atmospheres = structuredClone(pack.entries);
    } catch {
      // A malformed frozen pack contributes nothing; the base experience remains intact.
    }
  }
  return {
    soundscapes,
    soundCues: parseAudioCues(cueEntries),
    soundCueProvenanceByUrl,
    sounds,
    atmospheres,
  };
}


/** Library translates server-supplied entitlement truth into SEN's opaque media port. */
export function createLibraryMediaPort(input: {
  registered: readonly MediaPack[];
  entitlements: readonly MediaPackEntitlement[];
  base?: FrozenNarrativeMedia;
}): NarrativeMediaPort {
  const base = createMediaCatalog(input.base);
  const registered = createRegisteredMediaPackCatalog(input.registered, base);
  const entitlements = structuredClone([...input.entitlements]);
  return {
    validateSelection(selection: StoryMediaSelection, at: string) {
      for (const slot of MEDIA_LOADOUT_SLOTS) {
        const reference = selection[slot];
        if (!reference) continue;
        const pack = resolveRegisteredMediaPack(registered, reference);
        if (!pack) throw new Error('Only a registered Media Pack can be equipped.');
        if (pack.type !== MEDIA_SLOT_PACK_TYPES[slot]) throw new Error(`This slot requires ${{ soundscapes: 'Soundscapes', soundCues: 'Sound Cues', atmospheres: 'Atmospheres' }[slot]}.`);
        if (!entitlements.some(item => mediaPackKey(item.pack) === mediaPackKey(reference) && isMediaPackEntitlementActive(item, at))) throw new Error('Unlock this Media Pack before equipping it.');
      }
    },
    freeze(selection, capturedAt) {
      // Expired or not-yet-unlocked resources are excluded again at every attempt.
      const snapshot = freezeMediaLoadout({ loadout: selection, entitlements, registered, capturedAt });
      const catalog = createAuthorizedMediaCatalog(snapshot, base);
      return {
        capturedAt,
        soundscapes: catalog.soundscapes,
        soundCues: catalog.soundCues.cues.map(cue => ({
          cue,
          provenance: catalog.soundCueProvenanceByUrl.get(cue.public_url)!,
        })),
        sounds: catalog.sounds,
        ...(catalog.atmospheres.length ? { atmospheres: catalog.atmospheres } : {}),
      };
    },
  };
}
