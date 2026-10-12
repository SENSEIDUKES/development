import type { PackContent, PackInput } from 'seihouse-productions-package';
import { validateSoundWordList, type SoundWordsPreset } from '@seihouse/sen/audio';
import { inspectHarnessSpp, SPP_CAPA_EXTENSION, SPP_SOUND_WORDS_EXTENSION } from '../generation/capa/sppSkills';
import { LIBRARY_SOUND_WORDS } from './libraryCatalog';

/** The largest word list file a Sound Words package may carry. */
export const SOUND_WORDS_FILE_BYTE_LIMIT = 16 * 1024;
/** How many installed Sound Words presets a device keeps. */
export const SOUND_WORDS_INVENTORY_LIMIT = 64;

/**
 * The Library's own sound words: the words its recordings answer. A new story
 * starts from them unless the reader chooses another preset.
 */
export const LIBRARY_SOUND_WORDS_PRESET: SoundWordsPreset = {
  id: 'seihouse.library-sound-words',
  version: '1.0.0',
  name: 'The Library\'s sound words',
  description: 'The sounds the Library\'s own recordings play.',
  words: LIBRARY_SOUND_WORDS.map(sound => sound.word),
};

const presetKey = (preset: Pick<SoundWordsPreset, 'id' | 'version'>) => `${preset.id}@${preset.version}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Reads a validated `.spp` as a Sound Words preset. The package says which of
 * its files holds the words, in its `seihouse.sound-words` manifest
 * extension; no file name is special and nothing is guessed. The file is a
 * JSON list of at most 30 words. A package that is also a CAPA skill, or
 * names anything but a JSON list of words, is refused.
 */
export function readSoundWordsSpp(content: PackContent): SoundWordsPreset {
  const { manifest } = content;
  const declared = manifest.extensions?.[SPP_SOUND_WORDS_EXTENSION];
  if (declared === undefined) throw new Error(`${manifest.name.trim()} is not a Sound Words package.`);
  if (manifest.extensions?.[SPP_CAPA_EXTENSION] !== undefined) {
    throw new Error(`${manifest.name.trim()} declares a CAPA skill as well as sound words; a Sound Words package carries words only.`);
  }
  if (!isRecord(declared) || typeof declared.vocabulary !== 'string' || !declared.vocabulary) {
    throw new Error('This Sound Words package does not name the file of its words.');
  }
  const path = declared.vocabulary;
  const record = manifest.files.find(file => file.path === path);
  const bytes = content.assets.get(path);
  if (!record || !bytes) throw new Error('This Sound Words package names a word list it does not contain.');
  if (record.mediaType !== 'application/json') throw new Error('A Sound Words list must be a JSON file.');
  if (bytes.length > SOUND_WORDS_FILE_BYTE_LIMIT) throw new Error('This Sound Words list is too large.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('This Sound Words list is not readable JSON.');
  }
  return {
    id: `spp:${manifest.id}`,
    version: manifest.version,
    name: manifest.name.trim(),
    ...(manifest.description.trim() ? { description: manifest.description.trim() } : {}),
    words: validateSoundWordList(parsed),
    source: { packageId: manifest.id, packageVersion: manifest.version, path, sha256: record.sha256 },
  };
}

/** Checks and reads a `.spp` file as a Sound Words preset. */
export async function inspectSoundWordsSpp(input: PackInput): Promise<SoundWordsPreset> {
  return readSoundWordsSpp(await inspectHarnessSpp(input));
}

const readPreset = (value: unknown): SoundWordsPreset => {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.startsWith('spp:') || typeof value.version !== 'string'
    || typeof value.name !== 'string' || !value.name || !isRecord(value.source)) throw new Error('A saved Sound Words preset is invalid.');
  const source = value.source;
  if (typeof source.packageId !== 'string' || typeof source.packageVersion !== 'string'
    || typeof source.path !== 'string' || typeof source.sha256 !== 'string') throw new Error('A saved Sound Words preset is invalid.');
  return {
    id: value.id,
    version: value.version,
    name: value.name,
    ...(typeof value.description === 'string' && value.description ? { description: value.description } : {}),
    words: validateSoundWordList(value.words),
    source: { packageId: source.packageId, packageVersion: source.packageVersion, path: source.path, sha256: source.sha256 },
  };
};

/** The Sound Words presets installed on this device, under the host's own key. A damaged inventory reads as none. */
export function loadSoundWordsPresets(storage: Pick<Storage, 'getItem'>, key: string): SoundWordsPreset[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? '[]');
    if (!Array.isArray(value) || value.length > SOUND_WORDS_INVENTORY_LIMIT) return [];
    return value.map(readPreset);
  } catch {
    return [];
  }
}

/**
 * Installs a preset. A package version is installed once: the same version
 * with different words is refused, so a story's chosen preset never changes
 * under it. Installing the same version again changes nothing.
 */
export function saveSoundWordsPreset(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  installed: readonly SoundWordsPreset[],
  preset: SoundWordsPreset,
): SoundWordsPreset[] {
  const previous = installed.find(item => presetKey(item) === presetKey(preset));
  if (previous && JSON.stringify(previous) !== JSON.stringify(preset)) {
    throw new Error('This package version is already installed with different words. Import a new package version.');
  }
  if (previous) return [...installed];
  const next = [...installed, preset];
  if (next.length > SOUND_WORDS_INVENTORY_LIMIT) throw new Error(`This device keeps at most ${SOUND_WORDS_INVENTORY_LIMIT} Sound Words presets.`);
  storage.setItem(key, JSON.stringify(next));
  return next;
}
