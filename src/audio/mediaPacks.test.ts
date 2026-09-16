import { describe, expect, it } from 'vitest';
import {
  createAuthorizedMediaCatalog,
  createRegisteredMediaPackCatalog,
  freezeMediaLoadout,
  mediaPackKey,
  resolveAuthorizedSoundscape,
  validateMediaPack,
  type MediaPack,
} from './mediaPacks';

const soundscape = (overrides: Record<string, unknown> = {}) => ({
  id: 'test.storm-soundscapes', version: '1.0.0', type: 'soundscape',
  displayName: 'Storm Soundscapes', description: 'Test-only tracks.',
  source: { path: 'catalogs/storm.json', digest: 'a'.repeat(64) },
  entries: [{ id: 'TEST_STORM', mood: 'storm-path', moods: ['storm-path'], tags: ['rain'], url: 'https://fixtures.r2.dev/storm.mp3', isPremium: false }],
  ...overrides,
});

const soundCues = (overrides: Record<string, unknown> = {}) => ({
  id: 'test.clockwork-cues', version: '1.0.0', type: 'sound-cue',
  displayName: 'Clockwork Cues', description: 'Test-only cues.',
  source: { path: 'catalogs/cues.json', digest: 'b'.repeat(64) },
  entries: [{
    file_path: 'fixtures/clockwork-roar.mp3',
    public_url: 'https://fixtures.r2.dev/clockwork-roar.mp3',
    metadata: { main_category: 'beasts', broad_variation: 'clockwork-roar', soft_tags: ['clockwork'], description: 'Test roar.', confidence_score: 1 },
  }],
  ...overrides,
});

describe('Media Pack contracts', () => {
  it('validates Soundscape and Sound Cue Packs independently and registers both', () => {
    const tracks = validateMediaPack(soundscape());
    const cues = validateMediaPack(soundCues());
    expect(tracks).toMatchObject({ type: 'soundscape', entries: [{ id: 'TEST_STORM' }] });
    expect(cues).toMatchObject({ type: 'sound-cue', entries: [{ category: 'beasts' }] });
    expect([...createRegisteredMediaPackCatalog([tracks, cues]).keys()]).toEqual([
      mediaPackKey(tracks), mediaPackKey(cues),
    ]);
  });

  it('rejects mixed types, duplicate identities, unsafe URLs, secrets, code and unsupported sources', () => {
    expect(() => validateMediaPack(soundscape({ entries: soundCues().entries }))).toThrow();
    expect(() => validateMediaPack(soundCues({ entries: soundscape().entries }))).toThrow();
    expect(() => validateMediaPack(soundscape({ entries: [soundscape().entries[0], soundscape().entries[0]] }))).toThrow('Duplicate');
    expect(() => validateMediaPack(soundCues({ entries: [soundCues().entries[0], soundCues().entries[0]] }))).toThrow();
    expect(() => validateMediaPack(soundCues({ entries: [{ ...soundCues().entries[0], category: 'weapons' }] }))).toThrow('incompatible');
    expect(() => validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'http://fixtures.r2.dev/storm.mp3' }] }))).toThrow('HTTPS');
    expect(() => validateMediaPack({ ...soundscape(), providerSecret: 'do-not-store' })).toThrow('forbidden');
    expect(() => validateMediaPack({ ...soundscape(), accessToken: 'do-not-store' })).toThrow('forbidden');
    expect(() => validateMediaPack({ ...soundscape(), executable: () => undefined })).toThrow('forbidden');
    expect(() => validateMediaPack(soundscape({ source: { path: 'catalogs/storm.js', digest: 'a'.repeat(64) } }))).toThrow('JSON');
    expect(() => validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'https://user:pass@fixtures.r2.dev/storm.mp3' }] }))).toThrow('HTTPS');
    expect(() => validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'https://fixtures.r2.dev/storm.exe' }] }))).toThrow('HTTPS');
    expect(() => validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'https://127.0.0.1/storm.mp3' }] }))).toThrow('HTTPS');
    expect(() => validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'https://localhost/storm.mp3' }] }))).toThrow('HTTPS');
  });

  it('freezes only independently equipped, registered and entitled slots', () => {
    const packs = [validateMediaPack(soundscape()), validateMediaPack(soundCues())] as MediaPack[];
    const registered = createRegisteredMediaPackCatalog(packs);
    const frozen = freezeMediaLoadout({
      loadout: { soundscapes: packs[0], soundCues: packs[1] },
      entitlements: [{ pack: packs[0], unlockedAt: '2026-09-16T00:00:00.000Z', grant: { kind: 'reward', id: 'reward-1' } }],
      registered,
      capturedAt: '2026-09-16T00:00:01.000Z',
    });
    expect(frozen.soundscapes?.id).toBe(packs[0].id);
    expect(frozen.soundCues).toBeUndefined();

    const wrongType = freezeMediaLoadout({
      loadout: { soundCues: packs[0] },
      entitlements: [{ pack: packs[0], unlockedAt: 'now', grant: { kind: 'reward', id: 'reward-1' } }],
      registered,
      capturedAt: 'now',
    });
    expect(wrongType.soundCues).toBeUndefined();
  });

  it('adds only the equipped pack to the base catalog and keeps deterministic selection', () => {
    const pack = validateMediaPack(soundscape()) as Extract<MediaPack, { type: 'soundscape' }>;
    const catalog = createAuthorizedMediaCatalog({ capturedAt: 'now', soundscapes: pack });
    const resolved = resolveAuthorizedSoundscape({ blockId: 'b1', mood: 'storm-path', semanticTags: ['rain'] }, catalog);
    expect(resolved?.resource.track.id).toBe('TEST_STORM');
    expect(resolved?.resource.provenance).toMatchObject({ kind: 'media-pack', id: pack.id, version: pack.version });
    expect(createAuthorizedMediaCatalog().soundscapes.some(item => item.track.id === 'TEST_STORM')).toBe(false);
  });
});
