import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingerprint, intakePack } from 'seihouse-productions-package';
import { validateSceneAudioCatalog } from '@seihouse/sen/audio';
import { MENU_MUSIC_LABEL, MENU_MUSIC_PIECES } from './menuMusicCatalog';
import catalog from './data/menu-music-v1.json';
import { inspectMenuMusicSpp } from './deviceMediaPacks';

describe('NovelExpanded theme songs', () => {
  it('offers all 13 permanent theme URLs as the menu catalog', () => {
    expect(MENU_MUSIC_LABEL).toBe('NovelExpanded Theme Songs');
    expect(MENU_MUSIC_PIECES).toHaveLength(13);
    expect(validateSceneAudioCatalog([...MENU_MUSIC_PIECES])).toEqual(MENU_MUSIC_PIECES);
    expect(new Set(MENU_MUSIC_PIECES.map(piece => piece.url)).size).toBe(13);
    expect(MENU_MUSIC_PIECES.every(piece => piece.mood === 'menu')).toBe(true);
    expect(MENU_MUSIC_PIECES.map(piece => decodeURIComponent(piece.url).split('/').pop()).sort()).toEqual([
      'Arabic', 'Chinese', 'English', 'Hebrew', 'Indonesian', 'Japanese', 'Korean', 'Persian', 'Spanish', 'Tagalog', 'Thai', 'Urdu', 'malay',
    ].map(language => `Theme-${language}.mp3`).sort());
    for (const piece of MENU_MUSIC_PIECES) expect(piece.url).toMatch(/^https:\/\/media\.seihouse\.org\/SEN\/AUDIO\/SOUNDSCAPE\/Theme%20Songs\//);
  });

  it('matches the downloadable SPP and preserves original track order, metadata and hashes without embedding audio', async () => {
    const bytes = readFileSync('templates/spp/NovelExpanded Theme Songs v1.0.1.spp');
    expect(await fingerprint(bytes)).toBe(catalog.pack.archiveSha256);
    const { content } = await intakePack(bytes);
    expect(content!.manifest).toMatchObject({ id: catalog.pack.id, version: catalog.pack.version });
    expect(content!.manifest.files.some(file => file.mediaType.startsWith('audio/'))).toBe(false);
    const source = JSON.parse(new TextDecoder().decode(content!.assets.get('assets/source/manifest.json')));
    const originalAudio = source.files.filter((file: { mediaType: string }) => file.mediaType.startsWith('audio/'));
    expect(catalog.pieces.map(piece => [piece.sourcePath, piece.sourceSha256])).toEqual(originalAudio.map((file: { path: string; sha256: string }) => [file.path, file.sha256]));
    expect(content!.assets.has('assets/source/sen-audio-tags.json')).toBe(true);
    const { pack, files } = await inspectMenuMusicSpp(bytes);
    expect(pack.entries.map(piece => 'url' in piece && piece.url)).toEqual(MENU_MUSIC_PIECES.map(piece => piece.url));
    expect(files.size).toBe(0);
  });
});
