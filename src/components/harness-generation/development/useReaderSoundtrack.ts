import { useEffect, useMemo, useRef } from 'react';
import { useOptionalReaderMixer, type ReaderMixer } from '@seihouse/audio-player';
import { resolvePlayableSoundCue, type SoundCueAttachment } from '@seihouse/sen/audio';

/** How far the soundtrack drops while Listen reads aloud: the player's own narration duck. */
export const LISTEN_DUCK = 0.6;

/**
 * The Reader's part of the reader mixer (the host's SEIHouse audio player),
 * for the chapter on screen:
 *
 * - Entering the Reader starts the reader's chosen atmosphere; leaving it
 *   stops every layer. The reader's mix itself is never changed here.
 * - Only what the chapter uses appears in Audio settings: Sound Cues when it
 *   has some. Soundscapes are not chosen by the new Reader yet.
 * - The chapter's cues are warmed before their words are reached.
 * - While Listen reads aloud, the soundtrack dips under the voice and the
 *   reader counts as active, so the idle pause never stops a listener.
 * - A sleep timer that fires stops Listen as well as the soundtrack.
 * - Reaching the chapter's end (its chapter navigation in view, or Listen
 *   finishing it) is what an End of chapter timer waits for.
 *
 * Without a mixer (a host that supplies none) it does nothing.
 */
export function useReaderSoundtrack({ chapterId, soundCues, speaking, onSleep, chapterEnd }: {
  /** The chapter on screen. */
  chapterId?: string;
  soundCues?: readonly SoundCueAttachment[];
  /** True while Listen is reading a line aloud (not while paused). */
  speaking: boolean;
  /** Stops the host's own narration (Listen) when the sleep timer fires. */
  onSleep: () => void;
  /** The element whose arrival in view means the chapter has been read to its end (null until it is on screen). */
  chapterEnd: HTMLElement | null;
}): ReaderMixer | null {
  const mixer = useOptionalReaderMixer();

  useEffect(() => {
    if (!mixer) return undefined;
    mixer.startAtmosphere();
    return () => mixer.stopAll();
  }, [mixer]);

  const cueUrls = useMemo(() => [...new Set((soundCues ?? []).flatMap(cue => {
    const playable = resolvePlayableSoundCue(cue);
    return playable.ok ? [playable.publicUrl.trim()] : [];
  }))], [soundCues]);
  useEffect(() => {
    if (!mixer) return;
    mixer.setLayerAvailability({ soundscapes: false, cues: cueUrls.length > 0 });
    if (cueUrls.length) mixer.preloadCues(cueUrls);
  }, [mixer, chapterId, cueUrls]);

  useEffect(() => {
    if (!mixer || !speaking) return undefined;
    const duck = mixer.retainDuck();
    duck.setDuck(LISTEN_DUCK);
    const releaseActivity = mixer.retainActivity();
    return () => {
      duck.release();
      releaseActivity();
    };
  }, [mixer, speaking]);

  const onSleepRef = useRef(onSleep);
  onSleepRef.current = onSleep;
  useEffect(() => (mixer ? mixer.subscribeSleep(() => onSleepRef.current()) : undefined), [mixer]);

  useEffect(() => {
    if (!mixer || !chapterEnd || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) mixer.notifyChapterEnd();
    });
    observer.observe(chapterEnd);
    return () => observer.disconnect();
  }, [mixer, chapterId, chapterEnd]);

  return mixer;
}
