import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LibrarySoundGlyph } from '../../library';
import {
  getInlineCueTrackId,
  matchLeadingInlineAudioPunctuation,
  resolvePlayableAudioMoment,
  splitByResolvedAudioMoments,
  type InlineAudioTextSegment,
  type ResolvedAudioMoment,
} from '../../../audio/inlineAudio';
import {
  useDevAudioPlayback,
  type DevAudioPlayback,
} from '../../../audio/DevAudioPlayback';
import './InlineAudio.css';

export type InlineAudioStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface InlineAudioControlProps {
  moment: ResolvedAudioMoment;
  playback: DevAudioPlayback;
}

/**
 * Native inline button kept separate from the playback hook so its complete
 * lifecycle can be tested with the same adapter contract the Reader uses.
 */
export function InlineAudioControl({ moment, playback }: InlineAudioControlProps) {
  const statusId = useId();
  const [status, setStatus] = useState<InlineAudioStatus>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const playbackRef = useRef(playback);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  const resolution = useMemo(() => resolvePlayableAudioMoment(moment), [moment]);
  const trackId = resolution.ok ? getInlineCueTrackId(moment) : null;

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
      setLocalError(event.error || 'The Library Cue could not be played.');
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
      setLocalError(playback.errorMessage || 'The Library Cue could not be played.');
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
      setLocalError('The Library Cue could not be resolved.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      playback.replace({
        id: trackId,
        source: resolution.publicUrl,
        title: moment.triggerPhrase,
        artist: 'SEN Library Cue',
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'The Library Cue could not be played.');
      setStatus('error');
    }
  }, [moment.triggerPhrase, playback, resolution, trackId]);

  const actionLabel = resolution.ok ? resolution.actionLabel : 'audio';
  const stateMessage = status === 'loading'
    ? `Loading ${actionLabel} for ${moment.triggerPhrase}.`
    : status === 'playing'
      ? `Playing ${actionLabel} for ${moment.triggerPhrase}.`
      : status === 'error'
        ? localError ?? `The ${actionLabel} for ${moment.triggerPhrase} is unavailable.`
        : '';
  if (!resolution.ok) return null;
  return (
    <>
      <button
        type="button"
        className="inline-world-cue"
        data-action-type={moment.sourceCategory === 'voice' ? moment.actionType : 'world-cue'}
        data-cue-phrase={moment.triggerPhrase}
        data-audio-moment-id={moment.id}
        data-state={status}
        aria-busy={status === 'loading' || undefined}
        aria-describedby={status === 'idle' ? undefined : statusId}
        aria-label={`${status === 'playing' ? 'Replay' : 'Play'} ${actionLabel} for ${moment.triggerPhrase}`}
        onClick={activate}
      >
        <LibrarySoundGlyph className="inline-world-cue__glyph" />
      </button>
      <span id={statusId} className="sr-only" aria-live="polite">
        {stateMessage}
      </span>
    </>
  );
}

export interface InlineAudioProps {
  moment: ResolvedAudioMoment;
}

/** Production-portable Reader primitive bound to the one shared audio owner. */
export function InlineAudio({ moment }: InlineAudioProps) {
  const playback = useDevAudioPlayback();
  return <InlineAudioControl moment={moment} playback={playback} />;
}

export interface InlineAudioTextProps {
  moments: readonly ResolvedAudioMoment[];
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
    if (!segment.moment) {
      result.push(segment);
      continue;
    }

    const next = segments[index + 1];
    if (!next || next.moment) {
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

/** Replace only configured literal phrases; every other text run stays native prose. */
export function InlineAudioText({ moments, renderText, text }: InlineAudioTextProps) {
  const playableMoments = useMemo(
    () => moments.filter(moment => resolvePlayableAudioMoment(moment).ok),
    [moments],
  );
  const segments = useMemo(
    () => attachTrailingProse(splitByResolvedAudioMoments(text, playableMoments)),
    [playableMoments, text],
  );

  return (
    <>
      {segments.map((segment, index) => (
        segment.moment
          ? (
              <span
                key={`${segment.moment.id}-${index}`}
                className="inline-world-cue-annotation"
                data-cue-annotation={segment.moment.triggerPhrase}
              >
                <span className="inline-world-cue-annotation__text">
                  {renderText(segment.text)}
                </span>
                {segment.possessive}
                <span className="inline-world-cue-joiner" aria-hidden="true">{WORD_JOINER}</span>
                <InlineAudio moment={segment.moment} />
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
