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

/** Browser speech only: no account, provider key, recording storage or generated replies. */
export function createFamiliarBrowserVoice(): FamiliarVoice {
  const browser = typeof window === 'undefined' ? undefined : window as SpeechWindow;
  const Recognizer = browser?.SpeechRecognition ?? browser?.webkitSpeechRecognition;
  return {
    available: Boolean(Recognizer),
    listen(language, result, failure) {
      if (!Recognizer) { failure('Voice input is unavailable here. Type or choose an action.'); return () => {}; }
      const recognition = new Recognizer();
      let finished = false;
      let transcript = '';
      const cleanup = () => {
        finished = true;
        clearTimeout(timeout);
        recognition.onresult = recognition.onerror = recognition.onend = null;
        try { recognition.abort(); } catch { /* Already stopped. */ }
      };
      const fail = (message: string) => { if (!finished) { cleanup(); failure(message); } };
      const timeout = setTimeout(() => fail('Listening timed out. Tap the microphone to try again, or type.'), 30_000);
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = event => {
        transcript = Array.from(event.results).filter(entry => entry.isFinal).map(entry => entry[0].transcript).join(' ').trim();
        if (transcript) recognition.stop();
      };
      recognition.onerror = event => fail(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone or speech access was denied. Allow access in your browser, or type.'
        : event.error === 'no-speech' ? 'I did not hear a command. Try again, or type.'
          : 'Speech input stopped. Check your connection and microphone, or type.');
      recognition.onend = () => {
        if (finished) return;
        cleanup();
        if (transcript) result(transcript);
        else failure('I did not hear a command. Try again, or type.');
      };
      try { recognition.start(); } catch { fail('Speech input could not start. Tap the microphone again, or type.'); }
      return cleanup;
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
