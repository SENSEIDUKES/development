// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReaderMixerProvider, type ReaderMixer } from '@seihouse/audio-player';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SceneAudioTrack } from '@seihouse/sen/audio';
import { DEFAULT_SOUNDTRACK_CHOICE, piecesForMood, storySoundtrack, type ReaderPreferenceStorage, type SoundtrackChoice } from '@seihouse/sen/reader-runtime';
import type { HarnessChapterScene } from '@seihouse/sen/harness-generation';
import { SEN_ATMOSPHERES } from '../../../host/media/atmosphereCatalog';
import { SEN_SOUNDSCAPES } from '../../../host/media/soundscapeCatalog';
import { createHostReaderMixer } from '../../../host/reader/readerMixer';
import { installAudioMediaStubs } from '../../../test-utils/renderWithDevAudio';
import { READER_MUSIC_MOOD, readerMood, readingScene, useReaderSoundtrack } from './useReaderSoundtrack';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const memory = (): ReaderPreferenceStorage => {
  const values = new Map<string, string>();
  return { read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
};

/** The Reader's use of the hook: whether it is open, its chapter's scene, and whether Listen has finished the chapter. */
function Reader({ active, chapterId, listenEnded = false, onSleep = () => undefined, scene, pieces = SEN_SOUNDSCAPES, choice = DEFAULT_SOUNDTRACK_CHOICE }: {
  active: boolean; chapterId?: string; listenEnded?: boolean; onSleep?: () => void;
  scene?: HarnessChapterScene; pieces?: readonly SceneAudioTrack[]; choice?: SoundtrackChoice;
}) {
  useReaderSoundtrack({ active, chapterId, soundCues: [], scene, pieces, choice, speaking: false, listenEnded, onSleep, chapterEnd: null });
  return null;
}

/** Lets the soundtrack settle what the Reader just asked for. */
const settle = () => act(async () => { await Promise.resolve(); });
const moodOf = (mood: string) => piecesForMood(mood, SEN_SOUNDSCAPES).map(piece => piece.id);

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
  it('plays the atmosphere while the Reader is open, and leaving it ends the listening session, its sleep timer too', () => {
    const startAtmosphere = vi.spyOn(mixer, 'startAtmosphere');
    const stopAtmosphere = vi.spyOn(mixer, 'stopAtmosphere');
    const stopAll = vi.spyOn(mixer, 'stopAll');

    render(<Reader active={false} />);
    expect(startAtmosphere).not.toHaveBeenCalled();

    // Open, with or without a chapter yet (Chapter 1 being written): the atmosphere plays.
    render(<Reader active />);
    expect(startAtmosphere).toHaveBeenCalledTimes(1);
    mixer.setSleepTimer('15-minutes');
    expect(mixer.getState().sleepTimer.status).toBe('running');
    render(<Reader active chapterId="c2" />);
    expect(stopAtmosphere).not.toHaveBeenCalled();
    expect(stopAll).not.toHaveBeenCalled();

    // Leaving the Reader ends the session and its atmosphere; the music is the soundtrack's.
    act(() => root.unmount());
    expect(stopAtmosphere).toHaveBeenCalledTimes(1);
    expect(stopAll).not.toHaveBeenCalled();
    expect(mixer.getState().sleepTimer.status).toBe('off');
  });

  it('plays each chapter\'s own music and atmosphere, keeps a piece that answers the next chapter, and gives the music back on leaving', async () => {
    const soundtrack = storySoundtrack(mixer);
    // The host's own music, as NovelExpanded plays it.
    soundtrack.setBase({ mood: 'ambient', pieces: SEN_SOUNDSCAPES });
    await settle();
    expect(moodOf('ambient')).toContain(soundtrack.piece()?.id);

    const camp = SEN_ATMOSPHERES.find(option => option.group === 'Combat')!;
    render(<Reader active scene={{ soundscape: 'fighting', atmosphere: camp.id }} />);
    await settle();
    const fighting = soundtrack.piece();
    expect(moodOf('fighting')).toContain(fighting?.id);
    expect(mixer.getPreferences().atmosphereId).toBe(camp.id);

    // The next chapter is a fight too: the same piece plays on.
    render(<Reader active chapterId="c2" scene={{ soundscape: 'fighting' }} />);
    await settle();
    expect(soundtrack.piece()).toBe(fighting);
    expect(mixer.getPreferences().atmosphereId).toBe(camp.id);

    // A chapter written before scenes: the Reader's own music, never the host's, and the atmosphere stays.
    render(<Reader active chapterId="c0" />);
    await settle();
    expect(moodOf(READER_MUSIC_MOOD)).toContain(soundtrack.piece()?.id);
    expect(mixer.getPreferences().atmosphereId).toBe(camp.id);

    render(<Reader active chapterId="c3" scene={{ soundscape: 'sad' }} />);
    await settle();
    expect(moodOf('sad')).toContain(soundtrack.piece()?.id);
    act(() => root.unmount());
    await settle();
    expect(moodOf('ambient')).toContain(soundtrack.piece()?.id);
    soundtrack.setBase(undefined);
  });

  it('never opens to the host\'s music: a chapter without a scene, and the writing screen, play the Reader\'s own', async () => {
    const soundtrack = storySoundtrack(mixer);
    soundtrack.setBase({ mood: 'ambient', pieces: SEN_SOUNDSCAPES });
    await settle();
    const calm = soundtrack.piece();
    expect(moodOf('ambient')).toContain(calm?.id);

    // Chapter 1 being written: no chapter yet, the host's pieces.
    render(<Reader active chapterId={undefined} />);
    await settle();
    expect(soundtrack.piece()).not.toBe(calm);
    expect(moodOf(READER_MUSIC_MOOD)).toContain(soundtrack.piece()?.id);
    // Even a calm piece that also answers the Reader's mood is not carried in.
    expect(mixer.getState().layers.soundscapes.requested).toBe(`id:${soundtrack.piece()!.id}`);

    // A mood none of the story's pieces answers plays the Reader's own too.
    render(<Reader active chapterId="c1" scene={{ soundscape: 'jazz' }} />);
    await settle();
    expect(moodOf(READER_MUSIC_MOOD)).toContain(soundtrack.piece()?.id);

    // Leaving gives the menus their own music back.
    act(() => root.unmount());
    await settle();
    expect(moodOf('ambient')).toContain(soundtrack.piece()?.id);
    soundtrack.setBase(undefined);
  });

  it('chooses the chapter\'s mood when a piece answers it, else the Reader\'s, else the first piece\'s', () => {
    expect(readerMood('sad', SEN_SOUNDSCAPES)).toBe('sad');
    expect(readerMood(undefined, SEN_SOUNDSCAPES)).toBe(READER_MUSIC_MOOD);
    expect(readerMood('jazz', SEN_SOUNDSCAPES)).toBe(READER_MUSIC_MOOD);
    const sad = SEN_SOUNDSCAPES.filter(piece => piece.mood === 'sad' && !piece.moods.includes(READER_MUSIC_MOOD));
    expect(readerMood(undefined, sad)).toBe('sad');
  });

  it('keeps the reader\'s own piece and atmosphere, whatever the chapter chose', async () => {
    const soundtrack = storySoundtrack(mixer);
    const lament = SEN_SOUNDSCAPES.find(piece => piece.mood === 'sad')!;
    const waves = SEN_ATMOSPHERES.find(option => option.group === 'Waves')!;
    const combat = SEN_ATMOSPHERES.find(option => option.group === 'Combat')!;
    render(<Reader active scene={{ soundscape: 'fighting', atmosphere: combat.id }}
      choice={{ soundscape: { pieceId: lament.id }, atmosphere: { atmosphereId: waves.id } }} />);
    await settle();
    expect(soundtrack.piece()?.id).toBe(lament.id);
    expect(mixer.getPreferences().atmosphereId).toBe(waves.id);

    // Back to Automatic: the chapter's scene plays.
    render(<Reader active scene={{ soundscape: 'fighting', atmosphere: combat.id }} />);
    await settle();
    expect(moodOf('fighting')).toContain(soundtrack.piece()?.id);
    expect(mixer.getPreferences().atmosphereId).toBe(combat.id);
    act(() => root.unmount());
  });

  it('reads a chapter with the scene its writer chose, each part carried on from the chapters before when it chose none', () => {
    const chapters = [
      { chapterNumber: 1, scene: { soundscape: 'mystical', atmosphere: 'rain' } },
      { chapterNumber: 2, scene: { soundscape: 'fighting' } },
      { chapterNumber: 3 },
      { chapterNumber: 4, scene: { atmosphere: 'wind' } },
    ];
    expect(readingScene(chapters, 1)).toEqual({ soundscape: 'mystical', atmosphere: 'rain' });
    expect(readingScene(chapters, 2)).toEqual({ soundscape: 'fighting', atmosphere: 'rain' });
    expect(readingScene(chapters, 3)).toEqual({ soundscape: 'fighting', atmosphere: 'rain' });
    expect(readingScene(chapters, 4)).toEqual({ soundscape: 'fighting', atmosphere: 'wind' });
    expect(readingScene([{ chapterNumber: 1 }], 1)).toBeUndefined();
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
