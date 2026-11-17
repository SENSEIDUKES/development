import { useMemo, useSyncExternalStore } from 'react';
import type { ReadAloudLine, ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import type { KokoroDevice, KokoroWorkerMessage, KokoroWorkerRequest } from './kokoroWorker';

/**
 * Narration made on the reader's own device with Kokoro (SENSEI, 2026-11-16):
 * the browser downloads the voice model once, then every line Listen reads is
 * turned into audio here, with no charge for any of it. A line with a paid
 * cast voice keeps that voice; this reads everything else, where the device's
 * own robotic voice read before.
 *
 * The three voices are from SEIHouse's first Kokoro cast, one for each part
 * Listen already tells apart. English only: a story in another language is
 * read by the device.
 */
export const KOKORO_ROLE_VOICES: Readonly<Record<ReadAloudLine['role'], string>> = {
  /** Elder Tome Narrator. */
  narrator: 'bm_lewis',
  /** Wandering Main Disciple. */
  protagonist: 'am_puck',
  /** Loyal Young Disciple. */
  side: 'am_fenrir',
};

export const DEVICE_NARRATION_PREFERENCE_KEY = 'device-narration';
/**
 * Set while the voice is starting or making a line, and cleared when it is
 * done. Found on the next visit, it means the page closed in the middle: on an
 * iPhone that is the browser closing a page that ran out of memory, which it
 * repeats on every reload. Kokoro is then switched off so the app can open.
 */
export const DEVICE_NARRATION_WORKING_KEY = 'device-narration-working';
/** The most clips kept at once: a chapter's worth behind and ahead of the reader. */
const CLIPS_KEPT = 120;

export interface DeviceNarrationState {
  on: boolean;
  /** Where the voice model stands: not asked for, downloading, ready, or why it failed. */
  model: 'idle' | 'loading' | 'ready' | 'failed';
  /** Whether this browser has a graphics chip the voice can run on: the larger, faster download. Unknown until asked. */
  graphicsChip?: boolean;
  /** What the voice runs on, once it is ready: the graphics chip, or the processor. */
  device?: KokoroDevice;
  /** How much of the model has been downloaded, 0 to 1. */
  progress?: number;
  /** How many seconds of speech this device makes in one second, over the lines made so far. */
  speed?: number;
  problem?: string;
  /** Switched off because the page closed while the voice was working, last visit. */
  stopped?: boolean;
}

/** The part of a Worker the narration talks to; a stand-in in tests. */
export interface KokoroWorkerLike {
  postMessage(message: KokoroWorkerRequest): void;
  onmessage: ((event: { data: KokoroWorkerMessage }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  terminate(): void;
}

export interface DeviceNarration {
  getState(): DeviceNarrationState;
  subscribe(listener: () => void): () => void;
  /** Turns it on (and starts the download) or off. Remembered on the device. */
  setOn(on: boolean): void;
  /**
   * The clip for a line: its address when made, a promise while it is being
   * made, or nothing when this cannot read it (off, not ready, another
   * language). The lines that follow are made ahead.
   */
  clip(line: ReadAloudLine, upcoming: readonly ReadAloudLine[]): string | Promise<string | undefined> | undefined;
}

interface Job { key: string; text: string; voice: string; resolve: (url: string | undefined) => void; letGo?: boolean }

const browserWorker = (): KokoroWorkerLike =>
  new Worker(new URL('./kokoroWorker.ts', import.meta.url), { type: 'module' }) as unknown as KokoroWorkerLike;

/**
 * A phone or tablet. Its browser is given far less memory than a computer's:
 * an iPhone closed the app while loading the graphics-chip model (SENSEI,
 * 2026-11-17), so a phone always takes the small model on its processor.
 */
const isPhone = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const agent = navigator.userAgent ?? '';
  // An iPad says it is a Mac; only its touch screen tells them apart.
  return /iPhone|iPad|iPod|Android|Mobile/i.test(agent) || (/Macintosh/.test(agent) && (navigator.maxTouchPoints ?? 0) > 1);
};

/** Whether the voice should run on a graphics chip: never on a phone, and only where the browser really hands one over (some say they have one and give none). */
const browserGraphicsChip = async (): Promise<boolean> => {
  if (isPhone()) return false;
  const gpu = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try { return Boolean(await gpu.requestAdapter()); } catch { return false; }
};

export function createDeviceNarration({ preferences, createWorker = browserWorker, hasGraphicsChip = browserGraphicsChip, toUrl = (wav: ArrayBuffer) => URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })), revokeUrl = (url: string) => URL.revokeObjectURL(url) }: {
  preferences?: ReaderPreferenceStorage;
  createWorker?: () => KokoroWorkerLike;
  hasGraphicsChip?: () => Promise<boolean>;
  toUrl?: (wav: ArrayBuffer) => string;
  revokeUrl?: (url: string) => void;
}): DeviceNarration {
  const read = (key: string) => { try { return preferences?.read(key) ?? null; } catch { return null; } };
  const forget = (key: string) => { try { preferences?.remove(key); } catch { /* nothing more to do */ } };
  // Working when the page last closed: it was closed under the voice, so the voice stays off.
  const stopped = read(DEVICE_NARRATION_WORKING_KEY) !== null;
  if (stopped) { forget(DEVICE_NARRATION_WORKING_KEY); forget(DEVICE_NARRATION_PREFERENCE_KEY); }
  let state: DeviceNarrationState = stopped ? { on: false, model: 'idle', stopped } : { on: read(DEVICE_NARRATION_PREFERENCE_KEY) === 'on', model: 'idle' };
  const listeners = new Set<() => void>();
  const set = (next: Partial<DeviceNarrationState>) => { state = { ...state, ...next }; listeners.forEach(listener => listener()); };

  const graphicsChip = hasGraphicsChip().catch(() => false);
  void graphicsChip.then(chip => set({ graphicsChip: chip }));
  const working = (busy: boolean) => {
    try { if (busy) preferences?.write(DEVICE_NARRATION_WORKING_KEY, String(Date.now())); else preferences?.remove(DEVICE_NARRATION_WORKING_KEY); } catch { /* the guard is lost for this visit only */ }
  };

  let worker: KokoroWorkerLike | undefined;
  // Each line's clip, by its voice and words: the same words in the same voice are made once.
  const clips = new Map<string, string | Promise<string | undefined>>();
  const queue: Job[] = [];
  let current: Job | undefined;
  let nextId = 0;
  let made = { audioSeconds: 0, tookSeconds: 0 };

  const pump = () => {
    if (current || !state.on || state.model !== 'ready' || !worker) return;
    current = queue.shift();
    if (!current) return;
    working(true);
    worker.postMessage({ type: 'speak', id: (nextId += 1), text: current.text, voice: current.voice });
  };
  const finish = (url: string | undefined) => {
    const job = current;
    current = undefined;
    working(false);
    if (job) {
      // A line let go while it was being made (Kokoro switched off) is not kept.
      if (job.letGo) { if (url) revokeUrl(url); }
      else {
        if (url) clips.set(job.key, url); else clips.delete(job.key);
        job.resolve(url);
      }
      // The oldest made clips go first; one still being made is never dropped.
      for (const [key, clip] of clips) {
        if (clips.size <= CLIPS_KEPT) break;
        if (typeof clip === 'string') { clips.delete(key); revokeUrl(clip); }
      }
    }
    pump();
  };

  const load = () => {
    if (state.model === 'loading' || state.model === 'ready') return;
    try {
      worker ??= createWorker();
    } catch {
      set({ model: 'failed', problem: 'This browser cannot run the voice on the device.' });
      return;
    }
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        // Whole percents only: the download reports far more often than the status line changes.
        const progress = data.total ? Math.round((data.loaded / data.total) * 100) / 100 : undefined;
        if (progress !== state.progress) set({ progress });
      }
      else if (data.type === 'ready') { working(false); set({ model: 'ready', device: data.device, progress: 1, problem: undefined }); pump(); }
      else if (data.type === 'failed') { working(false); set({ model: 'failed', problem: data.message }); }
      else if (data.type === 'spoken') {
        made = { audioSeconds: made.audioSeconds + data.audioSeconds, tookSeconds: made.tookSeconds + data.tookMs / 1000 };
        if (made.tookSeconds > 0) set({ speed: made.audioSeconds / made.tookSeconds });
        finish(toUrl(data.wav));
      } else finish(undefined);
    };
    worker.onerror = () => {
      // A worker that broke cannot load again: the next try starts a new one.
      worker?.terminate();
      worker = undefined;
      set({ model: 'failed', problem: 'The voice stopped on this device.' });
      const waiting = [...(current ? [current] : []), ...queue.splice(0)];
      current = undefined;
      working(false);
      for (const job of waiting) { clips.delete(job.key); job.resolve(undefined); }
    };
    set({ model: 'loading', progress: 0, problem: undefined, stopped: undefined });
    const starting = worker;
    void graphicsChip.then(chip => {
      if (worker !== starting) return;
      working(true);
      starting.postMessage({ type: 'load', device: chip ? 'webgpu' : 'wasm' });
    });
  };

  const ask = (line: ReadAloudLine, first: boolean): string | Promise<string | undefined> => {
    const voice = KOKORO_ROLE_VOICES[line.role];
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
      try { if (on) preferences?.write(DEVICE_NARRATION_PREFERENCE_KEY, 'on'); else preferences?.remove(DEVICE_NARRATION_PREFERENCE_KEY); } catch { /* remembered for this visit only */ }
      set({ on });
      if (on) { load(); return; }
      // Off: every line still waiting goes to the device's own voice now, and nothing more is made.
      const waiting = [...(current ? [current] : []), ...queue.splice(0)];
      for (const job of waiting) { job.letGo = true; clips.delete(job.key); job.resolve(undefined); }
    },
    clip(line, upcoming) {
      if (!state.on) return undefined;
      // Remembered from an earlier visit: the model is fetched from the browser's own copy on the first Listen.
      if (state.model === 'idle') load();
      if (state.model !== 'ready') return undefined;
      // Lines waiting from somewhere the reader has left (a skip, another chapter) are let go.
      const wanted = new Set([line, ...upcoming].map(entry => `${KOKORO_ROLE_VOICES[entry.role]}\n${entry.text}`));
      for (let at = queue.length - 1; at >= 0; at -= 1) {
        if (wanted.has(queue[at].key)) continue;
        const [dropped] = queue.splice(at, 1);
        clips.delete(dropped.key);
        dropped.resolve(undefined);
      }
      const clip = ask(line, true);
      for (const next of upcoming) ask(next, false);
      pump();
      return clip;
    },
  };
}

/** The narration's state, for a component. */
export const useDeviceNarrationState = (narration: DeviceNarration): DeviceNarrationState =>
  useSyncExternalStore(narration.subscribe, narration.getState, narration.getState);

/** Kokoro as the Reader's setting and voice, for the app and its Workshop preview. */
export function useDeviceNarrationService(narration: DeviceNarration) {
  const state = useDeviceNarrationState(narration);
  return useMemo(() => ({
    name: 'Kokoro voices', on: state.on, setOn: narration.setOn,
    status: (english: boolean) => deviceNarrationStatus(state, english), clip: narration.clip,
  }), [state, narration]);
}

/** One line saying where the device's voice stands, for Reader Settings. */
export function deviceNarrationStatus(state: DeviceNarrationState, english: boolean): string {
  if (!english) return 'Kokoro reads English. This story is read by your device\'s own voice.';
  if (!state.on && state.stopped) return 'Kokoro was switched off: the app closed while it was working last time, which on a phone means it ran out of memory. Your device\'s own voice reads. You can try it again.';
  if (!state.on) return `Free voices made on this device, in place of its robotic one. Downloads about ${state.graphicsChip ? '330' : '90'} MB once.`;
  if (state.model === 'failed') return `Kokoro could not start here, so your device's own voice reads on. ${state.problem ?? ''}`.trim();
  if (state.model === 'loading') return state.progress ? `Downloading the voice: ${Math.round(state.progress * 100)}%. Your device's own voice reads until it is ready.` : 'Getting the voice ready. Your device\'s own voice reads until then.';
  const on = state.device === 'webgpu' ? 'on its graphics chip' : 'on its processor';
  if (state.model === 'ready') return state.speed
    ? `Ready, ${on}. This device makes ${state.speed.toFixed(1)} seconds of speech a second${state.speed < 1 ? ', slower than it is spoken, so lines will wait' : ''}.`
    : `Ready, ${on}. Press Listen.`;
  return 'On. The voice loads on the first Listen.';
}
