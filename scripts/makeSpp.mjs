/**
 * Makes a `.spp` (SEIHouse Productions Package) from a folder, the way a zip
 * is made from one: `npm run spp -- "path/to/My Pack"`, or right-click the
 * folder › Send to › SEIHouse Package (`scripts/Make SPP.cmd`).
 *
 * The folder holds the files and an optional `spp.json` describing the
 * package. Every file except `spp.json` (and `words.txt` in a Sound Words
 * package) goes into the package under `assets/`, keeping its folders.
 *
 *   spp.json   { "name", "description", "version", "publisher", "kind", "slot", "categories", "id" }
 *              kind: "sound-words" (a story's Sound Words), "capa" (a CAPA
 *              skill; "slot" names it: author, pacing, continuity, style, …),
 *              "sound-cues" or "soundscapes" (audio), or absent for plain files.
 *              "made" lists every version built; the build keeps it.
 *   words.txt  A Sound Words package's words, one per line (# starts a note).
 *
 * Audio packages hold one folder per sound word ("sound-cues": `growl/`,
 * `temple bell/`) or per mood ("soundscapes": `mystical/`, `battle/`), each
 * with its recordings. A Sound Cue pack may give a word's category in
 * `"categories": { "growl": "beasts" }` (atmosphere otherwise). Audio
 * packages may be as large as the SPP safety ceiling: 1 GB, 512 MB a file.
 *
 * A folder with only `words.txt` is a Sound Words package named after the
 * folder. The first build writes the package's new id into `spp.json`; keep
 * it, so every later version is the same package. A build whose version was
 * already made raises the patch version (1.0.0 → 1.0.1) first, because a
 * version, once installed, never changes. The package is written beside the
 * folder as `<name> v<version>.spp`.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPack, MAX_LIMITS } from 'seihouse-productions-package';

export const SPP_CONFIG_FILE = 'spp.json';
export const SOUND_WORDS_FILE = 'words.txt';
export const SOUND_WORDS_ASSET = 'assets/sound-words.json';
const SOUND_WORDS_LIMIT = 30;
const SOUND_WORD = /^[a-z]+(?: [a-z]+){0,2}$/;
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
const DEFAULT_PUBLISHER = 'SEIHouse Productions LLC';
export const MEDIA_CATALOG_ASSET = 'assets/media-pack.json';
const AUDIO_FILE = /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav)$/i;
const CUE_CATEGORIES = ['artifacts', 'atmosphere', 'beasts', 'factions', 'locations', 'system', 'weapons'];
const MEDIA_KINDS = { 'sound-cues': 'sound-cue', soundscapes: 'soundscape' };
const AUDIO_TYPES = { aac: 'audio/aac', flac: 'audio/flac', m4a: 'audio/mp4', mp3: 'audio/mpeg', oga: 'audio/ogg', ogg: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav' };

/** The words of a `words.txt`, spelled as SEN spells them, or every problem with its line. */
export function readSoundWords(text) {
  const words = [];
  const problems = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const raw = line.replace(/#.*/, '').trim();
    if (!raw) return;
    const word = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    if (word.length > 24 || !SOUND_WORD.test(word)) {
      problems.push(`line ${index + 1}: "${raw}" must be one to three plain English words, at most 24 letters`);
    } else if (words.includes(word)) {
      problems.push(`line ${index + 1}: "${word}" is listed twice`);
    } else {
      words.push(word);
    }
  });
  if (words.length > SOUND_WORDS_LIMIT) problems.push(`${words.length} words: a Sound Words list holds at most ${SOUND_WORDS_LIMIT}`);
  return { words, problems };
}

const listFiles = (folder, inside = folder) => readdirSync(inside).flatMap(name => {
  if (name.startsWith('.') || name === 'Thumbs.db' || name === 'desktop.ini') return [];
  const path = join(inside, name);
  return statSync(path).isDirectory() ? listFiles(folder, path) : [relative(folder, path).split(sep).join('/')];
});

/**
 * An audio folder's recordings: one folder per sound word or mood, each with
 * its audio files. Returns the files to package and the catalog that names
 * each by its path.
 */
function readMediaFolder(folder, kind, categories = {}) {
  const files = [];
  const entries = [];
  const problems = [];
  for (const name of readdirSync(folder).sort()) {
    const path = join(folder, name);
    if (name.startsWith('.') || name === SPP_CONFIG_FILE || name === 'Thumbs.db' || name === 'desktop.ini') continue;
    if (!statSync(path).isDirectory()) { problems.push(`${name}: put each recording in the folder of its ${kind === 'sound-cues' ? 'sound word' : 'mood'}`); continue; }
    const word = name.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (word.length > 24 || !SOUND_WORD.test(word)) { problems.push(`${name}/: a folder name must be one to three plain English words`); continue; }
    const category = kind === 'sound-cues' ? categories[word] ?? categories[name] : undefined;
    if (category !== undefined && !CUE_CATEGORIES.includes(category)) problems.push(`"categories" › ${word}: must be one of ${CUE_CATEGORIES.join(', ')}`);
    const recordings = listFiles(path);
    if (!recordings.length) problems.push(`${name}/ has no recordings`);
    for (const file of recordings) {
      if (!AUDIO_FILE.test(file)) { problems.push(`${name}/${file}: not an audio file (.mp3, .wav, .ogg, .m4a, .aac, .flac, .opus)`); continue; }
      const asset = `assets/${name}/${file}`;
      files.push({ path: asset, mediaType: AUDIO_TYPES[file.split('.').pop().toLowerCase()], data: new Uint8Array(readFileSync(join(path, file))) });
      entries.push(kind === 'sound-cues'
        ? { path: asset, sound: word, ...(category ? { category } : {}) }
        : { path: asset, mood: word });
    }
  }
  if (problems.length) throw new Error(`The audio folder has problems:\n  ${problems.join('\n  ')}`);
  if (!entries.length) throw new Error(`Add a folder for each ${kind === 'sound-cues' ? 'sound word' : 'mood'} with its recordings.`);
  return { files, catalog: kind === 'sound-cues' ? { recordings: entries } : { pieces: entries } };
}

const nextPatch = version => {
  const [, major, minor, patch] = VERSION.exec(version);
  return `${major}.${minor}.${Number(patch) + 1}`;
};

/** Builds the folder's package and returns where it was written, with what changed in `spp.json`. */
export async function makeSpp(folderPath, { now = new Date() } = {}) {
  const folder = resolve(folderPath);
  if (!existsSync(folder) || !statSync(folder).isDirectory()) throw new Error(`${folderPath} is not a folder.`);
  const configPath = join(folder, SPP_CONFIG_FILE);
  const hasWords = existsSync(join(folder, SOUND_WORDS_FILE));
  let config = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf8')); } catch { throw new Error(`${SPP_CONFIG_FILE} is not readable JSON.`); }
  }
  const kind = config.kind ?? (hasWords ? 'sound-words' : undefined);
  if (kind !== undefined && !['sound-words', 'capa', ...Object.keys(MEDIA_KINDS)].includes(kind)) {
    throw new Error(`"kind" must be "sound-words", "capa", "sound-cues" or "soundscapes", not "${kind}".`);
  }
  if (kind === 'capa' && (typeof config.slot !== 'string' || !config.slot)) throw new Error('A CAPA package needs a "slot" in spp.json (author, pacing, continuity, style, …).');
  const name = typeof config.name === 'string' && config.name.trim() ? config.name.trim() : basename(folder);
  let version = config.version ?? '1.0.0';
  if (typeof version !== 'string' || !VERSION.test(version)) throw new Error(`"version" must look like 1.0.0, not "${version}".`);

  const files = [];
  const extensions = {};
  if (kind === 'sound-words') {
    if (!hasWords) throw new Error(`A Sound Words package needs ${SOUND_WORDS_FILE}: its words, one per line.`);
    const { words, problems } = readSoundWords(readFileSync(join(folder, SOUND_WORDS_FILE), 'utf8'));
    if (problems.length) throw new Error(`${SOUND_WORDS_FILE} has problems:\n  ${problems.join('\n  ')}`);
    files.push({ path: SOUND_WORDS_ASSET, mediaType: 'application/json', data: new TextEncoder().encode(`${JSON.stringify(words, null, 2)}\n`) });
    extensions['seihouse.sound-words'] = { vocabulary: SOUND_WORDS_ASSET };
  }
  if (kind === 'capa') extensions['seihouse.capa'] = { slot: config.slot };
  if (MEDIA_KINDS[kind]) {
    const media = readMediaFolder(folder, kind, config.categories);
    files.push(...media.files, { path: MEDIA_CATALOG_ASSET, mediaType: 'application/json', data: new TextEncoder().encode(`${JSON.stringify(media.catalog, null, 2)}\n`) });
    extensions['seihouse.media-pack'] = { type: MEDIA_KINDS[kind], catalog: MEDIA_CATALOG_ASSET };
  }
  const skipped = new Set([SPP_CONFIG_FILE, ...(kind === 'sound-words' ? [SOUND_WORDS_FILE] : [])]);
  for (const path of MEDIA_KINDS[kind] ? [] : listFiles(folder)) {
    if (skipped.has(path)) continue;
    files.push({ path: `assets/${path}`, data: new Uint8Array(readFileSync(join(folder, path))) });
  }
  if (!files.length) throw new Error('The folder has no files to package.');

  // One identity for every version; a version already made is never made again with other content.
  const id = typeof config.id === 'string' && config.id ? config.id : randomUUID();
  const output = v => join(dirname(folder), `${name} v${v}.spp`);
  const previous = version;
  // `spp.json` remembers every version made, so moving or deleting a package never frees its version.
  const made = Array.isArray(config.made) ? config.made.filter(v => typeof v === 'string') : [];
  while (made.includes(version) || existsSync(output(version))) version = nextPatch(version);
  const bytes = await createPack({
    id, name, version,
    description: typeof config.description === 'string' ? config.description : '',
    publisher: typeof config.publisher === 'string' && config.publisher.trim() ? config.publisher.trim() : DEFAULT_PUBLISHER,
    createdAt: now.toISOString(),
    files,
    ...(Object.keys(extensions).length ? { extensions } : {}),
  }, MEDIA_KINDS[kind] ? MAX_LIMITS : undefined);
  writeFileSync(output(version), bytes);
  const saved = { ...config, name, version, id, ...(kind ? { kind } : {}), made: [...made, version] };
  writeFileSync(configPath, `${JSON.stringify(saved, null, 2)}\n`);
  return { path: output(version), version, previousVersion: previous, newId: !config.id, files: files.length };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const folders = process.argv.slice(2);
  if (!folders.length) {
    console.error('Give a folder: npm run spp -- "path/to/My Pack"');
    process.exitCode = 1;
  }
  for (const folder of folders) {
    try {
      const made = await makeSpp(folder);
      console.log(`Made ${made.path}`);
      if (made.version !== made.previousVersion) console.log(`  v${made.previousVersion} was already made, so this is v${made.version}.`);
      if (made.newId) console.log('  A new package id was saved in spp.json: keep it, so later versions are the same package.');
    } catch (error) {
      console.error(`Could not make a package from ${folder}:\n  ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    }
  }
}
