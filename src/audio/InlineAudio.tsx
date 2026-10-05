import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NarrativeSoundGlyph as LibrarySoundGlyph } from '../presentation';
import {
  matchLeadingInlineAudioPunctuation,
  resolvePlayableSoundCue,
  soundCueTrackId,
  splitBySoundCues,
  type InlineAudioTextSegment,
  type SoundCueAttachment,
} from './inlineAudio';
import { useOptionalReaderMixer, type ReaderMixer, type ReaderMixerState } from '@seihouse/audio-player';
import { AUDIO_ENERGIES, type AudioEnergy } from './audioTags';
import { useOptionalNarrativeAudio, type NarrativeAudioPlayback } from './playback';
import './InlineAudio.css';

export type InlineAudioStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface InlineAudioControlProps {
  cue: SoundCueAttachment;
  playback: NarrativeAudioPlayback;
}

/**
 * Native inline button kept separate from the playback hook so its complete
 * lifecycle can be tested with the same adapter contract the Reader uses.
 */
export function InlineAudioControl({ cue, playback }: InlineAudioControlProps) {
  const statusId = useId();
  const [status, setStatus] = useState<InlineAudioStatus>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const playbackRef = useRef(playback);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  const resolution = useMemo(() => resolvePlayableSoundCue(cue), [cue]);
  const trackId = resolution.ok ? soundCueTrackId(cue) : null;
  const words = cue.anchor.selectedText;
  const sound = cue.payload.sound;

  useEffect(() => playback.subscribe((event) => {
    if (!trackId) return;
    if (event.type === 'track-change') {
      if (event.trackId === trackId) {
        setLocalError(null);
        setStatus('loading');
      } else {
        setStatus('idle');
      }
      return;
    }
    if (event.type === 'queue-end') {
      if (playbackRef.current.currentTrackId === trackId) setStatus('idle');
      return;
    }
    if (event.trackId !== trackId) return;
    if (event.type === 'play') {
      if (playbackRef.current.currentTrackId !== trackId) {
        setStatus('idle');
        return;
      }
      setLocalError(null);
      setStatus('playing');
    } else if (event.type === 'pause') {
      setStatus('idle');
    } else if (event.type === 'error') {
      setLocalError(event.error || 'The story cue could not be played.');
      setStatus('error');
    }
  }), [playback, trackId]);

  useEffect(() => {
    if (!trackId) return;
    if (playback.currentTrackId !== trackId) {
      setLocalError(null);
      setStatus('idle');
      return;
    }
    if (playback.hasError) {
      setLocalError(playback.errorMessage || 'The story cue could not be played.');
      setStatus('error');
    } else if (playback.autoplayBlocked) {
      setLocalError('Playback was blocked. Tap the highlight again to retry.');
      setStatus('error');
    } else if (playback.isBuffering) {
      setStatus('loading');
    } else if (playback.isPlaying) {
      setStatus('playing');
    }
  }, [playback, trackId]);

  // Only release this control's own cue. If another highlight replaced it,
  // the guarded stop is a no-op and the newer cue keeps playing.
  useEffect(() => () => {
    if (trackId) playbackRef.current.stop(trackId);
  }, [trackId]);

  const activate = useCallback(() => {
    setLocalError(null);
    if (!resolution.ok) {
      setLocalError(resolution.message);
      setStatus('error');
      return;
    }
    if (!trackId) {
      setLocalError('The story cue could not be resolved.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      playback.replace({
        id: trackId,
        source: resolution.publicUrl,
        title: words,
        artist: 'Story cue',
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'The story cue could not be played.');
      setStatus('error');
    }
  }, [words, playback, resolution, trackId]);

  if (!resolution.ok) return null;
  return <CueButton cue={cue} status={status} statusId={statusId} words={words} sound={sound} error={localError} onActivate={activate} />;
}

/**
 * How loud a cue plays within the reader's Sound Cues level: the Energy the
 * writer gave the moment. A cue with no Energy plays as medium.
 */
export const SOUND_CUE_ENERGY_VOLUME: Readonly<Record<AudioEnergy, number>> = Object.freeze({ low: 0.6, medium: 0.8, high: 1 });

/** A saved cue's Energy as a volume; anything other than low, medium or high plays as medium. */
function soundCueVolume(energy: unknown): number {
  return (AUDIO_ENERGIES as readonly unknown[]).includes(energy) ? SOUND_CUE_ENERGY_VOLUME[energy as AudioEnergy] : SOUND_CUE_ENERGY_VOLUME.medium;
}

export interface MixerCueControlProps {
  cue: SoundCueAttachment;
  mixer: ReaderMixer;
}

/** Why a tap did not play, from the mixer's own state, in the reader's words. */
function skippedCueMessage(state: ReaderMixerState): string {
  if (!state.preferences.masterEnabled) return 'Story audio is muted. Tap the note to turn it on.';
  if (!state.preferences.layers.cues.enabled || state.preferences.layers.cues.level <= 0) return 'Sound Cues are off in Audio settings.';
  if (state.layers.cues.status === 'blocked') return 'Playback was blocked. Tap the highlight again to retry.';
  return 'The story cue could not be played.';
}

/**
 * A Sound Cue played through the reader's mixer: it plays over the music and
 * atmosphere without stopping them, cues may overlap, and its loudness is the
 * reader's Sound Cues level times the moment's Energy.
 */
export function MixerCueControl({ cue, mixer }: MixerCueControlProps) {
  const statusId = useId();
  const [status, setStatus] = useState<InlineAudioStatus>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const resolution = useMemo(() => resolvePlayableSoundCue(cue), [cue]);
  const url = resolution.ok ? resolution.publicUrl.trim() : null;
  const words = cue.anchor.selectedText;
  const sound = cue.payload.sound;
  const [listening, setListening] = useState(false);

  // While this cue is sounding, follow the mixer until the Sound Cues layer
  // settles: it fails on this cue, or nothing is playing any more.
  useEffect(() => {
    if (!listening || !url) return undefined;
    const follow = (state: ReaderMixerState) => {
      const cues = state.layers.cues;
      if (cues.status === 'failed' && cues.current === url) {
        setLocalError(cues.failure || 'The story cue could not be played.');
        setStatus('error');
        setListening(false);
      } else if (state.activeCues === 0 && cues.status !== 'blocked') {
        setStatus('idle');
        setListening(false);
      }
    };
    return mixer.subscribe(follow);
  }, [listening, mixer, url]);

  const activate = useCallback(() => {
    setLocalError(null);
    if (!resolution.ok || !url) {
      setLocalError(resolution.ok ? 'The story cue could not be resolved.' : resolution.message);
      setStatus('error');
      return;
    }
    const played = mixer.playCue(url, { volume: soundCueVolume(cue.payload.energy) });
    if (!played) {
      setLocalError(skippedCueMessage(mixer.getState()));
      setStatus('error');
      return;
    }
    setStatus('playing');
    setListening(true);
  }, [cue.payload.energy, mixer, resolution, url]);

  if (!resolution.ok) return null;
  return <CueButton cue={cue} status={status} statusId={statusId} words={words} sound={sound} error={localError} onActivate={activate} />;
}

/** The glyph on a cue's words and its screen-reader status, shared by both playback routes. */
function CueButton({ cue, status, statusId, words, sound, error, onActivate }: {
  cue: SoundCueAttachment; status: InlineAudioStatus; statusId: string; words: string; sound: string;
  error: string | null; onActivate: () => void;
}) {
  const stateMessage = status === 'loading'
    ? `Loading ${sound} for ${words}.`
    : status === 'playing'
      ? `Playing ${sound} for ${words}.`
      : status === 'error'
        ? error ?? `The ${sound} for ${words} is unavailable.`
        : '';
  return (
    <>
      <button
        type="button"
        className="inline-world-cue"
        data-action-type="world-cue"
        data-cue-phrase={words}
        data-sound-cue-id={cue.id}
        data-sound={sound}
        data-state={status}
        aria-busy={status === 'loading' || undefined}
        aria-describedby={status === 'idle' ? undefined : statusId}
        aria-label={`${status === 'playing' ? 'Replay' : 'Play'} ${sound} for ${words}`}
        onClick={onActivate}
      >
        <LibrarySoundGlyph className="inline-world-cue__glyph" />
      </button>
      {/* Announced to screen readers, but never part of the passage text, so
          offsets and highlights stay true while a cue loads, plays or fails. */}
      <span id={statusId} className="sr-only" aria-live="polite" data-sen-selection-ignore="">
        {stateMessage}
      </span>
    </>
  );
}

export interface InlineAudioProps {
  cue: SoundCueAttachment;
}

/**
 * Production-portable Reader primitive. With the host's reader mixer (the
 * SEIHouse audio player) a cue plays over the soundtrack; a host that supplies
 * only a single-channel `NarrativeAudioProvider` keeps that route.
 */
export function InlineAudio({ cue }: InlineAudioProps) {
  const mixer = useOptionalReaderMixer();
  const playback = useOptionalNarrativeAudio();
  if (mixer) return <MixerCueControl cue={cue} mixer={mixer} />;
  if (!playback) throw new Error('Sound Cues require a host ReaderMixerProvider or NarrativeAudioProvider.');
  return <InlineAudioControl cue={cue} playback={playback} />;
}

export interface InlineAudioTextProps {
  /** The paragraph's Sound Cues, anchored by offsets into `text`. */
  cues: readonly SoundCueAttachment[];
  renderText: (text: string) => ReactNode;
  text: string;
}

interface InlineAudioRenderSegment extends InlineAudioTextSegment {
  /** Possessive suffixes remain part of the term and sit before its cue mark. */
  possessive?: string;
  /** Immediately adjacent punctuation follows the cue mark inside one line box. */
  punctuation?: string;
}

const INLINE_POSSESSIVE = /^(?:['’][sS])(?=$|[\s,.;:!?…—–"”')\]}])/u;
const WORD_JOINER = '\u2060';

/**
 * Pull only text that visually belongs to the matched term out of the next
 * plain segment. The final word, mark, and punctuation can then stay joined
 * without changing the rest of the prose flow.
 */
function attachTrailingProse(
  segments: readonly InlineAudioTextSegment[],
): InlineAudioRenderSegment[] {
  const result: InlineAudioRenderSegment[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment.cue) {
      result.push(segment);
      continue;
    }

    const next = segments[index + 1];
    if (!next || next.cue) {
      result.push(segment);
      continue;
    }

    const possessive = next.text.match(INLINE_POSSESSIVE)?.[0] ?? '';
    const afterPossessive = next.text.slice(possessive.length);
    const punctuation = matchLeadingInlineAudioPunctuation(afterPossessive);
    const consumedLength = possessive.length + punctuation.length;

    result.push({
      ...segment,
      possessive: possessive || undefined,
      punctuation: punctuation || undefined,
    });
    if (consumedLength < next.text.length) {
      result.push({ text: next.text.slice(consumedLength) });
    }
    index += 1;
  }

  return result;
}

/** Marks only the words each playable Sound Cue covers; every other text run stays native prose. */
export function InlineAudioText({ cues, renderText, text }: InlineAudioTextProps) {
  const playableCues = useMemo(
    () => cues.filter(cue => resolvePlayableSoundCue(cue).ok),
    [cues],
  );
  const segments = useMemo(
    () => attachTrailingProse(splitBySoundCues(text, playableCues)),
    [playableCues, text],
  );

  return (
    <>
      {segments.map((segment, index) => (
        segment.cue
          ? (
              <span
                key={`${segment.cue.id}-${index}`}
                className="inline-world-cue-annotation"
                data-cue-annotation={segment.cue.anchor.selectedText}
              >
                <span className="inline-world-cue-annotation__text">
                  {renderText(segment.text)}
                </span>
                {segment.possessive}
                <span className="inline-world-cue-joiner" aria-hidden="true">{WORD_JOINER}</span>
                <InlineAudio cue={segment.cue} />
                {segment.punctuation && (
                  <>
                    <span className="inline-world-cue-joiner" aria-hidden="true">{WORD_JOINER}</span>
                    {segment.punctuation}
                  </>
                )}
              </span>
            )
          : <React.Fragment key={`text-${index}`}>{renderText(segment.text)}</React.Fragment>
      ))}
    </>
  );
}
