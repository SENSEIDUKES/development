import {
  AudioSessionProvider,
  type Track,
  useAudioSession,
} from '@seihouse/audio-player';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
  setVolume: (volume: number) => void;
  stop: (trackId?: string) => void;
  subscribe: (handler: (event: DevAudioPlaybackEvent) => void) => () => void;
  subscribeToTrackChange: (handler: (trackId: string | null) => void) => () => void;
  subscribeToQueueEnd: (handler: () => void) => () => void;
  toggleMute: () => void;
}

const DevAudioPlaybackContext = createContext<DevAudioPlayback | null>(null);

const toTrack = (request: DevAudioRequest): Track => ({
  id: request.id,
  title: request.title ?? 'DEV audio',
  artist: request.artist ?? 'SEN Development',
  audioFile: request.source,
});

function DevAudioPlaybackBridge({ children }: PropsWithChildren) {
  const session = useAudioSession();

  const load = useCallback((request: DevAudioRequest) => {
    session.setQueue([toTrack(request)]);
  }, [session]);

  const play = useCallback((request?: DevAudioRequest) => {
    if (request) {
      session.playNow(toTrack(request));
      return;
    }
    void session.play();
  }, [session]);

  const replace = useCallback((request: DevAudioRequest) => {
    session.setQueue([toTrack(request)], 0, true);
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
    setVolume: session.setVolume,
    stop,
    subscribe,
    subscribeToTrackChange,
    subscribeToQueueEnd,
    toggleMute: session.toggleMute,
  }), [load, play, replace, session, stop, subscribe, subscribeToQueueEnd, subscribeToTrackChange]);

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
