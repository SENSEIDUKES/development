import {
  AudioSessionProvider,
  type Track,
  useAudioSession,
} from '@seihouse/audio-player';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from 'react';
import '@seihouse/audio-player/styles.css';

export interface DevAudioRequest {
  id: string;
  source: string;
  title?: string;
  artist?: string;
}

export type DevAudioPlaybackEvent =
  | { type: 'track-change'; trackId: string | null }
  | { type: 'play'; trackId: string }
  | { type: 'pause'; trackId: string | null }
  | { type: 'queue-end' }
  | { type: 'error'; trackId: string | null; error: string };

export interface DevAudioPlayback {
  autoplayBlocked: boolean;
  currentSource: string | null;
  currentTrackId: string | null;
  errorMessage: string;
  hasError: boolean;
  isBuffering: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  volume: number;
  load: (request: DevAudioRequest) => void;
  pause: () => void;
  play: (request?: DevAudioRequest) => void;
  /** Replace the shared queue and play one user-requested source immediately. */
  replace: (request: DevAudioRequest) => void;
  /** Restart the current shared track from the beginning after a user gesture. */
  restart: (trackId: string) => boolean;
  setVolume: (volume: number) => void;
  stop: (trackId?: string) => void;
  subscribe: (handler: (event: DevAudioPlaybackEvent) => void) => () => void;
  subscribeToTrackChange: (handler: (trackId: string | null) => void) => () => void;
  subscribeToQueueEnd: (handler: () => void) => () => void;
  toggleMute: () => void;
}

const DevAudioPlaybackContext = createContext<DevAudioPlayback | null>(null);

const AUDIO_DATA_URI = /^data:(audio\/[a-z0-9.+-]+);base64,([a-z0-9+/]+=*)$/iu;
const POST_QUEUE_PLAYBACK_DELAY_MS = 100;

/**
 * Data URIs are useful for carrying one server response through application
 * state, but large synthesized clips are not a reliable media-element source
 * in every browser. The shared player owns the conversion to a local Blob URL
 * so callers still have one playback lifecycle and never create audio tags.
 */
const audioDataUriToBlob = (source: string): Blob | null => {
  const match = AUDIO_DATA_URI.exec(source.trim());
  if (!match) return null;

  const [, mimeType, encodedAudio] = match;
  const decodedAudio = atob(encodedAudio);
  const bytes = new Uint8Array(decodedAudio.length);
  for (let index = 0; index < decodedAudio.length; index += 1) {
    bytes[index] = decodedAudio.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
};

function DevAudioPlaybackBridge({ children }: PropsWithChildren) {
  const session = useAudioSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const transientAudioUrlsRef = useRef(new Set<string>());
  const replacePlaybackTokenRef = useRef(0);
  const replacePlaybackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toTrack = useCallback((request: DevAudioRequest): Track => {
    const audioBlob = audioDataUriToBlob(request.source);
    const audioFile = audioBlob ? URL.createObjectURL(audioBlob) : request.source;
    if (audioBlob) transientAudioUrlsRef.current.add(audioFile);
    return {
      id: request.id,
      title: request.title ?? 'DEV audio',
      artist: request.artist ?? 'SEN Development',
      audioFile,
    };
  }, []);

  // A Blob URL must remain available while its track is active, but stale
  // synthesized clips should not remain resident after the shared queue moves
  // on. The session is the sole lifecycle owner, so this never creates a
  // second player or leaves cleanup to Character Card UI code.
  useEffect(() => {
    const activeSource = session.currentTrack?.audioFile;
    for (const source of transientAudioUrlsRef.current) {
      if (source === activeSource) continue;
      URL.revokeObjectURL(source);
      transientAudioUrlsRef.current.delete(source);
    }
  }, [session.currentTrack?.audioFile]);

  useEffect(() => () => {
    replacePlaybackTokenRef.current += 1;
    if (replacePlaybackTimerRef.current !== null) {
      clearTimeout(replacePlaybackTimerRef.current);
      replacePlaybackTimerRef.current = null;
    }
    for (const source of transientAudioUrlsRef.current) URL.revokeObjectURL(source);
    transientAudioUrlsRef.current.clear();
  }, []);

  const load = useCallback((request: DevAudioRequest) => {
    session.setQueue([toTrack(request)]);
  }, [session, toTrack]);

  const play = useCallback((request?: DevAudioRequest) => {
    if (request) {
      session.playNow(toTrack(request));
      return;
    }
    void session.play();
  }, [session, toTrack]);

  const replace = useCallback((request: DevAudioRequest) => {
    const playbackToken = replacePlaybackTokenRef.current + 1;
    replacePlaybackTokenRef.current = playbackToken;
    // `setQueue(..., true)` asks the player to begin while its own source
    // reset effect is still running. That follow-up reset pauses the newly
    // started track and rejects the play promise as AbortError. Queue first,
    // then start after that reset window using the latest session state.
    session.pause();
    session.setQueue([toTrack(request)]);
    if (replacePlaybackTimerRef.current !== null) clearTimeout(replacePlaybackTimerRef.current);
    replacePlaybackTimerRef.current = setTimeout(() => {
      if (replacePlaybackTokenRef.current !== playbackToken) return;
      replacePlaybackTimerRef.current = null;
      void sessionRef.current.play();
    }, POST_QUEUE_PLAYBACK_DELAY_MS);
  }, [session, toTrack]);

  const restart = useCallback((trackId: string): boolean => {
    if (session.currentTrack?.id !== trackId) return false;
    session.pause();
    session.seek(0);
    session.dismissAutoplayBlocked();
    void session.play();
    return true;
  }, [session]);

  const stop = useCallback((trackId?: string) => {
    if (trackId && session.currentTrack?.id !== trackId) return;
    session.pause();
    session.seek(0);
  }, [session]);

  const subscribeToQueueEnd = useCallback((handler: () => void) => (
    session.subscribe('queue-end', handler)
  ), [session]);

  const subscribeToTrackChange = useCallback((handler: (trackId: string | null) => void) => (
    session.subscribe('track-change', ({ track }) => handler(track?.id ?? null))
  ), [session]);

  const subscribe = useCallback((handler: (event: DevAudioPlaybackEvent) => void) => {
    const unsubscribers = [
      session.subscribe('track-change', ({ track }) => {
        handler({ type: 'track-change', trackId: track?.id ?? null });
      }),
      session.subscribe('play', ({ track }) => {
        if (track.id) handler({ type: 'play', trackId: track.id });
      }),
      session.subscribe('pause', ({ track }) => {
        handler({ type: 'pause', trackId: track?.id ?? null });
      }),
      session.subscribe('queue-end', () => {
        handler({ type: 'queue-end' });
      }),
      session.subscribe('error', ({ track, error }) => {
        handler({ type: 'error', trackId: track?.id ?? null, error });
      }),
    ];
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [session]);

  const value = useMemo<DevAudioPlayback>(() => ({
    autoplayBlocked: session.autoplayBlocked,
    currentSource: session.currentTrack?.audioFile ?? null,
    currentTrackId: session.currentTrack?.id ?? null,
    errorMessage: session.errorMessage,
    hasError: session.hasError,
    isBuffering: session.isBuffering,
    isMuted: session.isMuted,
    isPlaying: session.isPlaying,
    volume: session.volume,
    load,
    pause: session.pause,
    play,
    replace,
    restart,
    setVolume: session.setVolume,
    stop,
    subscribe,
    subscribeToTrackChange,
    subscribeToQueueEnd,
    toggleMute: session.toggleMute,
  }), [load, play, replace, restart, session, stop, subscribe, subscribeToQueueEnd, subscribeToTrackChange]);

  return (
    <DevAudioPlaybackContext.Provider value={value}>
      {children}
    </DevAudioPlaybackContext.Provider>
  );
}

/**
 * DEV's one playback boundary. The package owns the only app-wide media
 * element; callers keep their existing sources and controls through the hook.
 */
export function DevAudioPlaybackProvider({ children }: PropsWithChildren) {
  return (
    <AudioSessionProvider initialQueue={[]}>
      <DevAudioPlaybackBridge>{children}</DevAudioPlaybackBridge>
    </AudioSessionProvider>
  );
}

export function useDevAudioPlayback() {
  const context = useContext(DevAudioPlaybackContext);
  if (!context) {
    throw new Error('useDevAudioPlayback must be used within DevAudioPlaybackProvider');
  }
  return context;
}
