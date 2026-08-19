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
  resolveInlineSoundAction,
  splitByInlineAudioHighlights,
  type InlineAudioHighlight,
  type InlineAudioTextSegment,
} from '../../../audio/inlineAudio';
import {
  useDevAudioPlayback,
  type DevAudioPlayback,
} from '../../../audio/DevAudioPlayback';
import './InlineAudio.css';

export type InlineAudioStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface InlineAudioControlProps {
  highlight: InlineAudioHighlight;
  playback: DevAudioPlayback;
}

/**
 * Native inline button kept separate from the playback hook so its complete
 * lifecycle can be tested with the same adapter contract the Reader uses.
 */
export function InlineAudioControl({ highlight, playback }: InlineAudioControlProps) {
  const statusId = useId();
  const [status, setStatus] = useState<InlineAudioStatus>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const playbackRef = useRef(playback);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  const resolution = useMemo(() => (
    highlight.action.type === 'sound'
      ? resolveInlineSoundAction(highlight.action)
      : null
  ), [highlight.action]);
  const trackId = resolution?.ok ? getInlineCueTrackId(resolution.cue) : null;

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
    if (!trackId || playback.currentTrackId !== trackId) return;
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
    if (highlight.action.type === 'voice') {
      setLocalError('Voice quotes are reserved for a later server-synthesis phase.');
      setStatus('error');
      return;
    }
    if (!resolution || !resolution.ok) {
      setLocalError(resolution?.message ?? 'The Library Cue could not be resolved.');
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
        source: resolution.cue.public_url,
        title: highlight.phrase,
        artist: 'SEN Library Cue',
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'The Library Cue could not be played.');
      setStatus('error');
    }
  }, [highlight.action, highlight.phrase, playback, resolution, trackId]);

  const isVoice = highlight.action.type === 'voice';
  const actionLabel = isVoice ? 'voice cue' : 'World Cue';
  const stateMessage = status === 'loading'
    ? `Loading ${actionLabel} for ${highlight.phrase}.`
    : status === 'playing'
      ? `Playing ${actionLabel} for ${highlight.phrase}.`
      : status === 'error'
        ? localError ?? `The ${actionLabel} for ${highlight.phrase} is unavailable.`
        : '';
  return (
    <>
      <button
        type="button"
        className="inline-world-cue"
        data-action-type={highlight.action.type}
        data-cue-phrase={highlight.phrase}
        data-state={status}
        aria-busy={status === 'loading' || undefined}
        aria-describedby={status === 'idle' ? undefined : statusId}
        aria-label={`${status === 'playing' ? 'Replay' : 'Play'} ${actionLabel} for ${highlight.phrase}`}
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
  highlight: InlineAudioHighlight;
}

/** Production-portable Reader primitive bound to the one shared audio owner. */
export function InlineAudio({ highlight }: InlineAudioProps) {
  const playback = useDevAudioPlayback();
  return <InlineAudioControl highlight={highlight} playback={playback} />;
}

export interface InlineAudioTextProps {
  highlights: readonly InlineAudioHighlight[];
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
const INLINE_PUNCTUATION = /^[,.;:!?…—–"”')\]}]+/u;
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
    if (!segment.highlight) {
      result.push(segment);
      continue;
    }

    const next = segments[index + 1];
    if (!next || next.highlight) {
      result.push(segment);
      continue;
    }

    const possessive = next.text.match(INLINE_POSSESSIVE)?.[0] ?? '';
    const afterPossessive = next.text.slice(possessive.length);
    const punctuation = afterPossessive.match(INLINE_PUNCTUATION)?.[0] ?? '';
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
export function InlineAudioText({ highlights, renderText, text }: InlineAudioTextProps) {
  const segments = useMemo(
    () => attachTrailingProse(splitByInlineAudioHighlights(text, highlights)),
    [highlights, text],
  );

  return (
    <>
      {segments.map((segment, index) => (
        segment.highlight
          ? (
              <span
                key={`${segment.highlight.id}-${index}`}
                className="inline-world-cue-annotation"
                data-cue-annotation={segment.highlight.phrase}
              >
                {renderText(segment.text)}
                {segment.possessive}
                <span className="inline-world-cue-joiner" aria-hidden="true">{WORD_JOINER}</span>
                <InlineAudio highlight={segment.highlight} />
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
