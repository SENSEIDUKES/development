// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReaderMixerProvider, type ReaderMixer } from '@seihouse/audio-player';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { createHostReaderMixer } from '../../../host/reader/readerMixer';
import { installAudioMediaStubs } from '../../../test-utils/renderWithDevAudio';
import { useReaderSoundtrack } from './useReaderSoundtrack';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const memory = (): ReaderPreferenceStorage => {
  const values = new Map<string, string>();
  return { read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
};

/** The Reader's use of the hook: whether its chapter is on screen, and whether Listen has finished it. */
function Reader({ active, chapterId = 'c1', listenEnded = false, onSleep = () => undefined }: {
  active: boolean; chapterId?: string; listenEnded?: boolean; onSleep?: () => void;
}) {
  useReaderSoundtrack({ active, chapterId, soundCues: [], speaking: false, listenEnded, onSleep, chapterEnd: null });
  return null;
}

let container: HTMLDivElement;
let root: Root;
let mixer: ReaderMixer;
const render = (element: React.ReactElement) => act(() => root.render(<ReaderMixerProvider mixer={mixer}>{element}</ReaderMixerProvider>));

beforeEach(() => {
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mixer = createHostReaderMixer(memory());
});
afterEach(() => {
  container.remove();
  mixer.dispose();
});

describe('The Reader soundtrack', () => {
  it('fades the atmosphere out while another page covers the chapter, keeping a sleep timer, and stops everything on leaving', () => {
    const startAtmosphere = vi.spyOn(mixer, 'startAtmosphere');
    const stopAtmosphere = vi.spyOn(mixer, 'stopAtmosphere');
    const stopAll = vi.spyOn(mixer, 'stopAll');

    // The Reader opens over a page (or before its chapter is on screen): nothing plays yet.
    render(<Reader active={false} />);
    expect(startAtmosphere).not.toHaveBeenCalled();

    render(<Reader active />);
    expect(startAtmosphere).toHaveBeenCalledTimes(1);
    mixer.setSleepTimer('15-minutes');
    expect(mixer.getState().sleepTimer.status).toBe('running');

    // Fate, Holdings, an arc's page or the writing screen covers the chapter.
    render(<Reader active={false} />);
    expect(stopAtmosphere).toHaveBeenCalledTimes(1);
    expect(stopAll).not.toHaveBeenCalled();
    expect(mixer.getState().sleepTimer.status).toBe('running');

    // Back to the chapter: the atmosphere returns.
    render(<Reader active />);
    expect(startAtmosphere).toHaveBeenCalledTimes(2);

    // Leaving the Reader ends the session.
    act(() => root.unmount());
    expect(stopAll).toHaveBeenCalledTimes(1);
  });

  it('counts Listen finishing the chapter as its end, wherever the page is, so an End of chapter timer stops it', () => {
    const notifyChapterEnd = vi.spyOn(mixer, 'notifyChapterEnd');
    const onSleep = vi.fn();
    render(<Reader active onSleep={onSleep} />);
    mixer.setSleepTimer('chapter-end');
    expect(notifyChapterEnd).not.toHaveBeenCalled();

    render(<Reader active listenEnded onSleep={onSleep} />);
    expect(notifyChapterEnd).toHaveBeenCalledTimes(1);
    expect(mixer.getState().sleepTimer.status).toBe('fired');
    expect(onSleep).toHaveBeenCalledTimes(1);

    // Once per chapter: the same finished chapter does not signal again.
    render(<Reader active listenEnded onSleep={onSleep} />);
    expect(notifyChapterEnd).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('never counts the next chapter as finished while Listen still shows the last one as ended', () => {
    const notifyChapterEnd = vi.spyOn(mixer, 'notifyChapterEnd');
    render(<Reader active chapterId="c1" listenEnded />);
    expect(notifyChapterEnd).toHaveBeenCalledTimes(1);

    // The reader chooses End of chapter, then opens Chapter 2: for a moment Listen still reads "ended".
    mixer.setSleepTimer('chapter-end');
    render(<Reader active chapterId="c2" listenEnded />);
    expect(notifyChapterEnd).toHaveBeenCalledTimes(1);
    expect(mixer.getState().sleepTimer.status).toBe('running');

    // Chapter 2 is read to its end: now the timer stops the soundtrack.
    render(<Reader active chapterId="c2" listenEnded={false} />);
    render(<Reader active chapterId="c2" listenEnded />);
    expect(notifyChapterEnd).toHaveBeenCalledTimes(2);
    expect(mixer.getState().sleepTimer.status).toBe('fired');
    act(() => root.unmount());
  });
});
