import type { ReadAloudLine, ReadAloudScript } from './readAloud';
import type { SpeechEngine, SpeechEvents, SpeechRequest } from './useReadAloud';

/**
 * Saved voice clips for Read Aloud. A host that has recorded a spoken line in
 * a character's own voice hands Read Aloud the clip; the line plays it where
 * it would have spoken with the device's voice. Narration never has a clip:
 * it is always read by the device.
 */

/** The lines a character says: every line of a script that is not narration. */
export const spokenReadAloudLines = (script: ReadAloudScript): ReadAloudLine[] =>
  script.lines.filter(line => line.role !== 'narrator');

/**
 * A clip's address for a line, when the host has one, or will have one in a
 * moment (a voice made on this device as the reader listens). A promise that
 * settles with nothing, or fails, leaves the line to the device's voice.
 */
export type ReadAloudClipSource = (line: ReadAloudLine) => string | Promise<string | undefined> | undefined;

/** The part of an audio element a clip player drives; a stand-in in tests. */
export interface ClipAudio {
  src: string;
  volume: number;
  playbackRate: number;
  paused: boolean;
  ended: boolean;
  onplaying: (() => void) | null;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  ontimeupdate: (() => void) | null;
  play(): Promise<void>;
  pause(): void;
}

/** The shortest silent sound: playing it inside a tap lets later clips start on their own (iOS). */
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

const browserAudio = (): ClipAudio | undefined =>
  (typeof Audio === 'undefined' ? undefined : new Audio() as unknown as ClipAudio);

/**
 * Speech that plays a line's saved clip when the host has one, and otherwise
 * speaks with `base`. One audio element plays every clip. It is woken with a
 * silent sound on the first line spoken (inside the Listen tap), because a
 * phone only lets a page start sound by itself on an element a tap has played.
 */
export function createClipSpeechEngine(
  base: SpeechEngine,
  clipFor: ReadAloudClipSource,
  createAudio: () => ClipAudio | undefined = browserAudio,
): SpeechEngine {
  let audio: ClipAudio | undefined;
  let woken = false;
  let playing = false;
  // Each clip started has its own number: a late answer from an earlier one is ignored.
  let turn = 0;
  const detach = () => {
    if (audio) audio.onplaying = audio.onended = audio.onerror = audio.ontimeupdate = null;
  };
  const silence = () => {
    turn += 1;
    detach();
    if (audio && playing) audio.pause();
    playing = false;
  };
  const wake = () => {
    if (woken) return;
    woken = true;
    audio ??= createAudio();
    if (!audio) return;
    audio.src = SILENCE;
    audio.volume = 0;
    void audio.play().catch((error: unknown) => { if (error instanceof Error && error.name === 'NotAllowedError') woken = false; });
  };
  const playClip = (url: string, request: SpeechRequest, events: SpeechEvents) => {
    const player = audio ??= createAudio();
    if (!player) { base.speak(request, events); return; }
    woken = true;
    player.src = url;
    player.volume = request.volume;
    player.playbackRate = request.rate;
    player.onplaying = () => events.onStart();
    player.ontimeupdate = () => events.onProgress?.();
    player.onended = () => { playing = false; detach(); events.onEnd(); };
    // A clip that cannot be played is read by the device's voice instead.
    player.onerror = () => { playing = false; detach(); base.speak(request, events); };
    playing = true;
    const mine = turn;
    player.play().catch((error: unknown) => {
      if (mine !== turn || !playing) return;
      playing = false;
      detach();
      // The browser wants a tap before sound: the player asks for one.
      if (error instanceof Error && error.name === 'NotAllowedError') events.onError('not-allowed');
      else base.speak(request, events);
    });
  };
  return {
    supported: base.supported,
    getVoices: () => base.getVoices(),
    onVoicesChanged: listener => base.onVoicesChanged(listener),
    speak(request, events) {
      silence();
      const clip = request.line && clipFor(request.line);
      if (typeof clip === 'string') { base.cancel(); playClip(clip, request, events); return; }
      wake();
      if (!clip) { base.speak(request, events); return; }
      // A clip still being made: the line waits for it, and counts as speaking so nothing skips it.
      base.cancel();
      playing = true;
      const mine = turn;
      const ready = (url: string | undefined) => {
        if (mine !== turn) return;
        playing = false;
        if (url) playClip(url, request, events);
        else base.speak(request, events);
      };
      clip.then(ready, () => ready(undefined));
    },
    cancel() {
      silence();
      base.cancel();
    },
    isSpeaking: () => playing || base.isSpeaking(),
  };
}
