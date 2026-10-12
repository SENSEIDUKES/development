import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPack } from 'seihouse-productions-package';
import type { ReaderMixer } from '@seihouse/audio-player';
import { isPlayableMediaUrl, packageMediaUrl, readPackageMediaUrl } from '@seihouse/sen/audio';
import { createLibraryMediaPort } from '@seihouse/library/media';
import { HarnessGenerationController, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../test-utils/writtenChapter';
import { makeSpp } from '../../../scripts/makeSpp.mjs';
import { LIBRARY_BASE_MEDIA } from './libraryCatalog';
import {
  DeviceMediaUrls,
  deviceMediaPackEntitlement,
  inspectMediaPackSpp,
  MEDIA_PACK_LIMITS,
  playDeviceMediaThrough,
} from './deviceMediaPacks';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const AUDIO = new Uint8Array([73, 68, 51, 4, 0, 0, 0]);

/** An audio folder, as an author lays one out: a folder per sound word or mood. */
const audioFolder = (layout: Record<string, string[]>, config: Record<string, unknown>) => {
  const root = mkdtempSync(join(tmpdir(), 'media-spp-'));
  roots.push(root);
  const folder = join(root, String(config.name ?? 'Pack'));
  for (const [group, files] of Object.entries(layout)) {
    mkdirSync(join(folder, group), { recursive: true });
    for (const file of files) writeFileSync(join(folder, group, file), AUDIO);
  }
  writeFileSync(join(folder, 'spp.json'), JSON.stringify(config));
  return folder;
};

describe('package audio addresses', () => {
  it('names a file in an installed package, and nothing else', () => {
    const url = packageMediaUrl('7a6c1b8e-3d2f', '1.0.0', 'assets/temple bell/bell (1).mp3');
    expect(url).toBe('spp://7a6c1b8e-3d2f/1.0.0/assets/temple%20bell/bell%20(1).mp3');
    expect(readPackageMediaUrl(url)).toEqual({ packageId: '7a6c1b8e-3d2f', version: '1.0.0', assetPath: 'assets/temple bell/bell (1).mp3' });
    expect(isPlayableMediaUrl(url)).toBe(true);
    expect(isPlayableMediaUrl('https://media.example.org/bell.mp3')).toBe(true);
    for (const bad of [
      'spp://id/1.0.0/assets/notes.txt', 'spp://id/one/assets/a.mp3', 'spp://id/1.0.0/other/a.mp3',
      'spp://id/1.0.0/assets/../a.mp3', 'spp://id/1.0.0/assets/a.mp3?x=1', 'http://media.example.org/a.mp3', 'blob:https://x/1',
    ]) expect(isPlayableMediaUrl(bad), bad).toBe(false);
  });
});

describe('media packages', () => {
  it('makes and reads a Sound Cue pack from a folder per sound word, with categories', async () => {
    const folder = audioFolder({ 'temple bell': ['bell 1.mp3', 'bell 2.ogg'], growl: ['low.wav'] }, {
      name: 'Temple Sounds', kind: 'sound-cues', categories: { growl: 'beasts' },
    });
    const made = await makeSpp(folder);
    const { pack, files } = await inspectMediaPackSpp(readFileSync(made.path));
    expect(pack).toMatchObject({ type: 'sound-cue', displayName: 'Temple Sounds', version: '1.0.0' });
    if (pack.type !== 'sound-cue') throw new Error('Expected a Sound Cue pack.');
    expect(pack.id).toMatch(/^spp\./);
    expect(pack.sounds).toEqual([{ word: 'growl' }, { word: 'temple bell' }]);
    expect(pack.entries.map(cue => [cue.metadata.sound, cue.category])).toEqual([['growl', 'beasts'], ['temple bell', 'atmosphere'], ['temple bell', 'atmosphere']]);
    expect(pack.entries.every(cue => readPackageMediaUrl(cue.public_url))).toBe(true);
    expect([...files.keys()]).toEqual(pack.entries.map(cue => cue.public_url));
    expect(await files.get(pack.entries[0].public_url)!.arrayBuffer()).toEqual(AUDIO.buffer);
  });

  it('makes and reads a Soundscape pack from a folder per mood', async () => {
    const folder = audioFolder({ mystical: ['Moonlit Shrine.mp3'], battle: ['Clash.mp3'] }, { name: 'Shrine Music', kind: 'soundscapes' });
    const { pack } = await inspectMediaPackSpp(readFileSync((await makeSpp(folder)).path));
    if (pack.type !== 'soundscape') throw new Error('Expected a Soundscape pack.');
    expect(pack.entries.map(track => [track.mood, track.label])).toEqual([['battle', 'Clash'], ['mystical', 'Moonlit Shrine']]);
  });

  it('says what is wrong with an audio folder, and makes nothing', async () => {
    await expect(makeSpp(audioFolder({ 'temple bell': ['notes.txt'] }, { name: 'A', kind: 'sound-cues' }))).rejects.toThrow('not an audio file');
    await expect(makeSpp(audioFolder({ 'Roar!': ['a.mp3'] }, { name: 'B', kind: 'sound-cues' }))).rejects.toThrow('folder name must be one to three plain English words');
    await expect(makeSpp(audioFolder({ growl: ['a.mp3'] }, { name: 'C', kind: 'sound-cues', categories: { growl: 'monsters' } }))).rejects.toThrow('must be one of');
  });

  it('refuses a package that is not media, names a missing file, or holds something that is not audio', async () => {
    const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
    const pack = (files: Array<{ path: string; mediaType: string; data: Uint8Array }>, extensions?: Record<string, unknown>) => createPack({
      name: 'Broken', description: '', files, ...(extensions ? { extensions: extensions as never } : {}),
    });
    const media = { 'seihouse.media-pack': { type: 'sound-cue', catalog: 'assets/media-pack.json' } };
    await expect(inspectMediaPackSpp(await pack([{ path: 'assets/a.mp3', mediaType: 'audio/mpeg', data: AUDIO }]))).rejects.toThrow('is not a Soundscape or Sound Cue package');
    await expect(inspectMediaPackSpp(await pack([
      { path: 'assets/media-pack.json', mediaType: 'application/json', data: encode({ recordings: [{ path: 'assets/missing.mp3', sound: 'growl' }] }) },
    ], media))).rejects.toThrow('does not contain');
    await expect(inspectMediaPackSpp(await pack([
      { path: 'assets/notes.txt', mediaType: 'text/plain', data: AUDIO },
      { path: 'assets/media-pack.json', mediaType: 'application/json', data: encode({ recordings: [{ path: 'assets/notes.txt', sound: 'growl' }] }) },
    ], media))).rejects.toThrow('is not an audio file');
    await expect(inspectMediaPackSpp(await pack([
      { path: 'assets/a.mp3', mediaType: 'audio/mpeg', data: AUDIO },
      { path: 'assets/media-pack.json', mediaType: 'application/json', data: encode({ recordings: [{ path: 'assets/a.mp3', sound: 'growl' }] }) },
    ], { ...media, 'seihouse.capa': { slot: 'style' } }))).rejects.toThrow('recordings only');
  });

  it('reads packs up to the SPP safety ceiling: 1 GB, 512 MB a file', () => {
    expect(MEDIA_PACK_LIMITS.maxArchiveBytes).toBe(1024 * 1024 * 1024);
    expect(MEDIA_PACK_LIMITS.maxEntryBytes).toBe(512 * 1024 * 1024);
  });
});

describe('playing installed recordings', () => {
  it('writes a chapter with an installed pack\'s recording, saves its package address, and plays it from the device', async () => {
    const folder = audioFolder({ 'temple bell': ['bell.mp3'] }, { name: 'Temple Sounds', kind: 'sound-cues' });
    const { pack, files } = await inspectMediaPackSpp(readFileSync((await makeSpp(folder)).path));
    const media = createLibraryMediaPort({ registered: [pack], entitlements: [deviceMediaPackEntitlement(pack, '2026-10-11T00:00:00.000Z')], base: LIBRARY_BASE_MEDIA });
    const goal = { arcNumber: 1, goals: [{ id: 'arc-1', text: 'Reach the temple.', chapters: 30 }] };
    const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-11T00:00:00.000Z', usage: { source: 'unavailable' as const } };
    const writer: HarnessGenerationModelAdapter = {
      getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
      generate: async () => ({ rawProviderResponse: writtenChapterReply(JSON.stringify({
        paragraphs: ['At dusk [[sound: temple bell | the temple bell rang | low]] over the valley.'],
        arcCompletion: { goalId: 'arc-1', completed: false, evidence: '' },
      })), providerReceipt: receipt }),
      arcOperation: async () => ({ rawProviderResponse: JSON.stringify({ plan: goal, destinedEnding: 'Reach the temple.' }), providerReceipt: receipt }),
    };
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), media, modelAdapter: writer });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A pilgrim climbs to a mountain temple.', destinedEnding: 'Reach the temple.', initialArcPlan: goal });
    await controller.setMediaSelection(story.id, 'soundCues', pack);
    await controller.setSoundWords(story.id, ['temple bell']);
    await controller.generateNextChapter(story.id, 'fixture');

    const [cue] = controller.snapshot().chapters[0].soundCues!;
    expect(cue.payload.sound).toBe('temple bell');
    expect(readPackageMediaUrl(cue.payload.cue.publicUrl)).toMatchObject({ assetPath: 'assets/temple bell/bell.mp3' });
    // The model request never carries the package or its addresses.
    expect(JSON.stringify(controller.snapshot().attempts[0].capaPrompt)).not.toContain('spp://');

    // The reader mixer is given this device's address for the package file.
    const urls = new DeviceMediaUrls();
    const createObjectURL = vi.fn(() => 'blob:https://app.example/1');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL }));
    urls.register(files);
    const playCue = vi.fn(() => true);
    const preloadCues = vi.fn();
    const playSoundscape = vi.fn();
    const mixer = playDeviceMediaThrough({ playCue, preloadCues, playSoundscape } as unknown as ReaderMixer, urls);
    mixer.playCue(cue.payload.cue.publicUrl, { volume: 1 });
    mixer.preloadCues([cue.payload.cue.publicUrl, 'https://media.example.org/a.mp3']);
    mixer.playSoundscape({ title: 'Piece', artist: '', sources: [{ url: cue.payload.cue.publicUrl }] });
    expect(playCue).toHaveBeenCalledWith('blob:https://app.example/1', { volume: 1 });
    expect(preloadCues).toHaveBeenCalledWith(['blob:https://app.example/1', 'https://media.example.org/a.mp3']);
    expect(playSoundscape.mock.calls[0][0]).toMatchObject({ sources: [{ url: 'blob:https://app.example/1' }] });
    vi.unstubAllGlobals();
  });
});
