// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFamiliarBrowserVoice } from './voice';

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
  it('waits for recognition to stop before delivering text, and cancels late events', () => {
    vi.stubGlobal('webkitSpeechRecognition', Recognition);
    const result = vi.fn();
    const failure = vi.fn();
    const cancel = createFamiliarBrowserVoice().listen('en-US', result, failure);
    const recognition = Recognition.last;
    expect(recognition.lang).toBe('en-US');
    recognition.onresult!({ results: [{ isFinal: true, 0: { transcript: 'Custom: Leave the sect.' } }] });
    expect(result).not.toHaveBeenCalled();
    recognition.onend!();
    expect(result).toHaveBeenCalledExactlyOnceWith('Custom: Leave the sect.');
    cancel();
    expect(recognition.onresult).toBeNull();
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
