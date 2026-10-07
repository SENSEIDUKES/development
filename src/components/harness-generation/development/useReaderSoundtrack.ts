import { useEffect, useMemo, useRef } from 'react';
import { useOptionalReaderMixer, type ReaderMixer } from '@seihouse/audio-player';
import { resolvePlayableSoundCue, type SceneAudioTrack, type SoundCueAttachment } from '@seihouse/sen/audio';
import { storySoundtrack, type SoundtrackChoice, type SoundtrackRequest } from '@seihouse/sen/reader-runtime';
import type { HarnessChapter, HarnessChapterScene } from '../../../narrative/generation';

/** How far the soundtrack drops while Listen reads aloud: the player's own narration duck. */
export const LISTEN_DUCK = 0.6;

/**
 * The scene a chapter is read with: the music and atmosphere its writer
 * chose, each carried on from the chapters before it when the writer chose
 * none, so a chapter that leaves one out goes on with the one before.
 */
export function readingScene(chapters: readonly Pick<HarnessChapter, 'chapterNumber' | 'scene'>[], chapterNumber: number): HarnessChapterScene | undefined {
  let soundscape: string | undefined;
  let atmosphere: string | undefined;
  for (const chapter of [...chapters].sort((left, right) => right.chapterNumber - left.chapterNumber)) {
    if (chapter.chapterNumber > chapterNumber) continue;
    soundscape ??= chapter.scene?.soundscape;
    atmosphere ??= chapter.scene?.atmosphere;
    if (soundscape && atmosphere) break;
  }
  return soundscape || atmosphere ? { ...(soundscape ? { soundscape } : {}), ...(atmosphere ? { atmosphere } : {}) } : undefined;
}

/**
 * The Reader's part of the reader mixer (the host's SEIHouse audio player),
 * for the chapter on screen:
 *
 * - While the Reader is open, its atmosphere plays, from the moment it opens
 *   (the writing screen of Chapter 1 included) and under the Reader's own
 *   pages (Fate, Holdings, an arc's page). Leaving the Reader stops it and
 *   ends the listening session (a sleep timer with it); the host's own music,
 *   if it has some, plays on outside.
 * - Each chapter is read with its own scene (see {@link readingScene}).
 *   Automatic (the default): its music, pieces of the mood its writer chose
 *   one after another, takes over from whatever was playing, and its
 *   atmosphere replaces the one before. Without a scene (chapters written
 *   before scenes), the host's music and the atmosphere playing go on. The
 *   reader's own choice of a piece or an atmosphere stays, whatever the
 *   chapters choose. The reader's levels are never changed here.
 * - Audio settings show the music, the atmosphere, and Sound Cues when the
 *   chapter has some.
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
export function useReaderSoundtrack({ active, chapterId, soundCues, scene, pieces, choice, speaking, listenEnded, onSleep, chapterEnd }: {
  /** True while the Reader is open (its pages and the writing screen included), where the story audio note can silence it. */
  active: boolean;
  /** The chapter on screen. */
  chapterId?: string;
  soundCues?: readonly SoundCueAttachment[];
  /** The chapter's own music and atmosphere, as its writer chose them. */
  scene?: HarnessChapterScene;
  /** The soundscapes the chapter was written with: its music comes from these. */
  pieces?: readonly SceneAudioTrack[];
  /** Who chooses the music and the atmosphere: each chapter (Automatic) or the reader. */
  choice: SoundtrackChoice;
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

  // Leaving the Reader ends its listening session; the host's music, if any, comes back.
  useEffect(() => (mixer ? () => {
    mixer.stopAll();
    storySoundtrack(mixer).resume();
  } : undefined), [mixer]);
  useEffect(() => {
    if (!mixer || !active) return undefined;
    mixer.startAtmosphere();
    return () => mixer.stopAtmosphere();
  }, [mixer, active]);

  // The atmosphere: the reader's own, or the chapter's. Without either, the one playing stays.
  const atmosphereId = choice.atmosphere === 'automatic' ? scene?.atmosphere : choice.atmosphere.atmosphereId;
  useEffect(() => {
    if (!mixer || !active || !atmosphereId) return;
    if (!mixer.getAtmosphereOptions().some(option => option.id === atmosphereId)) return;
    if (mixer.getPreferences().atmosphereId !== atmosphereId) mixer.setAtmosphere(atmosphereId);
  }, [mixer, active, atmosphereId]);

  // The music: the reader's own piece, or the chapter's mood. Without either, the music playing goes on.
  const chosenId = choice.soundscape === 'automatic' ? undefined : choice.soundscape.pieceId;
  const mood = scene?.soundscape;
  useEffect(() => {
    if (!mixer || !active) return undefined;
    const chosen = chosenId ? pieces?.find(piece => piece.id === chosenId) : undefined;
    const request: SoundtrackRequest | undefined = chosen ? { piece: chosen } : mood && pieces?.length ? { mood, pieces } : undefined;
    return request ? storySoundtrack(mixer).hold(request) : undefined;
  }, [mixer, active, chosenId, mood, pieces]);

  const cueUrls = useMemo(() => [...new Set((soundCues ?? []).flatMap(cue => {
    const playable = resolvePlayableSoundCue(cue);
    return playable.ok ? [playable.publicUrl.trim()] : [];
  }))], [soundCues]);
  useEffect(() => {
    if (!mixer) return;
    mixer.setLayerAvailability({ soundscapes: true, cues: cueUrls.length > 0 });
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
