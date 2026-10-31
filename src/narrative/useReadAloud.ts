import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeSenLanguageCode } from '../lib/language';
import type { ReaderPreferenceStorage } from './readerRuntime';
import {
  READ_ALOUD_ROLES,
  estimateSpeechMs,
  readAloudSentenceKey,
  readReadAloudPreferences,
  resolveReadAloudVoices,
  speechLanguageTag,
  toStoredReadAloudVoice,
  voicesForLanguage,
  writeReadAloudPreferences,
  type ReadAloudLine,
  type ReadAloudPreferences,
  type ReadAloudRole,
  type ReadAloudScript,
  type ReadAloudVoice,
  type ReadAloudVoiceChoice,
  type ReadAloudVoicePicks,
} from './readAloud';

// ─── The speech a player drives ─────────────────────────────────────────────

export interface SpeechRequest {
  text: string;
  /** The voice to read with; without one, the device picks a voice for `lang`. */
  voice?: ReadAloudVoice;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
}

export interface SpeechEvents {
  onStart(): void;
  onEnd(): void;
  onError(error: string): void;
  /** Any sign the line is still being spoken (a word boundary). */
  onProgress?(): void;
}

/** Speech a Read Aloud player drives: the browser's by default, a stand-in in tests. */
export interface SpeechEngine {
  readonly supported: boolean;
  getVoices(): ReadAloudVoice[];
  onVoicesChanged(listener: () => void): () => void;
  /** Speaks one line. Events from a cancelled line never arrive. */
  speak(request: SpeechRequest, events: SpeechEvents): void;
  cancel(): void;
  isSpeaking(): boolean;
}

type SpeechScope = { speechSynthesis?: SpeechSynthesis; SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance };

/**
 * The browser's own speech (Web Speech API). It keeps the line being spoken
 * referenced, because Chrome can drop an unreferenced utterance before it
 * ends, and detaches a line's handlers before cancelling it, so a
 * cancellation is never mistaken for a line finishing. Like production, it
 * clears the browser's queue before every line, so a line the browser still
 * holds (an online voice that never reported its end) never delays the next.
 */
export function createWebSpeechEngine(scope: SpeechScope = globalThis as SpeechScope): SpeechEngine {
  const synth = scope.speechSynthesis;
  const Utterance = scope.SpeechSynthesisUtterance;
  const supported = Boolean(synth && Utterance);
  let current: SpeechSynthesisUtterance | undefined;
  const detach = () => {
    if (current) current.onstart = current.onend = current.onerror = current.onboundary = null;
    current = undefined;
  };
  const toVoice = (voice: SpeechSynthesisVoice): ReadAloudVoice => ({
    voiceURI: voice.voiceURI, name: voice.name, lang: voice.lang, localService: voice.localService, default: voice.default,
  });
  return {
    supported,
    getVoices: () => (supported ? synth!.getVoices().map(toVoice) : []),
    onVoicesChanged(listener) {
      if (!supported || typeof synth!.addEventListener !== 'function') return () => undefined;
      synth!.addEventListener('voiceschanged', listener);
      return () => synth!.removeEventListener('voiceschanged', listener);
    },
    speak(request, events) {
      if (!supported) return;
      detach();
      synth!.cancel();
      const utterance = new Utterance!(request.text);
      const native = request.voice && synth!.getVoices().find(voice => voice.voiceURI === request.voice!.voiceURI);
      if (native) utterance.voice = native;
      // Some Android voices honour only the language, so it always travels.
      utterance.lang = native?.lang ?? request.voice?.lang ?? request.lang;
      utterance.rate = request.rate;
      utterance.pitch = request.pitch;
      utterance.volume = request.volume;
      utterance.onstart = () => events.onStart();
      utterance.onend = () => events.onEnd();
      utterance.onerror = event => events.onError(event.error);
      utterance.onboundary = () => events.onProgress?.();
      current = utterance;
      synth!.speak(utterance);
    },
    cancel() {
      detach();
      if (supported) synth!.cancel();
    },
    isSpeaking: () => Boolean(supported && (synth!.speaking || synth!.pending)),
  };
}

/** The device's voices without the ones that failed this session. */
const usableVoices = (voices: readonly ReadAloudVoice[], failed: ReadonlyMap<string, string>) =>
  (failed.size ? voices.filter(voice => !failed.has(voice.voiceURI)) : voices);

// ─── The player ─────────────────────────────────────────────────────────────

/**
 * `ended` means the chapter was read to its end while the reader was still
 * listening: the next chapter they open is read from its title.
 */
export type ReadAloudStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface UseReadAloudOptions {
  /** Changes whenever the text to read changes: another chapter, or new speaker records. */
  scriptKey: string;
  /** Builds the script for `scriptKey`. Called at the first Listen, never on every render. */
  buildScript: () => ReadAloudScript;
  /** The story's language (a SEN language code). */
  language?: string;
  /** Host-owned storage for the reader's voices and speed. */
  preferences?: ReaderPreferenceStorage;
  /** The host's preferred voices; SEN prefers none. */
  picks?: ReadAloudVoicePicks;
  /**
   * True while something covers the chapter (another page, the writing
   * screen): speech stops, and resumes on its own when it is uncovered if the
   * reader was still listening.
   */
  suspended?: boolean;
  engine?: SpeechEngine;
}

export interface ReadAloud {
  supported: boolean;
  status: ReadAloudStatus;
  /** True from Listen or Resume until Pause or Stop: the reader wants to hear the story. */
  listening: boolean;
  /** The line being read or paused on; the playhead a Reader lights and follows. */
  line?: ReadAloudLine;
  lineIndex: number;
  /** A short message for the reader, e.g. when the browser needs another tap. */
  notice?: string;
  /** The last voice that failed on this device: which, why, and what reads its lines now. */
  voiceProblem?: string;
  /** Every voice on this device. */
  voices: readonly ReadAloudVoice[];
  /** The voices that can read the story's language, best first. */
  languageVoices: readonly ReadAloudVoice[];
  /** The voice each role reads with. */
  choice: ReadAloudVoiceChoice;
  rate: number;
  /** The script for the current text, built on first use. */
  script(): ReadAloudScript;
  play(fromLine?: number): void;
  pause(): void;
  resume(): void;
  /** Temporarily yield narration; release resumes only if no later reader action superseded it. */
  interrupt(): (resume: boolean) => void;
  stop(): void;
  /** Moves to the start of the next (1) or previous (-1) sentence. */
  skip(direction: 1 | -1): void;
  /** Chooses a role's voice for this language; undefined returns it to the default. */
  setVoice(role: ReadAloudRole, voice: ReadAloudVoice | undefined): void;
  resetVoices(): void;
  setRate(rate: number): void;
  /** Speaks a sample line in a role's voice, pausing the chapter first. */
  preview(role: ReadAloudRole): void;
}

/** The prototype's narration volume. */
export const READ_ALOUD_VOLUME = 0.9;
const START_TIMEOUT_MS = { first: 8_000, next: 4_000 } as const;
/** Production's pause between one line's end and the next line: the browser settles before it speaks again. */
const LINE_GAP_MS = 50;
const WATCHDOG = { factor: 2, paddingMs: 5_000, rechecks: 3 } as const;
/** Away this long with no word spoken, the device stopped (a locked phone): the line is read again. */
const HIDDEN_RESTART_MS = 2_000;
const TAP_AGAIN = 'Tap Resume to keep listening.';

interface PlayerState {
  status: ReadAloudStatus;
  listening: boolean;
  index: number;
  token: number;
  notice?: string;
  scriptKey: string;
  script?: ReadAloudScript;
  started: boolean;
  firstLine: boolean;
  suspended: boolean;
  lastEventAt: number;
  hiddenAt: number;
  timers: Set<ReturnType<typeof setTimeout>>;
}

/** Who a role's lines belong to, for the reader. */
const ROLE_LINES: Record<ReadAloudRole, string> = { narrator: 'the narration', protagonist: 'the main character\'s lines', side: 'the side characters\' lines' };

const sameVoices = (left: readonly ReadAloudVoice[], right: readonly ReadAloudVoice[]) =>
  left.length === right.length && left.every((voice, index) => voice.voiceURI === right[index].voiceURI && voice.lang === right[index].lang);

/**
 * Reads a chapter aloud with three voices. Pause cancels the line and Resume
 * reads it again from its start, which every browser does reliably where
 * native pause does not. A changed voice or speed applies from the next line,
 * so nothing restarts mid-line. The first line is spoken inside the Listen tap
 * itself, which iOS requires. A voice that fails on this device is set aside
 * for the session and named to the reader; its role takes the next free voice,
 * never silently the narrator's.
 */
export function useReadAloud({
  scriptKey, buildScript, language = 'en', preferences, picks, suspended = false, engine: suppliedEngine,
}: UseReadAloudOptions): ReadAloud {
  const engine = useMemo(() => suppliedEngine ?? createWebSpeechEngine(), [suppliedEngine]);
  const [voices, setVoices] = useState<readonly ReadAloudVoice[]>(() => engine.getVoices());
  const [prefs, setPrefs] = useState<ReadAloudPreferences>(() => readReadAloudPreferences(preferences));
  const [view, setView] = useState<Pick<PlayerState, 'status' | 'listening' | 'index' | 'notice'>>({ status: 'idle', listening: false, index: 0 });
  // Voices that failed on this device this session (URI → the browser's error), and the reader's note about the last one.
  const [failed, setFailed] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [voiceProblem, setVoiceProblem] = useState<string>();
  const failedRef = useRef(failed);
  const choice = useMemo(() => resolveReadAloudVoices(usableVoices(voices, failed), language, prefs, picks), [voices, failed, language, prefs, picks]);
  const languageVoices = useMemo(() => voicesForLanguage(voices, language), [voices, language]);

  const live = useRef<PlayerState>({
    status: 'idle', listening: false, index: 0, token: 0, scriptKey, started: false, firstLine: true,
    suspended, lastEventAt: 0, hiddenAt: 0, timers: new Set(),
  });
  // Speech callbacks outlive renders: they read the latest values from here.
  const latest = useRef({ voices, prefs, picks, rate: prefs.rate, language, buildScript });
  latest.current = { voices, prefs, picks, rate: prefs.rate, language, buildScript };

  /** The voice each role reads with right now, without the voices that failed (even before the next render). */
  const castNow = useCallback((): ReadAloudVoiceChoice => {
    const { voices: all, language: storyLanguage, prefs: saved, picks: preferred } = latest.current;
    return resolveReadAloudVoices(usableVoices(all, failedRef.current), storyLanguage, saved, preferred);
  }, []);

  /** Sets a failed voice aside for the session and tells the reader which voice reads its role now. */
  const setAside = useCallback((voice: ReadAloudVoice, error: string, role: ReadAloudRole) => {
    failedRef.current = new Map(failedRef.current).set(voice.voiceURI, error);
    setFailed(failedRef.current);
    const next = castNow()[role];
    const instead = next ? `${next.name} reads ${ROLE_LINES[role]} instead.` : `The device chooses a voice for ${ROLE_LINES[role]} instead.`;
    const message = `${voice.name} couldn't speak on this device (${error}). ${instead}`;
    console.warn(`[Read Aloud] ${message}`);
    setVoiceProblem(message);
  }, [castNow]);

  const publish = useCallback(() => {
    const { status, listening, index, notice } = live.current;
    setView({ status, listening, index, notice });
  }, []);

  const later = useCallback((run: () => void, delay: number) => {
    const timers = live.current.timers;
    const timer = setTimeout(() => { timers.delete(timer); run(); }, delay);
    timers.add(timer);
  }, []);

  const clearTimers = useCallback(() => {
    live.current.timers.forEach(clearTimeout);
    live.current.timers.clear();
  }, []);

  /** Silences the current line; its events are ignored from here on. */
  const halt = useCallback(() => {
    live.current.token += 1;
    clearTimers();
    engine.cancel();
  }, [clearTimers, engine]);

  const scriptFor = useCallback((): ReadAloudScript => {
    const state = live.current;
    if (!state.script) {
      try { state.script = latest.current.buildScript(); } catch { state.script = { version: 0, lines: [] }; }
    }
    return state.script;
  }, []);

  const pauseForTap = useCallback(() => {
    const state = live.current;
    state.token += 1;
    clearTimers();
    engine.cancel();
    state.status = 'paused';
    state.listening = false;
    state.notice = TAP_AGAIN;
    publish();
  }, [clearTimers, engine, publish]);

  /** Speaks a line now, or after `wait` ms: after a cancellation, or production's gap between lines. */
  const speakAt = useCallback(function speakAt(index: number, wait?: number) {
    const state = live.current;
    const lines = scriptFor().lines;
    clearTimers();
    const token = ++state.token;
    const line = lines[index];
    if (!line) {
      state.status = 'ended';
      state.index = lines.length;
      state.notice = undefined;
      publish();
      return;
    }
    state.status = 'playing';
    state.index = index;
    state.started = false;
    state.notice = undefined;
    publish();

    const watch = (checks: number) => later(() => {
      if (token !== state.token) return;
      if (engine.isSpeaking() && checks < WATCHDOG.rechecks) { watch(checks + 1); return; }
      // The line never reported its end: go on to the next one.
      engine.cancel();
      speakAt(index + 1, 0);
    }, (estimateSpeechMs(line.text) / latest.current.rate) * WATCHDOG.factor + WATCHDOG.paddingMs);

    const begin = () => {
      if (token !== state.token) return;
      const { rate, language: storyLanguage } = latest.current;
      const voice = castNow()[line.role];
      engine.speak({ text: line.text, voice, lang: voice?.lang ?? speechLanguageTag(storyLanguage), rate, pitch: 1, volume: READ_ALOUD_VOLUME }, {
        onStart: () => {
          if (token !== state.token) return;
          state.started = true;
          state.lastEventAt = Date.now();
          watch(0);
        },
        onProgress: () => { if (token === state.token) state.lastEventAt = Date.now(); },
        onEnd: () => {
          if (token !== state.token) return;
          state.lastEventAt = Date.now();
          state.firstLine = false;
          speakAt(index + 1, LINE_GAP_MS);
        },
        onError: error => {
          if (token !== state.token || error === 'interrupted' || error === 'canceled') return;
          if (error === 'not-allowed') { pauseForTap(); return; }
          // A voice that fails is set aside and the line read again by its role's next voice; a line
          // that fails with no voice to blame is skipped. Each retry sets one more voice aside, so it ends.
          if (voice && !failedRef.current.has(voice.voiceURI)) { setAside(voice, error, line.role); speakAt(index, 0); return; }
          speakAt(index + 1, 0);
        },
      });
      later(() => {
        if (token !== state.token || state.started) return;
        if (engine.isSpeaking()) { watch(0); return; }
        // Nothing began: the browser wants a fresh tap, or its speech died.
        pauseForTap();
      }, state.firstLine ? START_TIMEOUT_MS.first : START_TIMEOUT_MS.next);
    };
    // A line spoken right after a cancellation can be dropped by Chrome; the first one is spoken at once (iOS).
    if (wait === undefined) begin();
    else later(begin, wait);
  }, [castNow, clearTimers, engine, later, pauseForTap, publish, scriptFor, setAside]);

  const play = useCallback((fromLine = 0) => {
    if (!engine.supported) return;
    const state = live.current;
    const lines = scriptFor().lines;
    if (!lines.length) return;
    const busy = state.status === 'playing' || engine.isSpeaking();
    if (busy) halt();
    state.listening = true;
    state.firstLine = true;
    speakAt(Math.max(0, Math.min(Math.trunc(fromLine), lines.length - 1)), busy ? 0 : undefined);
  }, [engine, halt, scriptFor, speakAt]);

  const pause = useCallback(() => {
    const state = live.current;
    if (state.status !== 'playing' && state.status !== 'paused') return;
    halt();
    state.status = 'paused';
    state.listening = false;
    publish();
  }, [halt, publish]);

  const resume = useCallback(() => {
    const state = live.current;
    if (state.status !== 'paused' || !engine.supported) return;
    const busy = engine.isSpeaking();
    if (busy) halt();
    state.listening = true;
    speakAt(state.index, busy ? 0 : undefined);
  }, [engine, halt, speakAt]);

  const interrupt = useCallback(() => {
    const state = live.current;
    const playing = state.status === 'playing';
    if (playing) pause();
    const { token, scriptKey: key, index } = state;
    let released = false;
    return (shouldResume: boolean) => {
      if (released) return;
      released = true;
      const current = live.current;
      if (shouldResume && playing && current.token === token && current.scriptKey === key
        && current.index === index && current.status === 'paused' && !current.suspended) resume();
    };
  }, [pause, resume]);

  const stop = useCallback(() => {
    const state = live.current;
    halt();
    state.status = 'idle';
    state.listening = false;
    state.index = 0;
    state.notice = undefined;
    publish();
  }, [halt, publish]);

  const skip = useCallback((direction: 1 | -1) => {
    const state = live.current;
    if (!engine.supported) return;
    state.token += 1;
    const lines = scriptFor().lines;
    if (!lines.length) return;
    let target = Math.min(state.index, lines.length);
    if (direction > 0) {
      const current = lines[target] && readAloudSentenceKey(lines[target]);
      while (target < lines.length && readAloudSentenceKey(lines[target]) === current) target += 1;
    } else {
      const sentenceStart = (from: number) => {
        let start = from;
        while (start > 0 && readAloudSentenceKey(lines[start - 1]) === readAloudSentenceKey(lines[from])) start -= 1;
        return start;
      };
      // From the end, back to the last sentence; otherwise to the sentence before this one.
      if (target >= lines.length) target = sentenceStart(lines.length - 1);
      else {
        const start = sentenceStart(target);
        target = start > 0 ? sentenceStart(start - 1) : 0;
      }
    }
    if (state.status === 'playing') {
      halt();
      speakAt(target, 0);
      return;
    }
    if (target >= lines.length) return;
    state.index = target;
    state.status = 'paused';
    publish();
  }, [engine, halt, publish, scriptFor, speakAt]);

  const updateVoices = useCallback((role: ReadAloudRole | undefined, voice: ReadAloudVoice | undefined) => {
    setPrefs(current => {
      const code = normalizeSenLanguageCode(latest.current.language);
      const roles = { ...(current.voices[code] ?? {}) };
      if (!role) for (const each of READ_ALOUD_ROLES) delete roles[each];
      else if (voice) roles[role] = toStoredReadAloudVoice(voice);
      else delete roles[role];
      const voicesByLanguage = { ...current.voices };
      if (Object.keys(roles).length) voicesByLanguage[code] = roles;
      else delete voicesByLanguage[code];
      return { ...current, voices: voicesByLanguage };
    });
  }, []);

  const setVoice = useCallback((role: ReadAloudRole, voice: ReadAloudVoice | undefined) => {
    // A reader who chooses a voice that failed gets to try it again.
    if (voice && failedRef.current.has(voice.voiceURI)) {
      const kept = new Map(failedRef.current);
      kept.delete(voice.voiceURI);
      failedRef.current = kept;
      setFailed(kept);
      setVoiceProblem(undefined);
    }
    updateVoices(role, voice);
  }, [updateVoices]);
  const resetVoices = useCallback(() => updateVoices(undefined, undefined), [updateVoices]);
  const setRate = useCallback((rate: number) => {
    if (!Number.isFinite(rate)) return;
    setPrefs(current => ({ ...current, rate: Math.min(2, Math.max(0.5, rate)) }));
  }, []);

  const preview = useCallback((role: ReadAloudRole) => {
    if (!engine.supported) return;
    const state = live.current;
    const busy = engine.isSpeaking();
    if (state.status === 'playing') {
      halt();
      state.status = 'paused';
      state.listening = false;
      publish();
    } else if (busy) halt();
    const lines = scriptFor().lines;
    const { rate, language: storyLanguage } = latest.current;
    const voice = castNow()[role];
    const sample = (lines.find(line => line.role === role) ?? lines[0])?.text ?? voice?.name;
    if (!sample) return;
    const token = ++state.token;
    const say = () => {
      if (token !== state.token) return;
      engine.speak({ text: sample, voice, lang: voice?.lang ?? speechLanguageTag(storyLanguage), rate, pitch: 1, volume: READ_ALOUD_VOLUME },
        { onStart: () => undefined, onEnd: () => undefined, onError: () => undefined });
    };
    if (busy) later(say, 0);
    else say();
  }, [castNow, engine, halt, later, publish, scriptFor]);

  // Voices arrive late on most devices, and iOS may never announce them.
  useEffect(() => {
    if (!engine.supported) return undefined;
    const load = () => {
      const next = engine.getVoices();
      setVoices(current => (sameVoices(current, next) ? current : next));
    };
    load();
    const unsubscribe = engine.onVoicesChanged(load);
    const polls = [250, 1_000, 3_000].map(delay => setTimeout(load, delay));
    return () => { unsubscribe(); polls.forEach(clearTimeout); };
  }, [engine]);

  // The reader's choices are saved where the host keeps preferences.
  const storage = useRef(preferences);
  const skipSave = useRef(true);
  useEffect(() => {
    if (storage.current === preferences) return;
    storage.current = preferences;
    skipSave.current = true;
    setPrefs(readReadAloudPreferences(preferences));
  }, [preferences]);
  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return; }
    writeReadAloudPreferences(storage.current, prefs);
  }, [prefs]);

  // Another chapter, or something covering this one: speech follows the reader.
  useEffect(() => {
    const state = live.current;
    state.suspended = suspended;
    if (state.scriptKey !== scriptKey) {
      state.scriptKey = scriptKey;
      state.script = undefined;
      if (state.status !== 'idle') {
        halt();
        state.index = 0;
        state.status = 'paused';
      }
    }
    if (suspended) {
      if (state.status === 'playing') { halt(); state.status = 'paused'; }
    } else if (state.listening && (state.status === 'paused' || (state.status === 'ended' && state.index < scriptFor().lines.length))) {
      // Still listening: carry on with the same line, or a new chapter from its title.
      state.firstLine = true;
      speakAt(state.index, 0);
      return;
    }
    publish();
  }, [halt, publish, scriptFor, scriptKey, speakAt, suspended]);

  // A locked phone stops speaking without a word: read the line again on return.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      const state = live.current;
      if (document.visibilityState === 'hidden') { state.hiddenAt = Date.now(); return; }
      if (state.status !== 'playing' || !state.hiddenAt) return;
      const away = Date.now() - state.hiddenAt;
      const line = scriptFor().lines[state.index];
      const lineMs = line ? estimateSpeechMs(line.text) / latest.current.rate : 0;
      const stalled = !engine.isSpeaking() || away > lineMs + HIDDEN_RESTART_MS;
      if (away < HIDDEN_RESTART_MS || state.lastEventAt > state.hiddenAt || !stalled) return;
      halt();
      speakAt(state.index, 0);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [engine, halt, scriptFor, speakAt]);

  // Leaving the Reader silences it.
  useEffect(() => () => {
    live.current.token += 1;
    live.current.timers.forEach(clearTimeout);
    live.current.timers.clear();
    engine.cancel();
  }, [engine]);

  const script = live.current.script;
  const line = view.status === 'playing' || view.status === 'paused' ? script?.lines[view.index] : undefined;
  return {
    supported: engine.supported,
    status: view.status,
    listening: view.listening,
    line,
    lineIndex: view.index,
    notice: view.notice,
    voiceProblem,
    voices,
    languageVoices,
    choice,
    rate: prefs.rate,
    script: scriptFor,
    play, pause, resume, interrupt, stop, skip, setVoice, resetVoices, setRate, preview,
  };
}
