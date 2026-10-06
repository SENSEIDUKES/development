import { useEffect, useMemo, useRef } from 'react';
import { useOptionalReaderMixer, type ReaderMixer } from '@seihouse/audio-player';
import { resolvePlayableSoundCue, type SoundCueAttachment } from '@seihouse/sen/audio';

/** How far the soundtrack drops while Listen reads aloud: the player's own narration duck. */
export const LISTEN_DUCK = 0.6;

/**
 * The Reader's part of the reader mixer (the host's SEIHouse audio player),
 * for the chapter on screen:
 *
 * - The reader's chosen atmosphere plays while the Reader holds a chapter,
 *   under the Reader's own pages too (Fate, Holdings, an arc's page) and the
 *   writing screen: only leaving the Reader stops every layer and ends the
 *   session. The reader's mix itself is never changed here.
 * - Only what the chapter uses appears in Audio settings: Sound Cues when it
 *   has some. Soundscapes are not chosen by the new Reader yet.
 * - The chapter's cues are warmed before their words are reached.
 * - While Listen reads aloud, the soundtrack dips under the voice and the
 *   reader counts as active, so the idle pause never stops a listener.
 * - A sleep timer that fires stops Listen as well as the soundtrack.
 * - Reaching the chapter's end (its chapter navigation in view, or Listen
 *   finishing it, wherever the page is) is what an End of chapter timer
 *   waits for.
 *
 * Without a mixer (a host that supplies none) it does nothing.
 */
export function useReaderSoundtrack({ active, chapterId, soundCues, speaking, listenEnded, onSleep, chapterEnd }: {
  /** True while the Reader holds a chapter (its pages and the writing screen included), where the story audio note can silence it. */
  active: boolean;
  /** The chapter on screen. */
  chapterId?: string;
  soundCues?: readonly SoundCueAttachment[];
  /** True while Listen is reading a line aloud (not while paused). */
  speaking: boolean;
  /** True once Listen has read this chapter to its end. */
  listenEnded: boolean;
  /** Stops the host's own narration (Listen) when the sleep timer fires. */
  onSleep: () => void;
  /** The element whose arrival in view means the chapter has been read to its end (null until it is on screen). */
  chapterEnd: HTMLElement | null;
}): ReaderMixer | null {
  const mixer = useOptionalReaderMixer();

  useEffect(() => (mixer ? () => mixer.stopAll() : undefined), [mixer]);
  useEffect(() => {
    if (!mixer || !active) return undefined;
    mixer.startAtmosphere();
    return () => mixer.stopAtmosphere();
  }, [mixer, active]);

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

  // Only Listen reaching the end counts: opening the next chapter still shows the last one as ended for a moment.
  useEffect(() => {
    if (mixer && listenEnded) mixer.notifyChapterEnd();
  }, [mixer, listenEnded]);
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
