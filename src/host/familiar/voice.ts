import type { FamiliarVoice } from '@seihouse/library/familiar';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

/** Listening stops on its own after this long, in case the reader never taps to stop. */
const LISTEN_LIMIT_MS = 30_000;
/** How many times a browser that ends recognition by itself is started again in one session. */
const MAX_RESTARTS = 20;

/** Browser speech only: no account, provider key, recording storage or generated replies. */
export function createFamiliarBrowserVoice(): FamiliarVoice {
  const browser = typeof window === 'undefined' ? undefined : window as SpeechWindow;
  const Recognizer = browser?.SpeechRecognition ?? browser?.webkitSpeechRecognition;
  return {
    available: Boolean(Recognizer),
    listen(language, result, failure) {
      if (!Recognizer) { failure('Voice input is unavailable here. Type or choose an action.'); return { stop() {}, cancel() {} }; }
      // Listening stays open until the reader taps to stop, so a pause never ends it;
      // a browser that ends recognition on its own is started again, keeping what it heard.
      let recognition: Recognition;
      let heardBefore = '';
      let heardNow = '';
      let stopping = false;
      let finished = false;
      let restarts = 0;
      const heard = () => `${heardBefore} ${heardNow}`.trim();
      const cleanup = () => {
        finished = true;
        clearTimeout(limit);
        recognition.onresult = recognition.onerror = recognition.onend = null;
        try { recognition.abort(); } catch { /* Already stopped. */ }
      };
      const fail = (message: string) => { if (!finished) { cleanup(); failure(message); } };
      const deliver = () => {
        if (finished) return;
        const text = heard();
        cleanup();
        if (text) result(text);
        else failure('I did not hear a command. Try again, or type.');
      };
      const stop = () => {
        if (finished || stopping) return;
        stopping = true;
        try { recognition.stop(); } catch { deliver(); }
      };
      const begin = () => {
        recognition = new Recognizer();
        recognition.lang = language;
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = event => {
          heardNow = Array.from(event.results).filter(entry => entry.isFinal).map(entry => entry[0].transcript).join(' ').trim();
        };
        recognition.onerror = event => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') fail('Microphone or speech access was denied. Allow access in your browser, or type.');
          else if (event.error !== 'no-speech' && event.error !== 'aborted') fail('Speech input stopped. Check your connection and microphone, or type.');
        };
        recognition.onend = () => {
          if (finished) return;
          if (stopping || restarts >= MAX_RESTARTS) { deliver(); return; }
          heardBefore = heard();
          heardNow = '';
          restarts++;
          try { begin(); } catch { deliver(); }
        };
        recognition.start();
      };
      // Never tapped to stop: what was heard is answered; nothing heard says so.
      const limit = setTimeout(() => {
        if (heard()) stop();
        else fail('Listening timed out. Tap the microphone to try again, or type.');
      }, LISTEN_LIMIT_MS);
      try { begin(); } catch { fail('Speech input could not start. Tap the microphone again, or type.'); }
      return { stop, cancel: () => { if (!finished) cleanup(); } };
    },
    speak(text, language, done, failure) {
      if (!browser?.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
        failure('Read the choice below, then Confirm or Cancel.');
        return () => {};
      }
      const synth = browser.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      let active = true;
      const finish = (error = false) => {
        if (!active) return;
        active = false;
        clearTimeout(timeout);
        utterance.onend = utterance.onerror = null;
        if (error) { synth.cancel(); failure('Readback stopped. You can still Confirm or Cancel below.'); }
        else done();
      };
      // Long custom directions need time, but a lost browser event must not strand the UI.
      const timeout = setTimeout(() => finish(true), Math.max(15_000, text.length * 120));
      utterance.onend = () => finish();
      utterance.onerror = () => finish(true);
      try { synth.speak(utterance); } catch { finish(true); }
      return () => {
        if (!active) return;
        active = false;
        clearTimeout(timeout);
        utterance.onend = utterance.onerror = null;
        synth.cancel();
      };
    },
  };
}
