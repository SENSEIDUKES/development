import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFamiliarWakeWord } from './wakeWord';

class FakeRecognition {
  static all: FakeRecognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  abort = vi.fn();
  constructor() { FakeRecognition.all.push(this); }
  say(transcript: string) { this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript } }] }); }
}
const last = () => FakeRecognition.all.at(-1)!;

afterEach(() => { FakeRecognition.all = []; vi.useRealTimers(); });

describe('the "Familiar" wake word', () => {
  it('listens continuously and calls once when the word is said, then stops', () => {
    const wake = createFamiliarWakeWord({ webkitSpeechRecognition: FakeRecognition as never });
    expect(wake.available).toBe(true);
    const heard = vi.fn();
    wake.listen('familiar', 'en-US', heard);
    expect(last()).toMatchObject({ lang: 'en-US', continuous: true, interimResults: true });
    expect(last().start).toHaveBeenCalledOnce();
    last().say('what is the weather');
    expect(heard).not.toHaveBeenCalled();
    // A word inside another is not the word.
    last().say('unfamiliar');
    expect(heard).not.toHaveBeenCalled();
    last().say('hey Familiar');
    expect(heard).toHaveBeenCalledOnce();
    expect(last().abort).toHaveBeenCalled();
  });

  it('starts again when the browser ends listening, and stops for good when stopped', () => {
    vi.useFakeTimers();
    const wake = createFamiliarWakeWord({ SpeechRecognition: FakeRecognition as never });
    const stop = wake.listen('familiar', 'en-US', vi.fn());
    vi.advanceTimersByTime(5_000);
    last().onend?.();
    vi.advanceTimersByTime(300);
    expect(FakeRecognition.all).toHaveLength(2);
    stop();
    expect(last().abort).toHaveBeenCalled();
    vi.advanceTimersByTime(5_000);
    expect(FakeRecognition.all).toHaveLength(2);
  });

  it('gives up, saying why, when the microphone is refused or the browser keeps stopping', () => {
    vi.useFakeTimers();
    const wake = createFamiliarWakeWord({ SpeechRecognition: FakeRecognition as never });
    const refused = vi.fn();
    wake.listen('familiar', 'en-US', vi.fn(), refused);
    last().onerror?.({ error: 'not-allowed' });
    expect(refused).toHaveBeenCalledWith('Microphone or speech access was denied.');
    const stopping = vi.fn();
    wake.listen('familiar', 'en-US', vi.fn(), stopping);
    for (let index = 0; index < 5; index++) { last().onend?.(); vi.advanceTimersByTime(300); }
    expect(stopping).toHaveBeenCalledWith('Speech recognition keeps stopping in this browser.');
    expect(createFamiliarWakeWord({}).available).toBe(false);
  });
});
