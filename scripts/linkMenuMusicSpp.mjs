import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPack, intakePack, MAX_LIMITS } from 'seihouse-productions-package';

const encode = value => new TextEncoder().encode(JSON.stringify(value, null, 2));

/** Replace embedded songs with permanent hosted links, keeping the source inventory as provenance. */
export async function linkMenuMusicSpp(source, links, version) {
  const inspected = await intakePack(source, MAX_LIMITS);
  if (!inspected.content) throw new Error(inspected.validation.issues.map(issue => issue.message).join('\n'));
  const { manifest } = inspected.content;
  if (!version || version === manifest.version) throw new Error('Choose a new package version for the linked recordings.');
  const audio = manifest.files.filter(file => file.mediaType.startsWith('audio/'));
  if (!audio.length) throw new Error('The source SPP has no audio.');
  const pieces = audio.map(file => {
    const link = links[file.path];
    let url;
    try { url = new URL(link); } catch { throw new Error(`Missing or invalid public URL for ${file.path}.`); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`Use a public HTTPS URL for ${file.path}.`);
    const studio = file.metadata?.['seihouse.senAudio'];
    if (studio?.kind && studio.kind !== 'soundscape') throw new Error(`${file.path} is not music.`);
    return {
      label: file.path.split('/').pop().replace(/\.[^.]+$/, ''), mood: 'menu', url: url.href,
      sourcePath: file.path, sourceSha256: file.sha256,
    };
  });
  const catalogPath = 'assets/menu-music.json';
  const bytes = await createPack({
    id: manifest.id, version, name: 'NovelExpanded Theme Songs',
    description: 'The NovelExpanded theme songs, played from their permanent media URLs.',
    publisher: manifest.publisher,
    extensions: { 'seihouse.media-pack': { type: 'soundscape', catalog: catalogPath } },
    files: [
      { path: catalogPath, mediaType: 'application/json', data: encode({ pieces }) },
      { path: 'assets/source/manifest.json', mediaType: 'application/json', data: encode(manifest) },
      ...manifest.files.filter(file => !file.mediaType.startsWith('audio/')).map(file => ({
        path: `assets/source/${file.path.slice('assets/'.length)}`, mediaType: file.mediaType,
        data: inspected.content.assets.get(file.path),
      })),
    ],
  }, MAX_LIMITS);
  return { bytes, pieces };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [sourcePath, linksPath, destination, version] = process.argv.slice(2);
  if (!sourcePath || !linksPath || !destination || !version) {
    throw new Error('Usage: node scripts/linkMenuMusicSpp.mjs source.spp links.json linked.spp NEW_VERSION');
  }
  if (resolve(sourcePath) === resolve(destination)) throw new Error('Keep the original SPP: choose a different output path.');
  const { bytes, pieces } = await linkMenuMusicSpp(await readFile(sourcePath), JSON.parse(await readFile(linksPath, 'utf8')), version);
  await writeFile(destination, bytes);
  console.log(`Saved ${pieces.length} linked songs to ${destination} (${bytes.length} bytes). Original SPP retained.`);
}
