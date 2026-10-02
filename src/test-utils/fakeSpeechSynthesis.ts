/**
 * A stand-in for the browser's speech (`speechSynthesis` and
 * `SpeechSynthesisUtterance`), which jsdom and headless browsers lack or
 * leave without voices. Lines never start or end on their own: a test moves
 * them with `start`, `finish` and `fail`. `cancelStyle` copies how each
 * browser reports a cancelled line: Chrome with an `interrupted` error,
 * Safari with an `end` event.
 */

export interface FakeVoice {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export interface FakeUtterance {
  text: string;
  voice: FakeVoice | null;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  onstart: ((event: unknown) => void) | null;
  onend: ((event: unknown) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onboundary: ((event: unknown) => void) | null;
}

export const fakeVoice = (name: string, lang: string, extra: Partial<FakeVoice> = {}): FakeVoice =>
  ({ voiceURI: `fake:${name}`, name, lang, localService: true, default: false, ...extra });

/** Apple-like voices: Daniel, Rishi and Samantha for English, plus a novelty voice and two other languages. */
export const FAKE_APPLE_VOICES: readonly FakeVoice[] = [
  fakeVoice('Samantha', 'en-US', { default: true }), fakeVoice('Bubbles', 'en-US'), fakeVoice('Daniel', 'en-GB'),
  fakeVoice('Rishi', 'en-IN'), fakeVoice('Kyoko', 'ja-JP'), fakeVoice('Yuna', 'ko-KR'),
];

export function createFakeSpeechSynthesis({ voices = FAKE_APPLE_VOICES, cancelStyle = 'chrome' }: {
  voices?: readonly FakeVoice[]; cancelStyle?: 'chrome' | 'safari';
} = {}) {
  let available = [...voices];
  let queue: FakeUtterance[] = [];
  let current: FakeUtterance | undefined;
  const listeners = new Set<() => void>();
  const spoken: FakeUtterance[] = [];
  let cancels = 0;

  class Utterance implements FakeUtterance {
    voice: FakeVoice | null = null;
    lang = '';
    rate = 1;
    pitch = 1;
    volume = 1;
    onstart: FakeUtterance['onstart'] = null;
    onend: FakeUtterance['onend'] = null;
    onerror: FakeUtterance['onerror'] = null;
    onboundary: FakeUtterance['onboundary'] = null;
    constructor(public text: string) {}
  }

  const advance = () => {
    current = queue.shift();
    synth.speaking = Boolean(current);
  };

  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => available as unknown as SpeechSynthesisVoice[],
    addEventListener: (type: string, listener: () => void) => { if (type === 'voiceschanged') listeners.add(listener); },
    removeEventListener: (type: string, listener: () => void) => { if (type === 'voiceschanged') listeners.delete(listener); },
    speak: (utterance: FakeUtterance) => {
      spoken.push(utterance);
      queue.push(utterance);
      if (!current) advance();
    },
    cancel: () => {
      cancels += 1;
      const dropped = [current, ...queue].filter((item): item is FakeUtterance => Boolean(item));
      queue = [];
      current = undefined;
      synth.speaking = false;
      for (const utterance of dropped) {
        if (cancelStyle === 'safari') utterance.onend?.({});
        else utterance.onerror?.({ error: 'interrupted' });
      }
    },
    pause: () => undefined,
    resume: () => undefined,
  };

  return {
    speechSynthesis: synth as unknown as SpeechSynthesis,
    SpeechSynthesisUtterance: Utterance as unknown as typeof SpeechSynthesisUtterance,
    /** Every line handed to speech, in order. */
    spoken,
    get cancels() { return cancels; },
    /** The line being spoken now. */
    get current() { return current; },
    start() { current?.onstart?.({}); },
    /** Ends the current line naturally and moves to the next queued one. */
    finish() {
      const done = current;
      advance();
      done?.onend?.({});
    },
    fail(error: string) {
      const failed = current;
      advance();
      failed?.onerror?.({ error });
    },
    setVoices(next: readonly FakeVoice[]) {
      available = [...next];
      listeners.forEach(listener => listener());
    },
  };
}

export type FakeSpeechSynthesis = ReturnType<typeof createFakeSpeechSynthesis>;

/** Installs the stand-in on the global scope, returning it and a function that removes it. */
export function installFakeSpeechSynthesis(options?: Parameters<typeof createFakeSpeechSynthesis>[0]) {
  const fake = createFakeSpeechSynthesis(options);
  const scope = globalThis as Record<string, unknown>;
  const previous = { speechSynthesis: scope.speechSynthesis, SpeechSynthesisUtterance: scope.SpeechSynthesisUtterance };
  scope.speechSynthesis = fake.speechSynthesis;
  scope.SpeechSynthesisUtterance = fake.SpeechSynthesisUtterance;
  const uninstall = () => {
    if (previous.speechSynthesis === undefined) delete scope.speechSynthesis; else scope.speechSynthesis = previous.speechSynthesis;
    if (previous.SpeechSynthesisUtterance === undefined) delete scope.SpeechSynthesisUtterance; else scope.SpeechSynthesisUtterance = previous.SpeechSynthesisUtterance;
  };
  return { fake, uninstall };
}
