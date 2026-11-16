import { describe, expect, it, vi } from 'vitest';
import { createClipSpeechEngine, spokenReadAloudLines, type ClipAudio } from './readAloudClips';
import type { ReadAloudLine } from './readAloud';
import type { SpeechEngine, SpeechEvents, SpeechRequest } from './useReadAloud';

/** Saved voice clips: a spoken line with a clip plays it; everything else is read by the device. */

const line = (key: string, role: ReadAloudLine['role']): ReadAloudLine =>
  ({ key, blockId: 'c1-p1', sentence: { start: 0, end: 5 }, start: 0, end: 5, text: `${key} words`, role });
const request = (spoken?: ReadAloudLine): SpeechRequest =>
  ({ text: spoken?.text ?? 'sample', line: spoken, lang: 'en-US', rate: 1.25, pitch: 1, volume: 0.9 });
const events = () => ({
  onStart: vi.fn<SpeechEvents['onStart']>(), onEnd: vi.fn<SpeechEvents['onEnd']>(), onError: vi.fn<SpeechEvents['onError']>(), onProgress: vi.fn<() => void>(),
});

const baseEngine = () => {
  const speaking = { now: false };
  const engine: SpeechEngine = {
    supported: true,
    getVoices: () => [],
    onVoicesChanged: () => () => undefined,
    speak: vi.fn(() => { speaking.now = true; }),
    cancel: vi.fn(() => { speaking.now = false; }),
    isSpeaking: () => speaking.now,
  };
  return engine;
};

const fakeAudio = (play: () => Promise<void> = async () => undefined) => {
  const audio: ClipAudio = {
    src: '', volume: 1, playbackRate: 1, paused: true, ended: false,
    onplaying: null, onended: null, onerror: null, ontimeupdate: null,
    play: vi.fn(play), pause: vi.fn(),
  };
  return audio;
};

describe('saved voice clips in Read Aloud', () => {
  it('names the spoken lines of a script: everything but the narration', () => {
    const lines = [line('a', 'narrator'), line('b', 'protagonist'), line('c', 'side')];
    expect(spokenReadAloudLines({ version: 2, lines }).map(entry => entry.key)).toEqual(['b', 'c']);
  });

  it('plays a line\'s clip at the reader\'s speed and volume, and reports its start and end', async () => {
    const base = baseEngine();
    const audio = fakeAudio();
    const engine = createClipSpeechEngine(base, spoken => (spoken.key === 'b' ? 'blob:clip-b' : undefined), () => audio);
    const heard = events();
    engine.speak(request(line('b', 'protagonist')), heard);
    expect(audio.src).toBe('blob:clip-b');
    expect(audio.playbackRate).toBe(1.25);
    expect(audio.volume).toBe(0.9);
    expect(base.speak).not.toHaveBeenCalled();
    expect(engine.isSpeaking()).toBe(true);
    audio.onplaying!();
    expect(heard.onStart).toHaveBeenCalledTimes(1);
    audio.onended!();
    expect(heard.onEnd).toHaveBeenCalledTimes(1);
    expect(engine.isSpeaking()).toBe(false);
  });

  it('reads a line without a clip with the device, waking the clip player inside that tap', () => {
    const base = baseEngine();
    const audio = fakeAudio();
    const engine = createClipSpeechEngine(base, () => undefined, () => audio);
    engine.speak(request(line('a', 'narrator')), events());
    expect(base.speak).toHaveBeenCalledTimes(1);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.volume).toBe(0);
    engine.speak(request(line('a', 'narrator')), events());
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it('silences a cancelled clip: its end is never reported', () => {
    const audio = fakeAudio();
    const engine = createClipSpeechEngine(baseEngine(), () => 'blob:clip', () => audio);
    const heard = events();
    engine.speak(request(line('b', 'side')), heard);
    engine.cancel();
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.onended).toBeNull();
    expect(engine.isSpeaking()).toBe(false);
    expect(heard.onEnd).not.toHaveBeenCalled();
  });

  it('asks for a tap when the browser refuses to start a clip, and reads a broken clip with the device', async () => {
    const refused = Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
    const base = baseEngine();
    const blocked = fakeAudio(() => Promise.reject(refused));
    const heard = events();
    createClipSpeechEngine(base, () => 'blob:clip', () => blocked).speak(request(line('b', 'side')), heard);
    await Promise.resolve(); await Promise.resolve();
    expect(heard.onError).toHaveBeenCalledWith('not-allowed');
    expect(base.speak).not.toHaveBeenCalled();

    const broken = fakeAudio();
    const again = events();
    createClipSpeechEngine(base, () => 'blob:clip', () => broken).speak(request(line('b', 'side')), again);
    broken.onerror!();
    expect(base.speak).toHaveBeenCalledTimes(1);
  });
});
