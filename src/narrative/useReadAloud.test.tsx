// @vitest-environment jsdom
import { act, useImperativeHandle, forwardRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildReadAloudScript, type ReadAloudVoicePicks } from './readAloud';
import { SPEAKER_KIND, type SpeakerAttachment } from './speech';
import { createWebSpeechEngine, useReadAloud, type ReadAloud, type SpeechEngine } from './useReadAloud';
import { createFakeSpeechSynthesis, fakeVoice, type FakeSpeechSynthesis } from '../test-utils/fakeSpeechSynthesis';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PICKS: ReadAloudVoicePicks = { en: { narrator: ['Daniel'], protagonist: ['Rishi'], side: ['Samantha'] } };
const CHAPTER_ONE = ['The tide went out.', '“Ring the bells,” Ye Chen said. The gulls rose.'];
const CHAPTER_TWO = ['Morning came.'];

const speakerRecord: SpeakerAttachment = {
  id: 'speaker:c1-p1:0-17', kind: SPEAKER_KIND,
  anchor: { level: 'span', blockId: 'c1-p1', startOffset: 0, endOffset: 17, selectedText: '“Ring the bells,”' },
  payload: { origin: 'harness', speaker: 'Ye Chen', protagonist: true },
};

interface HarnessProps { chapter: number; suspended?: boolean; storage?: ReturnType<typeof memoryStorage>['storage'] }

const memoryStorage = () => {
  const values = new Map<string, string>();
  return { values, storage: { read: (key: string) => values.get(key) ?? null, write: (key: string, value: string) => { values.set(key, value); }, remove: (key: string) => { values.delete(key); } } };
};

let fake: FakeSpeechSynthesis;
let engine: SpeechEngine;
let container: HTMLDivElement;
let root: Root;
let player: ReadAloud;
let setProps: (props: HarnessProps) => void;

const Harness = forwardRef<ReadAloud, HarnessProps>(function Harness(initial, ref) {
  const [props, update] = useState(initial);
  setProps = update;
  const paragraphs = props.chapter === 1 ? CHAPTER_ONE : CHAPTER_TWO;
  const readAloud = useReadAloud({
    scriptKey: `chapter-${props.chapter}`,
    buildScript: () => buildReadAloudScript({
      chapterNumber: props.chapter, title: props.chapter === 1 ? 'Low Tide' : 'Dawn', language: 'en',
      paragraphs: paragraphs.map((text, index) => ({ id: `c${props.chapter}-p${index}`, text })),
      speakers: props.chapter === 1 ? [speakerRecord] : [],
    }),
    language: 'en', picks: PICKS, preferences: props.storage, suspended: props.suspended, engine,
  });
  useImperativeHandle(ref, () => readAloud, [readAloud]);
  return null;
});

const mount = (props: HarnessProps = { chapter: 1 }) => {
  act(() => root.render(<Harness ref={value => { if (value) player = value; }} {...props} />));
};
const texts = () => fake.spoken.map(utterance => utterance.text);
const lastSpoken = () => fake.spoken.at(-1)!;

beforeEach(() => {
  vi.useFakeTimers();
  fake = createFakeSpeechSynthesis();
  engine = createWebSpeechEngine({ speechSynthesis: fake.speechSynthesis, SpeechSynthesisUtterance: fake.SpeechSynthesisUtterance });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('useReadAloud', () => {
  it('speaks the first line inside the Listen tap itself, with each role\'s voice, language and speed', () => {
    mount();
    act(() => player.play());
    // No timer has run: iOS only speaks when the tap itself starts speech.
    expect(texts()).toEqual(['Chapter 1. Low Tide']);
    expect(lastSpoken()).toMatchObject({ lang: 'en-GB', rate: 1, volume: 0.9 });
    expect(lastSpoken().voice?.name).toBe('Daniel');
    expect(player.status).toBe('playing');
    expect(player.line?.key).toBe('title');

    act(() => { fake.start(); fake.finish(); });
    act(() => { fake.start(); fake.finish(); });
    expect(lastSpoken().text).toBe('“Ring the bells,”');
    expect(lastSpoken().voice?.name).toBe('Rishi');
    act(() => { fake.start(); fake.finish(); });
    expect(lastSpoken()).toMatchObject({ text: 'Ye Chen said.' });
    expect(lastSpoken().voice?.name).toBe('Daniel');
  });

  it('pauses by cancelling, ignores the cancelled line\'s events, and resumes the same line from its start', () => {
    mount();
    act(() => player.play());
    act(() => { fake.start(); fake.finish(); });
    expect(player.line?.text).toBe('The tide went out.');
    const before = fake.spoken.length;
    act(() => player.pause());
    expect(player.status).toBe('paused');
    expect(player.listening).toBe(false);
    expect(fake.cancels).toBeGreaterThan(0);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(fake.spoken.length).toBe(before);
    act(() => player.resume());
    expect(lastSpoken().text).toBe('The tide went out.');
    expect(player.status).toBe('playing');
  });

  it('never mistakes Safari\'s end-on-cancel for a finished line', () => {
    fake = createFakeSpeechSynthesis({ cancelStyle: 'safari' });
    engine = createWebSpeechEngine({ speechSynthesis: fake.speechSynthesis, SpeechSynthesisUtterance: fake.SpeechSynthesisUtterance });
    mount();
    act(() => player.play(1));
    act(() => player.pause());
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(texts()).toEqual(['The tide went out.']);
    expect(player.status).toBe('paused');
  });

  it('moves a sentence forward and back, and stops cleanly', () => {
    mount();
    act(() => player.play(1));
    expect(player.line?.text).toBe('The tide went out.');
    act(() => { player.skip(1); vi.advanceTimersByTime(0); });
    expect(lastSpoken().text).toBe('“Ring the bells,”');
    act(() => { player.skip(1); vi.advanceTimersByTime(0); });
    expect(lastSpoken().text).toBe('The gulls rose.');
    act(() => { player.skip(-1); vi.advanceTimersByTime(0); });
    expect(lastSpoken().text).toBe('“Ring the bells,”');
    act(() => player.stop());
    expect(player.status).toBe('idle');
    expect(player.line).toBeUndefined();
  });

  const silence = () => { (fake.speechSynthesis as unknown as { speaking: boolean }).speaking = false; };

  it('goes on when a started line never reports its end', () => {
    mount();
    act(() => player.play(1));
    act(() => { fake.start(); });
    silence();
    // Twice the line's estimate plus five seconds, then the next line.
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(lastSpoken().text).toBe('“Ring the bells,”');
    expect(player.status).toBe('playing');
  });

  it('pauses for a fresh tap when a line never starts', () => {
    mount();
    act(() => player.play(1));
    silence();
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(player.status).toBe('paused');
    expect(player.listening).toBe(false);
    expect(player.notice).toBe('Tap Resume to keep listening.');
    act(() => player.resume());
    expect(lastSpoken().text).toBe('The tide went out.');
    expect(player.notice).toBeUndefined();
  });

  it('retries a failing voice once without it, then skips the line', () => {
    mount();
    act(() => player.play(1));
    act(() => { fake.start(); fake.fail('network'); vi.advanceTimersByTime(0); });
    expect(lastSpoken()).toMatchObject({ text: 'The tide went out.', voice: null, lang: 'en' });
    act(() => { fake.start(); fake.fail('synthesis-failed'); vi.advanceTimersByTime(0); });
    expect(lastSpoken().text).toBe('“Ring the bells,”');
  });

  it('a voice preview pauses the chapter instead of killing it', () => {
    mount();
    act(() => player.play(1));
    act(() => { player.preview('side'); vi.advanceTimersByTime(0); });
    expect(player.status).toBe('paused');
    expect(lastSpoken().voice?.name).toBe('Samantha');
    act(() => player.resume());
    act(() => { vi.advanceTimersByTime(0); });
    expect(lastSpoken().text).toBe('The tide went out.');
  });

  it('applies a new voice or speed from the next line, and saves them per language', () => {
    const { storage, values } = memoryStorage();
    mount({ chapter: 1, storage });
    act(() => player.play(1));
    act(() => { player.setRate(1.5); player.setVoice('narrator', player.voices.find(each => each.name === 'Samantha')); });
    expect(fake.spoken).toHaveLength(1);
    expect(lastSpoken().rate).toBe(1);
    act(() => { fake.start(); fake.finish(); fake.start(); fake.finish(); });
    expect(lastSpoken()).toMatchObject({ text: 'Ye Chen said.', rate: 1.5 });
    expect(lastSpoken().voice?.name).toBe('Samantha');
    const saved = JSON.parse(values.get('read-aloud')!);
    expect(saved).toMatchObject({ v: 1, rate: 1.5, voices: { en: { narrator: { name: 'Samantha', lang: 'en-US' } } } });
    act(() => player.resetVoices());
    expect(JSON.parse(values.get('read-aloud')!).voices).toEqual({});
  });

  it('pauses while something covers the chapter, then reads the next chapter from its title', () => {
    mount();
    act(() => player.play(1));
    act(() => setProps({ chapter: 1, suspended: true }));
    expect(player.status).toBe('paused');
    expect(player.listening).toBe(true);
    const spokenWhileCovered = fake.spoken.length;
    act(() => setProps({ chapter: 2, suspended: true }));
    expect(fake.spoken.length).toBe(spokenWhileCovered);
    act(() => setProps({ chapter: 2, suspended: false }));
    act(() => { vi.advanceTimersByTime(0); });
    expect(lastSpoken().text).toBe('Chapter 2. Dawn');
    expect(player.status).toBe('playing');
  });

  it('keeps listening across chapters until Stop, but a paused reader stays paused', () => {
    mount();
    act(() => player.play(4));
    act(() => { fake.start(); fake.finish(); });
    expect(player.status).toBe('ended');
    act(() => setProps({ chapter: 2 }));
    act(() => { vi.advanceTimersByTime(0); });
    expect(lastSpoken().text).toBe('Chapter 2. Dawn');
    act(() => player.pause());
    act(() => setProps({ chapter: 1 }));
    act(() => { vi.advanceTimersByTime(0); });
    expect(player.status).toBe('paused');
    expect(lastSpoken().text).toBe('Chapter 2. Dawn');
  });

  it('reads the line again when the page returns from a stopped device', () => {
    mount();
    act(() => player.play(1));
    act(() => { fake.start(); });
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    (fake.speechSynthesis as unknown as { speaking: boolean }).speaking = false;
    vi.setSystemTime(Date.now() + 30_000);
    visibility.mockReturnValue('visible');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(0); });
    expect(texts().filter(text => text === 'The tide went out.')).toHaveLength(2);
    visibility.mockRestore();
  });

  it('is silent when the browser has no speech, and cancels speech on unmount', () => {
    const silent = createWebSpeechEngine({});
    expect(silent.supported).toBe(false);
    expect(silent.getVoices()).toEqual([]);
    mount();
    act(() => player.play());
    const cancels = fake.cancels;
    act(() => root.unmount());
    expect(fake.cancels).toBeGreaterThan(cancels);
    root = createRoot(container);
  });

  it('finds voices that arrive late, including on devices that never announce them', () => {
    fake.setVoices([]);
    mount();
    expect(player.voices).toEqual([]);
    fake.speechSynthesis.getVoices = () => [fakeVoice('Daniel', 'en-GB')] as unknown as SpeechSynthesisVoice[];
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(player.voices.map(voice => voice.name)).toEqual(['Daniel']);
    expect(player.choice.narrator?.name).toBe('Daniel');
  });
});
