import { describe, expect, it } from 'vitest';
import { createPack, intakePack } from 'seihouse-productions-package';
import { linkMenuMusicSpp } from './linkMenuMusicSpp.mjs';
import { inspectMenuMusicSpp } from '../src/host/media/deviceMediaPacks';

const makeSource = () => createPack({ id: 'themes', name: 'SEN Audio Collection', description: 'Original tags', files: [
  { path: 'assets/audio/urdu.mp3', mediaType: 'audio/mpeg', data: new Uint8Array([73, 68, 51]), metadata: { 'seihouse.senAudio': { kind: 'soundscape', category: 'Adventure' } } },
  { path: 'assets/audio/english.mp3', mediaType: 'audio/mpeg', data: new Uint8Array([73, 68, 51, 4]) },
] });

describe('linked menu-music SPP', () => {
  it('retains package identity, order and original provenance in a small, playable URL pack', async () => {
    const original = await makeSource();
    const { bytes } = await linkMenuMusicSpp(original, {
      'assets/audio/urdu.mp3': 'https://media.example.org/urdu.mp3',
      'assets/audio/english.mp3': 'https://media.example.org/english.mp3',
    }, '1.0.1');
    const inspected = await intakePack(bytes);
    expect(inspected.content?.manifest).toMatchObject({ id: 'themes', version: '1.0.1' });
    expect(inspected.content?.manifest.files.every(file => !file.mediaType.startsWith('audio/'))).toBe(true);
    const sourceManifest = JSON.parse(new TextDecoder().decode(inspected.content!.assets.get('assets/source/manifest.json')));
    expect(sourceManifest).toEqual((await intakePack(original)).content!.manifest);
    const { pack, files } = await inspectMenuMusicSpp(bytes);
    expect(files.size).toBe(0);
    expect(pack.entries.map(track => 'url' in track && track.url)).toEqual(['https://media.example.org/urdu.mp3', 'https://media.example.org/english.mp3']);
  });

  it('requires every permanent HTTPS link and a new version', async () => {
    const source = await makeSource();
    await expect(linkMenuMusicSpp(source, {}, '1.0.1')).rejects.toThrow('Missing or invalid');
    await expect(linkMenuMusicSpp(source, { 'assets/audio/urdu.mp3': 'http://media.example.org/a.mp3' }, '1.0.1')).rejects.toThrow('HTTPS');
    await expect(linkMenuMusicSpp(source, {}, '1.0.0')).rejects.toThrow('new package version');
  });
});
