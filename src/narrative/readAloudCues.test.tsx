// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SoundCueAttachment } from '../audio/inlineAudio';
import { createFakeSpeechSynthesis, type FakeSpeechSynthesis } from '../test-utils/fakeSpeechSynthesis';
import { buildReadAloudScript, readAloudSentenceKey } from './readAloud';
import { READ_ALOUD_CUE_COOLDOWN_MS } from './readAloudCues';
import { createWebSpeechEngine, useReadAloud, type ReadAloud, type SpeechEngine } from './useReadAloud';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const paragraphs = [
  { id: 'permanent-paragraph-a', text: 'Before the door creaked, wind whistled. Rain fell.' },
  { id: 'permanent-paragraph-b', text: 'Boots scraped. A bell rang. The blade struck.' },
];
const cue = (words: string, block = 0): SoundCueAttachment => {
  const { id: blockId, text } = paragraphs[block];
  const startOffset = text.indexOf(words);
  return {
    id: `cue:${words}`, kind: 'sound-cue',
    anchor: { level: 'span', blockId, startOffset, endOffset: startOffset + words.length, selectedText: words },
    payload: { origin: 'manual', sound: words, energy: 'high', cue: {
      publicUrl: `https://audio.example.org/${encodeURIComponent(words)}.mp3`,
      provenance: { catalogId: 'test', version: '1' }, category: 'atmosphere',
    } },
  };
};
const placed = [cue('door creaked'), cue('wind whistled'), cue('Rain fell'), cue('Boots scraped', 1), cue('bell rang', 1), cue('blade struck', 1)];
const scriptWith = (cues = placed) => buildReadAloudScript({ chapterNumber: 1, title: 'The Gate', paragraphs, soundCues: cues });

let root: Root;
let container: HTMLDivElement;
let fake: FakeSpeechSynthesis;
let engine: SpeechEngine;
let player: ReadAloud;
let playCue: ReturnType<typeof vi.fn<(cue: SoundCueAttachment) => void>>;
let stopCues: ReturnType<typeof vi.fn<() => void>>;
interface Props { chapter?: string; suspended?: boolean; cues?: SoundCueAttachment[] }
function Harness({ chapter = 'one', suspended, cues = placed }: Props) {
  player = useReadAloud({ scriptKey: chapter, scriptRevision: JSON.stringify(cues), buildScript: () => scriptWith(cues), engine, suspended,
    onSoundCue: playCue, onStopSoundCues: stopCues });
  return null;
}
const render = (props: Props = {}) => act(() => root.render(<Harness {...props} />));
const tick = (ms = 0) => act(() => vi.advanceTimersByTime(ms));
const start = () => act(() => fake.start());
const next = () => act(() => { fake.finish(); vi.advanceTimersByTime(50); });
const lineFor = (id: string) => player.script().lines.findIndex(line => line.soundCues?.some(cue => cue.id === id));
const playAt = (index: number) => { act(() => player.play(index)); tick(); };
const heard = () => playCue.mock.calls.map(([cue]: [SoundCueAttachment]) => cue.id);
const readToEnd = () => { while (player.status === 'playing') { start(); tick(600); next(); } };

beforeEach(() => {
  vi.useFakeTimers();
  fake = createFakeSpeechSynthesis();
  engine = createWebSpeechEngine({ speechSynthesis: fake.speechSynthesis, SpeechSynthesisUtterance: fake.SpeechSynthesisUtterance });
  playCue = vi.fn();
  stopCues = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers(); });

describe('narration and placed sounds', () => {
  it('cuts at the exact cue words, retaining the containing sentence and voice', () => {
    const lines = scriptWith().lines;
    const before = lines.find(line => line.text === 'Before the')!;
    const door = lines.find(line => line.text === 'door creaked,')!;
    const wind = lines.find(line => line.text === 'wind whistled.')!;
    expect(before.soundCues).toBeUndefined();
    expect(door.soundCues).toEqual([placed[0]]);
    expect(wind.soundCues).toEqual([placed[1]]);
    expect(readAloudSentenceKey(before)).toBe(readAloudSentenceKey(door));
    expect(readAloudSentenceKey(wind)).toBe(readAloudSentenceKey(door));
    expect(door.role).toBe(before.role);
    for (const line of lines.filter(line => line.blockId)) {
      expect(paragraphs.find(block => block.id === line.blockId)!.text.slice(line.start, line.end)).toBe(line.text);
    }
  });

  it('never plays detached, moved, mismatched or unavailable attachments', () => {
    const original = placed[0];
    for (const invalid of [
      { ...original, anchor: { ...original.anchor, detached: true as const } },
      { ...original, anchor: { ...original.anchor, blockId: 'some-other-paragraph' } },
      { ...original, anchor: { ...original.anchor, selectedText: 'different words' } },
      { ...original, payload: { ...original.payload, cue: { ...original.payload.cue, publicUrl: 'javascript:bad()' } } },
    ]) expect(scriptWith([invalid]).lines.flatMap(line => line.soundCues ?? [])).toEqual([]);
  });

  it('waits for real speech at the pinned words; mounting, scrolling and preparing a line play nothing', () => {
    render();
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(heard()).toEqual([]);
    expect(stopCues).not.toHaveBeenCalled();
    playAt(0); start(); next(); start();
    expect(player.line?.text).toBe('Before the');
    expect(heard()).toEqual([]);
    next();
    expect(player.line?.text).toBe('door creaked,');
    expect(heard()).toEqual([]);
    start(); start();
    expect(heard()).toEqual([placed[0].id]);
  });

  it('plays every placed cue once, including more than three and ordinary environment sounds', () => {
    render(); playAt(0);
    readToEnd();
    expect(heard()).toEqual(placed.map(cue => cue.id));
    playAt(0);
    readToEnd();
    expect(heard()).toHaveLength(placed.length);
  });

  it('spaces close cue starts by the small cooldown without dropping the second cue', () => {
    render(); playAt(lineFor(placed[0].id)); start(); next(); start();
    expect(heard()).toEqual([placed[0].id]);
    tick(READ_ALOUD_CUE_COOLDOWN_MS - 51);
    expect(heard()).toHaveLength(1);
    tick(1);
    expect(heard()).toEqual([placed[0].id, placed[1].id]);
  });

  it.each(['pause', 'stop', 'suspend', 'preview', 'interrupt', 'leave'] as const)('%s cancels pending cues and rejects stale speech events', action => {
    render(); playAt(lineFor(placed[0].id)); start(); next();
    const lateStart = fake.current!.onstart;
    start(); // wind is waiting for the cooldown
    act(() => {
      if (action === 'pause') player.pause();
      if (action === 'stop') player.stop();
      if (action === 'preview') player.preview('narrator');
      if (action === 'interrupt') player.interrupt();
    });
    if (action === 'suspend') render({ suspended: true });
    if (action === 'leave') act(() => root.render(null));
    act(() => lateStart?.({}));
    tick(1000);
    expect(heard()).toEqual([placed[0].id]);
    expect(stopCues).toHaveBeenCalledTimes(1);
    if (action === 'pause') {
      act(() => player.resume()); start(); tick(1000);
      expect(heard()).toEqual([placed[0].id]);
    }
  });

  it('seeks ahead without a catch-up burst and never replays passed cues after seeking back', () => {
    render(); playAt(lineFor(placed[0].id)); start();
    playAt(lineFor(placed[4].id)); start(); tick(600);
    expect(stopCues).toHaveBeenCalledTimes(1);
    expect(heard()).toEqual([placed[0].id, placed[4].id]);
    playAt(lineFor(placed[1].id)); start(); tick(600);
    expect(heard()).toHaveLength(2);
    playAt(lineFor(placed[5].id)); start();
    expect(heard()).toEqual([placed[0].id, placed[4].id, placed[5].id]);
  });

  it('skips sentences while paused without firing them, including cues earlier in the current sentence', () => {
    render(); playAt(lineFor(placed[0].id));
    act(() => player.pause());
    act(() => player.skip(1)); // Rain fell: consumes door and wind
    act(() => player.skip(-1)); // back to the first sentence
    act(() => player.resume()); start(); next(); start(); next(); start(); tick(600);
    expect(heard()).toEqual([]);
  });

  it('switches chapter without leaking a pending cue and remembers cues on a return visit', () => {
    render(); playAt(lineFor(placed[0].id)); start(); next(); start();
    render({ chapter: 'two' }); tick(600);
    expect(stopCues).toHaveBeenCalledTimes(1);
    expect(heard()).toEqual([placed[0].id]);
    playAt(lineFor(placed[0].id)); start();
    expect(heard()).toHaveLength(2);
    render({ chapter: 'one' }); tick(600);
    playAt(lineFor(placed[0].id)); start();
    expect(heard()).toHaveLength(2);
  });

  it('takes a newly placed cue into the current script without replaying earlier cues', () => {
    render({ cues: [placed[0]] }); playAt(lineFor(placed[0].id)); start();
    render({ cues: placed }); tick(); start();
    expect(heard()).toEqual([placed[0].id]);
    next(); start(); tick(600);
    expect(heard()).toEqual([placed[0].id, placed[1].id]);
  });
});
