import { describe, expect, it } from 'vitest';
import { createAuthorizedMediaCatalog, createLibraryMediaPort, createRegisteredMediaPackCatalog, freezeMediaLoadout, mediaPackKey, validateMediaPack, type MediaPack } from '@seihouse/library/media';
import { createMediaCatalog, parseAudioCues, resolveAuthorizedSoundscape, type FrozenNarrativeMedia } from '@seihouse/sen/audio';
import { resolveSoundscapeTrack, type SceneAudioTrack } from '@seihouse/sen/audio';

const soundscape = (overrides: Record<string, unknown> = {}) => ({
  id: 'test.storm-soundscapes', version: '1.0.0', type: 'soundscape',
  displayName: 'Storm Soundscapes', description: 'Test-only tracks.',
  source: { path: 'catalogs/storm.json', digest: 'a'.repeat(64) },
  entries: [{ id: 'TEST_STORM', mood: 'storm-path', moods: ['storm-path'], tags: ['rain'], region: 'chinese', url: 'https://fixtures.r2.dev/storm.mp3' }],
  ...overrides,
});

const cueEntry = (sound = 'clockwork roar', studioTags: Record<string, unknown> = { energy: 'high' }, name = 'clockwork-roar') => ({
  file_path: `fixtures/${name}.mp3`,
  public_url: `https://fixtures.r2.dev/${name}.mp3`,
  metadata: {
    main_category: 'beasts', broad_variation: 'clockwork-roar', soft_tags: ['clockwork'], description: 'Test roar.', confidence_score: 1,
    sound, studio_tags: studioTags,
  },
});

const soundCues = (overrides: Record<string, unknown> = {}) => ({
  id: 'test.clockwork-cues', version: '1.0.0', type: 'sound-cue',
  displayName: 'Clockwork Cues', description: 'Test-only cues.',
  source: { path: 'catalogs/cues.json', digest: 'b'.repeat(64) },
  sounds: [{ word: 'clockwork roar', example: 'the clockwork beast roared' }],
  entries: [cueEntry()],
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

  it('keeps a soundscape\'s name, group and measured loudness, and refuses a measurement it cannot read', () => {
    const entry = soundscape().entries[0];
    const loudness = { kind: 'integrated', lufs: -11.7, peakDb: 0.3 };
    expect(validateMediaPack(soundscape({ entries: [{ ...entry, label: ' Storm Drums ', group: 'Fighting', loudness }] })).entries).toEqual([
      { ...entry, label: 'Storm Drums', group: 'Fighting', loudness },
    ]);
    expect(() => validateMediaPack(soundscape({ entries: [{ ...entry, loudness: { kind: 'integrated', lufs: 'loud', peakDb: 0 } }] }))).toThrow('loudness needs');
    expect(() => validateMediaPack(soundscape({ entries: [{ ...entry, loudness: { ...loudness, gain: 2 } }] }))).toThrow('unsupported field gain');
    expect(() => validateMediaPack(soundscape({ entries: [{ ...entry, label: ' ' }] }))).toThrow('label must be readable text');
  });

  it('holds a Sound Cue Pack\'s words and recordings to one another, with its cue category as the parent tag', () => {
    expect(validateMediaPack(soundCues())).toMatchObject({
      sounds: [{ word: 'clockwork roar', example: 'the clockwork beast roared' }],
      entries: [{ category: 'beasts', metadata: { sound: 'clockwork roar', studio_tags: { energy: 'high' } } }],
    });
    expect(() => validateMediaPack(soundCues({ sounds: undefined }))).toThrow('Sound words must be a list');
    expect(() => validateMediaPack(soundCues({ entries: [cueEntry('gear whine')] }))).toThrow('does not declare');
    expect(() => validateMediaPack(soundCues({ entries: [{ ...cueEntry(), metadata: { ...cueEntry().metadata, sound: undefined } }] }))).toThrow('needs a sound word');
    expect(() => validateMediaPack(soundCues({
      sounds: [{ word: 'clockwork roar', example: 'the clockwork beast roared' }, { word: 'gear whine', example: 'gears whined' }],
    }))).toThrow('"gear whine" has no recording');
    expect(() => validateMediaPack(soundCues({ entries: [cueEntry('clockwork roar', { parent: 'FIGHTING' })] }))).toThrow('no parent tag');
    // Placement follows the sound word, so any cue category may hold one: a System recording joins a pack like any other.
    const alarm = { ...cueEntry(), metadata: { ...cueEntry().metadata, main_category: 'system' } };
    expect(validateMediaPack(soundCues({ entries: [alarm] })).entries).toMatchObject([{ category: 'system', metadata: { sound: 'clockwork roar' } }]);
    expect(() => validateMediaPack(soundCues({ entries: [cueEntry('clockwork roar', { energy: 'loud' })] }))).toThrow('Energy must be one of low, medium, high');
    expect(() => validateMediaPack(soundCues({ sounds: { 'clockwork roar': 'the clockwork beast roared' } }))).toThrow('list');
    expect(() => validateMediaPack(soundscape({ sounds: [] }))).toThrow('unsupported field sounds');
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
    expect(() => validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'https://localhost./storm.mp3' }] }))).toThrow('HTTPS');
    expect(() => validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'https://192.168.1.2/storm.mp3' }] }))).toThrow('HTTPS');
    expect(() => validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'https://[::1]/storm.mp3' }] }))).toThrow('HTTPS');
    expect(() => validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'https://[fc00::1]/storm.mp3' }] }))).toThrow('HTTPS');
    expect(validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'https://8.8.8.8/storm.mp3' }] }))).toMatchObject({
      entries: [{ url: 'https://8.8.8.8/storm.mp3' }],
    });
    expect(validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], url: 'https://[2606:4700:4700::1111]/storm.mp3' }] }))).toMatchObject({
      entries: [{ url: 'https://[2606:4700:4700::1111]/storm.mp3' }],
    });
    expect(() => validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], region: 'unsupported' }] }))).toThrow('region');
    expect(validateMediaPack(soundscape({ entries: [{ ...soundscape().entries[0], region: 'korean' }] }))).toMatchObject({
      entries: [{ region: 'korean' }],
    });
  });

  it('freezes only independently equipped, registered and entitled slots', () => {
    const packs = [validateMediaPack(soundscape()), validateMediaPack(soundCues())] as MediaPack[];
    const registered = createRegisteredMediaPackCatalog(packs);
    const frozen = freezeMediaLoadout({
      loadout: { soundscapes: packs[0], soundCues: packs[1] },
      entitlements: [{ pack: packs[0], unlockedAt: '2026-09-16T00:00:00.000Z', expiresAt: '2026-09-16T01:00:00.000Z' }],
      registered,
      capturedAt: '2026-09-16T00:00:01.000Z',
    });
    expect(frozen.soundscapes?.id).toBe(packs[0].id);
    expect(frozen.soundCues).toBeUndefined();

    const wrongType = freezeMediaLoadout({
      loadout: { soundCues: packs[0] },
      entitlements: [{ pack: packs[0], unlockedAt: '2026-09-16T00:00:00.000Z' }],
      registered,
      capturedAt: '2026-09-16T00:00:01.000Z',
    });
    expect(wrongType.soundCues).toBeUndefined();

    const expired = freezeMediaLoadout({
      loadout: { soundscapes: packs[0] },
      entitlements: [{ pack: packs[0], unlockedAt: '2026-09-16T00:00:00.000Z', expiresAt: '2026-09-16T00:00:01.000Z' }],
      registered,
      capturedAt: '2026-09-16T00:00:01.000Z',
    });
    expect(expired.soundscapes).toBeUndefined();
  });

  it('lets an equipped Sound Cue Pack replace the default sound set, keeping recordings that answer no word', () => {
    const base: FrozenNarrativeMedia = {
      capturedAt: 'base',
      soundscapes: [],
      soundCues: [
        { cue: parseAudioCues([{ ...cueEntry('beast roar', {}, 'default-roar'), metadata: { ...cueEntry('beast roar', {}, 'default-roar').metadata, studio_tags: undefined } }]).cues[0], provenance: { catalogId: 'defaults', version: '1' } },
        { cue: parseAudioCues([{ ...cueEntry(undefined, {}, 'rain'), metadata: { main_category: 'atmosphere', broad_variation: 'rain', soft_tags: [], description: 'Rain.', confidence_score: 1 } }]).cues[0], provenance: { catalogId: 'defaults', version: '1' } },
      ],
      sounds: [{ word: 'beast roar', example: 'the beast roared' }],
    };
    const defaults = createAuthorizedMediaCatalog(undefined, createMediaCatalog(base));
    expect(defaults.sounds.map(sound => sound.word)).toEqual(['beast roar']);
    expect(defaults.soundCues.cues.map(cue => cue.file_path)).toEqual(['fixtures/default-roar.mp3', 'fixtures/rain.mp3']);

    const pack = validateMediaPack(soundCues()) as Extract<MediaPack, { type: 'sound-cue' }>;
    const equipped = createAuthorizedMediaCatalog({ capturedAt: 'now', soundCues: pack }, createMediaCatalog(base));
    expect(equipped.sounds.map(sound => sound.word)).toEqual(['clockwork roar']);
    expect(equipped.soundCues.cues.map(cue => cue.file_path)).toEqual(['fixtures/rain.mp3', 'fixtures/clockwork-roar.mp3']);
    expect(equipped.soundCueProvenanceByUrl.get('https://fixtures.r2.dev/default-roar.mp3')).toBeUndefined();
    expect(equipped.soundCueProvenanceByUrl.get('https://fixtures.r2.dev/clockwork-roar.mp3')).toMatchObject({ catalogId: pack.id });
    expect(equipped.soundCueProvenanceByUrl.get('https://fixtures.r2.dev/rain.mp3')).toMatchObject({ catalogId: 'defaults' });

    const port = createLibraryMediaPort({ registered: [pack], entitlements: [{ pack, unlockedAt: '2026-09-16T00:00:00.000Z' }], base });
    expect(port.freeze({ soundCues: pack }, '2026-09-16T00:00:01.000Z').sounds).toEqual(pack.sounds);
    expect(port.freeze(undefined, '2026-09-16T00:00:01.000Z').sounds).toEqual(base.sounds);
  });

  it('adds only the equipped pack to the base catalog and keeps deterministic selection', () => {
    const pack = validateMediaPack(soundscape()) as Extract<MediaPack, { type: 'soundscape' }>;
    const catalog = createAuthorizedMediaCatalog({ capturedAt: 'now', soundscapes: pack });
    const resolved = resolveAuthorizedSoundscape({ blockId: 'b1', mood: 'storm-path', region: 'chinese', semanticTags: ['rain'] }, catalog);
    expect(resolved?.resource.track.id).toBe('TEST_STORM');
    expect(resolved?.resource.provenance).toMatchObject({ catalogId: pack.id, version: pack.version });
    expect(createAuthorizedMediaCatalog().soundscapes.some(item => item.track.id === 'TEST_STORM')).toBe(false);
  });

  it('uses semantic cultural region to reject mismatches and prefer an exact match over a neutral fallback', () => {
    const base = { mood: 'journey', moods: ['journey'], tags: ['road'] };
    const catalog: SceneAudioTrack[] = [
      { ...base, id: 'A_JAPANESE', region: 'japanese', url: 'https://fixtures.r2.dev/japanese.mp3' },
      { ...base, id: 'B_NEUTRAL', url: 'https://fixtures.r2.dev/neutral.mp3' },
      { ...base, id: 'Z_CHINESE', region: 'chinese', url: 'https://fixtures.r2.dev/chinese.mp3' },
    ];
    expect(resolveSoundscapeTrack({ blockId: 'b1', mood: 'journey', region: 'chinese', semanticTags: ['road'] }, catalog)?.id).toBe('Z_CHINESE');
    expect(resolveSoundscapeTrack({ blockId: 'b1', mood: 'journey', region: 'korean', semanticTags: ['road'] }, catalog)?.id).toBe('B_NEUTRAL');
    expect(resolveSoundscapeTrack({ blockId: 'b1', mood: 'journey', semanticTags: ['road'] }, catalog)?.id).toBe('B_NEUTRAL');
  });
});
