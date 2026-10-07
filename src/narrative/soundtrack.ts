import type { ReaderMixer, ReaderMixerLayerStatus, Track } from '@seihouse/audio-player';
import type { SceneAudioTrack } from '../audio/soundscapes';
import type { ReaderPreferenceStorage } from './readerRuntime';

/**
 * What the music plays: pieces of one mood, one after another, or one piece
 * the reader chose, again and again.
 */
export type SoundtrackRequest =
  | { mood: string; pieces: readonly SceneAudioTrack[] }
  | { piece: SceneAudioTrack };

const lower = (value: string) => value.trim().toLowerCase();

/** The pieces that answer a mood: as their own mood first, then as one of their moods. */
export function piecesForMood(mood: string, pieces: readonly SceneAudioTrack[]): SceneAudioTrack[] {
  const wanted = lower(mood);
  if (!wanted) return [];
  const own = pieces.filter(piece => lower(piece.mood) === wanted);
  const also = pieces.filter(piece => lower(piece.mood) !== wanted && piece.moods.some(entry => lower(entry) === wanted));
  return [...own, ...also];
}

/** The player's form of a piece: its measured loudness levels it against every other piece. */
const pieceTrack = (piece: SceneAudioTrack): Track => ({
  id: piece.id,
  title: piece.label ?? piece.id,
  artist: '',
  sources: [{ url: piece.url }],
  ...(piece.loudness ? { loudness: piece.loudness } : {}),
});

/**
 * The music under the story, on the host's reader mixer (its Soundscapes
 * layer, which it owns). Pieces are composed with their own opening and
 * ending, so they follow one another rather than loop: when the mixer rests
 * a piece (the host's `soundscapeMaxPlays` decides after how many plays), the
 * next piece of the same mood begins, never the same one twice in a row while
 * the mood has another.
 *
 * Two kinds of request decide what plays:
 *
 * - the host's own music (`setBase`), for its pages and the time a chapter is
 *   being written: it needs no model and plays at once;
 * - a hold (`hold`), such as the Reader's open chapter: while one is held it
 *   plays, the newest first; releasing it returns to the one beneath, or to
 *   the host's music, or to silence.
 *
 * A new request whose mood the piece playing already answers keeps that
 * piece, so the music never restarts for nothing. Changes made together (a
 * hold released and the next one taken as the Reader turns a chapter) are
 * settled once, a moment later. A piece that cannot be played is skipped for
 * the next of its mood.
 */
export class StorySoundtrack {
  private base?: SoundtrackRequest;
  private readonly holds: Array<{ request: SoundtrackRequest }> = [];
  private current?: { piece: SceneAudioTrack; request: SoundtrackRequest };
  /** Pieces that would not play since music last played: skipped while another remains. */
  private readonly failed = new Set<string>();
  private plays = 0;
  private settling = false;
  private status: ReaderMixerLayerStatus;
  private readonly unsubscribe: () => void;

  constructor(private readonly mixer: ReaderMixer, private readonly random: () => number = Math.random) {
    this.status = mixer.getState().layers.soundscapes.status;
    this.unsubscribe = mixer.subscribe(state => {
      const status = state.layers.soundscapes.status;
      const before = this.status;
      this.status = status;
      if (status === before) return;
      if (status === 'playing') this.failed.clear();
      else if (status === 'resting') this.next();
      else if (status === 'failed') this.skipFailed();
    });
  }

  /** The host's music: what plays when nothing is held. `undefined` is silence. */
  setBase(request?: SoundtrackRequest): void {
    this.base = request;
    this.settle();
  }

  /**
   * Plays this request until released; the newest hold plays. A hold whose
   * mood no piece answers leaves the music beneath it playing. Returns its
   * release.
   */
  hold(request: SoundtrackRequest): () => void {
    const entry = { request };
    this.holds.push(entry);
    this.settle();
    let held = true;
    return () => {
      if (!held) return;
      held = false;
      const index = this.holds.indexOf(entry);
      if (index >= 0) this.holds.splice(index, 1);
      this.settle();
    };
  }

  /**
   * Plays what is wanted again after the mixer stopped the music (the Reader
   * ends its listening session when the reader leaves it).
   */
  resume(): void {
    this.settle();
  }

  /** The piece the music is on now, if any. */
  piece(): SceneAudioTrack | undefined {
    return this.current?.piece;
  }

  /** Stops listening to the mixer. The mixer itself is the host's. */
  dispose(): void {
    this.unsubscribe();
  }

  private choices(request: SoundtrackRequest): SceneAudioTrack[] {
    return 'piece' in request ? [request.piece] : piecesForMood(request.mood, request.pieces);
  }

  /** The newest hold that has music, or else the host's music. */
  private wanted(): SoundtrackRequest | undefined {
    for (let index = this.holds.length - 1; index >= 0; index -= 1) {
      if (this.choices(this.holds[index].request).length) return this.holds[index].request;
    }
    return this.base && this.choices(this.base).length ? this.base : undefined;
  }

  private settle() {
    if (this.settling) return;
    this.settling = true;
    queueMicrotask(() => {
      this.settling = false;
      this.follow();
    });
  }

  /** Brings the music in line with the request in charge. */
  private follow() {
    const request = this.wanted();
    if (!request) {
      if (this.current) {
        this.current = undefined;
        this.mixer.stopSoundscape();
      }
      return;
    }
    const choices = this.choices(request);
    const current = this.current;
    const sounding = this.status !== 'idle' && this.status !== 'failed' && this.status !== 'resting';
    if (current && sounding && choices.some(piece => piece.id === current.piece.id && piece.url === current.piece.url)) {
      // The piece playing answers it already: it plays on, and what follows it comes from this request.
      this.current = { piece: current.piece, request };
      return;
    }
    this.failed.clear();
    const own = 'mood' in request ? choices.filter(piece => lower(piece.mood) === lower(request.mood)) : [];
    this.start(this.pick(own.length ? own : choices)!, request);
  }

  private pick(pieces: readonly SceneAudioTrack[], after?: SceneAudioTrack): SceneAudioTrack | undefined {
    const open = pieces.filter(piece => !this.failed.has(piece.id));
    const fresh = open.length > 1 && after ? open.filter(piece => piece.id !== after.id) : open;
    if (!fresh.length) return undefined;
    return fresh[Math.min(fresh.length - 1, Math.floor(this.random() * fresh.length))];
  }

  private start(piece: SceneAudioTrack, request: SoundtrackRequest) {
    this.current = { piece, request };
    this.plays += 1;
    // A new scene for every play, so a piece can follow itself.
    this.mixer.playSoundscape(pieceTrack(piece), { scene: `soundtrack-${this.plays}` });
  }

  /** A piece ended: the next of its request begins. */
  private next() {
    const request = this.wanted();
    if (!request || !this.current) return;
    const following = this.pick(this.choices(request), this.current.piece);
    if (following) this.start(following, request);
  }

  /** A piece would not play: the next of its mood is tried, while one remains. */
  private skipFailed() {
    const request = this.wanted();
    if (!request || !this.current || 'piece' in request) return;
    this.failed.add(this.current.piece.id);
    const following = this.pick(this.choices(request), this.current.piece);
    if (following) this.start(following, request);
  }
}

const soundtracks = new WeakMap<ReaderMixer, StorySoundtrack>();

/** The one soundtrack of a host's mixer, shared by the host's pages and the Reader. */
export function storySoundtrack(mixer: ReaderMixer): StorySoundtrack {
  let soundtrack = soundtracks.get(mixer);
  if (!soundtrack) {
    soundtrack = new StorySoundtrack(mixer);
    soundtracks.set(mixer, soundtrack);
  }
  return soundtrack;
}

/**
 * Who chooses the Reader's music and atmosphere. Automatic (the default)
 * follows each chapter's own scene; the reader's own choice stays until they
 * change it, whatever the chapters choose.
 */
export interface SoundtrackChoice {
  /** 'automatic', or the id of the piece the reader chose. */
  soundscape: 'automatic' | { pieceId: string };
  /** 'automatic', or the id of the atmosphere the reader chose. */
  atmosphere: 'automatic' | { atmosphereId: string };
}

export const DEFAULT_SOUNDTRACK_CHOICE: SoundtrackChoice = Object.freeze({ soundscape: 'automatic', atmosphere: 'automatic' });

/** The device preference's key in the host's `ReaderPreferenceStorage`. */
export const SOUNDTRACK_CHOICE_KEY = 'soundtrack-choice';

const readId = (value: unknown, field: string): string | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const id = (value as Record<string, unknown>)[field];
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
};

/** The reader's saved choice; anything missing or unreadable is Automatic. */
export function readSoundtrackChoice(storage?: ReaderPreferenceStorage): SoundtrackChoice {
  let saved: unknown;
  try {
    const raw = storage?.read(SOUNDTRACK_CHOICE_KEY);
    saved = raw ? JSON.parse(raw) : undefined;
  } catch {
    return DEFAULT_SOUNDTRACK_CHOICE;
  }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return DEFAULT_SOUNDTRACK_CHOICE;
  const data = saved as Record<string, unknown>;
  const pieceId = readId(data.soundscape, 'pieceId');
  const atmosphereId = readId(data.atmosphere, 'atmosphereId');
  return {
    soundscape: pieceId ? { pieceId } : 'automatic',
    atmosphere: atmosphereId ? { atmosphereId } : 'automatic',
  };
}

/** Saves the reader's choice on the device. A storage that refuses it changes nothing. */
export function writeSoundtrackChoice(storage: ReaderPreferenceStorage | undefined, choice: SoundtrackChoice): void {
  try {
    storage?.write(SOUNDTRACK_CHOICE_KEY, JSON.stringify({ v: 1, ...choice }));
  } catch {
    // The choice lasts for this visit.
  }
}
