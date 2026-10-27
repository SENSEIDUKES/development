import { fingerprint, intakePack, MAX_LIMITS, type PackContent, type PackInput } from 'seihouse-productions-package';
import { AUDIO_CUE_CATEGORIES, normalizeSoundWord, isSoundWord, isPlayableMediaUrl, packageMediaUrl, readAudioTags, readPackageMediaUrl, type AudioCue, type SoundWord } from '@seihouse/sen/audio';
import type { ReaderMixer } from '@seihouse/audio-player';
import { mediaPackKey, validateMediaPack, type MediaPack, type MediaPackEntitlement } from '@seihouse/library/media';
import { SPP_CAPA_EXTENSION, SPP_SOUND_WORDS_EXTENSION } from '../generation/capa/sppSkills';

/**
 * Namespaced manifest extension a media package uses to say what it is and
 * which file lists its recordings:
 * `{ "type": "sound-cue" | "soundscape" | "atmosphere", "catalog": "assets/media-pack.json" }`.
 */
export const SPP_MEDIA_PACK_EXTENSION = 'seihouse.media-pack';

/**
 * A media package's catalog. Every recording is named by its path in the
 * package; nothing is read from a file name.
 * - Sound Cues: `{ "recordings": [{ "path", "sound", "category"? }] }`; a
 *   recording's Energy, Tone and Tension, when it has them, are the package
 *   file's own tags.
 * - Soundscapes: `{ "pieces": [{ "path" | "url", "mood", "label"? }] }`;
 *   a URL is a permanent public HTTPS recording instead of embedded audio.
 * - Atmospheres: `{ "beds": [{ "path", "word", "label"?, "group"? }] }`: looping
 *   beds, each chosen by its word ("forest"); beds that share a word take turns.
 */
interface SoundCueCatalog { recordings: Array<{ path: string; sound: string; category?: string }> }
interface SoundscapeCatalog { pieces: Array<{ path?: string; url?: string; mood: string; label?: string }> }
interface AtmosphereCatalog { beds: Array<{ path: string; word: string; label?: string; group?: string }> }

/** Packs of audio are large: the SPP safety ceiling (1 GiB, 512 MiB a file). */
export const MEDIA_PACK_LIMITS = MAX_LIMITS;
const CATALOG_BYTE_LIMIT = 4 * 1024 * 1024;
const AUDIO_TYPE = /^audio\//;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const fail = (message: string): never => { throw new Error(message); };

/** A media pack read from a package: the pack, and each recording's bytes by its package address. */
export interface PackagedMediaPack {
  pack: MediaPack;
  files: Map<string, Blob>;
}

/** Checks a `.spp` within the media limits; the SPP checks come first. */
export async function inspectMediaSpp(input: PackInput): Promise<PackContent> {
  const result = await intakePack(input, MEDIA_PACK_LIMITS);
  if (!result.content) fail(result.validation.issues.map(issue => `${issue.path ? `${issue.path}: ` : ''}${issue.message}`).join('\n'));
  return result.content!;
}

/**
 * Reads a validated package as a Media Pack: a Sound Cue pack (recordings
 * that answer sound words) or a Soundscape pack (pieces of music by mood).
 * Every recording is a file the package carries; its address is the
 * package's (`spp://…`), which the host plays from the device. A package that
 * is also a skill or a Sound Words list is refused.
 */
export function readMediaSpp(content: PackContent): PackagedMediaPack {
  const { manifest } = content;
  const name = manifest.name.trim();
  const declared = manifest.extensions?.[SPP_MEDIA_PACK_EXTENSION];
  if (declared === undefined) fail(`${name} is not a Soundscape, Sound Cue or Atmosphere package.`);
  if (manifest.extensions?.[SPP_CAPA_EXTENSION] !== undefined || manifest.extensions?.[SPP_SOUND_WORDS_EXTENSION] !== undefined) {
    fail(`${name} is a media package and something else too; a media package carries recordings only.`);
  }
  if (!isRecord(declared) || !['sound-cue', 'soundscape', 'atmosphere'].includes(declared.type as string) || typeof declared.catalog !== 'string') {
    fail('This media package does not say what it is (sound-cue, soundscape or atmosphere) and which file lists its recordings.');
  }
  const { type, catalog: catalogPath } = declared as { type: 'sound-cue' | 'soundscape' | 'atmosphere'; catalog: string };
  const catalogRecord = manifest.files.find(file => file.path === catalogPath);
  const catalogBytes = content.assets.get(catalogPath);
  if (!catalogRecord || !catalogBytes || catalogRecord.mediaType !== 'application/json') fail('This media package names a recording list it does not contain.');
  if (catalogBytes!.length > CATALOG_BYTE_LIMIT) fail('This media package\'s recording list is too large.');
  let catalog: unknown;
  try { catalog = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(catalogBytes)); } catch { fail('This media package\'s recording list is not readable JSON.'); }

  const files = new Map<string, Blob>();
  const audio = (path: unknown, label: string) => {
    if (typeof path !== 'string') return fail(`${label} needs the path of its file.`);
    const record = manifest.files.find(file => file.path === path);
    const bytes = content.assets.get(path);
    if (!record || !bytes) return fail(`${label} names ${path}, which the package does not contain.`);
    if (!AUDIO_TYPE.test(record.mediaType)) return fail(`${path} is not an audio file.`);
    const url = packageMediaUrl(manifest.id, manifest.version, path);
    if (!readPackageMediaUrl(url)) return fail(`${path} cannot be played: use a plain file name ending .mp3, .wav, .ogg, .m4a, .aac, .flac or .opus.`);
    if (files.has(url)) return fail(`${path} is listed twice.`);
    files.set(url, new Blob([bytes as BlobPart], { type: record.mediaType }));
    return { url, record };
  };

  const base = {
    id: `spp.${manifest.id}`,
    version: manifest.version,
    displayName: name,
    description: manifest.description.trim() || `${name}, installed from a package.`,
    source: { path: catalogPath, digest: catalogRecord!.sha256 },
  };
  let pack: unknown;
  if (type === 'sound-cue') {
    const recordings = isRecord(catalog) && Array.isArray(catalog.recordings) ? (catalog as unknown as SoundCueCatalog).recordings : fail('A Sound Cue package lists its recordings.');
    if (!recordings.length) fail('A Sound Cue package needs at least one recording.');
    const sounds: SoundWord[] = [];
    const entries: AudioCue[] = recordings.map((entry, index) => {
      const label = `Recording ${index + 1}`;
      if (!isRecord(entry)) return fail(`${label} must be an object.`);
      const sound = typeof entry.sound === 'string' ? normalizeSoundWord(entry.sound) : '';
      if (!isSoundWord(sound)) return fail(`${label} needs a sound word: one to three plain lowercase words.`);
      const category = entry.category ?? 'atmosphere';
      if (typeof category !== 'string' || !(AUDIO_CUE_CATEGORIES as readonly string[]).includes(category)) {
        return fail(`${label}'s category must be one of ${AUDIO_CUE_CATEGORIES.join(', ')}.`);
      }
      const { url, record } = audio(entry.path, label);
      if (!sounds.some(word => word.word === sound)) sounds.push({ word: sound });
      const tags = record.tags ? readAudioTags({ ...(record.tags.tone ? { tone: record.tags.tone } : {}), ...(record.tags.energy ? { energy: record.tags.energy } : {}), ...(record.tags.tension ? { tension: record.tags.tension } : {}) }) : undefined;
      return {
        file_path: `${base.id}/${record.path}`,
        public_url: url,
        category: category as AudioCue['category'],
        metadata: {
          main_category: category, broad_variation: sound, soft_tags: [...(record.tags?.descriptive ?? [])],
          description: `${sound}, from ${name}`, confidence_score: 1, sound,
          ...(tags?.ok && Object.keys(tags.tags).length ? { studio_tags: tags.tags } : {}),
        },
      };
    });
    pack = { ...base, type: 'sound-cue', sounds, entries };
  } else if (type === 'atmosphere') {
    const beds = isRecord(catalog) && Array.isArray(catalog.beds) ? (catalog as unknown as AtmosphereCatalog).beds : fail('An Atmosphere package lists its beds.');
    if (!beds.length) fail('An Atmosphere package needs at least one bed.');
    pack = {
      ...base, type: 'atmosphere',
      entries: beds.map((entry, index) => {
        const label = `Bed ${index + 1}`;
        if (!isRecord(entry)) return fail(`${label} must be an object.`);
        const word = typeof entry.word === 'string' ? entry.word.trim().toLowerCase() : '';
        if (!/^[a-z]+(?: [a-z]+){0,2}$/.test(word)) return fail(`${label} needs a word: one to three plain lowercase words.`);
        const { url, record } = audio(entry.path, label);
        const title = typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : record.path.split('/').pop()!.replace(/\.[^.]+$/, '');
        const group = typeof entry.group === 'string' && entry.group.trim() ? entry.group.trim() : word.replace(/\b\w/g, letter => letter.toUpperCase());
        return { id: `${base.id}:${record.path}`, word, label: title, group, url };
      }),
    };
  } else {
    const pieces = isRecord(catalog) && Array.isArray(catalog.pieces) ? (catalog as unknown as SoundscapeCatalog).pieces : fail('A Soundscape package lists its pieces.');
    if (!pieces.length) fail('A Soundscape package needs at least one piece.');
    pack = {
      ...base, type: 'soundscape',
      entries: pieces.map((entry, index) => {
        const label = `Piece ${index + 1}`;
        if (!isRecord(entry)) return fail(`${label} must be an object.`);
        const mood = typeof entry.mood === 'string' ? entry.mood.trim().toLowerCase() : '';
        if (!/^[a-z]+(?: [a-z]+){0,2}$/.test(mood)) return fail(`${label} needs a mood: one to three plain lowercase words.`);
        if (entry.url !== undefined) {
          if (entry.path !== undefined || typeof entry.url !== 'string' || !entry.url.startsWith('https://') || !isPlayableMediaUrl(entry.url)) {
            return fail(`${label} needs either a packaged audio path or a public HTTPS audio URL.`);
          }
          const title = typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : `Song ${index + 1}`;
          return { id: `${base.id}:${index + 1}`, label: title, mood, moods: [mood], tags: [], url: entry.url };
        }
        const { url, record } = audio(entry.path, label);
        const title = typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : record.path.split('/').pop()!.replace(/\.[^.]+$/, '');
        return { id: `${base.id}:${record.path}`, label: title, mood, moods: [mood], tags: [], url };
      }),
    };
  }
  return { pack: validateMediaPack(pack), files };
}

/** Checks and reads a `.spp` file as a Media Pack. */
export async function inspectMediaPackSpp(input: PackInput): Promise<PackagedMediaPack> {
  return readMediaSpp(await inspectMediaSpp(input));
}

/**
 * Menus accept a Soundscape pack or a Studio audio collection such as the
 * theme songs. All songs play, regardless of their narrative mood tags.
 */
export async function inspectMenuMusicSpp(input: PackInput): Promise<PackagedMediaPack> {
  const content = await inspectMediaSpp(input);
  const { manifest } = content;
  if (manifest.extensions?.[SPP_MEDIA_PACK_EXTENSION] !== undefined) {
    const packaged = readMediaSpp(content);
    if (packaged.pack.type !== 'soundscape') fail('Menu music needs a music package, not Sound Cues or Atmospheres.');
    return packaged;
  }
  if (manifest.extensions?.[SPP_CAPA_EXTENSION] !== undefined || manifest.extensions?.[SPP_SOUND_WORDS_EXTENSION] !== undefined) {
    fail('Menu music needs a music package, not a writing skill or Sound Words list.');
  }
  const recordings = manifest.files.filter(file => AUDIO_TYPE.test(file.mediaType));
  if (!recordings.length) fail('This package contains no audio for menu music.');
  const files = new Map<string, Blob>();
  const id = `spp.${manifest.id}`;
  const entries = recordings.map(record => {
    const studio = record.metadata?.['seihouse.senAudio'];
    if (isRecord(studio) && studio.kind !== undefined && studio.kind !== 'soundscape') {
      fail('Menu music needs songs only, not Sound Cues or Atmospheres.');
    }
    const url = packageMediaUrl(manifest.id, manifest.version, record.path);
    if (!readPackageMediaUrl(url)) fail(`${record.path} is not a supported audio file.`);
    files.set(url, new Blob([content.assets.get(record.path)! as BlobPart], { type: record.mediaType }));
    return {
      id: `${id}:${record.path}`, url,
      label: record.path.split('/').pop()!.replace(/\.[^.]+$/, ''),
      mood: 'menu', moods: ['menu'], tags: [],
    };
  });
  const pack = validateMediaPack({
    id, version: manifest.version, type: 'soundscape', displayName: manifest.name,
    description: manifest.description.trim() || `${manifest.name}, installed from a package.`,
    source: { path: 'manifest.json', digest: await fingerprint(new TextEncoder().encode(JSON.stringify(manifest))) },
    entries,
  });
  return { pack, files };
}

/** The media packs a host keeps on this device, with their recordings. */
export interface DeviceMediaPackStore {
  loadAll(): Promise<Array<PackagedMediaPack & { installedAt: string; usage?: 'menu-music' }>>;
  save(packaged: PackagedMediaPack, installedAt: string, usage?: 'menu-music'): Promise<void>;
}

const DATABASE_VERSION = 1;
const STORE_NAME = 'media-packs';
interface StoredMediaPack { pack: MediaPack; files: Record<string, Blob>; installedAt: string; usage?: 'menu-music' }

const requestResult = <T,>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('The installed packs could not be read.'));
});
const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error ?? new Error('The pack could not be kept on this device.'));
  transaction.onabort = () => reject(transaction.error ?? new Error('Keeping the pack was stopped. The device may be out of space.'));
});

/** Media packs kept on this device in their own IndexedDB database, recordings and all. */
export class IndexedDbDeviceMediaPackStore implements DeviceMediaPackStore {
  private databasePromise?: Promise<IDBDatabase>;

  constructor(private readonly databaseName: string) {}

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Keeping packs requires IndexedDB, which is unavailable in this browser.'));
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('The installed packs could not be opened.'));
      request.onblocked = () => reject(new Error('The installed packs are blocked by another open tab. Close that tab and retry.'));
    });
    this.databasePromise.catch(() => { this.databasePromise = undefined; });
    return this.databasePromise;
  }

  async loadAll() {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const values = await requestResult(transaction.objectStore(STORE_NAME).getAll()) as StoredMediaPack[];
    await transactionDone(transaction);
    return values.flatMap(value => {
      // A damaged record is left out; the rest stay.
      try {
        return [{ pack: validateMediaPack(value.pack), files: new Map(Object.entries(value.files)), installedAt: value.installedAt, usage: value.usage }];
      } catch { return []; }
    });
  }

  async save(packaged: PackagedMediaPack, installedAt: string, usage?: 'menu-music') {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const record: StoredMediaPack = { pack: packaged.pack, files: Object.fromEntries(packaged.files), installedAt, usage };
    transaction.objectStore(STORE_NAME).put(record, mediaPackKey(packaged.pack));
    await transactionDone(transaction);
  }
}

/** Packs held for the visit only: tests, and a browser without IndexedDB. */
export function createMemoryDeviceMediaPackStore(): DeviceMediaPackStore {
  const packs = new Map<string, PackagedMediaPack & { installedAt: string; usage?: 'menu-music' }>();
  return {
    loadAll: async () => [...packs.values()],
    save: async (packaged, installedAt, usage) => { packs.set(mediaPackKey(packaged.pack), { ...packaged, installedAt, usage }); },
  };
}

/**
 * Where this device plays the recordings of installed packages: each
 * package address (`spp://…`) and the address of its bytes in this page.
 * Saved chapters keep the package address; it plays wherever the package is
 * installed.
 */
export class DeviceMediaUrls {
  private readonly urls = new Map<string, string>();

  register(files: ReadonlyMap<string, Blob>): void {
    for (const [address, blob] of files) {
      if (!this.urls.has(address) && typeof URL.createObjectURL === 'function') this.urls.set(address, URL.createObjectURL(blob));
    }
  }

  /** The address to play: a package's file on this device, or the address as given. */
  resolve(url: string): string {
    return this.urls.get(url) ?? url;
  }
}

/**
 * Lets a reader mixer play recordings from installed packages: the places a
 * mixer receives an address (a Sound Cue, cues to load ahead, a piece of
 * music, the atmospheres it may play) are given the device's address for a
 * package file.
 */
export function playDeviceMediaThrough(mixer: ReaderMixer, urls: DeviceMediaUrls): ReaderMixer {
  const playCue = mixer.playCue.bind(mixer);
  const preloadCues = mixer.preloadCues.bind(mixer);
  const playSoundscape = mixer.playSoundscape.bind(mixer);
  const setAtmosphereOptions = mixer.setAtmosphereOptions?.bind(mixer);
  mixer.playCue = (url, options) => playCue(urls.resolve(url), options);
  mixer.preloadCues = addresses => preloadCues(addresses.map(url => urls.resolve(url)));
  mixer.playSoundscape = (track, options) => playSoundscape({
    ...track,
    ...(track.audioFile ? { audioFile: urls.resolve(track.audioFile) } : {}),
    ...(track.fallbackSources ? { fallbackSources: track.fallbackSources.map(url => urls.resolve(url)) } : {}),
    ...(track.sources ? { sources: track.sources.map(source => ({ ...source, url: urls.resolve(source.url) })) } : {}),
  }, options);
  if (setAtmosphereOptions) mixer.setAtmosphereOptions = atmospheres => setAtmosphereOptions(atmospheres.map(option => ({
    ...option,
    ...(option.sources ? { sources: option.sources.map(source => ({ ...source, url: urls.resolve(source.url) })) } : {}),
  })));
  return mixer;
}

/** A pack installed on this device is the reader's own: always unlocked. */
export const deviceMediaPackEntitlement = (pack: MediaPack, installedAt: string): MediaPackEntitlement => ({
  pack: { id: pack.id, version: pack.version },
  unlockedAt: installedAt,
});
