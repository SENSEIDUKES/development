// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAMILIAR_PAUSE_MS, createFamiliarBrowserVoice } from './voice';

class Recognition {
  static last: Recognition;
  constructor() { Recognition.last = this; }
  lang = ''; continuous = true; interimResults = true;
  onresult: ((event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('Familiar browser speech', () => {
  it('answers by itself once the reader pauses after speaking, like a smart speaker', () => {
    vi.useFakeTimers();
    vi.stubGlobal('webkitSpeechRecognition', Recognition);
    const result = vi.fn();
    createFamiliarBrowserVoice().listen('en-US', result, vi.fn());
    const recognition = Recognition.last;
    expect(recognition.interimResults).toBe(true);
    // Still speaking: words in progress keep it listening.
    recognition.onresult!({ results: [{ isFinal: false, 0: { transcript: 'my' } }] });
    vi.advanceTimersByTime(FAMILIAR_PAUSE_MS - 100);
    recognition.onresult!({ results: [{ isFinal: true, 0: { transcript: 'my energy' } }] });
    vi.advanceTimersByTime(FAMILIAR_PAUSE_MS - 100);
    expect(recognition.stop).not.toHaveBeenCalled();
    // A pause: it stops and answers.
    vi.advanceTimersByTime(100);
    expect(recognition.stop).toHaveBeenCalled();
    recognition.onend!();
    expect(result).toHaveBeenCalledExactlyOnceWith('my energy');
  });
  it('keeps listening through a short pause and a browser restart, answers at once on a tap, and cancels late events', () => {
    vi.useFakeTimers();
    vi.stubGlobal('webkitSpeechRecognition', Recognition);
    const result = vi.fn();
    const failure = vi.fn();
    const listening = createFamiliarBrowserVoice().listen('en-US', result, failure);
    const first = Recognition.last;
    expect(first.lang).toBe('en-US');
    expect(first.continuous).toBe(true);
    first.onresult!({ results: [{ isFinal: true, 0: { transcript: 'Custom: Leave the sect' } }] });
    // The browser ends on a short pause by itself: the Familiar listens on, keeping what it heard.
    vi.advanceTimersByTime(500);
    first.onend!();
    expect(result).not.toHaveBeenCalled();
    const second = Recognition.last;
    expect(second).not.toBe(first);
    expect(second.start).toHaveBeenCalled();
    second.onresult!({ results: [{ isFinal: true, 0: { transcript: 'before the war.' } }] });
    listening.stop();
    expect(second.stop).toHaveBeenCalled();
    second.onend!();
    expect(result).toHaveBeenCalledExactlyOnceWith('Custom: Leave the sect before the war.');
    listening.cancel();
    expect(second.onresult).toBeNull();
    expect(failure).not.toHaveBeenCalled();
  });
  it('reports permission denial and bounds an unanswered microphone session', () => {
    vi.useFakeTimers();
    vi.stubGlobal('SpeechRecognition', Recognition);
    const fail = vi.fn();
    createFamiliarBrowserVoice().listen('en-US', vi.fn(), fail);
    Recognition.last.onerror!({ error: 'not-allowed' });
    expect(fail).toHaveBeenCalledWith(expect.stringContaining('denied'));
    fail.mockClear();
    createFamiliarBrowserVoice().listen('en-US', vi.fn(), fail);
    vi.advanceTimersByTime(30_000);
    expect(fail).toHaveBeenCalledOnce();
    expect(Recognition.last.abort).toHaveBeenCalled();
  });
  it('stops by itself after 30 seconds of talking and answers what it heard', () => {
    vi.useFakeTimers();
    vi.stubGlobal('SpeechRecognition', Recognition);
    const result = vi.fn();
    createFamiliarBrowserVoice().listen('en-US', result, vi.fn());
    const recognition = Recognition.last;
    // The reader never pauses long enough.
    for (let second = 0; second < 29; second++) {
      recognition.onresult!({ results: [{ isFinal: true, 0: { transcript: 'Conflict' } }, { isFinal: false, 0: { transcript: 'and more' } }] });
      vi.advanceTimersByTime(1_000);
    }
    expect(recognition.stop).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(recognition.stop).toHaveBeenCalled();
    recognition.onend!();
    expect(result).toHaveBeenCalledExactlyOnceWith('Conflict');
  });
  it('answers after a tap to stop even when the browser never reports the end', () => {
    vi.useFakeTimers();
    vi.stubGlobal('SpeechRecognition', Recognition);
    const result = vi.fn();
    const listening = createFamiliarBrowserVoice().listen('en-US', result, vi.fn());
    Recognition.last.onresult!({ results: [{ isFinal: true, 0: { transcript: 'Conflict' } }] });
    listening.stop();
    expect(result).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3_000);
    expect(result).toHaveBeenCalledExactlyOnceWith('Conflict');
    Recognition.last.onend?.();
    expect(result).toHaveBeenCalledOnce();
  });
  it('does not cancel resumed narration after readback ended, and releases a stalled readback', () => {
    vi.useFakeTimers();
    class Utterance {
      static last: Utterance;
      lang = '';
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(readonly text: string) { Utterance.last = this; }
    }
    const synth = { speak: vi.fn(), cancel: vi.fn() };
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', synth);
    const voice = createFamiliarBrowserVoice();
    const done = vi.fn();
    const fail = vi.fn();
    const cancel = voice.speak('Choose Conflict.', 'en-US', done, fail);
    Utterance.last.onend!();
    cancel();
    expect(done).toHaveBeenCalledOnce();
    expect(synth.cancel).not.toHaveBeenCalled();
    voice.speak('Choose Conflict.', 'en-US', done, fail);
    const late = Utterance.last.onend!;
    vi.advanceTimersByTime(15_000);
    late();
    expect(fail).toHaveBeenCalledOnce();
    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(done).toHaveBeenCalledOnce();
  });
});
