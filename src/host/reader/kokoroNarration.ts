import { useMemo, useSyncExternalStore } from 'react';
import type { ReadAloudLine, ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import type { ChapterSpeaker } from '@seihouse/library/stories';

/**
 * Kokoro voices from SEIHouse's own voice server (SENSEI, 2026-11-17). Made in
 * the reader's browser, Kokoro was far too slow on a phone, so the voice server
 * makes each line instead: once, for the first reader who hears it, and keeps
 * it, so every reader after hears the saved file at once. A foundation voice:
 * cheaper than a premium voice, not free (SENSEI, 2026-11-17). A line with a paid cast voice keeps that voice; this reads everything
 * else, where the device's own robotic voice read before.
 *
 * The narrator has one voice. Each character who speaks has their own, a
 * man's or a woman's as their card or the chapters say, chosen from their key
 * so it is the same on every device and every reader shares the kept lines
 * (SENSEI, 2026-11-18: one voice for every side character read the women as
 * men). English only: a story in another language is read by the device.
 */
export const KOKORO_ROLE_VOICES: Readonly<Record<ReadAloudLine['role'], string>> = {
  /** Elder Tome Narrator. */
  narrator: 'bm_lewis',
  /** Wandering Main Disciple: the main character, when the story does not say a woman. */
  protagonist: 'am_puck',
  /** Loyal Young Disciple: anyone the story says nothing of. */
  side: 'am_fenrir',
};

/** The main character's voice when she is a woman. */
const KOKORO_HEROINE = 'af_heart';
/** The voices characters are cast from, never the narrator's or the main character's. */
const KOKORO_WOMEN = ['af_bella', 'af_nicole', 'af_sarah', 'af_kore', 'af_aoede', 'bf_emma', 'bf_isabella'] as const;
const KOKORO_MEN = ['am_fenrir', 'am_michael', 'am_eric', 'am_liam', 'bm_george', 'bm_fable', 'bm_daniel'] as const;

/** The same number for the same key, wherever it is worked out. */
const keyNumber = (key: string) => {
  let hash = 2166136261;
  for (let at = 0; at < key.length; at += 1) hash = Math.imul(hash ^ key.charCodeAt(at), 16777619);
  return hash >>> 0;
};

/** The Kokoro voice for a line: the narrator's, or its speaker's own. */
export function kokoroVoice(line: Pick<ReadAloudLine, 'role'>, speaker?: ChapterSpeaker): string {
  if (line.role === 'narrator' || !speaker) return KOKORO_ROLE_VOICES[line.role];
  if (speaker.main) return speaker.gender === 'female' ? KOKORO_HEROINE : KOKORO_ROLE_VOICES.protagonist;
  if (!speaker.gender) return KOKORO_ROLE_VOICES[line.role];
  const voices = speaker.gender === 'female' ? KOKORO_WOMEN : KOKORO_MEN;
  return voices[keyNumber(speaker.key) % voices.length];
}

export const KOKORO_NARRATION_PREFERENCE_KEY = 'kokoro-voices';
/** Lines asked of the voice server at once: the one being read and the next. */
const AT_ONCE = 2;
/** Failed lines in a row before Kokoro stops asking until it is switched on again. */
const FAILURES_BEFORE_PAUSE = 3;

export interface KokoroNarrationState {
  on: boolean;
  /** Why the voice server is not being asked, after it failed several lines in a row. */
  problem?: string;
  /** Lines the voice server made for this reader, this visit. */
  made: number;
  /** Lines that were already kept, from an earlier reader. */
  kept: number;
}

export interface KokoroNarration {
  getState(): KokoroNarrationState;
  subscribe(listener: () => void): () => void;
  /** Turns it on or off. Remembered on the device. */
  setOn(on: boolean): void;
  /**
   * The clip for a line: its address once known, a promise while it is asked
   * for, or nothing when this cannot read it (off, or the server failing). The
   * lines that follow are asked for ahead. `speakerOf` says who speaks each
   * line, for their own voice.
   */
  clip(line: ReadAloudLine, upcoming: readonly ReadAloudLine[], speakerOf?: (line: ReadAloudLine) => ChapterSpeaker | undefined): string | Promise<string | undefined> | undefined;
}

/** What the app's server answers for one line: the saved clip's address, and whether it was made just now. */
export type KokoroLineRequest = (line: { text: string; voice: string }) => Promise<{ url: string; made: boolean }>;

interface Job { key: string; text: string; voice: string; resolve: (url: string | undefined) => void; letGo?: boolean }

export function createKokoroNarration({ preferences, requestLine }: {
  preferences?: ReaderPreferenceStorage;
  requestLine: KokoroLineRequest;
}): KokoroNarration {
  const remembered = (() => { try { return preferences?.read(KOKORO_NARRATION_PREFERENCE_KEY) === 'on'; } catch { return false; } })();
  let state: KokoroNarrationState = { on: remembered, made: 0, kept: 0 };
  const listeners = new Set<() => void>();
  const set = (next: Partial<KokoroNarrationState>) => { state = { ...state, ...next }; listeners.forEach(listener => listener()); };

  // Each line's clip, by its voice and words: the same words in the same voice are asked for once.
  const clips = new Map<string, string | Promise<string | undefined>>();
  const queue: Job[] = [];
  const asked = new Set<Job>();
  let failures = 0;

  const pump = () => {
    while (asked.size < AT_ONCE && state.on && !state.problem) {
      const job = queue.shift();
      if (!job) return;
      asked.add(job);
      requestLine({ text: job.text, voice: job.voice }).then(({ url, made }) => {
        // Switched off while it was asked for: the device has already read it.
        if (job.letGo) return;
        failures = 0;
        clips.set(job.key, url);
        set(made ? { made: state.made + 1 } : { kept: state.kept + 1 });
        job.resolve(url);
      }, (error: unknown) => {
        if (job.letGo) return;
        failures += 1;
        clips.delete(job.key);
        job.resolve(undefined);
        if (failures >= FAILURES_BEFORE_PAUSE) {
          set({ problem: error instanceof Error ? error.message : 'The voice server did not answer.' });
          letGo();
        }
      }).finally(() => { asked.delete(job); pump(); });
    }
  };
  // Every line still waiting is read by the device's own voice instead.
  const letGo = () => { for (const job of queue.splice(0)) { clips.delete(job.key); job.resolve(undefined); } };
  // Switched off: the lines already asked for are let go too, and whatever the server answers later is ignored.
  const letGoAll = () => {
    letGo();
    for (const job of asked) { job.letGo = true; clips.delete(job.key); job.resolve(undefined); }
    // Their places are free at once: a request that never answers cannot keep new lines from being asked.
    asked.clear();
  };

  const ask = (line: ReadAloudLine, voice: string, first: boolean) => {
    const key = `${voice}\n${line.text}`;
    const known = clips.get(key);
    if (known) return known;
    let resolve!: (url: string | undefined) => void;
    const promise = new Promise<string | undefined>(settle => { resolve = settle; });
    clips.set(key, promise);
    const job: Job = { key, text: line.text, voice, resolve };
    // The line being read goes to the front; the lines after it follow in order.
    if (first) queue.unshift(job); else queue.push(job);
    return promise;
  };

  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setOn(on) {
      try { if (on) preferences?.write(KOKORO_NARRATION_PREFERENCE_KEY, 'on'); else preferences?.remove(KOKORO_NARRATION_PREFERENCE_KEY); } catch { /* remembered for this visit only */ }
      failures = 0;
      set({ on, problem: undefined });
      if (!on) letGoAll();
    },
    clip(line, upcoming, speakerOf) {
      if (!state.on || state.problem) return undefined;
      const voiceOf = (each: ReadAloudLine) => kokoroVoice(each, speakerOf?.(each));
      // Lines waiting from somewhere the reader has left (a skip, another chapter) are let go.
      const wanted = new Set([line, ...upcoming].map(each => `${voiceOf(each)}\n${each.text}`));
      for (let at = queue.length - 1; at >= 0; at -= 1) {
        if (wanted.has(queue[at].key)) continue;
        const [dropped] = queue.splice(at, 1);
        clips.delete(dropped.key);
        dropped.resolve(undefined);
      }
      const clip = ask(line, voiceOf(line), true);
      for (const next of upcoming) ask(next, voiceOf(next), false);
      pump();
      return clip;
    },
  };
}

/** The narration's state, for a component. */
export const useKokoroNarrationState = (narration: KokoroNarration): KokoroNarrationState =>
  useSyncExternalStore(narration.subscribe, narration.getState, narration.getState);

/** Kokoro as the Reader's setting and voice, for the app and its Workshop preview. */
export function useKokoroNarrationService(narration: KokoroNarration) {
  const state = useKokoroNarrationState(narration);
  return useMemo(() => ({
    name: 'Kokoro voices', on: state.on, setOn: narration.setOn,
    status: (english: boolean) => kokoroNarrationStatus(state, english), clip: narration.clip,
  }), [state, narration]);
}

/** One line saying where Kokoro stands, for Reader Settings. */
export function kokoroNarrationStatus(state: KokoroNarrationState, english: boolean): string {
  if (!english) return 'Kokoro reads English. This story is read by your device\'s own voice.';
  if (!state.on) return 'Natural voices for every line, in place of your device\'s robotic one. Each line is made once on SEIHouse\'s voice server and kept for every reader.';
  if (state.problem) return `The voice server stopped answering, so your device's own voice reads on. Switch Kokoro off and on to try again. ${state.problem}`.trim();
  const heard = state.made + state.kept;
  if (!heard) return 'On. Press Listen: the first line can take a few seconds while the voice server wakes.';
  return `On. ${heard} ${heard === 1 ? 'line' : 'lines'} so far: ${state.kept} already kept, ${state.made} made for you.`;
}
