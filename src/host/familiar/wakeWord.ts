import type { FamiliarWakeWord } from '@seihouse/library/familiar';
import { openMicrophoneSession } from './audioSession';

interface Result { isFinal: boolean; 0: { transcript: string } }
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type SpeechScope = { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

/** A browser that ends listening this soon after starting, this many times in a row, cannot keep listening. */
const QUICK_END_MS = 1_500;
const QUICK_ENDS = 5;
/** A pause before listening again after the browser ends it on its own. */
const RESTART_MS = 300;

/**
 * The Familiar's wake word on the device's own speech recognition: free, no
 * account or key. It listens continuously while asked to, starting again
 * whenever the browser ends recognition on its own, and calls `heard` the
 * first time the word is said. The audio goes wherever the browser's
 * recognition sends it; nothing is kept here.
 */
export function createFamiliarWakeWord(scope: SpeechScope | undefined = typeof window === 'undefined' ? undefined : window as SpeechScope): FamiliarWakeWord {
  const Recognizer = scope?.SpeechRecognition ?? scope?.webkitSpeechRecognition;
  return {
    available: Boolean(Recognizer),
    listen(word, language, heard, failure) {
      if (!Recognizer) { failure?.('Speech recognition is not available in this browser.'); return () => undefined; }
      const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      let stopped = false;
      let recognition: Recognition | undefined;
      let restart: ReturnType<typeof setTimeout> | undefined;
      let quickEnds = 0;
      // On an iPhone, music's playback-only mode would refuse the microphone.
      const releaseSession = openMicrophoneSession();
      const stop = () => {
        if (stopped) return;
        stopped = true;
        clearTimeout(restart);
        if (recognition) {
          recognition.onresult = recognition.onerror = recognition.onend = null;
          try { recognition.abort(); } catch { /* already stopped */ }
        }
        releaseSession();
      };
      const begin = () => {
        if (stopped) return;
        const started = Date.now();
        recognition = new Recognizer();
        recognition.lang = language;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = event => {
          for (let index = event.resultIndex; index < event.results.length; index++) {
            if (!pattern.test(event.results[index][0].transcript)) continue;
            stop();
            heard();
            return;
          }
        };
        recognition.onerror = event => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            stop();
            failure?.('Microphone or speech access was denied.');
          }
        };
        recognition.onend = () => {
          if (stopped) return;
          quickEnds = Date.now() - started < QUICK_END_MS ? quickEnds + 1 : 0;
          if (quickEnds >= QUICK_ENDS) { stop(); failure?.('Speech recognition keeps stopping in this browser.'); return; }
          restart = setTimeout(begin, RESTART_MS);
        };
        try { recognition.start(); } catch (error) { stop(); failure?.(error instanceof Error ? error.message : String(error)); }
      };
      begin();
      return stop;
    },
  };
}
