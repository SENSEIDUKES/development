import { describe, expect, it, vi } from 'vitest';
import type { ReaderMixer, ReaderMixerLayerStatus, ReaderMixerState, Track } from '@seihouse/audio-player';
import type { SceneAudioTrack } from '../audio/soundscapes';
import {
  DEFAULT_SOUNDTRACK_CHOICE, SOUNDTRACK_CHOICE_KEY, StorySoundtrack, piecesForMood, readSoundtrackChoice, storySoundtrack, writeSoundtrackChoice,
} from './soundtrack';

const piece = (id: string, mood: string, moods: string[] = []): SceneAudioTrack => ({
  id, label: id, mood, moods, tags: [], url: `https://media.example.org/${id}.mp3`, loudness: { kind: 'integrated', lufs: -11, peakDb: 0 },
});
const PIECES = [
  piece('calm-1', 'ambient', ['serenity']), piece('calm-2', 'ambient'), piece('calm-3', 'serenity', ['ambient']),
  piece('fight-1', 'fighting', ['tension']), piece('fight-2', 'fighting'), piece('lament', 'sad', ['ambient']),
];

/** The mixer's Soundscapes layer, as far as the soundtrack sees it. */
function fakeMixer() {
  let status: ReaderMixerLayerStatus = 'idle';
  const listeners = new Set<(state: ReaderMixerState) => void>();
  const state = () => ({ layers: { soundscapes: { status } } }) as unknown as ReaderMixerState;
  const set = (next: ReaderMixerLayerStatus) => { status = next; listeners.forEach(listener => listener(state())); };
  const played: Array<{ id?: string; scene?: string; track: Track }> = [];
  const mixer = {
    getState: state,
    subscribe: (listener: (state: ReaderMixerState) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    playSoundscape: vi.fn((track: Track, options?: { scene?: string }) => { played.push({ id: track.id, scene: options?.scene, track }); set('loading'); }),
    stopSoundscape: vi.fn(() => set('idle')),
  };
  return { mixer: mixer as unknown as ReaderMixer, raw: mixer, played, set, listeners };
}

/** Lets the soundtrack settle the changes just made. */
const settled = () => Promise.resolve();

describe('The music under the story', () => {
  it('plays a mood\'s own pieces first, then one piece of the mood after another, never the same twice in a row', async () => {
    const { mixer, played, set } = fakeMixer();
    const soundtrack = new StorySoundtrack(mixer, () => 0);
    soundtrack.setBase({ mood: 'ambient', pieces: PIECES });
    await settled();
    expect(played.map(entry => entry.id)).toEqual(['calm-1']);
    // The player gets the piece's name, address and measured loudness.
    expect(played[0].track).toMatchObject({ title: 'calm-1', sources: [{ url: 'https://media.example.org/calm-1.mp3' }], loudness: { lufs: -11 } });
    for (let index = 0; index < 4; index += 1) set('resting');
    const ids = played.map(entry => entry.id);
    expect(ids).toHaveLength(5);
    ids.slice(1).forEach((id, index) => {
      expect(id).not.toBe(ids[index]);
      expect(piecesForMood('ambient', PIECES).map(entry => entry.id)).toContain(id);
    });
    // Every play is its own scene, so the player never takes it for a repeat.
    expect(new Set(played.map(entry => entry.scene)).size).toBe(5);
  });

  it('lets a hold take over, keeps a piece that answers the next hold, and returns to the host\'s music on release', async () => {
    const { mixer, played, raw } = fakeMixer();
    const soundtrack = new StorySoundtrack(mixer, () => 0);
    soundtrack.setBase({ mood: 'ambient', pieces: PIECES });
    await settled();
    const release = soundtrack.hold({ mood: 'fighting', pieces: PIECES });
    await settled();
    expect(played.map(entry => entry.id)).toEqual(['calm-1', 'fight-1']);
    // The Reader turns to a chapter that is fighting too: its old hold is
    // released and the new one taken together, and the piece plays on.
    release();
    const again = soundtrack.hold({ mood: 'fighting', pieces: PIECES });
    await settled();
    expect(played).toHaveLength(2);
    again();
    await settled();
    expect(played.map(entry => entry.id)).toEqual(['calm-1', 'fight-1', 'calm-1']);
    // The host's music never carries into a hold, even one its piece answers:
    // the hold starts its own play (the Reader never opens to the menus' music).
    expect(piecesForMood('serenity', PIECES).map(entry => entry.id)).toContain('calm-1');
    const calm = soundtrack.hold({ mood: 'serenity', pieces: PIECES });
    await settled();
    expect(played).toHaveLength(4);
    expect(new Set(played.map(entry => entry.scene)).size).toBe(4);
    // Nor a hold's piece back out: releasing it starts the host's own play.
    calm();
    await settled();
    expect(played).toHaveLength(5);
    expect(raw.stopSoundscape).not.toHaveBeenCalled();
  });

  it('leaves the music beneath playing when no piece answers a hold\'s mood', async () => {
    const { mixer, played, set } = fakeMixer();
    const soundtrack = new StorySoundtrack(mixer, () => 0);
    soundtrack.setBase({ mood: 'ambient', pieces: PIECES });
    await settled();
    soundtrack.hold({ mood: 'war', pieces: PIECES });
    await settled();
    expect(played.map(entry => entry.id)).toEqual(['calm-1']);
    set('resting');
    expect(piecesForMood('ambient', PIECES).map(entry => entry.id)).toContain(played.at(-1)!.id);
  });

  it('plays a piece the reader chose again and again, and falls silent when nothing asks for music', async () => {
    const { mixer, played, set, raw } = fakeMixer();
    const soundtrack = new StorySoundtrack(mixer, () => 0);
    const release = soundtrack.hold({ piece: PIECES[4] });
    await settled();
    set('resting');
    set('resting');
    expect(played.map(entry => entry.id)).toEqual(['fight-2', 'fight-2', 'fight-2']);
    release();
    await settled();
    expect(raw.stopSoundscape).toHaveBeenCalledTimes(1);
    expect(soundtrack.piece()).toBeUndefined();
  });

  it('skips a piece that will not play for the next of its mood, and stops trying when none will', async () => {
    const { mixer, played, set } = fakeMixer();
    const soundtrack = new StorySoundtrack(mixer, () => 0);
    soundtrack.setBase({ mood: 'fighting', pieces: PIECES });
    await settled();
    set('failed');
    expect(played.map(entry => entry.id)).toEqual(['fight-1', 'fight-2']);
    set('failed');
    expect(played.map(entry => entry.id)).toEqual(['fight-1', 'fight-2']);
    // Once music plays again, a piece that failed before may be tried again.
    soundtrack.setBase({ mood: 'ambient', pieces: PIECES });
    await settled();
    set('playing');
    soundtrack.setBase({ mood: 'fighting', pieces: PIECES });
    await settled();
    expect(played.at(-1)!.id).toBe('fight-1');
  });

  it('starts again when asked after the mixer stopped the music', async () => {
    const { mixer, played, set } = fakeMixer();
    const soundtrack = new StorySoundtrack(mixer, () => 0);
    soundtrack.setBase({ mood: 'ambient', pieces: PIECES });
    await settled();
    set('idle');
    soundtrack.resume();
    await settled();
    expect(played.map(entry => entry.id)).toEqual(['calm-1', 'calm-1']);
    // While the music plays, asking again changes nothing.
    soundtrack.resume();
    await settled();
    expect(played).toHaveLength(2);
  });

  it('is one soundtrack per mixer', async () => {
    const { mixer } = fakeMixer();
    expect(storySoundtrack(mixer)).toBe(storySoundtrack(mixer));
    expect(storySoundtrack(fakeMixer().mixer)).not.toBe(storySoundtrack(mixer));
  });
});

describe('The reader\'s choice of music and atmosphere', () => {
  const memory = () => {
    const values = new Map<string, string>();
    return { values, storage: { read: (key: string) => values.get(key) ?? null, write: (key: string, value: string) => { values.set(key, value); }, remove: (key: string) => { values.delete(key); } } };
  };

  it('is Automatic until the reader chooses, and keeps their choice on the device', () => {
    const { storage, values } = memory();
    expect(readSoundtrackChoice(storage)).toEqual(DEFAULT_SOUNDTRACK_CHOICE);
    writeSoundtrackChoice(storage, { soundscape: { pieceId: 'fight-2' }, atmosphere: 'automatic' });
    expect(JSON.parse(values.get(SOUNDTRACK_CHOICE_KEY)!)).toMatchObject({ v: 1 });
    expect(readSoundtrackChoice(storage)).toEqual({ soundscape: { pieceId: 'fight-2' }, atmosphere: 'automatic' });
  });

  it('reads anything damaged as Automatic', () => {
    const { storage, values } = memory();
    values.set(SOUNDTRACK_CHOICE_KEY, '{nope');
    expect(readSoundtrackChoice(storage)).toEqual(DEFAULT_SOUNDTRACK_CHOICE);
    values.set(SOUNDTRACK_CHOICE_KEY, JSON.stringify({ soundscape: { pieceId: ' ' }, atmosphere: { atmosphereId: 'rain' } }));
    expect(readSoundtrackChoice(storage)).toEqual({ soundscape: 'automatic', atmosphere: { atmosphereId: 'rain' } });
    expect(readSoundtrackChoice(undefined)).toEqual(DEFAULT_SOUNDTRACK_CHOICE);
    expect(() => writeSoundtrackChoice({ ...storage, write: () => { throw new Error('full'); } }, DEFAULT_SOUNDTRACK_CHOICE)).not.toThrow();
  });
});
